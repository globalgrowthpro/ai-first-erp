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
  { id: "INV-10452", party: { ar: "فندق الماسة — توريد حلويات حفلات", en: "Al-Masa Hotel — Catering Order" }, date: "2026-09-07", amount: 36000, balance: 0, status: "paid" },
  { id: "INV-10451", party: { ar: "سلسلة مطاعم وكافيهات سيزار", en: "Cesar Restaurant & Cafe Chain" }, date: "2026-09-07", amount: 84500, balance: 24500, status: "partial" },
  { id: "INV-10450", party: { ar: "مؤسسة لوسيل لتنظيم المناسبات", en: "Lusail Events & Catering" }, date: "2026-09-06", amount: 19750, balance: 19750, status: "overdue" },
  { id: "INV-10449", party: { ar: "شركة الشرق للمؤتمرات والمعارض", en: "Sharq Conferences & Exhibitions" }, date: "2026-09-06", amount: 12400, balance: 0, status: "paid" },
  { id: "INV-10448", party: { ar: "المهندس محمود عبد الله — حفل خاص", en: "Mahmoud Abdullah — Private Event" }, date: "2026-09-05", amount: 5600, balance: 5600, status: "draft" },
  { id: "INV-10447", party: { ar: "نادي الجزيرة الرياضي — بوفيه حلويات", en: "Gezira Sporting Club — Desserts Buffet" }, date: "2026-09-05", amount: 141000, balance: 61000, status: "partial" },
];

export const purchaseOrders: InvoiceRow[] = [
  { id: "PO-2291", party: { ar: "شركة فيريرو مصر — توريد نوتيلا 15 كجم", en: "Ferrero Egypt — Nutella Tubs 15kg" }, date: "2026-09-07", amount: 45500, balance: 45500, status: "partial" },
  { id: "PO-2290", party: { ar: "مطاحن ومضارب الدلتا — أرز وسكر نقي", en: "Delta Mills — Premium Rice & Sugar" }, date: "2026-09-06", amount: 25500, balance: 0, status: "paid" },
  { id: "PO-2289", party: { ar: "مزارع دينا — حليب طازج وقشطة بلدي", en: "Dina Farms — Fresh Milk & Clotted Cream" }, date: "2026-09-05", amount: 18900, balance: 18900, status: "overdue" },
  { id: "PO-2288", party: { ar: "شركة الأهرام للكرتون وعبوات التغليف", en: "Al-Ahram Packaging & Containers" }, date: "2026-09-04", amount: 6300, balance: 0, status: "paid" },
];

export interface ProductItem {
  sku: string;
  name: { ar: string; en: string };
  category: { ar: string; en: string };
  qty: number;
  min: number;
  warehouse: { ar: string; en: string };
  price: number;
}

export const products: ProductItem[] = [
  // عشاق الرز
  { sku: "RICE-NUT", name: { ar: "رز بلبن نوتيلا", en: "Rice Pudding Nutella" }, category: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 120, min: 30, warehouse: { ar: "فرع مصر الجديدة", en: "Heliopolis Branch" }, price: 50 },
  { sku: "RICE-NUTS", name: { ar: "رز بلبن مكسرات", en: "Rice Pudding Mixed Nuts" }, category: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 85, min: 25, warehouse: { ar: "المطبخ المركزي", en: "Central Kitchen" }, price: 55 },
  { sku: "RICE-LOT", name: { ar: "رز بلبن لوتس", en: "Rice Pudding Lotus" }, category: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 95, min: 25, warehouse: { ar: "فرع المعادي", en: "Maadi Branch" }, price: 55 },
  { sku: "RICE-PST", name: { ar: "رز بلبن بستاشيو", en: "Rice Pudding Pistachio" }, category: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 60, min: 20, warehouse: { ar: "فرع التجمع", en: "Tagamoa Branch" }, price: 80 },
  { sku: "RICE-WZR", name: { ar: "رز بلبن الوزير", en: "Rice Pudding Al-Wazeer" }, category: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 75, min: 25, warehouse: { ar: "فرع مصر الجديدة", en: "Heliopolis Branch" }, price: 80 },
  { sku: "RICE-PLN", name: { ar: "رز بلبن ساده", en: "Plain Rice Pudding" }, category: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 180, min: 40, warehouse: { ar: "المطبخ المركزي", en: "Central Kitchen" }, price: 25 },

  // الفتة
  { sku: "FAT-WZR", name: { ar: "فتة ميكس الوزير", en: "Fatta Mix Al-Wazeer" }, category: { ar: "الفتة", en: "Fatta" }, qty: 45, min: 15, warehouse: { ar: "فرع مصر الجديدة", en: "Heliopolis Branch" }, price: 90 },
  { sku: "FAT-NUT", name: { ar: "فتة نوتيلا", en: "Fatta Nutella" }, category: { ar: "الفتة", en: "Fatta" }, qty: 50, min: 15, warehouse: { ar: "فرع المعادي", en: "Maadi Branch" }, price: 90 },
  { sku: "FAT-MNG", name: { ar: "فتة مانجا", en: "Fatta Mango" }, category: { ar: "الفتة", en: "Fatta" }, qty: 38, min: 15, warehouse: { ar: "فرع التجمع", en: "Tagamoa Branch" }, price: 90 },
  { sku: "FAT-PST", name: { ar: "فتة بستاشيو", en: "Fatta Pistachio" }, category: { ar: "الفتة", en: "Fatta" }, qty: 8, min: 15, warehouse: { ar: "المطبخ المركزي", en: "Central Kitchen" }, price: 95 },

  // دنيا الدلع والملوخيتو
  { sku: "MDL-MNG", name: { ar: "مدلعة مانجو", en: "Medala'a Mango" }, category: { ar: "دنيا الدلع", en: "Specialties" }, qty: 65, min: 20, warehouse: { ar: "فرع مصر الجديدة", en: "Heliopolis Branch" }, price: 75 },
  { sku: "MDL-CRM", name: { ar: "مدلعة كراميل", en: "Medala'a Caramel" }, category: { ar: "دنيا الدلع", en: "Specialties" }, qty: 70, min: 20, warehouse: { ar: "المطبخ المركزي", en: "Central Kitchen" }, price: 65 },
  { sku: "MLK-WZR", name: { ar: "ملوخيتو سلانكاتية وزير", en: "Molokhito Wazeer" }, category: { ar: "دنيا الدلع", en: "Specialties" }, qty: 6, min: 15, warehouse: { ar: "المطبخ المركزي", en: "Central Kitchen" }, price: 95 },
  { sku: "MLK-NUT", name: { ar: "ملوخيتو نوتيلا", en: "Molokhito Nutella" }, category: { ar: "دنيا الدلع", en: "Specialties" }, qty: 42, min: 15, warehouse: { ar: "فرع المعادي", en: "Maadi Branch" }, price: 95 },

  // الطواجن
  { sku: "TJ-ALI", name: { ar: "طاجن ام علي قشطة مكسرات", en: "Om Ali Cream & Nuts" }, category: { ar: "الطواجن", en: "Hot Tajins" }, qty: 90, min: 25, warehouse: { ar: "فرع مصر الجديدة", en: "Heliopolis Branch" }, price: 70 },
  { sku: "TJ-NUT", name: { ar: "طاجن نوتيلا", en: "Tajin Nutella" }, category: { ar: "الطواجن", en: "Hot Tajins" }, qty: 70, min: 20, warehouse: { ar: "المطبخ المركزي", en: "Central Kitchen" }, price: 55 },

  // شاورما الوزير
  { sku: "SHW-NUT", name: { ar: "شاورما نوتيلا", en: "Sweet Shawarma Nutella" }, category: { ar: "شاورما الوزير", en: "Sweet Shawarma" }, qty: 4, min: 12, warehouse: { ar: "فرع مصر الجديدة", en: "Heliopolis Branch" }, price: 115 },
  { sku: "SHW-MIX", name: { ar: "شاورما ميكس", en: "Sweet Shawarma Mix" }, category: { ar: "شاورما الوزير", en: "Sweet Shawarma" }, qty: 20, min: 10, warehouse: { ar: "فرع المعادي", en: "Maadi Branch" }, price: 125 },
  { sku: "SHW-PST", name: { ar: "شاورما بستاشيو", en: "Sweet Shawarma Pistachio" }, category: { ar: "شاورما الوزير", en: "Sweet Shawarma" }, qty: 18, min: 10, warehouse: { ar: "فرع التجمع", en: "Tagamoa Branch" }, price: 130 },

  // كيك وتشييز
  { sku: "CK-LND-KND", name: { ar: "كيكة لندن كيندر", en: "London Cake Kinder" }, category: { ar: "كيك وتشييز", en: "Cakes & Sweets" }, qty: 30, min: 10, warehouse: { ar: "المطبخ المركزي", en: "Central Kitchen" }, price: 125 },
  { sku: "CK-LND-NUT", name: { ar: "كيكة لندن نوتيلا", en: "London Cake Nutella" }, category: { ar: "كيك وتشييز", en: "Cakes & Sweets" }, qty: 28, min: 10, warehouse: { ar: "فرع المعادي", en: "Maadi Branch" }, price: 125 },
  { sku: "CHZ-PST", name: { ar: "تشيز طاخ بستاشيو", en: "Cheesecake Takh Pistachio" }, category: { ar: "كيك وتشييز", en: "Cakes & Sweets" }, qty: 32, min: 10, warehouse: { ar: "فرع مصر الجديدة", en: "Heliopolis Branch" }, price: 95 },

  // كشري الحلو
  { sku: "KSHR-LUX", name: { ar: "كشري حلو سوبر لوكس", en: "Sweet Koshary Super Luxe" }, category: { ar: "كشري الحلو", en: "Sweet Koshary" }, qty: 64, min: 20, warehouse: { ar: "فرع مصر الجديدة", en: "Heliopolis Branch" }, price: 100 },
  { sku: "KSHR-KND", name: { ar: "كشري حلو كيندر", en: "Sweet Koshary Kinder" }, category: { ar: "كشري الحلو", en: "Sweet Koshary" }, qty: 115, min: 30, warehouse: { ar: "المطبخ المركزي", en: "Central Kitchen" }, price: 80 },
  { sku: "KSHR-PST", name: { ar: "كشري حلو بستاشيو", en: "Sweet Koshary Pistachio" }, category: { ar: "كشري الحلو", en: "Sweet Koshary" }, qty: 58, min: 20, warehouse: { ar: "فرع التجمع", en: "Tagamoa Branch" }, price: 95 },
  { sku: "KSHR-NUT", name: { ar: "كشري حلو نوتيلا", en: "Sweet Koshary Nutella" }, category: { ar: "كشري الحلو", en: "Sweet Koshary" }, qty: 88, min: 25, warehouse: { ar: "فرع المعادي", en: "Maadi Branch" }, price: 75 },
  { sku: "KSHR-WZR", name: { ar: "كشري حلو ميكس الوزير", en: "Sweet Koshary Mix Al-Wazeer" }, category: { ar: "كشري الحلو", en: "Sweet Koshary" }, qty: 70, min: 20, warehouse: { ar: "المطبخ المركزي", en: "Central Kitchen" }, price: 80 },

  // القشطوطة
  { sku: "KSH-PST", name: { ar: "قشطوطة بستاشيو", en: "Kashtouta Pistachio" }, category: { ar: "القشطوطة", en: "Kashtouta" }, qty: 85, min: 20, warehouse: { ar: "فرع مصر الجديدة", en: "Heliopolis Branch" }, price: 90 },
  { sku: "KSH-MSR", name: { ar: "قشطوطة مصر الجديدة", en: "Kashtouta Masr El-Gedida" }, category: { ar: "القشطوطة", en: "Kashtouta" }, qty: 110, min: 25, warehouse: { ar: "المطبخ المركزي", en: "Central Kitchen" }, price: 85 },
  { sku: "KSH-NUT", name: { ar: "قشطوطة نوتيلا", en: "Kashtouta Nutella" }, category: { ar: "القشطوطة", en: "Kashtouta" }, qty: 95, min: 20, warehouse: { ar: "فرع المعادي", en: "Maadi Branch" }, price: 80 },
  { sku: "KSH-MNG", name: { ar: "قشطوطة مانجو", en: "Kashtouta Mango" }, category: { ar: "القشطوطة", en: "Kashtouta" }, qty: 92, min: 20, warehouse: { ar: "فرع التجمع", en: "Tagamoa Branch" }, price: 80 },
  { sku: "KSH-RIC-NUT", name: { ar: "قشطوطة أرز باللبن نوتيلا", en: "Kashtouta Rice Pudding Nutella" }, category: { ar: "القشطوطة", en: "Kashtouta" }, qty: 74, min: 20, warehouse: { ar: "فرع مصر الجديدة", en: "Heliopolis Branch" }, price: 80 },
  { sku: "KSH-RIC-PST", name: { ar: "قشطوطة أرز باللبن بستاشيو", en: "Kashtouta Rice Pudding Pistachio" }, category: { ar: "القشطوطة", en: "Kashtouta" }, qty: 55, min: 15, warehouse: { ar: "المطبخ المركزي", en: "Central Kitchen" }, price: 95 },
];

export const partners = [
  { code: "C-1042", name: { ar: "فندق الماسة", en: "Al-Masa Hotel" }, type: "customer" as const, phone: "+20 100 741 9344", balance: 24500 },
  { code: "C-1043", name: { ar: "مطاعم وكافيهات سيزار", en: "Cesar Restaurants" }, type: "customer" as const, phone: "+20 122 555 8100", balance: 0 },
  { code: "C-1044", name: { ar: "نادي الجزيرة الرياضي", en: "Gezira Sporting Club" }, type: "customer" as const, phone: "+20 111 903 4477", balance: 61000 },
  { code: "S-2011", name: { ar: "شركة فيريرو مصر (نوتيلا)", en: "Ferrero Egypt (Nutella)" }, type: "supplier" as const, balance: 45500, phone: "+20 155 220 7788" },
  { code: "S-2012", name: { ar: "مزارع دينا للألبان", en: "Dina Farms Dairy" }, type: "supplier" as const, balance: 18900, phone: "+20 100 664 2211" },
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

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type NormalBalance = "debit" | "credit";

export interface AccountItem {
  code: string;
  name: { ar: string; en: string };
  type: AccountType;
  normalBalance: NormalBalance;
  balance: number;
  parentId?: string | undefined;
  level: number;
  isParent?: boolean | undefined;
  status: "active" | "inactive";
  description?: { ar: string; en: string } | undefined;
}

export const chartOfAccounts: AccountItem[] = [
  // 1000 Assets
  {
    code: "1000",
    name: { ar: "الأصول", en: "Assets" },
    type: "asset",
    normalBalance: "debit",
    balance: 4160500,
    level: 1,
    isParent: true,
    status: "active",
  },
  {
    code: "1100",
    name: { ar: "الأصول المتداولة", en: "Current Assets" },
    type: "asset",
    normalBalance: "debit",
    balance: 3845500,
    parentId: "1000",
    level: 2,
    isParent: true,
    status: "active",
  },
  {
    code: "1110",
    name: { ar: "النقدية وما في حكمها", en: "Cash & Cash Equivalents" },
    type: "asset",
    normalBalance: "debit",
    balance: 1148000,
    parentId: "1100",
    level: 3,
    isParent: true,
    status: "active",
  },
  {
    code: "1111",
    name: { ar: "الخزينة النقدية الرئيسية", en: "Main Cash Safe" },
    type: "asset",
    normalBalance: "debit",
    balance: 148000,
    parentId: "1110",
    level: 4,
    status: "active",
  },
  {
    code: "1112",
    name: { ar: "حساب البنك التجاري الدولي (CIB)", en: "CIB Bank Account" },
    type: "asset",
    normalBalance: "debit",
    balance: 750000,
    parentId: "1110",
    level: 4,
    status: "active",
  },
  {
    code: "1113",
    name: { ar: "حساب البنك الأهلي المصري (NBE)", en: "NBE Bank Account" },
    type: "asset",
    normalBalance: "debit",
    balance: 250000,
    parentId: "1110",
    level: 4,
    status: "active",
  },
  {
    code: "1120",
    name: { ar: "العملاء وأوراق القبض", en: "Receivables & Notes" },
    type: "asset",
    normalBalance: "debit",
    balance: 612500,
    parentId: "1100",
    level: 3,
    isParent: true,
    status: "active",
  },
  {
    code: "1121",
    name: { ar: "العملاء التجاريون", en: "Trade Receivables" },
    type: "asset",
    normalBalance: "debit",
    balance: 588000,
    parentId: "1120",
    level: 4,
    status: "active",
  },
  {
    code: "1122",
    name: { ar: "أوراق القبض", en: "Notes Receivable" },
    type: "asset",
    normalBalance: "debit",
    balance: 24500,
    parentId: "1120",
    level: 4,
    status: "active",
  },
  {
    code: "1130",
    name: { ar: "المخزون السلعي", en: "Merchandise Inventory" },
    type: "asset",
    normalBalance: "debit",
    balance: 2045000,
    parentId: "1100",
    level: 3,
    isParent: true,
    status: "active",
  },
  {
    code: "1131",
    name: { ar: "مخزون بضاعة بغرض البيع", en: "Finished Goods Inventory" },
    type: "asset",
    normalBalance: "debit",
    balance: 2045000,
    parentId: "1130",
    level: 4,
    status: "active",
  },
  {
    code: "1140",
    name: { ar: "أرصدة مدينة ومصروفات مدفوعة مقدماً", en: "Prepaid Expenses & Other Receivables" },
    type: "asset",
    normalBalance: "debit",
    balance: 40000,
    parentId: "1100",
    level: 3,
    status: "active",
  },
  {
    code: "1200",
    name: { ar: "الأصول الثابتة وغير المتداولة", en: "Fixed & Non-Current Assets" },
    type: "asset",
    normalBalance: "debit",
    balance: 315000,
    parentId: "1000",
    level: 2,
    isParent: true,
    status: "active",
  },
  {
    code: "1210",
    name: { ar: "أجهزة تكنولوجيا ومعدات مكتبية", en: "IT & Office Equipment" },
    type: "asset",
    normalBalance: "debit",
    balance: 380000,
    parentId: "1200",
    level: 3,
    status: "active",
  },
  {
    code: "1220",
    name: { ar: "مجمع إهلاك الأصول الثابتة", en: "Accumulated Depreciation" },
    type: "asset",
    normalBalance: "credit",
    balance: -65000,
    parentId: "1200",
    level: 3,
    status: "active",
  },

  // 2000 Liabilities
  {
    code: "2000",
    name: { ar: "الخصوم والالتزامات", en: "Liabilities" },
    type: "liability",
    normalBalance: "credit",
    balance: 543500,
    level: 1,
    isParent: true,
    status: "active",
  },
  {
    code: "2100",
    name: { ar: "الالتزامات المتداولة", en: "Current Liabilities" },
    type: "liability",
    normalBalance: "credit",
    balance: 543500,
    parentId: "2000",
    level: 2,
    isParent: true,
    status: "active",
  },
  {
    code: "2110",
    name: { ar: "الموردون وأوراق الدفع", en: "Accounts Payable & Notes" },
    type: "liability",
    normalBalance: "credit",
    balance: 331000,
    parentId: "2100",
    level: 3,
    isParent: true,
    status: "active",
  },
  {
    code: "2111",
    name: { ar: "الموردون التجاريون", en: "Trade Payables" },
    type: "liability",
    normalBalance: "credit",
    balance: 285500,
    parentId: "2110",
    level: 4,
    status: "active",
  },
  {
    code: "2112",
    name: { ar: "أوراق الدفع", en: "Notes Payable" },
    type: "liability",
    normalBalance: "credit",
    balance: 45500,
    parentId: "2110",
    level: 4,
    status: "active",
  },
  {
    code: "2120",
    name: { ar: "ضريبة القيمة المضافة المستحقة", en: "VAT Payable" },
    type: "liability",
    normalBalance: "credit",
    balance: 114000,
    parentId: "2100",
    level: 3,
    status: "active",
  },
  {
    code: "2130",
    name: { ar: "مستحقات ومصروفات تشغيل مستحقة", en: "Accrued Expenses & Payroll" },
    type: "liability",
    normalBalance: "credit",
    balance: 98500,
    parentId: "2100",
    level: 3,
    status: "active",
  },

  // 3000 Equity
  {
    code: "3000",
    name: { ar: "حقوق الملكية", en: "Equity" },
    type: "equity",
    normalBalance: "credit",
    balance: 3679000,
    level: 1,
    isParent: true,
    status: "active",
  },
  {
    code: "3100",
    name: { ar: "رأس المال المدفوع", en: "Paid-in Capital" },
    type: "equity",
    normalBalance: "credit",
    balance: 2100000,
    parentId: "3000",
    level: 2,
    status: "active",
  },
  {
    code: "3200",
    name: { ar: "الأرباح المرحلة والمحتجزة", en: "Retained Earnings" },
    type: "equity",
    normalBalance: "credit",
    balance: 756500,
    parentId: "3000",
    level: 2,
    status: "active",
  },
  {
    code: "3300",
    name: { ar: "صافي أرباح الفترة الحالية", en: "Current Period Net Profit" },
    type: "equity",
    normalBalance: "credit",
    balance: 822500,
    parentId: "3000",
    level: 2,
    status: "active",
  },

  // 4000 Revenue
  {
    code: "4000",
    name: { ar: "الإيرادات", en: "Revenue" },
    type: "revenue",
    normalBalance: "credit",
    balance: 3228500,
    level: 1,
    isParent: true,
    status: "active",
  },
  {
    code: "4100",
    name: { ar: "إيرادات المبيعات والخدمات", en: "Sales & Service Revenue" },
    type: "revenue",
    normalBalance: "credit",
    balance: 3180500,
    parentId: "4000",
    level: 2,
    isParent: true,
    status: "active",
  },
  {
    code: "4110",
    name: { ar: "مبيعات السوق المحلي", en: "Domestic Sales" },
    type: "revenue",
    normalBalance: "credit",
    balance: 2850000,
    parentId: "4100",
    level: 3,
    status: "active",
  },
  {
    code: "4120",
    name: { ar: "مبيعات التصدير", en: "Export Sales" },
    type: "revenue",
    normalBalance: "credit",
    balance: 330500,
    parentId: "4100",
    level: 3,
    status: "active",
  },
  {
    code: "4200",
    name: { ar: "إيرادات وعوائد تشغيلية أخرى", en: "Other Operating Revenue" },
    type: "revenue",
    normalBalance: "credit",
    balance: 48000,
    parentId: "4000",
    level: 2,
    status: "active",
  },

  // 5000 Expenses
  {
    code: "5000",
    name: { ar: "المصروفات والتكاليف", en: "Expenses" },
    type: "expense",
    normalBalance: "debit",
    balance: 2348000,
    level: 1,
    isParent: true,
    status: "active",
  },
  {
    code: "5100",
    name: { ar: "تكلفة البضاعة المباعة (COGS)", en: "Cost of Goods Sold" },
    type: "expense",
    normalBalance: "debit",
    balance: 1806000,
    parentId: "5000",
    level: 2,
    status: "active",
  },
  {
    code: "5200",
    name: { ar: "المصروفات العمومية والتشغيلية", en: "General & Operating Expenses" },
    type: "expense",
    normalBalance: "debit",
    balance: 542000,
    parentId: "5000",
    level: 2,
    isParent: true,
    status: "active",
  },
  {
    code: "5210",
    name: { ar: "رواتب ومستحقات العاملين", en: "Salaries & Employee Benefits" },
    type: "expense",
    normalBalance: "debit",
    balance: 340000,
    parentId: "5200",
    level: 3,
    status: "active",
  },
  {
    code: "5220",
    name: { ar: "إيجار مقرات ومرافق وخدمات", en: "Rent & Utilities" },
    type: "expense",
    normalBalance: "debit",
    balance: 120000,
    parentId: "5200",
    level: 3,
    status: "active",
  },
  {
    code: "5230",
    name: { ar: "مصروفات تسويق وتوزيع وشحن", en: "Marketing & Logistics" },
    type: "expense",
    normalBalance: "debit",
    balance: 68000,
    parentId: "5200",
    level: 3,
    status: "active",
  },
  {
    code: "5240",
    name: { ar: "مصاريف بنكية وعمولات تحصيل", en: "Bank Fees & Processing Charges" },
    type: "expense",
    normalBalance: "debit",
    balance: 14000,
    parentId: "5200",
    level: 3,
    status: "active",
  },
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

export interface DepartmentItem {
  id: string;
  name: Bi;
  code: string;
  manager: Bi;
  headcount: number;
}

export const departments: DepartmentItem[] = [
  { id: "dept-exec", name: { ar: "الإدارة التنفيذية والعامة", en: "Executive Management" }, code: "EXEC", manager: { ar: "حافظ رحيم", en: "Hafez Rahim" }, headcount: 3 },
  { id: "dept-retail", name: { ar: "المبيعات ونقاط البيع والفروع", en: "Sales, POS & Branches" }, code: "RETAIL", manager: { ar: "أحمد سالم", en: "Ahmed Salem" }, headcount: 14 },
  { id: "dept-kitchen", name: { ar: "المطبخ المركزي والتصنيع", en: "Central Kitchen & Production" }, code: "KITCHEN", manager: { ar: "الشيف علاء السعيد", en: "Chef Alaa El-Saeed" }, headcount: 22 },
  { id: "dept-supply", name: { ar: "سلاسل الإمداد والمخازن", en: "Supply Chain & Warehousing" }, code: "SUPPLY", manager: { ar: "طارق فؤاد", en: "Tarek Fouad" }, headcount: 8 },
  { id: "dept-finance", name: { ar: "الإدارة المالية والحسابات", en: "Finance & Accounting" }, code: "FINANCE", manager: { ar: "منى خليل", en: "Mona Khalil" }, headcount: 5 },
  { id: "dept-qc", name: { ar: "الجودة والرقابة الداخلية", en: "Quality Control & Audit" }, code: "AUDIT", manager: { ar: "سارة نبيل", en: "Sarah Nabil" }, headcount: 3 },
];

export interface PositionItem {
  id: string;
  title: Bi;
  departmentId: string;
  level: "c-level" | "manager" | "specialist" | "staff";
}

export const positions: PositionItem[] = [
  { id: "pos-gm", title: { ar: "المدير العام والمالك", en: "General Manager & Owner" }, departmentId: "dept-exec", level: "c-level" },
  { id: "pos-cfo", title: { ar: "المدير المالي ورئيس الحسابات", en: "Chief Financial Officer" }, departmentId: "dept-finance", level: "c-level" },
  { id: "pos-chef", title: { ar: "الشيف التنفيذي لحلويات الوزير", en: "Executive Pastry Chef" }, departmentId: "dept-kitchen", level: "manager" },
  { id: "pos-branch-mgr", title: { ar: "مدير فرع ونقاط بيع", en: "Branch Sales Manager" }, departmentId: "dept-retail", level: "manager" },
  { id: "pos-storekeeper", title: { ar: "أمين مخزن خامات ومستلزمات", en: "Raw Materials Storekeeper" }, departmentId: "dept-supply", level: "specialist" },
  { id: "pos-accountant", title: { ar: "محاسب تكاليف وفروع", en: "Branch & Cost Accountant" }, departmentId: "dept-finance", level: "specialist" },
  { id: "pos-cashier", title: { ar: "كاشير ومسؤول بيع فوري", en: "Retail Cashier & Sales Rep" }, departmentId: "dept-retail", level: "staff" },
  { id: "pos-auditor", title: { ar: "مراجع داخلي ورقابة مالية", en: "Internal Compliance Auditor" }, departmentId: "dept-qc", level: "specialist" },
];

export interface SystemPage {
  id: string;
  path: string;
  name: Bi;
  badge: Bi;
}

export const systemPages: SystemPage[] = [
  { id: "page-dashboard", path: "/", name: { ar: "لوحة التحكم التنفيذية", en: "Executive Dashboard" }, badge: { ar: "رئيسية", en: "Core" } },
  { id: "page-sales", path: "/sales", name: { ar: "المبيعات وفواتير العملاء", en: "Sales & Invoices" }, badge: { ar: "تجاري", en: "Sales" } },
  { id: "page-purchases", path: "/purchases", name: { ar: "المشتريات وأوامر التوريد", en: "Purchases & Orders" }, badge: { ar: "إمداد", en: "Supply" } },
  { id: "page-accounting", path: "/accounting", name: { ar: "شجرة الحسابات والمالية", en: "Accounting & Ledger" }, badge: { ar: "مالي", en: "Finance" } },
  { id: "page-inventory", path: "/inventory", name: { ar: "مخزون أصناف حلويات الوزير", en: "Inventory & Sweets" }, badge: { ar: "مخازن", en: "Stock" } },
  { id: "page-partners", path: "/partners", name: { ar: "العملاء والموردون والفنادق", en: "Customers & Vendors" }, badge: { ar: "علاقات", en: "CRM" } },
  { id: "page-reports", path: "/reports", name: { ar: "تقارير الأداء والأرباح الذكية", en: "Reports & Profitability" }, badge: { ar: "تحليل", en: "BI" } },
  { id: "page-audit", path: "/audit", name: { ar: "سجل التدقيق والحركات الرقابية", en: "Audit Trail & Compliance" }, badge: { ar: "أمان", en: "Security" } },
  { id: "page-ai", path: "/ai", name: { ar: "غرفة عمليات الذكاء الاصطناعي", en: "AI Operations Center" }, badge: { ar: "ذكاء", en: "AI" } },
  { id: "page-ai-modules", path: "/ai-modules", name: { ar: "وكلاء وموديلات الذكاء", en: "AI Modules & Agents" }, badge: { ar: "إعدادات AI", en: "AI Config" } },
  { id: "page-settings", path: "/settings", name: { ar: "إعدادات الشركة والمستخدمين", en: "Settings & Branding" }, badge: { ar: "إدارة", en: "Admin" } },
];

export interface SystemAction {
  id: string;
  name: Bi;
  category: "sales" | "purchases" | "accounting" | "inventory" | "admin" | "ai";
}

export const systemActions: SystemAction[] = [
  { id: "invoice.create", name: { ar: "إنشاء واعتماد فواتير بيع", en: "Create Sales Invoices" }, category: "sales" },
  { id: "invoice.delete", name: { ar: "حذف أو إلغاء الفواتير المصدرة", en: "Delete/Void Invoices" }, category: "sales" },
  { id: "purchase.create", name: { ar: "إصدار أوامر توريد وشراء خامات", en: "Issue Purchase Orders" }, category: "purchases" },
  { id: "payment.approve", name: { ar: "اعتماد سندات صرف ودفعات نقدية", en: "Approve Cash Payments" }, category: "accounting" },
  { id: "accounting.edit", name: { ar: "تعديل القيود وشجرة الحسابات", en: "Modify Journal Entries & COA" }, category: "accounting" },
  { id: "stock.adjust", name: { ar: "تسويات المخزون والجرد الدوري", en: "Stock Audits & Adjustments" }, category: "inventory" },
  { id: "stock.transfer", name: { ar: "تحويل خامات بين الفروع والمطبخ", en: "Inter-branch Transfers" }, category: "inventory" },
  { id: "reports.export", name: { ar: "تصدير القوائم المالية والأرباح", en: "Export Financial Statements" }, category: "admin" },
  { id: "users.manage", name: { ar: "إدارة المستخدمين والأقسام والصلاحيات", en: "Manage Users & Permissions" }, category: "admin" },
  { id: "ai.configure", name: { ar: "إعداد وكلاء الذكاء ومفاتيح API", en: "Configure AI Modules & Keys" }, category: "ai" },
];

export interface UserItem {
  id: string;
  name: Bi;
  email: string;
  avatar?: string;
  departmentId: string;
  positionId: string;
  role: "admin" | "manager" | "accountant" | "sales" | "warehouse" | "auditor";
  allowedPages: string[];
  allowedActions: string[];
  status: "active" | "inactive";
  lastActive: string;
}

export const users: UserItem[] = [
  {
    id: "usr-1",
    name: { ar: "حافظ رحيم", en: "Hafez Rahim" },
    email: "hafez@wazeer-elhelw.com",
    departmentId: "dept-exec",
    positionId: "pos-gm",
    role: "admin",
    allowedPages: ["/", "/sales", "/purchases", "/accounting", "/inventory", "/partners", "/reports", "/audit", "/ai", "/ai-modules", "/settings"],
    allowedActions: ["invoice.create", "invoice.delete", "purchase.create", "payment.approve", "accounting.edit", "stock.adjust", "stock.transfer", "reports.export", "users.manage", "ai.configure"],
    status: "active",
    lastActive: "الآن / Just now",
  },
  {
    id: "usr-2",
    name: { ar: "أحمد سالم", en: "Ahmed Salem" },
    email: "a.salem@wazeer-elhelw.com",
    departmentId: "dept-retail",
    positionId: "pos-branch-mgr",
    role: "sales",
    allowedPages: ["/", "/sales", "/inventory", "/partners", "/ai"],
    allowedActions: ["invoice.create", "stock.transfer"],
    status: "active",
    lastActive: "منذ 15 دقيقة / 15m ago",
  },
  {
    id: "usr-3",
    name: { ar: "منى خليل", en: "Mona Khalil" },
    email: "m.khalil@wazeer-elhelw.com",
    departmentId: "dept-finance",
    positionId: "pos-cfo",
    role: "accountant",
    allowedPages: ["/", "/sales", "/purchases", "/accounting", "/reports", "/audit", "/ai"],
    allowedActions: ["invoice.create", "payment.approve", "accounting.edit", "reports.export"],
    status: "active",
    lastActive: "منذ 32 دقيقة / 32m ago",
  },
  {
    id: "usr-4",
    name: { ar: "طارق فؤاد", en: "Tarek Fouad" },
    email: "t.fouad@wazeer-elhelw.com",
    departmentId: "dept-supply",
    positionId: "pos-storekeeper",
    role: "warehouse",
    allowedPages: ["/", "/purchases", "/inventory", "/ai"],
    allowedActions: ["purchase.create", "stock.adjust", "stock.transfer"],
    status: "active",
    lastActive: "منذ ساعتين / 2h ago",
  },
  {
    id: "usr-5",
    name: { ar: "سارة نبيل", en: "Sarah Nabil" },
    email: "s.nabil@wazeer-elhelw.com",
    departmentId: "dept-qc",
    positionId: "pos-auditor",
    role: "auditor",
    allowedPages: ["/", "/reports", "/audit", "/sales", "/purchases", "/accounting", "/ai"],
    allowedActions: ["reports.export"],
    status: "active",
    lastActive: "أمس / Yesterday",
  },
];

export interface AiModuleItem {
  id: string;
  name: Bi;
  provider: "openai" | "anthropic" | "gemini" | "ollama" | "deepseek";
  model: string;
  apiKey: string;
  agentRole: "orchestrator" | "sales" | "inventory" | "finance" | "audit" | "kitchen";
  roleLabel: Bi;
  systemPrompt: string;
  allowedTools: string[];
  temperature: number;
  status: "active" | "idle" | "testing";
  totalRuns: number;
}

export const aiModules: AiModuleItem[] = [
  {
    id: "mod-hafez",
    name: { ar: "حافظ — منسق العمليات العام", en: "Hafez — Executive Orchestrator" },
    provider: "openai",
    model: "gpt-4o",
    apiKey: "sk-proj-wzr-884920482910xxxx",
    agentRole: "orchestrator",
    roleLabel: { ar: "المنسق التنفيذي المساعد", en: "Executive Orchestrator" },
    systemPrompt: "أنت المنسق التنفيذي الذكي لسلسلة حلويات وزير الحلو، تتولى تحليل استفسارات الإدارة وتوزيع المهام على وكلاء المبيعات، الحسابات، والمخزون.",
    allowedTools: ["query_financials", "delegate_task", "generate_ceo_brief", "check_system_health"],
    temperature: 0.2,
    status: "active",
    totalRuns: 1420,
  },
  {
    id: "mod-sales",
    name: { ar: "وكيل مبيعات وزير الحلو", en: "Wazeer Sales & Catering Agent" },
    provider: "gemini",
    model: "gemini-1.5-pro",
    apiKey: "AIzaSyBwzr_92810482919xxxx",
    agentRole: "sales",
    roleLabel: { ar: "أخصائي فواتير وحفلات وتوريد", en: "Sales & Catering Specialist" },
    systemPrompt: "متخصص في تسعير طلبيات الحفلات لوزير الحلو، واحتساب الخصومات التجارية للفنادق، وإصدار الفواتير الإلكترونية المعتمدة.",
    allowedTools: ["create_invoice", "check_party_credit", "apply_discount", "print_receipt"],
    temperature: 0.3,
    status: "active",
    totalRuns: 934,
  },
  {
    id: "mod-kitchen",
    name: { ar: "وكيل المطبخ والمخزون الذكي", en: "Kitchen & Inventory Predictor" },
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    apiKey: "sk-ant-api03-wzr-482019xxxx",
    agentRole: "kitchen",
    roleLabel: { ar: "مراقب خامات وإنتاج الحلويات", en: "Confectionery Batch & Stock Monitor" },
    systemPrompt: "يراقب معدلات استهلاك خامات النوتيلا، البستاشيو، الكريمة اللباني، وحليب المزارع للتنبؤ باحتياجات المطبخ المركزي قبل نفادها.",
    allowedTools: ["check_stock", "predict_shortages", "draft_purchase_order", "transfer_stock"],
    temperature: 0.1,
    status: "active",
    totalRuns: 612,
  },
  {
    id: "mod-finance",
    name: { ar: "وكيل الحسابات والضرائب", en: "Finance, COA & Tax Agent" },
    provider: "openai",
    model: "gpt-4o-mini",
    apiKey: "sk-proj-wzr-fin-910283xxxx",
    agentRole: "finance",
    roleLabel: { ar: "مراقب القيود ومطابقة الحسابات", en: "Ledger Auditor & Tax Compliance" },
    systemPrompt: "يتأكد من توازن القيود المحاسبية، وتطبيق ضريبة القيمة المضافة 14% على أصناف الحلويات، ومطابقة كشوف حسابات البنوك.",
    allowedTools: ["validate_journal", "calculate_vat", "audit_cash_flow", "reconcile_bank"],
    temperature: 0.1,
    status: "active",
    totalRuns: 785,
  },
  {
    id: "mod-audit",
    name: { ar: "وكيل الرقابة وكشف الاحتيال", en: "Audit & Risk Sentinel" },
    provider: "deepseek",
    model: "deepseek-chat",
    apiKey: "sk-ds-wzr-82910482xxxx",
    agentRole: "audit",
    roleLabel: { ar: "حارس الأمان والعمليات الشاذة", en: "Security & Fraud Sentinel" },
    systemPrompt: "يراقب فورياً أي فواتير ملغاة، تعديلات يدوية على أسعار حلويات وزير الحلو، أو مدفوعات لموردين تتجاوز حدود الاعتماد.",
    allowedTools: ["scan_audit_log", "flag_suspicious_entry", "freeze_transaction", "notify_compliance"],
    temperature: 0.0,
    status: "active",
    totalRuns: 430,
  },
];
