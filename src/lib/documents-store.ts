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

function useDocumentsStore(type: 'invoice' | 'purchase', prefix: string) {
  const [documents, setDocuments] = useState<BizDocument[]>([]);
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
        setDocuments(
          data.map((d: any) => {
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
          })
        );
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error("[Documents Store] Error fetching live documents:", err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchDocs();

    // Setup live subscription on sales_invoices
    const channel = supabase
      .channel(`live_documents_${type}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_invoices" },
        () => {
          fetchDocs();
        }
      )
      .subscribe();

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
