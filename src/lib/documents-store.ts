import { useState, useEffect, useCallback } from "react";
import { invoices, purchaseOrders } from "@/lib/demo-data";

export type DocumentStatus = "paid" | "partial" | "overdue" | "draft";

export interface BizDocument {
  id: string;
  party: { ar: string; en: string };
  date: string;
  amount: number;
  balance: number;
  status: DocumentStatus;
  notes?: string;
}

const SALES_KEY = "wazeer_erp_sales_invoices_v1";
const PURCHASES_KEY = "wazeer_erp_purchase_orders_v1";

function useDocumentsStore(storageKey: string, seed: BizDocument[], prefix: string) {
  const [documents, setDocuments] = useState<BizDocument[]>(() => {
    if (typeof window === "undefined") return seed;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as BizDocument[];
    } catch (e) {
      console.error("Failed to parse documents store", e);
    }
    return seed;
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
