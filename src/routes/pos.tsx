import { useState, useMemo, useEffect, useRef } from "react";
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
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { products as defaultCatalogProducts, partners as defaultCustomers } from "@/lib/demo-data";
import { useSalesStore, type BizDocument, type InvoiceItem } from "@/lib/documents-store";
import { useCompanySettings } from "@/lib/settings-store";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

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

export const INITIAL_CASHIER_SHIFTS: Record<string, CashierShiftData> = {
  usr_korba_1: {
    shiftNumber: "SHIFT-KB-101",
    openedAt: "08:30 ص",
    openingCash: 1500,
    totalSales: 5420,
    cashSales: 3420,
    cardSales: 1600,
    walletSales: 400,
    ordersCount: 14,
  },
  usr_korba_2: {
    shiftNumber: "SHIFT-KB-102",
    openedAt: "11:00 ص",
    openingCash: 1000,
    totalSales: 2850,
    cashSales: 1650,
    cardSales: 1200,
    walletSales: 0,
    ordersCount: 7,
  },
  usr_korba_3: {
    shiftNumber: "SHIFT-KB-103",
    openedAt: "03:00 م",
    openingCash: 1000,
    totalSales: 1120,
    cashSales: 820,
    cardSales: 300,
    walletSales: 0,
    ordersCount: 3,
  },
  usr_korba_4: {
    shiftNumber: "SHIFT-KB-100",
    openedAt: "08:00 ص",
    openingCash: 2000,
    totalSales: 3200,
    cashSales: 2100,
    cardSales: 1100,
    walletSales: 0,
    ordersCount: 8,
  },
  usr_maadi_1: {
    shiftNumber: "SHIFT-MD-201",
    openedAt: "09:00 ص",
    openingCash: 1500,
    totalSales: 4100,
    cashSales: 2700,
    cardSales: 1400,
    walletSales: 0,
    ordersCount: 10,
  },
  usr_maadi_2: {
    shiftNumber: "SHIFT-MD-202",
    openedAt: "12:00 م",
    openingCash: 1000,
    totalSales: 1950,
    cashSales: 1150,
    cardSales: 800,
    walletSales: 0,
    ordersCount: 5,
  },
  usr_tagamoa_1: {
    shiftNumber: "SHIFT-TG-301",
    openedAt: "09:30 ص",
    openingCash: 1500,
    totalSales: 6300,
    cashSales: 3800,
    cardSales: 2500,
    walletSales: 0,
    ordersCount: 16,
  },
  usr_tagamoa_2: {
    shiftNumber: "SHIFT-TG-302",
    openedAt: "01:00 م",
    openingCash: 1000,
    totalSales: 2400,
    cashSales: 1600,
    cardSales: 800,
    walletSales: 0,
    ordersCount: 6,
  },
  usr_coast_1: {
    shiftNumber: "SHIFT-CST-401",
    openedAt: "10:00 ص",
    openingCash: 1500,
    totalSales: 3800,
    cashSales: 2000,
    cardSales: 1800,
    walletSales: 0,
    ordersCount: 9,
  },
  usr_kitchen_1: {
    shiftNumber: "SHIFT-KT-501",
    openedAt: "07:00 ص",
    openingCash: 2500,
    totalSales: 8900,
    cashSales: 4200,
    cardSales: 4700,
    walletSales: 0,
    ordersCount: 22,
  },
};

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

export const INITIAL_ORDERS_HISTORY: PosCompletedOrder[] = [
  {
    id: "INV-POS-10482",
    date: "2026-09-29, 11:22:15 ص",
    branch: POS_BRANCHES[0]!,
    cashierId: "usr_korba_1",
    cashierName: "أحمد سالم",
    customer: { name: "عميل نقدي / صالة", phone: "" },
    items: [
      {
        id: "init-1",
        product: {
          sku: "RICE-PST",
          name: { ar: "رز بلبن بستاشيو", en: "Rice Pudding Pistachio" },
          category: "عشاق الرز",
          price: 80,
          stock: 60,
          unit: { ar: "علبة", en: "box" },
          image: "/products/rice-pistachio.jpg",
        },
        quantity: 2,
        unitPrice: 80,
        discount: 0,
      },
      {
        id: "init-2",
        product: {
          sku: "KSH-MNG",
          name: { ar: "قشطوطة مانجو", en: "Kashtouta Mango" },
          category: "القشطوطة",
          price: 80,
          stock: 92,
          unit: { ar: "علبة", en: "box" },
          image: "/products/kashtouta-mango.jpg",
        },
        quantity: 1,
        unitPrice: 80,
        discount: 0,
      },
    ],
    subtotal: 240,
    vat: 33.6,
    discount: 0,
    deliveryFee: 0,
    total: 273.6,
    paymentMethod: "cash",
    tendered: 300,
    change: 26.4,
    orderType: "takeaway",
    orderPlatform: "direct",
  },
  {
    id: "INV-POS-10481",
    date: "2026-09-29, 11:14:40 ص",
    branch: POS_BRANCHES[0]!,
    cashierId: "usr_korba_1",
    cashierName: "أحمد سالم",
    customer: { name: "م. محمد الشريف", phone: "01002345678" },
    items: [
      {
        id: "init-3",
        product: {
          sku: "BOX-ROYAL-1KG",
          name: { ar: "بوكس مشكل ملوكي فاخر 1 كجم", en: "Royal Mixed Sweets Box 1kg" },
          category: "علب الهدايا",
          price: 220,
          stock: 45,
          unit: { ar: "علبة", en: "box" },
          image: "/products/baklava-box.jpg",
        },
        quantity: 2,
        unitPrice: 220,
        discount: 0,
      },
    ],
    subtotal: 440,
    vat: 61.6,
    discount: 0,
    deliveryFee: 0,
    total: 501.6,
    paymentMethod: "card",
    tendered: 501.6,
    change: 0,
    orderType: "takeaway",
    orderPlatform: "direct",
  },
  {
    id: "INV-POS-10480",
    date: "2026-09-29, 11:05:10 ص",
    branch: POS_BRANCHES[0]!,
    cashierId: "usr_korba_2",
    cashierName: "سارة محمود",
    customer: { name: "طلب تطبيق طلبات", phone: "01124455667" },
    items: [
      {
        id: "init-4",
        product: {
          sku: "FAT-WZR",
          name: { ar: "فتة ميكس الوزير", en: "Fatta Mix Al-Wazeer" },
          category: "الفتة",
          price: 90,
          stock: 45,
          unit: { ar: "علبة", en: "box" },
          image: "/products/fatta-wazeer.jpg",
        },
        quantity: 2,
        unitPrice: 90,
        discount: 0,
      },
    ],
    subtotal: 180,
    vat: 25.2,
    discount: 0,
    deliveryFee: 20,
    total: 225.2,
    paymentMethod: "card",
    tendered: 225.2,
    change: 0,
    orderType: "delivery",
    orderPlatform: "talabat",
    orderPlatformName: "تطبيق طلبات (Talabat)",
    orderRefNumber: "TLB-94812",
  },
  {
    id: "INV-POS-10478",
    date: "2026-09-29, 10:48:30 ص",
    branch: POS_BRANCHES[0]!,
    cashierId: "usr_korba_2",
    cashierName: "سارة محمود",
    customer: { name: "عميل كاش صالة", phone: "" },
    items: [
      {
        id: "init-5",
        product: {
          sku: "TJ-ALI",
          name: { ar: "طاجن ام علي قشطة مكسرات", en: "Om Ali Cream & Nuts" },
          category: "الطواجن",
          price: 70,
          stock: 90,
          unit: { ar: "طاجن", en: "tajin" },
          image: "/products/om-ali.jpg",
        },
        quantity: 2,
        unitPrice: 70,
        discount: 0,
      },
    ],
    subtotal: 140,
    vat: 19.6,
    discount: 0,
    deliveryFee: 0,
    total: 159.6,
    paymentMethod: "cash",
    tendered: 200,
    change: 40.4,
    orderType: "dine_in",
    orderPlatform: "direct",
  },
  {
    id: "INV-POS-10468",
    date: "2026-09-29, 09:30:15 ص",
    branch: POS_BRANCHES[0]!,
    cashierId: "usr_korba_3",
    cashierName: "كريم عادل",
    customer: { name: "طلب صالة محلي", phone: "" },
    items: [
      {
        id: "init-6",
        product: {
          sku: "SHW-NUT",
          name: { ar: "شاورما نوتيلا", en: "Sweet Shawarma Nutella" },
          category: "شاورما الوزير",
          price: 115,
          stock: 4,
          unit: { ar: "علبة", en: "box" },
          image: "/products/shawarma-crepe.jpg",
        },
        quantity: 1,
        unitPrice: 115,
        discount: 0,
      },
    ],
    subtotal: 115,
    vat: 16.1,
    discount: 0,
    deliveryFee: 0,
    total: 131.1,
    paymentMethod: "cash",
    tendered: 150,
    change: 18.9,
    orderType: "dine_in",
    orderPlatform: "direct",
  },
];

export function PosPage() {
  const { t, pick, money, lang, dir } = useI18n();
  const { settings } = useCompanySettings();
  const { currentUser } = useAuthStore();
  const { addDocument, documents, nextCode } = useSalesStore();

  // Fullscreen Kiosk Mode
  const [isKioskMode, setIsKioskMode] = useState(false);

  // Selected Branch (persisted in localStorage for this terminal)
  const [selectedBranch, setSelectedBranch] = useState<(typeof POS_BRANCHES)[number]>(() => {
    try {
      const saved = localStorage.getItem("pos_terminal_branch_id");
      if (saved) {
        const found = POS_BRANCHES.find((b) => b.id === saved);
        if (found) return found;
      }
    } catch {}
    return POS_BRANCHES[0]!;
  });

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

  // Catalog State
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isMoreCatOpen, setIsMoreCatOpen] = useState(false);
  const moreCatRef = useRef<HTMLDivElement>(null);

  // 5 Categories by default & remaining categories in dropdown list
  const defaultCategories = useMemo(() => POS_CATEGORIES.slice(0, 5), []);
  const dropdownCategories = useMemo(() => POS_CATEGORIES.slice(5), []);
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

  // Base Products Catalog with extra sweets & gifts
  const catalogProducts: PosProduct[] = useMemo(() => {
    const list: PosProduct[] = defaultCatalogProducts.map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category.ar,
      price: p.price,
      stock: p.qty,
      unit: { ar: "علبة", en: "box" },
      image: PRODUCT_IMAGE_MAP[p.sku] ?? "/products/rice-pistachio.jpg",
      colorTheme:
        p.category.ar === "عشاق الرز"
          ? "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
          : p.category.ar === "الفتة"
          ? "from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          : p.category.ar === "دنيا الدلع"
          ? "from-purple-500/20 to-violet-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
          : "from-primary/20 to-primary/5 border-primary/30 text-primary",
    }));

    // Add Special Confectionery & Gift Boxes
    list.push(
      {
        sku: "BOX-ROYAL-1KG",
        name: { ar: "بوكس مشكل ملوكي فاخر 1 كجم", en: "Royal Mixed Sweets Box 1kg" },
        category: "علب الهدايا",
        price: 220,
        stock: 45,
        unit: { ar: "علبة", en: "box" },
        badge: "الأكثر طلباً",
        image: PRODUCT_IMAGE_MAP["BOX-ROYAL-1KG"] ?? "/products/baklava-box.jpg",
        colorTheme: "from-amber-600/20 to-yellow-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200",
      },
      {
        sku: "BOX-ROYAL-2KG",
        name: { ar: "صينية ضيافة ملكية مشكلة 2 كجم", en: "Imperial Confectionery Platter 2kg" },
        category: "علب الهدايا",
        price: 430,
        stock: 25,
        unit: { ar: "صينية", en: "tray" },
        badge: "فاخر",
        image: PRODUCT_IMAGE_MAP["BOX-ROYAL-2KG"] ?? "/products/baklava-box.jpg",
        colorTheme: "from-amber-600/20 to-yellow-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200",
      },
      {
        sku: "BKL-PIST-VIP",
        name: { ar: "علبة بقلاوة تركية فستق حلبي بيور", en: "Pistachio Turkish Baklava Box" },
        category: "علب الهدايا",
        price: 280,
        stock: 30,
        unit: { ar: "علبة", en: "box" },
        image: PRODUCT_IMAGE_MAP["BKL-PIST-VIP"] ?? "/products/baklava-box.jpg",
        colorTheme: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
      },
      {
        sku: "TRT-LOT-FAM",
        name: { ar: "تورتة لوتس كيندر فاميلي", en: "Lotus Kinder Family Cake" },
        category: "كيك وتشييز",
        price: 340,
        stock: 12,
        unit: { ar: "تورتة", en: "cake" },
        badge: "عائلي",
        image: PRODUCT_IMAGE_MAP["TRT-LOT-FAM"] ?? "/products/cheesecake-pistachio.jpg",
        colorTheme: "from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-700 dark:text-pink-300",
      },
      {
        sku: "ICE-SCOOP",
        name: { ar: "بولاية آيس كريم فانيليا إضافية", en: "Extra Vanilla Ice Cream Scoop" },
        category: "مشروبات وإضافات",
        price: 25,
        stock: 120,
        unit: { ar: "بولة", en: "scoop" },
        image: PRODUCT_IMAGE_MAP["ICE-SCOOP"] ?? "/products/kashtouta-pistachio.jpg",
        colorTheme: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300",
      },
      {
        sku: "EX-PIST-SAUCE",
        name: { ar: "صوص بستاشيو بلجيكي خام إضافي", en: "Extra Belgian Pistachio Sauce" },
        category: "مشروبات وإضافات",
        price: 35,
        stock: 90,
        unit: { ar: "عبوة", en: "cup" },
        image: PRODUCT_IMAGE_MAP["EX-PIST-SAUCE"] ?? "/products/cheesecake-pistachio.jpg",
        colorTheme: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
      },
      {
        sku: "EX-NUT-SAUCE",
        name: { ar: "صوص نوتيلا أصلي إضافي", en: "Extra Original Nutella Sauce" },
        category: "مشروبات وإضافات",
        price: 25,
        stock: 110,
        unit: { ar: "عبوة", en: "cup" },
        image: PRODUCT_IMAGE_MAP["EX-NUT-SAUCE"] ?? "/products/rice-nutella.jpg",
        colorTheme: "from-amber-700/20 to-orange-600/10 border-amber-600/30 text-amber-800 dark:text-amber-200",
      },
      {
        sku: "WATER-MINERAL",
        name: { ar: "مياه معدنية طبيعية 600 مل", en: "Pure Mineral Water 600ml" },
        category: "مشروبات وإضافات",
        price: 15,
        stock: 250,
        unit: { ar: "زجاجة", en: "bottle" },
        image: PRODUCT_IMAGE_MAP["WATER-MINERAL"] ?? "/products/mineral-water.jpg",
        colorTheme: "from-blue-500/20 to-sky-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
      }
    );

    return list;
  }, []);

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

  // Add Item to Cart
  const handleAddToCart = (product: PosProduct, customQty = 1) => {
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

  // Update Item Quantity
  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
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
      timestamp: new Date().toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      customerName: selectedCustomer.name,
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
  const handleCompletePayment = () => {
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
      date: new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
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
      className={`min-h-[calc(100vh-4rem)] flex flex-col bg-background select-none font-sans ${
        isKioskMode ? "fixed inset-0 z-50 p-2 bg-background overflow-hidden" : ""
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. TOP CASHIER TOOLBAR */}
      {/* ========================================================================= */}
      <header className="bg-card border-b border-border/70 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Left: Terminal Identity & Branch */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/25 text-primary">
            <Store className="w-5 h-5 shrink-0" />
            <div className="leading-tight">
              <span className="font-black text-xs block">
                {lang === "ar" ? "كاشير وزير الحلو POS" : "Wazeer POS Terminal"}
              </span>
              <span className="text-[10px] font-mono opacity-80">REG-01 • v2.6 Pro</span>
            </div>
          </div>

          {/* Branch Dropdown (POS Tied to One Branch) */}
          <div className="relative">
            <select
              value={selectedBranch.id}
              onChange={(e) => {
                const found = POS_BRANCHES.find((b) => b.id === e.target.value);
                if (found) setSelectedBranch(found);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-border/80 bg-background text-foreground focus:border-primary focus:outline-none cursor-pointer"
            >
              {POS_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {pick(b.ar, b.en)}
                </option>
              ))}
            </select>
          </div>

          {/* Active Cashier Pill (Quick Switcher) */}
          <button
            type="button"
            onClick={() => setShowCashierSwitchModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-foreground text-xs font-bold transition-all shadow-xs group cursor-pointer"
            title={lang === "ar" ? "تبديل الكاشير والمشغل" : "Switch Cashier User"}
          >
            <span className="text-lg p-0.5 rounded-lg bg-card border border-border/60">{activeCashier.avatar}</span>
            <div className="text-start leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-foreground group-hover:text-primary transition-colors">
                  {pick(activeCashier.name.ar, activeCashier.name.en)}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-primary/20 text-primary font-bold">
                  {pick(activeCashier.roleLabel.ar, activeCashier.roleLabel.en)}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono block">
                {lang === "ar" ? "مبيعاتي:" : "My Sales:"}{" "}
                <strong className="text-emerald-600 font-black">{money(activeShift.totalSales)}</strong>
                {" "}({activeShift.ordersCount} {lang === "ar" ? "طلب" : "orders"})
              </span>
            </div>
            <Users className="w-3.5 h-3.5 text-primary ms-1 opacity-70 group-hover:opacity-100" />
          </button>
        </div>

        {/* Center: Shift Summary & My Orders & Parked Tickets Pill */}
        <div className="flex items-center gap-2">
          {/* My Orders Button */}
          <button
            type="button"
            onClick={() => {
              setOrdersViewMode("my_orders");
              setShowMyOrdersModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-bold transition-colors cursor-pointer"
            title={lang === "ar" ? "سجل طلباتي في الوردية" : "My Orders History"}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-500" />
            <span>{lang === "ar" ? "طلباتي" : "My Orders"}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-black">
              {myOrders.length}
            </span>
          </button>

          {/* Shift Button (My Shift Summary) */}
          <button
            type="button"
            onClick={() => setShowShiftModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-bold transition-colors cursor-pointer"
            title={lang === "ar" ? "تصفية وردية الكاشير وحركة الصندوق" : "Shift & Cash Drawer Summary"}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">{lang === "ar" ? "ورديتي:" : "My Shift:"}</span>
            <span className="font-mono text-emerald-600 font-black">{money(activeShift.totalSales)}</span>
          </button>

          {/* Parked Orders Badge Button */}
          <button
            type="button"
            onClick={() => setShowHeldModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              heldOrders.length > 0
                ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 animate-pulse"
                : "bg-card border-border/70 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Pause className="w-3.5 h-3.5" />
            <span>{lang === "ar" ? "المعلقات" : "Parked"}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold">
              {heldOrders.length}
            </span>
          </button>
        </div>

        {/* Right: Kiosk Toggle & Exit */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsKioskMode((prev) => !prev)}
            className="p-2 rounded-xl border border-border/70 bg-card hover:bg-muted text-foreground transition-colors"
            title={
              isKioskMode
                ? lang === "ar" ? "الخروج من وضع الشاشة الكاملة" : "Exit Fullscreen"
                : lang === "ar" ? "وضع ملء الشاشة للكاشير" : "Fullscreen Kiosk Mode"
            }
          >
            {isKioskMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <Link
            to="/sales"
            className="px-3 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-bold flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{lang === "ar" ? "سجل الفواتير" : "Invoices Log"}</span>
          </Link>
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
                    className="group relative bg-card hover:bg-accent/5 rounded-2xl border border-border/80 hover:border-primary/60 p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-xl active:scale-98 select-none overflow-hidden"
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
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white shadow-xs">
                            {prod.badge}
                          </span>
                        )}
                      </div>

                      {/* Bottom Overlay: Stock Count & Cart Quantity */}
                      <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between gap-1 pointer-events-none">
                        {prod.stock <= 10 ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-600/90 backdrop-blur-xs text-white font-bold shadow-xs">
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
        <div className="lg:col-span-5 xl:col-span-4 bg-card rounded-3xl border border-border/80 shadow-xl flex flex-col overflow-hidden">
          {/* 1. Ticket Header: Order Type & Customer */}
          <div className="p-3.5 border-b border-border/70 space-y-3 bg-muted/20">
            {/* Order Platform Selector: Direct / Talabat / Other App */}
            <div className="space-y-1.5 p-2 rounded-2xl bg-card border border-border/80 shadow-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground px-1">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-primary" />
                  <span>{lang === "ar" ? "قناة الطلب / المنصة:" : "Order Platform:"}</span>
                </span>
                {orderPlatform !== "direct" && (
                  <span className="text-[10px] text-orange-600 dark:text-orange-400 font-black px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                    {lang === "ar" ? "تطبيق توصيل" : "Online Aggregator"}
                  </span>
                )}
              </div>

              {/* 4 Main Choice Tabs: Direct, Talabat, Waffarha, Other App */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {/* 1. Direct */}
                <button
                  type="button"
                  onClick={() => handleSelectPlatform("direct")}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    orderPlatform === "direct"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-black shadow-xs ring-1 ring-emerald-500/20"
                      : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span>🏪</span>
                  <span>{lang === "ar" ? "مباشر" : "Direct"}</span>
                </button>

                {/* 2. Talabat */}
                <button
                  type="button"
                  onClick={() => handleSelectPlatform("talabat")}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    orderPlatform === "talabat"
                      ? "bg-orange-500/20 border-orange-500/60 text-orange-800 dark:text-orange-300 font-black shadow-xs ring-1 ring-orange-500/40"
                      : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span>🛵</span>
                  <span>{lang === "ar" ? "طلبات" : "Talabat"}</span>
                </button>

                {/* 3. Waffarha */}
                <button
                  type="button"
                  onClick={() => handleSelectPlatform("waffarha")}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    orderPlatform === "waffarha"
                      ? "bg-red-500/20 border-red-500/60 text-red-800 dark:text-red-300 font-black shadow-xs ring-1 ring-red-500/40"
                      : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span>🎟️</span>
                  <span>{lang === "ar" ? "وفرها" : "Waffarha"}</span>
                </button>

                {/* 4. Other App */}
                <button
                  type="button"
                  onClick={() =>
                    handleSelectPlatform(
                      orderPlatform !== "direct" &&
                        orderPlatform !== "talabat" &&
                        orderPlatform !== "waffarha"
                        ? orderPlatform
                        : "other"
                    )
                  }
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    orderPlatform !== "direct" &&
                    orderPlatform !== "talabat" &&
                    orderPlatform !== "waffarha"
                      ? "bg-purple-500/20 border-purple-500/60 text-purple-800 dark:text-purple-300 font-black shadow-xs ring-1 ring-purple-500/40"
                      : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span>📱</span>
                  <span>{lang === "ar" ? "أخرى" : "Other"}</span>
                </button>
              </div>

              {/* Specific Other App Picker */}
              {orderPlatform !== "direct" &&
                orderPlatform !== "talabat" &&
                orderPlatform !== "waffarha" && (
                <div className="pt-0.5">
                  <select
                    value={orderPlatform}
                    onChange={(e) => handleSelectPlatform(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs rounded-xl border border-purple-500/40 bg-background font-bold text-foreground focus:outline-none"
                  >
                    <option value="other">📱 {lang === "ar" ? "تطبيق آخر (Other App)" : "Other App"}</option>
                    <option value="jahez">🟡 {lang === "ar" ? "تطبيق جاهز (Jahez)" : "Jahez App"}</option>
                    <option value="elmenus">🍔 {lang === "ar" ? "تطبيق المنيوز (Elmenus)" : "Elmenus"}</option>
                    <option value="hungerstation">🥘 {lang === "ar" ? "هنقرستيشن (HungerStation)" : "HungerStation"}</option>
                    <option value="noon">🛍️ {lang === "ar" ? "نون فود (Noon Food)" : "Noon Food"}</option>
                    <option value="mrsool">🟢 {lang === "ar" ? "تطبيق مرسول (Mrsool)" : "Mrsool"}</option>
                  </select>
                </div>
              )}

              {/* Order Reference / Coupon Code Number Input */}
              {orderPlatform !== "direct" && (
                <div className="pt-1 space-y-1">
                  <div
                    className={`flex items-center gap-1.5 p-1.5 rounded-xl border ${
                      orderPlatform === "waffarha"
                        ? "bg-red-500/10 border-red-500/30"
                        : orderPlatform === "talabat"
                        ? "bg-orange-500/10 border-orange-500/30"
                        : "bg-purple-500/10 border-purple-500/30"
                    }`}
                  >
                    <Tag
                      className={`w-3.5 h-3.5 shrink-0 ${
                        orderPlatform === "waffarha"
                          ? "text-red-600"
                          : orderPlatform === "talabat"
                          ? "text-orange-600"
                          : "text-purple-600"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-bold shrink-0 ${
                        orderPlatform === "waffarha"
                          ? "text-red-900 dark:text-red-300"
                          : orderPlatform === "talabat"
                          ? "text-orange-900 dark:text-orange-300"
                          : "text-purple-900 dark:text-purple-300"
                      }`}
                    >
                      {orderPlatform === "waffarha"
                        ? lang === "ar"
                          ? "كوبون وفرها:"
                          : "Waffarha Coupon #:"
                        : lang === "ar"
                        ? "مرجع الطلب:"
                        : "Order Ref #:"}
                    </span>
                    <input
                      type="text"
                      value={orderRefNumber}
                      onChange={(e) => setOrderRefNumber(e.target.value)}
                      placeholder={
                        orderPlatform === "waffarha"
                          ? lang === "ar"
                            ? "رقم قسيمة أو كود وفرها (مثال: WFR-78412)"
                            : "Waffarha coupon/voucher (e.g. WFR-78412)"
                          : orderPlatform === "talabat"
                          ? lang === "ar"
                            ? "رقم طلب طلبات (مثال: TLB-89421)"
                            : "Talabat Order # (e.g. TLB-89421)"
                          : lang === "ar"
                          ? "رقم مرجع الطلب بالتطبيق..."
                          : "App order reference..."
                      }
                      className={`flex-1 min-w-0 px-2 py-0.5 text-xs rounded-lg border bg-background text-foreground font-mono font-bold focus:outline-none focus:ring-1 ${
                        orderPlatform === "waffarha"
                          ? "border-red-500/40 focus:ring-red-500"
                          : orderPlatform === "talabat"
                          ? "border-orange-500/40 focus:ring-orange-500"
                          : "border-purple-500/40 focus:ring-purple-500"
                      }`}
                    />
                    {orderRefNumber && (
                      <button
                        type="button"
                        onClick={() => setOrderRefNumber("")}
                        className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                        title={lang === "ar" ? "مسح" : "Clear"}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Order Types 3-way toggle */}
            <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-2xl border border-border/60">
              <button
                type="button"
                onClick={() => setOrderType("takeaway")}
                className={`py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  orderType === "takeaway"
                    ? "bg-card text-foreground shadow-sm font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                <span>{lang === "ar" ? "سفري" : "Takeaway"}</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType("dine_in")}
                className={`py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  orderType === "dine_in"
                    ? "bg-card text-foreground shadow-sm font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Utensils className="w-3.5 h-3.5 text-primary" />
                <span>{lang === "ar" ? "صالة" : "Dine-in"}</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType("delivery")}
                className={`py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  orderType === "delivery"
                    ? "bg-card text-foreground shadow-sm font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bike className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === "ar" ? "توصيل" : "Delivery"}</span>
              </button>
            </div>

            {/* Customer Pill & Quick Picker */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 truncate">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="truncate leading-tight">
                  <span className="text-xs font-bold block text-foreground truncate">
                    {selectedCustomer.name}
                  </span>
                  {selectedCustomer.phone && (
                    <span className="text-[10px] text-muted-foreground font-mono block">
                      {selectedCustomer.phone}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="text-[11px] font-bold text-primary hover:underline shrink-0"
              >
                {lang === "ar" ? "تغيير العميل" : "Change"}
              </button>
            </div>

            {/* Table input if dine-in or address if delivery */}
            {orderType === "dine_in" && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-muted-foreground">
                  {lang === "ar" ? "رقم الطاولة:" : "Table #:"}
                </span>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="مثال: T-04"
                  className="w-24 px-2 py-1 text-xs rounded-lg border border-border/80 bg-background text-center font-bold"
                />
              </div>
            )}

            {orderType === "delivery" && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder={lang === "ar" ? "عنوان التوصيل أو رقم الشقة..." : "Delivery address / apt..."}
                  className="w-full px-2 py-1 text-xs rounded-lg border border-border/80 bg-background font-semibold"
                />
              </div>
            )}
          </div>

          {/* 2. Ticket Items Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.map((item) => {
              const lineTotal = item.quantity * item.unitPrice;
              return (
                <div
                  key={item.id}
                  className="p-2.5 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition-all flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.product.image && (
                        <img
                          src={item.product.image}
                          alt={pick(item.product.name.ar, item.product.name.en)}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-border/70 shadow-xs"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-black text-foreground block leading-tight truncate">
                          {pick(item.product.name.ar, item.product.name.en)}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {money(item.unitPrice)} / {pick(item.product.unit.ar, item.product.unit.en)}
                        </span>
                      </div>
                    </div>

                    <div className="text-end shrink-0">
                      <span className="text-xs font-black text-foreground block font-mono">
                        {money(lineTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Delete */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/60">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-card text-foreground hover:bg-muted flex items-center justify-center font-black transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-mono font-black text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-card text-foreground hover:bg-muted flex items-center justify-center font-black transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title={lang === "ar" ? "حذف الصنف" : "Remove item"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 stroke-[1.2] opacity-30 mb-2" />
                <p className="text-xs font-bold">
                  {lang === "ar" ? "الفاتورة فارغة حالياً" : "Cart is currently empty"}
                </p>
                <span className="text-[11px] opacity-75 mt-0.5">
                  {lang === "ar" ? "اضغط على أي صنف من القائمة لإضافته" : "Click any confectionery to add"}
                </span>
              </div>
            )}
          </div>

          {/* 3. Ticket Totals & Calculations */}
          <div className="p-3.5 border-t border-border/70 bg-muted/15 space-y-2">
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-muted-foreground font-semibold">
                <span>{lang === "ar" ? "المجموع الفرعي:" : "Subtotal:"}</span>
                <span className="font-mono">{money(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-rose-600 font-bold">
                  <span>{lang === "ar" ? `الخصم (${discountPercent}%):` : `Discount (${discountPercent}%):`}</span>
                  <span className="font-mono">-{money(discountAmount)}</span>
                </div>
              )}

              {applyVat && (
                <div className="flex items-center justify-between text-muted-foreground font-semibold">
                  <span>{lang === "ar" ? "ضريبة القيمة المضافة (14%):" : "VAT (14%):"}</span>
                  <span className="font-mono">+{money(vatAmount)}</span>
                </div>
              )}

              {orderType === "delivery" && deliveryFee > 0 && (
                <div className="flex items-center justify-between text-muted-foreground font-semibold">
                  <span>{lang === "ar" ? "خدمة التوصيل:" : "Delivery Fee:"}</span>
                  <span className="font-mono">+{money(deliveryFee)}</span>
                </div>
              )}
            </div>

            {/* Quick Discount & Tax Toggles */}
            <div className="flex items-center justify-between pt-1 gap-2 border-t border-border/50 text-[11px]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDiscountPercent((prev) => (prev === 0 ? 10 : prev === 10 ? 20 : 0))}
                  className={`px-2 py-0.5 rounded-lg border font-bold ${
                    discountPercent > 0
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-600"
                      : "bg-card border-border/70 text-muted-foreground"
                  }`}
                >
                  %{discountPercent > 0 ? discountPercent : lang === "ar" ? "خصم" : "Discount"}
                </button>

                <button
                  type="button"
                  onClick={() => setApplyVat((prev) => !prev)}
                  className={`px-2 py-0.5 rounded-lg border font-bold ${
                    applyVat
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                      : "bg-card border-border/70 text-muted-foreground line-through"
                  }`}
                >
                  {lang === "ar" ? "ضريبة 14%" : "VAT 14%"}
                </button>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-muted-foreground hover:text-destructive text-[11px] font-bold"
                >
                  {lang === "ar" ? "مسح الكل (F9)" : "Clear (F9)"}
                </button>
              )}
            </div>

            {/* Massive Net Total Box */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-600/10 to-teal-500/15 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-300 block">
                  {lang === "ar" ? "الإجمالي الصافي المطلوب" : "Total Net Payable"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {cart.reduce((s, i) => s + i.quantity, 0)} {lang === "ar" ? "قطع / عبوات" : "items"}
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight">
                {money(finalTotal)}
              </span>
            </div>

            {/* Payment Method Quick Selector Directly on Cart Panel */}
            <div className="space-y-1.5 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground px-0.5">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  <span>{lang === "ar" ? "طريقة الدفع والسداد:" : "Payment Method:"}</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowAddPaymentModal(true)}
                    className="flex items-center gap-1 text-[10px] font-black text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                    title={lang === "ar" ? "إضافة طريقة دفع جديدة للنظام" : "Add custom payment method"}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{lang === "ar" ? "+ إضافة طريقة" : "+ Add Method"}</span>
                  </button>
                </div>
              </div>

              {/* Payment Methods Grid / Quick Selector */}
              <div className="grid grid-cols-4 gap-1">
                {paymentMethods.slice(0, 7).map((pm) => {
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
                      className={`py-1.5 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                        isSelected
                          ? `${pm.badgeClass} ring-2 ring-primary/40 font-black shadow-xs scale-102`
                          : "border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-sm leading-none">{pm.icon}</span>
                      <span className="text-[10px] leading-tight truncate max-w-full">
                        {pick(pm.name.ar, pm.name.en)}
                      </span>
                      {pm.shortcut && (
                        <span className="text-[8px] opacity-60 font-mono font-bold leading-none">
                          {pm.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* More / Custom Payment Methods Trigger */}
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="py-1.5 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border border-dashed border-border/80 bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  title={lang === "ar" ? "عرض جميع طرق الدفع والحاسبة" : "View all payment methods"}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] leading-tight">
                    {lang === "ar" ? "المزيد ⋯" : "More ⋯"}
                  </span>
                </button>
              </div>

              {/* Dynamic Context Box: 1. Cash Quick Tender Presets */}
              {paymentMethod === "cash" && finalTotal > 0 && (
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      {lang === "ar" ? "المستلم نقداً بالدرج:" : "Cash Tendered:"}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tenderAmount || ""}
                        onChange={(e) => setTenderAmount(Number(e.target.value))}
                        placeholder={String(finalTotal)}
                        className="w-20 px-2 py-0.5 text-xs text-center font-mono font-bold rounded-lg border border-emerald-500/40 bg-background"
                      />
                      <span className="text-[10px] text-muted-foreground">ج.م</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-emerald-500/20">
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
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-background border hover:bg-muted"
                        >
                          +{b}
                        </button>
                      ))}
                    </div>

                    <div className="text-end">
                      <span className="text-[10px] text-muted-foreground block">{lang === "ar" ? "الباقي للعميل:" : "Change:"}</span>
                      <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                        {money(Math.max(0, (tenderAmount || finalTotal) - finalTotal))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Context Box: 2. Split Payment (Cash + Card) */}
              {paymentMethod === "split" && finalTotal > 0 && (
                <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-2 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px] font-bold text-teal-900 dark:text-teal-200">
                    <span className="flex items-center gap-1">
                      <Split className="w-3.5 h-3.5 text-teal-600" />
                      <span>{lang === "ar" ? "تقسيم الدفع (مجزأ):" : "Split Payment Breakdown:"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const half = Math.round(finalTotal / 2);
                        setSplitCashAmount(half);
                        setSplitCardAmount(finalTotal - half);
                      }}
                      className="text-[10px] text-teal-700 underline font-bold"
                    >
                      {lang === "ar" ? "مناصفة 50/50" : "50/50 Split"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                        <span>💵</span>
                        <span>{lang === "ar" ? "المبلغ كاش:" : "Cash Part:"}</span>
                      </label>
                      <input
                        type="number"
                        value={splitCashAmount || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSplitCashAmount(val);
                          setSplitCardAmount(Math.max(0, finalTotal - val));
                        }}
                        className="w-full px-2 py-1 text-xs text-center font-mono font-bold rounded-lg border border-teal-500/40 bg-background"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                        <span>💳</span>
                        <span>{lang === "ar" ? "المبلغ فيزا:" : "Card Part:"}</span>
                      </label>
                      <input
                        type="number"
                        value={splitCardAmount || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSplitCardAmount(val);
                          setSplitCashAmount(Math.max(0, finalTotal - val));
                        }}
                        className="w-full px-2 py-1 text-xs text-center font-mono font-bold rounded-lg border border-teal-500/40 bg-background"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-teal-500/20 font-bold">
                    <span>{lang === "ar" ? "الإجمالي الموزع:" : "Allocated Total:"}</span>
                    <span
                      className={`font-mono ${
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

              {/* Dynamic Context Box: 3. Waffarha Voucher Code */}
              {paymentMethod === "waffarha_voucher" && (
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 space-y-1.5 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-red-900 dark:text-red-200 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-red-600" />
                      <span>{lang === "ar" ? "رقم قسيمة وفرها:" : "Waffarha Voucher Code:"}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">Waffarha.com</span>
                  </div>
                  <input
                    type="text"
                    value={orderRefNumber}
                    onChange={(e) => setOrderRefNumber(e.target.value)}
                    placeholder="WFR-78900"
                    className="w-full px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-red-500/40 bg-background text-start"
                  />
                </div>
              )}
            </div>

            {/* Bottom Actions: Hold Sale, Detailed Calc & Pay Buttons */}
            <div className="grid grid-cols-12 gap-1.5 pt-1">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleHoldTicket}
                className="col-span-3 py-3 rounded-2xl border border-border/80 bg-card hover:bg-muted text-foreground text-xs font-black flex items-center justify-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                title={lang === "ar" ? "تعليق الطلب الحالي (F2)" : "Park current ticket (F2)"}
              >
                <Pause className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{lang === "ar" ? "تعليق (F2)" : "Hold"}</span>
              </button>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setShowPaymentModal(true)}
                className="col-span-2 py-3 rounded-2xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-black flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
                title={lang === "ar" ? "فتح حاسبة وتفاصيل الدفع" : "Open payment calculator"}
              >
                <Maximize2 className="w-4 h-4" />
              </button>

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
                className="col-span-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/25 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <span className="text-base shrink-0">
                  {paymentMethods.find((m) => m.id === paymentMethod)?.icon || "💵"}
                </span>
                <span className="truncate">
                  {lang === "ar"
                    ? `دفع (${paymentMethod === "split" ? "مجزأ" : (paymentMethods.find((m) => m.id === paymentMethod)?.name.ar || "نقداً")}) وطباعة (F1)`
                    : `Pay (${paymentMethod === "split" ? "Split" : (paymentMethods.find((m) => m.id === paymentMethod)?.name.en || "Cash")}) (F1)`}
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
              <div className="text-center space-y-1 border-b border-dashed border-zinc-400 pb-3">
                <h2 className="text-base font-black tracking-tight font-sans">
                  {settings.nameAr || "سلسلة حلويات وزير الحلو"}
                </h2>
                <p className="text-[11px] font-sans font-bold">Wazeer El-Helw Pastry & Desserts</p>
                <p className="text-[10px]">
                  {lastCompletedOrder.branch.ar}
                </p>
                <p className="text-[10px] font-mono">
                  Tel: {lastCompletedOrder.branch.phone}
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
                <div className="flex justify-between">
                  <span>التاريخ والوقت:</span>
                  <span>{lastCompletedOrder.date}</span>
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
                <div className="flex justify-between text-[10px] font-bold border-b border-zinc-300 pb-1">
                  <span>الصنف</span>
                  <div className="flex gap-4">
                    <span>الكمية</span>
                    <span>الإجمالي</span>
                  </div>
                </div>

                {lastCompletedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-[10px]">
                    <span className="truncate max-w-[140px] font-sans font-bold">
                      {pick(item.product.name.ar, item.product.name.en)}
                    </span>
                    <div className="flex gap-4">
                      <span>{item.quantity}</span>
                      <span className="font-bold font-mono">
                        {(item.quantity * item.unitPrice).toFixed(2)}
                      </span>
                    </div>
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

              {/* ZATCA QR Code & Footer */}
              <div className="text-center pt-2 space-y-2">
                <div className="flex justify-center">
                  <div className="p-2 border border-zinc-400 rounded-lg inline-block bg-white">
                    <QrCode className="w-20 h-20 text-black stroke-[1.2]" />
                  </div>
                </div>
                <p className="text-[10px] font-sans font-bold">
                  شكراً لزيارتكم — وزير الحلو أصل الطعم الملكي!
                </p>
                <p className="text-[9px] text-zinc-500 font-mono">
                  *** فاتورة ضريبية إلكترونية معتمدة ***
                </p>
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
                  {lang === "ar" ? "الفواتير المعلقة" : "Parked Orders"} ({heldOrders.length})
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
              {heldOrders.map((held) => (
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

              {heldOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-xs font-bold">
                  {lang === "ar" ? "لا توجد فواتير معلقة حالياً" : "No parked tickets found"}
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

            {/* Modal Tabs: My Shift vs All Branch Cashiers */}
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

            {/* Tab 2: All Branch Cashiers Comparison */}
            {shiftModalTab === "all_cashiers" && (
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
                              {lang === "ar" ? "اختيار ↵" : "Switch ↵"}
                            </span>
                          )}
                        </div>

                        {/* Shift amounts & orders metrics */}
                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-muted-foreground">
                            {ordersCount} {lang === "ar" ? "طلب" : "orders"}
                          </span>
                          <span className="font-black text-emerald-600">
                            {money(salesTotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add New Cashier Form Toggle */}
              {!showNewCashierForm ? (
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
              )}
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
                    {lang === "ar" ? "سجل طلبات وفواتير الكاشير" : "Cashier Orders & Invoices Log"}
                  </h3>
                  <p className="text-[11px] opacity-85">
                    {pick(activeCashier.name.ar, activeCashier.name.en)} • 📍 {pick(selectedBranch.ar, selectedBranch.en)}
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
                {/* 2-Way View Filter */}
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
                const currentList = ordersViewMode === "my_orders" ? myOrders : branchOrders;
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
                        {ordersViewMode === "my_orders" ? (lang === "ar" ? "إجمالي مبيعاتي" : "My Total Sales") : (lang === "ar" ? "إجمالي مبيعات الفرع" : "Branch Total Sales")}
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
                const baseList = ordersViewMode === "my_orders" ? myOrders : branchOrders;
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
