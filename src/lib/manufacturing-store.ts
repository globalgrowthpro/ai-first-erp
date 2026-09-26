import { useState, useEffect, useCallback } from "react";

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

const STORAGE_KEY = "wazeer_erp_manufacturing_orders_v2026";

export const INITIAL_ORDERS: ManufacturingOrder[] = [
  {
    id: "mo-1",
    code: "MO-2026-101",
    bomId: "bom-10048",
    finishedProductId: "prod-10048",
    finishedProductName: { ar: "رويال دبي (بستاشيو وفادج)", en: "Royal Dubai Pistachio Cake" },
    targetQty: 100,
    producedQty: 100,
    unitName: { ar: "علبة", en: "Box" },
    sourceWarehouseId: "wh-assembly-dept",
    destWarehouseId: "wh-korba",
    startDate: "2026-09-08",
    dueDate: "2026-09-09",
    supervisor: "شيف إبراهيم البدري (كبير حلوانية)",
    estimatedMaterialCost: 3850,
    overheadCost: 650,
    totalCost: 4500,
    status: "in_progress",
    priority: "high",
    qcPassed: false,
    notes: "تشغيل دفعة الصباح لفروع الكوربة والتجمع مع صوص البستاشيو المخفف والكنافة المقرمشة",
    componentsRequired: [
      {
        productId: "prod-10033",
        productName: { ar: "صاج فادج ( 2.200 )", en: "Fudge Sheet (2.2kg)" },
        requiredQty: 8,
        unitName: "صاج",
        unitCost: 110.5,
        availableStock: 25,
        allocated: true,
      },
      {
        productId: "prod-10060",
        productName: { ar: "كنافة بستاشيو", en: "Crispy Pistachio Konafa" },
        requiredQty: 12,
        unitName: "كيلو",
        unitCost: 85,
        availableStock: 40,
        allocated: true,
      },
      {
        productId: "prod-10061",
        productName: { ar: "كريمة نوتيلا بني", en: "Nutella Cream Blend" },
        requiredQty: 15,
        unitName: "كيلو",
        unitCost: 95,
        availableStock: 50,
        allocated: true,
      },
      {
        productId: "prod-10070",
        productName: { ar: "صوص بستاشيو مخفف", en: "Diluted Pistachio Sauce" },
        requiredQty: 10,
        unitName: "كيلو",
        unitCost: 140,
        availableStock: 35,
        allocated: true,
      },
    ],
  },
  {
    id: "mo-2",
    code: "MO-2026-102",
    bomId: "bom-10033",
    finishedProductId: "prod-10033",
    finishedProductName: { ar: "صاج فادج ( 2.200 كجم)", en: "Fudge Sheet (2.2kg)" },
    targetQty: 25,
    producedQty: 25,
    unitName: { ar: "صاج", en: "Tray" },
    sourceWarehouseId: "wh-sponge-dept",
    destWarehouseId: "wh-assembly-dept",
    startDate: "2026-09-07",
    dueDate: "2026-09-08",
    completedDate: "2026-09-08 17:30",
    supervisor: "شيف طارق عبد العال",
    estimatedMaterialCost: 2450,
    overheadCost: 350,
    totalCost: 2800,
    status: "completed",
    priority: "normal",
    qcPassed: true,
    notes: "تم فحص القوام ودرجة التسوية بالفرن المركزي بنجاح 100%",
    componentsRequired: [
      {
        productId: "prod-10000",
        productName: { ar: "سكر خشن", en: "Coarse White Sugar" },
        requiredQty: 15,
        unitName: "كيلو",
        unitCost: 23.5,
        availableStock: 350,
        allocated: true,
      },
      {
        productId: "prod-10001",
        productName: { ar: "دقيق جولد", en: "Gold Flour" },
        requiredQty: 18,
        unitName: "كيلو",
        unitCost: 33.8,
        availableStock: 280,
        allocated: true,
      },
      {
        productId: "prod-10010",
        productName: { ar: "بيض", en: "Eggs" },
        requiredQty: 120,
        unitName: "بيضة",
        unitCost: 3.33,
        availableStock: 500,
        allocated: true,
      },
      {
        productId: "prod-10008",
        productName: { ar: "كاكاو خام", en: "Cocoa Powder" },
        requiredQty: 4,
        unitName: "كيلو",
        unitCost: 355,
        availableStock: 45,
        allocated: true,
      },
    ],
  },
  {
    id: "mo-3",
    code: "MO-2026-103",
    bomId: "bom-10049",
    finishedProductId: "prod-10049",
    finishedProductName: { ar: "عبوة كشري أرز باللبن", en: "Sweet Koshary Rice Bowl" },
    targetQty: 150,
    producedQty: 0,
    unitName: { ar: "عبوة", en: "Bowl" },
    sourceWarehouseId: "wh-dairy-dept",
    destWarehouseId: "wh-tagamoa",
    startDate: "2026-09-09",
    dueDate: "2026-09-10",
    supervisor: "شيف سامح عبد النعيم",
    estimatedMaterialCost: 2150,
    overheadCost: 450,
    totalCost: 2600,
    status: "confirmed",
    priority: "urgent",
    qcPassed: false,
    notes: "مطلوبة لطلبية مسائية لفروع التجمع والمعادي",
    componentsRequired: [
      {
        productId: "prod-10045",
        productName: { ar: "أرز باللبن خام", en: "Raw Cooked Rice Pudding Base" },
        requiredQty: 45,
        unitName: "كيلو",
        unitCost: 28,
        availableStock: 120,
        allocated: true,
      },
      {
        productId: "prod-10068",
        productName: { ar: "صوص نوتيلا بني مخفف", en: "Diluted Nutella Sauce" },
        requiredQty: 15,
        unitName: "كيلو",
        unitCost: 95,
        availableStock: 40,
        allocated: true,
      },
    ],
  },
  {
    id: "mo-4",
    code: "MO-2026-104",
    bomId: "bom-10059",
    finishedProductId: "prod-10059",
    finishedProductName: { ar: "جار دريم كيك", en: "Dream Cake Chocolate Jar" },
    targetQty: 80,
    producedQty: 0,
    unitName: { ar: "جار", en: "Jar" },
    sourceWarehouseId: "wh-assembly-dept",
    destWarehouseId: "wh-maadi",
    startDate: "2026-09-10",
    dueDate: "2026-09-11",
    supervisor: "شيف محمود رجب",
    estimatedMaterialCost: 1950,
    overheadCost: 350,
    totalCost: 2300,
    status: "draft",
    priority: "normal",
    qcPassed: false,
    notes: "تشغيل أسبوعي لمبيعات الجارات بالمعادي",
    componentsRequired: [
      {
        productId: "prod-10033",
        productName: { ar: "صاج فادج ( 2.200 )", en: "Fudge Sheet (2.2kg)" },
        requiredQty: 5,
        unitName: "صاج",
        unitCost: 110.5,
        availableStock: 25,
        allocated: false,
      },
      {
        productId: "prod-10063",
        productName: { ar: "بودينج شوكلت", en: "Rich Chocolate Pudding" },
        requiredQty: 10,
        unitName: "كيلو",
        unitCost: 65,
        availableStock: 30,
        allocated: false,
      },
      {
        productId: "prod-10065",
        productName: { ar: "اجلاسية شوكلت", en: "Chocolate Mirror Glaze" },
        requiredQty: 6,
        unitName: "كيلو",
        unitCost: 85,
        availableStock: 20,
        allocated: false,
      },
    ],
  },
];

export function useManufacturingStore() {
  const [orders, setOrders] = useState<ManufacturingOrder[]>(() => {
    if (typeof window === "undefined") return INITIAL_ORDERS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse manufacturing orders from storage", e);
    }
    return INITIAL_ORDERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error("Failed to save manufacturing orders to storage", e);
    }
  }, [orders]);

  const addOrder = useCallback((order: Omit<ManufacturingOrder, "id">) => {
    const newOrder: ManufacturingOrder = {
      ...order,
      id: `mo-${Date.now()}`,
    };
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  }, []);

  const updateOrder = useCallback(
    (id: string, updates: Partial<ManufacturingOrder>) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
      );
    },
    []
  );

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const transitionStage = useCallback(
    (
      id: string,
      nextStage: ProductionStage,
      options?: { qcPassed?: boolean; notes?: string }
    ) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const updates: Partial<ManufacturingOrder> = {
            status: nextStage,
          };
          if (nextStage === "qc_check" && options?.qcPassed !== undefined) {
            updates.qcPassed = options.qcPassed;
          }
          if (nextStage === "completed") {
            updates.producedQty = o.targetQty;
            updates.qcPassed = true;
            updates.completedDate = new Date().toISOString().replace("T", " ").slice(0, 16);
          }
          if (options?.notes) {
            updates.notes = options.notes;
          }
          return { ...o, ...updates };
        })
      );
    },
    []
  );

  return {
    orders,
    addOrder,
    updateOrder,
    deleteOrder,
    transitionStage,
  };
}
