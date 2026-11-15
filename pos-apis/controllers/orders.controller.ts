/**
 * POS Orders Controller
 * Handles all HTTP methods: GET, POST, PUT, PATCH, DELETE for POS Orders.
 * Author: Hafez ERP Engineering
 */

import { posDb, supabase } from "../database.ts";
import type {
  CreateOrderRequest,
  UpdateOrderRequest,
  PatchOrderStatusRequest,
  RefundOrderRequest,
  PosOrderRecord,
  PosOrderItemRecord,
  ApiResponse,
} from "../types.ts";

export class OrdersController {
  /**
   * GET /api/pos/orders
   * Query params: branchId, status, platform, cashierId, search, limit, offset
   */
  static async listOrders(query: Record<string, string>): Promise<ApiResponse<PosOrderRecord[]>> {
    const branchId = query.branchId || query.branch_id;
    const status = query.status;
    const platform = query.platform || query.order_platform;
    const cashierId = query.cashierId || query.cashier_id;
    const search = (query.search || "").toLowerCase().trim();
    const limit = Math.max(1, Math.min(200, parseInt(query.limit || "50", 10)));
    const offset = Math.max(0, parseInt(query.offset || "0", 10));

    // Try live Supabase first
    try {
      let sbQuery = supabase
        .from("pos_orders")
        .select("*, pos_order_items(*)")
        .order("created_at", { ascending: false });

      if (branchId) sbQuery = sbQuery.eq("branch_id", branchId);
      if (status) sbQuery = sbQuery.eq("status", status);
      if (platform) sbQuery = sbQuery.eq("order_platform", platform);
      if (cashierId) sbQuery = sbQuery.eq("cashier_id", cashierId);
      if (search) {
        sbQuery = sbQuery.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      }

      sbQuery = sbQuery.range(offset, offset + limit - 1);
      const { data, error } = await sbQuery;

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: PosOrderRecord[] = data.map((row: any) => ({
          id: row.id,
          orderNumber: row.order_number || row.id,
          cashierId: row.cashier_id,
          cashierName: row.cashier_name,
          branchId: row.branch_id,
          orderType: row.order_type,
          orderPlatform: row.order_platform,
          orderRefNumber: row.order_ref_number || "",
          customerName: row.customer_name || "عميل نقدي / صالة",
          customerPhone: row.customer_phone || "",
          tableNumber: row.table_number || "",
          deliveryNotes: row.delivery_notes || "",
          paymentMethod: row.payment_method,
          subtotal: Number(row.subtotal) || 0,
          taxAmount: Number(row.tax_amount) || 0,
          discountAmount: Number(row.discount_amount) || 0,
          deliveryFee: Number(row.delivery_fee) || 0,
          total: Number(row.total) || 0,
          tenderAmount: Number(row.tender_amount) || 0,
          changeAmount: Number(row.change_amount) || 0,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          items: (row.pos_order_items || []).map((it: any) => ({
            id: it.id,
            orderId: row.id,
            sku: it.sku,
            nameAr: it.name_ar,
            nameEn: it.name_en,
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unit_price) || 0,
            totalPrice: Number(it.total_price) || 0,
            notes: it.notes || "",
            createdAt: it.created_at,
          })),
        }));

        return {
          success: true,
          data: mapped,
          meta: { total: mapped.length, limit, offset, timestamp: new Date().toISOString() },
        };
      }
    } catch {
      // Fallback to in-memory store
    }

    // In-memory filter fallback
    let all = Array.from(posDb.orders.values());
    if (branchId) all = all.filter(o => o.branchId === branchId);
    if (status) all = all.filter(o => o.status === status);
    if (platform) all = all.filter(o => o.orderPlatform === platform);
    if (cashierId) all = all.filter(o => o.cashierId === cashierId);
    if (search) {
      all = all.filter(o =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.customerName.toLowerCase().includes(search) ||
        o.customerPhone.includes(search)
      );
    }

    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const paginated = all.slice(offset, offset + limit).map(o => ({
      ...o,
      items: posDb.items.get(o.id) || [],
    }));

    return {
      success: true,
      data: paginated,
      meta: { total: all.length, limit, offset, timestamp: new Date().toISOString() },
    };
  }

  /**
   * GET /api/pos/orders/:id
   */
  static async getOrderById(idOrNumber: string): Promise<ApiResponse<PosOrderRecord>> {
    // 1. Try Supabase
    try {
      const { data, error } = await supabase
        .from("pos_orders")
        .select("*, pos_order_items(*)")
        .or(`id.eq.${idOrNumber},order_number.eq.${idOrNumber}`)
        .maybeSingle();

      if (!error && data) {
        const order: PosOrderRecord = {
          id: data.id,
          orderNumber: data.order_number,
          cashierId: data.cashier_id,
          cashierName: data.cashier_name,
          branchId: data.branch_id,
          orderType: data.order_type,
          orderPlatform: data.order_platform,
          orderRefNumber: data.order_ref_number || "",
          customerName: data.customer_name || "عميل نقدي / صالة",
          customerPhone: data.customer_phone || "",
          tableNumber: data.table_number || "",
          deliveryNotes: data.delivery_notes || "",
          paymentMethod: data.payment_method,
          subtotal: Number(data.subtotal) || 0,
          taxAmount: Number(data.tax_amount) || 0,
          discountAmount: Number(data.discount_amount) || 0,
          deliveryFee: Number(data.delivery_fee) || 0,
          total: Number(data.total) || 0,
          tenderAmount: Number(data.tender_amount) || 0,
          changeAmount: Number(data.change_amount) || 0,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          items: (data.pos_order_items || []).map((it: any) => ({
            id: it.id,
            orderId: data.id,
            sku: it.sku,
            nameAr: it.name_ar,
            nameEn: it.name_en,
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unit_price) || 0,
            totalPrice: Number(it.total_price) || 0,
            notes: it.notes || "",
            createdAt: it.created_at,
          })),
        };
        return { success: true, data: order };
      }
    } catch {}

    // 2. Try In-memory
    let match = posDb.orders.get(idOrNumber);
    if (!match) {
      match = Array.from(posDb.orders.values()).find(o => o.orderNumber === idOrNumber);
    }

    if (!match) {
      return { success: false, error: `Order not found with identifier '${idOrNumber}'` };
    }

    return {
      success: true,
      data: {
        ...match,
        items: posDb.items.get(match.id) || [],
      },
    };
  }

  /**
   * POST /api/pos/orders
   * Create a new POS transaction / order
   */
  static async createOrder(payload: CreateOrderRequest): Promise<ApiResponse<PosOrderRecord>> {
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return { success: false, error: "Order must contain at least one line item" };
    }

    const orderId = `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const orderNumber = payload.orderNumber || `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Compute finances
    let computedSubtotal = 0;
    const computedItems: PosOrderItemRecord[] = payload.items.map((it, idx) => {
      const q = Math.max(0.001, Number(it.quantity) || 1);
      const p = Math.max(0, Number(it.unitPrice) || 0);
      const lineTotal = Number(it.totalPrice) || Math.round(q * p * 100) / 100;
      computedSubtotal += lineTotal;
      return {
        id: `itm-${orderId}-${idx + 1}`,
        orderId,
        productId: it.productId,
        sku: it.sku || `SKU-POS-${idx + 1}`,
        nameAr: it.nameAr || "صنف حلوى",
        nameEn: it.nameEn || "Pastry Item",
        quantity: q,
        unitPrice: p,
        totalPrice: lineTotal,
        notes: it.notes || "",
        createdAt: now,
      };
    });

    const discount = Math.max(0, Number(payload.discountAmount) || 0);
    const subtotalAfterDiscount = Math.max(0, computedSubtotal - discount);
    const vatRate = 0.14; // Egypt standard VAT
    const taxAmount = Number(payload.taxAmount) !== undefined ? Number(payload.taxAmount) : Math.round(subtotalAfterDiscount * vatRate * 100) / 100;
    const deliveryFee = Math.max(0, Number(payload.deliveryFee) || 0);
    const finalTotal = payload.total !== undefined ? Number(payload.total) : Math.round((subtotalAfterDiscount + taxAmount + deliveryFee) * 100) / 100;
    const tenderAmount = payload.tenderAmount !== undefined ? Number(payload.tenderAmount) : finalTotal;
    const changeAmount = Math.max(0, tenderAmount - finalTotal);

    const newOrder: PosOrderRecord = {
      id: orderId,
      orderNumber,
      cashierId: payload.cashierId || "usr-pos-cashier",
      cashierName: payload.cashierName || "كاشير مناوب",
      branchId: payload.branchId || "korba",
      orderType: payload.orderType || "takeaway",
      orderPlatform: payload.orderPlatform || "direct",
      orderRefNumber: payload.orderRefNumber || "",
      customerName: payload.customerName || "عميل نقدي / صالة",
      customerPhone: payload.customerPhone || "",
      tableNumber: payload.tableNumber || "",
      deliveryNotes: payload.deliveryNotes || "",
      paymentMethod: payload.paymentMethod || "cash",
      subtotal: Math.round(computedSubtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      discountAmount: discount,
      deliveryFee,
      total: finalTotal,
      tenderAmount,
      changeAmount,
      status: payload.status || "completed",
      createdAt: now,
      updatedAt: now,
      items: computedItems,
    };

    // Save in Memory
    posDb.orders.set(orderId, newOrder);
    posDb.items.set(orderId, computedItems);

    // Update active shift stats in memory
    const activeShift = Array.from(posDb.shifts.values()).find(s => s.status === "open" && s.branchId === newOrder.branchId);
    if (activeShift) {
      activeShift.totalSales += newOrder.total;
      activeShift.ordersCount += 1;
      if (newOrder.paymentMethod === "cash") activeShift.cashSales += newOrder.total;
      else if (newOrder.paymentMethod === "card") activeShift.cardSales += newOrder.total;
      else if (newOrder.paymentMethod === "wallet") activeShift.walletSales += newOrder.total;
      activeShift.updatedAt = now;
    }

    // Try persist to Supabase asynchronously
    try {
      const { data: dbOrder } = await supabase.from("pos_orders").insert({
        order_number: newOrder.orderNumber,
        cashier_id: newOrder.cashierId,
        cashier_name: newOrder.cashierName,
        branch_id: newOrder.branchId,
        order_type: newOrder.orderType,
        order_platform: newOrder.orderPlatform,
        order_ref_number: newOrder.orderRefNumber,
        customer_name: newOrder.customerName,
        customer_phone: newOrder.customerPhone,
        table_number: newOrder.tableNumber,
        delivery_notes: newOrder.deliveryNotes,
        payment_method: newOrder.paymentMethod,
        subtotal: newOrder.subtotal,
        tax_amount: newOrder.taxAmount,
        discount_amount: newOrder.discountAmount,
        delivery_fee: newOrder.deliveryFee,
        total: newOrder.total,
        tender_amount: newOrder.tenderAmount,
        change_amount: newOrder.changeAmount,
        status: newOrder.status,
      }).select("id").single();

      if (dbOrder?.id) {
        newOrder.id = dbOrder.id;
        const linePayloads = computedItems.map(it => ({
          order_id: dbOrder.id,
          product_id: it.productId || null,
          sku: it.sku,
          name_ar: it.nameAr,
          name_en: it.nameEn,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          total_price: it.totalPrice,
          notes: it.notes,
        }));
        await supabase.from("pos_order_items").insert(linePayloads);
      }
    } catch {}

    return {
      success: true,
      message: "Order placed successfully",
      data: newOrder,
    };
  }

  /**
   * PUT /api/pos/orders/:id
   * Complete update/replacement of order properties
   */
  static async updateOrder(id: string, payload: UpdateOrderRequest): Promise<ApiResponse<PosOrderRecord>> {
    let existing = posDb.orders.get(id);
    if (!existing) {
      existing = Array.from(posDb.orders.values()).find(o => o.orderNumber === id);
    }
    if (!existing) {
      return { success: false, error: `Order '${id}' not found for update` };
    }

    const now = new Date().toISOString();

    // If new items are provided, recompute
    if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
      let subtotal = 0;
      const updatedItems: PosOrderItemRecord[] = payload.items.map((it, idx) => {
        const q = Number(it.quantity) || 1;
        const p = Number(it.unitPrice) || 0;
        const lineTotal = Number(it.totalPrice) || q * p;
        subtotal += lineTotal;
        return {
          id: `itm-${existing!.id}-${idx + 1}`,
          orderId: existing!.id,
          productId: it.productId,
          sku: it.sku,
          nameAr: it.nameAr,
          nameEn: it.nameEn,
          quantity: q,
          unitPrice: p,
          totalPrice: lineTotal,
          notes: it.notes || "",
          createdAt: now,
        };
      });
      existing.subtotal = Math.round(subtotal * 100) / 100;
      existing.taxAmount = Math.round(existing.subtotal * 0.14 * 100) / 100;
      existing.total = Math.round((existing.subtotal + existing.taxAmount + existing.deliveryFee - existing.discountAmount) * 100) / 100;
      posDb.items.set(existing.id, updatedItems);
      existing.items = updatedItems;
    }

    if (payload.customerName !== undefined) existing.customerName = payload.customerName;
    if (payload.customerPhone !== undefined) existing.customerPhone = payload.customerPhone;
    if (payload.tableNumber !== undefined) existing.tableNumber = payload.tableNumber;
    if (payload.deliveryNotes !== undefined) existing.deliveryNotes = payload.deliveryNotes;
    if (payload.orderType !== undefined) existing.orderType = payload.orderType;
    if (payload.orderPlatform !== undefined) existing.orderPlatform = payload.orderPlatform;
    if (payload.paymentMethod !== undefined) existing.paymentMethod = payload.paymentMethod;
    if (payload.status !== undefined) existing.status = payload.status;
    if (payload.tenderAmount !== undefined) existing.tenderAmount = payload.tenderAmount;
    if (payload.changeAmount !== undefined) existing.changeAmount = payload.changeAmount;
    existing.updatedAt = now;

    posDb.orders.set(existing.id, existing);

    // Sync to Supabase
    try {
      await supabase.from("pos_orders").update({
        customer_name: existing.customerName,
        customer_phone: existing.customerPhone,
        table_number: existing.tableNumber,
        delivery_notes: existing.deliveryNotes,
        order_type: existing.orderType,
        order_platform: existing.orderPlatform,
        payment_method: existing.paymentMethod,
        status: existing.status,
        updated_at: now,
      }).eq("id", existing.id);
    } catch {}

    return {
      success: true,
      message: "Order updated successfully",
      data: existing,
    };
  }

  /**
   * PATCH /api/pos/orders/:id/status
   * Fast status transition (completed, parked, cancelled, refunded)
   */
  static async patchOrderStatus(id: string, payload: PatchOrderStatusRequest): Promise<ApiResponse<PosOrderRecord>> {
    let order = posDb.orders.get(id);
    if (!order) {
      order = Array.from(posDb.orders.values()).find(o => o.orderNumber === id);
    }
    if (!order) {
      return { success: false, error: `Order '${id}' not found` };
    }

    order.status = payload.status;
    order.updatedAt = new Date().toISOString();
    posDb.orders.set(order.id, order);

    try {
      await supabase.from("pos_orders").update({ status: payload.status, updated_at: order.updatedAt }).eq("id", order.id);
    } catch {}

    return {
      success: true,
      message: `Order status changed to '${payload.status}'`,
      data: {
        ...order,
        items: posDb.items.get(order.id) || [],
      },
    };
  }

  /**
   * DELETE /api/pos/orders/:id
   * Void or cancel order permanently
   */
  static async deleteOrder(id: string): Promise<ApiResponse<{ deletedId: string }>> {
    let order = posDb.orders.get(id);
    if (!order) {
      order = Array.from(posDb.orders.values()).find(o => o.orderNumber === id);
    }
    if (!order) {
      return { success: false, error: `Order '${id}' not found to delete` };
    }

    const orderId = order.id;
    posDb.orders.delete(orderId);
    posDb.items.delete(orderId);

    try {
      await supabase.from("pos_order_items").delete().eq("order_id", orderId);
      await supabase.from("pos_orders").delete().eq("id", orderId);
    } catch {}

    return {
      success: true,
      message: `Order '${order.orderNumber}' voided and deleted successfully`,
      data: { deletedId: orderId },
    };
  }

  /**
   * POST /api/pos/orders/park
   * Park / suspend current order
   */
  static async parkOrder(payload: CreateOrderRequest): Promise<ApiResponse<PosOrderRecord>> {
    const parkedPayload: CreateOrderRequest = {
      ...payload,
      status: "parked",
      orderNumber: payload.orderNumber || `PARK-${Date.now().toString().slice(-6)}`,
    };
    return OrdersController.createOrder(parkedPayload);
  }

  /**
   * GET /api/pos/orders/parked
   * Retrieve all currently parked orders
   */
  static async getParkedOrders(query: Record<string, string>): Promise<ApiResponse<PosOrderRecord[]>> {
    return OrdersController.listOrders({ ...query, status: "parked" });
  }

  /**
   * POST /api/pos/orders/:id/refund
   * Issue full or partial refund for order
   */
  static async refundOrder(id: string, payload: RefundOrderRequest): Promise<ApiResponse<PosOrderRecord>> {
    let order = posDb.orders.get(id);
    if (!order) {
      order = Array.from(posDb.orders.values()).find(o => o.orderNumber === id);
    }
    if (!order) {
      return { success: false, error: `Order '${id}' not found for refund` };
    }

    const refundAmt = payload.refundAmount !== undefined ? Number(payload.refundAmount) : order.total;
    order.status = "refunded";
    order.updatedAt = new Date().toISOString();
    order.deliveryNotes = `[REFUND] Storno of ${refundAmt} EGP by ${payload.cashierName}: ${payload.reason || "Customer request"}`;

    posDb.orders.set(order.id, order);

    try {
      await supabase.from("pos_orders").update({
        status: "refunded",
        delivery_notes: order.deliveryNotes,
        updated_at: order.updatedAt,
      }).eq("id", order.id);
    } catch {}

    return {
      success: true,
      message: `Order '${order.orderNumber}' refunded (${refundAmt} EGP) successfully`,
      data: {
        ...order,
        items: posDb.items.get(order.id) || [],
      },
    };
  }
}
