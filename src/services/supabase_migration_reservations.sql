-- ==============================================================================
-- BROWNIE CONTROL - MIGRAÇÃO INCREMENTAL: Reservas + regras de acesso por perfil
-- Seguro para rodar mesmo se você já criou o schema base (organizations, profiles,
-- sales, etc). Só cria o que ainda não existe e não dá erro em objeto duplicado.
-- ==============================================================================

-- Enum de status de reserva (pula se já existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
        CREATE TYPE reservation_status AS ENUM ('pending', 'delivered', 'cancelled');
    END IF;
END $$;

-- 15. Reservations (Encomendas) & Items
-- Reserva = pedido de um cliente (nome + quantidade por sabor) para uma data de entrega.
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id),
    customer_name TEXT NOT NULL,
    sale_date DATE NOT NULL,
    status reservation_status NOT NULL DEFAULT 'pending',
    total_quantity INT NOT NULL DEFAULT 0,
    notes TEXT,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Se você já rodou uma versão anterior desta migração sem o nome do cliente,
-- adiciona a coluna agora (idempotente); telefone não faz mais parte do formulário.
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT 'Cliente';
ALTER TABLE reservations ALTER COLUMN customer_name DROP DEFAULT;
ALTER TABLE reservations DROP COLUMN IF EXISTS customer_phone;

CREATE TABLE IF NOT EXISTS reservation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    flavor_id UUID NOT NULL REFERENCES flavors(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_org_seller ON reservations(organization_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservation_items_reservation ON reservation_items(reservation_id);

-- Mantém reservations.total_quantity somado automaticamente a partir dos itens
CREATE OR REPLACE FUNCTION recalc_reservation_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE reservations
    SET total_quantity = COALESCE((
        SELECT SUM(quantity) FROM reservation_items
        WHERE reservation_id = COALESCE(NEW.reservation_id, OLD.reservation_id)
    ), 0),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.reservation_id, OLD.reservation_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reservation_items_recalc ON reservation_items;
CREATE TRIGGER trg_reservation_items_recalc
AFTER INSERT OR UPDATE OR DELETE ON reservation_items
FOR EACH ROW EXECUTE FUNCTION recalc_reservation_total();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_items ENABLE ROW LEVEL SECURITY;

-- Helper: é o proprietário? (SECURITY DEFINER evita recursão de RLS em profiles)
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: cada um vê o próprio perfil; o proprietário vê/edita todos.
-- Ninguém cria perfil pelo cliente — conta é criada só pelo proprietário via
-- Supabase Auth Admin (chave de serviço), nunca pelo app do vendedor.
DROP POLICY IF EXISTS "View own profile" ON profiles;
CREATE POLICY "View own profile" ON profiles
    FOR SELECT USING (id = auth.uid() OR is_owner());

DROP POLICY IF EXISTS "Owner manages all profiles" ON profiles;
CREATE POLICY "Owner manages all profiles" ON profiles
    FOR UPDATE USING (is_owner());

DROP POLICY IF EXISTS "Owner deletes profiles" ON profiles;
CREATE POLICY "Owner deletes profiles" ON profiles
    FOR DELETE USING (is_owner());

DROP POLICY IF EXISTS "Self updates own contact info" ON profiles;
CREATE POLICY "Self updates own contact info" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Trava de segurança: mesmo que a interface nunca exponha isso, impede um
-- vendedor de virar proprietário mudando seu próprio cargo via chamada direta à API.
CREATE OR REPLACE FUNCTION prevent_self_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT is_owner() AND auth.uid() = OLD.id THEN
        IF NEW.role IS DISTINCT FROM OLD.role
           OR NEW.status IS DISTINCT FROM OLD.status
           OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
            RAISE EXCEPTION 'Only the owner can change role, status or organization';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_self_privilege_escalation ON profiles;
CREATE TRIGGER trg_prevent_self_privilege_escalation
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_self_privilege_escalation();

-- Reservas: cada vendedor gerencia as suas; o proprietário gerencia todas
DROP POLICY IF EXISTS "Sellers view own reservations" ON reservations;
CREATE POLICY "Sellers view own reservations" ON reservations
    FOR SELECT USING (seller_id = auth.uid() OR is_owner());

DROP POLICY IF EXISTS "Sellers create own reservations" ON reservations;
CREATE POLICY "Sellers create own reservations" ON reservations
    FOR INSERT WITH CHECK (seller_id = auth.uid() OR is_owner());

DROP POLICY IF EXISTS "Sellers update own reservations" ON reservations;
CREATE POLICY "Sellers update own reservations" ON reservations
    FOR UPDATE USING (seller_id = auth.uid() OR is_owner());

DROP POLICY IF EXISTS "Owner deletes reservations" ON reservations;
CREATE POLICY "Owner deletes reservations" ON reservations
    FOR DELETE USING (is_owner());

DROP POLICY IF EXISTS "View reservation items" ON reservation_items;
CREATE POLICY "View reservation items" ON reservation_items
    FOR SELECT USING (
        is_owner() OR
        reservation_id IN (SELECT id FROM reservations WHERE seller_id = auth.uid())
    );

DROP POLICY IF EXISTS "Manage reservation items" ON reservation_items;
CREATE POLICY "Manage reservation items" ON reservation_items
    FOR ALL USING (
        is_owner() OR
        reservation_id IN (SELECT id FROM reservations WHERE seller_id = auth.uid())
    );
