import { useState, useEffect, useCallback } from "react";
import { invoices, purchaseOrders } from "@/lib/demo-data";

export type DocumentStatus = "paid" | "partial" | "overdue" | "draft";

export interface InvoiceItem {
  id: string;
  sku: string;
  name: { ar: string; en: string };
  description?: { ar: string; en: string } | undefined;
  quantity: number;
  unit: { ar: string; en: string };
  unitPrice: number;
  total: number;
}

export interface BizDocument {
  id: string;
  partnerId?: string | undefined;
  party: { ar: string; en: string };
  date: string;
  dueDate?: string | undefined;
  amount: number;
  balance: number;
  status: DocumentStatus;
  notes?: string | undefined;
  items?: InvoiceItem[] | undefined;
  subtotal?: number | undefined;
  taxRate?: number | undefined;
  taxAmount?: number | undefined;
  discount?: number | undefined;
  paymentMethod?: string | undefined;
  branch?: { ar: string; en: string } | undefined;
}

export const SAMPLE_INVOICE_ITEMS: Record<string, InvoiceItem[]> = {
  "INV-10452": [
    { id: "itm-1", sku: "KSH-NUT-01", name: { ar: "طاجن كشري حلو نوتيلا لوتس ملكي", en: "Royal Nutella & Lotus Sweet Koshary" }, quantity: 150, unit: { ar: "طبق", en: "plate" }, unitPrice: 100, total: 15000 },
    { id: "itm-2", sku: "KSH-MNG-02", name: { ar: "قشطوطة مانجو فرجلو ومكسرات", en: "Kashtouta Fresh Mango & Mixed Nuts" }, quantity: 150, unit: { ar: "طبق", en: "plate" }, unitPrice: 80, total: 12000 },
    { id: "itm-3", sku: "BSB-TRK-03", name: { ar: "صينية بسبوسة تركي بالقشطة والمكسرات", en: "Turkish Basbousa with Cream & Nuts" }, quantity: 9, unit: { ar: "صينية", en: "tray" }, unitPrice: 1000, total: 9000 },
  ],
  "INV-10451": [
    { id: "itm-4", sku: "CUP-LOT-01", name: { ar: "كاسات حلويات شرقية فاخرة للكافيهات", en: "Oriental Dessert Cups for Cafes" }, quantity: 500, unit: { ar: "كاس", en: "cup" }, unitPrice: 45, total: 22500 },
    { id: "itm-5", sku: "FAT-PST-02", name: { ar: "فتة ميكس كندر وفستق حلبي محمص", en: "Fatta Mix Kinder & Roasted Pistachio" }, quantity: 300, unit: { ar: "طاجن", en: "dish" }, unitPrice: 90, total: 27000 },
    { id: "itm-6", sku: "RICE-MST-03", name: { ar: "رز بلبن مستكة وقشطة بلدي طازجة", en: "Mastic Rice Pudding with Fresh Cream" }, quantity: 500, unit: { ar: "كاس", en: "cup" }, unitPrice: 70, total: 35000 },
  ],
  "INV-10450": [
    { id: "itm-7", sku: "MINI-KSH-01", name: { ar: "بوفيه كشري حلو الوزير ميني للحفلات", en: "Mini Sweet Koshary Party Buffet" }, quantity: 250, unit: { ar: "قطعة", en: "piece" }, unitPrice: 45, total: 11250 },
    { id: "itm-8", sku: "KSH-SPRD-02", name: { ar: "طواجن قشطوطة لوتس سبريد فاخرة", en: "Kashtouta Lotus Spread Trays" }, quantity: 100, unit: { ar: "قطعة", en: "piece" }, unitPrice: 85, total: 8500 },
  ],
  "INV-10449": [
    { id: "itm-9", sku: "VIP-MIX-01", name: { ar: "ضيافة مؤتمرات كاسات ميني مكس حلا VIP", en: "VIP Conference Mini Sweet Cups" }, quantity: 200, unit: { ar: "قطعة", en: "piece" }, unitPrice: 62, total: 12400 },
  ],
  "INV-10448": [
    { id: "itm-10", sku: "TOR-ROY-01", name: { ar: "تورتة لوتس ومانجو ملكية خاصة", en: "Royal Lotus & Mango Custom Cake" }, quantity: 2, unit: { ar: "تورتة", en: "cake" }, unitPrice: 1800, total: 3600 },
    { id: "itm-11", sku: "FRT-KSH-02", name: { ar: "أطباق كشري حلو ميكس فواكه طازجة", en: "Sweet Koshary Mixed Fresh Fruits" }, quantity: 25, unit: { ar: "طبق", en: "plate" }, unitPrice: 80, total: 2000 },
  ],
  "INV-10447": [
    { id: "itm-12", sku: "GEZ-BUF-01", name: { ar: "بوفيه ضيافة عطلة نهاية الأسبوع لنادي الجزيرة", en: "Weekend Club Dessert Catering" }, quantity: 1500, unit: { ar: "قطعة", en: "item" }, unitPrice: 94, total: 141000 },
  ],
  "PO-2291": [
    { id: "po-1", sku: "RAW-NUT-15K", name: { ar: "نوتيلا إيطالي أصلي جردل 15 كجم خام", en: "Nutella Tub 15kg Original Italian" }, quantity: 10, unit: { ar: "جردل", en: "tub" }, unitPrice: 4550, total: 45500 },
  ],
  "PO-2290": [
    { id: "po-2", sku: "RAW-RICE-SH", name: { ar: "أرز مصري حبة قصيرة نخب أول كسر 0%", en: "Egyptian Short Grain Rice Grade 1" }, quantity: 1500, unit: { ar: "كجم", en: "kg" }, unitPrice: 11, total: 16500 },
    { id: "po-3", sku: "RAW-SUG-FINE", name: { ar: "سكر مكرر ناعم ناصع البياض كيس 50 كجم", en: "Pure White Refined Fine Sugar 50kg" }, quantity: 500, unit: { ar: "كجم", en: "kg" }, unitPrice: 18, total: 9000 },
  ],
  "PO-2289": [
    { id: "po-4", sku: "RAW-MLK-FSH", name: { ar: "حليب بقري طبيعي طازج كامل الدسم", en: "Fresh Whole Cow Milk" }, quantity: 1000, unit: { ar: "لتر", en: "liter" }, unitPrice: 12, total: 12000 },
    { id: "po-5", sku: "RAW-CRM-BAL", name: { ar: "قشطة بلدي طبيعية ممتازة للحلويات", en: "Premium Natural Clotted Baladi Cream" }, quantity: 69, unit: { ar: "كجم", en: "kg" }, unitPrice: 100, total: 6900 },
  ],
  "PO-2288": [
    { id: "po-6", sku: "PCK-BWL-WZR", name: { ar: "أطباق كرتون فويل مطبوعة بشعار وزير الحلو", en: "Branded Foil-lined Bowls 10,000 pcs" }, quantity: 10000, unit: { ar: "عبوة", en: "box" }, unitPrice: 0.63, total: 6300 },
  ],
};

export function getDocumentItems(docId: string, amount: number, kind: "sales" | "purchases"): InvoiceItem[] {
  if (SAMPLE_INVOICE_ITEMS[docId]) {
    return SAMPLE_INVOICE_ITEMS[docId];
  }
  // Generic fallback if not hardcoded
  if (kind === "sales") {
    return [
      {
        id: `itm-${docId}-1`,
        sku: `SKU-${docId}`,
        name: { ar: `تشكيلة حلويات شرقية فاخرة (${docId})`, en: `Luxury Oriental Sweets Order (${docId})` },
        quantity: 1,
        unit: { ar: "طلب", en: "order" },
        unitPrice: amount,
        total: amount,
      },
    ];
  }
  return [
    {
      id: `po-${docId}-1`,
      sku: `MAT-${docId}`,
      name: { ar: `توريد خامات ومستلزمات تصنيع (${docId})`, en: `Raw Materials Supply (${docId})` },
      quantity: 1,
      unit: { ar: "شحنة", en: "shipment" },
      unitPrice: amount,
      total: amount,
    },
  ];
}

const SALES_KEY = "wazeer_erp_sales_invoices_v3";
const PURCHASES_KEY = "wazeer_erp_purchase_orders_v3";

function useDocumentsStore(storageKey: string, seed: BizDocument[], prefix: string) {
  const [documents, setDocuments] = useState<BizDocument[]>(() => {
    const kind = prefix === "INV" ? "sales" : "purchases";
    if (typeof window === "undefined") {
      return seed.map((d) => ({ ...d, items: d.items || getDocumentItems(d.id, d.amount, kind) }));
    }
    try {
      const saved =
        localStorage.getItem(storageKey) ||
        localStorage.getItem(storageKey.replace("_v3", "_v2")) ||
        localStorage.getItem(storageKey.replace("_v3", "_v1"));
      if (saved) {
        const parsed = JSON.parse(saved) as BizDocument[];
        return parsed.map((doc) => {
          const matchedSeed = seed.find((s) => s.id === doc.id);
          const partnerId = doc.partnerId || matchedSeed?.partnerId;
          const items = doc.items && doc.items.length > 0
            ? doc.items
            : getDocumentItems(doc.id, doc.amount, kind);
          return { ...doc, partnerId, items };
        });
      }
    } catch (e) {
      console.error("Failed to parse documents store", e);
    }
    return seed.map((d) => ({ ...d, items: d.items || getDocumentItems(d.id, d.amount, kind) }));
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(documents));
    } catch (e) {
      console.error("Failed to save documents store", e);
    }
  }, [storageKey, documents]);

  const nextCode = useCallback(() => {
    const numbers = documents
      .map((d) => Number(d.id.replace(/\D/g, "")))
      .filter((v) => Number.isFinite(v) && v > 0);
    const max = numbers.length ? Math.max(...numbers) : 10000;
    return `${prefix}-${max + 1}`;
  }, [documents, prefix]);

  const addDocument = useCallback(
    (doc: Omit<BizDocument, "id"> & { id?: string }) => {
      const id = doc.id?.trim() ? doc.id.trim() : nextCode();
      const newDoc: BizDocument = { ...doc, id };
      setDocuments((prev) => [newDoc, ...prev]);
      return newDoc;
    },
    [nextCode]
  );

  const updateDocument = useCallback((id: string, updates: Partial<BizDocument>) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const markPaid = useCallback((id: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, balance: 0, status: "paid" } : d))
    );
  }, []);

  return { documents, addDocument, updateDocument, deleteDocument, markPaid, nextCode };
}

export function useSalesStore() {
  return useDocumentsStore(SALES_KEY, invoices as BizDocument[], "INV");
}

export function usePurchasesStore() {
  return useDocumentsStore(PURCHASES_KEY, purchaseOrders as BizDocument[], "PO");
}
