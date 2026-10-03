import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  if (!rawBranch) {
    return { ar: "الفرع الرئيسي", en: "Main Branch", phone: "+20 100 112 0000" };
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

export function usePosOrdersStore() {
  const [orders, setOrders] = useState<AdminPosOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch from Supabase pos_orders with pos_order_items
      const { data: dbOrders, error: dbErr } = await supabase
        .from("pos_orders")
        .select("*, pos_order_items(*)")
        .order("created_at", { ascending: false })
        .limit(200);

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

      // 2. Fetch and merge with localStorage ("pos_orders_history_data")
      let localOrders: AdminPosOrder[] = [];
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const stored = localStorage.getItem("pos_orders_history_data");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              localOrders = parsed.map((p: any) => {
                const brInfo = parseBranchInfo(p.branch);
                const items: PosOrderItemRecord[] = (p.items || []).map((ci: any) => ({
                  id: ci.id || `loc-item-${Math.random()}`,
                  sku: ci.product?.sku || ci.sku || "SKU-001",
                  name: parseItemName(ci.product?.name || ci.name || "صنف حلوى"),
                  quantity: Math.max(1, Number(ci.quantity) || 1),
                  unitPrice: Number(ci.unitPrice) || 0,
                  totalPrice: Number((ci.quantity || 1) * (ci.unitPrice || 0)),
                  notes: ci.note || undefined,
                }));

                const plat = p.orderPlatform || "direct";
                const platInfo = PLATFORM_NAMES_MAP[plat];

                return {
                  id: p.id || `loc-${Math.random()}`,
                  orderNumber: p.id || "INV-POS",
                  branchId: String(p.branch?.id || "korba"),
                  branchName: brInfo,
                  cashierId: String(p.cashierId || "usr_101"),
                  cashierName: String(p.cashierName || "كاشير مناوب"),
                  customerName: String(p.customer?.name || "عميل نقدي / صالة"),
                  customerPhone: p.customer?.phone || undefined,
                  orderType: p.orderType || "takeaway",
                  orderPlatform: plat,
                  orderPlatformName: platInfo ? platInfo.ar : plat,
                  orderRefNumber: p.orderRefNumber || undefined,
                  tableNumber: p.tableNumber || undefined,
                  deliveryNotes: p.deliveryNotes || undefined,
                  subtotal: Number(p.subtotal) || 0,
                  vatAmount: Number(p.vat) || 0,
                  discountAmount: Number(p.discount) || 0,
                  deliveryFee: Number(p.deliveryFee) || 0,
                  total: Number(p.total) || 0,
                  paymentMethod: p.paymentMethod || "cash",
                  paymentMethodLabel: p.paymentMethodLabel || PAYMENT_METHOD_NAMES_MAP[p.paymentMethod]?.ar || p.paymentMethod || "نقداً",
                  tenderAmount: Number(p.tendered || p.total || 0),
                  changeAmount: Number(p.change || 0),
                  status: "completed",
                  createdAt: p.createdAt || new Date().toISOString(),
                  formattedDate: formatOrderDateTimeEnglish(p.createdAt || p.date || Date.now()),
                  items,
                };
              });
            }
          }
        }
      } catch (err) {
        console.warn("Could not read pos_orders_history_data from localStorage:", err);
      }

      // Enhance DB orders with local items if DB items are empty
      const localOrdersMap = new Map<string, AdminPosOrder>();
      for (const lo of localOrders) {
        localOrdersMap.set(lo.orderNumber, lo);
      }

      for (const dbo of mappedDbOrders) {
        if (!dbo.items || dbo.items.length === 0) {
          const matched = localOrdersMap.get(dbo.orderNumber);
          if (matched && matched.items && matched.items.length > 0) {
            dbo.items = matched.items;
          }
        }
      }

      // Merge avoiding duplicate order numbers
      const combined = [...mappedDbOrders];
      const seenOrderIds = new Set(mappedDbOrders.map((o) => o.orderNumber));

      for (const lo of localOrders) {
        if (!seenOrderIds.has(lo.orderNumber)) {
          seenOrderIds.add(lo.orderNumber);
          combined.push(lo);
        }
      }

      // Sort newest first
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setOrders(combined);
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
