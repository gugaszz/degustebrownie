export type UserRole = 'owner' | 'seller';
export type UserStatus = 'active' | 'inactive';

export interface Profile {
  id: string;
  organization_id: string;
  role: UserRole;
  status: UserStatus;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  commission_type?: 'percentage_of_gross_profit' | 'fixed_per_unit' | 'percentage_of_revenue';
  commission_value?: number;
  /** Login password. Only used by the local login gate; set exclusively by the owner. */
  password?: string;
  created_at: string;
}

export interface Flavor {
  id: string;
  organization_id: string;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface PricingRule {
  id: string;
  minimum_quantity: number;
  maximum_quantity: number | null;
  unit_price: number;
  active: boolean;
}

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  instagram: string;
  document: string;
  address: string;
  notes: string;
  active: boolean;
  created_at: string;
}

export type PurchaseStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  flavor_id: string;
  flavor_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  organization_id: string;
  supplier_id: string;
  supplier_name: string;
  status: PurchaseStatus;
  order_date: string;
  expected_delivery_date: string;
  received_at?: string;
  total_amount: number;
  notes?: string;
  items: PurchaseOrderItem[];
  created_at: string;
}

export type InventoryLocationType = 'central' | 'seller';

export interface InventoryLocation {
  id: string;
  organization_id: string;
  type: InventoryLocationType;
  name: string;
  seller_id?: string;
  active: boolean;
  created_at: string;
}

export interface InventoryBatch {
  id: string;
  organization_id: string;
  flavor_id: string;
  flavor_name: string;
  purchase_order_id?: string;
  supplier_id?: string;
  batch_reference: string;
  unit_cost: number;
  quantity_received: number;
  quantity_remaining: number;
  manufacturing_date?: string;
  expiration_date: string;
  received_at: string;
}

export type MovementType = 
  | 'purchase_receipt'
  | 'transfer_out'
  | 'transfer_in'
  | 'sale'
  | 'sale_reversal'
  | 'return_to_central'
  | 'manual_adjustment_plus'
  | 'manual_adjustment_minus'
  | 'loss'
  | 'expired';

export interface InventoryMovement {
  id: string;
  organization_id: string;
  location_id: string;
  location_name: string;
  flavor_id: string;
  flavor_name: string;
  batch_id?: string;
  movement_type: MovementType;
  quantity_delta: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface InventoryBalance {
  location_id: string;
  flavor_id: string;
  quantity: number;
}

export type SaleStatus = 'draft' | 'awaiting_payment' | 'confirmed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'manually_confirmed' | 'automatically_confirmed' | 'refunded';

export interface SaleItem {
  id: string;
  flavor_id: string;
  flavor_name: string;
  quantity: number;
  unit_sale_price: number;
  unit_cost: number;
  line_revenue: number;
  line_cost: number;
}

export interface Sale {
  id: string;
  organization_id: string;
  seller_id: string;
  seller_name: string;
  status: SaleStatus;
  payment_status: PaymentStatus;
  payment_method: 'pix';
  total_quantity: number;
  unit_price_applied: number;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  total_cost: number;
  gross_profit: number;
  seller_commission: number;
  owner_gross_result: number;
  pix_txid: string;
  pix_payload?: string;
  confirmed_at?: string;
  cancelled_at?: string;
  created_at: string;
  items: SaleItem[];
}

export type CommissionStatus = 'pending' | 'included_in_payout' | 'paid' | 'reversed';

export interface CommissionEntry {
  id: string;
  organization_id: string;
  seller_id: string;
  seller_name: string;
  sale_id?: string;
  type: string;
  amount: number;
  status: CommissionStatus;
  description: string;
  created_at: string;
}

export interface CommissionPayout {
  id: string;
  payout_number: string;
  organization_id: string;
  seller_id: string;
  seller_name: string;
  period_start: string;
  period_end: string;
  amount: number;
  status: 'paid';
  paid_at: string;
  payment_method: string;
  notes?: string;
  entry_ids: string[];
  created_by: string;
  created_at: string;
}

export type ExpenseCategory = 
  | 'supplier'
  | 'transport'
  | 'packaging'
  | 'marketing'
  | 'software'
  | 'tax'
  | 'other';

export interface Expense {
  id: string;
  organization_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  created_by: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface OrganizationSettings {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  pix_key: string;
  pix_key_type: 'cpf' | 'cnpj' | 'phone' | 'email' | 'random';
  pix_merchant_name: string;
  pix_merchant_city: string;
  default_commission_type: 'percentage_of_gross_profit' | 'fixed_per_unit' | 'percentage_of_revenue';
  default_commission_value: number;
  default_purchase_cost: number;
}

export type ReservationStatus = 'pending' | 'delivered' | 'cancelled';

export interface ReservationItem {
  id: string;
  flavor_id: string;
  flavor_name: string;
  quantity: number;
}

export interface Reservation {
  id: string;
  organization_id: string;
  seller_id: string;
  seller_name: string;
  customer_name: string;
  sale_date: string;
  status: ReservationStatus;
  items: ReservationItem[];
  total_quantity: number;
  notes?: string;
  delivered_at?: string;
  cancelled_at?: string;
  created_by: string;
  created_at: string;
}

export type DateFilterOption = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export interface DateFilterRange {
  option: DateFilterOption;
  startDate: string;
  endDate: string;
}
