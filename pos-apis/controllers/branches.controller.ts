/**
 * POS Branches & Terminals Controller
 * Handles retail branch listings, POS terminal configurations, and cashier PIN verification.
 * Author: Hafez ERP Engineering
 */

import type { ApiResponse } from "../types.ts";

export interface BranchInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  addressAr: string;
  addressEn: string;
  isKitchen: boolean;
  terminalsCount: number;
}

export const BRANCHES_CATALOG: BranchInfo[] = [
  { id: "korba", code: "BR-01", nameAr: "فرع الكوربة — مصر الجديدة", nameEn: "Korba — Heliopolis", phone: "+20 100 455 2211", addressAr: "شارع بغداد، الكوربة، مصر الجديدة", addressEn: "Baghdad St., Korba, Heliopolis", isKitchen: false, terminalsCount: 3 },
  { id: "maadi", code: "BR-02", nameAr: "فرع المعادي — شارع النصر", nameEn: "Maadi — Al-Nasr St.", phone: "+20 100 882 3344", addressAr: "شارع النصر الرئيسي، المعادي الجديدة", addressEn: "Main Al-Nasr St., New Maadi", isKitchen: false, terminalsCount: 2 },
  { id: "tagamoa", code: "BR-03", nameAr: "فرع التجمع الخامس — التسعين", nameEn: "New Cairo — 90th St.", phone: "+20 100 994 5566", addressAr: "شارع التسعين الشمالي، التجمع الخامس", addressEn: "North 90th St., 5th Settlement", isKitchen: false, terminalsCount: 3 },
  { id: "sheikh_zayed", code: "BR-04", nameAr: "فرع الشيخ زايد — أمريكانا بلازا", nameEn: "Sheikh Zayed — Americana Plaza", phone: "+20 100 661 2233", addressAr: "أمريكانا بلازا، الشيخ زايد", addressEn: "Americana Plaza, Sheikh Zayed", isKitchen: false, terminalsCount: 2 },
  { id: "abbas", code: "BR-05", nameAr: "فرع عباس العقاد — مدينة نصر", nameEn: "Abbas El-Akkad — Nasr City", phone: "+20 100 551 2233", addressAr: "شارع عباس العقاد الرئيسي", addressEn: "Abbas El-Akkad St., Nasr City", isKitchen: false, terminalsCount: 2 },
  { id: "wost_elbalad", code: "BR-06", nameAr: "فرع وسط البلد — طلعت حرب", nameEn: "Downtown — Talaat Harb", phone: "+20 100 884 5566", addressAr: "ميدان طلعت حرب، القاهرة", addressEn: "Talaat Harb Square, Cairo", isKitchen: false, terminalsCount: 2 },
  { id: "alex", code: "BR-07", nameAr: "فرع الإسكندرية — سموحة", nameEn: "Alexandria — Smouha", phone: "+20 100 771 9922", addressAr: "شارع فوزي معاذ، سموحة", addressEn: "Fawzy Moaz St., Smouha", isKitchen: false, terminalsCount: 2 },
  { id: "faisal", code: "BR-08", nameAr: "فرع فيصل — شارع فيصل الرئيسي", nameEn: "Faisal Main St.", phone: "+20 100 116 7788", addressAr: "شارع الملك فيصل الرئيسي", addressEn: "King Faisal Main St.", isKitchen: false, terminalsCount: 2 },
  { id: "kitchen", code: "HUB-01", nameAr: "المطبخ المركزي ومصنع العاشر", nameEn: "Central Kitchen & Factory Hub", phone: "+20 100 112 0000", addressAr: "المنطقة الصناعية الثالثة، العاشر من رمضان", addressEn: "3rd Industrial Zone, 10th of Ramadan", isKitchen: true, terminalsCount: 4 },
];

export const CASHIER_PINS: Record<string, { cashierId: string; name: string; branchId: string; role: string }> = {
  "1234": { cashierId: "usr-korba", name: "أحمد فريد", branchId: "korba", role: "senior_cashier" },
  "5678": { cashierId: "usr-maadi", name: "سارة محمود", branchId: "maadi", role: "cashier" },
  "9999": { cashierId: "usr-supervisor", name: "مشرف الوردية العام", branchId: "all", role: "supervisor" },
  "0000": { cashierId: "usr-admin", name: "وزير الحلو — المدير العام", branchId: "all", role: "admin" },
};

export class BranchesController {
  /**
   * GET /api/pos/branches
   */
  static async listBranches(): Promise<ApiResponse<BranchInfo[]>> {
    return {
      success: true,
      data: BRANCHES_CATALOG,
      meta: { total: BRANCHES_CATALOG.length },
    };
  }

  /**
   * GET /api/pos/branches/:id
   */
  static async getBranchById(id: string): Promise<ApiResponse<BranchInfo>> {
    const branch = BRANCHES_CATALOG.find(b => b.id === id || b.code.toLowerCase() === id.toLowerCase());
    if (!branch) {
      return { success: false, error: `Branch '${id}' not found` };
    }
    return { success: true, data: branch };
  }

  /**
   * POST /api/pos/auth/pin-verify
   * Verify cashier 4-digit PIN for swift terminal login
   */
  static async verifyPin(payload: { pin: string; branchId?: string }): Promise<ApiResponse<any>> {
    const pin = String(payload.pin || "").trim();
    const cashier = CASHIER_PINS[pin];

    if (!cashier) {
      return { success: false, error: "Invalid cashier PIN code" };
    }

    if (payload.branchId && cashier.branchId !== "all" && cashier.branchId !== payload.branchId) {
      return { success: false, error: "Cashier not assigned to this branch" };
    }

    return {
      success: true,
      message: "PIN authentication successful",
      data: {
        authenticated: true,
        cashierId: cashier.cashierId,
        cashierName: cashier.name,
        branchId: payload.branchId || cashier.branchId,
        role: cashier.role,
        token: `pos_token_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      },
    };
  }

  /**
   * GET /api/pos/terminals
   */
  static async listTerminals(query: Record<string, string>): Promise<ApiResponse<any[]>> {
    const branchId = query.branchId || query.branch_id;
    const terminals = [
      { id: "term-korba-01", branchId: "korba", name: "كاشير 1 — صالة الكوربة", deviceModel: "Sunmi T2 Touchscreen", status: "online", ip: "192.168.1.101" },
      { id: "term-korba-02", branchId: "korba", name: "كاشير 2 — تيك أواي وتطبيقات", deviceModel: "Pax A920 Pro Mobile", status: "online", ip: "192.168.1.102" },
      { id: "term-maadi-01", branchId: "maadi", name: "كاشير رئيسي — المعادي", deviceModel: "Sunmi D2s Desktop", status: "online", ip: "192.168.2.101" },
      { id: "term-tagamoa-01", branchId: "tagamoa", name: "كاشير 1 — التجمع", deviceModel: "Sunmi T2 Pro Dual Screen", status: "online", ip: "192.168.3.101" },
    ];

    const filtered = branchId ? terminals.filter(t => t.branchId === branchId) : terminals;
    return { success: true, data: filtered };
  }
}
