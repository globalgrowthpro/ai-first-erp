import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function getDocumentItems(docId: string, amount: number, kind: "sales" | "purchases"): InvoiceItem[] {
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

export function getRelativeDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function generateDefaultSalesDocs(): BizDocument[] {
  return [
    {
      id: "INV-10452",
      partnerId: "p-1",
      party: { ar: "فندق الماسة — توريد حلويات حفلات ومؤتمرات", en: "Al-Masa Hotel — Catering & Conferences" },
      date: getRelativeDateStr(0),
      dueDate: getRelativeDateStr(-14),
      amount: 36000,
      balance: 0,
      status: "paid",
      subtotal: 31579,
      taxAmount: 4421,
      items: [
        { id: "itm-1", sku: "SKU-CAT-01", name: { ar: "صواني بسبوسة فاخرة بالمكسرات (حجم ملكي)", en: "Royal Nut Basbousa Trays" }, quantity: 40, unit: { ar: "صينية", en: "tray" }, unitPrice: 450, total: 18000 },
        { id: "itm-2", sku: "SKU-CAT-02", name: { ar: "أطباق شرقي مشكل سوبر ديلوكس", en: "Super Deluxe Mixed Oriental Platter" }, quantity: 30, unit: { ar: "طبق", en: "plate" }, unitPrice: 600, total: 18000 }
      ]
    },
    {
      id: "INV-10451",
      partnerId: "p-2",
      party: { ar: "سلسلة مطاعم وكافيهات سيزار", en: "Cesar Restaurant & Cafe Chain" },
      date: getRelativeDateStr(0),
      dueDate: getRelativeDateStr(-7),
      amount: 84500,
      balance: 24500,
      status: "partial",
      subtotal: 74123,
      taxAmount: 10377,
      items: [
        { id: "itm-3", sku: "SKU-CAT-03", name: { ar: "طواجن أم علي بالمكسرات وقشطة بلدي", en: "Claypot Om Ali with Fresh Clotted Cream" }, quantity: 350, unit: { ar: "طاجن", en: "bowl" }, unitPrice: 110, total: 38500 },
        { id: "itm-4", sku: "SKU-CAT-04", name: { ar: "قشطوطة مانجو ولوتس كافيهات", en: "Qashtouta Mango & Lotus (Cafe Packs)" }, quantity: 460, unit: { ar: "علبة", en: "box" }, unitPrice: 100, total: 46000 }
      ]
    },
    {
      id: "INV-10450",
      partnerId: "p-4",
      party: { ar: "مؤسسة لوسيل لتنظيم المناسبات", en: "Lusail Events & Catering" },
      date: getRelativeDateStr(1),
      dueDate: getRelativeDateStr(-5),
      amount: 19750,
      balance: 19750,
      status: "overdue",
      subtotal: 17325,
      taxAmount: 2425,
      items: [
        { id: "itm-5", sku: "SKU-CAT-05", name: { ar: "كاسات فتة كندر ونوتيلا للحفلات", en: "Party Cups Kinder & Nutella Fatta" }, quantity: 250, unit: { ar: "كاس", en: "cup" }, unitPrice: 79, total: 19750 }
      ]
    },
    {
      id: "INV-10449",
      partnerId: "p-9",
      party: { ar: "شركة الشرق للمؤتمرات والمعارض", en: "Sharq Conferences & Exhibitions" },
      date: getRelativeDateStr(2),
      dueDate: getRelativeDateStr(-10),
      amount: 12400,
      balance: 0,
      status: "paid",
      subtotal: 10877,
      taxAmount: 1523,
      items: [
        { id: "itm-6", sku: "SKU-CAT-06", name: { ar: "علب ضيافة ميني شرقي مشكل VIP", en: "Mini Oriental Hospitality Boxes VIP" }, quantity: 80, unit: { ar: "علبة", en: "box" }, unitPrice: 155, total: 12400 }
      ]
    },
    {
      id: "INV-10448",
      partnerId: "p-10",
      party: { ar: "المهندس محمود عبد الله — حفل خاص", en: "Mahmoud Abdullah — Private Event" },
      date: getRelativeDateStr(3),
      dueDate: getRelativeDateStr(3),
      amount: 5600,
      balance: 5600,
      status: "draft",
      subtotal: 4912,
      taxAmount: 688,
      items: [
        { id: "itm-7", sku: "SKU-CAT-07", name: { ar: "تورتة لوتس وكريمة بلدي حجم خاص", en: "Custom Special Lotus Cream Cake" }, quantity: 4, unit: { ar: "تورتة", en: "cake" }, unitPrice: 1400, total: 5600 }
      ]
    },
    {
      id: "INV-10447",
      partnerId: "p-3",
      party: { ar: "نادي الجزيرة الرياضي — بوفيه حلويات عائلي", en: "Gezira Sporting Club — Desserts Buffet" },
      date: getRelativeDateStr(4),
      dueDate: getRelativeDateStr(-2),
      amount: 141000,
      balance: 61000,
      status: "partial",
      subtotal: 123684,
      taxAmount: 17316,
      items: [
        { id: "itm-8", sku: "SKU-CAT-08", name: { ar: "بوفيه حلويات كامل مفتوح (كنافة، بسبوسة، قشطوطة)", en: "Full Dessert Buffet Open Station" }, quantity: 1, unit: { ar: "خدمة كاملة", en: "service" }, unitPrice: 141000, total: 141000 }
      ]
    }
  ];
}

export function generateDefaultPurchaseDocs(): BizDocument[] {
  return [
    {
      id: "PO-2292",
      partnerId: "p-6",
      party: { ar: "مزارع دينا — توريد حليب طازج وقشطة بلدي صباحية", en: "Dina Farms — Morning Fresh Milk & Clotted Cream" },
      date: getRelativeDateStr(0),
      dueDate: getRelativeDateStr(-7),
      amount: 28400,
      balance: 28400,
      status: "partial",
      subtotal: 24912,
      taxAmount: 3488,
      items: [
        { id: "po-1", sku: "MAT-MILK", name: { ar: "حليب طازج طبيعي 100% (أبقار)", en: "100% Natural Fresh Cow Milk" }, quantity: 800, unit: { ar: "لتر", en: "L" }, unitPrice: 24, total: 19200 },
        { id: "po-2", sku: "MAT-CREAM", name: { ar: "قشطة بلدي جاموسي طازجة", en: "Fresh Clotted Cream" }, quantity: 40, unit: { ar: "كجم", en: "kg" }, unitPrice: 230, total: 9200 }
      ]
    },
    {
      id: "PO-2291",
      partnerId: "p-5",
      party: { ar: "شركة فيريرو مصر — توريد نوتيلا 15 كجم وشوكولاتة", en: "Ferrero Egypt — Nutella Tubs 15kg & Chocolate" },
      date: getRelativeDateStr(1),
      dueDate: getRelativeDateStr(-10),
      amount: 45500,
      balance: 45500,
      status: "partial",
      subtotal: 39912,
      taxAmount: 5588,
      items: [
        { id: "po-3", sku: "MAT-NUT", name: { ar: "عبوات شوكولاتة نوتيلا فاخرة (15 كجم)", en: "Nutella Tubs (15kg)" }, quantity: 10, unit: { ar: "عبوة", en: "tub" }, unitPrice: 4550, total: 45500 }
      ]
    },
    {
      id: "PO-2290",
      partnerId: "p-7",
      party: { ar: "مطاحن ومضارب الدلتا — أرز وسكر نقي ناعم وخشن", en: "Delta Mills — Premium Rice & Sugar" },
      date: getRelativeDateStr(2),
      dueDate: getRelativeDateStr(-15),
      amount: 25500,
      balance: 0,
      status: "paid",
      subtotal: 22368,
      taxAmount: 3132,
      items: [
        { id: "po-4", sku: "MAT-SUGAR", name: { ar: "سكر مكرر فاخر شيكارة (50 كجم)", en: "Refined Sugar Bags (50kg)" }, quantity: 20, unit: { ar: "شيكارة", en: "bag" }, unitPrice: 850, total: 17000 },
        { id: "po-5", sku: "MAT-RICE", name: { ar: "أرز مصري حبة رفيعة لعمل أرز باللبن", en: "Egyptian Rice for Rice Pudding" }, quantity: 15, unit: { ar: "شيكارة", en: "bag" }, unitPrice: 566.67, total: 8500 }
      ]
    },
    {
      id: "PO-2289",
      partnerId: "p-8",
      party: { ar: "شركة الأهرام للكرتون — عبوات وعلب وتغليف الفروع", en: "Al-Ahram Packaging & Paper Boxes" },
      date: getRelativeDateStr(3),
      dueDate: getRelativeDateStr(-5),
      amount: 14800,
      balance: 14800,
      status: "overdue",
      subtotal: 12982,
      taxAmount: 1818,
      items: [
        { id: "po-6", sku: "MAT-BOX", name: { ar: "علب حلويات كرتون مقوى مطبوعة هافيز", en: "Printed Pastry Boxes (Hafez Branding)" }, quantity: 3000, unit: { ar: "علبة", en: "box" }, unitPrice: 3.5, total: 10500 },
        { id: "po-7", sku: "MAT-BAG", name: { ar: "أكياس كرافت صديقة للبيئة", en: "Kraft Paper Bags" }, quantity: 2000, unit: { ar: "كيس", en: "bag" }, unitPrice: 2.15, total: 4300 }
      ]
    },
    {
      id: "PO-2288",
      partnerId: "p-11",
      party: { ar: "شركة بركة الشرق — فستق وبندق ولوز حلبي محمص", en: "Baraka Nuts — Roasted Pistachio & Hazelnuts" },
      date: getRelativeDateStr(4),
      dueDate: getRelativeDateStr(-20),
      amount: 32400,
      balance: 0,
      status: "paid",
      subtotal: 28421,
      taxAmount: 3979,
      items: [
        { id: "po-8", sku: "MAT-PIST", name: { ar: "فستق حلبي درجة أولى مقشر ومجروش", en: "Crushed Aleppo Pistachio Grade A" }, quantity: 30, unit: { ar: "كجم", en: "kg" }, unitPrice: 720, total: 21600 },
        { id: "po-9", sku: "MAT-HAZEL", name: { ar: "بندق تركي مقشر ومحمص", en: "Roasted Turkish Hazelnuts" }, quantity: 20, unit: { ar: "كجم", en: "kg" }, unitPrice: 540, total: 10800 }
      ]
    }
  ];
}

export let cachedLatestSalesInvoices: BizDocument[] = generateDefaultSalesDocs();
export let cachedLatestPurchases: BizDocument[] = generateDefaultPurchaseDocs();

export function getLatestSalesInvoices(): BizDocument[] {
  return cachedLatestSalesInvoices;
}

export function getLatestPurchases(): BizDocument[] {
  return cachedLatestPurchases;
}

export async function fetchLiveDocuments(type: 'invoice' | 'purchase'): Promise<BizDocument[]> {
  try {
    let query = supabase
      .from('sales_invoices')
      .select(`
        id, invoice_no, partner_id, invoice_date, due_date, subtotal, tax_amount, total, balance, status, notes, created_at,
        sales_invoice_lines ( id, product_id, description, quantity, unit_price, line_total )
      `)
      .order('created_at', { ascending: false });

    if (type === 'invoice') query = query.not('invoice_no', 'ilike', 'PO-%');
    else query = query.ilike('invoice_no', 'PO-%');

    const { data } = await query;
    if (data && data.length > 0) {
      const mapped = data.map((d: any) => {
        const rawNotes = d.notes || (type === 'invoice' ? 'عميل تجاري نقدي' : 'مورد خامات ومستلزمات');
        const cleanParty = rawNotes.replace(/^\[PURCHASE\]\s*/i, '').trim();
        const lines: InvoiceItem[] =
          d.sales_invoice_lines && d.sales_invoice_lines.length > 0
            ? d.sales_invoice_lines.map((l: any, idx: number) => ({
                id: l.id || `line-${d.invoice_no}-${idx}`,
                sku: l.product_id ? String(l.product_id).slice(0, 8) : `SKU-${idx + 1}`,
                name: { ar: l.description || 'صنف', en: l.description || 'Item' },
                quantity: Number(l.quantity) || 1,
                unit: { ar: 'وحدة', en: 'unit' },
                unitPrice: Number(l.unit_price) || 0,
                total: Number(l.line_total) || (Number(l.quantity) || 1) * (Number(l.unit_price) || 0),
              }))
            : getDocumentItems(d.invoice_no, Number(d.total) || 0, type === 'invoice' ? 'sales' : 'purchases');

        const bal = Number(d.balance ?? 0);
        const computedStatus: DocumentStatus =
          bal === 0 ? "paid" : (d.status === "paid" ? "draft" : (d.status as DocumentStatus) || "draft");

        return {
          id: d.invoice_no,
          partnerId: d.partner_id || '',
          party: { ar: cleanParty, en: cleanParty },
          date: d.invoice_date || String(d.created_at || '').slice(0, 10),
          dueDate: d.due_date || undefined,
          amount: Number(d.total) || 0,
          balance: bal,
          status: computedStatus,
          notes: cleanParty,
          subtotal: Number(d.subtotal) || 0,
          taxAmount: Number(d.tax_amount) || 0,
          items: lines,
        };
      });

      if (type === 'invoice') cachedLatestSalesInvoices = mapped;
      else cachedLatestPurchases = mapped;
      return mapped;
    }
    return type === 'invoice' ? cachedLatestSalesInvoices : cachedLatestPurchases;
  } catch (err) {
    console.error(`Error fetching live ${type} documents:`, err);
    return type === 'invoice' ? cachedLatestSalesInvoices : cachedLatestPurchases;
  }
}

export async function fetchLiveSalesInvoices(): Promise<BizDocument[]> {
  return fetchLiveDocuments('invoice');
}

export async function fetchLivePurchases(): Promise<BizDocument[]> {
  return fetchLiveDocuments('purchase');
}

fetchLiveDocuments('invoice').catch(() => {});
fetchLiveDocuments('purchase').catch(() => {});

function useDocumentsStore(type: 'invoice' | 'purchase', prefix: string) {
  const [documents, setDocuments] = useState<BizDocument[]>(type === 'invoice' ? cachedLatestSalesInvoices : cachedLatestPurchases);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sales_invoices')
        .select(`
          id,
          invoice_no,
          partner_id,
          invoice_date,
          due_date,
          subtotal,
          tax_amount,
          total,
          balance,
          status,
          notes,
          created_at,
          sales_invoice_lines (
            id,
            product_id,
            description,
            quantity,
            unit_price,
            line_total
          )
        `)
        .order('created_at', { ascending: false });

      if (type === 'invoice') {
        query = query.not('invoice_no', 'ilike', 'PO-%');
      } else {
        query = query.ilike('invoice_no', 'PO-%');
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped = data.map((d: any) => {
          const rawNotes = d.notes || (type === 'invoice' ? 'عميل تجاري نقدي' : 'مورد خامات ومستلزمات');
          const cleanParty = rawNotes.replace(/^\[PURCHASE\]\s*/i, '').trim();

          const lines: InvoiceItem[] =
            d.sales_invoice_lines && d.sales_invoice_lines.length > 0
              ? d.sales_invoice_lines.map((l: any, idx: number) => ({
                  id: l.id || `line-${d.invoice_no}-${idx}`,
                  sku: l.product_id ? String(l.product_id).slice(0, 8) : `SKU-${idx + 1}`,
                  name: { ar: l.description || 'صنف', en: l.description || 'Item' },
                  quantity: Number(l.quantity) || 1,
                  unit: { ar: 'وحدة', en: 'unit' },
                  unitPrice: Number(l.unit_price) || 0,
                  total: Number(l.line_total) || (Number(l.quantity) || 1) * (Number(l.unit_price) || 0),
                }))
              : getDocumentItems(d.invoice_no, Number(d.total) || 0, type === 'invoice' ? 'sales' : 'purchases');

          const bal = Number(d.balance ?? 0);
          const computedStatus: DocumentStatus =
            bal === 0 ? "paid" : (d.status === "paid" ? "draft" : (d.status as DocumentStatus) || "draft");

          return {
            id: d.invoice_no,
            partnerId: d.partner_id || '',
            party: { ar: cleanParty, en: cleanParty },
            date: d.invoice_date || String(d.created_at || '').slice(0, 10),
            dueDate: d.due_date || undefined,
            amount: Number(d.total) || 0,
            balance: bal,
            status: computedStatus,
            notes: cleanParty,
            subtotal: Number(d.subtotal) || 0,
            taxAmount: Number(d.tax_amount) || 0,
            items: lines,
          };
        });

        if (type === 'invoice') cachedLatestSalesInvoices = mapped;
        else cachedLatestPurchases = mapped;
        setDocuments(mapped);
      } else {
        const fallback = type === 'invoice' ? generateDefaultSalesDocs() : generateDefaultPurchaseDocs();
        if (type === 'invoice') cachedLatestSalesInvoices = fallback;
        else cachedLatestPurchases = fallback;
        setDocuments(fallback);
      }
    } catch (err) {
      console.error("[Documents Store] Error fetching live documents:", err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchDocs();

    // Setup live subscription on sales_invoices with unique channel id per hook instance
    const channelId = `live_documents_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_invoices" },
        () => {
          fetchDocs();
        }
      )
      .subscribe((status: string, err?: any) => {
        if (err) console.warn("[Documents Store] Realtime error:", status, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDocs, type]);

  const addDocument = useCallback(
    async (doc: Omit<BizDocument, "id">) => {
      const nextNum = Math.floor(Math.random() * 1000) + 10500;
      const newId = `${prefix}-${nextNum}`;

      const partyLabel = doc.party?.ar || doc.notes || (type === 'invoice' ? 'عميل نقدي' : 'مورد خامات');
      const formattedNotes = type === 'purchase' ? `[PURCHASE] ${partyLabel}` : partyLabel;

      const sub = doc.subtotal ?? Number((doc.amount * 0.86).toFixed(2));
      const vat = doc.taxAmount ?? Number((doc.amount * 0.14).toFixed(2));

      // Avoid trigger bug on 'paid' by setting status to draft when fully paid
      const dbStatus = doc.status === 'paid' ? 'draft' : doc.status;

      const { data: insertedInv, error: invErr } = await supabase
        .from('sales_invoices')
        .insert({
          invoice_no: newId,
          invoice_date: doc.date || new Date().toISOString().slice(0, 10),
          due_date: doc.dueDate || null,
          subtotal: sub,
          tax_amount: vat,
          total: doc.amount,
          balance: doc.balance,
          status: dbStatus,
          notes: formattedNotes,
        })
        .select('id')
        .single();

      if (invErr) {
        console.error("[Documents Store] Error inserting sales_invoices row:", invErr);
      } else if (insertedInv && doc.items && doc.items.length > 0) {
        const linesPayload = doc.items.map((it) => ({
          invoice_id: insertedInv.id,
          description: it.name.ar || it.name.en || 'بند توريد',
          quantity: it.quantity,
          unit_price: it.unitPrice,
          line_total: it.total,
        }));
        const { error: linesErr } = await supabase.from('sales_invoice_lines').insert(linesPayload);
        if (linesErr) {
          console.error("[Documents Store] Error inserting lines:", linesErr);
        }
      }

      await fetchDocs();
      return { ...doc, id: newId };
    },
    [type, prefix, fetchDocs]
  );

  const updateDocument = useCallback(
    async (id: string, updates: Partial<BizDocument>) => {
      const dbUpdate: any = {};
      if (updates.amount !== undefined) dbUpdate.total = updates.amount;
      if (updates.balance !== undefined) dbUpdate.balance = updates.balance;
      if (updates.dueDate !== undefined) dbUpdate.due_date = updates.dueDate;
      if (updates.party?.ar) {
        dbUpdate.notes = type === 'purchase' ? `[PURCHASE] ${updates.party.ar}` : updates.party.ar;
      }
      if (updates.status !== undefined) {
        dbUpdate.status = updates.status === 'paid' ? 'draft' : updates.status;
      }

      if (Object.keys(dbUpdate).length > 0) {
        const { error } = await supabase
          .from('sales_invoices')
          .update(dbUpdate)
          .eq('invoice_no', id);
        if (error) {
          console.error("[Documents Store] Update error:", error);
        }
      }
      await fetchDocs();
    },
    [fetchDocs, type]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      try {
        const { data: inv } = await supabase
          .from('sales_invoices')
          .select('id')
          .eq('invoice_no', id)
          .maybeSingle();

        if (inv) {
          await supabase.from('sales_invoice_lines').delete().eq('invoice_id', inv.id);
          await supabase.from('sales_invoices').delete().eq('id', inv.id);
        }
      } catch (err) {
        console.error("[Documents Store] Delete error:", err);
      }
      await fetchDocs();
    },
    [fetchDocs]
  );

  const nextCode = useCallback(() => {
    return `${prefix}-${Math.floor(Math.random() * 1000) + 10500}`;
  }, [prefix]);

  const markPaid = useCallback(
    async (id: string) => {
      await updateDocument(id, { status: "paid", balance: 0 });
    },
    [updateDocument]
  );

  return { documents, addDocument, updateDocument, deleteDocument, loading, nextCode, markPaid };
}

export function useSalesStore() {
  return useDocumentsStore('invoice', "INV");
}

export function usePurchasesStore() {
  return useDocumentsStore('purchase', "PO");
}
