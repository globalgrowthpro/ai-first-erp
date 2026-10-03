import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Store,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  Printer,
  RotateCcw,
  Sparkles,
  Layers,
  Pause,
  Play,
  Maximize2,
  Minimize2,
  ChevronDown,
  User,
  Building2,
  Phone,
  Tag,
  Percent,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  QrCode,
  DollarSign,
  Coffee,
  ChefHat,
  Filter,
  Eye,
  Utensils,
  ShoppingBag,
  Bike,
  Coins,
  History,
  Lock,
  Split,
  PlusCircle,
  Wallet,
  Landmark,
  Zap,
  ShieldCheck,
  Users,
  UserCheck,
  KeyRound,
  TrendingUp,
  BarChart3,
  SlidersHorizontal,
  LogOut,
  Languages,
  LayoutDashboard,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { partners as defaultCustomers } from "@/lib/demo-data";
import { useInventoryStore, calculateBuildableQuantity } from "@/lib/inventory-store";
import { useSalesStore, type BizDocument, type InvoiceItem } from "@/lib/documents-store";
import { useCompanySettings } from "@/lib/settings-store";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealQrCode } from "@/components/ui/qr-code";
import { formatOrderDateTimeEnglish } from "@/lib/pos-orders-store";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "Point of Sale (POS) — Wazeer El-Helw ERP" },
      {
        name: "description",
        content:
          "Fast cashier terminal, touch-friendly confectionery menu, barcode scanner, shift cash management & 80mm thermal receipts.",
      },
    ],
  }),
  component: PosPage,
});

// POS Product Interface
interface PosProduct {
  id?: string | undefined;
  sku: string;
  name: { ar: string; en: string };
  category: string;
  price: number;
  stock: number;
  unit: { ar: string; en: string };
  badge?: string | undefined;
  image?: string | undefined;
  colorTheme?: string | undefined;
}

// POS Cart Line Item
interface CartItem {
  id: string;
  product: PosProduct;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage or fixed
  note?: string;
  weightGrams?: number;
}

// Parked / Held Sale Ticket
interface HeldOrder {
  id: string;
  orderNumber: string;
  timestamp: string;
  customerName: string;
  cashierId?: string | undefined;
  cashierName?: string | undefined;
  items: CartItem[];
  orderType: "dine_in" | "takeaway" | "delivery";
  subtotal: number;
  orderPlatform?: string | undefined;
  orderRefNumber?: string | undefined;
}

// Available POS Branches
export const POS_BRANCHES = [
  { id: "korba", ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis Branch", phone: "+20 100 455 2211" },
  { id: "maadi", ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St. Branch", phone: "+20 100 882 3344" },
  { id: "tagamoa", ar: "فرع التجمع الخامس — التسعين", en: "New Cairo — 90th St. Branch", phone: "+20 100 994 5566" },
  { id: "coast", ar: "فرع الساحل الشمالي — مارينا", en: "North Coast — Marina Hub", phone: "+20 100 331 7788" },
  { id: "kitchen", ar: "المطبخ المركزي — طلبات التوصيل", en: "Central Kitchen Delivery Hub", phone: "+20 100 112 0000" },
];

// POS Cashier User Profile (Multi-Users per Branch)
export interface PosCashierUser {
  id: string;
  branchId: string;
  name: { ar: string; en: string };
  code: string; // PIN or employee code
  role: "cashier" | "lead_cashier" | "supervisor" | "branch_manager";
  roleLabel: { ar: string; en: string };
  avatar: string;
  avatarBg?: string | undefined;
}

export const POS_BRANCH_CASHIERS: PosCashierUser[] = [
  // فرع الكوربة — مصر الجديدة (korba)
  {
    id: "usr_korba_1",
    branchId: "korba",
    name: { ar: "أحمد سالم", en: "Ahmed Salem" },
    code: "101",
    role: "lead_cashier",
    roleLabel: { ar: "كاشير رئيسي", en: "Lead Cashier" },
    avatar: "👨‍🍳",
    avatarBg: "from-amber-600 to-orange-600",
  },
  {
    id: "usr_korba_2",
    branchId: "korba",
    name: { ar: "سارة محمود", en: "Sara Mahmoud" },
    code: "102",
    role: "cashier",
    roleLabel: { ar: "كاشير صالة", en: "Hall Cashier" },
    avatar: "👩‍🍳",
    avatarBg: "from-rose-600 to-pink-600",
  },
  {
    id: "usr_korba_3",
    branchId: "korba",
    name: { ar: "كريم عادل", en: "Kareem Adel" },
    code: "103",
    role: "cashier",
    roleLabel: { ar: "كاشير مسائي", en: "Evening Cashier" },
    avatar: "👨‍💻",
    avatarBg: "from-blue-600 to-indigo-600",
  },
  {
    id: "usr_korba_4",
    branchId: "korba",
    name: { ar: "محمود عبد الله", en: "Mahmoud Abdullah" },
    code: "100",
    role: "branch_manager",
    roleLabel: { ar: "مدير الفرع", en: "Branch Manager" },
    avatar: "👔",
    avatarBg: "from-purple-600 to-indigo-700",
  },

  // فرع المعادي (maadi)
  {
    id: "usr_maadi_1",
    branchId: "maadi",
    name: { ar: "طارق الشناوي", en: "Tarek Shennawy" },
    code: "201",
    role: "lead_cashier",
    roleLabel: { ar: "كاشير رئيسي", en: "Lead Cashier" },
    avatar: "👨‍🍳",
    avatarBg: "from-teal-600 to-emerald-600",
  },
  {
    id: "usr_maadi_2",
    branchId: "maadi",
    name: { ar: "نورهان فتحي", en: "Nourhan Fathy" },
    code: "202",
    role: "cashier",
    roleLabel: { ar: "كاشير صالة", en: "Hall Cashier" },
    avatar: "👩‍💼",
    avatarBg: "from-fuchsia-600 to-pink-600",
  },

  // فرع التجمع الخامس (tagamoa)
  {
    id: "usr_tagamoa_1",
    branchId: "tagamoa",
    name: { ar: "عمر فاروق", en: "Omar Farouk" },
    code: "301",
    role: "lead_cashier",
    roleLabel: { ar: "كاشير رئيسي", en: "Lead Cashier" },
    avatar: "👨‍🍳",
    avatarBg: "from-amber-600 to-yellow-600",
  },
  {
    id: "usr_tagamoa_2",
    branchId: "tagamoa",
    name: { ar: "ياسمين خالد", en: "Yasmine Khaled" },
    code: "302",
    role: "cashier",
    roleLabel: { ar: "كاشير صالة", en: "Hall Cashier" },
    avatar: "👩‍🍳",
    avatarBg: "from-violet-600 to-purple-600",
  },

  // فرع الساحل الشمالي (coast)
  {
    id: "usr_coast_1",
    branchId: "coast",
    name: { ar: "مصطفى فهمي", en: "Mostafa Fahmy" },
    code: "401",
    role: "lead_cashier",
    roleLabel: { ar: "كاشير الساحل", en: "Coast Cashier" },
    avatar: "👨‍🍳",
    avatarBg: "from-cyan-600 to-blue-600",
  },

  // المطبخ المركزي (kitchen)
  {
    id: "usr_kitchen_1",
    branchId: "kitchen",
    name: { ar: "الشيف هاني", en: "Chef Hany" },
    code: "501",
    role: "supervisor",
    roleLabel: { ar: "مشرف طلبيات", en: "Dispatch Supervisor" },
    avatar: "👨‍🍳",
    avatarBg: "from-emerald-600 to-teal-600",
  },
];

// Cashier Shift Statistics (Own Shift per User)
export interface CashierShiftData {
  shiftNumber: string;
  openedAt: string;
  openingCash: number;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  walletSales: number;
  ordersCount: number;
}

export const INITIAL_CASHIER_SHIFTS: Record<string, CashierShiftData> = {};


// Delivery & Aggregator Platforms (طلبات، تطبيقات أخرى، مباشر)
export interface OrderPlatform {
  id: string;
  name: { ar: string; en: string };
  icon: string;
  prefix: string;
  badgeClass: string;
}

export const ORDER_PLATFORMS: OrderPlatform[] = [
  { id: "direct", name: { ar: "مباشر / المعرض", en: "Direct Walk-in" }, icon: "🏪", prefix: "", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  { id: "talabat", name: { ar: "تطبيق طلبات (Talabat)", en: "Talabat App" }, icon: "🛵", prefix: "TLB-", badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" },
  { id: "waffarha", name: { ar: "تطبيق وفرها (Waffarha)", en: "Waffarha App" }, icon: "🎟️", prefix: "WFR-", badgeClass: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
  { id: "jahez", name: { ar: "تطبيق جاهز (Jahez)", en: "Jahez App" }, icon: "🟡", prefix: "JHZ-", badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  { id: "elmenus", name: { ar: "المنيوز (Elmenus)", en: "Elmenus" }, icon: "🍔", prefix: "ELM-", badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30" },
  { id: "hungerstation", name: { ar: "هنقرستيشن (HungerStation)", en: "HungerStation" }, icon: "🥘", prefix: "HNG-", badgeClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" },
  { id: "noon", name: { ar: "نون فود (Noon Food)", en: "Noon Food" }, icon: "🛍️", prefix: "NON-", badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  { id: "mrsool", name: { ar: "مرسول (Mrsool)", en: "Mrsool" }, icon: "🟢", prefix: "MRS-", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  { id: "other", name: { ar: "تطبيق آخر (Other App)", en: "Other App" }, icon: "📱", prefix: "APP-", badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
];

// POS Categories
const POS_CATEGORIES = [
  { id: "all", ar: "الكل", en: "All Items", icon: "✨" },
  { id: "عشاق الرز", ar: "عشاق الرز", en: "Rice Pudding", icon: "🥣" },
  { id: "الفتة", ar: "الفتة الملكية", en: "Royal Fatta", icon: "🍨" },
  { id: "دنيا الدلع", ar: "دنيا الدلع والمدلعة", en: "Specialties", icon: "🍯" },
  { id: "الطواجن", ar: "طواجن ساخنة", en: "Hot Tajins", icon: "🍲" },
  { id: "شاورما الوزير", ar: "شاورما الحلو", en: "Sweet Shawarma", icon: "🌯" },
  { id: "كيك وتشييز", ar: "كيك وتشيز كيك", en: "Cakes & Sweets", icon: "🍰" },
  { id: "كشري الحلو", ar: "كشري الحلو", en: "Sweet Koshary", icon: "🍧" },
  { id: "القشطوطة", ar: "القشطوطة الأصلية", en: "Kashtouta", icon: "🍮" },
  { id: "علب الهدايا", ar: "علب هدايا وبوكسات", en: "Gift Boxes", icon: "🎁" },
  { id: "مشروبات وإضافات", ar: "مشروبات وإضافات", en: "Drinks & Extras", icon: "🥤" },
];

// Comprehensive POS Product Image Mapping
export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  // عشاق الرز (Rice Pudding)
  "RICE-NUT": "/products/rice-nutella.jpg",
  "RICE-NUTS": "/products/rice-pistachio.jpg",
  "RICE-LOT": "/products/fatta-wazeer.jpg",
  "RICE-PST": "/products/rice-pistachio.jpg",
  "RICE-WZR": "/products/rice-pistachio.jpg",
  "RICE-PLN": "/products/rice-pistachio.jpg",

  // الفتة (Royal Fatta)
  "FAT-WZR": "/products/fatta-wazeer.jpg",
  "FAT-NUT": "/products/rice-nutella.jpg",
  "FAT-MNG": "/products/kashtouta-mango.jpg",
  "FAT-PST": "/products/fatta-wazeer.jpg",

  // دنيا الدلع والملوخيتو (Specialties)
  "MDL-MNG": "/products/kashtouta-mango.jpg",
  "MDL-CRM": "/products/medalaa.jpg",
  "MLK-WZR": "/products/molokhito.jpg",
  "MLK-NUT": "/products/molokhito.jpg",

  // الطواجن الساخنة (Hot Tajins)
  "TJ-ALI": "/products/om-ali.jpg",
  "TJ-NUT": "/products/rice-nutella.jpg",

  // شاورما الحلو (Sweet Shawarma)
  "SHW-NUT": "/products/shawarma-crepe.jpg",
  "SHW-MIX": "/products/shawarma-crepe.jpg",
  "SHW-PST": "/products/shawarma-crepe.jpg",

  // كيك وتشييز (Cakes & Cheesecake)
  "CK-LND-KND": "/products/cheesecake-pistachio.jpg",
  "CK-LND-NUT": "/products/rice-nutella.jpg",
  "CHZ-PST": "/products/cheesecake-pistachio.jpg",
  "TRT-LOT-FAM": "/products/cheesecake-pistachio.jpg",

  // كشري الحلو (Sweet Koshary)
  "KSHR-LUX": "/products/koshary-luxe.jpg",
  "KSHR-KND": "/products/koshary-luxe.jpg",
  "KSHR-PST": "/products/koshary-luxe.jpg",
  "KSHR-NUT": "/products/koshary-luxe.jpg",
  "KSHR-WZR": "/products/koshary-luxe.jpg",

  // القشطوطة الأصلية (Kashtouta Tres Leches)
  "KSH-PST": "/products/kashtouta-pistachio.jpg",
  "KSH-MSR": "/products/kashtouta-pistachio.jpg",
  "KSH-NUT": "/products/rice-nutella.jpg",
  "KSH-MNG": "/products/kashtouta-mango.jpg",
  "KSH-RIC-NUT": "/products/rice-nutella.jpg",
  "KSH-RIC-PST": "/products/kashtouta-pistachio.jpg",

  // علب الهدايا وبوكسات الضيافة (Gift Boxes)
  "BOX-ROYAL-1KG": "/products/baklava-box.jpg",
  "BOX-ROYAL-2KG": "/products/baklava-box.jpg",
  "BKL-PIST-VIP": "/products/baklava-box.jpg",

  // مشروبات وإضافات (Drinks & Extras)
  "ICE-SCOOP": "/products/kashtouta-pistachio.jpg",
  "EX-PIST-SAUCE": "/products/cheesecake-pistachio.jpg",
  "EX-NUT-SAUCE": "/products/rice-nutella.jpg",
  "WATER-MINERAL": "/products/mineral-water.jpg",
};

// POS Payment Method Definition
export interface PosPaymentMethodConfig {
  id: string;
  name: { ar: string; en: string };
  icon: string;
  badgeClass: string;
  shortcut?: string;
  category: "cash" | "card" | "wallet" | "voucher" | "split" | "credit" | "custom";
  description?: { ar: string; en: string };
  isCustom?: boolean;
}

export const DEFAULT_PAYMENT_METHODS: PosPaymentMethodConfig[] = [
  {
    id: "cash",
    name: { ar: "نقداً (كاش)", en: "Cash" },
    icon: "💵",
    badgeClass: "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
    shortcut: "F4",
    category: "cash",
    description: { ar: "سداد نقدي مباشر بدرج الكاشير", en: "Direct cash drawer payment" },
  },
  {
    id: "card",
    name: { ar: "فيزا / شبكة", en: "Card POS" },
    icon: "💳",
    badgeClass: "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300",
    shortcut: "F5",
    category: "card",
    description: { ar: "ماكينة نقاط البيع POS / مدى", en: "Debit & Credit Card POS Terminal" },
  },
  {
    id: "wallet",
    name: { ar: "إنستاباي / محفظة", en: "InstaPay / Wallet" },
    icon: "📱",
    badgeClass: "bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300",
    shortcut: "F6",
    category: "wallet",
    description: { ar: "تحويل إنستاباي أو المحافظ الذكية", en: "InstaPay or Mobile e-Wallet" },
  },
  {
    id: "waffarha_voucher",
    name: { ar: "قسيمة وفرها", en: "Waffarha Voucher" },
    icon: "🎟️",
    badgeClass: "bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300",
    shortcut: "F7",
    category: "voucher",
    description: { ar: "كوبون أو قسيمة خصم وفرها", en: "Waffarha promotional coupon" },
  },
  {
    id: "split",
    name: { ar: "دفع مجزأ", en: "Split Pay" },
    icon: "🔄",
    badgeClass: "bg-teal-500/15 border-teal-500/40 text-teal-700 dark:text-teal-300",
    shortcut: "F8",
    category: "split",
    description: { ar: "تقسيم الحساب بين الكاش والفيزا", en: "Split between Cash & Card" },
  },
  {
    id: "fawry",
    name: { ar: "فوري / أمان", en: "Fawry / Aman" },
    icon: "⚡",
    badgeClass: "bg-yellow-500/15 border-yellow-500/40 text-yellow-700 dark:text-yellow-400",
    category: "wallet",
    description: { ar: "سداد عبر كود فوري أو أمان", en: "Fawry Pay or Aman POS" },
  },
  {
    id: "credit",
    name: { ar: "آجل / حساب عميل", en: "On Account" },
    icon: "🏢",
    badgeClass: "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300",
    category: "credit",
    description: { ar: "تسجيل المديونية على حساب العميل", en: "Charge to customer credit ledger" },
  },
  {
    id: "valu",
    name: { ar: "تقسيط (ValU)", en: "ValU BNPL" },
    icon: "🛍️",
    badgeClass: "bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300",
    category: "card",
    description: { ar: "تقسيط عبر فاليو أو سهولة", en: "Buy Now Pay Later Installment" },
  },
];

export interface PosCompletedOrder {
  id: string;
  date: string;
  branch: (typeof POS_BRANCHES)[number];
  cashierId: string;
  cashierName: string;
  customer: { name: string; phone: string };
  items: CartItem[];
  subtotal: number;
  vat: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentMethodLabel?: string | undefined;
  splitBreakdown?: { cash: number; card: number } | undefined;
  tendered: number;
  change: number;
  orderType: string;
  orderPlatform?: string | undefined;
  orderPlatformName?: string | undefined;
  orderRefNumber?: string | undefined;
}

export const INITIAL_ORDERS_HISTORY: PosCompletedOrder[] = [];

export function PosPage() {
  const { t, pick, money, lang, dir, toggle } = useI18n();
  const { settings } = useCompanySettings();
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const { addDocument, documents, nextCode } = useSalesStore();

  const hasOnlyPosPermission =
    currentUser?.role === "pos_cashier" ||
    (!currentUser?.role?.includes("admin") &&
      currentUser?.allowedPages?.length > 0 &&
      currentUser?.allowedPages?.every((p) => p === "/pos"));

  // Fullscreen Kiosk Mode
  const [isKioskMode, setIsKioskMode] = useState(false);

  // Live Inventory Store (branches, products, categories, boms all from DB)
  const {
    products: inventoryProducts,
    categories: inventoryCategories,
    branches: dbBranches,
    boms: inventoryBoms,
    adjustStock,
    consumeAssemblyStock,
  } = useInventoryStore();

  // Resolve active branch from live DB (locked — cashier cannot change it)
  const activeBranch = useMemo(() => {
    if (dbBranches.length === 0) return null;
    try {
      const saved = localStorage.getItem("pos_terminal_branch_id");
      if (saved) {
        const found = dbBranches.find((b) => b.id === saved);
        if (found) return found;
      }
    } catch {}
    return dbBranches[0] ?? null;
  }, [dbBranches]);

  // Selected Branch — derived from live DB branches (read-only on POS, cashier cannot change it)
  // Kept in POS_BRANCHES-compatible shape { id, ar, en, phone } for backward compatibility
  const selectedBranch = useMemo(() => {
    if (activeBranch) {
      return {
        id: activeBranch.id,
        ar: activeBranch.name.ar,
        en: activeBranch.name.en,
        phone: activeBranch.phone || "",
      };
    }
    // Fallback to first static branch only if DB has no branches yet
    return POS_BRANCHES[0]!;
  }, [activeBranch]);

  // Multi-Users / Cashiers for this branch
  const [allCashiers, setAllCashiers] = useState<PosCashierUser[]>(() => {
    try {
      const stored = localStorage.getItem("pos_all_cashiers_v2");
      if (stored) return JSON.parse(stored);
    } catch {}
    return POS_BRANCH_CASHIERS;
  });

  // Cashiers assigned to the currently selected branch
  const branchCashiers = useMemo(() => {
    return allCashiers.filter((c) => c.branchId === selectedBranch.id);
  }, [allCashiers, selectedBranch.id]);



  // Active Cashier User on this POS Terminal
  const [activeCashier, setActiveCashier] = useState<PosCashierUser>(() => {
    try {
      const savedId = localStorage.getItem("pos_terminal_active_cashier_id");
      if (savedId) {
        const found = POS_BRANCH_CASHIERS.find((c) => c.id === savedId);
        if (found) return found;
      }
    } catch {}
    return POS_BRANCH_CASHIERS[0]!;
  });

  // Role-based access: cashiers only see their own shift, orders, and held tickets
  const isCashierRole = currentUser?.role === "pos_cashier" || activeCashier.role === "cashier";

  // When branch changes, ensure activeCashier matches the selected branch
  useEffect(() => {
    try {
      localStorage.setItem("pos_terminal_branch_id", selectedBranch.id);
    } catch {}
    if (activeCashier.branchId !== selectedBranch.id) {
      const firstBranchCashier = branchCashiers[0] || {
        id: `usr_${selectedBranch.id}_1`,
        branchId: selectedBranch.id,
        name: { ar: "كاشير مناوب", en: "Duty Cashier" },
        code: "101",
        role: "cashier" as const,
        roleLabel: { ar: "كاشير الفرع", en: "Branch Cashier" },
        avatar: "👨‍🍳",
      };
      setActiveCashier(firstBranchCashier);
    }
  }, [selectedBranch.id, branchCashiers]);

  // Persist active cashier
  useEffect(() => {
    try {
      localStorage.setItem("pos_terminal_active_cashier_id", activeCashier.id);
    } catch {}
  }, [activeCashier.id]);

  // User Shifts Map (Keyed by Cashier ID: each user has his own shift & amount)
  const [userShifts, setUserShifts] = useState<Record<string, CashierShiftData>>(() => {
    try {
      const stored = localStorage.getItem("pos_cashier_shifts_data");
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_CASHIER_SHIFTS;
  });

  // Current Active Cashier's Personal Shift Stats
  const activeShift = useMemo<CashierShiftData>(() => {
    if (userShifts[activeCashier.id]) {
      return userShifts[activeCashier.id]!;
    }
    return {
      shiftNumber: `SHIFT-${selectedBranch.id.toUpperCase()}-${activeCashier.code}`,
      openedAt: "09:00 ص",
      openingCash: 1000,
      totalSales: 0,
      cashSales: 0,
      cardSales: 0,
      walletSales: 0,
      ordersCount: 0,
    };
  }, [userShifts, activeCashier.id, selectedBranch.id, activeCashier.code]);

  // Alias for backward compatibility
  const shiftStats = activeShift;

  // Orders History (all completed orders on this POS)
  const [ordersHistory, setOrdersHistory] = useState<PosCompletedOrder[]>(() => {
    try {
      const stored = localStorage.getItem("pos_orders_history_data");
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_ORDERS_HISTORY;
  });

  // Active User's Own Orders
  const myOrders = useMemo(() => {
    return ordersHistory.filter(
      (o) => o.cashierId === activeCashier.id && o.branch.id === selectedBranch.id
    );
  }, [ordersHistory, activeCashier.id, selectedBranch.id]);

  // All Branch Orders
  const branchOrders = useMemo(() => {
    return ordersHistory.filter((o) => o.branch.id === selectedBranch.id);
  }, [ordersHistory, selectedBranch.id]);

  // Fetch Live Orders History & Cashier Shifts from Supabase Database
  const fetchDbPosData = useCallback(async () => {
    try {
      // 1. Fetch Orders with Items
      const { data: ordersData, error: ordersErr } = await supabase
        .from("pos_orders")
        .select("*, pos_order_items(*)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!ordersErr && ordersData && ordersData.length > 0) {
        const mappedOrders: PosCompletedOrder[] = ordersData.map((o: any) => {
          const br = POS_BRANCHES.find((b) => b.id === o.branch_id) || {
            id: o.branch_id,
            ar: o.branch_id,
            en: o.branch_id,
            phone: "",
          };
          const items: CartItem[] = (o.pos_order_items || []).map((it: any) => ({
            id: it.id,
            product: {
              id: it.product_id || undefined,
              sku: it.sku,
              name: { ar: it.name_ar, en: it.name_en },
              category: "",
              price: Number(it.unit_price),
              stock: 0,
              unit: { ar: "علبة", en: "box" },
              image: PRODUCT_IMAGE_MAP[it.sku] || "/products/rice-pistachio.jpg",
            },
            quantity: Number(it.quantity),
            unitPrice: Number(it.unit_price),
            discount: 0,
            note: it.notes || undefined,
          }));

          return {
            id: o.order_number || o.id,
            date: formatOrderDateTimeEnglish(o.created_at),
            branch: br,
            cashierId: o.cashier_id,
            cashierName: o.cashier_name,
            customer: {
              name: o.customer_name || (lang === "ar" ? "عميل نقدي" : "Walk-in Guest"),
              phone: o.customer_phone || "",
            },
            items,
            subtotal: Number(o.subtotal || 0),
            vat: Number(o.tax_amount || 0),
            discount: Number(o.discount_amount || 0),
            deliveryFee: Number(o.delivery_fee || 0),
            total: Number(o.total || 0),
            paymentMethod: o.payment_method,
            tendered: Number(o.tender_amount || o.total || 0),
            change: Number(o.change_amount || 0),
            orderType: o.order_type,
            orderPlatform: o.order_platform || "direct",
            orderRefNumber: o.order_ref_number || undefined,
          };
        });
        setOrdersHistory(mappedOrders);
      }

      // 2. Fetch Shifts from Supabase pos_shifts
      const { data: shiftsData, error: shiftsErr } = await supabase
        .from("pos_shifts")
        .select("*")
        .eq("status", "open");

      if (!shiftsErr && shiftsData && shiftsData.length > 0) {
        setUserShifts((prev) => {
          const next = { ...prev };
          for (const s of shiftsData) {
            next[s.cashier_id] = {
              shiftNumber: s.shift_number,
              openedAt: new Date(s.opened_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              openingCash: Number(s.opening_cash),
              totalSales: Number(s.total_sales),
              cashSales: Number(s.cash_sales),
              cardSales: Number(s.card_sales),
              walletSales: Number(s.wallet_sales),
              ordersCount: Number(s.orders_count),
            };
          }
          return next;
        });
      }
    } catch (e) {
      console.error("Error fetching POS data from Supabase:", e);
    }
  }, [lang]);

  useEffect(() => {
    fetchDbPosData();

    // Subscribe to realtime updates for live sync across devices
    const channel = supabase
      .channel("pos_db_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pos_orders" }, () => fetchDbPosData())
      .on("postgres_changes", { event: "*", schema: "public", table: "pos_shifts" }, () => fetchDbPosData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDbPosData]);

  // Cashier Switcher Modal State
  const [showCashierSwitchModal, setShowCashierSwitchModal] = useState(false);
  const [cashierPinInput, setCashierPinInput] = useState("");
  const [showNewCashierForm, setShowNewCashierForm] = useState(false);
  const [newCashierForm, setNewCashierForm] = useState({
    nameAr: "",
    nameEn: "",
    code: "",
    role: "cashier" as "cashier" | "lead_cashier" | "supervisor" | "branch_manager",
  });

  // Cashier Orders History Modal State ("طلباتي")
  const [showMyOrdersModal, setShowMyOrdersModal] = useState(false);
  const [ordersViewMode, setOrdersViewMode] = useState<"my_orders" | "all_branch">("my_orders");
  const [ordersSearchQuery, setOrdersSearchQuery] = useState("");
  const [shiftModalTab, setShiftModalTab] = useState<"my_shift" | "all_cashiers">("my_shift");

  // Force cashier role to stay on own shift and own orders only
  useEffect(() => {
    if (isCashierRole) {
      if (shiftModalTab !== "my_shift") setShiftModalTab("my_shift");
      if (ordersViewMode !== "my_orders") setOrdersViewMode("my_orders");
    }
  }, [isCashierRole, shiftModalTab, ordersViewMode]);

  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("takeaway");
  const [tableNumber, setTableNumber] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Order Platform & Order Reference Number (e.g. Talabat, Other App)
  const [orderPlatform, setOrderPlatform] = useState<string>("direct");
  const [orderRefNumber, setOrderRefNumber] = useState<string>("");

  // Customer Management
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; phone: string }>({
    name: lang === "ar" ? "عميل نقدي / صالة" : "Walk-in Guest",
    phone: "",
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Helper to determine category color theme
  const getCategoryColorTheme = (catName: string) => {
    if (catName.includes("الرز") || catName.includes("Rice")) return "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300";
    if (catName.includes("الفتة") || catName.includes("Fatta")) return "from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300";
    if (catName.includes("الدلع") || catName.includes("Specialt")) return "from-purple-500/20 to-violet-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300";
    if (catName.includes("طواجن") || catName.includes("Tajin")) return "from-orange-500/20 to-amber-500/10 border-orange-500/30 text-orange-800 dark:text-orange-200";
    if (catName.includes("شاورما") || catName.includes("Shawarma")) return "from-amber-600/20 to-yellow-500/10 border-amber-600/30 text-amber-700 dark:text-amber-300";
    if (catName.includes("كيك") || catName.includes("Cake")) return "from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-700 dark:text-pink-300";
    if (catName.includes("كشري") || catName.includes("Koshary")) return "from-red-500/20 to-orange-500/10 border-red-500/30 text-red-700 dark:text-red-300";
    if (catName.includes("قشطوطة") || catName.includes("Kashtouta")) return "from-yellow-500/20 to-amber-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-300";
    if (catName.includes("هدايا") || catName.includes("Gift")) return "from-amber-600/20 to-yellow-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200";
    if (catName.includes("مشروبات") || catName.includes("إضافات") || catName.includes("Drink")) return "from-blue-500/20 to-sky-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300";
    return "from-primary/20 to-primary/5 border-primary/30 text-primary";
  };

  // Base Products Catalog dynamically derived directly from live Inventory Store
  const catalogProducts: PosProduct[] = useMemo(() => {
    // POS items: only show_on_pos enabled, non-raw-material products
    // Branch filter: if product has a branchId, only show it for that branch; unassigned products show everywhere
    const currentBranchId = activeBranch?.id ?? null;
    const sellable = inventoryProducts.filter((p) => {
      if (p.isRawMaterial) return false;
      // showOnPos defaults to true when undefined (backward compat with older seed data)
      if (p.showOnPos === false) return false;
      if (p.branchId && currentBranchId && p.branchId !== currentBranchId) return false;
      return true;
    });

    return sellable.map((p) => {
      const cat = inventoryCategories.find((c) => c.id === p.categoryId);
      const catName = cat ? cat.name.ar : (p.department || "أصناف عامة");

      const buildableInfo = calculateBuildableQuantity(p, inventoryProducts, inventoryBoms || []);
      const isAssembly =
        p.technicalType === "ON_DEMAND_ASSEMBLY" ||
        Boolean(p.isAssemblyProduct) ||
        (buildableInfo.hasBom && p.technicalType !== "FINISHED");

      const effectiveStock = isAssembly ? buildableInfo.maxBuildable : p.qty;

      let badge: string | undefined = undefined;
      if (isAssembly) {
        if (effectiveStock <= 0) {
          const shortageName = buildableInfo.bottleneck
            ? lang === "ar"
              ? buildableInfo.bottleneck.componentName.ar
              : buildableInfo.bottleneck.componentName.en
            : "";
          badge =
            lang === "ar"
              ? shortageName
                ? `نقص: ${shortageName}`
                : "مكونات غير كافية"
              : shortageName
              ? `Shortage: ${shortageName}`
              : "Insufficient Components";
        } else if (effectiveStock <= 10) {
          badge = lang === "ar" ? `متاح للتجهيز: ${effectiveStock}` : `Buildable: ${effectiveStock}`;
        }
      } else {
        if (effectiveStock <= 0) {
          badge = lang === "ar" ? "نفد من المخزن" : "Out of Stock";
        } else if (effectiveStock <= p.minStock) {
          badge = lang === "ar" ? "كمية محدودة" : "Low Stock";
        }
      }

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: catName,
        price: p.sellingPrice || p.costPrice || 0,
        stock: effectiveStock,
        unit: { ar: "علبة", en: "box" },
        badge,
        image: p.image || PRODUCT_IMAGE_MAP[p.sku] || "/products/rice-pistachio.jpg",
        colorTheme: getCategoryColorTheme(catName),
      };
    });
  }, [inventoryProducts, inventoryCategories, inventoryBoms, activeBranch, lang]);

  // Dynamic Categories synced with inventory products
  const allPosCategories = useMemo(() => {
    const items = [{ id: "all", ar: "الكل", en: "All Items", icon: "✨" }];
    const seen = new Set<string>(["all"]);

    // Categories that currently exist in inventory sellable products
    for (const prod of catalogProducts) {
      if (prod.category && !seen.has(prod.category)) {
        seen.add(prod.category);
        const match = POS_CATEGORIES.find((c) => c.id === prod.category || c.ar === prod.category);
        items.push({
          id: prod.category,
          ar: match ? match.ar : prod.category,
          en: match ? match.en : prod.category,
          icon: match?.icon || "🏷️",
        });
      }
    }

    // Retain standard POS category tabs if not yet added
    for (const c of POS_CATEGORIES) {
      if (!seen.has(c.id) && !seen.has(c.ar)) {
        seen.add(c.id);
        items.push(c);
      }
    }
    return items;
  }, [catalogProducts]);

  // Catalog State
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isMoreCatOpen, setIsMoreCatOpen] = useState(false);
  const moreCatRef = useRef<HTMLDivElement>(null);

  // 5 Categories by default & remaining categories in dropdown list
  const defaultCategories = useMemo(() => allPosCategories.slice(0, 5), [allPosCategories]);
  const dropdownCategories = useMemo(() => allPosCategories.slice(5), [allPosCategories]);
  const activeDropdownCat = useMemo(
    () => dropdownCategories.find((c) => c.id === activeCategory),
    [dropdownCategories, activeCategory]
  );

  // Close categories dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreCatRef.current && !moreCatRef.current.contains(event.target as Node)) {
        setIsMoreCatOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [applyVat, setApplyVat] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState(0);

  // Parked / Held Tickets
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Cashier-specific filtered parked orders
  const visibleHeldOrders = useMemo(() => {
    if (isCashierRole) {
      return heldOrders.filter((h) => !h.cashierId || h.cashierId === activeCashier.id);
    }
    return heldOrders;
  }, [heldOrders, isCashierRole, activeCashier.id]);

  // Checkout & Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [tenderAmount, setTenderAmount] = useState<number>(0);

  // Dynamic Payment Methods list (with localStorage persistence)
  const [paymentMethods, setPaymentMethods] = useState<PosPaymentMethodConfig[]>(() => {
    try {
      const stored = localStorage.getItem("pos_custom_payment_methods");
      if (stored) {
        const custom: PosPaymentMethodConfig[] = JSON.parse(stored);
        return [...DEFAULT_PAYMENT_METHODS, ...custom];
      }
    } catch {
      // fallback
    }
    return DEFAULT_PAYMENT_METHODS;
  });

  // Add Custom Payment Method Modal State
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newPaymentForm, setNewPaymentForm] = useState<{
    nameAr: string;
    nameEn: string;
    icon: string;
    descriptionAr: string;
  }>({
    nameAr: "",
    nameEn: "",
    icon: "💳",
    descriptionAr: "",
  });

  // Split Payment Breakdown (Cash + Card)
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitCardAmount, setSplitCardAmount] = useState<number>(0);

  // Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<PosCompletedOrder | null>(null);

  // Shift & Cash Drawer Modal
  const [showShiftModal, setShowShiftModal] = useState(false);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.ar.toLowerCase().includes(q) ||
        p.name.en.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      const matchesCategory = activeCategory === "all" || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [catalogProducts, searchQuery, activeCategory]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const vatAmount = useMemo(() => {
    if (!applyVat) return 0;
    return (subtotal - discountAmount) * 0.14; // 14% Egyptian VAT
  }, [subtotal, discountAmount, applyVat]);

  const finalTotal = useMemo(() => {
    const raw = subtotal - discountAmount + vatAmount + (orderType === "delivery" ? deliveryFee : 0);
    return Math.max(0, Math.round(raw * 100) / 100);
  }, [subtotal, discountAmount, vatAmount, orderType, deliveryFee]);

  // Auto-sync payment tender and split amounts when total or paymentMethod changes
  useEffect(() => {
    if (finalTotal > 0) {
      if (paymentMethod === "cash" && (!tenderAmount || tenderAmount < finalTotal)) {
        setTenderAmount(finalTotal);
      } else if (paymentMethod === "split") {
        const cashHalf = Math.round(finalTotal / 2);
        setSplitCashAmount(cashHalf);
        setSplitCardAmount(finalTotal - cashHalf);
      }
    }
  }, [finalTotal, paymentMethod]);

  // Handler for adding a new custom payment method
  const handleAddCustomPaymentMethod = () => {
    if (!newPaymentForm.nameAr.trim()) {
      toast.error(lang === "ar" ? "يرجى كتابة اسم طريقة الدفع" : "Please enter payment method name");
      return;
    }

    const newId = `custom_${Date.now()}`;
    const newMethod: PosPaymentMethodConfig = {
      id: newId,
      name: {
        ar: newPaymentForm.nameAr.trim(),
        en: newPaymentForm.nameEn.trim() || newPaymentForm.nameAr.trim(),
      },
      icon: newPaymentForm.icon || "💳",
      badgeClass: "bg-teal-500/15 border-teal-500/40 text-teal-700 dark:text-teal-300",
      category: "custom",
      description: {
        ar: newPaymentForm.descriptionAr.trim() || "طريقة دفع مخصصة",
        en: "Custom payment method",
      },
      isCustom: true,
    };

    const updated = [...paymentMethods, newMethod];
    setPaymentMethods(updated);

    try {
      const customOnly = updated.filter((m) => m.isCustom);
      localStorage.setItem("pos_custom_payment_methods", JSON.stringify(customOnly));
    } catch {
      // ignore
    }

    setPaymentMethod(newId);
    setShowAddPaymentModal(false);
    setNewPaymentForm({ nameAr: "", nameEn: "", icon: "💳", descriptionAr: "" });
    toast.success(
      lang === "ar"
        ? `تمت إضافة طريقة الدفع "${newMethod.name.ar}" بنجاح!`
        : `Payment method "${newMethod.name.en}" added successfully!`
    );
  };

  // Hotkey listener: F1: Pay, F2: Hold, F3: Search, F4: Cash, F5: Card, F6: Wallet, F7: Voucher, F8: Split, F9: Void
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.key === "F1") {
        e.preventDefault();
        if (cart.length > 0) {
          if (paymentMethod === "cash" && tenderAmount > 0 && tenderAmount < finalTotal) {
            setShowPaymentModal(true);
          } else {
            handleCompletePayment();
          }
        }
      } else if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0) handleHoldTicket();
      } else if (e.key === "F3") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (!isInput) {
        if (e.key === "F4") {
          e.preventDefault();
          setPaymentMethod("cash");
          setTenderAmount(finalTotal);
        } else if (e.key === "F5") {
          e.preventDefault();
          setPaymentMethod("card");
        } else if (e.key === "F6") {
          e.preventDefault();
          setPaymentMethod("wallet");
        } else if (e.key === "F7") {
          e.preventDefault();
          setPaymentMethod("waffarha_voucher");
        } else if (e.key === "F8") {
          e.preventDefault();
          setPaymentMethod("split");
        } else if (e.key === "F9") {
          e.preventDefault();
          if (cart.length > 0) handleClearCart();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, finalTotal, paymentMethod, tenderAmount, splitCashAmount, splitCardAmount]);

  // Add Item to Cart (Enforces Inventory Stock Availability)
  const handleAddToCart = (product: PosProduct, customQty = 1) => {
    if (product.stock <= 0) {
      toast.error(
        lang === "ar"
          ? `عفواً، صنف "${pick(product.name.ar, product.name.en)}" غير متوفر حالياً في المخزن!`
          : `Sorry, "${pick(product.name.ar, product.name.en)}" is out of stock in inventory!`
      );
      return;
    }

    const currentInCart = cart.find((item) => item.product.sku === product.sku)?.quantity || 0;
    if (currentInCart + customQty > product.stock) {
      toast.warning(
        lang === "ar"
          ? `تنبيه: الكمية المطلوبة تتجاوز الرصيد المتاح بالمخزن (${product.stock})`
          : `Warning: Requested quantity exceeds available inventory stock (${product.stock})`
      );
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.sku === product.sku);
      if (existing) {
        return prev.map((item) =>
          item.product.sku === product.sku
            ? { ...item, quantity: item.quantity + customQty }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString().slice(-4)}`,
          product,
          quantity: customQty,
          unitPrice: product.price,
          discount: 0,
        },
      ];
    });
    toast.success(
      lang === "ar"
        ? `تمت إضافة ${pick(product.name.ar, product.name.en)} للفاتورة`
        : `Added ${pick(product.name.ar, product.name.en)} to order`,
      { duration: 1200 }
    );
  };

  // Update Item Quantity with inventory limit alert
  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.product.stock && delta > 0) {
              toast.warning(
                lang === "ar"
                  ? `تنبيه: الكمية (${nextQty}) تتجاوز رصيد المخزن المتاح (${item.product.stock})`
                  : `Warning: Quantity (${nextQty}) exceeds available inventory stock (${item.product.stock})`
              );
            }
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove Item
  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Select Order Platform / Aggregator (Talabat, Other App, etc.)
  const handleSelectPlatform = (platId: string) => {
    setOrderPlatform(platId);
    const plat = ORDER_PLATFORMS.find((p) => p.id === platId);
    if (platId !== "direct") {
      if (orderType === "dine_in") {
        setOrderType("takeaway");
      }
      if (platId === "waffarha") {
        setPaymentMethod("waffarha_voucher");
      }
      if (plat?.prefix && !orderRefNumber) {
        setOrderRefNumber(plat.prefix);
      }
    } else {
      if (paymentMethod === "waffarha_voucher") {
        setPaymentMethod("cash");
      }
      if (
        orderRefNumber.startsWith("TLB-") ||
        orderRefNumber.startsWith("WFR-") ||
        orderRefNumber.startsWith("APP-") ||
        orderRefNumber.startsWith("JHZ-") ||
        orderRefNumber.startsWith("ELM-") ||
        orderRefNumber.startsWith("HNG-") ||
        orderRefNumber.startsWith("NON-") ||
        orderRefNumber.startsWith("MRS-")
      ) {
        setOrderRefNumber("");
      }
    }
  };

  // Clear Cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountPercent(0);
    setDeliveryFee(0);
    setOrderPlatform("direct");
    setOrderRefNumber("");
    setTableNumber("");
    setDeliveryNotes("");
    toast.info(lang === "ar" ? "تم تفريغ الفاتورة الحالية" : "Current ticket cleared");
  };

  // Hold / Park Ticket
  const handleHoldTicket = () => {
    if (cart.length === 0) return;
    const newHeld: HeldOrder = {
      id: `HELD-${Date.now()}`,
      orderNumber: `#POS-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      customerName: selectedCustomer.name,
      cashierId: activeCashier.id,
      cashierName: pick(activeCashier.name.ar, activeCashier.name.en),
      items: [...cart],
      orderType,
      subtotal,
      orderPlatform,
      orderRefNumber,
    };
    setHeldOrders((prev) => [newHeld, ...prev]);
    setCart([]);
    setDiscountPercent(0);
    setOrderPlatform("direct");
    setOrderRefNumber("");
    toast.success(
      lang === "ar"
        ? `تم تعليق الفاتورة (${newHeld.orderNumber}) بنجاح`
        : `Order ${newHeld.orderNumber} parked successfully`
    );
  };

  // Resume Held Ticket
  const handleResumeHeldTicket = (held: HeldOrder) => {
    setCart(held.items);
    setOrderType(held.orderType);
    setSelectedCustomer({ name: held.customerName, phone: "" });
    setOrderPlatform(held.orderPlatform || "direct");
    setOrderRefNumber(held.orderRefNumber || "");
    setHeldOrders((prev) => prev.filter((h) => h.id !== held.id));
    setShowHeldModal(false);
    toast.success(
      lang === "ar"
        ? `تم استئناف الفاتورة (${held.orderNumber})`
        : `Resumed order ${held.orderNumber}`
    );
  };

  // Complete Payment & Generate Invoice
  const handleCompletePayment = async () => {
    if (cart.length === 0) return;

    const orderId = `INV-POS-${Date.now().toString().slice(-6)}`;
    const changeAmount = Math.max(0, tenderAmount - finalTotal);
    const selectedPlatObj = ORDER_PLATFORMS.find((p) => p.id === orderPlatform);
    const platformLabel = selectedPlatObj ? pick(selectedPlatObj.name.ar, selectedPlatObj.name.en) : "";

    // Save as official BizDocument invoice in sales store
    const invoiceItems: InvoiceItem[] = cart.map((ci, idx) => ({
      id: `pos-item-${idx}-${ci.product.sku}`,
      sku: ci.product.sku,
      name: ci.product.name,
      quantity: ci.quantity,
      unit: ci.product.unit,
      unitPrice: ci.unitPrice,
      total: ci.quantity * ci.unitPrice,
    }));

    const activeMethodConfig = paymentMethods.find((m) => m.id === paymentMethod);
    const methodLabel = activeMethodConfig
      ? pick(activeMethodConfig.name.ar, activeMethodConfig.name.en)
      : paymentMethod;

    const splitNote =
      paymentMethod === "split"
        ? ` | Split: Cash ${splitCashAmount} EGP + Card ${splitCardAmount} EGP`
        : "";

    const newInvoice: BizDocument = {
      id: orderId,
      party: {
        ar:
          orderPlatform !== "direct"
            ? `${selectedCustomer.name} (${selectedPlatObj?.name.ar || "تطبيق"} ${orderRefNumber ? `#${orderRefNumber}` : ""})`
            : selectedCustomer.name,
        en:
          orderPlatform !== "direct"
            ? `${selectedCustomer.name} (${selectedPlatObj?.name.en || "App"} ${orderRefNumber ? `#${orderRefNumber}` : ""})`
            : selectedCustomer.name,
      },
      date: new Date().toISOString().split("T")[0]!,
      amount: finalTotal,
      balance: paymentMethod === "credit" ? finalTotal : 0,
      status: paymentMethod === "credit" ? "partial" : "paid",
      subtotal,
      taxRate: applyVat ? 14 : 0,
      taxAmount: vatAmount,
      discount: discountAmount,
      paymentMethod,
      branch: { ar: selectedBranch.ar, en: selectedBranch.en },
      notes: `${orderType.toUpperCase()} | Platform: ${platformLabel} ${orderRefNumber ? `[Ref: ${orderRefNumber}]` : ""} | Pay: ${methodLabel}${splitNote} | Cashier: ${pick(activeCashier.name.ar, activeCashier.name.en)} (${activeCashier.code}) | ${tableNumber ? "Table: " + tableNumber : ""}`,
      items: invoiceItems,
    };

    addDocument(newInvoice);

    // Deduct sold items from live inventory store (supports on-demand assembly component deduction)
    for (const ci of cart) {
      await consumeAssemblyStock(ci.product.sku, ci.quantity, activeBranch?.id);
    }

    // Update Shift sales according to payment settlement
    const cashIncrement =
      paymentMethod === "cash"
        ? finalTotal
        : paymentMethod === "split"
        ? splitCashAmount
        : 0;

    const cardIncrement =
      paymentMethod === "card" || paymentMethod === "valu"
        ? finalTotal
        : paymentMethod === "split"
        ? splitCardAmount
        : 0;

    const walletIncrement =
      paymentMethod === "wallet" || paymentMethod === "fawry"
        ? finalTotal
        : 0;

    // Update active cashier's personal shift
    setUserShifts((prev) => {
      const current = prev[activeCashier.id] || activeShift;
      const updated: CashierShiftData = {
        ...current,
        totalSales: current.totalSales + finalTotal,
        cashSales: current.cashSales + cashIncrement,
        cardSales: current.cardSales + cardIncrement,
        walletSales: current.walletSales + walletIncrement,
        ordersCount: current.ordersCount + 1,
      };
      const nextMap = { ...prev, [activeCashier.id]: updated };
      try {
        localStorage.setItem("pos_cashier_shifts_data", JSON.stringify(nextMap));
      } catch {}
      return nextMap;
    });

    const activeCashierDisplayName = pick(activeCashier.name.ar, activeCashier.name.en);

    // Record completed order for receipt and history
    const completedOrderRecord: PosCompletedOrder = {
      id: orderId,
      date: formatOrderDateTimeEnglish(new Date()),
      branch: selectedBranch,
      cashierId: activeCashier.id,
      cashierName: activeCashierDisplayName,
      customer: selectedCustomer,
      items: [...cart],
      subtotal,
      vat: vatAmount,
      discount: discountAmount,
      deliveryFee,
      total: finalTotal,
      paymentMethod,
      paymentMethodLabel:
        paymentMethod === "split"
          ? lang === "ar"
            ? `دفع مجزأ (نقداً: ${money(splitCashAmount)} + فيزا: ${money(splitCardAmount)})`
            : `Split (Cash: ${money(splitCashAmount)} + Card: ${money(splitCardAmount)})`
          : methodLabel,
      splitBreakdown:
        paymentMethod === "split"
          ? { cash: splitCashAmount, card: splitCardAmount }
          : undefined,
      tendered:
        paymentMethod === "cash"
          ? tenderAmount || finalTotal
          : finalTotal,
      change:
        paymentMethod === "cash"
          ? Math.max(0, (tenderAmount || finalTotal) - finalTotal)
          : 0,
      orderType:
        orderType === "dine_in"
          ? lang === "ar" ? "صالة / طاولة" : "Dine-in"
          : orderType === "takeaway"
          ? lang === "ar" ? "سفري / تيك أواي" : "Takeaway"
          : lang === "ar" ? "توصيل / دليفري" : "Delivery",
      orderPlatform,
      orderPlatformName: platformLabel,
      orderRefNumber: orderRefNumber || undefined,
    };

    setLastCompletedOrder(completedOrderRecord);
    setOrdersHistory((prev) => {
      const nextList = [completedOrderRecord, ...prev];
      try {
        localStorage.setItem("pos_orders_history_data", JSON.stringify(nextList.slice(0, 100)));
      } catch {}
      return nextList;
    });

    // Asynchronously persist to Supabase Database (pos_orders, pos_order_items, and pos_shifts)
    (async () => {
      try {
        const { data: insertedOrder, error: orderErr } = await supabase
          .from("pos_orders")
          .insert({
            order_number: orderId,
            branch_id: selectedBranch.id,
            cashier_id: activeCashier.id,
            cashier_name: activeCashierDisplayName,
            customer_name: selectedCustomer.name || null,
            customer_phone: selectedCustomer.phone || null,
            order_type: orderType,
            order_platform: orderPlatform,
            order_ref_number: orderRefNumber || null,
            table_number: tableNumber || null,
            delivery_notes: deliveryNotes || null,
            subtotal,
            tax_amount: vatAmount,
            discount_amount: discountAmount,
            delivery_fee: deliveryFee,
            total: finalTotal,
            payment_method: paymentMethod,
            tender_amount: paymentMethod === "cash" ? (tenderAmount || finalTotal) : finalTotal,
            change_amount: paymentMethod === "cash" ? Math.max(0, (tenderAmount || finalTotal) - finalTotal) : 0,
            status: "completed",
          })
          .select("id")
          .single();

        if (orderErr) {
          console.error("Failed to insert pos_order to Supabase:", orderErr);
        } else if (insertedOrder) {
          const isValidUuid = (val?: string | null) =>
            Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

          const itemsPayload = cart.map((ci) => ({
            order_id: insertedOrder.id,
            product_id: (isValidUuid(ci.product?.id) && ci.product?.id ? ci.product.id : null) as string | null,
            sku: ci.product?.sku || "SKU-001",
            name_ar: (typeof ci.product?.name === "object" ? ci.product?.name?.ar : ci.product?.name) || "صنف حلوى",
            name_en: (typeof ci.product?.name === "object" ? ci.product?.name?.en : ci.product?.name) || "Sweet Item",
            quantity: Math.max(1, Number(ci.quantity) || 1),
            unit_price: Number(ci.unitPrice) || 0,
            total_price: (Math.max(1, Number(ci.quantity) || 1)) * (Number(ci.unitPrice) || 0),
            notes: ci.note || null,
          }));

          const { error: itemsErr } = await supabase
            .from("pos_order_items")
            .insert(itemsPayload);

          if (itemsErr) {
            console.error("Failed to insert pos_order_items to Supabase:", itemsErr);
          }

          // Update cashier shift in Supabase pos_shifts
          const { data: existingShift } = await supabase
            .from("pos_shifts")
            .select("id, total_sales, cash_sales, card_sales, wallet_sales, orders_count")
            .eq("cashier_id", activeCashier.id)
            .eq("status", "open")
            .maybeSingle();

          if (existingShift) {
            await supabase
              .from("pos_shifts")
              .update({
                total_sales: Number(existingShift.total_sales) + finalTotal,
                cash_sales: Number(existingShift.cash_sales) + cashIncrement,
                card_sales: Number(existingShift.card_sales) + cardIncrement,
                wallet_sales: Number(existingShift.wallet_sales) + walletIncrement,
                orders_count: Number(existingShift.orders_count) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingShift.id);
          } else {
            await supabase
              .from("pos_shifts")
              .insert({
                shift_number: activeShift.shiftNumber,
                branch_id: selectedBranch.id,
                cashier_id: activeCashier.id,
                cashier_name: activeCashierDisplayName,
                status: "open",
                opening_cash: activeShift.openingCash,
                total_sales: finalTotal,
                cash_sales: cashIncrement,
                card_sales: cardIncrement,
                wallet_sales: walletIncrement,
                orders_count: 1,
              });
          }
        }
      } catch (err) {
        console.error("Error persisting POS order transaction to database:", err);
      }
    })();

    // Reset current ticket & close payment modal
    setShowPaymentModal(false);
    setCart([]);
    setDiscountPercent(0);
    setDeliveryFee(0);
    setOrderPlatform("direct");
    setOrderRefNumber("");
    setShowReceiptModal(true);

    toast.success(
      lang === "ar" ? "تم سداد الفاتورة وإصدار الإيصال بنجاح!" : "Payment completed & receipt issued!"
    );
  };

  return (
    <div
      dir={dir}
      className={`h-screen flex flex-col bg-background select-none font-sans overflow-hidden ${
        isKioskMode ? "fixed inset-0 z-50 p-2 bg-background" : ""
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. PROFESSIONAL UNIFIED TERMINAL TOOLBAR */}
      {/* ========================================================================= */}
      <header className="h-16 bg-card/95 backdrop-blur-md border-b border-border/70 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 shadow-2xs select-none">
        {/* Left / Start: Brand Identity & Branch Context */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div className="flex items-center gap-2.5">
            {/* Official Wazeer El-Helw Logo */}
            <div className="h-10 px-2 py-1 rounded-xl bg-white border border-border/80 shadow-xs flex items-center justify-center shrink-0">
              <img
                src={settings.logoUrl || "/wazeer-logo.png"}
                alt="وزير الحلو"
                className="h-7 w-auto max-w-[125px] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/wazeer-emblem.png";
                }}
              />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-[#2E1A6B] dark:text-purple-300 tracking-tight">
                  {lang === "ar" ? "وزير الحلو" : "Wazeer El-Helw"}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#E11D2E]/10 text-[#E11D2E] font-black border border-[#E11D2E]/30 shadow-2xs">
                  POS
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                REG-01 • v2.6
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-border/70 hidden md:block shrink-0" />

          {/* Branch Indicator (Locked to terminal) */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/60 bg-muted/30 text-foreground text-xs font-semibold shrink-0"
            title={lang === "ar" ? "الفرع المخصص لنقطة البيع" : "Terminal Branch (Locked)"}
          >
            <span className="text-[#E11D2E] text-xs">📍</span>
            <span className="truncate max-w-[150px]">
              {activeBranch
                ? (lang === "ar" ? activeBranch.name.ar : activeBranch.name.en)
                : (lang === "ar" ? "لا يوجد فرع" : "No Branch")}
            </span>
            <Lock className="w-3 h-3 text-muted-foreground opacity-60 ms-0.5" />
          </div>
        </div>

        {/* Center: Operational Actions Dock (Cashier, Shift, Orders & Parked) */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/40 p-1 rounded-2xl border border-border/60 shrink-0">
          {/* Active Cashier Pill */}
          <button
            type="button"
            onClick={() => setShowCashierSwitchModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-card hover:bg-card/80 border border-border/60 text-foreground text-xs font-bold transition-all shadow-2xs group cursor-pointer"
            title={lang === "ar" ? "بيانات الكاشير والتبديل" : "Cashier Details & Switch"}
          >
            <span className="text-base">{activeCashier.avatar}</span>
            <div className="text-start leading-tight hidden sm:block">
              <span className="font-bold text-xs text-[#2E1A6B] dark:text-purple-300 group-hover:text-[#E11D2E] transition-colors block truncate max-w-[110px]">
                {pick(activeCashier.name.ar, activeCashier.name.en)}
              </span>
              <span className="text-[9px] text-muted-foreground font-medium block truncate max-w-[110px]">
                {pick(activeCashier.roleLabel.ar, activeCashier.roleLabel.en)}
              </span>
            </div>
          </button>

          {/* Shift Sales Pill */}
          <button
            type="button"
            onClick={() => {
              if (isCashierRole) setShiftModalTab("my_shift");
              setShowShiftModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-card hover:bg-card/80 border border-border/60 text-foreground text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title={lang === "ar" ? "تقرير الوردية وحركة الصندوق" : "Shift & Cash Drawer Summary"}
          >
            <Clock className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
            <span className="text-[11px] text-muted-foreground hidden lg:inline">{lang === "ar" ? "الوردية:" : "Shift:"}</span>
            <span className="font-mono text-xs font-black text-[#16A34A] dark:text-emerald-400">
              {money(activeShift.totalSales)}
            </span>
          </button>

          {/* My Orders Button */}
          <button
            type="button"
            onClick={() => {
              setOrdersViewMode("my_orders");
              setShowMyOrdersModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-card hover:bg-card/80 border border-border/60 text-foreground text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title={lang === "ar" ? "سجل طلباتي" : "My Orders"}
          >
            <Receipt className="w-3.5 h-3.5 text-[#2E1A6B] dark:text-purple-400 shrink-0" />
            <span className="text-[11px] hidden sm:inline">{lang === "ar" ? "طلباتي" : "Orders"}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#2E1A6B]/10 text-[#2E1A6B] dark:bg-purple-500/20 dark:text-purple-300 font-mono text-[10px] font-black border border-[#2E1A6B]/20">
              {myOrders.length}
            </span>
          </button>

          {/* Parked Tickets Button */}
          <button
            type="button"
            onClick={() => setShowHeldModal(true)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              visibleHeldOrders.length > 0
                ? "bg-[#FBBF24]/15 border-[#FBBF24]/50 text-amber-900 dark:text-amber-200 animate-pulse shadow-2xs"
                : "bg-card hover:bg-card/80 border-border/60 text-muted-foreground hover:text-foreground shadow-2xs"
            }`}
            title={lang === "ar" ? "الفواتير المعلقة" : "Parked Tickets"}
          >
            <Pause className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] hidden sm:inline">{lang === "ar" ? "المعلقات" : "Parked"}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
                visibleHeldOrders.length > 0
                  ? "bg-[#FBBF24] text-slate-950 font-black shadow-2xs"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {visibleHeldOrders.length}
            </span>
          </button>
        </div>

        {/* Right / End: Utilities, Fullscreen, Language & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Live Inventory Connected Status */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground font-medium select-none"
            title={lang === "ar" ? "المخزون متصل ومحدث بالأسعار والأرصدة" : "Live inventory synced with DB"}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px]">
              {lang === "ar" ? `${catalogProducts.length} صنف` : `${catalogProducts.length} items`}
            </span>
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-bold text-foreground transition-colors cursor-pointer"
            title={t("lang")}
          >
            <Languages className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase">{lang === "ar" ? "EN" : "عربي"}</span>
          </button>

          {/* Fullscreen Kiosk Toggle */}
          <button
            type="button"
            onClick={() => setIsKioskMode((prev) => !prev)}
            className="p-2 rounded-xl border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={
              isKioskMode
                ? lang === "ar" ? "الخروج من ملء الشاشة" : "Exit Fullscreen"
                : lang === "ar" ? "وضع ملء الشاشة" : "Fullscreen"
            }
          >
            {isKioskMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Exit to ERP Dashboard (Managers / Admins only) */}
          {!hasOnlyPosPermission && (
            <Link
              to="/"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              title={lang === "ar" ? "العودة للوحة تحكم النظام" : "Exit to ERP Dashboard"}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px]">{lang === "ar" ? "لوحة التحكم" : "ERP"}</span>
            </Link>
          )}

          {/* Safe Terminal Logout */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(lang === "ar" ? "هل ترغب في تسجيل الخروج من نقطة البيع؟" : "Are you sure you want to exit and log out?")) {
                logout();
                navigate({ to: "/" });
              }
            }}
            className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
            title={lang === "ar" ? "تسجيل الخروج وإغلاق المحطة" : "Log out / Exit Terminal"}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN SPLIT TERMINAL LAYOUT */}
      {/* ========================================================================= */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* ===================================================================== */}
        {/* LEFT COLUMN: CATALOG & PRODUCT MENU (7 or 8 Cols) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 min-h-0">
          {/* Search Bar + Barcode Scanner input */}
          <div className="bg-card rounded-2xl border border-border/70 p-2.5 flex items-center gap-2 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === "ar"
                    ? "ابحث باسم الصنف، النكهة، أو امسح الباركود مباشرة (F3)..."
                    : "Search sweet, flavor, or scan barcode (F3)..."
                }
                className="w-full ps-9 pe-9 py-2 text-xs font-semibold rounded-xl border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/60 border border-border/60 text-[11px] font-mono font-bold text-muted-foreground shrink-0">
              <QrCode className="w-3.5 h-3.5 text-primary" />
              <span>BARCODE SCAN READY</span>
            </div>
          </div>

          {/* Categories: 5 default tabs + Dropdown for the rest */}
          <div className="flex items-center gap-1.5 pb-1 relative z-30">
            {/* 5 Default Categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1 min-w-0">
              {defaultCategories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md scale-102"
                        : "bg-card border border-border/70 text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-sm">{cat.icon}</span>
                    <span>{pick(cat.ar, cat.en)}</span>
                  </button>
                );
              })}
            </div>

            {/* Dropdown Menu for Other Categories */}
            <div className="relative shrink-0" ref={moreCatRef}>
              <button
                type="button"
                onClick={() => setIsMoreCatOpen(!isMoreCatOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  activeDropdownCat
                    ? "bg-primary text-primary-foreground shadow-md scale-102 ring-2 ring-primary/30"
                    : "bg-card border border-border/70 text-foreground hover:bg-muted"
                }`}
              >
                <span className="text-sm">
                  {activeDropdownCat ? activeDropdownCat.icon : "📂"}
                </span>
                <span>
                  {activeDropdownCat
                    ? pick(activeDropdownCat.ar, activeDropdownCat.en)
                    : pick(`أقسام أخرى (${dropdownCategories.length})`, `More (${dropdownCategories.length})`)}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isMoreCatOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Popup */}
              {isMoreCatOpen && (
                <div className="absolute z-50 top-full mt-2 end-0 min-w-56 p-1.5 bg-card/95 backdrop-blur-md rounded-2xl border border-border/80 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/50 flex items-center justify-between">
                    <span>{lang === "ar" ? "بقية الأقسام" : "Other Categories"}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono font-bold">
                      {dropdownCategories.length}
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-0.5 p-0.5">
                    {dropdownCategories.map((cat) => {
                      const isSelected = activeCategory === cat.id;
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => {
                            setActiveCategory(cat.id);
                            setIsMoreCatOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-start flex items-center justify-between gap-2 transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-black shadow-xs"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{cat.icon}</span>
                            <span className="truncate">{pick(cat.ar, cat.en)}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredProducts.map((prod) => {
                const cartQty = cart.find((c) => c.product.sku === prod.sku)?.quantity || 0;
                return (
                  <div
                    key={prod.sku}
                    onClick={() => handleAddToCart(prod, 1)}
                    className={`group relative bg-card rounded-2xl border p-2.5 flex flex-col justify-between transition-all duration-200 select-none overflow-hidden ${
                      prod.stock <= 0
                        ? "border-rose-500/30 opacity-70 cursor-not-allowed bg-rose-500/5"
                        : "border-border/80 hover:border-primary/60 hover:bg-accent/5 hover:shadow-xl active:scale-98 cursor-pointer"
                    }`}
                  >
                    {/* Product Photo with Badge Overlays */}
                    <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-muted/50 mb-2 border border-border/40">
                      <img
                        src={prod.image || "/products/rice-pistachio.jpg"}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-108"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset["fallback"]) {
                            target.dataset["fallback"] = "true";
                            target.src = "/products/rice-pistachio.jpg";
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                      {/* Top Badges: SKU & Promo */}
                      <div className="absolute top-1.5 inset-x-1.5 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white/90 truncate shadow-xs">
                          {prod.sku}
                        </span>
                        {prod.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs text-white ${
                              prod.stock <= 0 ? "bg-rose-600" : "bg-amber-500"
                            }`}
                          >
                            {prod.badge}
                          </span>
                        )}
                      </div>

                      {/* Bottom Overlay: Stock Count & Cart Quantity */}
                      <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between gap-1 pointer-events-none">
                        {prod.stock <= 0 ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-600/95 backdrop-blur-xs text-white font-bold shadow-xs">
                            {lang === "ar" ? "نفد من المخزن" : "Out of Stock"}
                          </span>
                        ) : prod.stock <= 10 ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-600/90 backdrop-blur-xs text-white font-bold shadow-xs">
                            {lang === "ar" ? `متبقي: ${prod.stock}` : `Stock: ${prod.stock}`}
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-xs text-white font-bold shadow-xs">
                            {lang === "ar" ? `رصيد: ${prod.stock}` : `In Stock: ${prod.stock}`}
                          </span>
                        )}

                        {cartQty > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-mono text-xs font-black shadow-md ring-2 ring-background">
                            {cartQty}×
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Name & Category */}
                    <div className="mb-2">
                      <h4 className="text-xs sm:text-sm font-black text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
                        {pick(prod.name.ar, prod.name.en)}
                      </h4>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                        {prod.category}
                      </span>
                    </div>

                    {/* Bottom Price & Add Action */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                      <div>
                        <span className="text-sm sm:text-base font-black text-foreground font-mono">
                          {money(prod.price)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="p-1.5 rounded-xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground text-foreground transition-colors shadow-xs">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-card rounded-2xl border border-dashed border-border/80">
                <ChefHat className="w-12 h-12 text-muted-foreground/40 mb-2" />
                <h4 className="text-sm font-bold text-foreground">
                  {lang === "ar" ? "لم يتم العثور على أصناف مطابقة" : "No sweets matching search"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === "ar" ? "جرب البحث باسم آخر أو اختر قسماً مختلفاً" : "Try another search term or category"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT COLUMN: ACTIVE ORDER TICKET & TOTALS (4 or 5 Cols) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-5 xl:col-span-4 bg-card rounded-3xl border border-border/80 shadow-xl flex flex-col min-h-0 h-full overflow-hidden">
          {/* 1. Ticket Header: Compact Order Channel, Customer & Type Bar */}
          <div className="p-2 sm:p-2.5 border-b border-border/70 space-y-1.5 bg-muted/20 shrink-0">
            <div className="flex items-center justify-between gap-1.5">
              {/* Customer Chip & Picker */}
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/70 hover:bg-muted text-xs font-bold text-foreground transition-all truncate flex-1 min-w-0 text-start group cursor-pointer shadow-2xs"
                title={lang === "ar" ? "تغيير العميل" : "Change Customer"}
              >
                <User className="w-3.5 h-3.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                <div className="truncate leading-tight flex-1 min-w-0">
                  <span className="truncate block font-bold text-[11px] text-foreground">
                    {selectedCustomer.name}
                  </span>
                  {selectedCustomer.phone && (
                    <span className="text-[9px] text-muted-foreground font-mono block">
                      {selectedCustomer.phone}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-primary shrink-0 font-medium">
                  {lang === "ar" ? "تغيير" : "Edit"}
                </span>
              </button>

              {/* Order Types 3-way toggle */}
              <div className="flex items-center bg-muted/70 p-0.5 rounded-xl border border-border/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setOrderType("takeaway")}
                  className={`px-2 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                    orderType === "takeaway"
                      ? "bg-card text-foreground shadow-2xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={lang === "ar" ? "طلب سفري" : "Takeaway"}
                >
                  <ShoppingBag className="w-3 h-3 text-amber-500" />
                  <span className="hidden sm:inline">{lang === "ar" ? "سفري" : "Takeaway"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("dine_in")}
                  className={`px-2 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                    orderType === "dine_in"
                      ? "bg-card text-foreground shadow-2xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={lang === "ar" ? "طلب صالة" : "Dine-in"}
                >
                  <Utensils className="w-3 h-3 text-primary" />
                  <span className="hidden sm:inline">{lang === "ar" ? "صالة" : "Dine-in"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("delivery")}
                  className={`px-2 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                    orderType === "delivery"
                      ? "bg-card text-foreground shadow-2xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={lang === "ar" ? "طلب توصيل" : "Delivery"}
                >
                  <Bike className="w-3 h-3 text-emerald-600" />
                  <span className="hidden sm:inline">{lang === "ar" ? "توصيل" : "Delivery"}</span>
                </button>
              </div>

              {/* Platform Selector */}
              <div className="relative shrink-0">
                <select
                  value={orderPlatform}
                  onChange={(e) => handleSelectPlatform(e.target.value)}
                  className={`text-[11px] font-bold py-1 px-2 pe-6 rounded-xl border appearance-none focus:outline-none cursor-pointer transition-colors shadow-2xs ${
                    orderPlatform === "talabat"
                      ? "bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300"
                      : orderPlatform === "waffarha"
                      ? "bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300"
                      : orderPlatform !== "direct"
                      ? "bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300"
                      : "bg-card border-border/70 text-foreground"
                  }`}
                >
                  <option value="direct">🏪 {lang === "ar" ? "مباشر" : "Direct"}</option>
                  <option value="talabat">🛵 {lang === "ar" ? "طلبات" : "Talabat"}</option>
                  <option value="waffarha">🎟️ {lang === "ar" ? "وفرها" : "Waffarha"}</option>
                  <option value="elmenus">🍔 {lang === "ar" ? "المنيوز" : "Elmenus"}</option>
                  <option value="jahez">🟡 {lang === "ar" ? "جاهز" : "Jahez"}</option>
                  <option value="hungerstation">🥘 {lang === "ar" ? "هنقرستيشن" : "HungerStation"}</option>
                  <option value="noon">🛍️ {lang === "ar" ? "نون فود" : "Noon"}</option>
                  <option value="mrsool">🟢 {lang === "ar" ? "مرسول" : "Mrsool"}</option>
                  <option value="other">📱 {lang === "ar" ? "تطبيق آخر" : "Other App"}</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute end-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
              </div>
            </div>

            {/* Dynamic Row for Table / Address / Coupon or Platform Ref */}
            {(orderType === "dine_in" || orderType === "delivery" || orderPlatform !== "direct") && (
              <div className="flex items-center gap-1.5 pt-0.5 animate-in fade-in duration-150">
                {orderType === "dine_in" && (
                  <div className="flex items-center gap-1.5 flex-1 bg-card px-2.5 py-1 rounded-xl border border-border/60 shadow-2xs">
                    <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                      {lang === "ar" ? "طاولة:" : "Table:"}
                    </span>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="مثال: T-04"
                      className="w-full text-xs font-bold bg-transparent border-none focus:outline-none text-foreground"
                    />
                  </div>
                )}

                {orderType === "delivery" && (
                  <div className="flex items-center gap-1.5 flex-1 bg-card px-2.5 py-1 rounded-xl border border-border/60 shadow-2xs">
                    <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                      {lang === "ar" ? "العنوان:" : "Address:"}
                    </span>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder={lang === "ar" ? "عنوان التوصيل أو رقم الشقة..." : "Delivery address..."}
                      className="w-full text-xs font-medium bg-transparent border-none focus:outline-none text-foreground"
                    />
                  </div>
                )}

                {orderPlatform !== "direct" && (
                  <div className="flex items-center gap-1.5 flex-1 bg-card px-2.5 py-1 rounded-xl border border-border/60 shadow-2xs">
                    <Tag className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                      {orderPlatform === "waffarha"
                        ? lang === "ar" ? "كوبون:" : "Coupon:"
                        : lang === "ar" ? "مرجع:" : "Ref #:"}
                    </span>
                    <input
                      type="text"
                      value={orderRefNumber}
                      onChange={(e) => setOrderRefNumber(e.target.value)}
                      placeholder={
                        orderPlatform === "waffarha"
                          ? "WFR-78412"
                          : orderPlatform === "talabat"
                          ? "TLB-89421"
                          : "REF-001"
                      }
                      className="w-full text-xs font-mono font-bold bg-transparent border-none focus:outline-none text-foreground"
                    />
                    {orderRefNumber && (
                      <button
                        type="button"
                        onClick={() => setOrderRefNumber("")}
                        className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Ticket Items Area - Primary Scrollable View (ALWAYS VISIBLE & PROMINENT) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2.5 space-y-1.5">
            {cart.map((item) => {
              const lineTotal = item.quantity * item.unitPrice;
              return (
                <div
                  key={item.id}
                  className="p-2 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition-all flex items-center justify-between gap-2 shadow-2xs group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={pick(item.product.name.ar, item.product.name.en)}
                        className="w-9 h-9 rounded-xl object-cover shrink-0 border border-border/70 shadow-xs"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/wazeer-emblem.png";
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm shrink-0">
                        🍬
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-black text-foreground block leading-tight truncate">
                        {pick(item.product.name.ar, item.product.name.en)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate font-mono">
                        {money(item.unitPrice)} / {pick(item.product.unit.ar, item.product.unit.en)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Price & Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl border border-border/60">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="w-5 h-5 rounded-lg bg-card text-foreground hover:bg-muted flex items-center justify-center font-black transition-colors cursor-pointer shadow-2xs"
                        title={lang === "ar" ? "تقليل" : "Decrease"}
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-7 text-center text-xs font-mono font-black text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="w-5 h-5 rounded-lg bg-card text-foreground hover:bg-muted flex items-center justify-center font-black transition-colors cursor-pointer shadow-2xs"
                        title={lang === "ar" ? "زيادة" : "Increase"}
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="w-16 text-end">
                      <span className="text-xs font-black text-[#16A34A] dark:text-emerald-400 block font-mono">
                        {money(lineTotal)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      title={lang === "ar" ? "حذف الصنف" : "Remove item"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {cart.length === 0 && (
              <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 stroke-[1.2] opacity-30 mb-2" />
                <p className="text-xs font-bold text-foreground">
                  {lang === "ar" ? "الفاتورة فارغة حالياً" : "Cart is currently empty"}
                </p>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {lang === "ar" ? "اختر من قائمة الأصناف لإضافتها مباشرة" : "Click any confectionery to add to ticket"}
                </span>
              </div>
            )}
          </div>

          {/* 3. Docked Checkout Panel (NO SCROLLBAR, NEVER PUSHED OFF-SCREEN) */}
          <div className="p-2.5 sm:p-3 border-t border-border/70 bg-card/90 space-y-2 shrink-0 shadow-lg">
            {/* Row 1: Summary Mini Breakdown & Quick Controls */}
            <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  {lang === "ar" ? "الفرعي:" : "Sub:"}{" "}
                  <strong className="font-mono text-foreground">{money(subtotal)}</strong>
                </span>

                {discountAmount > 0 && (
                  <span className="text-rose-600 font-bold">
                    {lang === "ar" ? `خصم (${discountPercent}%):` : `Disc (${discountPercent}%):`}{" "}
                    <strong className="font-mono">-{money(discountAmount)}</strong>
                  </span>
                )}

                {applyVat && (
                  <span>
                    {lang === "ar" ? "ضريبة 14%:" : "VAT:"}{" "}
                    <strong className="font-mono text-foreground">+{money(vatAmount)}</strong>
                  </span>
                )}

                {orderType === "delivery" && deliveryFee > 0 && (
                  <span>
                    {lang === "ar" ? "توصيل:" : "Delivery:"}{" "}
                    <strong className="font-mono text-foreground">+{money(deliveryFee)}</strong>
                  </span>
                )}
              </div>

              {/* Toggles: Discount % & VAT & Clear */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setDiscountPercent((prev) => (prev === 0 ? 10 : prev === 10 ? 20 : 0))}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                    discountPercent > 0
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-600"
                      : "bg-muted/50 border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                  title={lang === "ar" ? "تطبيق نسبة خصم سريعة" : "Quick discount"}
                >
                  %{discountPercent > 0 ? discountPercent : lang === "ar" ? "خصم" : "Disc"}
                </button>

                <button
                  type="button"
                  onClick={() => setApplyVat((prev) => !prev)}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                    applyVat
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted/50 border-border/70 text-muted-foreground line-through"
                  }`}
                  title={lang === "ar" ? "تفعيل أو إلغاء ضريبة القيمة المضافة" : "Toggle VAT"}
                >
                  14%
                </button>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="p-1 text-muted-foreground hover:text-destructive text-[10px] font-bold transition-colors cursor-pointer"
                    title={lang === "ar" ? "مسح السلة (F9)" : "Clear (F9)"}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Sleek Payment Methods Row (Top 4 + More Modal Trigger) */}
            <div className="grid grid-cols-5 gap-1">
              {/* 1. Cash */}
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("cash");
                  if (!tenderAmount || tenderAmount < finalTotal) setTenderAmount(finalTotal);
                }}
                className={`py-1 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  paymentMethod === "cash"
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-black shadow-xs ring-1 ring-emerald-500/30"
                    : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>💵</span>
                <span className="text-[10px] truncate">{lang === "ar" ? "كاش (F4)" : "Cash"}</span>
              </button>

              {/* 2. Visa / Card */}
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`py-1 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  paymentMethod === "card"
                    ? "bg-blue-500/15 border-blue-500/50 text-blue-800 dark:text-blue-300 font-black shadow-xs ring-1 ring-blue-500/30"
                    : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>💳</span>
                <span className="text-[10px] truncate">{lang === "ar" ? "فيزا (F5)" : "Card"}</span>
              </button>

              {/* 3. Instapay / Wallet */}
              <button
                type="button"
                onClick={() => setPaymentMethod("wallet")}
                className={`py-1 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  paymentMethod === "wallet"
                    ? "bg-purple-500/15 border-purple-500/50 text-purple-800 dark:text-purple-300 font-black shadow-xs ring-1 ring-purple-500/30"
                    : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>📱</span>
                <span className="text-[10px] truncate">{lang === "ar" ? "محفظة (F6)" : "Wallet"}</span>
              </button>

              {/* 4. Waffarha Voucher */}
              <button
                type="button"
                onClick={() => setPaymentMethod("waffarha_voucher")}
                className={`py-1 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  paymentMethod === "waffarha_voucher"
                    ? "bg-rose-500/15 border-rose-500/50 text-rose-800 dark:text-rose-300 font-black shadow-xs ring-1 ring-rose-500/30"
                    : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>🎟️</span>
                <span className="text-[10px] truncate">{lang === "ar" ? "وفرها (F7)" : "Voucher"}</span>
              </button>

              {/* 5. More Payment Methods & Split / Calculator Trigger */}
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="py-1 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-dashed border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title={lang === "ar" ? "عرض جميع طرق الدفع والحاسبة" : "More methods / Calculator"}
              >
                <span>⋯</span>
                <span className="text-[10px]">{lang === "ar" ? "المزيد" : "More"}</span>
              </button>
            </div>

            {/* Row 2b: Inline Cash Tender / Change Mini Bar (Only when cash selected) */}
            {paymentMethod === "cash" && finalTotal > 0 && (
              <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {lang === "ar" ? "المستلم:" : "Tender:"}
                  </span>
                  <input
                    type="number"
                    value={tenderAmount || ""}
                    onChange={(e) => setTenderAmount(Number(e.target.value))}
                    placeholder={String(finalTotal)}
                    className="w-18 px-1.5 py-0.5 text-xs text-center font-mono font-bold rounded-lg border border-emerald-500/40 bg-background text-foreground"
                  />
                  <span className="text-[9px] text-muted-foreground">ج.م</span>
                </div>

                {/* Quick Add buttons */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTenderAmount(finalTotal)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-background border hover:bg-muted"
                  >
                    {lang === "ar" ? "بالضبط" : "Exact"}
                  </button>
                  {[50, 100, 200, 500].map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setTenderAmount(b >= finalTotal ? b : finalTotal + b)}
                      className="px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-background border hover:bg-muted"
                    >
                      +{b}
                    </button>
                  ))}
                </div>

                <div className="text-end shrink-0">
                  <span className="text-[9px] text-muted-foreground block leading-none">
                    {lang === "ar" ? "الباقي:" : "Change:"}
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400">
                    {money(Math.max(0, (tenderAmount || finalTotal) - finalTotal))}
                  </span>
                </div>
              </div>
            )}

            {/* Row 2c: Inline Split Payment Bar (Only when split selected) */}
            {paymentMethod === "split" && finalTotal > 0 && (
              <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-xl bg-teal-500/10 border border-teal-500/25 text-xs animate-in fade-in duration-150">
                <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300">
                  {lang === "ar" ? "مجزأ:" : "Split:"}
                </span>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-[10px]">💵</span>
                  <input
                    type="number"
                    value={splitCashAmount || ""}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSplitCashAmount(val);
                      setSplitCardAmount(Math.max(0, finalTotal - val));
                    }}
                    placeholder="كاش"
                    className="w-16 px-1 py-0.5 text-xs text-center font-mono font-bold rounded-lg border border-teal-500/40 bg-background"
                  />
                  <span className="text-[10px]">💳</span>
                  <input
                    type="number"
                    value={splitCardAmount || ""}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSplitCardAmount(val);
                      setSplitCashAmount(Math.max(0, finalTotal - val));
                    }}
                    placeholder="فيزا"
                    className="w-16 px-1 py-0.5 text-xs text-center font-mono font-bold rounded-lg border border-teal-500/40 bg-background"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const half = Math.round(finalTotal / 2);
                    setSplitCashAmount(half);
                    setSplitCardAmount(finalTotal - half);
                  }}
                  className="text-[9px] font-bold underline text-teal-700 dark:text-teal-300 shrink-0"
                >
                  50/50
                </button>
              </div>
            )}

            {/* Row 3: Grand Net Total & Pay Action Bar (Unified & High Impact) */}
            <div className="flex items-stretch gap-2 pt-0.5">
              {/* Grand Total Box */}
              <div className="px-3 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-600/10 to-teal-500/15 border border-emerald-500/30 flex flex-col justify-center min-w-[130px] shrink-0">
                <span className="text-[9px] font-black uppercase text-emerald-800 dark:text-emerald-300 block leading-tight">
                  {lang === "ar" ? "الإجمالي الصافي" : "Total Net"}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight leading-none">
                    {money(finalTotal)}
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground leading-tight">
                  {cart.reduce((s, i) => s + i.quantity, 0)} {lang === "ar" ? "قطع / عبوات" : "items"}
                </span>
              </div>

              {/* Park Button */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleHoldTicket}
                className="px-2.5 py-2 rounded-2xl border border-border/80 bg-card hover:bg-muted text-foreground text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all disabled:opacity-40 cursor-pointer shrink-0 shadow-2xs"
                title={lang === "ar" ? "تعليق الطلب الحالي (F2)" : "Park current ticket (F2)"}
              >
                <Pause className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[9px]">{lang === "ar" ? "تعليق (F2)" : "Hold"}</span>
              </button>

              {/* Open Calc / Modal */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setShowPaymentModal(true)}
                className="px-2 py-2 rounded-2xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all disabled:opacity-40 cursor-pointer shrink-0 shadow-2xs"
                title={lang === "ar" ? "فتح حاسبة وتفاصيل الدفع" : "Open payment calculator"}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="text-[9px]">{lang === "ar" ? "حاسبة" : "Calc"}</span>
              </button>

              {/* Primary Pay & Print Button */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => {
                  if (paymentMethod === "cash" && tenderAmount > 0 && tenderAmount < finalTotal) {
                    setShowPaymentModal(true);
                  } else {
                    handleCompletePayment();
                  }
                }}
                className="flex-1 py-2 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <span className="text-base shrink-0">
                  {paymentMethods.find((m) => m.id === paymentMethod)?.icon || "💵"}
                </span>
                <span className="truncate">
                  {lang === "ar"
                    ? `سداد وطباعة (F1)`
                    : `Pay & Print (F1)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CHECKOUT & TENDER MODAL */}
      {/* ========================================================================= */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                <div>
                  <h3 className="font-black text-sm">
                    {lang === "ar" ? "تحصيل ودفع الفاتورة" : "Settle Order Payment"}
                  </h3>
                  <span className="text-[10px] opacity-80 font-mono">
                    {selectedBranch.ar} • {selectedCustomer.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="hover:opacity-80 p-1 text-primary-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Amount Due Banner */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase">
                  {lang === "ar" ? "المبلغ الإجمالي المستحق:" : "Total Amount Due:"}
                </span>
                <span className="text-2xl font-black text-primary font-mono">
                  {money(finalTotal)}
                </span>
              </div>

              {/* If Order from Platform (Talabat or other app), display summary */}
              {orderPlatform !== "direct" && (
                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {ORDER_PLATFORMS.find((p) => p.id === orderPlatform)?.icon || "🛵"}
                    </span>
                    <div>
                      <span className="font-bold text-xs text-orange-950 dark:text-orange-200 block">
                        {ORDER_PLATFORMS.find((p) => p.id === orderPlatform)?.name[lang === "ar" ? "ar" : "en"]}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {lang === "ar" ? "طلب تطبيق خارجي" : "Third-Party Aggregator Order"}
                      </span>
                    </div>
                  </div>
                  {orderRefNumber ? (
                    <span className="px-2.5 py-1 rounded-xl bg-background font-mono font-black text-xs text-orange-600 border border-orange-500/30 shadow-xs">
                      #{orderRefNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">
                      {lang === "ar" ? "بدون رقم مرجع" : "No ref #"}
                    </span>
                  )}
                </div>
              )}

              {/* Payment Methods Tabs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    {lang === "ar" ? "طريقة الدفع:" : "Payment Method:"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddPaymentModal(true)}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{lang === "ar" ? "إضافة طريقة دفع جديدة" : "Add Payment Method"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {paymentMethods.map((pm) => {
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(pm.id);
                          if (pm.id === "cash" && (!tenderAmount || tenderAmount < finalTotal)) {
                            setTenderAmount(finalTotal);
                          } else if (pm.id === "split") {
                            const half = Math.round(finalTotal / 2);
                            setSplitCashAmount(half);
                            setSplitCardAmount(finalTotal - half);
                          }
                        }}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? `${pm.badgeClass} ring-2 ring-primary/40 font-black shadow-sm scale-102`
                            : "bg-card border-border/70 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="text-xl">{pm.icon}</span>
                        <span className="text-xs leading-tight truncate max-w-full font-bold">
                          {pick(pm.name.ar, pm.name.en)}
                        </span>
                        {pm.shortcut && (
                          <span className="text-[9px] opacity-60 font-mono font-bold">
                            {pm.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1. Cash Calculator & Quick Bills */}
              {paymentMethod === "cash" && (
                <div className="space-y-3 p-3 rounded-2xl bg-muted/20 border border-border/70 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        {lang === "ar" ? "المبلغ المستلم من العميل:" : "Tendered Cash Amount:"}
                      </label>
                      <input
                        type="number"
                        value={tenderAmount || ""}
                        onChange={(e) => setTenderAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 text-lg font-mono font-black rounded-xl border border-border/80 bg-background focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="flex-1 text-end">
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        {lang === "ar" ? "الباقي للعميل (Change):" : "Change to Return:"}
                      </label>
                      <span className="text-2xl font-mono font-black text-emerald-600 block leading-tight">
                        {money(Math.max(0, tenderAmount - finalTotal))}
                      </span>
                    </div>
                  </div>

                  {/* Quick Bill presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => setTenderAmount(finalTotal)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-card border border-border/80 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                    >
                      {lang === "ar" ? "المبلغ بالضبط" : "Exact"}
                    </button>
                    {[50, 100, 200, 500, 1000].map((bill) => (
                      <button
                        type="button"
                        key={bill}
                        onClick={() => setTenderAmount(bill)}
                        className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-card border border-border/80 hover:bg-muted transition-all cursor-pointer"
                      >
                        +{bill}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Split Payment Calculator (Cash + Card) */}
              {paymentMethod === "split" && (
                <div className="space-y-3 p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                      <Split className="w-4 h-4 text-teal-600" />
                      <span>{lang === "ar" ? "توزيع المبلغ مجزأ:" : "Split Payment Distribution:"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const half = Math.round(finalTotal / 2);
                        setSplitCashAmount(half);
                        setSplitCardAmount(finalTotal - half);
                      }}
                      className="text-xs font-bold text-teal-700 underline cursor-pointer"
                    >
                      {lang === "ar" ? "تقسيم 50% كاش و 50% فيزا" : "50/50 Split"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl bg-background border border-border">
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        💵 {lang === "ar" ? "المبلغ نقداً (كاش):" : "Cash Portion:"}
                      </label>
                      <input
                        type="number"
                        value={splitCashAmount || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSplitCashAmount(val);
                          setSplitCardAmount(Math.max(0, finalTotal - val));
                        }}
                        className="w-full px-2 py-1 text-base font-mono font-bold rounded-lg border border-border focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-background border border-border">
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        💳 {lang === "ar" ? "المبلغ بالبطاقة (فيزا):" : "Card Portion:"}
                      </label>
                      <input
                        type="number"
                        value={splitCardAmount || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSplitCardAmount(val);
                          setSplitCashAmount(Math.max(0, finalTotal - val));
                        }}
                        className="w-full px-2 py-1 text-base font-mono font-bold rounded-lg border border-border focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-teal-500/20 font-bold">
                    <span>{lang === "ar" ? "المجموع الموزع:" : "Distributed Total:"}</span>
                    <span
                      className={`font-mono text-sm ${
                        splitCashAmount + splitCardAmount === finalTotal
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600"
                      }`}
                    >
                      {money(splitCashAmount + splitCardAmount)} / {money(finalTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Waffarha Voucher Code */}
              {paymentMethod === "waffarha_voucher" && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-red-600" />
                      <span>{lang === "ar" ? "رقم كود قسيمة وفرها (Waffarha Voucher):" : "Waffarha Voucher Code:"}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">Waffarha.com</span>
                  </div>
                  <input
                    type="text"
                    value={orderRefNumber}
                    onChange={(e) => setOrderRefNumber(e.target.value)}
                    placeholder="WFR-78900"
                    className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-red-500/40 bg-background text-start focus:outline-none"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-border bg-card text-xs font-bold hover:bg-secondary cursor-pointer"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={paymentMethod === "cash" && tenderAmount < finalTotal}
                  onClick={handleCompletePayment}
                  className="px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-lg disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === "ar" ? "تأكيد الدفع وطباعة الفاتورة" : "Confirm & Print Receipt"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3.5 ADD CUSTOM PAYMENT METHOD MODAL */}
      {/* ========================================================================= */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                <h3 className="font-black text-sm">
                  {lang === "ar" ? "إضافة طريقة دفع جديدة لنقاط البيع" : "Add POS Payment Method"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPaymentModal(false)}
                className="hover:opacity-80 p-1 text-primary-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground block">
                  {lang === "ar" ? "اسم طريقة الدفع (عربي) *" : "Method Name (Arabic) *"}
                </label>
                <input
                  type="text"
                  value={newPaymentForm.nameAr}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, nameAr: e.target.value })}
                  placeholder={lang === "ar" ? "مثال: فودافون كاش، شيك بنكي، نقاط قطاف..." : "e.g. Vodafone Cash"}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background font-bold focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground block">
                  {lang === "ar" ? "اسم طريقة الدفع (إنجليزي)" : "Method Name (English)"}
                </label>
                <input
                  type="text"
                  value={newPaymentForm.nameEn}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, nameEn: e.target.value })}
                  placeholder="e.g. Bank Cheque / Loyalty Points"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background font-bold focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">
                  {lang === "ar" ? "اختيار الأيقونة المميزة:" : "Select Icon:"}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {["💵", "💳", "📱", "🎟️", "⚡", "🏢", "🛍️", "🔄", "🏦", "🎁", "⭐", "🏷️"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewPaymentForm({ ...newPaymentForm, icon: emoji })}
                      className={`w-9 h-9 text-lg rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        newPaymentForm.icon === emoji
                          ? "bg-primary/20 border-primary ring-2 ring-primary/40 scale-110"
                          : "bg-muted/40 border-border hover:bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground block">
                  {lang === "ar" ? "وصف أو ملاحظات التسوية:" : "Settlement Note:"}
                </label>
                <input
                  type="text"
                  value={newPaymentForm.descriptionAr}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, descriptionAr: e.target.value })}
                  placeholder={lang === "ar" ? "مثال: تسوية دورية كل أسبوع، حساب بنكي رقم..." : "e.g. Weekly settlement"}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted font-bold cursor-pointer"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomPaymentMethod}
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-black shadow-md hover:opacity-90 cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{lang === "ar" ? "إضافة وحفظ الطريقة" : "Save Method"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. 80MM THERMAL RECEIPT MODAL */}
      {/* ========================================================================= */}
      {showReceiptModal && lastCompletedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-primary text-primary-foreground p-3.5 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                <h3 className="font-bold text-xs">
                  {lang === "ar" ? "معاينة الفاتورة الحرارية (80mm)" : "Thermal Receipt Preview"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="hover:opacity-80 p-1"
              >
                ✕
              </button>
            </div>

            {/* Authentic 80mm Receipt Content */}
            <div className="flex-1 overflow-y-auto p-5 font-mono text-black bg-white select-text space-y-3 text-xs leading-relaxed">
              {/* Receipt Header */}
              <div className="text-center space-y-1.5 border-b border-dashed border-zinc-400 pb-3">
                <div className="flex justify-center mb-1">
                  <img
                    src={settings.logoUrl || "/wazeer-logo.png"}
                    alt="وزير الحلو"
                    className="h-12 w-auto max-w-[160px] object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/wazeer-emblem.png";
                    }}
                  />
                </div>
                <h2 className="text-base font-black tracking-tight font-sans">
                  {settings.nameAr || "شركة وزير الحلو للحلويات والمواد الغذائية"}
                </h2>
                <p className="text-[11px] font-sans font-bold">Wazeer El-Helw Pastry & Desserts</p>
                <p className="text-[10px]">
                  {lastCompletedOrder.branch.ar}
                </p>
                <p className="text-[10px] font-mono">
                  Tel: {lastCompletedOrder.branch.phone || "+20 100 112 0000"}
                </p>
                <p className="text-[9px] text-zinc-600">
                  ب.ض: 492-810-332 • س.ت: 89412
                </p>
              </div>

              {/* Order Meta */}
              <div className="text-[10px] space-y-0.5 border-b border-dashed border-zinc-400 pb-2">
                <div className="flex justify-between">
                  <span>رقم الفاتورة:</span>
                  <span className="font-bold">{lastCompletedOrder.id}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span>التاريخ والوقت:</span>
                  {(() => {
                    const dtStr = formatOrderDateTimeEnglish(lastCompletedOrder.date);
                    const [dPart, tPart] = dtStr.includes(",")
                      ? dtStr.split(",").map((s) => s.trim())
                      : [dtStr, ""];
                    return (
                      <div className="font-mono text-end" dir="ltr">
                        <span className="font-semibold block">{dPart}</span>
                        {tPart && <span className="text-zinc-600 text-[9px] block">{tPart}</span>}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex justify-between">
                  <span>الكاشير:</span>
                  <span>{lastCompletedOrder.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>العميل:</span>
                  <span>{lastCompletedOrder.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>نوع الطلب:</span>
                  <span className="font-bold uppercase">{lastCompletedOrder.orderType}</span>
                </div>
                {lastCompletedOrder.orderPlatform && lastCompletedOrder.orderPlatform !== "direct" && (
                  <div className="border-t border-dashed border-zinc-400 pt-1 mt-1 space-y-0.5">
                    <div className="flex justify-between font-bold">
                      <span>منصة الطلب:</span>
                      <span className="text-black">{lastCompletedOrder.orderPlatformName || lastCompletedOrder.orderPlatform}</span>
                    </div>
                    {lastCompletedOrder.orderRefNumber && (
                      <div className="flex justify-between font-black bg-zinc-200 px-1.5 py-0.5 rounded text-black text-xs">
                        <span>مرجع الطلب (Ref #):</span>
                        <span className="font-mono">{lastCompletedOrder.orderRefNumber}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-1.5 border-b border-dashed border-zinc-400 pb-3">
                <div className="flex items-center justify-between text-[10px] font-bold border-b border-zinc-300 pb-1">
                  <span className="flex-1 text-start">الصنف</span>
                  <span className="w-14 text-center shrink-0">الكمية</span>
                  <span className="w-20 text-end shrink-0">الإجمالي</span>
                </div>

                {lastCompletedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[10px]">
                    <span className="flex-1 text-start truncate pe-2 font-sans font-bold">
                      {pick(item.product.name.ar, item.product.name.en)}
                    </span>
                    <span className="w-14 text-center font-mono shrink-0">
                      {item.quantity}
                    </span>
                    <span className="w-20 text-end font-bold font-mono shrink-0">
                      {(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-zinc-400 pb-3">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span>{lastCompletedOrder.subtotal.toFixed(2)} ج.م</span>
                </div>
                {lastCompletedOrder.discount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>الخصم:</span>
                    <span>-{lastCompletedOrder.discount.toFixed(2)} ج.م</span>
                  </div>
                )}
                {lastCompletedOrder.vat > 0 && (
                  <div className="flex justify-between">
                    <span>ضريبة القيمة المضافة (14%):</span>
                    <span>+{lastCompletedOrder.vat.toFixed(2)} ج.م</span>
                  </div>
                )}
                {lastCompletedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>خدمة التوصيل:</span>
                    <span>+{lastCompletedOrder.deliveryFee.toFixed(2)} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1 border-t border-zinc-400">
                  <span>الصافي الإجمالي:</span>
                  <span>{lastCompletedOrder.total.toFixed(2)} ج.م</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="text-[10px] space-y-0.5 border-b border-dashed border-zinc-400 pb-2">
                <div className="flex justify-between">
                  <span>طريقة الدفع:</span>
                  <span className="font-bold uppercase">
                    {lastCompletedOrder.paymentMethodLabel || lastCompletedOrder.paymentMethod}
                  </span>
                </div>
                {lastCompletedOrder.splitBreakdown && (
                  <div className="bg-zinc-100 p-1.5 rounded space-y-0.5 my-1 text-[9px] font-sans font-bold">
                    <div className="flex justify-between">
                      <span>💵 نقداً (كاش):</span>
                      <span className="font-mono">{lastCompletedOrder.splitBreakdown.cash.toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span>💳 بطاقة / فيزا:</span>
                      <span className="font-mono">{lastCompletedOrder.splitBreakdown.card.toFixed(2)} ج.م</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>المدفوع:</span>
                  <span>{lastCompletedOrder.tendered.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>المتبقي:</span>
                  <span>{lastCompletedOrder.change.toFixed(2)} ج.م</span>
                </div>
              </div>

              {/* ZATCA / ETA Real Scannable QR Code & Footer */}
              <div className="text-center pt-2 space-y-2">
                <div className="flex justify-center">
                  <div className="p-2 border border-zinc-400 rounded-xl inline-block bg-white shadow-2xs">
                    <RealQrCode
                      value={`مصلحة الضرائب المصرية | الفاتورة الإلكترونية\nالمورد: ${settings.nameAr || "شركة وزير الحلو للحلويات والمواد الغذائية"}\nرقم التسجيل: 492-810-332\nفاتورة: ${lastCompletedOrder.id}\nالتاريخ: ${lastCompletedOrder.date}\nالإجمالي: ${lastCompletedOrder.total.toFixed(2)} ج.م\nالضريبة: ${lastCompletedOrder.vat.toFixed(2)} ج.م\nالفرع: ${lastCompletedOrder.branch.ar}`}
                      size={110}
                      level="M"
                      bordered={false}
                      title={`فاتورة ضريبية إلكترونية معتمدة ${lastCompletedOrder.id}`}
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-sans font-black">
                    شكراً لزيارتكم — وزير الحلو أصل الطعم الملكي!
                  </p>
                  <p className="text-[9px] text-zinc-600 font-mono">
                    *** فاتورة ضريبية إلكترونية معتمدة (ETA E-Receipt) ***
                  </p>
                  <p className="text-[8px] text-zinc-400 font-mono">
                    امسح الرمز للتحقق من صحة الفاتورة الضريبية
                  </p>
                </div>
              </div>
            </div>

            {/* Receipt Modal Footer Actions */}
            <div className="p-3 bg-muted/30 border-t border-border/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "طباعة الإيصال" : "Print Receipt"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowReceiptModal(false);
                  searchInputRef.current?.focus();
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "طلب جديد" : "New Order"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PARKED / HELD ORDERS MODAL */}
      {/* ========================================================================= */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pause className="w-4 h-4" />
                <h3 className="font-bold text-sm">
                  {lang === "ar" ? "الفواتير المعلقة" : "Parked Orders"} ({visibleHeldOrders.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHeldModal(false)}
                className="hover:opacity-80 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-2">
              {visibleHeldOrders.map((held) => (
                <div
                  key={held.id}
                  className="p-3 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-xs text-foreground">
                        {held.orderNumber} • {held.customerName}
                      </span>
                      {held.orderPlatform && held.orderPlatform !== "direct" && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30">
                          {ORDER_PLATFORMS.find((p) => p.id === held.orderPlatform)?.icon}{" "}
                          {ORDER_PLATFORMS.find((p) => p.id === held.orderPlatform)?.name[lang === "ar" ? "ar" : "en"]}
                          {held.orderRefNumber && ` #${held.orderRefNumber}`}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      {held.timestamp} • {held.items.length} {lang === "ar" ? "أصناف" : "items"}
                    </span>
                    <span className="text-xs font-black text-primary font-mono block">
                      {money(held.subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleResumeHeldTicket(held)}
                      className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:opacity-95"
                    >
                      {lang === "ar" ? "استئناف" : "Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeldOrders((prev) => prev.filter((h) => h.id !== held.id))}
                      className="p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {visibleHeldOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-xs font-bold">
                  {lang === "ar"
                    ? isCashierRole
                      ? "لا توجد فواتير معلقة خاصة بك حالياً"
                      : "لا توجد فواتير معلقة حالياً"
                    : isCashierRole
                    ? "No parked tickets for your shift"
                    : "No parked tickets found"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SHIFT & CASH DRAWER SUMMARY MODAL (WITH MULTI-USER COMPARISON) */}
      {/* ========================================================================= */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">
                    {lang === "ar" ? "تقرير الوردية وحركة الصندوق النقدي" : "Shift & Cash Drawer Summary"}
                  </h3>
                  <p className="text-[11px] opacity-80">
                    📍 {pick(selectedBranch.ar, selectedBranch.en)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="hover:opacity-80 p-1 text-primary-foreground"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs: My Shift vs All Branch Cashiers
                Hidden for plain cashiers — they only see their own shift */}
            {!isCashierRole && (
              <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShiftModalTab("my_shift")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    shiftModalTab === "my_shift"
                      ? "bg-primary text-primary-foreground font-black shadow-xs"
                      : "bg-card border border-border/70 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span>{activeCashier.avatar}</span>
                  <span>{lang === "ar" ? `ورديتي (${pick(activeCashier.name.ar, activeCashier.name.en)})` : `My Shift (${pick(activeCashier.name.ar, activeCashier.name.en)})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShiftModalTab("all_cashiers")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    shiftModalTab === "all_cashiers"
                      ? "bg-primary text-primary-foreground font-black shadow-xs"
                      : "bg-card border border-border/70 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{lang === "ar" ? "كاشيرات الفرع" : "All Branch Cashiers"}</span>
                </button>
              </div>
            )}

            {/* Tab 1: Current Active User Shift */}
            {shiftModalTab === "my_shift" && (
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-1 bg-card rounded-xl border border-border/60">{activeCashier.avatar}</span>
                    <div>
                      <h4 className="text-xs font-black text-foreground">
                        {pick(activeCashier.name.ar, activeCashier.name.en)}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">
                        {pick(activeCashier.roleLabel.ar, activeCashier.roleLabel.en)} • كود {activeCashier.code}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    {lang === "ar" ? "وردية نشطة" : "Active Shift"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-muted/30 border border-border/70">
                    <span className="text-muted-foreground block text-[10px]">
                      {lang === "ar" ? "رقم الوردية:" : "Shift ID:"}
                    </span>
                    <span className="font-black font-mono">{activeShift.shiftNumber}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/30 border border-border/70">
                    <span className="text-muted-foreground block text-[10px]">
                      {lang === "ar" ? "وقت البداية:" : "Started At:"}
                    </span>
                    <span className="font-black font-mono">{activeShift.openedAt}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-xl bg-card border border-border/70">
                    <span>{lang === "ar" ? "عهدة بداية الوردية (الافتتاحي):" : "Opening Cash Balance:"}</span>
                    <span className="font-black font-mono">{money(activeShift.openingCash)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-card border border-border/70">
                    <span>{lang === "ar" ? "مبيعات نقدية (Cash):" : "Cash Sales:"}</span>
                    <span className="font-black font-mono text-emerald-600">{money(activeShift.cashSales)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-card border border-border/70">
                    <span>{lang === "ar" ? "مبيعات شبكة وفيزا (Card):" : "Card POS Sales:"}</span>
                    <span className="font-black font-mono text-blue-600">{money(activeShift.cardSales)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-card border border-border/70">
                    <span>{lang === "ar" ? "محافظ إلكترونية (Wallets):" : "Digital Wallets:"}</span>
                    <span className="font-black font-mono text-purple-600">{money(activeShift.walletSales)}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-2xl bg-primary/10 border border-primary/30 font-black text-primary">
                    <span>{lang === "ar" ? "إجمالي مبيعات ورديتي:" : "My Total Shift Sales:"}</span>
                    <span className="font-mono text-sm">{money(activeShift.totalSales)} ({activeShift.ordersCount} {lang === "ar" ? "طلب" : "orders"})</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 font-black text-emerald-700 dark:text-emerald-300">
                    <span>{lang === "ar" ? "النقدية الفعلية المتوقعة بدرج الكاشير:" : "Expected Cash in Drawer:"}</span>
                    <span className="font-mono text-sm">
                      {money(activeShift.openingCash + activeShift.cashSales)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      toast.success(
                        lang === "ar"
                          ? `تمت طباعة تقرير X-Report للكاشير ${pick(activeCashier.name.ar, activeCashier.name.en)} بنجاح`
                          : `X-Report printed for cashier ${pick(activeCashier.name.ar, activeCashier.name.en)}`
                      );
                      setShowShiftModal(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-md cursor-pointer"
                  >
                    {lang === "ar" ? "طباعة ملخص الوردية (X-Report)" : "Print X-Report"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toast.info(
                        lang === "ar"
                          ? "تم تسجيل إغلاق الوردية وتصفية عهدة الكاشير"
                          : "Shift closed and cash drawer reconciled"
                      );
                      setShowShiftModal(false);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-500/20 cursor-pointer"
                  >
                    {lang === "ar" ? "تقفيل الوردية" : "Close Shift"}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: All Branch Cashiers Comparison — managers/supervisors only */}
            {shiftModalTab === "all_cashiers" && !isCashierRole && (
              <div className="p-4 space-y-3 overflow-y-auto">
                <div className="text-xs text-muted-foreground">
                  {lang === "ar"
                    ? `إحصائيات مبيعات جميع الكاشيرات والمشغلين في ${pick(selectedBranch.ar, selectedBranch.en)}:`
                    : `Sales breakdown of all cashiers and operators at ${pick(selectedBranch.ar, selectedBranch.en)}:`}
                </div>

                <div className="space-y-2">
                  {branchCashiers.map((cashier) => {
                    const shift = userShifts[cashier.id];
                    const salesTotal = shift?.totalSales || 0;
                    const ordersCount = shift?.ordersCount || 0;
                    const cash = shift?.cashSales || 0;
                    const card = shift?.cardSales || 0;
                    const isCurrent = activeCashier.id === cashier.id;

                    return (
                      <div
                        key={cashier.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          isCurrent
                            ? "bg-primary/10 border-primary/50 shadow-xs"
                            : "bg-card border-border/70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl p-1 rounded-lg bg-muted/60">{cashier.avatar}</span>
                            <div>
                              <span className="font-black text-xs text-foreground block truncate">
                                {pick(cashier.name.ar, cashier.name.en)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {pick(cashier.roleLabel.ar, cashier.roleLabel.en)} • كود {cashier.code}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isCurrent ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[9px]">
                                {lang === "ar" ? "الكاشير النشط" : "Active"}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveCashier(cashier);
                                  toast.success(
                                    lang === "ar"
                                      ? `تم التبديل إلى الكاشير: ${pick(cashier.name.ar, cashier.name.en)}`
                                      : `Switched to cashier: ${pick(cashier.name.ar, cashier.name.en)}`
                                  );
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                              >
                                {lang === "ar" ? "تبديل إليه" : "Switch"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-2 border-t border-border/50 font-mono">
                          <div className="p-1 rounded-lg bg-muted/40">
                            <span className="text-muted-foreground block">{lang === "ar" ? "إجمالي المبيعات" : "Sales"}</span>
                            <span className="font-bold text-emerald-600">{money(salesTotal)}</span>
                          </div>
                          <div className="p-1 rounded-lg bg-muted/40">
                            <span className="text-muted-foreground block">{lang === "ar" ? "نقدية (كاش)" : "Cash"}</span>
                            <span className="font-bold text-foreground">{money(cash)}</span>
                          </div>
                          <div className="p-1 rounded-lg bg-muted/40">
                            <span className="text-muted-foreground block">{lang === "ar" ? "فيزا وشبكة" : "Card"}</span>
                            <span className="font-bold text-blue-600">{money(card)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. CASHIER / USER SWITCHER MODAL (MULTI-USER SUPPORT) */}
      {/* ========================================================================= */}
      {showCashierSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">
                    {lang === "ar" ? "تبديل الكاشير والمشغل" : "Switch Cashier / User"}
                  </h3>
                  <p className="text-[11px] opacity-80">
                    📍 {pick(selectedBranch.ar, selectedBranch.en)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCashierSwitchModal(false);
                  setShowNewCashierForm(false);
                }}
                className="hover:opacity-80 p-1 text-primary-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {/* Quick PIN Code Switch */}
              <div className="p-3 rounded-2xl bg-muted/30 border border-border/70 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="password"
                  maxLength={6}
                  value={cashierPinInput}
                  onChange={(e) => {
                    const pin = e.target.value;
                    setCashierPinInput(pin);
                    const matched = branchCashiers.find((c) => c.code === pin);
                    if (matched) {
                      setActiveCashier(matched);
                      setCashierPinInput("");
                      setShowCashierSwitchModal(false);
                      toast.success(
                        lang === "ar"
                          ? `تم تسجيل الدخول بالكاشير: ${pick(matched.name.ar, matched.name.en)}`
                          : `Switched to cashier: ${pick(matched.name.ar, matched.name.en)}`
                      );
                    }
                  }}
                  placeholder={
                    lang === "ar"
                      ? "أدخل كود / PIN الكاشير للتبديل الفوري (مثال: 101, 102)..."
                      : "Enter Cashier PIN code for quick switch (e.g. 101, 102)..."
                  }
                  className="flex-1 bg-background border border-border/80 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:border-primary focus:outline-none"
                />
              </div>

              {/* Cashiers List for this Branch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                  <span>{lang === "ar" ? "كاشيرات هذا الفرع:" : "Cashiers at this Branch:"}</span>
                  <span>{branchCashiers.length} {lang === "ar" ? "مستخدمين" : "users"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {branchCashiers.map((cashier) => {
                    const isCurrent = activeCashier.id === cashier.id;
                    const shift = userShifts[cashier.id];
                    const salesTotal = shift?.totalSales || 0;
                    const ordersCount = shift?.ordersCount || 0;

                    return (
                      <div
                        key={cashier.id}
                        onClick={() => {
                          if (isCashierRole && !isCurrent) {
                            toast.info(
                              lang === "ar"
                                ? `يرجى إدخال كود PIN للكاشير (${pick(cashier.name.ar, cashier.name.en)}) في الحقل بالأعلى للتبديل`
                                : `Please enter PIN code above to switch to ${pick(cashier.name.en, cashier.name.ar)}`
                            );
                            return;
                          }
                          setActiveCashier(cashier);
                          setShowCashierSwitchModal(false);
                          toast.success(
                            lang === "ar"
                              ? `تم التبديل إلى: ${pick(cashier.name.ar, cashier.name.en)}`
                              : `Switched to: ${pick(cashier.name.ar, cashier.name.en)}`
                          );
                        }}
                        className={`p-3 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                          isCurrent
                            ? "bg-primary/10 border-primary/60 shadow-md ring-2 ring-primary/30"
                            : "bg-card border-border/70 hover:bg-muted/40 hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl p-1.5 rounded-xl bg-muted/60 border border-border/60 shrink-0">
                              {cashier.avatar}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-foreground truncate">
                                {pick(cashier.name.ar, cashier.name.en)}
                              </h4>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {pick(cashier.roleLabel.ar, cashier.roleLabel.en)} • كود {cashier.code}
                              </span>
                            </div>
                          </div>

                          {isCurrent ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[9px] shrink-0 shadow-xs">
                              {lang === "ar" ? "النشط حالياً" : "Active"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-primary font-bold shrink-0 hover:underline">
                              {isCashierRole
                                ? (lang === "ar" ? "🔒 بالرمز" : "🔒 PIN")
                                : (lang === "ar" ? "اختيار ↵" : "Switch ↵")}
                            </span>
                          )}
                        </div>

                        {/* Shift amounts & orders metrics - only visible for own card or for supervisor/managers */}
                        {(!isCashierRole || isCurrent) ? (
                          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-muted-foreground">
                              {ordersCount} {lang === "ar" ? "طلب" : "orders"}
                            </span>
                            <span className="font-black text-emerald-600">
                              {money(salesTotal)}
                            </span>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{lang === "ar" ? "كاشير مناوب" : "On Duty Cashier"}</span>
                            <span className="font-mono text-[9px] bg-muted px-1.5 py-0.5 rounded font-bold">
                              🔒 {lang === "ar" ? "محمي بالرمز" : "PIN Protected"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add New Cashier Form Toggle (Managers & Supervisors Only) */}
              {!isCashierRole && (!showNewCashierForm ? (
                <button
                  type="button"
                  onClick={() => setShowNewCashierForm(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-border/80 hover:border-primary text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-primary" />
                  <span>{lang === "ar" ? "+ إضافة كاشير جديد لهذا الفرع" : "+ Add Cashier to this Branch"}</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-foreground">
                      {lang === "ar" ? "بيانات الكاشير الجديد:" : "New Cashier Details:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewCashierForm(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">
                        {lang === "ar" ? "الاسم بالعربي:" : "Name (Arabic):"}
                      </label>
                      <input
                        type="text"
                        value={newCashierForm.nameAr}
                        onChange={(e) => setNewCashierForm({ ...newCashierForm, nameAr: e.target.value })}
                        placeholder="مثال: يوسف حسن"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border/80 bg-background font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">
                        {lang === "ar" ? "الاسم بالإنجليزي:" : "Name (English):"}
                      </label>
                      <input
                        type="text"
                        value={newCashierForm.nameEn}
                        onChange={(e) => setNewCashierForm({ ...newCashierForm, nameEn: e.target.value })}
                        placeholder="e.g. Youssef Hassan"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border/80 bg-background font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">
                        {lang === "ar" ? "كود / PIN الكاشير:" : "PIN / Code:"}
                      </label>
                      <input
                        type="text"
                        value={newCashierForm.code}
                        onChange={(e) => setNewCashierForm({ ...newCashierForm, code: e.target.value })}
                        placeholder="مثال: 105"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border/80 bg-background font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">
                        {lang === "ar" ? "الدور الوظيفي:" : "Role:"}
                      </label>
                      <select
                        value={newCashierForm.role}
                        onChange={(e) => setNewCashierForm({ ...newCashierForm, role: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border/80 bg-background font-bold text-xs"
                      >
                        <option value="cashier">{lang === "ar" ? "كاشير صالة" : "Hall Cashier"}</option>
                        <option value="lead_cashier">{lang === "ar" ? "كاشير رئيسي" : "Lead Cashier"}</option>
                        <option value="supervisor">{lang === "ar" ? "مشرف وردية" : "Supervisor"}</option>
                        <option value="branch_manager">{lang === "ar" ? "مدير الفرع" : "Branch Manager"}</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!newCashierForm.nameAr.trim()) {
                        toast.error(lang === "ar" ? "يرجى كتابة اسم الكاشير" : "Please enter cashier name");
                        return;
                      }
                      const newId = `usr_${selectedBranch.id}_${Date.now()}`;
                      const code = newCashierForm.code || String(Math.floor(100 + Math.random() * 900));
                      const roleLabel =
                        newCashierForm.role === "lead_cashier"
                          ? { ar: "كاشير رئيسي", en: "Lead Cashier" }
                          : newCashierForm.role === "supervisor"
                          ? { ar: "مشرف وردية", en: "Shift Supervisor" }
                          : newCashierForm.role === "branch_manager"
                          ? { ar: "مدير الفرع", en: "Branch Manager" }
                          : { ar: "كاشير صالة", en: "Hall Cashier" };

                      const created: PosCashierUser = {
                        id: newId,
                        branchId: selectedBranch.id,
                        name: {
                          ar: newCashierForm.nameAr.trim(),
                          en: newCashierForm.nameEn.trim() || newCashierForm.nameAr.trim(),
                        },
                        code,
                        role: newCashierForm.role,
                        roleLabel,
                        avatar: "👨‍🍳",
                      };

                      const updatedAll = [...allCashiers, created];
                      setAllCashiers(updatedAll);
                      try {
                        localStorage.setItem("pos_all_cashiers_v2", JSON.stringify(updatedAll));
                      } catch {}

                      setActiveCashier(created);
                      setShowNewCashierForm(false);
                      setShowCashierSwitchModal(false);
                      setNewCashierForm({ nameAr: "", nameEn: "", code: "", role: "cashier" });
                      toast.success(
                        lang === "ar"
                          ? `تمت إضافة الكاشير "${created.name.ar}" وبدء الوردية بنجاح!`
                          : `Cashier "${created.name.en}" added and activated successfully!`
                      );
                    }}
                    className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-sm hover:opacity-95 cursor-pointer"
                  >
                    {lang === "ar" ? "حفظ وتفعيل الكاشير فوراً" : "Save & Activate Cashier"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. CASHIER ORDERS LOG MODAL ("طلباتي") */}
      {/* ========================================================================= */}
      {showMyOrdersModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">
                    {isCashierRole
                      ? (lang === "ar" ? "سجل طلباتي في الوردية" : "My Shift Orders Log")
                      : (lang === "ar" ? "سجل طلبات وفواتير الكاشير" : "Cashier Orders & Invoices Log")}
                  </h3>
                  <p className="text-[11px] opacity-85">
                    {pick(activeCashier.name.ar, activeCashier.name.en)} • 📍 {pick(selectedBranch.ar, selectedBranch.en)}
                    {isCashierRole && ` • ${lang === "ar" ? "طلباتك الخاصة فقط" : "Your own orders only"}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMyOrdersModal(false)}
                className="hover:opacity-80 p-1 text-primary-foreground"
              >
                ✕
              </button>
            </div>

            {/* Filter Mode & Search */}
            <div className="p-4 border-b border-border/70 space-y-3 bg-muted/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* 2-Way View Filter / Cashier Badge */}
                {isCashierRole ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{lang === "ar" ? "طلباتي فقط" : "My Orders Only"}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground font-mono text-[10px] font-black">
                      {myOrders.length}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
                    <button
                      type="button"
                      onClick={() => setOrdersViewMode("my_orders")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        ordersViewMode === "my_orders"
                          ? "bg-primary text-primary-foreground font-black shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{lang === "ar" ? "طلباتي فقط" : "My Orders"}</span> ({myOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdersViewMode("all_branch")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        ordersViewMode === "all_branch"
                          ? "bg-primary text-primary-foreground font-black shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{lang === "ar" ? "كل طلبات الفرع" : "All Branch Orders"}</span> ({branchOrders.length})
                    </button>
                  </div>
                )}

                {/* Orders Search Input */}
                <div className="relative min-w-52">
                  <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={ordersSearchQuery}
                    onChange={(e) => setOrdersSearchQuery(e.target.value)}
                    placeholder={lang === "ar" ? "بحث برقم الفاتورة أو العميل..." : "Search invoice # or customer..."}
                    className="w-full ps-8 pe-3 py-1.5 text-xs rounded-xl border border-border/80 bg-background focus:border-primary focus:outline-none font-semibold"
                  />
                </div>
              </div>

              {/* Summary KPIs for Current Selection */}
              {(() => {
                const currentList = isCashierRole ? myOrders : (ordersViewMode === "my_orders" ? myOrders : branchOrders);
                const totalSales = currentList.reduce((acc, o) => acc + o.total, 0);
                const cashSales = currentList
                  .filter((o) => o.paymentMethod === "cash")
                  .reduce((acc, o) => acc + o.total, 0);
                const cardSales = currentList
                  .filter((o) => o.paymentMethod === "card" || o.paymentMethod === "valu")
                  .reduce((acc, o) => acc + o.total, 0);

                return (
                  <div className="grid grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-card border border-border/70 text-center">
                      <span className="text-[10px] text-muted-foreground block">
                        {isCashierRole || ordersViewMode === "my_orders" ? (lang === "ar" ? "إجمالي مبيعاتي" : "My Total Sales") : (lang === "ar" ? "إجمالي مبيعات الفرع" : "Branch Total Sales")}
                      </span>
                      <span className="font-black text-emerald-600 font-mono text-sm block">
                        {money(totalSales)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-border/70 text-center">
                      <span className="text-[10px] text-muted-foreground block">
                        {lang === "ar" ? "نقدية بالكاش" : "Cash Sales"}
                      </span>
                      <span className="font-bold text-foreground font-mono text-sm block">
                        {money(cashSales)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-border/70 text-center">
                      <span className="text-[10px] text-muted-foreground block">
                        {lang === "ar" ? "شبكة وفيزا" : "Card / POS"}
                      </span>
                      <span className="font-bold text-blue-600 font-mono text-sm block">
                        {money(cardSales)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {(() => {
                const baseList = isCashierRole ? myOrders : (ordersViewMode === "my_orders" ? myOrders : branchOrders);
                const q = ordersSearchQuery.toLowerCase().trim();
                const filtered = baseList.filter((o) => {
                  if (!q) return true;
                  return (
                    o.id.toLowerCase().includes(q) ||
                    o.customer.name.toLowerCase().includes(q) ||
                    (o.cashierName && o.cashierName.toLowerCase().includes(q)) ||
                    (o.orderRefNumber && o.orderRefNumber.toLowerCase().includes(q))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 text-muted-foreground text-xs font-bold space-y-1">
                      <Receipt className="w-10 h-10 opacity-30 mx-auto mb-1 stroke-[1.2]" />
                      <p>{lang === "ar" ? "لا توجد فواتير مطابقة" : "No matching orders found"}</p>
                    </div>
                  );
                }

                return filtered.map((ord) => {
                  const platObj = ORDER_PLATFORMS.find((p) => p.id === ord.orderPlatform);
                  return (
                    <div
                      key={ord.id}
                      className="p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-foreground font-mono">
                            {ord.id}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted font-bold text-muted-foreground">
                            {ord.orderType}
                          </span>
                          {ord.orderPlatform && ord.orderPlatform !== "direct" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-700 dark:text-orange-300 font-bold border border-orange-500/30">
                              {platObj?.icon} {platObj?.name[lang === "ar" ? "ar" : "en"]}
                              {ord.orderRefNumber && ` #${ord.orderRefNumber}`}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                            👤 {ord.cashierName}
                          </span>
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                          <span>{ord.date}</span>
                          <span>•</span>
                          <span>{ord.customer.name}</span>
                          <span>•</span>
                          <span>{ord.items.length} {lang === "ar" ? "أصناف" : "items"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="text-end">
                          <span className="text-sm font-black text-foreground font-mono block">
                            {money(ord.total)}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-bold">
                            {ord.paymentMethodLabel || ord.paymentMethod}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setLastCompletedOrder(ord);
                            setShowReceiptModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-border/80 hover:border-primary hover:bg-primary/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title={lang === "ar" ? "معاينة وطباعة الفاتورة" : "Preview & Print Receipt"}
                        >
                          <Printer className="w-3.5 h-3.5 text-primary" />
                          <span>{lang === "ar" ? "إيصال" : "Receipt"}</span>
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CUSTOMER SELECTOR MODAL */}
      {/* ========================================================================= */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <h3 className="font-bold text-sm">
                  {lang === "ar" ? "اختيار العميل أو الحساب" : "Select Customer Profile"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="hover:opacity-80 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Default Cash Customer */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer({
                    name: lang === "ar" ? "عميل نقدي / صالة" : "Walk-in Guest",
                    phone: "",
                  });
                  setShowCustomerModal(false);
                }}
                className="w-full p-3 rounded-2xl border border-border/80 hover:border-primary text-start flex items-center justify-between transition-colors bg-muted/20"
              >
                <div>
                  <span className="font-black text-xs block text-foreground">
                    {lang === "ar" ? "عميل نقدي / صالة (افتراضي)" : "Walk-in Guest (Default)"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {lang === "ar" ? "بدون تسجيل بيانات" : "Standard walk-in customer"}
                  </span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </button>

              {/* Registered Customers */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {defaultCustomers.map((cust) => (
                  <button
                    type="button"
                    key={cust.code}
                    onClick={() => {
                      setSelectedCustomer({
                        name: pick(cust.name.ar, cust.name.en),
                        phone: cust.phone || "",
                      });
                      setShowCustomerModal(false);
                    }}
                    className="w-full p-3 rounded-2xl border border-border/60 hover:border-primary text-start flex items-center justify-between transition-colors bg-card hover:bg-muted/30"
                  >
                    <div>
                      <span className="font-bold text-xs block text-foreground">
                        {pick(cust.name.ar, cust.name.en)}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {cust.code} • {cust.phone}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
