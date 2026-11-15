/**
 * POS APIs - TypeScript Type Definitions
 * Complete definitions for POS Orders, Shifts, Items, Catalog, Customers, and Sync.
 * Author: Hafez ERP Engineering
 */

export type PosOrderStatus = "completed" | "paid" | "parked" | "cancelled" | "refunded";
export type PosOrderType = "takeaway" | "dine_in" | "delivery";
export type PosPlatform = "direct" | "talabat" | "elmenus" | "hungerstation" | "jahez" | "noon" | "mrsool" | "waffarha" | "other";
export type PosPaymentMethod = "cash" | "card" | "wallet" | "split" | "fawry" | "credit" | "valu";
export type PosShiftStatus = "open" | "closed";
export type CashMovementType = "cash_in" | "cash_out" | "expense_payout" | "safe_drop";

export interface PosOrderItemInput {
  productId?: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  notes?: string;
}

export interface PosOrderItemRecord extends PosOrderItemInput {
  id: string;
  orderId: string;
  totalPrice: number;
  createdAt: string;
}

export interface CreateOrderRequest {
  orderNumber?: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  orderType: PosOrderType;
  orderPlatform?: PosPlatform;
  orderRefNumber?: string;
  customerName?: string;
  customerPhone?: string;
  tableNumber?: string;
  deliveryNotes?: string;
  paymentMethod: PosPaymentMethod;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  deliveryFee?: number;
  total?: number;
  tenderAmount?: number;
  changeAmount?: number;
  status?: PosOrderStatus;
  items: PosOrderItemInput[];
}

export interface UpdateOrderRequest {
  orderType?: PosOrderType;
  orderPlatform?: PosPlatform;
  customerName?: string;
  customerPhone?: string;
  tableNumber?: string;
  deliveryNotes?: string;
  paymentMethod?: PosPaymentMethod;
  tenderAmount?: number;
  changeAmount?: number;
  status?: PosOrderStatus;
  notes?: string;
  items?: PosOrderItemInput[];
}

export interface PatchOrderStatusRequest {
  status: PosOrderStatus;
  reason?: string;
  cancelledBy?: string;
  refundAmount?: number;
}

export interface RefundOrderRequest {
  refundAmount?: number;
  reason: string;
  cashierId: string;
  cashierName: string;
  restockItems?: boolean;
}

export interface PosOrderRecord {
  id: string;
  orderNumber: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  orderType: PosOrderType;
  orderPlatform: PosPlatform;
  orderRefNumber: string;
  customerName: string;
  customerPhone: string;
  tableNumber: string;
  deliveryNotes: string;
  paymentMethod: PosPaymentMethod;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  tenderAmount: number;
  changeAmount: number;
  status: PosOrderStatus;
  createdAt: string;
  updatedAt: string;
  items?: PosOrderItemRecord[];
}

export interface OpenShiftRequest {
  shiftNumber?: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  openingCash: number;
  notes?: string;
}

export interface CloseShiftRequest {
  actualCash: number;
  actualCard?: number;
  actualWallet?: number;
  closingNotes?: string;
  closedBy?: string;
}

export interface CashMovementRequest {
  shiftId: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  authorizedBy?: string;
}

export interface PosShiftRecord {
  id: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  walletSales: number;
  ordersCount: number;
  status: PosShiftStatus;
  createdAt: string;
  updatedAt: string;
  closingDetails?: {
    actualCash: number;
    cashVariance: number;
    closingNotes?: string;
    closedBy?: string;
  };
}

export interface ShiftZReport {
  shift: PosShiftRecord;
  financials: {
    grossSales: number;
    discounts: number;
    netSales: number;
    vatTotal: number;
    cashInDrawerExpected: number;
    cashInDrawerActual: number;
    variance: number;
  };
  breakdownByPayment: Record<string, { count: number; total: number }>;
  breakdownByPlatform: Record<string, { count: number; total: number }>;
  breakdownByCategory: Record<string, { count: number; total: number }>;
  topSellingItems: Array<{ sku: string; name: string; qty: number; revenue: number }>;
}

export interface PosProductRecord {
  id: string;
  sku: string;
  barcode: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  categoryName: string;
  price: number;
  costPrice: number;
  taxRate: number;
  stockQty: number;
  unit: string;
  image?: string;
  isActive: boolean;
}

export interface PosCustomerRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export interface BatchSyncRequest {
  branchId: string;
  terminalId: string;
  orders: CreateOrderRequest[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    timestamp?: string;
  };
  error?: string;
  details?: any;
}
