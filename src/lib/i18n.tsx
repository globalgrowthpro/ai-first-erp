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
  notifications: { ar: "الإشعارات", en: "Notifications" },
  notificationsEmpty: { ar: "لا توجد إشعارات جديدة", en: "No new notifications" },
  markAllRead: { ar: "تحديد الكل كمقروء", en: "Mark all as read" },
  logout: { ar: "تسجيل الخروج", en: "Log Out" },
  logoutConfirm: { ar: "تأكيد تسجيل الخروج", en: "Confirm Log Out" },
  logoutDesc: { ar: "هل أنت متأكد من رغبتك في تسجيل الخروج من جلسة النظام؟", en: "Are you sure you want to end your current session?" },
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
  chartOfAccounts: { ar: "دليل الحسابات", en: "Chart of Accounts" },
  accountCode: { ar: "رقم الحساب", en: "Account Code" },
  accountName: { ar: "اسم الحساب", en: "Account Name" },
  accountType: { ar: "نوع الحساب", en: "Account Type" },
  parentAccount: { ar: "الحساب الرئيسي", en: "Parent Account" },
  newAccount: { ar: "إضافة حساب", en: "New Account" },
  expandAll: { ar: "توسيع الكل", en: "Expand All" },
  collapseAll: { ar: "طي الكل", en: "Collapse All" },
  allTypes: { ar: "جميع الأنواع", en: "All Types" },
  assets: { ar: "الأصول", en: "Assets" },
  liabilities: { ar: "الخصوم والالتزامات", en: "Liabilities" },
  equity: { ar: "حقوق الملكية", en: "Equity" },
  revenue: { ar: "الإيرادات", en: "Revenue" },
  expenses: { ar: "المصروفات والتكاليف", en: "Expenses" },
  normalBalance: { ar: "طبيعة الحساب", en: "Normal Balance" },
  currentBalance: { ar: "الرصيد الحالي", en: "Current Balance" },
  addSubAccount: { ar: "إضافة حساب فرعي", en: "Add Sub-account" },
  netIncome: { ar: "صافي الدخل", en: "Net Income" },
  totalAssets: { ar: "إجمالي الأصول", en: "Total Assets" },
  totalLiabilities: { ar: "إجمالي الخصوم", en: "Total Liabilities" },
  totalEquity: { ar: "إجمالي حقوق الملكية", en: "Total Equity" },
  searchAccounts: { ar: "بحث برقم أو اسم الحساب...", en: "Search by code or account name..." },
  active: { ar: "نشط", en: "Active" },
  save: { ar: "حفظ", en: "Save" },
  openingBalance: { ar: "الرصيد الافتتاحي", en: "Opening Balance" },
  accountNameAr: { ar: "الاسم بالعربية", en: "Arabic Name" },
  accountNameEn: { ar: "الاسم بالإنجليزية", en: "English Name" },
  selectParent: { ar: "اختر الحساب الرئيسي (اختياري)", en: "Select Parent Account (Optional)" },
  level: { ar: "المستوى", en: "Level" },
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
  companyBranding: { ar: "بيانات الشركة وتخصيص الفواتير", en: "Company & Document Branding" },
  companyProfile: { ar: "ملف الشركة", en: "Company Profile" },
  companyNameAr: { ar: "اسم الشركة (عربي)", en: "Company Name (Arabic)" },
  companyNameEn: { ar: "اسم الشركة (إنجليزي)", en: "Company Name (English)" },
  taxNumber: { ar: "الرقم الضريبي", en: "Tax Registration No." },
  commercialRegister: { ar: "السجل التجاري", en: "Commercial Register" },
  website: { ar: "الموقع الإلكتروني", en: "Website" },
  addressAr: { ar: "العنوان (عربي)", en: "Address (Arabic)" },
  addressEn: { ar: "العنوان (إنجليزي)", en: "Address (English)" },
  colorPalette: { ar: "لوحة الألوان والهوية", en: "Color Palette & Identity" },
  primaryColor: { ar: "اللون الرئيسي", en: "Primary Color" },
  accentColor: { ar: "لون التمييز / الإضافي", en: "Accent Color" },
  themePresets: { ar: "قوالب ألوان جاهزة", en: "Theme Presets" },
  documentBranding: { ar: "تنسيق الفواتير وسندات الصرف", en: "Invoices & Bills Branding" },
  companyLogo: { ar: "شعار الشركة", en: "Company Logo" },
  uploadLogo: { ar: "رفع شعار جديد", en: "Upload New Logo" },
  removeLogo: { ar: "إزالة الشعار", en: "Remove Logo" },
  headerTitleAr: { ar: "عنوان الترويسة (عربي)", en: "Header Title (Arabic)" },
  headerTitleEn: { ar: "عنوان الترويسة (إنجليزي)", en: "Header Title (English)" },
  invoiceSubtitleAr: { ar: "وصف الفاتورة (عربي)", en: "Invoice Subtitle (Arabic)" },
  invoiceSubtitleEn: { ar: "وصف الفاتورة (إنجليزي)", en: "Invoice Subtitle (English)" },
  billSubtitleAr: { ar: "وصف أمر الشراء (عربي)", en: "Bill Subtitle (Arabic)" },
  billSubtitleEn: { ar: "وصف أمر الشراء (إنجليزي)", en: "Bill Subtitle (English)" },
  headerLayout: { ar: "موضع الشعار بالترويسة", en: "Header Logo Alignment" },
  logoStart: { ar: "الشعار في البداية", en: "Logo at Start" },
  logoEnd: { ar: "الشعار في النهاية", en: "Logo at End" },
  logoCenter: { ar: "الشعار في المنتصف", en: "Logo Centered" },
  footerNotes: { ar: "ملاحظات التذييل والشروط", en: "Footer Notes & Terms" },
  footerNotesAr: { ar: "ملاحظات التذييل (عربي)", en: "Footer Notes (Arabic)" },
  footerNotesEn: { ar: "ملاحظات التذييل (إنجليزي)", en: "Footer Notes (English)" },
  bankDetails: { ar: "البيانات البنكية وطرق الدفع", en: "Bank & Payment Details" },
  showTaxQr: { ar: "إظهار رمز الاستجابة السريعة (QR للفوترة الإلكترونية)", en: "Show E-Invoicing QR Code" },
  showSignature: { ar: "إظهار خانة الاعتماد والختم الرسمي", en: "Show Authorized Signature & Stamp" },
  livePreview: { ar: "معاينة حية ومباشرة", en: "Live Document Preview" },
  previewInvoice: { ar: "فاتورة مبيعات", en: "Sales Invoice" },
  previewBill: { ar: "فاتورة مشتريات / أمر توريد", en: "Vendor Bill / PO" },
  resetDefaults: { ar: "استعادة الافتراضي", en: "Reset Defaults" },
  settingsSaved: { ar: "تم حفظ الإعدادات بنجاح!", en: "Settings saved successfully!" },
  partners: { ar: "العملاء والموردون", en: "Customers & Suppliers" },
  type: { ar: "النوع", en: "Type" },
  phone: { ar: "الهاتف", en: "Phone" },
  users: { ar: "المستخدمون", en: "Users" },
  departments: { ar: "الأقسام والإدارات", en: "Departments" },
  positions: { ar: "المسميات الوظيفية", en: "Job Positions" },
  allowedPages: { ar: "الصفحات المصرح بها", en: "Allowed Pages" },
  allowedActions: { ar: "الإجراءات المسموح بها", en: "Allowed Actions" },
  addUser: { ar: "إضافة مستخدم جديد", en: "Add New User" },
  addDepartment: { ar: "إضافة قسم جديد", en: "Add Department" },
  addPosition: { ar: "إضافة مسمى وظيفي", en: "Add Job Position" },
  aiModules: { ar: "وكلاء وموديلات الذكاء", en: "AI Modules & Agents" },
  nav_ai_modules: { ar: "وكلاء الذكاء", en: "AI Modules" },
  addAiModule: { ar: "إضافة وكيل ذكاء جديد", en: "Add AI Module" },
  workOnAsAgent: { ar: "العمل كوكيل متخصص", en: "Work On As Agent" },
  apiKey: { ar: "مفتاح الربط (API Key)", en: "API Key" },
  provider: { ar: "مزود الذكاء", en: "AI Provider" },
  model: { ar: "النموذج", en: "Model" },
  systemPrompt: { ar: "التعليمات التأسيسية للوكيل", en: "Agent System Prompt" },
  allowedTools: { ar: "الأدوات والصلاحيات الذكية", en: "Allowed Agent Tools" },
  testAgent: { ar: "اختبار وتجربة الوكيل", en: "Test Agent Sandbox" },
  agentRole: { ar: "دور واختصاص الوكيل", en: "Agent Specialty Role" },
  usersAndOrg: { ar: "المستخدمون والهيكل الإداري", en: "Users & Organization" },
  rolesAndSecurity: { ar: "الصلاحيات ومصفوفة الأمان", en: "Roles & Security" },
  productsTab: { ar: "الأصناف والمنتجات", en: "Products & Stock" },
  categoriesTab: { ar: "التصنيفات", en: "Categories" },
  warehousesTab: { ar: "المخازن والفروع", en: "Warehouses & Facilities" },
  unitsTab: { ar: "وحدات القياس", en: "Units of Measure" },
  bomTab: { ar: "بطاقات الإنتاج والوصفات (BOM)", en: "Bill of Materials (BOM)" },
  addProduct: { ar: "إضافة صنف جديد", en: "Add Product" },
  addCategory: { ar: "إضافة تصنيف جديد", en: "Add Category" },
  addWarehouse: { ar: "إضافة مخزن / فرع", en: "Add Facility" },
  addUnit: { ar: "إضافة وحدة قياس", en: "Add Unit of Measure" },
  addBom: { ar: "إنشاء وصفة إنتاج (BOM)", en: "Create Recipe (BOM)" },
  costPrice: { ar: "سعر التكلفة", en: "Cost Price" },
  sellingPrice: { ar: "سعر البيع", en: "Selling Price" },
  profitMargin: { ar: "هامش الربح", en: "Profit Margin" },
  reorderLimit: { ar: "الحد الأدنى للأمان", en: "Reorder Limit" },
  batchYield: { ar: "حجم الدفعة المنتجة", en: "Batch Yield" },
  overheadCost: { ar: "تكاليف تشغيل وعمالة", en: "Overhead & Labor" },
  materialCost: { ar: "تكلفة الخامات الإجمالية", en: "Material Cost" },
  unitCost: { ar: "تكلفة القطعة / الطبق", en: "Unit Cost" },
  addIngredient: { ar: "إضافة مادة خام / مكون", en: "Add Ingredient" },
  recipeDetails: { ar: "تفاصيل الوصفة وتوزيع التكلفة", en: "Recipe Details & Costing" },
  deleteConfirmTitle: { ar: "تأكيد الحذف", en: "Confirm Deletion" },
  deleteConfirmMsg: {
    ar: "هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذه العملية.",
    en: "Are you sure you want to delete this item? This action cannot be undone.",
  },
  rawMaterials: { ar: "مواد خام", en: "Raw Materials" },
  finishedProducts: { ar: "منتجات تامة الصنع", en: "Finished Goods" },
  packaging: { ar: "عبوات وتغليف", en: "Packaging" },
  semiFinished: { ar: "منتجات نصف مصنعة", en: "Semi-Finished" },
  baseUnit: { ar: "وحدة أساسية", en: "Base Unit" },
  conversionFactor: { ar: "معامل التحويل", en: "Conversion Ratio" },
  capacity: { ar: "السعة التخزينية", en: "Storage Capacity" },
  demoNote: {
    ar: "نموذج واجهة ببيانات تجريبية — لا توجد قاعدة بيانات متصلة بعد.",
    en: "Interface prototype with demo data — no database connected yet.",
  },
};

type Ctx = {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: (key: keyof typeof dict | string) => string;
  pick: (arOrObj: string | { ar: string; en: string }, en?: string) => string;
  n: (value: number, opts?: Intl.NumberFormatOptions) => string;
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
      pick: (arOrObj, en) => {
        if (typeof arOrObj === "object" && arOrObj !== null) {
          return lang === "ar" ? arOrObj.ar : arOrObj.en;
        }
        return lang === "ar" ? arOrObj : (en ?? arOrObj);
      },
      n: (v, opts) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits: 0, ...opts }).format(v),
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
