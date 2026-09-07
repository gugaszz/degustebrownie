import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { supabase } from './supabase';
import {
  Profile,
  Flavor,
  Product,
  PricingRule,
  Supplier,
  PurchaseOrder,
  InventoryLocation,
  InventoryBatch,
  InventoryMovement,
  InventoryBalance,
  Sale,
  SaleItem,
  CommissionEntry,
  CommissionPayout,
  Expense,
  AuditLog,
  OrganizationSettings,
  DateFilterOption,
  Reservation,
  ReservationItem
} from '../types';

// Real UUIDs now — every id in this app is a Postgres UUID primary key.
export const generateId = () => crypto.randomUUID();

const DATE_FILTER_PREF_KEY = 'brownie_date_filter_pref_v1';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const formatDateOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

// Webhook for Pushcut notifications on confirmed sales
const triggerSaleWebhook = (sale: Sale) => {
  const webhookUrl = 'https://api.pushcut.io/dsxEjdBVqzQnkzl13vUZc/notifications/Vendas%20Aprovada!';
  const formattedVal = `R$ ${sale.total_amount.toFixed(2).replace('.', ',')}`;
  const notificationTitle = 'Venda Aprovada';
  const messageText = `Valor: ${formattedVal}`;

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: messageText, title: notificationTitle, input: sale.total_amount.toFixed(2) })
  }).catch(() => {
    fetch(`${webhookUrl}?text=${encodeURIComponent(messageText)}&title=${encodeURIComponent(notificationTitle)}`, {
      method: 'GET',
      mode: 'no-cors'
    }).catch(() => {});
  });
};

export interface AppState {
  settings: OrganizationSettings;
  currentUser: Profile;
  profiles: Profile[];
  product: Product;
  flavors: Flavor[];
  pricingRules: PricingRule[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  locations: InventoryLocation[];
  batches: InventoryBatch[];
  movements: InventoryMovement[];
  balances: InventoryBalance[];
  sales: Sale[];
  commissions: CommissionEntry[];
  payouts: CommissionPayout[];
  expenses: Expense[];
  reservations: Reservation[];
  auditLogs: AuditLog[];
  dateFilter: {
    option: DateFilterOption;
    startDate: string;
    endDate: string;
  };
}

const EMPTY_PROFILE: Profile = {
  id: '',
  organization_id: '',
  role: 'seller',
  status: 'inactive',
  name: '',
  email: '',
  phone: '',
  created_at: ''
};

const loadDateFilterPref = (): AppState['dateFilter'] => {
  try {
    const saved = localStorage.getItem(DATE_FILTER_PREF_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  const todayStr = getTodayDateString();
  return { option: 'today', startDate: todayStr, endDate: todayStr };
};

const saveDateFilterPref = (pref: AppState['dateFilter']) => {
  try {
    localStorage.setItem(DATE_FILTER_PREF_KEY, JSON.stringify(pref));
  } catch {
    // ignore
  }
};

const emptyState = (): AppState => ({
  settings: {
    id: '',
    name: '',
    currency: 'BRL',
    timezone: 'America/Fortaleza',
    pix_key: '',
    pix_key_type: 'cnpj',
    pix_merchant_name: '',
    pix_merchant_city: '',
    default_commission_type: 'percentage_of_gross_profit',
    default_commission_value: 50,
    default_purchase_cost: 4.0
  },
  currentUser: EMPTY_PROFILE,
  profiles: [],
  product: { id: '', organization_id: '', name: '', active: true, created_at: '' },
  flavors: [],
  pricingRules: [],
  suppliers: [],
  purchaseOrders: [],
  locations: [],
  batches: [],
  movements: [],
  balances: [],
  sales: [],
  commissions: [],
  payouts: [],
  expenses: [],
  reservations: [],
  auditLogs: [],
  dateFilter: loadDateFilterPref()
});

// ==============================================================================
// Data loading: fetch everything this signed-in user is allowed to see (RLS
// does the filtering — a seller naturally gets back only their own rows where
// that applies) and reshape it into the same AppState shape the whole app
// already expects, enriching DB rows with the denormalized display fields
// (flavor_name, seller_name, location_name...) that only live in this local
// shape, not in the database itself.
// ==============================================================================
const loadOrgData = async (profile: Profile, dateFilter: AppState['dateFilter']): Promise<AppState> => {
  const orgId = profile.organization_id;

  const [
    orgRes,
    profilesRes,
    productsRes,
    flavorsRes,
    pricingRulesRes,
    suppliersRes,
    locationsRes,
    purchaseOrdersRes,
    purchaseOrderItemsRes,
    batchesRes,
    movementsRes,
    balancesRes,
    salesRes,
    saleItemsRes,
    commissionsRes,
    payoutsRes,
    expensesRes,
    reservationsRes,
    reservationItemsRes,
    auditLogsRes
  ] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('profiles').select('*'),
    supabase.from('products').select('*').eq('organization_id', orgId),
    supabase.from('flavors').select('*').eq('organization_id', orgId).order('sort_order'),
    supabase.from('pricing_rules').select('*').eq('organization_id', orgId),
    supabase.from('suppliers').select('*').eq('organization_id', orgId),
    supabase.from('inventory_locations').select('*').eq('organization_id', orgId),
    supabase.from('purchase_orders').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
    supabase.from('purchase_order_items').select('*').eq('organization_id', orgId),
    supabase.from('inventory_batches').select('*').eq('organization_id', orgId),
    supabase.from('inventory_movements').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
    supabase.from('inventory_balances').select('*').eq('organization_id', orgId),
    supabase.from('sales').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
    supabase.from('sale_items').select('*').eq('organization_id', orgId),
    supabase.from('commission_entries').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
    supabase.from('commission_payouts').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
    supabase.from('expenses').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
    supabase.from('reservations').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
    supabase.from('reservation_items').select('*').eq('organization_id', orgId),
    supabase.from('audit_logs').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(300)
  ]);

  const org = orgRes.data;
  const profiles: Profile[] = (profilesRes.data || []).map((p: any) => ({
    id: p.id,
    organization_id: p.organization_id,
    role: p.role,
    status: p.status,
    name: p.name,
    email: p.email || '',
    phone: p.phone || '',
    avatar_url: p.avatar_url || '',
    commission_type: p.commission_type,
    commission_value: p.commission_value,
    created_at: p.created_at
  }));

  const flavorMap = new Map<string, string>();
  const flavors: Flavor[] = (flavorsRes.data || []).map((f: any) => {
    flavorMap.set(f.id, f.name);
    return f;
  });

  const profileMap = new Map<string, string>();
  profiles.forEach(p => profileMap.set(p.id, p.name));

  const locationMap = new Map<string, string>();
  const locations: InventoryLocation[] = (locationsRes.data || []).map((l: any) => {
    locationMap.set(l.id, l.name);
    return l;
  });

  const supplierMap = new Map<string, string>();
  const suppliers: Supplier[] = (suppliersRes.data || []).map((s: any) => {
    supplierMap.set(s.id, s.name);
    return s;
  });

  const poItemsByOrder = new Map<string, any[]>();
  (purchaseOrderItemsRes.data || []).forEach((i: any) => {
    const arr = poItemsByOrder.get(i.purchase_order_id) || [];
    arr.push({ ...i, flavor_name: flavorMap.get(i.flavor_id) || 'Sabor' });
    poItemsByOrder.set(i.purchase_order_id, arr);
  });
  const purchaseOrders: PurchaseOrder[] = (purchaseOrdersRes.data || []).map((o: any) => ({
    ...o,
    supplier_name: supplierMap.get(o.supplier_id) || 'Fornecedor',
    items: poItemsByOrder.get(o.id) || []
  }));

  const batches: InventoryBatch[] = (batchesRes.data || []).map((b: any) => ({
    ...b,
    flavor_name: flavorMap.get(b.flavor_id) || 'Sabor'
  }));

  const movements: InventoryMovement[] = (movementsRes.data || []).map((m: any) => ({
    ...m,
    location_name: locationMap.get(m.location_id) || 'Local',
    flavor_name: flavorMap.get(m.flavor_id) || 'Sabor'
  }));

  const balances: InventoryBalance[] = (balancesRes.data || []).map((b: any) => ({
    location_id: b.location_id,
    flavor_id: b.flavor_id,
    quantity: b.quantity
  }));

  const saleItemsBySale = new Map<string, SaleItem[]>();
  (saleItemsRes.data || []).forEach((i: any) => {
    const arr = saleItemsBySale.get(i.sale_id) || [];
    arr.push({
      id: i.id,
      flavor_id: i.flavor_id,
      flavor_name: flavorMap.get(i.flavor_id) || 'Sabor',
      quantity: i.quantity,
      unit_sale_price: Number(i.unit_sale_price),
      unit_cost: Number(i.unit_cost),
      line_revenue: Number(i.line_revenue),
      line_cost: Number(i.line_cost)
    });
    saleItemsBySale.set(i.sale_id, arr);
  });
  const sales: Sale[] = (salesRes.data || []).map((s: any) => ({
    ...s,
    total_amount: Number(s.total_amount),
    total_cost: Number(s.total_cost),
    gross_profit: Number(s.gross_profit),
    seller_commission: Number(s.seller_commission),
    owner_gross_result: Number(s.owner_gross_result),
    subtotal: Number(s.subtotal),
    discount_amount: Number(s.discount_amount || 0),
    unit_price_applied: Number(s.unit_price_applied),
    seller_name: profileMap.get(s.seller_id) || 'Vendedor',
    items: saleItemsBySale.get(s.id) || []
  }));

  const commissions: CommissionEntry[] = (commissionsRes.data || []).map((c: any) => ({
    ...c,
    amount: Number(c.amount),
    seller_name: profileMap.get(c.seller_id) || 'Vendedor'
  }));

  const payouts: CommissionPayout[] = (payoutsRes.data || []).map((p: any) => ({
    ...p,
    amount: Number(p.amount),
    seller_name: profileMap.get(p.seller_id) || 'Vendedor',
    entry_ids: []
  }));

  const expenses: Expense[] = (expensesRes.data || []).map((e: any) => ({
    ...e,
    amount: Number(e.amount)
  }));

  const reservationItemsByReservation = new Map<string, ReservationItem[]>();
  (reservationItemsRes.data || []).forEach((i: any) => {
    const arr = reservationItemsByReservation.get(i.reservation_id) || [];
    arr.push({
      id: i.id,
      flavor_id: i.flavor_id,
      flavor_name: flavorMap.get(i.flavor_id) || 'Sabor',
      quantity: i.quantity
    });
    reservationItemsByReservation.set(i.reservation_id, arr);
  });
  const reservations: Reservation[] = (reservationsRes.data || []).map((r: any) => ({
    ...r,
    seller_name: profileMap.get(r.seller_id) || 'Vendedor',
    items: reservationItemsByReservation.get(r.id) || []
  }));

  const auditLogs: AuditLog[] = auditLogsRes.data || [];

  const settings: OrganizationSettings = org
    ? {
        id: org.id,
        name: org.name,
        currency: org.currency || 'BRL',
        timezone: org.timezone || 'America/Fortaleza',
        pix_key: org.pix_key || '',
        pix_key_type: org.pix_key_type || 'cnpj',
        pix_merchant_name: org.pix_merchant_name || 'BROWNIE CONTROL',
        pix_merchant_city: org.pix_merchant_city || 'FORTALEZA',
        default_commission_type: org.default_commission_type || 'percentage_of_gross_profit',
        default_commission_value: Number(org.default_commission_value ?? 50),
        default_purchase_cost: Number(org.default_purchase_cost ?? 4.0)
      }
    : emptyState().settings;

  const product: Product = (productsRes.data || [])[0] || emptyState().product;

  const currentUser = profiles.find(p => p.id === profile.id) || profile;

  return {
    settings,
    currentUser,
    profiles,
    product,
    flavors,
    pricingRules: (pricingRulesRes.data || []).map((r: any) => ({ ...r, unit_price: Number(r.unit_price) })),
    suppliers,
    purchaseOrders,
    locations,
    batches,
    movements,
    balances,
    sales,
    commissions,
    payouts,
    expenses,
    reservations,
    auditLogs,
    dateFilter
  };
};

// ==============================================================================
// Persistence: fired (not awaited by the caller) right after each optimistic
// local state update, so every screen keeps its familiar instant-feedback feel
// while the same change is written to the shared database in the background.
// Errors are logged; the realtime subscription + periodic refetch keep every
// device eventually consistent even if one write hiccups.
// ==============================================================================
const logFail = (label: string) => (err: unknown) => console.error(`[persist] ${label} failed`, err);

const persist = {
  async sale(sale: Sale, items: SaleItem[], movements: InventoryMovement[], commission: CommissionEntry, audit: AuditLog) {
    try {
      await supabase.from('sales').insert({
        id: sale.id,
        organization_id: sale.organization_id,
        seller_id: sale.seller_id,
        status: sale.status,
        payment_status: sale.payment_status,
        payment_method: sale.payment_method,
        total_quantity: sale.total_quantity,
        unit_price_applied: sale.unit_price_applied,
        subtotal: sale.subtotal,
        discount_amount: sale.discount_amount,
        total_amount: sale.total_amount,
        total_cost: sale.total_cost,
        gross_profit: sale.gross_profit,
        seller_commission: sale.seller_commission,
        owner_gross_result: sale.owner_gross_result,
        pix_txid: sale.pix_txid,
        confirmed_at: sale.confirmed_at,
        created_at: sale.created_at
      });
      await supabase.from('sale_items').insert(
        items.map(i => ({
          id: i.id,
          organization_id: sale.organization_id,
          sale_id: sale.id,
          flavor_id: i.flavor_id,
          quantity: i.quantity,
          unit_sale_price: i.unit_sale_price,
          unit_cost: i.unit_cost,
          line_revenue: i.line_revenue,
          line_cost: i.line_cost
        }))
      );
      for (const m of movements) {
        await supabase.rpc('adjust_inventory_balance', {
          p_organization_id: m.organization_id,
          p_location_id: m.location_id,
          p_flavor_id: m.flavor_id,
          p_delta: m.quantity_delta
        });
        await supabase.from('inventory_movements').insert({
          id: m.id,
          organization_id: m.organization_id,
          location_id: m.location_id,
          flavor_id: m.flavor_id,
          movement_type: m.movement_type,
          quantity_delta: m.quantity_delta,
          unit_cost: m.unit_cost,
          reference_type: m.reference_type,
          reference_id: m.reference_id,
          notes: m.notes,
          created_by: m.created_by,
          created_at: m.created_at
        });
      }
      await supabase.from('commission_entries').insert({
        id: commission.id,
        organization_id: commission.organization_id,
        seller_id: commission.seller_id,
        sale_id: commission.sale_id,
        type: commission.type,
        amount: commission.amount,
        status: commission.status,
        description: commission.description,
        created_at: commission.created_at
      });
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('sale')(e);
    }
  },

  async cancelSale(saleId: string, movements: InventoryMovement[], audit: AuditLog) {
    try {
      await supabase.from('sales').update({ status: 'cancelled', cancelled_at: audit.created_at }).eq('id', saleId);
      await supabase.from('commission_entries').update({ status: 'reversed' }).eq('sale_id', saleId);
      for (const m of movements) {
        await supabase.rpc('adjust_inventory_balance', {
          p_organization_id: m.organization_id,
          p_location_id: m.location_id,
          p_flavor_id: m.flavor_id,
          p_delta: m.quantity_delta
        });
        await supabase.from('inventory_movements').insert({
          id: m.id,
          organization_id: m.organization_id,
          location_id: m.location_id,
          flavor_id: m.flavor_id,
          movement_type: m.movement_type,
          quantity_delta: m.quantity_delta,
          unit_cost: m.unit_cost,
          reference_type: m.reference_type,
          reference_id: m.reference_id,
          notes: m.notes,
          created_by: m.created_by,
          created_at: m.created_at
        });
      }
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('cancelSale')(e);
    }
  },

  async deleteSale(saleId: string, audit: AuditLog) {
    try {
      await supabase.from('commission_entries').delete().eq('sale_id', saleId);
      await supabase.from('sale_items').delete().eq('sale_id', saleId);
      await supabase.from('sales').delete().eq('id', saleId);
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('deleteSale')(e);
    }
  },

  async movements(movements: InventoryMovement[], audit?: AuditLog) {
    try {
      for (const m of movements) {
        await supabase.rpc('adjust_inventory_balance', {
          p_organization_id: m.organization_id,
          p_location_id: m.location_id,
          p_flavor_id: m.flavor_id,
          p_delta: m.quantity_delta
        });
        await supabase.from('inventory_movements').insert({
          id: m.id,
          organization_id: m.organization_id,
          location_id: m.location_id,
          flavor_id: m.flavor_id,
          batch_id: m.batch_id,
          movement_type: m.movement_type,
          quantity_delta: m.quantity_delta,
          unit_cost: m.unit_cost,
          reference_type: m.reference_type,
          reference_id: m.reference_id,
          notes: m.notes,
          created_by: m.created_by,
          created_at: m.created_at
        });
      }
      if (audit) await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('movements')(e);
    }
  },

  async purchaseOrder(order: PurchaseOrder, audit: AuditLog) {
    try {
      await supabase.from('purchase_orders').insert({
        id: order.id,
        order_number: order.order_number,
        organization_id: order.organization_id,
        supplier_id: order.supplier_id,
        status: order.status,
        order_date: order.order_date,
        expected_delivery_date: order.expected_delivery_date,
        total_amount: order.total_amount,
        notes: order.notes,
        created_at: order.created_at
      });
      await supabase.from('purchase_order_items').insert(
        order.items.map(i => ({
          id: i.id,
          organization_id: order.organization_id,
          purchase_order_id: order.id,
          flavor_id: i.flavor_id,
          quantity_ordered: i.quantity_ordered,
          quantity_received: i.quantity_received,
          unit_cost: i.unit_cost,
          total_cost: i.total_cost
        }))
      );
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('purchaseOrder')(e);
    }
  },

  async receivePurchaseOrder(order: PurchaseOrder, batches: InventoryBatch[], movements: InventoryMovement[], audit: AuditLog) {
    try {
      await supabase
        .from('purchase_orders')
        .update({ status: 'received', received_at: audit.created_at })
        .eq('id', order.id);
      for (const item of order.items) {
        await supabase
          .from('purchase_order_items')
          .update({ quantity_received: item.quantity_ordered })
          .eq('purchase_order_id', order.id)
          .eq('flavor_id', item.flavor_id);
      }
      await supabase.from('inventory_batches').insert(
        batches.map(b => ({
          id: b.id,
          organization_id: b.organization_id,
          flavor_id: b.flavor_id,
          purchase_order_id: b.purchase_order_id,
          supplier_id: b.supplier_id,
          batch_reference: b.batch_reference,
          unit_cost: b.unit_cost,
          quantity_received: b.quantity_received,
          quantity_remaining: b.quantity_remaining,
          manufacturing_date: b.manufacturing_date,
          expiration_date: b.expiration_date,
          received_at: b.received_at
        }))
      );
      for (const m of movements) {
        await supabase.rpc('adjust_inventory_balance', {
          p_organization_id: m.organization_id,
          p_location_id: m.location_id,
          p_flavor_id: m.flavor_id,
          p_delta: m.quantity_delta
        });
        await supabase.from('inventory_movements').insert({
          id: m.id,
          organization_id: m.organization_id,
          location_id: m.location_id,
          flavor_id: m.flavor_id,
          batch_id: m.batch_id,
          movement_type: m.movement_type,
          quantity_delta: m.quantity_delta,
          unit_cost: m.unit_cost,
          reference_type: m.reference_type,
          reference_id: m.reference_id,
          notes: m.notes,
          created_by: m.created_by,
          created_at: m.created_at
        });
      }
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('receivePurchaseOrder')(e);
    }
  },

  async deletePurchaseOrder(orderId: string, batchIds: string[], audit: AuditLog) {
    try {
      if (batchIds.length) await supabase.from('inventory_batches').delete().in('id', batchIds);
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', orderId);
      await supabase.from('purchase_orders').delete().eq('id', orderId);
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('deletePurchaseOrder')(e);
    }
  },

  async deleteBatch(batchId: string, movement: InventoryMovement, audit: AuditLog) {
    try {
      await supabase.rpc('adjust_inventory_balance', {
        p_organization_id: movement.organization_id,
        p_location_id: movement.location_id,
        p_flavor_id: movement.flavor_id,
        p_delta: movement.quantity_delta
      });
      await supabase.from('inventory_movements').insert({
        id: movement.id,
        organization_id: movement.organization_id,
        location_id: movement.location_id,
        flavor_id: movement.flavor_id,
        batch_id: movement.batch_id,
        movement_type: movement.movement_type,
        quantity_delta: movement.quantity_delta,
        unit_cost: movement.unit_cost,
        notes: movement.notes,
        created_by: movement.created_by,
        created_at: movement.created_at
      });
      await supabase.from('inventory_batches').delete().eq('id', batchId);
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('deleteBatch')(e);
    }
  },

  async createBatchManual(batch: InventoryBatch, movement: InventoryMovement, audit: AuditLog) {
    try {
      await supabase.from('inventory_batches').insert({
        id: batch.id,
        organization_id: batch.organization_id,
        flavor_id: batch.flavor_id,
        batch_reference: batch.batch_reference,
        unit_cost: batch.unit_cost,
        quantity_received: batch.quantity_received,
        quantity_remaining: batch.quantity_remaining,
        manufacturing_date: batch.manufacturing_date,
        expiration_date: batch.expiration_date,
        received_at: batch.received_at
      });
      await supabase.rpc('adjust_inventory_balance', {
        p_organization_id: movement.organization_id,
        p_location_id: movement.location_id,
        p_flavor_id: movement.flavor_id,
        p_delta: movement.quantity_delta
      });
      await supabase.from('inventory_movements').insert({
        id: movement.id,
        organization_id: movement.organization_id,
        location_id: movement.location_id,
        flavor_id: movement.flavor_id,
        batch_id: movement.batch_id,
        movement_type: movement.movement_type,
        quantity_delta: movement.quantity_delta,
        unit_cost: movement.unit_cost,
        notes: movement.notes,
        created_by: movement.created_by,
        created_at: movement.created_at
      });
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('createBatchManual')(e);
    }
  },

  async payCommission(payout: CommissionPayout, entryIds: string[], audit: AuditLog) {
    try {
      await supabase.from('commission_payouts').insert({
        id: payout.id,
        payout_number: payout.payout_number,
        organization_id: payout.organization_id,
        seller_id: payout.seller_id,
        period_start: payout.period_start,
        period_end: payout.period_end,
        amount: payout.amount,
        status: payout.status,
        paid_at: payout.paid_at,
        payment_method: payout.payment_method,
        notes: payout.notes,
        created_by: payout.created_by,
        created_at: payout.created_at
      });
      await supabase.from('commission_entries').update({ status: 'paid' }).in('id', entryIds);
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('payCommission')(e);
    }
  },

  async expense(expense: Expense, audit: AuditLog) {
    try {
      await supabase.from('expenses').insert({
        id: expense.id,
        organization_id: expense.organization_id,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        expense_date: expense.expense_date,
        created_by: expense.created_by,
        created_at: expense.created_at
      });
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('expense')(e);
    }
  },

  async deleteExpense(expenseId: string, audit: AuditLog) {
    try {
      await supabase.from('expenses').delete().eq('id', expenseId);
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('deleteExpense')(e);
    }
  },

  async createSupplier(supplier: Supplier) {
    try {
      await supabase.from('suppliers').insert({
        id: supplier.id,
        organization_id: supplier.organization_id,
        name: supplier.name,
        contact_name: supplier.contact_name,
        phone: supplier.phone,
        email: supplier.email,
        instagram: supplier.instagram,
        document: supplier.document,
        address: supplier.address,
        notes: supplier.notes,
        active: supplier.active
      });
    } catch (e) {
      logFail('createSupplier')(e);
    }
  },

  async deleteSupplier(supplierId: string, audit: AuditLog) {
    try {
      await supabase.from('suppliers').delete().eq('id', supplierId);
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('deleteSupplier')(e);
    }
  },

  async createFlavor(flavor: Flavor, locationIds: string[]) {
    try {
      await supabase.from('flavors').insert({
        id: flavor.id,
        organization_id: flavor.organization_id,
        name: flavor.name,
        active: flavor.active,
        sort_order: flavor.sort_order
      });
      if (locationIds.length) {
        await supabase.from('inventory_balances').insert(
          locationIds.map(locId => ({
            organization_id: flavor.organization_id,
            location_id: locId,
            flavor_id: flavor.id,
            quantity: 0
          }))
        );
      }
    } catch (e) {
      logFail('createFlavor')(e);
    }
  },

  async toggleFlavorActive(flavorId: string, active: boolean) {
    try {
      await supabase.from('flavors').update({ active }).eq('id', flavorId);
    } catch (e) {
      logFail('toggleFlavorActive')(e);
    }
  },

  async deleteFlavor(flavorId: string, audit: AuditLog) {
    try {
      await supabase.from('inventory_balances').delete().eq('flavor_id', flavorId);
      await supabase.from('flavors').delete().eq('id', flavorId);
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('deleteFlavor')(e);
    }
  },

  async toggleSellerStatus(sellerId: string, status: 'active' | 'inactive') {
    try {
      await supabase.from('profiles').update({ status }).eq('id', sellerId);
    } catch (e) {
      logFail('toggleSellerStatus')(e);
    }
  },

  async createReservation(reservation: Reservation, items: ReservationItem[], audit: AuditLog) {
    try {
      await supabase.from('reservations').insert({
        id: reservation.id,
        organization_id: reservation.organization_id,
        seller_id: reservation.seller_id,
        customer_name: reservation.customer_name,
        sale_date: reservation.sale_date,
        status: reservation.status,
        notes: reservation.notes,
        created_by: reservation.created_by,
        created_at: reservation.created_at
      });
      await supabase.from('reservation_items').insert(
        items.map(i => ({
          id: i.id,
          organization_id: reservation.organization_id,
          reservation_id: reservation.id,
          flavor_id: i.flavor_id,
          quantity: i.quantity
        }))
      );
      await supabase.from('audit_logs').insert(auditRow(audit));
    } catch (e) {
      logFail('createReservation')(e);
    }
  },

  async updateReservation(id: string, patch: Record<string, any>) {
    try {
      await supabase.from('reservations').update(patch).eq('id', id);
    } catch (e) {
      logFail('updateReservation')(e);
    }
  },

  async deleteReservation(id: string) {
    try {
      await supabase.from('reservation_items').delete().eq('reservation_id', id);
      await supabase.from('reservations').delete().eq('id', id);
    } catch (e) {
      logFail('deleteReservation')(e);
    }
  },

  async updateSettings(orgId: string, patch: Partial<OrganizationSettings>) {
    try {
      await supabase.from('organizations').update(patch).eq('id', orgId);
    } catch (e) {
      logFail('updateSettings')(e);
    }
  }
};

function auditRow(a: AuditLog) {
  return {
    id: a.id,
    organization_id: a.organization_id,
    user_id: a.user_id,
    user_name: a.user_name,
    action: a.action,
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    details: a.details,
    created_at: a.created_at
  };
}

const REALTIME_TABLES = [
  'profiles', 'products', 'flavors', 'pricing_rules', 'suppliers', 'inventory_locations',
  'purchase_orders', 'purchase_order_items', 'inventory_batches', 'inventory_movements',
  'inventory_balances', 'sales', 'sale_items', 'commission_entries', 'commission_payouts',
  'expenses', 'reservations', 'reservation_items', 'organizations'
];

/**
 * Custom React Hook for Store — backed by Supabase (real login, one shared
 * database for every device and every user) instead of per-device localStorage.
 */
function useStoreInternal() {
  const [state, setState] = useState<AppState>(emptyState());
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const refetchingRef = useRef(false);

  const loadForUser = async (userId: string) => {
    const { data: profileRow, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error || !profileRow) {
      console.error('No profile found for authenticated user — signing out', error);
      await supabase.auth.signOut();
      setState(emptyState());
      setIsLoading(false);
      return;
    }
    const full = await loadOrgData(profileRow as Profile, stateRef.current.dateFilter);
    setState(full);
    setIsLoading(false);
  };

  const refetch = async () => {
    if (refetchingRef.current) return;
    if (!stateRef.current.currentUser.id) return;
    refetchingRef.current = true;
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const full = await loadOrgData({ ...stateRef.current.currentUser, id: authData.user.id }, stateRef.current.dateFilter);
      setState(full);
    } catch (e) {
      console.error('refetch failed', e);
    } finally {
      refetchingRef.current = false;
    }
  };

  // Auth bootstrap: check for an existing session, react to sign-in/out
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        loadForUser(data.session.user.id);
      } else {
        setIsLoading(false);
      }
      setAuthChecked(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setState(emptyState());
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setIsLoading(true);
        loadForUser(session.user.id);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: any change from any device/user refreshes this session's view of
  // the shared data, so the owner's Mac and a seller's phone stay in sync.
  useEffect(() => {
    const orgId = state.settings.id;
    if (!orgId) return;

    const channel = supabase.channel(`org-${orgId}-changes`);
    REALTIME_TABLES.forEach(table => {
      channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        () => {
          refetch();
        }
      );
    });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings.id]);

  // ============================== Auth ==============================
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      return { success: false, error: 'E-mail ou senha incorretos.' };
    }
    setIsLoading(true);
    await loadForUser(data.user.id);
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setState(emptyState());
  };

  // ============================== Date filter (device-local UI preference) ==============================
  const setDateFilter = (option: DateFilterOption, customStart?: string, customEnd?: string) => {
    const todayStr = getTodayDateString();
    let startDate = todayStr;
    let endDate = todayStr;

    if (option === 'this_week') {
      const curr = new Date();
      const first = curr.getDate() - curr.getDay();
      const firstDay = new Date(curr.setDate(first));
      startDate = firstDay.toISOString().split('T')[0];
    } else if (option === 'this_month') {
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      startDate = firstDay.toISOString().split('T')[0];
    } else if (option === 'last_month') {
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth() - 1, 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth(), 0);
      startDate = firstDay.toISOString().split('T')[0];
      endDate = lastDay.toISOString().split('T')[0];
    } else if (option === 'custom') {
      startDate = customStart || todayStr;
      endDate = customEnd || todayStr;
    }

    const pref = { option, startDate, endDate };
    saveDateFilterPref(pref);
    setState(prev => ({ ...prev, dateFilter: pref }));
  };

  const isDateInFilter = (isoDate: string) => {
    if (!isoDate) return false;
    const dateStr = isoDate.split('T')[0];
    const { startDate, endDate } = state.dateFilter;
    return dateStr >= startDate && dateStr <= endDate;
  };

  // ============================== Read helpers ==============================
  const getSellerLocation = (sellerId: string): InventoryLocation | undefined => {
    return state.locations.find(l => l.type === 'seller' && l.seller_id === sellerId);
  };

  const getCentralLocation = (): InventoryLocation => {
    return state.locations.find(l => l.type === 'central') || state.locations[0];
  };

  const getFlavorStock = (locationId: string, flavorId: string): number => {
    const bal = state.balances.find(b => b.location_id === locationId && b.flavor_id === flavorId);
    return bal ? bal.quantity : 0;
  };

  const getTotalLocationStock = (locationId: string): number => {
    return state.balances.filter(b => b.location_id === locationId).reduce((sum, b) => sum + b.quantity, 0);
  };

  // ============================== Sales ==============================
  const confirmSale = (params: {
    sellerId: string;
    items: { flavorId: string; quantity: number }[];
    applyDiscount?: boolean;
  }): { success: boolean; sale?: Sale; error?: string } => {
    const seller = state.profiles.find(p => p.id === params.sellerId) || (params.sellerId === state.currentUser.id ? state.currentUser : undefined);
    if (!seller) return { success: false, error: 'Vendedor não encontrado' };

    const sellerLocation = seller.role === 'owner' ? getCentralLocation() : getSellerLocation(seller.id) || getCentralLocation();
    if (!sellerLocation) return { success: false, error: 'Local de estoque de origem não encontrado' };

    const totalQuantity = params.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity <= 0) return { success: false, error: 'A quantidade precisa ser maior que zero' };

    for (const item of params.items) {
      const currentStock = getFlavorStock(sellerLocation.id, item.flavorId);
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      const flavorName = flavor ? flavor.name : 'Sabor';
      if (currentStock < item.quantity) {
        return {
          success: false,
          error: `Estoque insuficiente para o sabor ${flavorName}. Disponível: ${currentStock}, solicitado: ${item.quantity}.`
        };
      }
    }

    const applyDiscount = params.applyDiscount !== false;
    const fullPrice = 10.0;
    const unitPrice = applyDiscount && totalQuantity >= 2 ? 9.0 : fullPrice;
    const unitCost = state.settings.default_purchase_cost || 4.0;
    const subtotal = totalQuantity * fullPrice;
    const totalAmount = totalQuantity * unitPrice;
    const discountAmount = subtotal - totalAmount;
    const totalCost = totalQuantity * unitCost;
    const grossProfit = totalAmount - totalCost;

    const commissionPercent = seller.role === 'owner' ? 0 : seller.commission_value ?? state.settings.default_commission_value ?? 50;
    const sellerCommission = grossProfit * (commissionPercent / 100);
    const ownerGrossResult = grossProfit - sellerCommission;

    const saleId = generateId();
    const nowIso = new Date().toISOString();
    const txid = 'BRW' + Date.now().toString().slice(-6);

    const saleItems: SaleItem[] = params.items.map(item => {
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      return {
        id: generateId(),
        flavor_id: item.flavorId,
        flavor_name: flavor?.name || 'Sabor',
        quantity: item.quantity,
        unit_sale_price: unitPrice,
        unit_cost: unitCost,
        line_revenue: item.quantity * unitPrice,
        line_cost: item.quantity * unitCost
      };
    });

    const newSale: Sale = {
      id: saleId,
      organization_id: state.settings.id,
      seller_id: seller.id,
      seller_name: seller.name,
      status: 'confirmed',
      payment_status: 'manually_confirmed',
      payment_method: 'pix',
      total_quantity: totalQuantity,
      unit_price_applied: unitPrice,
      subtotal,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      total_cost: totalCost,
      gross_profit: grossProfit,
      seller_commission: sellerCommission,
      owner_gross_result: ownerGrossResult,
      pix_txid: txid,
      confirmed_at: nowIso,
      created_at: nowIso,
      items: saleItems
    };

    const newMovements: InventoryMovement[] = params.items.map(item => {
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      return {
        id: generateId(),
        organization_id: state.settings.id,
        location_id: sellerLocation.id,
        location_name: sellerLocation.name,
        flavor_id: item.flavorId,
        flavor_name: flavor ? flavor.name : '',
        movement_type: 'sale',
        quantity_delta: -item.quantity,
        unit_cost: unitCost,
        reference_type: 'sale',
        reference_id: saleId,
        notes: `Venda ${saleId} realizada por ${seller.name}`,
        created_by: seller.name,
        created_at: nowIso
      };
    });

    const newCommission: CommissionEntry = {
      id: generateId(),
      organization_id: state.settings.id,
      seller_id: seller.id,
      seller_name: seller.name,
      sale_id: saleId,
      type: 'percentage_of_gross_profit',
      amount: sellerCommission,
      status: 'pending',
      description: `Comissão da venda ${txid} (${totalQuantity} brownies)`,
      created_at: nowIso
    };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: seller.id,
      user_name: seller.name,
      action: 'sale_confirmed',
      entity_type: 'sale',
      entity_id: saleId,
      details: `Venda ${txid} de ${totalQuantity} brownies confirmada. Total: R$ ${totalAmount.toFixed(2)}, Comissão: R$ ${sellerCommission.toFixed(2)}`,
      created_at: nowIso
    };

    setState(prev => {
      const updatedBalances = [...prev.balances];
      for (const item of params.items) {
        const index = updatedBalances.findIndex(b => b.location_id === sellerLocation.id && b.flavor_id === item.flavorId);
        if (index >= 0) {
          updatedBalances[index] = { ...updatedBalances[index], quantity: Math.max(0, updatedBalances[index].quantity - item.quantity) };
        } else {
          updatedBalances.push({ location_id: sellerLocation.id, flavor_id: item.flavorId, quantity: 0 });
        }
      }

      return {
        ...prev,
        sales: [newSale, ...prev.sales],
        balances: updatedBalances,
        movements: [...newMovements, ...prev.movements],
        commissions: [newCommission, ...prev.commissions],
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    void persist.sale(newSale, saleItems, newMovements, newCommission, audit);
    triggerSaleWebhook(newSale);

    return { success: true, sale: newSale };
  };

  const cancelSale = (saleId: string, reason: string): { success: boolean; error?: string } => {
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) return { success: false, error: 'Venda não encontrada' };
    if (sale.status === 'cancelled') return { success: false, error: 'Esta venda já está cancelada' };

    const sellerLocation = getSellerLocation(sale.seller_id) || getCentralLocation();
    if (!sellerLocation) return { success: false, error: 'Estoque de origem não localizado' };

    const nowIso = new Date().toISOString();

    const reversalMovements: InventoryMovement[] = sale.items.map(item => ({
      id: generateId(),
      organization_id: state.settings.id,
      location_id: sellerLocation.id,
      location_name: sellerLocation.name,
      flavor_id: item.flavor_id,
      flavor_name: item.flavor_name,
      movement_type: 'sale_reversal',
      quantity_delta: item.quantity,
      unit_cost: item.unit_cost,
      reference_type: 'sale_cancellation',
      reference_id: saleId,
      notes: `Estorno da venda ${sale.pix_txid}. Motivo: ${reason}`,
      created_by: state.currentUser.name,
      created_at: nowIso
    }));

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'sale_cancelled',
      entity_type: 'sale',
      entity_id: saleId,
      details: `Cancelamento da venda ${sale.pix_txid} de R$ ${sale.total_amount.toFixed(2)}. Motivo: ${reason}`,
      created_at: nowIso
    };

    setState(prev => {
      const updatedBalances = [...prev.balances];
      for (const item of sale.items) {
        const index = updatedBalances.findIndex(b => b.location_id === sellerLocation.id && b.flavor_id === item.flavor_id);
        if (index >= 0) updatedBalances[index] = { ...updatedBalances[index], quantity: updatedBalances[index].quantity + item.quantity };
      }

      const updatedSales = prev.sales.map(s => (s.id === saleId ? { ...s, status: 'cancelled' as const, cancelled_at: nowIso } : s));
      const updatedCommissions = prev.commissions.map(c => (c.sale_id === saleId ? { ...c, status: 'reversed' as const } : c));

      return {
        ...prev,
        sales: updatedSales,
        balances: updatedBalances,
        commissions: updatedCommissions,
        movements: [...reversalMovements, ...prev.movements],
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    void persist.cancelSale(saleId, reversalMovements, audit);

    return { success: true };
  };

  const deleteSale = (saleId: string): { success: boolean; error?: string } => {
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) return { success: false, error: 'Venda não encontrada' };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'sale_deleted',
      entity_type: 'sale',
      entity_id: saleId,
      details: `Registro de venda ${sale.pix_txid} removido do sistema`,
      created_at: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      sales: prev.sales.filter(s => s.id !== saleId),
      commissions: prev.commissions.filter(c => c.sale_id !== saleId),
      auditLogs: [audit, ...prev.auditLogs]
    }));

    void persist.deleteSale(saleId, audit);

    return { success: true };
  };

  // ============================== Stock movements ==============================
  const transferToSeller = (params: { sellerId: string; items: { flavorId: string; quantity: number }[]; notes?: string }): { success: boolean; error?: string } => {
    const centralLocation = getCentralLocation();
    const sellerLocation = getSellerLocation(params.sellerId);
    const seller = state.profiles.find(p => p.id === params.sellerId);

    if (!seller || !sellerLocation) return { success: false, error: 'Vendedor ou estoque de destino não encontrado' };

    for (const item of params.items) {
      if (item.quantity <= 0) continue;
      const centralStock = getFlavorStock(centralLocation.id, item.flavorId);
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      if (centralStock < item.quantity) {
        return { success: false, error: `Estoque central insuficiente para o sabor ${flavor?.name}. Disponível: ${centralStock}, solicitado: ${item.quantity}.` };
      }
    }

    const nowIso = new Date().toISOString();
    const totalItems = params.items.reduce((s, i) => s + i.quantity, 0);
    if (totalItems <= 0) return { success: false, error: 'Selecione pelo menos um brownie para transferir' };

    const newMovements: InventoryMovement[] = [];
    params.items.forEach(item => {
      if (item.quantity <= 0) return;
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      newMovements.push({
        id: generateId(),
        organization_id: state.settings.id,
        location_id: centralLocation.id,
        location_name: centralLocation.name,
        flavor_id: item.flavorId,
        flavor_name: flavor?.name || '',
        movement_type: 'transfer_out',
        quantity_delta: -item.quantity,
        notes: `Transferência para ${seller.name}. ${params.notes || ''}`,
        created_by: state.currentUser.name,
        created_at: nowIso
      });
      newMovements.push({
        id: generateId(),
        organization_id: state.settings.id,
        location_id: sellerLocation.id,
        location_name: sellerLocation.name,
        flavor_id: item.flavorId,
        flavor_name: flavor?.name || '',
        movement_type: 'transfer_in',
        quantity_delta: item.quantity,
        notes: `Recebido do estoque central. ${params.notes || ''}`,
        created_by: state.currentUser.name,
        created_at: nowIso
      });
    });

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'inventory_transferred',
      entity_type: 'inventory_transfer',
      details: `Transferência de ${totalItems} brownies do estoque central para ${seller.name}`,
      created_at: nowIso
    };

    setState(prev => {
      const updatedBalances = [...prev.balances];
      params.items.forEach(item => {
        if (item.quantity <= 0) return;
        const centralIdx = updatedBalances.findIndex(b => b.location_id === centralLocation.id && b.flavor_id === item.flavorId);
        if (centralIdx >= 0) updatedBalances[centralIdx] = { ...updatedBalances[centralIdx], quantity: Math.max(0, updatedBalances[centralIdx].quantity - item.quantity) };
        const sellerIdx = updatedBalances.findIndex(b => b.location_id === sellerLocation.id && b.flavor_id === item.flavorId);
        if (sellerIdx >= 0) {
          updatedBalances[sellerIdx] = { ...updatedBalances[sellerIdx], quantity: updatedBalances[sellerIdx].quantity + item.quantity };
        } else {
          updatedBalances.push({ location_id: sellerLocation.id, flavor_id: item.flavorId, quantity: item.quantity });
        }
      });

      return { ...prev, balances: updatedBalances, movements: [...newMovements, ...prev.movements], auditLogs: [audit, ...prev.auditLogs] };
    });

    void persist.movements(newMovements, audit);

    return { success: true };
  };

  const returnToCentral = (params: { sellerId: string; items: { flavorId: string; quantity: number }[]; notes?: string }): { success: boolean; error?: string } => {
    const centralLocation = getCentralLocation();
    const sellerLocation = getSellerLocation(params.sellerId);
    const seller = state.profiles.find(p => p.id === params.sellerId);

    if (!seller || !sellerLocation) return { success: false, error: 'Vendedor ou estoque de origem não encontrado' };

    for (const item of params.items) {
      if (item.quantity <= 0) continue;
      const sellerStock = getFlavorStock(sellerLocation.id, item.flavorId);
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      if (sellerStock < item.quantity) return { success: false, error: `Estoque insuficiente com o vendedor para o sabor ${flavor?.name}.` };
    }

    const nowIso = new Date().toISOString();
    const totalItems = params.items.reduce((s, i) => s + i.quantity, 0);
    if (totalItems <= 0) return { success: false, error: 'Selecione pelo menos uma unidade para devolver' };

    const newMovements: InventoryMovement[] = [];
    params.items.forEach(item => {
      if (item.quantity <= 0) return;
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      newMovements.push({
        id: generateId(),
        organization_id: state.settings.id,
        location_id: sellerLocation.id,
        location_name: sellerLocation.name,
        flavor_id: item.flavorId,
        flavor_name: flavor?.name || '',
        movement_type: 'return_to_central',
        quantity_delta: -item.quantity,
        notes: `Devolução para estoque central. ${params.notes || ''}`,
        created_by: state.currentUser.name,
        created_at: nowIso
      });
      newMovements.push({
        id: generateId(),
        organization_id: state.settings.id,
        location_id: centralLocation.id,
        location_name: centralLocation.name,
        flavor_id: item.flavorId,
        flavor_name: flavor?.name || '',
        movement_type: 'transfer_in',
        quantity_delta: item.quantity,
        notes: `Devolução recebida de ${seller.name}. ${params.notes || ''}`,
        created_by: state.currentUser.name,
        created_at: nowIso
      });
    });

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'inventory_returned',
      entity_type: 'inventory_transfer',
      details: `Devolução de ${totalItems} brownies de ${seller.name} para o estoque central`,
      created_at: nowIso
    };

    setState(prev => {
      const updatedBalances = [...prev.balances];
      params.items.forEach(item => {
        if (item.quantity <= 0) return;
        const sellerIdx = updatedBalances.findIndex(b => b.location_id === sellerLocation.id && b.flavor_id === item.flavorId);
        if (sellerIdx >= 0) updatedBalances[sellerIdx] = { ...updatedBalances[sellerIdx], quantity: Math.max(0, updatedBalances[sellerIdx].quantity - item.quantity) };
        const centralIdx = updatedBalances.findIndex(b => b.location_id === centralLocation.id && b.flavor_id === item.flavorId);
        if (centralIdx >= 0) updatedBalances[centralIdx] = { ...updatedBalances[centralIdx], quantity: updatedBalances[centralIdx].quantity + item.quantity };
      });

      return { ...prev, balances: updatedBalances, movements: [...newMovements, ...prev.movements], auditLogs: [audit, ...prev.auditLogs] };
    });

    void persist.movements(newMovements, audit);

    return { success: true };
  };

  const registerLoss = (params: {
    locationId: string;
    flavorId: string;
    quantity: number;
    reason: 'Produto danificado' | 'Produto perdido' | 'Produto vencido' | 'Erro de estoque';
    notes?: string;
  }): { success: boolean; error?: string } => {
    const location = state.locations.find(l => l.id === params.locationId);
    const flavor = state.flavors.find(f => f.id === params.flavorId);
    if (!location || !flavor) return { success: false, error: 'Local ou sabor inválido' };

    const currentStock = getFlavorStock(location.id, flavor.id);
    if (currentStock < params.quantity) return { success: false, error: `Estoque insuficiente no local selecionado. Atual: ${currentStock}` };

    const nowIso = new Date().toISOString();
    const movement: InventoryMovement = {
      id: generateId(),
      organization_id: state.settings.id,
      location_id: location.id,
      location_name: location.name,
      flavor_id: flavor.id,
      flavor_name: flavor.name,
      movement_type: params.reason === 'Produto vencido' ? 'expired' : 'loss',
      quantity_delta: -params.quantity,
      unit_cost: state.settings.default_purchase_cost,
      notes: `Perda: ${params.reason}. ${params.notes || ''}`,
      created_by: state.currentUser.name,
      created_at: nowIso
    };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'inventory_loss_registered',
      entity_type: 'inventory_loss',
      details: `Registro de perda de ${params.quantity} unidades de ${flavor.name} em ${location.name}. Motivo: ${params.reason}`,
      created_at: nowIso
    };

    setState(prev => ({
      ...prev,
      balances: prev.balances.map(b => (b.location_id === location.id && b.flavor_id === flavor.id ? { ...b, quantity: Math.max(0, b.quantity - params.quantity) } : b)),
      movements: [movement, ...prev.movements],
      auditLogs: [audit, ...prev.auditLogs]
    }));

    void persist.movements([movement], audit);

    return { success: true };
  };

  // ============================== Purchasing ==============================
  const createPurchaseOrder = (params: {
    supplierId: string;
    items: { flavorId: string; quantity: number; unitCost: number }[];
    expectedDeliveryDate?: string;
    notes?: string;
  }): { success: boolean; error?: string } => {
    const supplier = state.suppliers.find(s => s.id === params.supplierId);
    if (!supplier) return { success: false, error: 'Fornecedor não encontrado' };

    const totalAmount = params.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    const orderNumber = `PED-${(state.purchaseOrders.length + 1).toString().padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    const orderItems = params.items.map(item => {
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      return {
        id: generateId(),
        flavor_id: item.flavorId,
        flavor_name: flavor?.name || 'Sabor',
        quantity_ordered: item.quantity,
        quantity_received: 0,
        unit_cost: item.unitCost,
        total_cost: item.quantity * item.unitCost
      };
    });

    const newOrder: PurchaseOrder = {
      id: generateId(),
      order_number: orderNumber,
      organization_id: state.settings.id,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      status: 'ordered',
      order_date: nowIso.split('T')[0],
      expected_delivery_date: params.expectedDeliveryDate || formatDateOffset(3).split('T')[0],
      total_amount: totalAmount,
      notes: params.notes,
      items: orderItems,
      created_at: nowIso
    };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'purchase_order_created',
      entity_type: 'purchase_order',
      entity_id: newOrder.id,
      details: `Pedido de compra ${orderNumber} criado para ${supplier.name}. Valor total: R$ ${totalAmount.toFixed(2)}`,
      created_at: nowIso
    };

    setState(prev => ({ ...prev, purchaseOrders: [newOrder, ...prev.purchaseOrders], auditLogs: [audit, ...prev.auditLogs] }));

    void persist.purchaseOrder(newOrder, audit);

    return { success: true };
  };

  const receivePurchaseOrder = (orderId: string, customExpiration?: string, customBatchCode?: string): { success: boolean; error?: string } => {
    const order = state.purchaseOrders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Pedido de compra não encontrado' };
    if (order.status === 'received') return { success: false, error: 'Este pedido já foi recebido' };

    const centralLocation = getCentralLocation();
    const nowIso = new Date().toISOString();
    const expirationDate = customExpiration || formatDateOffset(10);

    const newBatches: InventoryBatch[] = [];
    const newMovements: InventoryMovement[] = [];

    order.items.forEach(item => {
      newBatches.push({
        id: generateId(),
        organization_id: state.settings.id,
        flavor_id: item.flavor_id,
        flavor_name: item.flavor_name,
        purchase_order_id: order.id,
        supplier_id: order.supplier_id,
        batch_reference: customBatchCode ? `${customBatchCode}-${item.flavor_name.slice(0, 3).toUpperCase()}` : `LT-${order.order_number}-${item.flavor_name.slice(0, 3).toUpperCase()}`,
        unit_cost: item.unit_cost,
        quantity_received: item.quantity_ordered,
        quantity_remaining: item.quantity_ordered,
        manufacturing_date: nowIso.split('T')[0],
        expiration_date: expirationDate.split('T')[0],
        received_at: nowIso
      });

      newMovements.push({
        id: generateId(),
        organization_id: state.settings.id,
        location_id: centralLocation.id,
        location_name: centralLocation.name,
        flavor_id: item.flavor_id,
        flavor_name: item.flavor_name,
        movement_type: 'purchase_receipt',
        quantity_delta: item.quantity_ordered,
        unit_cost: item.unit_cost,
        reference_type: 'purchase_order',
        reference_id: order.id,
        notes: `Recebimento de compra ${order.order_number}`,
        created_by: state.currentUser.name,
        created_at: nowIso
      });
    });

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'purchase_received',
      entity_type: 'purchase_order',
      entity_id: order.id,
      details: `Recebimento confirmado do pedido ${order.order_number}. Estoque central abastecido.`,
      created_at: nowIso
    };

    const updatedOrder: PurchaseOrder = {
      ...order,
      status: 'received',
      received_at: nowIso,
      items: order.items.map(i => ({ ...i, quantity_received: i.quantity_ordered }))
    };

    setState(prev => {
      const updatedBalances = [...prev.balances];
      order.items.forEach(item => {
        const idx = updatedBalances.findIndex(b => b.location_id === centralLocation.id && b.flavor_id === item.flavor_id);
        if (idx >= 0) updatedBalances[idx] = { ...updatedBalances[idx], quantity: updatedBalances[idx].quantity + item.quantity_ordered };
        else updatedBalances.push({ location_id: centralLocation.id, flavor_id: item.flavor_id, quantity: item.quantity_ordered });
      });

      return {
        ...prev,
        purchaseOrders: prev.purchaseOrders.map(o => (o.id === orderId ? updatedOrder : o)),
        batches: [...newBatches, ...prev.batches],
        movements: [...newMovements, ...prev.movements],
        balances: updatedBalances,
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    void persist.receivePurchaseOrder(updatedOrder, newBatches, newMovements, audit);

    return { success: true };
  };

  const deletePurchaseOrder = (orderId: string): { success: boolean; error?: string } => {
    const order = state.purchaseOrders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Pedido de compra não encontrado' };

    const centralLocation = getCentralLocation();
    const orderBatches = state.batches.filter(b => b.purchase_order_id === orderId);

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'purchase_order_deleted',
      entity_type: 'purchase_order',
      entity_id: orderId,
      details: `Pedido de compra ${order.order_number} removido`,
      created_at: new Date().toISOString()
    };

    setState(prev => {
      let updatedBatches = [...prev.batches];
      let updatedBalances = [...prev.balances];

      if (order.status === 'received' && centralLocation) {
        updatedBatches = prev.batches.filter(b => b.purchase_order_id !== orderId);
        orderBatches.forEach(b => {
          const balIdx = updatedBalances.findIndex(x => x.location_id === centralLocation.id && x.flavor_id === b.flavor_id);
          if (balIdx >= 0) updatedBalances[balIdx] = { ...updatedBalances[balIdx], quantity: Math.max(0, updatedBalances[balIdx].quantity - b.quantity_remaining) };
        });
      }

      return {
        ...prev,
        purchaseOrders: prev.purchaseOrders.filter(o => o.id !== orderId),
        batches: updatedBatches,
        balances: updatedBalances,
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    void persist.deletePurchaseOrder(orderId, orderBatches.map(b => b.id), audit);

    return { success: true };
  };

  const deleteBatch = (batchId: string, reason = 'Descarte / Ajuste'): { success: boolean; error?: string } => {
    const batch = state.batches.find(b => b.id === batchId);
    if (!batch) return { success: false, error: 'Lote não encontrado' };

    const centralLocation = getCentralLocation();
    const nowIso = new Date().toISOString();

    const movement: InventoryMovement = {
      id: generateId(),
      organization_id: state.settings.id,
      location_id: centralLocation.id,
      location_name: centralLocation.name,
      flavor_id: batch.flavor_id,
      flavor_name: batch.flavor_name,
      batch_id: batch.id,
      movement_type: 'manual_adjustment_minus',
      quantity_delta: -batch.quantity_remaining,
      unit_cost: batch.unit_cost,
      notes: `Exclusão/Descarte de lote ${batch.batch_reference}: ${reason}`,
      created_by: state.currentUser.name,
      created_at: nowIso
    };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'batch_deleted',
      entity_type: 'inventory_batch',
      entity_id: batchId,
      details: `Lote ${batch.batch_reference} (${batch.quantity_remaining} un de ${batch.flavor_name}) removido. Motivo: ${reason}`,
      created_at: nowIso
    };

    setState(prev => ({
      ...prev,
      batches: prev.batches.filter(b => b.id !== batchId),
      balances: prev.balances.map(b => (b.location_id === centralLocation.id && b.flavor_id === batch.flavor_id ? { ...b, quantity: Math.max(0, b.quantity - batch.quantity_remaining) } : b)),
      movements: [movement, ...prev.movements],
      auditLogs: [audit, ...prev.auditLogs]
    }));

    void persist.deleteBatch(batchId, movement, audit);

    return { success: true };
  };

  const createBatchManual = (params: {
    flavorId: string;
    quantity: number;
    expirationDate: string;
    unitCost?: number;
    batchRef?: string;
    notes?: string;
  }): { success: boolean; error?: string } => {
    if (params.quantity <= 0) return { success: false, error: 'Quantidade deve ser maior que zero' };
    const flavor = state.flavors.find(f => f.id === params.flavorId);
    if (!flavor) return { success: false, error: 'Sabor não encontrado' };

    const centralLocation = getCentralLocation();
    const nowIso = new Date().toISOString();
    const cost = params.unitCost ?? state.settings.default_purchase_cost ?? 4.0;
    const refCode = params.batchRef?.trim() || `LT-${Date.now().toString(36).toUpperCase()}-${flavor.name.slice(0, 3).toUpperCase()}`;

    const newBatch: InventoryBatch = {
      id: generateId(),
      organization_id: state.settings.id,
      flavor_id: flavor.id,
      flavor_name: flavor.name,
      batch_reference: refCode,
      unit_cost: cost,
      quantity_received: params.quantity,
      quantity_remaining: params.quantity,
      manufacturing_date: nowIso.split('T')[0],
      expiration_date: params.expirationDate,
      received_at: nowIso
    };

    const movement: InventoryMovement = {
      id: generateId(),
      organization_id: state.settings.id,
      location_id: centralLocation.id,
      location_name: centralLocation.name,
      flavor_id: flavor.id,
      flavor_name: flavor.name,
      batch_id: newBatch.id,
      movement_type: 'purchase_receipt',
      quantity_delta: params.quantity,
      unit_cost: cost,
      notes: `Entrada avulsa de lote: ${refCode}. ${params.notes || ''}`,
      created_by: state.currentUser.name,
      created_at: nowIso
    };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'batch_created_manual',
      entity_type: 'inventory_batch',
      entity_id: newBatch.id,
      details: `Lote avulso ${refCode} com ${params.quantity} brownies de ${flavor.name} adicionado ao estoque central`,
      created_at: nowIso
    };

    setState(prev => {
      const updatedBalances = [...prev.balances];
      const idx = updatedBalances.findIndex(b => b.location_id === centralLocation.id && b.flavor_id === flavor.id);
      if (idx >= 0) updatedBalances[idx] = { ...updatedBalances[idx], quantity: updatedBalances[idx].quantity + params.quantity };
      else updatedBalances.push({ location_id: centralLocation.id, flavor_id: flavor.id, quantity: params.quantity });

      return {
        ...prev,
        batches: [newBatch, ...prev.batches],
        balances: updatedBalances,
        movements: [movement, ...prev.movements],
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    void persist.createBatchManual(newBatch, movement, audit);

    return { success: true };
  };

  // ============================== Commissions & Expenses ==============================
  const payCommission = (params: { sellerId: string; entryIds: string[]; paymentMethod: string; notes?: string }): { success: boolean; error?: string } => {
    const seller = state.profiles.find(p => p.id === params.sellerId);
    if (!seller) return { success: false, error: 'Vendedor não encontrado' };

    const selectedEntries = state.commissions.filter(c => params.entryIds.includes(c.id));
    if (selectedEntries.length === 0) return { success: false, error: 'Nenhuma comissão pendente selecionada' };

    const totalAmount = selectedEntries.reduce((sum, e) => sum + e.amount, 0);
    const nowIso = new Date().toISOString();
    const payoutNumber = `PAG-${(state.payouts.length + 1).toString().padStart(3, '0')}`;

    const newPayout: CommissionPayout = {
      id: generateId(),
      payout_number: payoutNumber,
      organization_id: state.settings.id,
      seller_id: seller.id,
      seller_name: seller.name,
      period_start: selectedEntries[selectedEntries.length - 1]?.created_at.split('T')[0] || nowIso.split('T')[0],
      period_end: nowIso.split('T')[0],
      amount: totalAmount,
      status: 'paid',
      paid_at: nowIso,
      payment_method: params.paymentMethod || 'Pix',
      notes: params.notes,
      entry_ids: params.entryIds,
      created_by: state.currentUser.name,
      created_at: nowIso
    };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'commission_paid',
      entity_type: 'commission_payout',
      entity_id: newPayout.id,
      details: `Pagamento de comissão ${payoutNumber} para ${seller.name}. Valor: R$ ${totalAmount.toFixed(2)}`,
      created_at: nowIso
    };

    setState(prev => ({
      ...prev,
      payouts: [newPayout, ...prev.payouts],
      commissions: prev.commissions.map(c => (params.entryIds.includes(c.id) ? { ...c, status: 'paid' as const } : c)),
      auditLogs: [audit, ...prev.auditLogs]
    }));

    void persist.payCommission(newPayout, params.entryIds, audit);

    return { success: true };
  };

  const addExpense = (params: { category: Expense['category']; description: string; amount: number; expenseDate?: string }): { success: boolean } => {
    const nowIso = new Date().toISOString();
    const newExpense: Expense = {
      id: generateId(),
      organization_id: state.settings.id,
      category: params.category,
      description: params.description,
      amount: params.amount,
      expense_date: params.expenseDate || nowIso.split('T')[0],
      created_by: state.currentUser.name,
      created_at: nowIso
    };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'expense_created',
      entity_type: 'expense',
      entity_id: newExpense.id,
      details: `Despesa registrada: ${params.description} - R$ ${params.amount.toFixed(2)}`,
      created_at: nowIso
    };

    setState(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses], auditLogs: [audit, ...prev.auditLogs] }));

    void persist.expense(newExpense, audit);

    return { success: true };
  };

  const deleteExpense = (expenseId: string): { success: boolean; error?: string } => {
    const expense = state.expenses.find(e => e.id === expenseId);
    if (!expense) return { success: false, error: 'Despesa não encontrada' };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'expense_deleted',
      entity_type: 'expense',
      entity_id: expenseId,
      details: `Despesa "${expense.description}" de R$ ${expense.amount.toFixed(2)} excluída`,
      created_at: new Date().toISOString()
    };

    setState(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== expenseId), auditLogs: [audit, ...prev.auditLogs] }));

    void persist.deleteExpense(expenseId, audit);

    return { success: true };
  };

  // ============================== Sellers (owner-only, backed by an Edge Function) ==============================
  // Creating/deleting a login or resetting someone else's password needs the Auth Admin API,
  // which only runs safely on the server with the service role — never in the browser. These
  // three calls hit the `manage-seller` Edge Function, authenticated as the current owner.
  const callManageSeller = async (body: Record<string, any>): Promise<{ success: boolean; error?: string; profile?: any }> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { success: false, error: 'Sessão expirada, faça login novamente.' };

    try {
      const { data, error } = await supabase.functions.invoke('manage-seller', {
        body,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (error) return { success: false, error: error.message };
      if (data?.error) return { success: false, error: data.error };
      return { success: true, profile: data?.profile };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha ao comunicar com o servidor' };
    }
  };

  const createSeller = async (params: {
    name: string;
    email: string;
    phone: string;
    password: string;
    commissionType?: 'percentage_of_gross_profit' | 'fixed_per_unit';
    commissionValue?: number;
  }): Promise<{ success: boolean; seller?: Profile; error?: string }> => {
    if (!params.name.trim()) return { success: false, error: 'O nome é obrigatório' };
    if (!params.email.trim()) return { success: false, error: 'O e-mail de acesso é obrigatório' };
    if (!params.password || params.password.trim().length < 4) {
      return { success: false, error: 'Defina uma senha de acesso com pelo menos 4 caracteres' };
    }

    const res = await callManageSeller({
      action: 'create',
      name: params.name.trim(),
      email: params.email.trim(),
      phone: params.phone.trim(),
      password: params.password.trim(),
      commissionType: params.commissionType,
      commissionValue: params.commissionValue
    });

    if (res.success) await refetch();
    return res.success ? { success: true, seller: res.profile } : { success: false, error: res.error };
  };

  const deleteSeller = async (sellerId: string): Promise<{ success: boolean; error?: string }> => {
    const seller = state.profiles.find(p => p.id === sellerId);
    if (!seller) return { success: false, error: 'Vendedor não encontrado' };
    if (seller.role === 'owner') return { success: false, error: 'Não é permitido excluir o administrador' };

    const res = await callManageSeller({ action: 'delete', sellerId });
    if (res.success) await refetch();
    return res;
  };

  const setAccountPassword = async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'A senha precisa ter pelo menos 4 caracteres' };
    }
    return callManageSeller({ action: 'reset_password', userId, newPassword: newPassword.trim() });
  };

  const toggleSellerStatus = (sellerId: string) => {
    const target = state.profiles.find(p => p.id === sellerId);
    if (!target) return;
    const newStatus = target.status === 'active' ? 'inactive' : 'active';

    setState(prev => ({ ...prev, profiles: prev.profiles.map(p => (p.id === sellerId ? { ...p, status: newStatus } : p)) }));

    void persist.toggleSellerStatus(sellerId, newStatus);
  };

  // ============================== Catalog: suppliers & flavors ==============================
  const createSupplier = (params: Omit<Supplier, 'id' | 'organization_id' | 'created_at' | 'active'>) => {
    const newSupplier: Supplier = { ...params, id: generateId(), organization_id: state.settings.id, active: true, created_at: new Date().toISOString() };
    setState(prev => ({ ...prev, suppliers: [newSupplier, ...prev.suppliers] }));
    void persist.createSupplier(newSupplier);
  };

  const deleteSupplier = (supplierId: string): { success: boolean; error?: string } => {
    const supplier = state.suppliers.find(s => s.id === supplierId);
    if (!supplier) return { success: false, error: 'Fornecedor não encontrado' };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'supplier_deleted',
      entity_type: 'supplier',
      entity_id: supplierId,
      details: `Fornecedor ${supplier.name} removido`,
      created_at: new Date().toISOString()
    };

    setState(prev => ({ ...prev, suppliers: prev.suppliers.filter(s => s.id !== supplierId), auditLogs: [audit, ...prev.auditLogs] }));

    void persist.deleteSupplier(supplierId, audit);

    return { success: true };
  };

  const createFlavor = (name: string) => {
    if (!name.trim()) return;
    const newFlavor: Flavor = {
      id: generateId(),
      organization_id: state.settings.id,
      name: name.trim(),
      active: true,
      sort_order: state.flavors.length + 1,
      created_at: new Date().toISOString()
    };

    const locationIds = state.locations.map(l => l.id);

    setState(prev => ({
      ...prev,
      flavors: [...prev.flavors, newFlavor],
      balances: [...prev.balances, ...locationIds.map(locId => ({ location_id: locId, flavor_id: newFlavor.id, quantity: 0 }))]
    }));

    void persist.createFlavor(newFlavor, locationIds);
  };

  const toggleFlavorActive = (flavorId: string) => {
    const flavor = state.flavors.find(f => f.id === flavorId);
    if (!flavor) return;
    const nextActive = !flavor.active;
    setState(prev => ({ ...prev, flavors: prev.flavors.map(f => (f.id === flavorId ? { ...f, active: nextActive } : f)) }));
    void persist.toggleFlavorActive(flavorId, nextActive);
  };

  const deleteFlavor = (flavorId: string): { success: boolean; error?: string } => {
    const flavor = state.flavors.find(f => f.id === flavorId);
    if (!flavor) return { success: false, error: 'Sabor não encontrado' };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'flavor_deleted',
      entity_type: 'flavor',
      entity_id: flavorId,
      details: `Sabor "${flavor.name}" removido do catálogo`,
      created_at: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      flavors: prev.flavors.filter(f => f.id !== flavorId),
      balances: prev.balances.filter(b => b.flavor_id !== flavorId),
      auditLogs: [audit, ...prev.auditLogs]
    }));

    void persist.deleteFlavor(flavorId, audit);

    return { success: true };
  };

  // ============================== Reservations ==============================
  const createReservation = (params: {
    sellerId?: string;
    customerName: string;
    saleDate: string;
    items: { flavorId: string; quantity: number }[];
    notes?: string;
  }): { success: boolean; reservation?: Reservation; error?: string } => {
    if (!params.customerName.trim()) return { success: false, error: 'Informe o nome do cliente' };
    if (!params.saleDate) return { success: false, error: 'Informe a data da venda' };

    const items = params.items.filter(i => Number(i.quantity) > 0);
    if (items.length === 0) return { success: false, error: 'Informe ao menos um sabor e quantidade' };

    const sellerId = params.sellerId || state.currentUser.id;
    const seller = state.profiles.find(p => p.id === sellerId) || (sellerId === state.currentUser.id ? state.currentUser : undefined);
    if (!seller) return { success: false, error: 'Vendedor não encontrado' };

    const nowIso = new Date().toISOString();

    const reservationItems: ReservationItem[] = items.map(item => {
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      return { id: generateId(), flavor_id: item.flavorId, flavor_name: flavor?.name || 'Sabor', quantity: Number(item.quantity) };
    });

    const totalQuantity = reservationItems.reduce((s, i) => s + i.quantity, 0);

    const newReservation: Reservation = {
      id: generateId(),
      organization_id: state.settings.id,
      seller_id: seller.id,
      seller_name: seller.name,
      customer_name: params.customerName.trim(),
      sale_date: params.saleDate,
      status: 'pending',
      items: reservationItems,
      total_quantity: totalQuantity,
      notes: params.notes?.trim() || undefined,
      created_by: state.currentUser.id,
      created_at: nowIso
    };

    const audit: AuditLog = {
      id: generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'reservation_created',
      entity_type: 'reservation',
      entity_id: newReservation.id,
      details: `Reserva criada para ${newReservation.customer_name} (${totalQuantity} brownies) em nome de ${seller.name}`,
      created_at: nowIso
    };

    setState(prev => ({ ...prev, reservations: [newReservation, ...prev.reservations], auditLogs: [audit, ...prev.auditLogs] }));

    void persist.createReservation(newReservation, reservationItems, audit);

    return { success: true, reservation: newReservation };
  };

  const markReservationDelivered = (reservationId: string): { success: boolean; error?: string } => {
    const reservation = state.reservations.find(r => r.id === reservationId);
    if (!reservation) return { success: false, error: 'Reserva não encontrada' };
    const deliveredAt = new Date().toISOString();

    setState(prev => ({
      ...prev,
      reservations: prev.reservations.map(r => (r.id === reservationId ? { ...r, status: 'delivered', delivered_at: deliveredAt } : r))
    }));

    void persist.updateReservation(reservationId, { status: 'delivered', delivered_at: deliveredAt });

    return { success: true };
  };

  const cancelReservation = (reservationId: string): { success: boolean; error?: string } => {
    const reservation = state.reservations.find(r => r.id === reservationId);
    if (!reservation) return { success: false, error: 'Reserva não encontrada' };
    const cancelledAt = new Date().toISOString();

    setState(prev => ({
      ...prev,
      reservations: prev.reservations.map(r => (r.id === reservationId ? { ...r, status: 'cancelled', cancelled_at: cancelledAt } : r))
    }));

    void persist.updateReservation(reservationId, { status: 'cancelled', cancelled_at: cancelledAt });

    return { success: true };
  };

  const deleteReservation = (reservationId: string) => {
    setState(prev => ({ ...prev, reservations: prev.reservations.filter(r => r.id !== reservationId) }));
    void persist.deleteReservation(reservationId);
  };

  const getPendingReservationSummary = () => {
    const pending = state.reservations.filter(r => r.status === 'pending');
    const bySeller = new Map<string, { sellerId: string; sellerName: string; totalQuantity: number; byFlavor: Record<string, number>; count: number }>();

    for (const r of pending) {
      const entry = bySeller.get(r.seller_id) || { sellerId: r.seller_id, sellerName: r.seller_name, totalQuantity: 0, byFlavor: {} as Record<string, number>, count: 0 };
      entry.count += 1;
      entry.totalQuantity += r.total_quantity;
      for (const item of r.items) entry.byFlavor[item.flavor_name] = (entry.byFlavor[item.flavor_name] || 0) + item.quantity;
      bySeller.set(r.seller_id, entry);
    }

    return Array.from(bySeller.values());
  };

  // ============================== Smart replenishment ==============================
  const REPLENISHMENT_LOOKBACK_DAYS = 7;
  const REPLENISHMENT_SAFETY_MARGIN = 1.2;
  const REPLENISHMENT_TARGET_COVERAGE_DAYS = 2;
  const REPLENISHMENT_YELLOW_MULTIPLIER = 1.3;
  const REPLENISHMENT_SELLING_DAYS_PER_WEEK = 5;

  const getReplenishmentAnalysis = () => {
    const now = new Date();
    const lookbackStart = new Date(now);
    lookbackStart.setDate(lookbackStart.getDate() - REPLENISHMENT_LOOKBACK_DAYS);
    const activeFlavors = state.flavors.filter(f => f.active);
    const sellers = state.profiles.filter(p => p.role === 'seller' && p.status === 'active');

    const centralLocation = state.locations.find(l => l.type === 'central');
    const centralStock = centralLocation ? activeFlavors.reduce((sum, f) => sum + getFlavorStock(centralLocation.id, f.id), 0) : 0;

    const perSeller = sellers.map(seller => {
      const location = state.locations.find(l => l.type === 'seller' && l.seller_id === seller.id);
      const physicalStock = location ? activeFlavors.reduce((sum, f) => sum + getFlavorStock(location.id, f.id), 0) : 0;

      const recentSales = state.sales.filter(s => s.seller_id === seller.id && s.status === 'confirmed' && new Date(s.created_at) >= lookbackStart);
      const unitsSoldRecently = recentSales.reduce((sum, s) => sum + s.total_quantity, 0);
      const sellingDays = new Set(recentSales.map(s => s.created_at.split('T')[0])).size;
      const dailyAverage = sellingDays > 0 ? unitsSoldRecently / sellingDays : 0;

      const reservedUnits = state.reservations.filter(r => r.seller_id === seller.id && r.status === 'pending').reduce((sum, r) => sum + r.total_quantity, 0);
      const availableStock = physicalStock - reservedUnits;

      const minStock = Math.ceil(dailyAverage * REPLENISHMENT_SAFETY_MARGIN);
      const targetStock = Math.ceil(dailyAverage * REPLENISHMENT_TARGET_COVERAGE_DAYS * REPLENISHMENT_SAFETY_MARGIN);

      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (availableStock <= minStock) status = 'critical';
      else if (availableStock <= minStock * REPLENISHMENT_YELLOW_MULTIPLIER) status = 'warning';

      const rawSuggestion = Math.max(0, targetStock - availableStock);
      const suggestedUnits = status === 'ok' ? 0 : Math.min(rawSuggestion, centralStock);

      const currentCoverageDays = dailyAverage > 0 ? availableStock / dailyAverage : null;
      const coverageAfterReplenishment = dailyAverage > 0 ? (availableStock + suggestedUnits) / dailyAverage : null;

      return { seller, dailyAverage, physicalStock, reservedUnits, availableStock, minStock, targetStock, status, suggestedUnits, currentCoverageDays, coverageAfterReplenishment };
    });

    const sellerStockTotal = perSeller.reduce((sum, s) => sum + s.physicalStock, 0);
    const inTransitUnits = state.purchaseOrders
      .filter(po => po.status === 'ordered' || po.status === 'partially_received')
      .reduce((sum, po) => sum + po.items.reduce((s, i) => s + Math.max(0, i.quantity_ordered - i.quantity_received), 0), 0);

    const weeklyDemand = perSeller.reduce((sum, s) => sum + s.dailyAverage, 0) * REPLENISHMENT_SELLING_DAYS_PER_WEEK;
    const weeklyNeed = weeklyDemand * REPLENISHMENT_SAFETY_MARGIN;
    const supplierOrderSuggestion = Math.max(0, Math.ceil(weeklyNeed - centralStock - sellerStockTotal - inTransitUnits));

    return { sellers: perSeller, central: { centralStock, sellerStockTotal, inTransitUnits, weeklyDemand, weeklyNeed, supplierOrderSuggestion } };
  };

  // ============================== Settings ==============================
  const updateSettings = (partial: Partial<OrganizationSettings>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...partial } }));
    void persist.updateSettings(state.settings.id, partial);
  };

  return {
    state,
    currentUser: state.currentUser,
    isLoading,
    isAuthenticated: authChecked && !!state.currentUser.id,
    login,
    logout,
    setDateFilter,
    isDateInFilter,
    getSellerLocation,
    getCentralLocation,
    getFlavorStock,
    getTotalLocationStock,
    confirmSale,
    cancelSale,
    transferToSeller,
    returnToCentral,
    registerLoss,
    createPurchaseOrder,
    receivePurchaseOrder,
    deletePurchaseOrder,
    deleteBatch,
    createBatchManual,
    deleteSale,
    payCommission,
    addExpense,
    deleteExpense,
    createSeller,
    deleteSeller,
    toggleSellerStatus,
    setAccountPassword,
    createSupplier,
    deleteSupplier,
    createFlavor,
    deleteFlavor,
    toggleFlavorActive,
    createReservation,
    markReservationDelivered,
    cancelReservation,
    deleteReservation,
    getPendingReservationSummary,
    getReplenishmentAnalysis,
    updateSettings
  };
}

export type StoreContextType = ReturnType<typeof useStoreInternal>;

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useStoreInternal();
  return React.createElement(StoreContext.Provider, { value: store }, children);
};

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    return useStoreInternal();
  }
  return context;
}
