import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateAllBranchesOctOrders } from "@/lib/branches-sales-seed";

export interface PosOrderItemRecord {
  id: string;
  sku: string;
  name: { ar: string; en: string };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string | undefined;
}

export interface AdminPosOrder {
  id: string;
  orderNumber: string;
  branchId: string;
  branchName: { ar: string; en: string; phone?: string | undefined };
  cashierId: string;
  cashierName: string;
  customerName: string;
  customerPhone?: string | undefined;
  orderType: "takeaway" | "dine_in" | "delivery" | string;
  orderPlatform: string;
  orderPlatformName?: string | undefined;
  orderRefNumber?: string | undefined;
  tableNumber?: string | undefined;
  deliveryNotes?: string | undefined;
  subtotal: number;
  vatAmount: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentMethodLabel?: string | undefined;
  tenderAmount: number;
  changeAmount: number;
  status: "completed" | "paid" | "parked" | "cancelled" | string;
  createdAt: string;
  formattedDate: string;
  items: PosOrderItemRecord[];
}

export const BRANCH_NAMES_MAP: Record<string, { ar: string; en: string; phone?: string }> = {
  korba: { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis", phone: "+20 100 455 2211" },
  abbas: { ar: "فرع عباس العقاد — مدينة نصر", en: "Abbas El-Akkad — Nasr City", phone: "+20 100 551 2233" },
  helmeya: { ar: "فرع الحلمية — حلمية الزيتون", en: "Helmeya", phone: "+20 100 662 3344" },
  khosoos: { ar: "فرع الخصوص — القليوبية", en: "El-Khosoos", phone: "+20 100 773 4455" },
  wost_elbalad: { ar: "فرع وسط البلد — طلعت حرب", en: "Downtown — Talaat Harb", phone: "+20 100 884 5566" },
  giza: { ar: "فرع الجيزة — ميدان الجيزة", en: "Giza Square", phone: "+20 100 995 6677" },
  faisal: { ar: "فرع فيصل — شارع فيصل الرئيسي", en: "Faisal Main St.", phone: "+20 100 116 7788" },
  dar_elsalam: { ar: "فرع دار السلام — الكورنيش", en: "Dar El-Salam", phone: "+20 100 227 8899" },
  october_gardens: { ar: "فرع حدائق أكتوبر — زويل", en: "October Gardens", phone: "+20 100 338 9900" },
  ahram_gardens: { ar: "فرع حدائق الأهرام — البوابة الثانية", en: "Ahram Gardens", phone: "+20 100 449 0011" },
  hosary: { ar: "فرع الحصري — 6 أكتوبر", en: "Al-Hosary — 6th of October", phone: "+20 100 550 1122" },
  sheikh_zayed: { ar: "فرع الشيخ زايد — أمريكانا بلازا", en: "Sheikh Zayed", phone: "+20 100 661 2233" },
  mansoura: { ar: "فرع المنصورة — المشاية", en: "Mansoura — Meshaya", phone: "+20 100 772 3344" },
  banha: { ar: "فرع بنها — الإشارة والفلل", en: "Banha — Villas", phone: "+20 100 883 4455" },
  tenth_ramadan: { ar: "فرع العاشر — صيدناوي والمصنع المركزي", en: "10th of Ramadan & Hub", phone: "+20 100 994 5566" },
  maadi: { ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St.", phone: "+20 100 882 3344" },
  tagamoa: { ar: "فرع التجمع الخامس — التسعين", en: "New Cairo — 90th St.", phone: "+20 100 994 5566" },
  coast: { ar: "فرع الساحل الشمالي — مارينا", en: "North Coast — Marina Hub", phone: "+20 100 331 7788" },
  kitchen: { ar: "المطبخ المركزي — طلبات التوصيل", en: "Central Kitchen Delivery Hub", phone: "+20 100 112 0000" },
  alex: { ar: "فرع الإسكندرية — سموحة", en: "Alexandria — Smouha", phone: "+20 100 771 9922" },
  // Map UUIDs to human-friendly branch info
  "2265d911-4037-4165-b835-31fbef5a7ffe": { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis", phone: "+20 100 455 2211" },
  "d4bd24ca-d25a-4fac-8c64-580a55ff9826": { ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St.", phone: "+20 100 882 3344" },
  "db8bcc98-24a9-4f91-9efa-2ab7a54b63c6": { ar: "فرع التجمع الخامس — التسعين", en: "New Cairo — 90th St.", phone: "+20 100 994 5566" },
  "2c606ea4-5cf6-4cb6-b749-32b3d8c7c8ce": { ar: "فرع الساحل الشمالي — مارينا", en: "North Coast — Marina Hub", phone: "+20 100 331 7788" },
  "27e6e065-8833-4143-9e7c-e545e53c2e80": { ar: "المطبخ المركزي — طلبات التوصيل", en: "Central Kitchen Delivery Hub", phone: "+20 100 112 0000" },
  "e5b441d4-266e-4fff-a192-424298b2888f": { ar: "فرع الإسكندرية — سموحة", en: "Alexandria — Smouha", phone: "+20 100 771 9922" },
  // Seed migration warehouse & branch UUIDs
  "30000000-0000-0000-0000-000000000001": { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis Branch", phone: "+20 100 455 2211" },
  "30000000-0000-0000-0000-000000000002": { ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St. Branch", phone: "+20 100 882 3344" },
  "30000000-0000-0000-0000-000000000003": { ar: "فرع التجمع الخامس — التسعين", en: "New Cairo — 90th St. Branch", phone: "+20 100 994 5566" },
  "30000000-0000-0000-0000-000000000004": { ar: "مصنع العاشر والمطبخ المركزي", en: "Central Factory & Kitchen Hub", phone: "+20 100 112 0000" },
};

export const PLATFORM_NAMES_MAP: Record<string, { ar: string; en: string; icon: string }> = {
  direct: { ar: "مباشر / المعرض", en: "Direct Walk-in", icon: "🏪" },
  talabat: { ar: "طلبات (Talabat)", en: "Talabat App", icon: "🛵" },
  waffarha: { ar: "وفرها (Waffarha)", en: "Waffarha App", icon: "🎟️" },
  elmenus: { ar: "المنيوز (Elmenus)", en: "Elmenus", icon: "🍔" },
  jahez: { ar: "جاهز (Jahez)", en: "Jahez", icon: "🟡" },
  hungerstation: { ar: "هنقرستيشن", en: "HungerStation", icon: "🥘" },
  noon: { ar: "نون فود (Noon)", en: "Noon Food", icon: "🛍️" },
  mrsool: { ar: "مرسول (Mrsool)", en: "Mrsool", icon: "🟢" },
  other: { ar: "تطبيق توصيل", en: "Delivery App", icon: "📱" },
};

export const PAYMENT_METHOD_NAMES_MAP: Record<string, { ar: string; en: string; icon: string }> = {
  cash: { ar: "نقداً (كاش)", en: "Cash", icon: "💵" },
  card: { ar: "فيزا / شبكة", en: "Card POS", icon: "💳" },
  wallet: { ar: "إنستاباي / محفظة", en: "InstaPay / Wallet", icon: "📱" },
  waffarha_voucher: { ar: "قسيمة وفرها", en: "Waffarha Voucher", icon: "🎟️" },
  split: { ar: "دفع مجزأ", en: "Split Payment", icon: "🔄" },
  fawry: { ar: "فوري / أمان", en: "Fawry Pay", icon: "⚡" },
  credit: { ar: "آجل / حساب عميل", en: "Customer Credit", icon: "🏢" },
  valu: { ar: "تقسيط فاليو", en: "ValU BNPL", icon: "🛍️" },
};

export function formatOrderDateTimeEnglish(rawDate?: string | Date | number): string {
  if (!rawDate) return "";
  try {
    let d: Date;
    if (typeof rawDate === "string") {
      const normalized = rawDate
        .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit).toString())
        .replace(/م/g, "PM")
        .replace(/ص/g, "AM");
      d = new Date(normalized);
      if (isNaN(d.getTime())) {
        d = new Date(rawDate);
      }
    } else {
      d = new Date(rawDate);
    }

    if (isNaN(d.getTime())) {
      return String(rawDate)
        .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit).toString())
        .replace(/م/g, "PM")
        .replace(/ص/g, "AM");
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");

    return `${year}/${month}/${day}, ${strHours}:${minutes} ${ampm}`;
  } catch {
    return String(rawDate || "");
  }
}

export function parseItemName(rawName: any, fallbackSku: string = "صنف حلوى"): { ar: string; en: string } {
  if (!rawName) return { ar: fallbackSku, en: fallbackSku };
  if (typeof rawName === "string") return { ar: rawName, en: rawName };
  if (typeof rawName === "object") {
    const ar = rawName.ar || rawName.en || fallbackSku;
    const en = rawName.en || rawName.ar || fallbackSku;
    return {
      ar: typeof ar === "string" ? ar : fallbackSku,
      en: typeof en === "string" ? en : fallbackSku,
    };
  }
  return { ar: String(rawName), en: String(rawName) };
}

export function parseBranchInfo(rawBranch: any): { ar: string; en: string; phone?: string } {
  if (!rawBranch || rawBranch === "unassigned") {
    return { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis", phone: "+20 100 455 2211" };
  }
  if (typeof rawBranch === "string") {
    const match = BRANCH_NAMES_MAP[rawBranch];
    return match || { ar: rawBranch, en: rawBranch };
  }
  if (typeof rawBranch === "object") {
    if (rawBranch.id && BRANCH_NAMES_MAP[rawBranch.id]) {
      const match = BRANCH_NAMES_MAP[rawBranch.id];
      if (match) return match;
    }
    const ar = rawBranch.ar || (typeof rawBranch.name === "object" ? rawBranch.name?.ar : rawBranch.name) || "الفرع الرئيسي";
    const en = rawBranch.en || (typeof rawBranch.name === "object" ? rawBranch.name?.en : rawBranch.name) || "Main Branch";
    return {
      ar: typeof ar === "string" ? ar : "الفرع الرئيسي",
      en: typeof en === "string" ? en : "Main Branch",
      phone: rawBranch.phone || "+20 100 112 0000",
    };
  }
  return { ar: "الفرع الرئيسي", en: "Main Branch" };
}

export function generateRealisticPosSeedOrders(): AdminPosOrder[] {
  const seed: AdminPosOrder[] = [];
  const now = new Date();

  const branches = [
    { id: "korba", name: { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis" }, cashier: "أحمد فريد" },
    { id: "maadi", name: { ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St." }, cashier: "سارة محمود" },
    { id: "tagamoa", name: { ar: "فرع التجمع الخامس — التسعين", en: "New Cairo — 90th St." }, cashier: "كريم شريف" },
    { id: "sheikh_zayed", name: { ar: "فرع الشيخ زايد — أمريكانا بلازا", en: "Sheikh Zayed" }, cashier: "مصطفى كامل" },
    { id: "abbas", name: { ar: "فرع عباس العقاد — مدينة نصر", en: "Abbas El-Akkad — Nasr City" }, cashier: "إسلام يحيى" },
    { id: "wost_elbalad", name: { ar: "فرع وسط البلد — طلعت حرب", en: "Downtown — Talaat Harb" }, cashier: "حسام حسن" },
    { id: "faisal", name: { ar: "فرع فيصل — شارع فيصل الرئيسي", en: "Faisal Main St." }, cashier: "ياسر إبراهيم" },
    { id: "alex", name: { ar: "فرع الإسكندرية — سموحة", en: "Alexandria — Smouha" }, cashier: "مروان طارق" },
    { id: "khosoos", name: { ar: "فرع الخصوص — القليوبية", en: "El-Khosoos" }, cashier: "محمد فتحي" }
  ];

  const menuPresets = [
    {
      items: [
        { id: "i-1", sku: "SKU-OM-ALI", name: { ar: "طاجن أم علي بالمكسرات والقشطة", en: "Claypot Om Ali Nuts & Cream" }, quantity: 2, unitPrice: 110, totalPrice: 220 },
        { id: "i-2", sku: "SKU-QASH", name: { ar: "قشطوطة مانجو ولوتس", en: "Qashtouta Mango & Lotus" }, quantity: 1, unitPrice: 125, totalPrice: 125 }
      ],
      total: 345,
      platform: "direct",
      method: "cash"
    },
    {
      items: [
        { id: "i-3", sku: "SKU-MIX-SHARQI", name: { ar: "طبق مشكل حلويات شرقية فاخرة 1 كجم", en: "Luxury Oriental Mix Platter 1kg" }, quantity: 1, unitPrice: 260, totalPrice: 260 },
        { id: "i-4", sku: "SKU-KON-NAB", name: { ar: "صينية كنافة نابلسية بالجبنة الساخنة", en: "Hot Cheese Nabulsi Konafa" }, quantity: 1, unitPrice: 310, totalPrice: 310 }
      ],
      total: 570,
      platform: "talabat",
      method: "card"
    },
    {
      items: [
        { id: "i-5", sku: "SKU-FATTA-KIN", name: { ar: "كاسات فتة كندر ونوتيلا مميزة", en: "Signature Kinder & Nutella Fatta" }, quantity: 3, unitPrice: 85, totalPrice: 255 },
        { id: "i-6", sku: "SKU-ROZ-FORN", name: { ar: "أرز باللبن فرن بالقشطة البلدي", en: "Oven Baked Rice Pudding with Cream" }, quantity: 2, unitPrice: 65, totalPrice: 130 }
      ],
      total: 385,
      platform: "direct",
      method: "wallet"
    },
    {
      items: [
        { id: "i-7", sku: "SKU-BASBOUSA", name: { ar: "صينية بسبوسة بالسمن البلدي والبندق", en: "Ghee & Hazelnut Basbousa Tray" }, quantity: 1, unitPrice: 195, totalPrice: 195 },
        { id: "i-8", sku: "SKU-OM-ALI", name: { ar: "طاجن أم علي بالمكسرات والقشطة", en: "Claypot Om Ali Nuts & Cream" }, quantity: 1, unitPrice: 110, totalPrice: 110 }
      ],
      total: 305,
      platform: "elmenus",
      method: "cash"
    },
    {
      items: [
        { id: "i-9", sku: "SKU-LOTUS-CAKE", name: { ar: "تورتة لوتس وكريمة بلدي حجم عائلي", en: "Family Lotus & Cream Cake" }, quantity: 1, unitPrice: 420, totalPrice: 420 }
      ],
      total: 420,
      platform: "direct",
      method: "card"
    }
  ];

  let orderSeq = 101;

  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const ordersPerDay = daysAgo === 0 ? 18 : (12 + (daysAgo % 5));
    for (let j = 0; j < ordersPerDay; j++) {
      const br = branches[(daysAgo + j) % branches.length];
      const preset = menuPresets[(daysAgo * 3 + j) % menuPresets.length];
      
      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - daysAgo);
      // Realistic daytime hours 10am to 11pm
      const hour = 10 + Math.floor((j / ordersPerDay) * 13);
      const minute = (j * 17) % 60;
      orderDate.setHours(hour, minute, 0, 0);

      const dStr = orderDate.toISOString();
      const orderNum = `ORD-${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, "0")}${String(orderDate.getDate()).padStart(2, "0")}-${orderSeq++}`;
      const platInfo = PLATFORM_NAMES_MAP[preset.platform];

      seed.push({
        id: `seed-pos-${orderNum}`,
        orderNumber: orderNum,
        branchId: br.id,
        branchName: br.name,
        cashierId: `usr-${br.id}`,
        cashierName: br.cashier,
        customerName: preset.platform === "direct" ? "عميل صالة / تيك أواي" : `عميل تطبيق ${platInfo?.ar || "توصيل"}`,
        orderType: preset.platform === "direct" ? "takeaway" : "delivery",
        orderPlatform: preset.platform,
        orderPlatformName: platInfo ? platInfo.ar : preset.platform,
        subtotal: Math.round(preset.total / 1.14),
        vatAmount: Math.round(preset.total - preset.total / 1.14),
        discountAmount: 0,
        deliveryFee: preset.platform === "direct" ? 0 : 25,
        total: preset.total + (preset.platform === "direct" ? 0 : 25),
        paymentMethod: preset.method,
        paymentMethodLabel: PAYMENT_METHOD_NAMES_MAP[preset.method]?.ar || "نقداً",
        tenderAmount: preset.total + (preset.platform === "direct" ? 0 : 25),
        changeAmount: 0,
        status: "completed",
        createdAt: dStr,
        formattedDate: formatOrderDateTimeEnglish(dStr),
        items: preset.items.map((it) => ({
          ...it,
          id: `item-${orderNum}-${it.sku}`
        }))
      });
    }
  }

  // Include full audited October 2026 dataset for all Wazeer El-Helw network branches (10 branches)
  const networkOctOrders = generateAllBranchesOctOrders();
  seed.push(...networkOctOrders);

  seed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return seed;
}

export let cachedLatestPosOrders: AdminPosOrder[] = generateRealisticPosSeedOrders();

export async function fetchLivePosOrders(): Promise<AdminPosOrder[]> {
  const seedOrders = generateRealisticPosSeedOrders();
  try {
    const { data: dbOrders, error: dbErr } = await supabase
      .from("pos_orders")
      .select("*, pos_order_items(*)")
      .order("created_at", { ascending: false })
      .limit(500);

    const mappedDbOrders: AdminPosOrder[] = [];

    if (!dbErr && Array.isArray(dbOrders)) {
      for (const row of dbOrders) {
        const brInfo = parseBranchInfo(row.branch_id);

        const items: PosOrderItemRecord[] = (row.pos_order_items || []).map((it: any) => ({
          id: it.id || `item-${Math.random()}`,
          sku: it.sku || "SKU-001",
          name: parseItemName(it.name_ar ? { ar: it.name_ar, en: it.name_en || it.name_ar } : it.sku),
          quantity: Math.max(1, Number(it.quantity) || 1),
          unitPrice: Number(it.unit_price) || 0,
          totalPrice: Number(it.total_price || (it.quantity * it.unit_price) || 0),
          notes: it.notes || undefined,
        }));

        const plat = row.order_platform || "direct";
        const platInfo = PLATFORM_NAMES_MAP[plat];

        mappedDbOrders.push({
          id: row.id || `ord-${Math.random()}`,
          orderNumber: row.order_number || row.id || "INV-POS",
          branchId: String(row.branch_id || "korba"),
          branchName: brInfo,
          cashierId: String(row.cashier_id || "usr_101"),
          cashierName: String(row.cashier_name || "كاشير مناوب"),
          customerName: String(row.customer_name || "عميل نقدي / صالة"),
          customerPhone: row.customer_phone || undefined,
          orderType: row.order_type || "takeaway",
          orderPlatform: plat,
          orderPlatformName: platInfo ? platInfo.ar : plat,
          orderRefNumber: row.order_ref_number || undefined,
          tableNumber: row.table_number || undefined,
          deliveryNotes: row.delivery_notes || undefined,
          subtotal: Number(row.subtotal) || 0,
          vatAmount: Number(row.tax_amount) || 0,
          discountAmount: Number(row.discount_amount) || 0,
          deliveryFee: Number(row.delivery_fee) || 0,
          total: Number(row.total) || 0,
          paymentMethod: row.payment_method || "cash",
          paymentMethodLabel: PAYMENT_METHOD_NAMES_MAP[row.payment_method]?.ar || row.payment_method || "نقداً",
          tenderAmount: Number(row.tender_amount || row.total || 0),
          changeAmount: Number(row.change_amount || 0),
          status: row.status || "completed",
          createdAt: row.created_at || new Date().toISOString(),
          formattedDate: formatOrderDateTimeEnglish(row.created_at || Date.now()),
          items,
        });
      }
    }

    // Merge live database orders on top of seed orders
    const combined = mappedDbOrders.length > 0
      ? [...mappedDbOrders, ...seedOrders.filter((s) => !mappedDbOrders.some((m) => m.orderNumber === s.orderNumber))]
      : seedOrders;

    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    cachedLatestPosOrders = combined;
    return combined;
  } catch (e: any) {
    console.error("Error fetching live POS orders:", e);
    return cachedLatestPosOrders.length > 0 ? cachedLatestPosOrders : seedOrders;
  }
}

// Background prefetch live orders on load
if (typeof window !== "undefined") {
  fetchLivePosOrders().catch(() => {});
}

export function getLatestPosOrders(): AdminPosOrder[] {
  return cachedLatestPosOrders;
}

export function usePosOrdersStore() {
  const [orders, setOrders] = useState<AdminPosOrder[]>(cachedLatestPosOrders);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLivePosOrders();
      setOrders(data);
    } catch (e: any) {
      console.error("Error fetching POS orders for admin panel:", e);
      setError(e.message || "Failed to load POS orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosOrders();

    // Unique subscription channel to prevent Supabase duplicate channel errors
    const channelId = `pos_orders_${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "pos_orders" }, () => {
        fetchPosOrders();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [fetchPosOrders]);

  // Computed summary metrics
  const metrics = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalCount = orders.length;
    const avgTicket = totalCount > 0 ? totalSales / totalCount : 0;
    const aggregatorOrders = orders.filter((o) => o.orderPlatform !== "direct").length;
    const cashSales = orders.filter((o) => o.paymentMethod === "cash").reduce((s, o) => s + (Number(o.total) || 0), 0);
    const cardSales = orders.filter((o) => o.paymentMethod === "card" || o.paymentMethod === "wallet").reduce((s, o) => s + (Number(o.total) || 0), 0);

    return {
      totalSales,
      totalCount,
      avgTicket,
      aggregatorOrders,
      cashSales,
      cardSales,
    };
  }, [orders]);

  return {
    orders,
    loading,
    error,
    metrics,
    refresh: fetchPosOrders,
  };
}
