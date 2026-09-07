-- ==============================================================================
-- BROWNIE CONTROL - RLS COMPLETO PARA TODAS AS TABELAS (rodar depois do schema
-- base e da migração de reservas). Idempotente: pode rodar quantas vezes quiser.
--
-- Modelo de acesso:
--   - Proprietário (role = 'owner'): acesso total a tudo da sua organização.
--   - Vendedor (role = 'seller'): lê o catálogo compartilhado (produtos, sabores,
--     regras de preço), lê/gerencia só o próprio estoque, vendas, comissões e
--     reservas. Não vê fornecedores, compras, despesas nem lotes de outros.
-- ==============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;

-- Helper: does this inventory_locations row belong to the caller? Used by the
-- movements/balances policies below (SECURITY DEFINER avoids RLS recursion).
CREATE OR REPLACE FUNCTION is_own_location(loc_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM inventory_locations WHERE id = loc_id AND seller_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------
-- Organizations: everyone logged in can read their own org's settings
-- (Pix key, commission defaults); only the owner edits them.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Read own organization" ON organizations;
CREATE POLICY "Read own organization" ON organizations
    FOR SELECT USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Owner updates organization" ON organizations;
CREATE POLICY "Owner updates organization" ON organizations
    FOR UPDATE USING (is_owner());

-- ------------------------------------------------------------------
-- Shared catalog (products, flavors, pricing rules): read for everyone
-- logged in, write only for the owner.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Read products" ON products;
CREATE POLICY "Read products" ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owner manages products" ON products;
CREATE POLICY "Owner manages products" ON products FOR ALL USING (is_owner()) WITH CHECK (is_owner());

DROP POLICY IF EXISTS "Read flavors" ON flavors;
CREATE POLICY "Read flavors" ON flavors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owner manages flavors" ON flavors;
CREATE POLICY "Owner manages flavors" ON flavors FOR ALL USING (is_owner()) WITH CHECK (is_owner());

DROP POLICY IF EXISTS "Read pricing rules" ON pricing_rules;
CREATE POLICY "Read pricing rules" ON pricing_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owner manages pricing rules" ON pricing_rules;
CREATE POLICY "Owner manages pricing rules" ON pricing_rules FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- ------------------------------------------------------------------
-- Suppliers, purchase orders, batches: owner-only, sellers never see these.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner manages suppliers" ON suppliers;
CREATE POLICY "Owner manages suppliers" ON suppliers FOR ALL USING (is_owner()) WITH CHECK (is_owner());

DROP POLICY IF EXISTS "Owner manages purchase orders" ON purchase_orders;
CREATE POLICY "Owner manages purchase orders" ON purchase_orders FOR ALL USING (is_owner()) WITH CHECK (is_owner());

DROP POLICY IF EXISTS "Owner manages purchase order items" ON purchase_order_items;
CREATE POLICY "Owner manages purchase order items" ON purchase_order_items FOR ALL USING (is_owner()) WITH CHECK (is_owner());

DROP POLICY IF EXISTS "Owner manages batches" ON inventory_batches;
CREATE POLICY "Owner manages batches" ON inventory_batches FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- ------------------------------------------------------------------
-- Inventory locations: seller sees/creates nothing (owner provisions them when
-- creating the seller), but each seller can read their own + the central one;
-- owner has full access.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "View inventory locations" ON inventory_locations;
CREATE POLICY "View inventory locations" ON inventory_locations
    FOR SELECT USING (is_owner() OR type = 'central' OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Owner manages inventory locations" ON inventory_locations;
CREATE POLICY "Owner manages inventory locations" ON inventory_locations
    FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- ------------------------------------------------------------------
-- Inventory balances: already has a SELECT policy from the base schema.
-- Add write access so a sale/transfer can actually move stock: seller can only
-- touch their own location's rows, owner can touch anything.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Write inventory balance" ON inventory_balances;
CREATE POLICY "Write inventory balance" ON inventory_balances
    FOR ALL USING (is_owner() OR is_own_location(location_id))
    WITH CHECK (is_owner() OR is_own_location(location_id));

-- ------------------------------------------------------------------
-- Inventory movements: the immutable ledger. Seller can log/read movements at
-- their own location; owner sees/logs everything.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "View inventory movements" ON inventory_movements;
CREATE POLICY "View inventory movements" ON inventory_movements
    FOR SELECT USING (is_owner() OR is_own_location(location_id));

DROP POLICY IF EXISTS "Insert inventory movements" ON inventory_movements;
CREATE POLICY "Insert inventory movements" ON inventory_movements
    FOR INSERT WITH CHECK (is_owner() OR is_own_location(location_id));

-- ------------------------------------------------------------------
-- Sales & sale items: base schema already has seller-view + owner-all. Add
-- the seller's own INSERT (a seller registers their own sale).
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Sellers create own sales" ON sales;
CREATE POLICY "Sellers create own sales" ON sales
    FOR INSERT WITH CHECK (seller_id = auth.uid() OR is_owner());

DROP POLICY IF EXISTS "View sale items" ON sale_items;
CREATE POLICY "View sale items" ON sale_items
    FOR SELECT USING (
        is_owner() OR sale_id IN (SELECT id FROM sales WHERE seller_id = auth.uid())
    );

DROP POLICY IF EXISTS "Insert sale items" ON sale_items;
CREATE POLICY "Insert sale items" ON sale_items
    FOR INSERT WITH CHECK (
        is_owner() OR sale_id IN (SELECT id FROM sales WHERE seller_id = auth.uid())
    );

-- ------------------------------------------------------------------
-- Commissions: a seller sees and creates their own entries (generated when
-- they confirm a sale); only the owner manages payouts.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "View commission entries" ON commission_entries;
CREATE POLICY "View commission entries" ON commission_entries
    FOR SELECT USING (is_owner() OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Insert commission entries" ON commission_entries;
CREATE POLICY "Insert commission entries" ON commission_entries
    FOR INSERT WITH CHECK (is_owner() OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Owner updates commission entries" ON commission_entries;
CREATE POLICY "Owner updates commission entries" ON commission_entries
    FOR UPDATE USING (is_owner());

DROP POLICY IF EXISTS "View commission payouts" ON commission_payouts;
CREATE POLICY "View commission payouts" ON commission_payouts
    FOR SELECT USING (is_owner() OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Owner manages commission payouts" ON commission_payouts;
CREATE POLICY "Owner manages commission payouts" ON commission_payouts
    FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- ------------------------------------------------------------------
-- Expenses: owner-only, sellers never see the operation's expenses.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner manages expenses" ON expenses;
CREATE POLICY "Owner manages expenses" ON expenses FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- ------------------------------------------------------------------
-- Audit logs: anyone logged in can write an entry for their own actions;
-- only the owner can read the log.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "View audit logs" ON audit_logs;
CREATE POLICY "View audit logs" ON audit_logs FOR SELECT USING (is_owner());

DROP POLICY IF EXISTS "Insert audit logs" ON audit_logs;
CREATE POLICY "Insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_owner());
