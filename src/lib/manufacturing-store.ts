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
    try {
      const [woRes, prodRes, bomsRes] = await Promise.all([
        supabase.from('work_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('boms').select('*, bom_lines(*)'),
      ]);

      const data = woRes.data || [];
      const productsMap = new Map((prodRes.data || []).map((p: any) => [p.id, p]));
      const bomsList = bomsRes.data || [];

      if (data) {
        setOrders(data.map((o: any) => {
          const product = productsMap.get(o.product_id);
          const matchedBom = bomsList.find((b: any) => b.id === o.bom_id || b.product_id === o.product_id);

          const componentsRequired: OrderComponentRequirement[] = (matchedBom?.bom_lines || []).map((line: any) => {
            const compProduct = productsMap.get(line.component_id);
            const reqQty = Number(line.quantity || 1) * Number(o.quantity || 1);
            const unitCost = Number(compProduct?.cost_price || 25);
            return {
              productId: line.component_id || '',
              productName: {
                ar: compProduct?.name_ar || 'خامة أولية',
                en: compProduct?.name_en || 'Raw Material',
              },
              requiredQty: reqQty,
              unitName: 'كجم',
              unitCost,
              availableStock: 100,
              allocated: true,
            };
          });

          const estimatedMaterialCost = componentsRequired.reduce(
            (sum, c) => sum + c.requiredQty * c.unitCost,
            0
          );
          const overheadCost = Math.round(estimatedMaterialCost * 0.15);
          const totalCost = estimatedMaterialCost + overheadCost;

          return {
            id: o.id,
            code: o.order_no || `MO-${o.id.slice(0, 4)}`,
            bomId: o.bom_id || matchedBom?.id || '',
            finishedProductId: o.product_id || '',
            finishedProductName: {
              ar: product?.name_ar || 'منتج مصنّع معتمد',
              en: product?.name_en || 'Manufactured Product',
            },
            targetQty: o.quantity || 0,
            producedQty: o.status === 'completed' ? o.quantity : 0,
            unitName: { ar: 'قطعة', en: 'Pcs' },
            sourceWarehouseId: '',
            destWarehouseId: o.warehouse_id || '',
            startDate: o.planned_date || o.created_at,
            dueDate: o.planned_date || o.created_at,
            completedDate: o.completed_at || '',
            supervisor: o.assigned_to || '',
            estimatedMaterialCost,
            overheadCost,
            totalCost,
            status: (o.status === 'planned' ? 'confirmed' : o.status) as ProductionStage,
            priority: 'normal',
            componentsRequired,
            qcPassed: o.status === 'completed',
            notes: o.notes || '',
          };
        }));
      }
    } catch (err) {
      console.warn("[Manufacturing Store] Failed to load work orders:", err);
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
