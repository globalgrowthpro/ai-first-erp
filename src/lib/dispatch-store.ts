import { useState, useEffect, useCallback } from "react";

export interface DispatchItem {
  sku: string;
  name: { ar: string; en: string };
  qty: number;
}

export interface DispatchOrder {
  id: string;
  date: string;
  branch: { ar: string; en: string };
  linkedDoc: { type: "sales" | "purchase" | "none"; id: string };
  status: "draft" | "shipped" | "delivered" | "partial" | "cancelled";
  totalItems: number;
  items: DispatchItem[];
  driver?: string;
  vehicle?: string;
}

const DEMO_DISPATCH_ORDERS: DispatchOrder[] = [
  { 
    id: "DO-1001", 
    date: new Date().toISOString().slice(0, 10), 
    branch: { ar: "الفرع الرئيسي", en: "Main Branch" }, 
    linkedDoc: { type: "sales", id: "INV-10452" },
    status: "shipped", 
    totalItems: 120,
    items: [
      { sku: "SKU-001", name: { ar: "علبة شوكولاتة", en: "Chocolate Box" }, qty: 120 }
    ],
    driver: "أحمد حسن",
    vehicle: "نقل خفيف - أ ب ج 123"
  },
  { 
    id: "DO-1002", 
    date: new Date().toISOString().slice(0, 10), 
    branch: { ar: "مستودع الشرق", en: "East Warehouse" }, 
    linkedDoc: { type: "purchase", id: "PO-2291" },
    status: "draft", 
    totalItems: 45,
    items: [
      { sku: "RAW-001", name: { ar: "دقيق فاخر", en: "Fine Flour" }, qty: 45 }
    ]
  },
];

const STORAGE_KEY = "wazeer_erp_dispatch_orders_v2";

export function useDispatchStore() {
  const [orders, setOrders] = useState<DispatchOrder[]>(() => {
    if (typeof window === "undefined") return DEMO_DISPATCH_ORDERS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEMO_DISPATCH_ORDERS;
    } catch {
      return DEMO_DISPATCH_ORDERS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error(e);
    }
  }, [orders]);

  const nextId = useCallback(() => {
    const max = orders.reduce((acc, curr) => {
      const num = parseInt(curr.id.replace("DO-", ""), 10);
      return num > acc ? num : acc;
    }, 1000);
    return `DO-${max + 1}`;
  }, [orders]);

  const addOrder = useCallback((order: Omit<DispatchOrder, "id">) => {
    const id = nextId();
    setOrders((prev) => [{ ...order, id }, ...prev]);
  }, [nextId]);

  const updateOrder = useCallback((id: string, orderUpdate: Partial<DispatchOrder>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...orderUpdate } : o)));
  }, []);

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const markStatus = useCallback((id: string, status: DispatchOrder["status"]) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }, []);

  return {
    orders,
    addOrder,
    updateOrder,
    deleteOrder,
    markStatus,
    nextId,
  };
}
