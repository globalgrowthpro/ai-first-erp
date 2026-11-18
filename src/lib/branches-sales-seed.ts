import type { AdminPosOrder } from "@/lib/pos-orders-store";

// Branch definitions and targets for Wazeer El-Helw network (October 2026 audited baseline)
export interface BranchTargetConfig {
  id: string;
  name: { ar: string; en: string };
  city: string;
  phone: string;
  cashierName: string;
  targetAmt: number;
  targetOrders: number;
  cashShare: number; // e.g. 0.85
  takeawayShare: number; // e.g. 0.70
}

export const NETWORK_BRANCHES_CONFIG: BranchTargetConfig[] = [
  {
    id: "khosoos",
    name: { ar: "وزير فرع الخصوص", en: "El-Khosoos Branch" },
    city: "القليوبية",
    phone: "+20 100 773 4455",
    cashierName: "محمد فتحي",
    targetAmt: 473055.45,
    targetOrders: 2690,
    cashShare: 0.9667,
    takeawayShare: 1.0,
  },
  {
    id: "korba",
    name: { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis" },
    city: "القاهرة الشرقية",
    phone: "+20 100 455 2211",
    cashierName: "أحمد فريد",
    targetAmt: 446650.0,
    targetOrders: 2510,
    cashShare: 0.818,
    takeawayShare: 0.75,
  },
  {
    id: "tagamoa",
    name: { ar: "فرع التجمع الخامس — شارع التسعين", en: "New Cairo — 90th St." },
    city: "القاهرة الجديدة",
    phone: "+20 100 994 5566",
    cashierName: "كريم شريف",
    targetAmt: 426000.0,
    targetOrders: 2380,
    cashShare: 0.728,
    takeawayShare: 0.65,
  },
  {
    id: "sheikh_zayed",
    name: { ar: "فرع الشيخ زايد — أمريكانا بلازا", en: "Sheikh Zayed" },
    city: "الجيزة / 6 أكتوبر",
    phone: "+20 100 661 2233",
    cashierName: "مصطفى كامل",
    targetAmt: 410900.0,
    targetOrders: 2310,
    cashShare: 0.726,
    takeawayShare: 0.68,
  },
  {
    id: "maadi",
    name: { ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St." },
    city: "القاهرة الجنوبية",
    phone: "+20 100 882 3344",
    cashierName: "سارة محمود",
    targetAmt: 396500.0,
    targetOrders: 2240,
    cashShare: 0.802,
    takeawayShare: 0.70,
  },
  {
    id: "abbas",
    name: { ar: "فرع عباس العقاد — مدينة نصر", en: "Abbas El-Akkad — Nasr City" },
    city: "القاهرة الشرقية",
    phone: "+20 100 551 2233",
    cashierName: "إسلام يحيى",
    targetAmt: 384200.0,
    targetOrders: 2180,
    cashShare: 0.846,
    takeawayShare: 0.72,
  },
  {
    id: "faisal",
    name: { ar: "فرع فيصل — شارع فيصل الرئيسي", en: "Faisal Main St." },
    city: "الجيزة",
    phone: "+20 100 116 7788",
    cashierName: "ياسر إبراهيم",
    targetAmt: 359000.0,
    targetOrders: 2050,
    cashShare: 0.914,
    takeawayShare: 0.78,
  },
  {
    id: "wost_elbalad",
    name: { ar: "فرع وسط البلد — طلعت حرب", en: "Downtown — Talaat Harb" },
    city: "القاهرة الكبرى",
    phone: "+20 100 884 5566",
    cashierName: "حسام حسن",
    targetAmt: 345000.0,
    targetOrders: 1990,
    cashShare: 0.876,
    takeawayShare: 0.74,
  },
  {
    id: "alex",
    name: { ar: "فرع الإسكندرية — سموحة", en: "Alexandria — Smouha" },
    city: "عروس البحر الأبيض",
    phone: "+20 100 771 9922",
    cashierName: "مروان طارق",
    targetAmt: 332000.0,
    targetOrders: 1890,
    cashShare: 0.858,
    takeawayShare: 0.70,
  },
  {
    id: "tenth_ramadan",
    name: { ar: "فرع العاشر من رمضان والمصنع", en: "10th of Ramadan & Hub" },
    city: "الشرقية",
    phone: "+20 100 994 5566",
    cashierName: "محمود رمضان",
    targetAmt: 268400.0,
    targetOrders: 1680,
    cashShare: 0.955,
    takeawayShare: 0.85,
  },
];

const ITEMS_CATALOG = [
  { sku: "SKU-ROZ-LABAN", name: { ar: "أرز باللبن خريطة مكسرات", en: "Rice Pudding Mix" }, price: 72 },
  { sku: "SKU-ROZ-PIST", name: { ar: "أرز باللبن بستاشيو فاخر", en: "Rice Pudding Pistachio" }, price: 90 },
  { sku: "SKU-OM-ALI", name: { ar: "طاجن أم علي قشطة بلدي", en: "Om Ali with Cream" }, price: 110 },
  { sku: "SKU-QASHTOUTA", name: { ar: "قشطوطة لوتس ومانجو", en: "Qashtouta Lotus & Mango" }, price: 125 },
  { sku: "SKU-KON-NAB", name: { ar: "كنافة نابلسية بالجبن", en: "Nabulsi Konafa" }, price: 155 },
  { sku: "SKU-BASBOUSA", name: { ar: "صينية بسبوسة سمن بلدي وبندق", en: "Basbousa Tray" }, price: 195 },
  { sku: "SKU-MIX-SHARQI", name: { ar: "كيلو حلويات شرقية مشكل فاخر", en: "1kg Luxury Oriental Sweets" }, price: 260 },
  { sku: "SKU-CAKE-LOTUS", name: { ar: "تورتة لوتس عائلية", en: "Lotus Cake" }, price: 340 },
];

export function generateAllBranchesOctOrders(): AdminPosOrder[] {
  const allOrders: AdminPosOrder[] = [];

  for (const config of NETWORK_BRANCHES_CONFIG) {
    const { id: branchId, name: branchName, cashierName, targetAmt, targetOrders, cashShare, takeawayShare } = config;
    const branchInfo = { ar: branchName.ar, en: branchName.en, phone: config.phone };

    const cashOrdersCount = Math.round(targetOrders * cashShare);
    const cardOrdersCount = targetOrders - cashOrdersCount;
    const cashTotal = Math.round(targetAmt * cashShare * 100) / 100;
    const cardTotal = Math.round((targetAmt - cashTotal) * 100) / 100;

    const slices = [
      { count: cashOrdersCount, total: cashTotal, method: "cash", prefix: "CSH" },
      { count: cardOrdersCount, total: cardTotal, method: "card", prefix: "CRD" },
    ];

    for (const slice of slices) {
      const { count, total, method, prefix } = slice;
      const avg = total / count;
      let runningSum = 0;

      for (let i = 0; i < count; i++) {
        let amt: number;
        if (i === count - 1) {
          amt = Math.round((total - runningSum) * 100) / 100;
        } else {
          const factor = 0.65 + 0.7 * Math.abs(Math.sin((i + 1) * 17.113 + branchId.charCodeAt(0)));
          amt = Math.round(avg * factor);
          if (amt < 25) amt = 25;
          if (runningSum + amt >= total - (count - i - 1) * 25) {
            amt = Math.max(25, Math.round((total - runningSum) / (count - i)));
          }
          amt = Math.round(amt * 100) / 100;
          runningSum += amt;
        }

        const day = 1 + ((i * 3 + branchId.charCodeAt(1)) % 31);
        const hour = 10 + ((i + 2) % 14);
        const minute = (i * 11) % 60;
        const second = (i * 19) % 60;
        const dStr = `2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}.000Z`;
        const ordNum = `ORD-202610${String(day).padStart(2, "0")}-${branchId.slice(0, 3).toUpperCase()}-${prefix}-${String(i + 1).padStart(4, "0")}`;

        // Channel determination
        let orderType = "takeaway";
        let orderPlatform = "direct";
        let orderPlatformName = "مباشر / المعرض";

        if (branchId === "khosoos") {
          // Khosoos 100% takeaway matching audited image
          orderType = "takeaway";
          if (i >= count - 8) {
            orderPlatform = "talabat";
            orderPlatformName = "تطبيق طلبات";
          }
        } else {
          const rand = Math.abs(Math.sin(i * 9.123));
          if (rand > takeawayShare) {
            if (rand > 0.90) {
              orderType = "dine_in";
              orderPlatform = "direct";
              orderPlatformName = "صالة وضيافة";
            } else if (rand > 0.82) {
              orderType = "delivery";
              orderPlatform = "talabat";
              orderPlatformName = "تطبيق طلبات";
            } else {
              orderType = "delivery";
              orderPlatform = "direct";
              orderPlatformName = "خدمة التوصيل";
            }
          }
        }

        const mainItem = ITEMS_CATALOG[i % ITEMS_CATALOG.length];
        const qty = Math.max(1, Math.round(amt / mainItem.price));
        const unitPrice = Math.round((amt / qty) * 100) / 100;

        allOrders.push({
          id: `pos-${ordNum}`,
          orderNumber: ordNum,
          branchId,
          branchName: branchInfo,
          cashierId: `usr-${branchId}-1`,
          cashierName,
          customerName: orderPlatform === "direct" ? "عميل صالة / تيك أواي" : `عميل تطبيق ${orderPlatformName}`,
          customerPhone: undefined,
          orderType,
          orderPlatform,
          orderPlatformName,
          subtotal: amt,
          vatAmount: 0,
          discountAmount: 0,
          deliveryFee: orderType === "delivery" ? 20 : 0,
          total: amt,
          paymentMethod: method,
          paymentMethodLabel: method === "cash" ? "نقداً" : "فيزا / بطاقة",
          tenderAmount: amt,
          changeAmount: 0,
          status: "completed",
          createdAt: dStr,
          formattedDate: `${dStr.slice(0, 10)} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
          items: [
            {
              id: `itm-${ordNum}-1`,
              sku: mainItem.sku,
              name: mainItem.name,
              quantity: qty,
              unitPrice,
              totalPrice: amt,
            },
          ],
        });
      }
    }
  }

  return allOrders;
}
