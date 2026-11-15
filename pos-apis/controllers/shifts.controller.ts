/**
 * POS Shifts Controller
 * Handles all shift lifecycle methods: Open, Close, Cash Drops, Reconcile, Z-Report.
 * Author: Hafez ERP Engineering
 */

import { posDb, supabase } from "../database.ts";
import type {
  OpenShiftRequest,
  CloseShiftRequest,
  CashMovementRequest,
  PosShiftRecord,
  ShiftZReport,
  ApiResponse,
} from "../types.ts";

export class ShiftsController {
  /**
   * GET /api/pos/shifts
   */
  static async listShifts(query: Record<string, string>): Promise<ApiResponse<PosShiftRecord[]>> {
    const branchId = query.branchId || query.branch_id;
    const cashierId = query.cashierId || query.cashier_id;
    const status = query.status;
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || "50", 10)));

    try {
      let sbQuery = supabase.from("pos_shifts").select("*").order("created_at", { ascending: false });
      if (branchId) sbQuery = sbQuery.eq("branch_id", branchId);
      if (cashierId) sbQuery = sbQuery.eq("cashier_id", cashierId);
      if (status) sbQuery = sbQuery.eq("status", status);
      sbQuery = sbQuery.limit(limit);

      const { data, error } = await sbQuery;
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: PosShiftRecord[] = data.map((d: any) => ({
          id: d.id,
          shiftNumber: d.shift_number || d.id,
          cashierId: d.cashier_id,
          cashierName: d.cashier_name,
          branchId: d.branch_id,
          openedAt: d.opened_at,
          closedAt: d.closed_at,
          openingCash: Number(d.opening_cash) || 0,
          totalSales: Number(d.total_sales) || 0,
          cashSales: Number(d.cash_sales) || 0,
          cardSales: Number(d.card_sales) || 0,
          walletSales: Number(d.wallet_sales) || 0,
          ordersCount: Number(d.orders_count) || 0,
          status: d.status,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
        return { success: true, data: mapped, meta: { total: mapped.length } };
      }
    } catch {}

    let all = Array.from(posDb.shifts.values());
    if (branchId) all = all.filter(s => s.branchId === branchId);
    if (cashierId) all = all.filter(s => s.cashierId === cashierId);
    if (status) all = all.filter(s => s.status === status);

    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { success: true, data: all.slice(0, limit), meta: { total: all.length } };
  }

  /**
   * GET /api/pos/shifts/current
   */
  static async getCurrentShift(query: Record<string, string>): Promise<ApiResponse<PosShiftRecord | null>> {
    const branchId = query.branchId || query.branch_id || "korba";
    const cashierId = query.cashierId || query.cashier_id;

    let active = Array.from(posDb.shifts.values()).find(s =>
      s.status === "open" &&
      s.branchId === branchId &&
      (!cashierId || s.cashierId === cashierId)
    );

    if (!active) {
      // Find any open shift for this branch
      active = Array.from(posDb.shifts.values()).find(s => s.status === "open" && s.branchId === branchId);
    }

    return {
      success: true,
      data: active || null,
      message: active ? "Active shift retrieved" : "No open shift found for this terminal/branch",
    };
  }

  /**
   * POST /api/pos/shifts/open
   * Start a new shift
   */
  static async openShift(payload: OpenShiftRequest): Promise<ApiResponse<PosShiftRecord>> {
    if (!payload.cashierId || !payload.branchId) {
      return { success: false, error: "cashierId and branchId are required" };
    }

    // Check if an open shift already exists for this cashier and branch
    const existing = Array.from(posDb.shifts.values()).find(
      s => s.status === "open" && s.branchId === payload.branchId && s.cashierId === payload.cashierId
    );
    if (existing) {
      return {
        success: false,
        error: `Active shift #${existing.shiftNumber} is already open for this cashier. Close it first before opening a new shift.`,
        data: existing,
      };
    }

    const shiftId = `shift-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const shiftNumber = payload.shiftNumber || `SH-${payload.branchId.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newShift: PosShiftRecord = {
      id: shiftId,
      shiftNumber,
      cashierId: payload.cashierId,
      cashierName: payload.cashierName || "كاشير مناوب",
      branchId: payload.branchId,
      openedAt: now,
      closedAt: null,
      openingCash: Math.max(0, Number(payload.openingCash) || 0),
      totalSales: 0,
      cashSales: 0,
      cardSales: 0,
      walletSales: 0,
      ordersCount: 0,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };

    posDb.shifts.set(shiftId, newShift);

    try {
      const { data: dbShift } = await supabase.from("pos_shifts").insert({
        shift_number: newShift.shiftNumber,
        cashier_id: newShift.cashierId,
        cashier_name: newShift.cashierName,
        branch_id: newShift.branchId,
        opened_at: newShift.openedAt,
        opening_cash: newShift.openingCash,
        total_sales: 0,
        cash_sales: 0,
        card_sales: 0,
        wallet_sales: 0,
        orders_count: 0,
        status: "open",
      }).select("id").single();

      if (dbShift?.id) newShift.id = dbShift.id;
    } catch {}

    return {
      success: true,
      message: `Shift #${newShift.shiftNumber} opened successfully with float ${newShift.openingCash} EGP`,
      data: newShift,
    };
  }

  /**
   * POST /api/pos/shifts/close
   * Close and reconcile shift
   */
  static async closeShift(shiftIdOrNumber: string, payload: CloseShiftRequest): Promise<ApiResponse<PosShiftRecord>> {
    let shift = posDb.shifts.get(shiftIdOrNumber);
    if (!shift) {
      shift = Array.from(posDb.shifts.values()).find(s => s.shiftNumber === shiftIdOrNumber);
    }
    if (!shift) {
      // Find first open shift if available
      shift = Array.from(posDb.shifts.values()).find(s => s.status === "open");
    }
    if (!shift) {
      return { success: false, error: "No open shift found to close" };
    }

    const now = new Date().toISOString();
    const actualCash = Number(payload.actualCash) || 0;
    const expectedCash = shift.openingCash + shift.cashSales;
    const variance = actualCash - expectedCash;

    shift.status = "closed";
    shift.closedAt = now;
    shift.updatedAt = now;
    shift.closingDetails = {
      actualCash,
      cashVariance: Math.round(variance * 100) / 100,
      closingNotes: payload.closingNotes || "",
      closedBy: payload.closedBy || shift.cashierName,
    };

    posDb.shifts.set(shift.id, shift);

    try {
      await supabase.from("pos_shifts").update({
        status: "closed",
        closed_at: now,
        updated_at: now,
      }).eq("id", shift.id);
    } catch {}

    return {
      success: true,
      message: `Shift #${shift.shiftNumber} closed successfully. Variance: ${variance >= 0 ? "+" : ""}${variance} EGP`,
      data: shift,
    };
  }

  /**
   * POST /api/pos/shifts/cash-movement
   * Record petty cash drop or injection
   */
  static async recordCashMovement(payload: CashMovementRequest): Promise<ApiResponse<any>> {
    if (!payload.shiftId || !payload.amount || payload.amount <= 0) {
      return { success: false, error: "shiftId and valid positive amount required" };
    }

    const movement = {
      id: `csh-${Date.now().toString(36)}`,
      shiftId: payload.shiftId,
      type: payload.type || "safe_drop",
      amount: Number(payload.amount),
      reason: payload.reason || "تحويل نقدية إلى الخزينة الرئيسية",
      authorizedBy: payload.authorizedBy || "مدير الفرع",
      createdAt: new Date().toISOString(),
    };

    posDb.cashMovements.push(movement);

    return {
      success: true,
      message: `Cash movement of ${movement.amount} EGP recorded successfully`,
      data: movement,
    };
  }

  /**
   * GET /api/pos/shifts/:id/z-report
   * Produce comprehensive End-Of-Day Z-Report
   */
  static async getShiftZReport(shiftIdOrNumber: string): Promise<ApiResponse<ShiftZReport>> {
    let shift = posDb.shifts.get(shiftIdOrNumber);
    if (!shift) {
      shift = Array.from(posDb.shifts.values()).find(s => s.shiftNumber === shiftIdOrNumber);
    }
    if (!shift) {
      return { success: false, error: `Shift '${shiftIdOrNumber}' not found` };
    }

    // Aggregate orders placed during this shift
    const orders = Array.from(posDb.orders.values()).filter(o => o.branchId === shift!.branchId);
    let gross = 0;
    let discounts = 0;
    let vat = 0;
    const byPay: Record<string, { count: number; total: number }> = {};
    const byPlat: Record<string, { count: number; total: number }> = {};
    const itemMap: Record<string, { sku: string; name: string; qty: number; revenue: number }> = {};

    orders.forEach(o => {
      gross += o.total;
      discounts += o.discountAmount;
      vat += o.taxAmount;

      byPay[o.paymentMethod] = byPay[o.paymentMethod] || { count: 0, total: 0 };
      byPay[o.paymentMethod].count += 1;
      byPay[o.paymentMethod].total += o.total;

      byPlat[o.orderPlatform] = byPlat[o.orderPlatform] || { count: 0, total: 0 };
      byPlat[o.orderPlatform].count += 1;
      byPlat[o.orderPlatform].total += o.total;

      const lines = posDb.items.get(o.id) || [];
      lines.forEach(it => {
        if (!itemMap[it.sku]) itemMap[it.sku] = { sku: it.sku, name: it.nameAr, qty: 0, revenue: 0 };
        itemMap[it.sku].qty += it.quantity;
        itemMap[it.sku].revenue += it.totalPrice;
      });
    });

    const expectedCash = shift.openingCash + (byPay["cash"]?.total || 0);
    const actualCash = shift.closingDetails?.actualCash ?? expectedCash;

    const report: ShiftZReport = {
      shift,
      financials: {
        grossSales: Math.round(gross * 100) / 100,
        discounts: Math.round(discounts * 100) / 100,
        netSales: Math.round((gross - discounts) * 100) / 100,
        vatTotal: Math.round(vat * 100) / 100,
        cashInDrawerExpected: Math.round(expectedCash * 100) / 100,
        cashInDrawerActual: actualCash,
        variance: Math.round((actualCash - expectedCash) * 100) / 100,
      },
      breakdownByPayment: byPay,
      breakdownByPlatform: byPlat,
      breakdownByCategory: {},
      topSellingItems: Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    };

    return {
      success: true,
      data: report,
    };
  }

  /**
   * PUT /api/pos/shifts/:id
   */
  static async updateShift(id: string, payload: Partial<PosShiftRecord>): Promise<ApiResponse<PosShiftRecord>> {
    const shift = posDb.shifts.get(id);
    if (!shift) return { success: false, error: `Shift '${id}' not found` };

    if (payload.openingCash !== undefined) shift.openingCash = payload.openingCash;
    if (payload.cashierName !== undefined) shift.cashierName = payload.cashierName;
    if (payload.status !== undefined) shift.status = payload.status;
    shift.updatedAt = new Date().toISOString();

    posDb.shifts.set(id, shift);
    return { success: true, data: shift };
  }

  /**
   * DELETE /api/pos/shifts/:id
   */
  static async deleteShift(id: string): Promise<ApiResponse<{ deletedId: string }>> {
    const shift = posDb.shifts.get(id);
    if (!shift) return { success: false, error: `Shift '${id}' not found to delete` };

    posDb.shifts.delete(id);
    try {
      await supabase.from("pos_shifts").delete().eq("id", id);
    } catch {}

    return { success: true, data: { deletedId: id } };
  }
}
