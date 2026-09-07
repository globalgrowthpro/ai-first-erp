import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "ar" | "en";

type Dict = Record<string, { ar: string; en: string }>;

export const dict: Dict = {
  appName: { ar: "حافظ ERP", en: "Hafez ERP" },
  appTag: { ar: "نظام إدارة موارد بطبقة ذكاء اصطناعي", en: "AI-First ERP Platform" },
  nav_dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  nav_ai: { ar: "مساحة الذكاء", en: "AI Workspace" },
  nav_sales: { ar: "المبيعات", en: "Sales" },
  nav_purchases: { ar: "المشتريات", en: "Purchases" },
  nav_accounting: { ar: "الحسابات", en: "Accounting" },
  nav_inventory: { ar: "المخزون", en: "Inventory" },
  nav_partners: { ar: "العملاء والموردون", en: "Customers & Suppliers" },
  nav_reports: { ar: "التقارير", en: "Reports" },
  nav_audit: { ar: "سجل التدقيق", en: "Audit Log" },
  nav_settings: { ar: "الإعدادات والصلاحيات", en: "Settings & Roles" },
  group_erp: { ar: "مساحة ERP", en: "ERP Workspace" },
  group_control: { ar: "الرقابة", en: "Control" },
  askAi: { ar: "اسأل الذكاء", en: "Ask AI" },
  lang: { ar: "English", en: "عربي" },
  company: { ar: "مجموعة النيل التجارية", en: "Nile Trading Group" },
  role_manager: { ar: "مدير عام", en: "General Manager" },
  today: { ar: "اليوم", en: "Today" },
  vsYesterday: { ar: "مقارنة بالأمس", en: "vs yesterday" },
  currency: { ar: "ج.م", en: "EGP" },
  kpi_sales: { ar: "مبيعات اليوم", en: "Today's Sales" },
  kpi_purchases: { ar: "مشتريات اليوم", en: "Today's Purchases" },
  kpi_cash: { ar: "النقدية", en: "Cash Position" },
  kpi_receivables: { ar: "أرصدة مدينة", en: "Receivables" },
  kpi_payables: { ar: "أرصدة دائنة", en: "Payables" },
  kpi_stockValue: { ar: "قيمة المخزون", en: "Inventory Value" },
  aiInsights: { ar: "ملاحظات حافظ", en: "Hafez Insights" },
  aiInsightsSub: {
    ar: "الأرقام من قاعدة البيانات، والتحليل من الذكاء الاصطناعي",
    en: "Numbers from the database, interpretation from AI",
  },
  pendingApprovals: { ar: "موافقات معلّقة", en: "Pending Approvals" },
  problems: { ar: "مشاكل تحتاج انتباه", en: "Issues Needing Attention" },
  salesTrend: { ar: "حركة المبيعات — 7 أيام", en: "Sales Trend — 7 days" },
  recentInvoices: { ar: "أحدث الفواتير", en: "Recent Invoices" },
  viewAll: { ar: "عرض الكل", en: "View all" },
  invoice: { ar: "فاتورة", en: "Invoice" },
  customer: { ar: "العميل", en: "Customer" },
  supplier: { ar: "المورد", en: "Supplier" },
  date: { ar: "التاريخ", en: "Date" },
  amount: { ar: "المبلغ", en: "Amount" },
  balance: { ar: "المتبقي", en: "Balance" },
  status: { ar: "الحالة", en: "Status" },
  paid: { ar: "مدفوعة", en: "Paid" },
  partial: { ar: "جزئية", en: "Partial" },
  overdue: { ar: "متأخرة", en: "Overdue" },
  draft: { ar: "مسودة", en: "Draft" },
  newInvoice: { ar: "فاتورة جديدة", en: "New Invoice" },
  search: { ar: "بحث…", en: "Search…" },
  quickReplies: { ar: "أوامر سريعة", en: "Quick Replies" },
  aiGreeting: {
    ar: "أنا حافظ، مدير العمليات الذكي. أقدر أجهّز الفواتير والمدفوعات والتقارير — والتنفيذ بعد تأكيدك.",
    en: "I'm Hafez, your AI operations manager. I can prepare invoices, payments and reports — execution only after you confirm.",
  },
  aiPlaceholder: {
    ar: "اكتب أمرك… مثال: اعمل فاتورة لأحمد محمد، 3 شاشات بـ 12 ألف",
    en: "Type a command… e.g. create an invoice for Ahmed, 3 screens at 12,000",
  },
  send: { ar: "إرسال", en: "Send" },
  confirm: { ar: "تأكيد التنفيذ", en: "Confirm" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  edit: { ar: "تعديل", en: "Edit" },
  pipeline: { ar: "مسار تنفيذ الأمر", en: "Command Pipeline" },
  permissionCheck: { ar: "فحص الصلاحيات", en: "Permission Check" },
  allowed: { ar: "مسموح", en: "Allowed" },
  denied: { ar: "مرفوض", en: "Denied" },
  agents: { ar: "الوكلاء", en: "Agents" },
  totalStock: { ar: "أصناف", en: "items" },
  lowStock: { ar: "تحت الحد الأدنى", en: "Below minimum" },
  sku: { ar: "الكود", en: "SKU" },
  product: { ar: "الصنف", en: "Product" },
  qty: { ar: "الكمية", en: "Qty" },
  min: { ar: "الحد الأدنى", en: "Min" },
  warehouse: { ar: "المخزن", en: "Warehouse" },
  value: { ar: "القيمة", en: "Value" },
  account: { ar: "الحساب", en: "Account" },
  debit: { ar: "مدين", en: "Debit" },
  credit: { ar: "دائن", en: "Credit" },
  journal: { ar: "قيود اليومية", en: "Journal Entries" },
  trialBalance: { ar: "ميزان المراجعة", en: "Trial Balance" },
  ceoReport: { ar: "تقرير المدير اليومي", en: "Daily CEO Report" },
  reportsSub: {
    ar: "تقارير مبنية على أرقام قاعدة البيانات مع تحليل الذكاء الاصطناعي",
    en: "Database-backed figures with an AI written analysis",
  },
  user: { ar: "المستخدم", en: "User" },
  agent: { ar: "الوكيل", en: "Agent" },
  action: { ar: "الإجراء", en: "Action" },
  time: { ar: "الوقت", en: "Time" },
  result: { ar: "النتيجة", en: "Result" },
  roles: { ar: "الأدوار", en: "Roles" },
  permissions: { ar: "الصلاحيات", en: "Permissions" },
  permissionMatrix: { ar: "مصفوفة الصلاحيات", en: "Permission Matrix" },
  highRisk: { ar: "عمليات تحتاج تأكيد إجباري", en: "Actions requiring confirmation" },
  purchaseOrders: { ar: "أوامر الشراء", en: "Purchase Orders" },
  partners: { ar: "العملاء والموردون", en: "Customers & Suppliers" },
  type: { ar: "النوع", en: "Type" },
  phone: { ar: "الهاتف", en: "Phone" },
  demoNote: {
    ar: "نموذج واجهة ببيانات تجريبية — لا توجد قاعدة بيانات متصلة بعد.",
    en: "Interface prototype with demo data — no database connected yet.",
  },
};

type Ctx = {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: (key: keyof typeof dict | string) => string;
  pick: (ar: string, en: string) => string;
  n: (value: number) => string;
  money: (value: number) => string;
  toggle: () => void;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");

  useEffect(() => {
    const saved = window.localStorage.getItem("erp-lang");
    if (saved === "ar" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    window.localStorage.setItem("erp-lang", lang);
  }, [lang]);

  const toggle = useCallback(() => setLang((l) => (l === "ar" ? "en" : "ar")), []);

  const value = useMemo<Ctx>(() => {
    const locale = lang === "ar" ? "ar-EG-u-nu-latn" : "en-US";
    return {
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      t: (key) => dict[key as string]?.[lang] ?? String(key),
      pick: (ar, en) => (lang === "ar" ? ar : en),
      n: (v) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v),
      money: (v) =>
        `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v)} ${
          lang === "ar" ? "ج.م" : "EGP"
        }`,
      toggle,
    };
  }, [lang, toggle]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
