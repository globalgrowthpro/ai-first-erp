import { useState, useEffect, useCallback } from "react";
import {
  INITIAL_PRODUCTS,
  INITIAL_BOMS,
  INITIAL_WAREHOUSES,
  type InventoryBom,
  type InventoryProduct,
} from "./inventory-store";

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

const STORAGE_KEY = "wazeer_erp_manufacturing_orders_v1";

export const INITIAL_ORDERS: ManufacturingOrder[] = [
  {
    id: "mo-1",
    code: "MO-2026-101",
    bomId: "bom-1",
    finishedProductId: "prod-1",
    finishedProductName: { ar: "كشري حلو سوبر لوكس", en: "Sweet Koshary Super Luxe" },
    targetQty: 150,
    producedQty: 150,
    unitName: { ar: "طبق تقديم", en: "Portion" },
    sourceWarehouseId: "wh-1",
    destWarehouseId: "wh-2",
    startDate: "2026-09-08",
    dueDate: "2026-09-09",
    supervisor: "شيف إبراهيم البدري (كبير حلوانية)",
    estimatedMaterialCost: 3450,
    overheadCost: 750,
    totalCost: 4200,
    status: "in_progress",
    priority: "high",
    qcPassed: false,
    notes: "تشغيل دفعة الصباح لفروع الكوربة والمعادي مع إضافة مكسرات محمصة إضافية",
    componentsRequired: [
      {
        productId: "prod-raw-1",
        productName: { ar: "شوكولاتة نوتيلا إيطالي خام", en: "Nutella Spread 15kg" },
        requiredQty: 12,
        unitName: "كجم",
        unitCost: 190,
        availableStock: 85,
        allocated: true,
      },
      {
        productId: "prod-raw-2",
        productName: { ar: "حليب بقري مبستر كامل الدسم", en: "Fresh Whole Milk" },
        requiredQty: 45,
        unitName: "لتر",
        unitCost: 32,
        availableStock: 350,
        allocated: true,
      },
      {
        productId: "prod-raw-3",
        productName: { ar: "قشطة بلدي طبيعية طازجة", en: "Natural Baladi Clotted Cream" },
        requiredQty: 18,
        unitName: "كجم",
        unitCost: 180,
        availableStock: 90,
        allocated: true,
      },
      {
        productId: "prod-pkg-1",
        productName: { ar: "أطباق تقديم كشري الحلو لوكس", en: "Luxe Sweet Koshary Bowls" },
        requiredQty: 150,
        unitName: "قطعة",
        unitCost: 3.5,
        availableStock: 1200,
        allocated: true,
      },
    ],
  },
  {
    id: "mo-2",
    code: "MO-2026-102",
    bomId: "bom-2",
    finishedProductId: "prod-2",
    finishedProductName: { ar: "طاجن أم علي قشطة ومكسرات", en: "Om Ali Cream & Nuts Tajin" },
    targetQty: 200,
    producedQty: 200,
    unitName: { ar: "طاجن فخار", en: "Clay Tajin" },
    sourceWarehouseId: "wh-1",
    destWarehouseId: "wh-1",
    startDate: "2026-09-07",
    dueDate: "2026-09-08",
    completedDate: "2026-09-08 17:30",
    supervisor: "شيف طارق عبد العال",
    estimatedMaterialCost: 4800,
    overheadCost: 900,
    totalCost: 5700,
    status: "completed",
    priority: "normal",
    qcPassed: true,
    notes: "تم فحص القوام ودرجة التحمير بالفرن المركزي بنجاح 100%",
    componentsRequired: [
      {
        productId: "prod-raw-2",
        productName: { ar: "حليب بقري مبستر كامل الدسم", en: "Fresh Whole Milk" },
        requiredQty: 60,
        unitName: "لتر",
        unitCost: 32,
        availableStock: 350,
        allocated: true,
      },
      {
        productId: "prod-raw-3",
        productName: { ar: "قشطة بلدي طبيعية طازجة", en: "Natural Baladi Clotted Cream" },
        requiredQty: 25,
        unitName: "كجم",
        unitCost: 180,
        availableStock: 90,
        allocated: true,
      },
      {
        productId: "prod-raw-4",
        productName: { ar: "عجينة ميلفي مقرمشة زبدة نيوزيلاندي", en: "Crispy Puff Pastry Butter" },
        requiredQty: 30,
        unitName: "كجم",
        unitCost: 75,
        availableStock: 140,
        allocated: true,
      },
    ],
  },
  {
    id: "mo-3",
    code: "MO-2026-103",
    bomId: "bom-3",
    finishedProductId: "prod-3",
    finishedProductName: { ar: "مدلعة مانجو وزير الحلو", en: "Medala'a Mango Deluxe" },
    targetQty: 80,
    producedQty: 0,
    unitName: { ar: "قالب كيك", en: "Cake Mold" },
    sourceWarehouseId: "wh-1",
    destWarehouseId: "wh-4",
    startDate: "2026-09-09",
    dueDate: "2026-09-10",
    supervisor: "شيف سامح عبد النعيم",
    estimatedMaterialCost: 3100,
    overheadCost: 650,
    totalCost: 3750,
    status: "confirmed",
    priority: "urgent",
    qcPassed: false,
    notes: "مطلوبة لطلبية حفل خاص بفندق الماسة بالتجمع الخامس",
    componentsRequired: [
      {
        productId: "prod-raw-5",
        productName: { ar: "بيوريه مانجو تومي فاخر", en: "Premium Tommy Mango Puree" },
        requiredQty: 25,
        unitName: "كجم",
        unitCost: 65,
        availableStock: 80,
        allocated: true,
      },
      {
        productId: "prod-raw-3",
        productName: { ar: "قشطة بلدي طبيعية طازجة", en: "Natural Baladi Clotted Cream" },
        requiredQty: 15,
        unitName: "كجم",
        unitCost: 180,
        availableStock: 90,
        allocated: true,
      },
      {
        productId: "prod-pkg-2",
        productName: { ar: "صناديق كرتون هدايا ذهبية", en: "Gold Gift Boxes" },
        requiredQty: 80,
        unitName: "علبة",
        unitCost: 8,
        availableStock: 500,
        allocated: true,
      },
    ],
  },
  {
    id: "mo-4",
    code: "MO-2026-104",
    bomId: "bom-1",
    finishedProductId: "prod-1",
    finishedProductName: { ar: "كشري حلو سوبر لوكس", en: "Sweet Koshary Super Luxe" },
    targetQty: 100,
    producedQty: 0,
    unitName: { ar: "طبق تقديم", en: "Portion" },
    sourceWarehouseId: "wh-1",
    destWarehouseId: "wh-3",
    startDate: "2026-09-10",
    dueDate: "2026-09-11",
    supervisor: "شيف إبراهيم البدري",
    estimatedMaterialCost: 2300,
    overheadCost: 500,
    totalCost: 2800,
    status: "draft",
    priority: "normal",
    qcPassed: false,
    notes: "مخطط جدول تشغيل عطلة نهاية الأسبوع لفرع المعادي",
    componentsRequired: [
      {
        productId: "prod-raw-1",
        productName: { ar: "شوكولاتة نوتيلا إيطالي خام", en: "Nutella Spread 15kg" },
        requiredQty: 8,
        unitName: "كجم",
        unitCost: 190,
        availableStock: 85,
        allocated: false,
      },
      {
        productId: "prod-raw-2",
        productName: { ar: "حليب بقري مبستر كامل الدسم", en: "Fresh Whole Milk" },
        requiredQty: 30,
        unitName: "لتر",
        unitCost: 32,
        availableStock: 350,
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
