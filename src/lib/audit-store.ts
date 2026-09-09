import { useState, useEffect, useCallback } from "react";

export type AuditSeverity = "low" | "medium" | "high" | "critical";

export type AuditResult = "success" | "denied" | "flagged" | "warning";

export type AuditCategory =
  | "billing"
  | "inventory"
  | "manufacturing"
  | "auth"
  | "security"
  | "settings";

export type AuditActorType = "human" | "ai_agent";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorType: AuditActorType;
  user: {
    ar: string;
    en: string;
    role: string;
    ip: string;
  };
  agent?: {
    ar: string;
    en: string;
    model: string;
    provider: string;
  };
  action: {
    ar: string;
    en: string;
  };
  category: AuditCategory;
  result: AuditResult;
  severity: AuditSeverity;
  targetResource: string;
  securityRationale?: {
    ar: string;
    en: string;
  };
  payload: Record<string, any>;
  durationMs: number;
}

const STORAGE_KEY = "wazeer_erp_audit_trail_v1";

export const INITIAL_AUDIT_LOGS: AuditEntry[] = [
  {
    id: "aud-101",
    timestamp: "2026-09-09 18:32:15",
    actorType: "ai_agent",
    user: {
      ar: "أحمد سالم",
      en: "Ahmed Salem",
      role: "كاشير ومسؤول فواتير",
      ip: "192.168.1.45 (فرع الكوربة)",
    },
    agent: {
      ar: "وكيل مبيعات وزير الحلو",
      en: "Wazeer Sales Agent",
      model: "gemini-1.5-pro",
      provider: "google",
    },
    action: {
      ar: "إنشاء فاتورة ضريبية إلكترونية INV-10452 لفندق الماسة",
      en: "Generated electronic invoice INV-10452 for Al-Masa Hotel",
    },
    category: "billing",
    result: "success",
    severity: "low",
    targetResource: "INV-10452",
    durationMs: 420,
    payload: {
      invoiceId: "INV-10452",
      customerCode: "CUST-1042",
      totalAmount: 36000,
      vatRate: "14%",
      vatAmount: 4421,
      paymentMethod: "bank_transfer",
      appliedDiscountPercent: 5,
      approver: "agent_auto_approved",
    },
  },
  {
    id: "aud-102",
    timestamp: "2026-09-09 18:05:40",
    actorType: "human",
    user: {
      ar: "منى خليل",
      en: "Mona Khalil",
      role: "محاسب رئيسي",
      ip: "192.168.1.12 (الإدارة المالية)",
    },
    agent: {
      ar: "وكيل الحسابات والضرائب",
      en: "Finance & COA Agent",
      model: "gpt-4o-mini",
      provider: "openai",
    },
    action: {
      ar: "تسجيل تحصيل شيك بنكي بقيمة 20,000 ج.م من سيزار كافيه",
      en: "Recorded bank payment receipt 20,000 EGP from Cesar Cafe",
    },
    category: "billing",
    result: "success",
    severity: "low",
    targetResource: "RCP-88301",
    durationMs: 310,
    payload: {
      receiptNumber: "RCP-88301",
      customerCode: "CUST-1043",
      amount: 20000,
      depositAccount: "1110 — البنك الأهلي المصري",
      clearedDate: "2026-09-09",
      journalEntryId: "JE-2026-904",
    },
  },
  {
    id: "aud-103",
    timestamp: "2026-09-09 17:44:12",
    actorType: "human",
    user: {
      ar: "أحمد سالم",
      en: "Ahmed Salem",
      role: "كاشير فرع",
      ip: "192.168.1.45 (فرع الكوربة)",
    },
    agent: {
      ar: "حافظ — منسق العمليات",
      en: "Hafez — Executive Sentinel",
      model: "gpt-4o",
      provider: "openai",
    },
    action: {
      ar: "محاولة تنزيل تقرير أرباح وميزانية الإدارة العليا — مرفوض أمنياً",
      en: "Attempted to export executive profit & P&L brief — Access Denied",
    },
    category: "security",
    result: "denied",
    severity: "high",
    targetResource: "REPORT_EXECUTIVE_PL_2026",
    securityRationale: {
      ar: "تم حظر العملية: المستخدم يحمل دور 'كاشير' ولا يمتلك صلاحية 'FINANCIAL_EXECUTIVE_READ'",
      en: "Enforced policy: User holds role 'cashier' lacking 'FINANCIAL_EXECUTIVE_READ' permission",
    },
    durationMs: 85,
    payload: {
      attemptedEndpoint: "/api/reports/executive-pl",
      userRole: "cashier",
      requiredPermission: "FINANCIAL_EXECUTIVE_READ",
      clientDeviceId: "pos-terminal-04",
      rejectionCode: "SEC_POLICY_ROLE_INSUFFICIENT",
      alertDispatchedTo: "security-audit@odooteams.com",
    },
  },
  {
    id: "aud-104",
    timestamp: "2026-09-09 16:50:00",
    actorType: "ai_agent",
    user: {
      ar: "شيف إبراهيم البدري",
      en: "Chef Ibrahim El-Badry",
      role: "كبير حلوانية ومدير تشغيل",
      ip: "10.0.4.18 (المطبخ المركزي بالعاشر)",
    },
    agent: {
      ar: "وكيل المطبخ والمخزون الذكي",
      en: "Kitchen & Inventory Predictor",
      model: "claude-3-5-sonnet",
      provider: "anthropic",
    },
    action: {
      ar: "إصدار أمر تشغيل MO-2026-101 وتخصيص 150 طبق كشري حلو لوكس",
      en: "Issued work order MO-2026-101 allocating 150 portions of Sweet Koshary",
    },
    category: "manufacturing",
    result: "success",
    severity: "medium",
    targetResource: "MO-2026-101",
    durationMs: 580,
    payload: {
      orderCode: "MO-2026-101",
      bomCode: "BOM-KSHR-LUX",
      targetYield: 150,
      sourceWarehouse: "WH-CENTRAL",
      destWarehouse: "WH-KORBA",
      reservedIngredients: [
        { sku: "RAW-NUT-15KG", qty: 12, unit: "KG" },
        { sku: "RAW-MILK-L", qty: 45, unit: "LTR" },
        { sku: "RAW-CREAM-KG", qty: 18, unit: "KG" },
      ],
      estimatedBatchCost: 4200,
    },
  },
  {
    id: "aud-105",
    timestamp: "2026-09-09 15:58:22",
    actorType: "ai_agent",
    user: {
      ar: "وكيل الرقابة وكشف الاحتيال",
      en: "Audit & Risk Sentinel",
      role: "مراقب آلي للنظام",
      ip: "127.0.0.1 (System Sentinel)",
    },
    agent: {
      ar: "وكيل الرقابة وكشف الاحتيال",
      en: "DeepSeek Audit Sentinel",
      model: "deepseek-chat",
      provider: "deepseek",
    },
    action: {
      ar: "اكتشاف تطابق وتكرار مشبوه في فاتورة مورد مزارع دينا PO-2289",
      en: "Detected suspicious duplicate invoice matching PO-2289 from Dina Farms",
    },
    category: "security",
    result: "flagged",
    severity: "critical",
    targetResource: "PO-2289",
    securityRationale: {
      ar: "المستند المرفوع يطابق بالكامل قيمة (18,900 ج.م) ورقم الإشعار المعتمد سابقاً بتاريخ 05-09-2026",
      en: "Duplicate detection: Document hash and total (18,900 EGP) exact match with bill paid on 2026-09-05",
    },
    durationMs: 140,
    payload: {
      detectedVendor: "SUPP-2012",
      claimedAmount: 18900,
      originalDocRef: "PO-2289-ORIGINAL",
      duplicateDocRef: "PO-2289-DUPLICATE-ATTEMPT",
      fingerprintConfidence: 0.994,
      actionTaken: "AUTOMATIC_PAYMENT_FREEZE",
      supervisorReviewRequired: true,
    },
  },
  {
    id: "aud-106",
    timestamp: "2026-09-09 14:15:30",
    actorType: "human",
    user: {
      ar: "م. حافظ رحيم",
      en: "Mr. Hafez Rahim",
      role: "المدير العام والمسؤول التقني",
      ip: "197.38.102.14 (HQ Administrator)",
    },
    action: {
      ar: "تعديل صلاحيات المستخدمين وتفعيل خيار إخفاء القائمة الجانبية",
      en: "Updated user management access rules and sidebar visibility preferences",
    },
    category: "settings",
    result: "success",
    severity: "medium",
    targetResource: "CONFIG_UI_PREFS",
    durationMs: 220,
    payload: {
      updatedUserId: "usr-2",
      changes: {
        sidebarVisible: false,
        allowedPages: ["/pos", "/orders", "/daily-cash"],
      },
      auditSignOff: "SYS_ADMIN_TOKEN_VERIFIED",
    },
  },
];

export function useAuditStore() {
  const [logs, setLogs] = useState<AuditEntry[]>(() => {
    if (typeof window === "undefined") return INITIAL_AUDIT_LOGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse audit logs", e);
    }
    return INITIAL_AUDIT_LOGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to save audit logs", e);
    }
  }, [logs]);

  const addAuditEntry = useCallback((entry: Omit<AuditEntry, "id" | "timestamp">) => {
    const newEntry: AuditEntry = {
      ...entry,
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    };
    setLogs((prev) => [newEntry, ...prev]);
    return newEntry;
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    addAuditEntry,
    clearLogs,
  };
}
