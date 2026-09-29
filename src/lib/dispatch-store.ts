import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DispatchItem {
  sku: string;
  name: { ar: string; en: string };
  qty: number;
}

export interface DispatchOrder {
  id: string; // we'll use tracking_number for this in UI
  date: string;
  branch: { ar: string; en: string };
  linkedDoc: { type: "sales" | "purchase" | "none"; id: string };
  status: "draft" | "shipped" | "delivered" | "partial" | "cancelled";
  totalItems: number;
  items: DispatchItem[];
  driver?: string;
  vehicle?: string;
}

export function useDispatchStore() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dispatch_shipments')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching dispatch orders:", error);
      setLoading(false);
      return;
    }

    if (data) {
      const mapped: DispatchOrder[] = data.map((row: any) => ({
        id: row.tracking_number,
        date: row.created_at,
        branch: row.branch || { ar: "فرع عام", en: "General Branch" },
        linkedDoc: row.linked_doc || { type: "none", id: "" },
        status: (row.status === 'pending' ? 'draft' : row.status) as any,
        totalItems: row.total_items || 0,
        items: row.items || [],
        driver: row.assigned_driver || "",
        vehicle: row.assigned_vehicle || ""
      }));
      setOrders(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const nextId = useCallback(() => {
    const max = orders.reduce((acc, curr) => {
      const num = parseInt(curr.id.replace("DO-", ""), 10);
      return !isNaN(num) && num > acc ? num : acc;
    }, 1000);
    return `DO-${max + 1}`;
  }, [orders]);

  const addOrder = useCallback(async (order: Omit<DispatchOrder, "id">) => {
    const id = nextId();
    const newOrder = { ...order, id };
    setOrders((prev) => [newOrder, ...prev]);

    // Save to Supabase
    await supabase.from('dispatch_shipments').insert({
      tracking_number: id,
      origin_address: 'Main Warehouse',
      destination_address: order.branch?.en || 'Unknown',
      status: 'pending',
      branch: order.branch as any,
      linked_doc: order.linkedDoc as any,
      total_items: order.totalItems,
      items: order.items as any
    });
  }, [nextId]);

  const updateOrder = useCallback(async (id: string, orderUpdate: Partial<DispatchOrder>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...orderUpdate } : o)));

    // Update in Supabase
    const updateData: any = {};
    if (orderUpdate.status) updateData.status = orderUpdate.status === 'draft' ? 'pending' : orderUpdate.status;
    if (orderUpdate.branch) updateData.branch = orderUpdate.branch as any;
    if (orderUpdate.linkedDoc) updateData.linked_doc = orderUpdate.linkedDoc as any;
    if (orderUpdate.totalItems) updateData.total_items = orderUpdate.totalItems;
    if (orderUpdate.items) updateData.items = orderUpdate.items as any;

    await supabase.from('dispatch_shipments').update(updateData).eq('tracking_number', id);
  }, []);

  const deleteOrder = useCallback(async (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await supabase.from('dispatch_shipments').delete().eq('tracking_number', id);
  }, []);

  const markStatus = useCallback(async (id: string, status: DispatchOrder["status"]) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    
    const dbStatus = status === 'draft' ? 'pending' : (status === 'partial' ? 'processing' : status);
    await supabase.from('dispatch_shipments').update({ status: dbStatus as any }).eq('tracking_number', id);
  }, []);

  return {
    orders,
    loading,
    addOrder,
    updateOrder,
    deleteOrder,
    markStatus,
    nextId,
  };
}
