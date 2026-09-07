export type Bi = { ar: string; en: string };

export const kpis = {
  sales: 258400,
  salesDelta: 12,
  purchases: 96200,
  purchasesDelta: -4,
  cash: 1148000,
  cashDelta: 3,
  receivables: 612500,
  receivablesDelta: 8,
  payables: 331000,
  payablesDelta: -6,
  stockValue: 2045000,
  stockDelta: 1,
  invoices: 87,
  customersServed: 63,
  avgInvoice: 2970,
};

export const salesTrend = [
  { day: { ar: "السبت", en: "Sat" }, sales: 182000, purchases: 74000 },
  { day: { ar: "الأحد", en: "Sun" }, sales: 205000, purchases: 61000 },
  { day: { ar: "الاثنين", en: "Mon" }, sales: 174000, purchases: 88000 },
  { day: { ar: "الثلاثاء", en: "Tue" }, sales: 231000, purchases: 70500 },
  { day: { ar: "الأربعاء", en: "Wed" }, sales: 219000, purchases: 92000 },
  { day: { ar: "الخميس", en: "Thu" }, sales: 230500, purchases: 81000 },
  { day: { ar: "الجمعة", en: "Fri" }, sales: 258400, purchases: 96200 },
];

export type InvoiceRow = {
  id: string;
  party: Bi;
  date: string;
  amount: number;
  balance: number;
  status: "paid" | "partial" | "overdue" | "draft";
};

export const invoices: InvoiceRow[] = [
  { id: "INV-10452", party: { ar: "أحمد محمد", en: "Ahmed Mohamed" }, date: "2026-09-07", amount: 36000, balance: 0, status: "paid" },
  { id: "INV-10451", party: { ar: "شركة ABC للتجارة", en: "ABC Trading Co." }, date: "2026-09-07", amount: 84500, balance: 24500, status: "partial" },
  { id: "INV-10450", party: { ar: "مؤسسة الدلتا", en: "Delta Establishment" }, date: "2026-09-06", amount: 19750, balance: 19750, status: "overdue" },
  { id: "INV-10449", party: { ar: "سما للإلكترونيات", en: "Sama Electronics" }, date: "2026-09-06", amount: 12400, balance: 0, status: "paid" },
  { id: "INV-10448", party: { ar: "محمود عبد الله", en: "Mahmoud Abdullah" }, date: "2026-09-05", amount: 5600, balance: 5600, status: "draft" },
  { id: "INV-10447", party: { ar: "النور للمقاولات", en: "Al Nour Contracting" }, date: "2026-09-05", amount: 141000, balance: 61000, status: "partial" },
];

export const purchaseOrders: InvoiceRow[] = [
  { id: "PO-2291", party: { ar: "مورد النيل للتوريدات", en: "Nile Supplies" }, date: "2026-09-07", amount: 45500, balance: 45500, status: "partial" },
  { id: "PO-2290", party: { ar: "الشرق للأجهزة", en: "Sharq Devices" }, date: "2026-09-06", amount: 25500, balance: 0, status: "paid" },
  { id: "PO-2289", party: { ar: "تكنو ميديا", en: "Techno Media" }, date: "2026-09-05", amount: 18900, balance: 18900, status: "overdue" },
  { id: "PO-2288", party: { ar: "مصر للتغليف", en: "Misr Packaging" }, date: "2026-09-04", amount: 6300, balance: 0, status: "paid" },
];

export const products = [
  { sku: "SCR-27-4K", name: { ar: "شاشة 27 بوصة 4K", en: 'Monitor 27" 4K' }, qty: 42, min: 15, warehouse: { ar: "المخزن الرئيسي", en: "Main Warehouse" }, price: 12000 },
  { sku: "LPT-I7-16", name: { ar: "لابتوب i7 / 16 جيجا", en: "Laptop i7 / 16GB" }, qty: 8, min: 10, warehouse: { ar: "المخزن الرئيسي", en: "Main Warehouse" }, price: 43000 },
  { sku: "PRN-LSR-A4", name: { ar: "طابعة ليزر A4", en: "Laser Printer A4" }, qty: 3, min: 6, warehouse: { ar: "فرع الجيزة", en: "Giza Branch" }, price: 9500 },
  { sku: "KBD-MEC", name: { ar: "كيبورد ميكانيكي", en: "Mechanical Keyboard" }, qty: 96, min: 25, warehouse: { ar: "فرع الجيزة", en: "Giza Branch" }, price: 2400 },
  { sku: "UPS-1500", name: { ar: "مانع انقطاع 1500VA", en: "UPS 1500VA" }, qty: 0, min: 5, warehouse: { ar: "المخزن الرئيسي", en: "Main Warehouse" }, price: 7800 },
  { sku: "CBL-HDMI", name: { ar: "كابل HDMI 2م", en: "HDMI Cable 2m" }, qty: 310, min: 60, warehouse: { ar: "المخزن الرئيسي", en: "Main Warehouse" }, price: 250 },
];

export const partners = [
  { code: "C-1042", name: { ar: "شركة ABC للتجارة", en: "ABC Trading Co." }, type: "customer" as const, phone: "+20 100 741 9344", balance: 24500 },
  { code: "C-1043", name: { ar: "أحمد محمد", en: "Ahmed Mohamed" }, type: "customer" as const, phone: "+20 122 555 8100", balance: 0 },
  { code: "C-1044", name: { ar: "النور للمقاولات", en: "Al Nour Contracting" }, type: "customer" as const, phone: "+20 111 903 4477", balance: 61000 },
  { code: "S-2011", name: { ar: "مورد النيل للتوريدات", en: "Nile Supplies" }, type: "supplier" as const, balance: 45500, phone: "+20 155 220 7788" },
  { code: "S-2012", name: { ar: "تكنو ميديا", en: "Techno Media" }, type: "supplier" as const, balance: 18900, phone: "+20 100 664 2211" },
];

export const journal = [
  { id: "JE-8841", date: "2026-09-07", account: { ar: "المدينون — أحمد محمد", en: "Receivables — Ahmed Mohamed" }, debit: 36000, credit: 0 },
  { id: "JE-8841", date: "2026-09-07", account: { ar: "إيرادات المبيعات", en: "Sales Revenue" }, debit: 0, credit: 31300 },
  { id: "JE-8841", date: "2026-09-07", account: { ar: "ضريبة القيمة المضافة", en: "VAT Payable" }, debit: 0, credit: 4700 },
  { id: "JE-8842", date: "2026-09-07", account: { ar: "النقدية بالخزينة", en: "Cash on Hand" }, debit: 20000, credit: 0 },
  { id: "JE-8842", date: "2026-09-07", account: { ar: "المدينون — شركة ABC", en: "Receivables — ABC" }, debit: 0, credit: 20000 },
];

export const trialBalance = [
  { account: { ar: "النقدية والبنوك", en: "Cash & Banks" }, debit: 1148000, credit: 0 },
  { account: { ar: "المدينون", en: "Accounts Receivable" }, debit: 612500, credit: 0 },
  { account: { ar: "المخزون", en: "Inventory" }, debit: 2045000, credit: 0 },
  { account: { ar: "الدائنون", en: "Accounts Payable" }, debit: 0, credit: 331000 },
  { account: { ar: "إيرادات المبيعات", en: "Sales Revenue" }, debit: 0, credit: 3180500 },
  { account: { ar: "تكلفة المبيعات", en: "Cost of Sales" }, debit: 1806000, credit: 0 },
  { account: { ar: "رأس المال", en: "Capital" }, debit: 0, credit: 2100000 },
];

export const auditLog = [
  { user: { ar: "أحمد سالم", en: "Ahmed Salem" }, agent: { ar: "وكيل المبيعات", en: "Sales Agent" }, action: { ar: "إنشاء فاتورة INV-10452", en: "Created invoice INV-10452" }, time: "18:32", ok: true },
  { user: { ar: "منى خليل", en: "Mona Khalil" }, agent: { ar: "وكيل الحسابات", en: "Finance Agent" }, action: { ar: "تسجيل دفعة 20,000 من ABC", en: "Recorded payment 20,000 from ABC" }, time: "18:05", ok: true },
  { user: { ar: "أحمد سالم", en: "Ahmed Salem" }, agent: { ar: "حافظ", en: "Hafez" }, action: { ar: "طلب تقرير الأرباح — الصلاحية مرفوضة", en: "Requested profit report — permission denied" }, time: "17:44", ok: false },
  { user: { ar: "طارق فؤاد", en: "Tarek Fouad" }, agent: { ar: "وكيل المخزون", en: "Inventory Agent" }, action: { ar: "تسوية مخزون UPS-1500", en: "Stock adjustment UPS-1500" }, time: "16:20", ok: true },
  { user: { ar: "وكيل المراجعة", en: "Audit Agent" }, agent: { ar: "وكيل المراجعة", en: "Audit Agent" }, action: { ar: "اكتشاف فاتورة مكررة PO-2289", en: "Detected duplicate invoice PO-2289" }, time: "15:58", ok: false },
];

export const issues = [
  { ar: "7 فواتير متأخرة عن موعد التحصيل", en: "7 invoices are past due" },
  { ar: "3 أصناف تحت الحد الأدنى للمخزون", en: "3 products below minimum stock" },
  { ar: "دفعة غير معتادة بقيمة 61,000 تحتاج مراجعة", en: "Unusual payment of 61,000 needs review" },
  { ar: "فاتورة مورد مكررة — PO-2289", en: "Duplicate supplier invoice — PO-2289" },
];

export const approvals = [
  { title: { ar: "أمر شراء 45,500 — مورد النيل", en: "Purchase order 45,500 — Nile Supplies" }, by: { ar: "طارق فؤاد", en: "Tarek Fouad" } },
  { title: { ar: "خصم 12% على فاتورة النور", en: "12% discount on Al Nour invoice" }, by: { ar: "أحمد سالم", en: "Ahmed Salem" } },
  { title: { ar: "تسوية مخزون سالب — UPS-1500", en: "Negative stock adjustment — UPS-1500" }, by: { ar: "منى خليل", en: "Mona Khalil" } },
];

export const insights = [
  { ar: "المبيعات أعلى 12% من أمس، مدفوعة بصنف الشاشات 4K.", en: "Sales are up 12% on yesterday, driven by 4K monitors." },
  { ar: "متوسط التحصيل ارتفع إلى 21 يوم — يحتاج متابعة.", en: "Average collection period rose to 21 days — needs follow-up." },
  { ar: "الهامش على اللابتوبات انخفض 3 نقاط بعد آخر أمر شراء.", en: "Laptop margin dropped 3 points after the last purchase order." },
];

export const agents = [
  { key: "hafez", name: { ar: "حافظ — المنسق", en: "Hafez — Orchestrator" }, jobs: 412, state: "active" as const },
  { key: "sales", name: { ar: "وكيل المبيعات", en: "Sales Agent" }, jobs: 168, state: "active" as const },
  { key: "finance", name: { ar: "وكيل الحسابات", en: "Finance Agent" }, jobs: 121, state: "active" as const },
  { key: "inventory", name: { ar: "وكيل المخزون", en: "Inventory Agent" }, jobs: 64, state: "active" as const },
  { key: "document", name: { ar: "وكيل المستندات", en: "Document Agent" }, jobs: 39, state: "active" as const },
  { key: "audit", name: { ar: "وكيل المراجعة", en: "Audit Agent" }, jobs: 27, state: "active" as const },
  { key: "reporting", name: { ar: "وكيل التقارير", en: "Reporting Agent" }, jobs: 18, state: "idle" as const },
];

export const quickReplies = [
  { ar: "فاتورة", en: "Invoice" },
  { ar: "دفعة", en: "Payment" },
  { ar: "عميل جديد", en: "New Customer" },
  { ar: "مورد", en: "Supplier" },
  { ar: "أمر شراء", en: "Purchase Order" },
  { ar: "قيد يومية", en: "Journal Entry" },
  { ar: "تحويل مخزون", en: "Stock Transfer" },
  { ar: "تقرير اليوم", en: "Daily Report" },
  { ar: "مصروف", en: "Expense" },
];

export const roles = [
  { key: { ar: "مدير عام", en: "Admin" }, users: 2 },
  { key: { ar: "مدير", en: "Manager" }, users: 4 },
  { key: { ar: "محاسب", en: "Accountant" }, users: 6 },
  { key: { ar: "مبيعات", en: "Sales" }, users: 11 },
  { key: { ar: "مشتريات", en: "Purchase" }, users: 3 },
  { key: { ar: "مخزن", en: "Warehouse" }, users: 5 },
  { key: { ar: "مراجع", en: "Auditor" }, users: 1 },
];

export const permissionMatrix = {
  columns: [
    { ar: "مدير", en: "Manager" },
    { ar: "محاسب", en: "Accountant" },
    { ar: "مبيعات", en: "Sales" },
    { ar: "مخزن", en: "Warehouse" },
  ],
  rows: [
    { perm: "invoice.create", allow: [true, true, true, false] },
    { perm: "invoice.delete", allow: [true, false, false, false] },
    { perm: "payment.create", allow: [true, true, false, false] },
    { perm: "profit.read", allow: [true, false, false, false] },
    { perm: "salary.read", allow: [true, false, false, false] },
    { perm: "stock.adjust", allow: [true, false, false, true] },
    { perm: "sales.read_own", allow: [true, true, true, false] },
  ],
};

export const highRiskActions = [
  { ar: "حذف فاتورة أو دفعة", en: "Delete invoice or payment" },
  { ar: "تعديل قيد محاسبي", en: "Change an accounting entry" },
  { ar: "دفعة كبيرة أو مرتجع", en: "Large payment or refund" },
  { ar: "تعديل راتب", en: "Change salary" },
  { ar: "إغلاق فترة محاسبية", en: "Close accounting period" },
  { ar: "تعديل الصلاحيات", en: "Change permissions" },
  { ar: "تصدير بيانات حساسة", en: "Export sensitive data" },
];
