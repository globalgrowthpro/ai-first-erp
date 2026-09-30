import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProductionStage =
  | "draft"
  | "confirmed"
  | "in_progress"
  | "qc_check"
  | "completed"
  | "cancelled";

export type OrderPriority = "normal" | "urgent" | "high";

export interface OrderComponentRequirement {
  productId: string;
  productName: { ar: string; en: string };
  requiredQty: number;
  unitName: string;
  unitCost: number;
  availableStock: number;
  allocated: boolean;
}

export interface ManufacturingOrder {
  id: string;
  code: string;
  bomId: string;
  finishedProductId: string;
  finishedProductName: { ar: string; en: string };
  targetQty: number;
  producedQty: number;
  unitName: { ar: string; en: string };
  sourceWarehouseId: string;
  destWarehouseId: string;
  startDate: string;
  dueDate: string;
  completedDate?: string;
  supervisor: string;
  estimatedMaterialCost: number;
  overheadCost: number;
  totalCost: number;
  status: ProductionStage;
  priority: OrderPriority;
  componentsRequired: OrderComponentRequirement[];
  qcPassed?: boolean;
  notes?: string;
}

export function useManufacturingStore() {
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase.from('work_orders').select('*');
    if (data) {
      setOrders(data.map((o: any) => ({
        id: o.id,
        code: o.order_no || `MO-${o.id.slice(0, 4)}`,
        bomId: o.bom_id || '',
        finishedProductId: o.product_id || '',
        finishedProductName: { ar: 'منتج مصنع', en: 'Manufactured Product' },
        targetQty: o.quantity || 0,
        producedQty: o.status === 'completed' ? o.quantity : 0,
        unitName: { ar: 'قطعة', en: 'Pcs' },
        sourceWarehouseId: '',
        destWarehouseId: o.warehouse_id || '',
        startDate: o.planned_date || o.created_at,
        dueDate: o.planned_date || o.created_at,
        completedDate: o.completed_at || '',
        supervisor: o.assigned_to || '',
        estimatedMaterialCost: 0,
        overheadCost: 0,
        totalCost: 0,
        status: (o.status === 'planned' ? 'confirmed' : o.status) as ProductionStage,
        priority: 'normal',
        componentsRequired: [],
        qcPassed: o.status === 'completed',
        notes: o.notes || '',
      })));
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const addOrder = useCallback(async (order: Omit<ManufacturingOrder, "id">) => {
    await supabase.from('work_orders').insert({
      order_no: order.code,
      product_id: order.finishedProductId,
      quantity: order.targetQty,
      status: 'planned' as any,
      notes: order.notes ?? null,
      warehouse_id: order.destWarehouseId,
      bom_id: order.bomId,
      planned_date: order.startDate
    });
    fetchOrders();
    return { ...order, id: 'temp' };
  }, [fetchOrders]);

  const updateOrder = useCallback(async (id: string, updates: Partial<ManufacturingOrder>) => {
    const payload: any = {};
    if (updates.targetQty !== undefined) payload.quantity = updates.targetQty;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    
    // Status mapping
    if (updates.status !== undefined) {
      if (['draft', 'confirmed', 'qc_check'].includes(updates.status)) {
        payload.status = 'planned';
      } else {
        payload.status = updates.status;
      }
    }
    if (updates.completedDate !== undefined) payload.completed_at = updates.completedDate;
    
    if (Object.keys(payload).length > 0) {
      await supabase.from('work_orders').update(payload).eq('id', id);
    }
    fetchOrders();
  }, [fetchOrders]);

  const deleteOrder = useCallback(async (id: string) => {
    await supabase.from('work_orders').delete().eq('id', id);
    fetchOrders();
  }, [fetchOrders]);

  const transitionStage = useCallback(
    async (
      id: string,
      nextStage: ProductionStage,
      options?: { qcPassed?: boolean; notes?: string }
    ) => {
      const payload: any = {};
      
      if (['draft', 'confirmed', 'qc_check'].includes(nextStage)) {
        payload.status = 'planned';
      } else {
        payload.status = nextStage;
      }

      if (nextStage === "completed") {
        payload.completed_at = new Date().toISOString();
      }
      
      if (options?.notes) {
        payload.notes = options.notes;
      }

      await supabase.from('work_orders').update(payload).eq('id', id);
      fetchOrders();
    },
    [fetchOrders]
  );

  return {
    orders,
    addOrder,
    updateOrder,
    deleteOrder,
    transitionStage,
  };
}
