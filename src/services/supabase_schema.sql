-- ==============================================================================
-- BROWNIE CONTROL - SUPABASE / POSTGRESQL PRODUCTION SCHEMA & RLS
-- Multi-tenant ready, transactional functions, FEFO batches, audit logging
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums (cada um só é criado se ainda não existir, para permitir rodar este
-- arquivo mais de uma vez sem erro de "already exists")
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('owner', 'seller');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'inactive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_status') THEN
        CREATE TYPE sale_status AS ENUM ('draft', 'awaiting_payment', 'confirmed', 'cancelled', 'refunded');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'manually_confirmed', 'automatically_confirmed', 'refunded');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
        CREATE TYPE purchase_status AS ENUM ('draft', 'ordered', 'partially_received', 'received', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_status') THEN
        CREATE TYPE commission_status AS ENUM ('pending', 'included_in_payout', 'paid', 'reversed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_location_type') THEN
        CREATE TYPE inventory_location_type AS ENUM ('central', 'seller');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
        CREATE TYPE reservation_status AS ENUM ('pending', 'delivered', 'cancelled');
    END IF;
END $$;

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'BRL',
    timezone TEXT DEFAULT 'America/Fortaleza',
    pix_key TEXT,
    pix_key_type TEXT,
    pix_merchant_name TEXT,
    pix_merchant_city TEXT,
    default_commission_type TEXT DEFAULT 'percentage_of_gross_profit',
    default_commission_value NUMERIC(5,2) DEFAULT 50.00,
    default_purchase_cost NUMERIC(10,2) DEFAULT 4.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (links with auth.users)
-- Auth model: every login is a real Supabase Auth user (auth.users), and there is
-- intentionally NO self-signup flow and NO password column on this table. Accounts
-- are provisioned exclusively by the owner, e.g. from an admin-only server route or
-- Edge Function calling `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
-- with the SERVICE ROLE key (never exposed to the browser), followed by an INSERT here
-- with the same `id`. Sellers/owners then simply call `signInWithPassword(email, password)`.
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'seller',
    status user_status NOT NULL DEFAULT 'active',
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    commission_type TEXT DEFAULT 'percentage_of_gross_profit',
    commission_value NUMERIC(5,2) DEFAULT 50.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products & Flavors
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flavors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Pricing Rules
CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    minimum_quantity INT NOT NULL,
    maximum_quantity INT,
    unit_price NUMERIC(12,2) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    instagram TEXT,
    document TEXT,
    address TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Inventory Locations
CREATE TABLE IF NOT EXISTS inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type inventory_location_type NOT NULL,
    name TEXT NOT NULL,
    seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Purchase Orders & Items
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    status purchase_status DEFAULT 'draft',
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    received_at TIMESTAMPTZ,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    flavor_id UUID NOT NULL REFERENCES flavors(id),
    quantity_ordered INT NOT NULL,
    quantity_received INT NOT NULL DEFAULT 0,
    unit_cost NUMERIC(12,2) NOT NULL,
    total_cost NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Batches (FEFO Tracking)
CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flavor_id UUID NOT NULL REFERENCES flavors(id),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    supplier_id UUID REFERENCES suppliers(id),
    batch_reference TEXT,
    unit_cost NUMERIC(12,2) NOT NULL,
    quantity_received INT NOT NULL,
    quantity_remaining INT NOT NULL,
    manufacturing_date DATE,
    expiration_date DATE NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Inventory Movements (Immutable Ledger)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES inventory_locations(id),
    flavor_id UUID NOT NULL REFERENCES flavors(id),
    batch_id UUID REFERENCES inventory_batches(id),
    movement_type TEXT NOT NULL,
    quantity_delta INT NOT NULL,
    unit_cost NUMERIC(12,2),
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Inventory Balances (Fast Lookup)
CREATE TABLE IF NOT EXISTS inventory_balances (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    flavor_id UUID NOT NULL REFERENCES flavors(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (organization_id, location_id, flavor_id)
);

-- 11. Sales & Sale Items
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id),
    status sale_status DEFAULT 'confirmed',
    payment_status payment_status DEFAULT 'manually_confirmed',
    payment_method TEXT DEFAULT 'pix',
    total_quantity INT NOT NULL,
    unit_price_applied NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL,
    total_cost NUMERIC(12,2) NOT NULL,
    gross_profit NUMERIC(12,2) NOT NULL,
    seller_commission NUMERIC(12,2) NOT NULL,
    owner_gross_result NUMERIC(12,2) NOT NULL,
    pix_txid TEXT,
    confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    flavor_id UUID NOT NULL REFERENCES flavors(id),
    quantity INT NOT NULL,
    unit_sale_price NUMERIC(12,2) NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL,
    line_revenue NUMERIC(12,2) NOT NULL,
    line_cost NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Commission Entries & Payouts
CREATE TABLE IF NOT EXISTS commission_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id),
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'percentage_of_gross_profit',
    amount NUMERIC(12,2) NOT NULL,
    status commission_status DEFAULT 'pending',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_number TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    status TEXT DEFAULT 'paid',
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT DEFAULT 'Pix',
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Reservations (Encomendas) & Items
-- A seller registers the customer's name, quantity per flavor and the date it
-- should be sold/delivered, then later marks it delivered. The owner reads the
-- pending totals per seller to know how much stock to hand each one.
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

-- Se este banco já tinha uma versão anterior sem o nome do cliente, adiciona a coluna
-- (idempotente); e remove telefone, que não faz mais parte do formulário.
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

-- Keep reservations.total_quantity in sync with its items automatically
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_items ENABLE ROW LEVEL SECURITY;

-- Helper to get user profile
CREATE OR REPLACE FUNCTION current_user_profile()
RETURNS profiles AS $$
    SELECT * FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: is the caller the owner? (SECURITY DEFINER avoids RLS recursion on profiles)
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: everyone can read their own row; the owner can read/manage everyone.
-- Nobody can INSERT a profile from the client — accounts are created by the owner-only
-- Edge Function described above, which runs with the service role and bypasses RLS.
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

-- Safety net: even though the UI never exposes it, block a non-owner from ever
-- changing their own role/status/organization via a direct API call.
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

-- Reservations: sellers manage their own; owner manages all
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

-- Sales policy: Sellers see only own sales; Owner sees all
DROP POLICY IF EXISTS "Sellers view own sales" ON sales;
CREATE POLICY "Sellers view own sales" ON sales
    FOR SELECT USING (
        seller_id = auth.uid() OR 
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'
    );

DROP POLICY IF EXISTS "Owners manage all sales" ON sales;
CREATE POLICY "Owners manage all sales" ON sales
    FOR ALL USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'
    );

-- Inventory balance: Seller sees own location; Owner sees all
DROP POLICY IF EXISTS "View inventory balance" ON inventory_balances;
CREATE POLICY "View inventory balance" ON inventory_balances
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner' OR
        location_id IN (SELECT id FROM inventory_locations WHERE seller_id = auth.uid())
    );
