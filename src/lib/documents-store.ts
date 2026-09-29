import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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

function useDocumentsStore(type: 'invoice' | 'purchase', seed: BizDocument[], prefix: string) {
  const [documents, setDocuments] = useState<BizDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const { data } = (await supabase.from('documents' as any).select('*').eq('type', type).order('created_at', { ascending: false })) as { data: any[] | null };
    if (data && data.length > 0) {
      setDocuments(data.map(d => ({
        id: d.code,
        partnerId: d.partner_id || '',
        party: { ar: d.notes || 'عميل/مورد', en: d.notes || 'Party' },
        date: d.date,
        dueDate: d.due_date,
        amount: Number(d.amount),
        balance: Number(d.balance),
        status: d.status as DocumentStatus,
        notes: d.notes || '',
        items: (d.items as any) || getDocumentItems(d.code, Number(d.amount), type === 'invoice' ? 'sales' : 'purchases')
      })));
    } else {
      setDocuments([]);
    }
    setLoading(false);
  }, [type, seed]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const addDocument = useCallback(async (doc: Omit<BizDocument, "id">) => {
    const nextNum = Math.floor(Math.random() * 1000) + 10500;
    const newId = `${prefix}-${nextNum}`;
    
    await supabase.from('documents' as any).insert({
      code: newId,
      type: type,
      partner_id: doc.partnerId,
      date: doc.date,
      due_date: doc.dueDate,
      amount: doc.amount,
      balance: doc.balance,
      status: doc.status,
      notes: doc.party.ar,
      items: doc.items as any
    });
    fetchDocs();
    return { ...doc, id: newId };
  }, [type, prefix, fetchDocs]);

  const updateDocument = useCallback(async (id: string, updates: Partial<BizDocument>) => {
    const payload: any = {};
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.balance !== undefined) payload.balance = updates.balance;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.items !== undefined) payload.items = updates.items;
    
    if (Object.keys(payload).length > 0) {
      await supabase.from('documents' as any).update(payload).eq('code', id);
    }
    fetchDocs();
  }, [fetchDocs]);

  const deleteDocument = useCallback(async (id: string) => {
    await supabase.from('documents' as any).delete().eq('code', id);
    fetchDocs();
  }, [fetchDocs]);

  const nextCode = useCallback(() => {
    return `${prefix}-${Math.floor(Math.random() * 1000) + 10500}`;
  }, [prefix]);

  const markPaid = useCallback(async (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    await updateDocument(id, { status: "paid", balance: 0 });
  }, [documents, updateDocument]);

  return { documents, addDocument, updateDocument, deleteDocument, loading, nextCode, markPaid };
}

export function useSalesStore() {
  return useDocumentsStore('invoice', invoices, "INV");
}

export function usePurchasesStore() {
  return useDocumentsStore('purchase', purchaseOrders, "PO");
}
