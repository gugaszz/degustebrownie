import React, { useState, useEffect, createContext, useContext } from 'react';
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
  Reservation
} from '../types';

const STORAGE_KEY = 'brownie_control_prod_v2';

// Helper to generate IDs
export const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// Helper for dates in Fortaleza timezone (ISO string)
const today = new Date();
const formatDateOffset = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const getTodayDateString = () => today.toISOString().split('T')[0];

// Webhook for Pushcut notifications on confirmed sales
const triggerSaleWebhook = (sale: Sale) => {
  const webhookUrl = 'https://api.pushcut.io/dsxEjdBVqzQnkzl13vUZc/notifications/Vendas%20Aprovada!';
  const formattedVal = `R$ ${sale.total_amount.toFixed(2).replace('.', ',')}`;
  // Título fixo, sem o valor. O valor da venda aparece só na legenda/corpo da notificação.
  const notificationTitle = 'Venda Aprovada';
  const messageText = `Valor: ${formattedVal}`;

  // 1. Tenta POST com JSON
  fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: messageText,
      title: notificationTitle,
      input: sale.total_amount.toFixed(2)
    })
  }).catch(() => {
    // 2. Fallback via GET com query parameters e no-cors para garantia
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

// Clean Production Initial State (Zero fake data)
const createInitialState = (): AppState => {
  const orgId = 'org-brownies-01';
  const nowIso = new Date().toISOString();

  const ownerProfile: Profile = {
    id: 'usr-owner-01',
    organization_id: orgId,
    role: 'owner',
    status: 'active',
    name: 'Gustavo',
    email: 'antunescosta.gustavo@gmail.com',
    phone: '',
    avatar_url: '',
    password: '74282121',
    created_at: nowIso
  };

  const product: Product = {
    id: 'prod-01',
    organization_id: orgId,
    name: 'Brownie Gourmet',
    description: 'Brownie tradicional artesanal',
    active: true,
    created_at: nowIso
  };

  const flavors: Flavor[] = [
    { id: 'flv-nutella', organization_id: orgId, name: 'Nutella', active: true, sort_order: 1, created_at: nowIso },
    { id: 'flv-ninho', organization_id: orgId, name: 'Ninho', active: true, sort_order: 2, created_at: nowIso },
    { id: 'flv-brigadeiro', organization_id: orgId, name: 'Brigadeiro', active: true, sort_order: 3, created_at: nowIso },
    { id: 'flv-tradicional', organization_id: orgId, name: 'Tradicional', active: true, sort_order: 4, created_at: nowIso }
  ];

  const pricingRules: PricingRule[] = [
    { id: 'price-single', minimum_quantity: 1, maximum_quantity: 1, unit_price: 10.0, active: true },
    { id: 'price-multi', minimum_quantity: 2, maximum_quantity: null, unit_price: 9.0, active: true }
  ];

  const locations: InventoryLocation[] = [
    { id: 'loc-central', organization_id: orgId, type: 'central', name: 'Estoque Central', active: true, created_at: nowIso }
  ];

  // Zero inventory balance for initial flavors in central stock
  const balances: InventoryBalance[] = flavors.map(f => ({
    location_id: 'loc-central',
    flavor_id: f.id,
    quantity: 0
  }));

  const settings: OrganizationSettings = {
    id: orgId,
    name: 'Brownie Control',
    currency: 'BRL',
    timezone: 'America/Fortaleza',
    pix_key: '63633597000107',
    pix_key_type: 'cnpj',
    pix_merchant_name: 'BROWNIE CONTROL',
    pix_merchant_city: 'FORTALEZA',
    default_commission_type: 'percentage_of_gross_profit',
    default_commission_value: 50,
    default_purchase_cost: 4.0
  };

  return {
    settings,
    currentUser: ownerProfile,
    profiles: [ownerProfile],
    product,
    flavors,
    pricingRules,
    suppliers: [],
    purchaseOrders: [],
    locations,
    batches: [],
    movements: [],
    balances,
    sales: [],
    commissions: [],
    payouts: [],
    expenses: [],
    reservations: [],
    auditLogs: [],
    dateFilter: {
      option: 'today',
      startDate: getTodayDateString(),
      endDate: getTodayDateString()
    }
  };
};

// Sellers who must always exist, keyed by a normalized identity match.
// One-time migration flag: separate from the app's own persisted state so it survives
// even if a future feature resets other slices of state. Guards the cleanup below so it
// runs exactly once per browser and never re-triggers if the owner later creates a real
// seller who happens to share a name with the old seed data.
const OWNER_SETUP_MIGRATION_KEY = 'brownie_migrated_owner_only_v1';

/**
 * Ensures baseline data is consistent every time the app loads, whether starting from
 * a fresh install or from previously saved localStorage data. Runs as a pure migration
 * so it is safe to call on every load.
 */
const ensureSeedFixes = (input: AppState): AppState => {
  let state: AppState = {
    ...input,
    // Backfill fields that may not exist on data saved before this feature shipped
    reservations: input.reservations || []
  };

  // Backfill the real Pix key (CNPJ) for sessions saved before it was configured,
  // so every generated QR Code already points at the right bank account.
  if (!state.settings.pix_key) {
    state = {
      ...state,
      settings: {
        ...state.settings,
        pix_key: '63633597000107',
        pix_key_type: 'cnpj'
      }
    };
  }

  // One-time cleanup: only the owner (Gustavo) creates accounts from now on, via
  // Vendedores > Novo Vendedor. Older sessions may still have the auto-seeded/duplicated
  // "João" test sellers from before that rule existed — remove them and their stock
  // locations, and lock in Gustavo's real owner credentials, exactly once.
  let alreadyMigrated = false;
  try {
    alreadyMigrated = localStorage.getItem(OWNER_SETUP_MIGRATION_KEY) === 'true';
  } catch {
    alreadyMigrated = false;
  }

  if (!alreadyMigrated) {
    const sellerIdsToRemove = state.profiles.filter(p => p.role === 'seller').map(p => p.id);
    const updatedOwner: Profile = {
      ...(state.profiles.find(p => p.role === 'owner') as Profile),
      name: 'Gustavo',
      email: 'antunescosta.gustavo@gmail.com',
      password: '74282121'
    };

    state = {
      ...state,
      profiles: state.profiles
        .filter(p => p.role !== 'seller')
        .map(p => (p.role === 'owner' ? updatedOwner : p)),
      locations: state.locations.filter(l => !(l.seller_id && sellerIdsToRemove.includes(l.seller_id))),
      balances: state.balances.filter(
        b => !state.locations.find(l => l.id === b.location_id && l.seller_id && sellerIdsToRemove.includes(l.seller_id))
      ),
      // If the browser was mid-session as one of the removed sellers, land back on the
      // owner account instead of pointing at a profile that no longer exists.
      currentUser: sellerIdsToRemove.includes(state.currentUser?.id) ? updatedOwner : state.currentUser
    };

    try {
      localStorage.setItem(OWNER_SETUP_MIGRATION_KEY, 'true');
    } catch {
      // ignore storage failures — worst case this migration runs again next load
    }
  }

  return state;
};

/**
 * Custom React Hook for Store
 */
function useStoreInternal() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return ensureSeedFixes(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
    return ensureSeedFixes(createInitialState());
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to persist state', e);
    }
  }, [state]);

  // Actions
  const switchUser = (userId: string) => {
    const user = state.profiles.find(p => p.id === userId);
    if (user) {
      setState(prev => ({ ...prev, currentUser: user }));
    }
  };

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

    setState(prev => ({
      ...prev,
      dateFilter: {
        option,
        startDate,
        endDate
      }
    }));
  };

  // Helper to filter items by current active date range
  const isDateInFilter = (isoDate: string) => {
    if (!isoDate) return false;
    const dateStr = isoDate.split('T')[0];
    const { startDate, endDate } = state.dateFilter;
    return dateStr >= startDate && dateStr <= endDate;
  };

  // Get seller location
  const getSellerLocation = (sellerId: string): InventoryLocation | undefined => {
    return state.locations.find(l => l.type === 'seller' && l.seller_id === sellerId);
  };

  const getCentralLocation = (): InventoryLocation => {
    return state.locations.find(l => l.type === 'central') || state.locations[0];
  };

  // Get current inventory balance for a location and flavor
  const getFlavorStock = (locationId: string, flavorId: string): number => {
    const bal = state.balances.find(b => b.location_id === locationId && b.flavor_id === flavorId);
    return bal ? bal.quantity : 0;
  };

  // Get total stock for location
  const getTotalLocationStock = (locationId: string): number => {
    return state.balances
      .filter(b => b.location_id === locationId)
      .reduce((sum, b) => sum + b.quantity, 0);
  };

  // Transactional Sale Confirmation
  const confirmSale = (params: {
    sellerId: string;
    items: { flavorId: string; quantity: number }[];
    applyDiscount?: boolean;
  }): { success: boolean; sale?: Sale; error?: string } => {
    const seller = state.profiles.find(p => p.id === params.sellerId);
    if (!seller) return { success: false, error: 'Vendedor não encontrado' };

    const sellerLocation = seller.role === 'owner' 
      ? getCentralLocation() 
      : (getSellerLocation(seller.id) || getCentralLocation());
    if (!sellerLocation) return { success: false, error: 'Local de estoque de origem não encontrado' };

    const totalQuantity = params.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity <= 0) return { success: false, error: 'A quantidade precisa ser maior que zero' };

    // Stock verification
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

    // Pricing Rule calculation
    // 1 unit = 10, 2+ units = 9 each — unless the seller chooses not to apply
    // the quantity discount for this specific sale (applyDiscount = false).
    const applyDiscount = params.applyDiscount !== false;
    const fullPrice = 10.0;
    const unitPrice = applyDiscount && totalQuantity >= 2 ? 9.0 : fullPrice;
    const unitCost = state.settings.default_purchase_cost || 4.0;
    const subtotal = totalQuantity * fullPrice;
    const totalAmount = totalQuantity * unitPrice;
    const discountAmount = subtotal - totalAmount;
    const totalCost = totalQuantity * unitCost;
    const grossProfit = totalAmount - totalCost;

    // Commission calculation (default: 50% of gross profit for sellers, 0% for owner direct sale)
    const commissionPercent = seller.role === 'owner' 
      ? 0 
      : (seller.commission_value ?? state.settings.default_commission_value ?? 50);
    const sellerCommission = grossProfit * (commissionPercent / 100);
    const ownerGrossResult = grossProfit - sellerCommission;

    const saleId = 'sale-' + generateId();
    const nowIso = new Date().toISOString();
    const txid = 'BRW' + Date.now().toString().slice(-6);

    const saleItems: SaleItem[] = params.items.map(item => {
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      const fName = flavor ? flavor.name : 'Sabor';
      return {
        id: 'si-' + generateId(),
        flavor_id: item.flavorId,
        flavor_name: fName,
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

    // Inventory movements
    const newMovements: InventoryMovement[] = params.items.map(item => {
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      return {
        id: 'mov-' + generateId(),
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

    // Commission ledger entry
    const newCommission: CommissionEntry = {
      id: 'comm-' + generateId(),
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

    // Audit log
    const audit: AuditLog = {
      id: 'audit-' + generateId(),
      organization_id: state.settings.id,
      user_id: seller.id,
      user_name: seller.name,
      action: 'sale_confirmed',
      entity_type: 'sale',
      entity_id: saleId,
      details: `Venda ${txid} de ${totalQuantity} brownies confirmada. Total: R$ ${totalAmount.toFixed(2)}, Comissão: R$ ${sellerCommission.toFixed(2)}`,
      created_at: nowIso
    };

    // Atomic update of balances
    setState(prev => {
      const updatedBalances = [...prev.balances];
      for (const item of params.items) {
        const index = updatedBalances.findIndex(
          b => b.location_id === sellerLocation.id && b.flavor_id === item.flavorId
        );
        if (index >= 0) {
          updatedBalances[index] = {
            ...updatedBalances[index],
            quantity: Math.max(0, updatedBalances[index].quantity - item.quantity)
          };
        } else {
          updatedBalances.push({
            location_id: sellerLocation.id,
            flavor_id: item.flavorId,
            quantity: 0
          });
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

    // Disparar Webhook Pushcut informado o valor da venda
    triggerSaleWebhook(newSale);

    return { success: true, sale: newSale };
  };

  // Cancel Sale
  const cancelSale = (saleId: string, reason: string): { success: boolean; error?: string } => {
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) return { success: false, error: 'Venda não encontrada' };
    if (sale.status === 'cancelled') return { success: false, error: 'Esta venda já está cancelada' };

    const sellerLocation = getSellerLocation(sale.seller_id) || getCentralLocation();
    if (!sellerLocation) return { success: false, error: 'Estoque de origem não localizado' };

    const nowIso = new Date().toISOString();

    // Reverse inventory movements
    const reversalMovements: InventoryMovement[] = sale.items.map(item => ({
      id: 'mov-' + generateId(),
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

    // Audit log
    const audit: AuditLog = {
      id: 'audit-' + generateId(),
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
      // Restore balances
      const updatedBalances = [...prev.balances];
      for (const item of sale.items) {
        const index = updatedBalances.findIndex(
          b => b.location_id === sellerLocation.id && b.flavor_id === item.flavor_id
        );
        if (index >= 0) {
          updatedBalances[index] = {
            ...updatedBalances[index],
            quantity: updatedBalances[index].quantity + item.quantity
          };
        }
      }

      // Mark sale cancelled
      const updatedSales = prev.sales.map(s => {
        if (s.id === saleId) {
          return {
            ...s,
            status: 'cancelled' as const,
            cancelled_at: nowIso
          };
        }
        return s;
      });

      // Reverse commission
      const updatedCommissions = prev.commissions.map(c => {
        if (c.sale_id === saleId) {
          return {
            ...c,
            status: 'reversed' as const
          };
        }
        return c;
      });

      return {
        ...prev,
        sales: updatedSales,
        balances: updatedBalances,
        commissions: updatedCommissions,
        movements: [...reversalMovements, ...prev.movements],
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    return { success: true };
  };

  // Stock Transfer: Central -> Seller ("Separar brownies para vendedor")
  const transferToSeller = (params: {
    sellerId: string;
    items: { flavorId: string; quantity: number }[];
    notes?: string;
  }): { success: boolean; error?: string } => {
    const centralLocation = getCentralLocation();
    const sellerLocation = getSellerLocation(params.sellerId);
    const seller = state.profiles.find(p => p.id === params.sellerId);

    if (!seller || !sellerLocation) {
      return { success: false, error: 'Vendedor ou estoque de destino não encontrado' };
    }

    // Validate central availability
    for (const item of params.items) {
      if (item.quantity <= 0) continue;
      const centralStock = getFlavorStock(centralLocation.id, item.flavorId);
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      if (centralStock < item.quantity) {
        return {
          success: false,
          error: `Estoque central insuficiente para o sabor ${flavor?.name}. Disponível: ${centralStock}, solicitado: ${item.quantity}.`
        };
      }
    }

    const nowIso = new Date().toISOString();
    const totalItems = params.items.reduce((s, i) => s + i.quantity, 0);
    if (totalItems <= 0) return { success: false, error: 'Selecione pelo menos um brownie para transferir' };

    const newMovements: InventoryMovement[] = [];

    params.items.forEach(item => {
      if (item.quantity <= 0) return;
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      // Transfer out from central
      newMovements.push({
        id: 'mov-' + generateId(),
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
      // Transfer in to seller
      newMovements.push({
        id: 'mov-' + generateId(),
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
      id: 'audit-' + generateId(),
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
        // decrease central
        const centralIdx = updatedBalances.findIndex(
          b => b.location_id === centralLocation.id && b.flavor_id === item.flavorId
        );
        if (centralIdx >= 0) {
          updatedBalances[centralIdx] = {
            ...updatedBalances[centralIdx],
            quantity: Math.max(0, updatedBalances[centralIdx].quantity - item.quantity)
          };
        }
        // increase seller
        const sellerIdx = updatedBalances.findIndex(
          b => b.location_id === sellerLocation.id && b.flavor_id === item.flavorId
        );
        if (sellerIdx >= 0) {
          updatedBalances[sellerIdx] = {
            ...updatedBalances[sellerIdx],
            quantity: updatedBalances[sellerIdx].quantity + item.quantity
          };
        } else {
          updatedBalances.push({
            location_id: sellerLocation.id,
            flavor_id: item.flavorId,
            quantity: item.quantity
          });
        }
      });

      return {
        ...prev,
        balances: updatedBalances,
        movements: [...newMovements, ...prev.movements],
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    return { success: true };
  };

  // Stock Return: Seller -> Central
  const returnToCentral = (params: {
    sellerId: string;
    items: { flavorId: string; quantity: number }[];
    notes?: string;
  }): { success: boolean; error?: string } => {
    const centralLocation = getCentralLocation();
    const sellerLocation = getSellerLocation(params.sellerId);
    const seller = state.profiles.find(p => p.id === params.sellerId);

    if (!seller || !sellerLocation) {
      return { success: false, error: 'Vendedor ou estoque de origem não encontrado' };
    }

    // Validate seller availability
    for (const item of params.items) {
      if (item.quantity <= 0) continue;
      const sellerStock = getFlavorStock(sellerLocation.id, item.flavorId);
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      if (sellerStock < item.quantity) {
        return {
          success: false,
          error: `Estoque insuficiente com o vendedor para o sabor ${flavor?.name}.`
        };
      }
    }

    const nowIso = new Date().toISOString();
    const totalItems = params.items.reduce((s, i) => s + i.quantity, 0);
    if (totalItems <= 0) return { success: false, error: 'Selecione pelo menos uma unidade para devolver' };

    const newMovements: InventoryMovement[] = [];

    params.items.forEach(item => {
      if (item.quantity <= 0) return;
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      newMovements.push({
        id: 'mov-' + generateId(),
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
        id: 'mov-' + generateId(),
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
      id: 'audit-' + generateId(),
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
        const sellerIdx = updatedBalances.findIndex(
          b => b.location_id === sellerLocation.id && b.flavor_id === item.flavorId
        );
        if (sellerIdx >= 0) {
          updatedBalances[sellerIdx] = {
            ...updatedBalances[sellerIdx],
            quantity: Math.max(0, updatedBalances[sellerIdx].quantity - item.quantity)
          };
        }
        const centralIdx = updatedBalances.findIndex(
          b => b.location_id === centralLocation.id && b.flavor_id === item.flavorId
        );
        if (centralIdx >= 0) {
          updatedBalances[centralIdx] = {
            ...updatedBalances[centralIdx],
            quantity: updatedBalances[centralIdx].quantity + item.quantity
          };
        }
      });

      return {
        ...prev,
        balances: updatedBalances,
        movements: [...newMovements, ...prev.movements],
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    return { success: true };
  };

  // Register Inventory Loss
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
    if (currentStock < params.quantity) {
      return { success: false, error: `Estoque insuficiente no local selecionado. Atual: ${currentStock}` };
    }

    const nowIso = new Date().toISOString();
    const movement: InventoryMovement = {
      id: 'mov-' + generateId(),
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
      id: 'audit-' + generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'inventory_loss_registered',
      entity_type: 'inventory_loss',
      details: `Registro de perda de ${params.quantity} unidades de ${flavor.name} em ${location.name}. Motivo: ${params.reason}`,
      created_at: nowIso
    };

    setState(prev => {
      const updatedBalances = prev.balances.map(b => {
        if (b.location_id === location.id && b.flavor_id === flavor.id) {
          return { ...b, quantity: Math.max(0, b.quantity - params.quantity) };
        }
        return b;
      });

      return {
        ...prev,
        balances: updatedBalances,
        movements: [movement, ...prev.movements],
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    return { success: true };
  };

  // Create Purchase Order
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
        id: 'poi-' + generateId(),
        flavor_id: item.flavorId,
        flavor_name: flavor?.name || 'Sabor',
        quantity_ordered: item.quantity,
        quantity_received: 0,
        unit_cost: item.unitCost,
        total_cost: item.quantity * item.unitCost
      };
    });

    const newOrder: PurchaseOrder = {
      id: 'po-' + generateId(),
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
      id: 'audit-' + generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'purchase_order_created',
      entity_type: 'purchase_order',
      entity_id: newOrder.id,
      details: `Pedido de compra ${orderNumber} criado para ${supplier.name}. Valor total: R$ ${totalAmount.toFixed(2)}`,
      created_at: nowIso
    };

    setState(prev => ({
      ...prev,
      purchaseOrders: [newOrder, ...prev.purchaseOrders],
      auditLogs: [audit, ...prev.auditLogs]
    }));

    return { success: true };
  };

  // Receive Purchase Order -> Adds units to Central Inventory + Creates Batches
  const receivePurchaseOrder = (
    orderId: string,
    customExpiration?: string,
    customBatchCode?: string
  ): { success: boolean; error?: string } => {
    const order = state.purchaseOrders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Pedido de compra não encontrado' };
    if (order.status === 'received') return { success: false, error: 'Este pedido já foi recebido' };

    const centralLocation = getCentralLocation();
    const nowIso = new Date().toISOString();
    const expirationDate = customExpiration || formatDateOffset(10); // Standard brownie shelf life

    const newBatches: InventoryBatch[] = [];
    const newMovements: InventoryMovement[] = [];

    order.items.forEach(item => {
      newBatches.push({
        id: 'batch-' + generateId(),
        organization_id: state.settings.id,
        flavor_id: item.flavor_id,
        flavor_name: item.flavor_name,
        purchase_order_id: order.id,
        supplier_id: order.supplier_id,
        batch_reference: customBatchCode
          ? `${customBatchCode}-${item.flavor_name.slice(0, 3).toUpperCase()}`
          : `LT-${order.order_number}-${item.flavor_name.slice(0, 3).toUpperCase()}`,
        unit_cost: item.unit_cost,
        quantity_received: item.quantity_ordered,
        quantity_remaining: item.quantity_ordered,
        manufacturing_date: nowIso.split('T')[0],
        expiration_date: expirationDate.split('T')[0],
        received_at: nowIso
      });

      newMovements.push({
        id: 'mov-' + generateId(),
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
      id: 'audit-' + generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'purchase_received',
      entity_type: 'purchase_order',
      entity_id: order.id,
      details: `Recebimento confirmado do pedido ${order.order_number}. Estoque central abastecido.`,
      created_at: nowIso
    };

    setState(prev => {
      // Update central balances
      const updatedBalances = [...prev.balances];
      order.items.forEach(item => {
        const idx = updatedBalances.findIndex(
          b => b.location_id === centralLocation.id && b.flavor_id === item.flavor_id
        );
        if (idx >= 0) {
          updatedBalances[idx] = {
            ...updatedBalances[idx],
            quantity: updatedBalances[idx].quantity + item.quantity_ordered
          };
        } else {
          updatedBalances.push({
            location_id: centralLocation.id,
            flavor_id: item.flavor_id,
            quantity: item.quantity_ordered
          });
        }
      });

      // Update purchase order status
      const updatedOrders = prev.purchaseOrders.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            status: 'received' as const,
            received_at: nowIso,
            items: o.items.map(i => ({ ...i, quantity_received: i.quantity_ordered }))
          };
        }
        return o;
      });

      return {
        ...prev,
        purchaseOrders: updatedOrders,
        batches: [...newBatches, ...prev.batches],
        movements: [...newMovements, ...prev.movements],
        balances: updatedBalances,
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    return { success: true };
  };

  // Commission Payout (Weekly or on demand)
  const payCommission = (params: {
    sellerId: string;
    entryIds: string[];
    paymentMethod: string;
    notes?: string;
  }): { success: boolean; error?: string } => {
    const seller = state.profiles.find(p => p.id === params.sellerId);
    if (!seller) return { success: false, error: 'Vendedor não encontrado' };

    const selectedEntries = state.commissions.filter(c => params.entryIds.includes(c.id));
    if (selectedEntries.length === 0) return { success: false, error: 'Nenhuma comissão pendente selecionada' };

    const totalAmount = selectedEntries.reduce((sum, e) => sum + e.amount, 0);
    const nowIso = new Date().toISOString();
    const payoutNumber = `PAG-${(state.payouts.length + 1).toString().padStart(3, '0')}`;

    const newPayout: CommissionPayout = {
      id: 'payout-' + generateId(),
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
      id: 'audit-' + generateId(),
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
      commissions: prev.commissions.map(c => {
        if (params.entryIds.includes(c.id)) {
          return { ...c, status: 'paid' as const };
        }
        return c;
      }),
      auditLogs: [audit, ...prev.auditLogs]
    }));

    return { success: true };
  };

  // Add Expense
  const addExpense = (params: {
    category: Expense['category'];
    description: string;
    amount: number;
    expenseDate?: string;
  }): { success: boolean } => {
    const nowIso = new Date().toISOString();
    const newExpense: Expense = {
      id: 'exp-' + generateId(),
      organization_id: state.settings.id,
      category: params.category,
      description: params.description,
      amount: params.amount,
      expense_date: params.expenseDate || nowIso.split('T')[0],
      created_by: state.currentUser.name,
      created_at: nowIso
    };

    const audit: AuditLog = {
      id: 'audit-' + generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'expense_created',
      entity_type: 'expense',
      entity_id: newExpense.id,
      details: `Despesa registrada: ${params.description} - R$ ${params.amount.toFixed(2)}`,
      created_at: nowIso
    };

    setState(prev => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
      auditLogs: [audit, ...prev.auditLogs]
    }));

    return { success: true };
  };

  // Create Seller
  const createSeller = (params: {
    name: string;
    email: string;
    phone: string;
    password: string;
    commissionType?: 'percentage_of_gross_profit' | 'fixed_per_unit';
    commissionValue?: number;
  }): { success: boolean; seller?: Profile; error?: string } => {
    if (!params.name.trim()) return { success: false, error: 'O nome é obrigatório' };
    if (!params.email.trim()) return { success: false, error: 'O e-mail de acesso é obrigatório' };
    if (!params.password || params.password.trim().length < 4) {
      return { success: false, error: 'Defina uma senha de acesso com pelo menos 4 caracteres' };
    }

    const normalizedEmail = params.email.trim().toLowerCase();
    if (state.profiles.some(p => p.email && p.email.trim().toLowerCase() === normalizedEmail)) {
      return { success: false, error: 'Já existe uma conta cadastrada com este e-mail' };
    }

    const sellerId = 'usr-seller-' + generateId();
    const locationId = 'loc-seller-' + generateId();
    const nowIso = new Date().toISOString();

    const newSeller: Profile = {
      id: sellerId,
      organization_id: state.settings.id,
      role: 'seller',
      status: 'active',
      name: params.name.trim(),
      email: params.email.trim(),
      phone: params.phone.trim(),
      password: params.password.trim(),
      commission_type: params.commissionType || 'percentage_of_gross_profit',
      commission_value: params.commissionValue || 50,
      created_at: nowIso
    };

    const newLocation: InventoryLocation = {
      id: locationId,
      organization_id: state.settings.id,
      type: 'seller',
      name: `Estoque - ${params.name.trim()}`,
      seller_id: sellerId,
      active: true,
      created_at: nowIso
    };

    // Initial 0 balances for all flavors
    const initialBalances: InventoryBalance[] = state.flavors.map(f => ({
      location_id: locationId,
      flavor_id: f.id,
      quantity: 0
    }));

    const audit: AuditLog = {
      id: 'audit-' + generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'seller_created',
      entity_type: 'seller',
      entity_id: sellerId,
      details: `Novo vendedor cadastrado: ${params.name}`,
      created_at: nowIso
    };

    setState(prev => ({
      ...prev,
      profiles: [...prev.profiles, newSeller],
      locations: [...prev.locations, newLocation],
      balances: [...prev.balances, ...initialBalances],
      auditLogs: [audit, ...prev.auditLogs]
    }));

    return { success: true, seller: newSeller };
  };

  // Toggle Seller status
  const toggleSellerStatus = (sellerId: string) => {
    setState(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => {
        if (p.id === sellerId) {
          const newStatus = p.status === 'active' ? 'inactive' : 'active';
          return { ...p, status: newStatus };
        }
        return p;
      })
    }));
  };

  // Owner-only: (re)define a login password for any account (seller or self)
  const setAccountPassword = (userId: string, newPassword: string): { success: boolean; error?: string } => {
    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'A senha precisa ter pelo menos 4 caracteres' };
    }
    setState(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => (p.id === userId ? { ...p, password: newPassword.trim() } : p))
    }));
    return { success: true };
  };

  // Create Supplier
  const createSupplier = (params: Omit<Supplier, 'id' | 'organization_id' | 'created_at' | 'active'>) => {
    const newSupplier: Supplier = {
      ...params,
      id: 'sup-' + generateId(),
      organization_id: state.settings.id,
      active: true,
      created_at: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      suppliers: [newSupplier, ...prev.suppliers]
    }));
  };

  // Create Flavor
  const createFlavor = (name: string) => {
    if (!name.trim()) return;
    const newFlavor: Flavor = {
      id: 'flv-' + generateId(),
      organization_id: state.settings.id,
      name: name.trim(),
      active: true,
      sort_order: state.flavors.length + 1,
      created_at: new Date().toISOString()
    };

    setState(prev => {
      // Add balance record for each location
      const newBalances = prev.locations.map(loc => ({
        location_id: loc.id,
        flavor_id: newFlavor.id,
        quantity: 0
      }));

      return {
        ...prev,
        flavors: [...prev.flavors, newFlavor],
        balances: [...prev.balances, ...newBalances]
      };
    });
  };

  // Toggle Flavor Active
  const toggleFlavorActive = (flavorId: string) => {
    setState(prev => ({
      ...prev,
      flavors: prev.flavors.map(f => (f.id === flavorId ? { ...f, active: !f.active } : f))
    }));
  };

  // Delete Flavor
  const deleteFlavor = (flavorId: string): { success: boolean; error?: string } => {
    const flavor = state.flavors.find(f => f.id === flavorId);
    if (!flavor) return { success: false, error: 'Sabor não encontrado' };

    setState(prev => ({
      ...prev,
      flavors: prev.flavors.filter(f => f.id !== flavorId),
      balances: prev.balances.filter(b => b.flavor_id !== flavorId),
      auditLogs: [
        {
          id: 'audit-' + generateId(),
          organization_id: state.settings.id,
          user_id: state.currentUser.id,
          user_name: state.currentUser.name,
          action: 'flavor_deleted',
          entity_type: 'flavor',
          entity_id: flavorId,
          details: `Sabor "${flavor.name}" removido do catálogo`,
          created_at: new Date().toISOString()
        },
        ...prev.auditLogs
      ]
    }));

    return { success: true };
  };

  // Delete Seller
  const deleteSeller = (sellerId: string): { success: boolean; error?: string } => {
    const seller = state.profiles.find(p => p.id === sellerId);
    if (!seller) return { success: false, error: 'Vendedor não encontrado' };
    if (seller.role === 'owner') return { success: false, error: 'Não é permitido excluir o administrador' };

    const sellerLoc = state.locations.find(l => l.seller_id === sellerId);

    setState(prev => ({
      ...prev,
      profiles: prev.profiles.filter(p => p.id !== sellerId),
      locations: sellerLoc ? prev.locations.filter(l => l.id !== sellerLoc.id) : prev.locations,
      balances: sellerLoc ? prev.balances.filter(b => b.location_id !== sellerLoc.id) : prev.balances,
      auditLogs: [
        {
          id: 'audit-' + generateId(),
          organization_id: state.settings.id,
          user_id: state.currentUser.id,
          user_name: state.currentUser.name,
          action: 'seller_deleted',
          entity_type: 'seller',
          entity_id: sellerId,
          details: `Vendedor ${seller.name} excluído do sistema`,
          created_at: new Date().toISOString()
        },
        ...prev.auditLogs
      ]
    }));

    return { success: true };
  };

  // Delete Supplier
  const deleteSupplier = (supplierId: string): { success: boolean; error?: string } => {
    const supplier = state.suppliers.find(s => s.id === supplierId);
    if (!supplier) return { success: false, error: 'Fornecedor não encontrado' };

    setState(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter(s => s.id !== supplierId),
      auditLogs: [
        {
          id: 'audit-' + generateId(),
          organization_id: state.settings.id,
          user_id: state.currentUser.id,
          user_name: state.currentUser.name,
          action: 'supplier_deleted',
          entity_type: 'supplier',
          entity_id: supplierId,
          details: `Fornecedor ${supplier.name} removido`,
          created_at: new Date().toISOString()
        },
        ...prev.auditLogs
      ]
    }));

    return { success: true };
  };

  // Delete Expense
  const deleteExpense = (expenseId: string): { success: boolean; error?: string } => {
    const expense = state.expenses.find(e => e.id === expenseId);
    if (!expense) return { success: false, error: 'Despesa não encontrada' };

    setState(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== expenseId),
      auditLogs: [
        {
          id: 'audit-' + generateId(),
          organization_id: state.settings.id,
          user_id: state.currentUser.id,
          user_name: state.currentUser.name,
          action: 'expense_deleted',
          entity_type: 'expense',
          entity_id: expenseId,
          details: `Despesa "${expense.description}" de R$ ${expense.amount.toFixed(2)} excluída`,
          created_at: new Date().toISOString()
        },
        ...prev.auditLogs
      ]
    }));

    return { success: true };
  };

  // Delete Purchase Order
  const deletePurchaseOrder = (orderId: string): { success: boolean; error?: string } => {
    const order = state.purchaseOrders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Pedido de compra não encontrado' };

    const centralLocation = getCentralLocation();

    setState(prev => {
      let updatedBatches = [...prev.batches];
      let updatedBalances = [...prev.balances];

      // If received, remove associated batches and reverse central stock balance
      if (order.status === 'received' && centralLocation) {
        const orderBatches = prev.batches.filter(b => b.purchase_order_id === orderId);
        updatedBatches = prev.batches.filter(b => b.purchase_order_id !== orderId);

        orderBatches.forEach(b => {
          const balIdx = updatedBalances.findIndex(
            x => x.location_id === centralLocation.id && x.flavor_id === b.flavor_id
          );
          if (balIdx >= 0) {
            updatedBalances[balIdx] = {
              ...updatedBalances[balIdx],
              quantity: Math.max(0, updatedBalances[balIdx].quantity - b.quantity_remaining)
            };
          }
        });
      }

      return {
        ...prev,
        purchaseOrders: prev.purchaseOrders.filter(o => o.id !== orderId),
        batches: updatedBatches,
        balances: updatedBalances,
        auditLogs: [
          {
            id: 'audit-' + generateId(),
            organization_id: state.settings.id,
            user_id: state.currentUser.id,
            user_name: state.currentUser.name,
            action: 'purchase_order_deleted',
            entity_type: 'purchase_order',
            entity_id: orderId,
            details: `Pedido de compra ${order.order_number} removido`,
            created_at: new Date().toISOString()
          },
          ...prev.auditLogs
        ]
      };
    });

    return { success: true };
  };

  // Delete / Discard Batch
  const deleteBatch = (batchId: string, reason = 'Descarte / Ajuste'): { success: boolean; error?: string } => {
    const batch = state.batches.find(b => b.id === batchId);
    if (!batch) return { success: false, error: 'Lote não encontrado' };

    const centralLocation = getCentralLocation();
    const nowIso = new Date().toISOString();

    const movement: InventoryMovement = {
      id: 'mov-' + generateId(),
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

    setState(prev => {
      const updatedBalances = prev.balances.map(b => {
        if (b.location_id === centralLocation.id && b.flavor_id === batch.flavor_id) {
          return {
            ...b,
            quantity: Math.max(0, b.quantity - batch.quantity_remaining)
          };
        }
        return b;
      });

      return {
        ...prev,
        batches: prev.batches.filter(b => b.id !== batchId),
        balances: updatedBalances,
        movements: [movement, ...prev.movements],
        auditLogs: [
          {
            id: 'audit-' + generateId(),
            organization_id: state.settings.id,
            user_id: state.currentUser.id,
            user_name: state.currentUser.name,
            action: 'batch_deleted',
            entity_type: 'inventory_batch',
            entity_id: batchId,
            details: `Lote ${batch.batch_reference} (${batch.quantity_remaining} un de ${batch.flavor_name}) removido. Motivo: ${reason}`,
            created_at: nowIso
          },
          ...prev.auditLogs
        ]
      };
    });

    return { success: true };
  };

  // Manual Batch Entry (ex: Produção Própria / Entrada Avulsa de Brownies)
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
      id: 'batch-' + generateId(),
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
      id: 'mov-' + generateId(),
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

    setState(prev => {
      const updatedBalances = [...prev.balances];
      const idx = updatedBalances.findIndex(b => b.location_id === centralLocation.id && b.flavor_id === flavor.id);
      if (idx >= 0) {
        updatedBalances[idx] = {
          ...updatedBalances[idx],
          quantity: updatedBalances[idx].quantity + params.quantity
        };
      } else {
        updatedBalances.push({
          location_id: centralLocation.id,
          flavor_id: flavor.id,
          quantity: params.quantity
        });
      }

      return {
        ...prev,
        batches: [newBatch, ...prev.batches],
        balances: updatedBalances,
        movements: [movement, ...prev.movements],
        auditLogs: [
          {
            id: 'audit-' + generateId(),
            organization_id: state.settings.id,
            user_id: state.currentUser.id,
            user_name: state.currentUser.name,
            action: 'batch_created_manual',
            entity_type: 'inventory_batch',
            entity_id: newBatch.id,
            details: `Lote avulso ${refCode} com ${params.quantity} brownies de ${flavor.name} adicionado ao estoque central`,
            created_at: nowIso
          },
          ...prev.auditLogs
        ]
      };
    });

    return { success: true };
  };

  // Delete Sale
  const deleteSale = (saleId: string): { success: boolean; error?: string } => {
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) return { success: false, error: 'Venda não encontrada' };

    if (sale.status === 'completed') {
      cancelSale(saleId, 'Exclusão do registro de venda');
    }

    setState(prev => ({
      ...prev,
      sales: prev.sales.filter(s => s.id !== saleId),
      commissions: prev.commissions.filter(c => c.sale_id !== saleId),
      auditLogs: [
        {
          id: 'audit-' + generateId(),
          organization_id: state.settings.id,
          user_id: state.currentUser.id,
          user_name: state.currentUser.name,
          action: 'sale_deleted',
          entity_type: 'sale',
          entity_id: saleId,
          details: `Registro de venda ${sale.pix_txid} removido do sistema`,
          created_at: new Date().toISOString()
        },
        ...prev.auditLogs
      ]
    }));

    return { success: true };
  };

  // ==========================================================================
  // Reservations (encomendas): a seller registers the customer's name, the
  // quantity per flavor and the date it should be sold/delivered — then
  // later marks it as delivered. The owner uses the pending totals to know
  // how much stock to hand each seller.
  // ==========================================================================
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
    const seller = state.profiles.find(p => p.id === sellerId);
    if (!seller) return { success: false, error: 'Vendedor não encontrado' };

    const nowIso = new Date().toISOString();

    const reservationItems: import('../types').ReservationItem[] = items.map(item => {
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      return {
        id: 'resi-' + generateId(),
        flavor_id: item.flavorId,
        flavor_name: flavor?.name || 'Sabor',
        quantity: Number(item.quantity)
      };
    });

    const totalQuantity = reservationItems.reduce((s, i) => s + i.quantity, 0);

    const newReservation: Reservation = {
      id: 'res-' + generateId(),
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
      id: 'audit-' + generateId(),
      organization_id: state.settings.id,
      user_id: state.currentUser.id,
      user_name: state.currentUser.name,
      action: 'reservation_created',
      entity_type: 'reservation',
      entity_id: newReservation.id,
      details: `Reserva criada para ${newReservation.customer_name} (${totalQuantity} brownies) em nome de ${seller.name}`,
      created_at: nowIso
    };

    setState(prev => ({
      ...prev,
      reservations: [newReservation, ...prev.reservations],
      auditLogs: [audit, ...prev.auditLogs]
    }));

    return { success: true, reservation: newReservation };
  };

  const markReservationDelivered = (reservationId: string): { success: boolean; error?: string } => {
    const reservation = state.reservations.find(r => r.id === reservationId);
    if (!reservation) return { success: false, error: 'Reserva não encontrada' };

    setState(prev => ({
      ...prev,
      reservations: prev.reservations.map(r =>
        r.id === reservationId
          ? { ...r, status: 'delivered', delivered_at: new Date().toISOString() }
          : r
      )
    }));

    return { success: true };
  };

  const cancelReservation = (reservationId: string): { success: boolean; error?: string } => {
    const reservation = state.reservations.find(r => r.id === reservationId);
    if (!reservation) return { success: false, error: 'Reserva não encontrada' };

    setState(prev => ({
      ...prev,
      reservations: prev.reservations.map(r =>
        r.id === reservationId
          ? { ...r, status: 'cancelled', cancelled_at: new Date().toISOString() }
          : r
      )
    }));

    return { success: true };
  };

  const deleteReservation = (reservationId: string) => {
    setState(prev => ({
      ...prev,
      reservations: prev.reservations.filter(r => r.id !== reservationId)
    }));
  };

  // Pending quantity to hand each seller, broken down by flavor, based on open reservations
  const getPendingReservationSummary = () => {
    const pending = state.reservations.filter(r => r.status === 'pending');
    const bySeller = new Map<string, { sellerId: string; sellerName: string; totalQuantity: number; byFlavor: Record<string, number>; count: number }>();

    for (const r of pending) {
      const entry = bySeller.get(r.seller_id) || {
        sellerId: r.seller_id,
        sellerName: r.seller_name,
        totalQuantity: 0,
        byFlavor: {} as Record<string, number>,
        count: 0
      };
      entry.count += 1;
      entry.totalQuantity += r.total_quantity;
      for (const item of r.items) {
        entry.byFlavor[item.flavor_name] = (entry.byFlavor[item.flavor_name] || 0) + item.quantity;
      }
      bySeller.set(r.seller_id, entry);
    }

    return Array.from(bySeller.values());
  };

  // Update Settings
  const updateSettings = (partial: Partial<OrganizationSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...partial }
    }));
  };

  // Reset to initial demo state
  const resetDemoData = () => {
    const fresh = ensureSeedFixes(createInitialState());
    setState(fresh);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    state,
    currentUser: state.currentUser,
    switchUser,
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
    updateSettings,
    resetDemoData
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
    // If used outside provider, return internal hook
    return useStoreInternal();
  }
  return context;
}

