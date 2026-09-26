import { useState, useEffect, useCallback } from "react";

// ==========================================
// Types & Models
// ==========================================

export type CategoryType = "finished" | "raw" | "packaging" | "semi_finished";
export type WarehouseType = "kitchen" | "retail" | "cold_storage" | "dry_storage";
export type UnitCategory = "weight" | "volume" | "count" | "packaging";
export type BomStatus = "active" | "draft" | "archived";

export interface InventoryCategory {
  id: string;
  code: string;
  name: { ar: string; en: string };
  type: CategoryType;
  description: { ar: string; en: string };
}

export interface InventoryWarehouse {
  id: string;
  code: string;
  name: { ar: string; en: string };
  type: WarehouseType;
  address: { ar: string; en: string };
  managerName: string;
  phone: string;
  capacityPercent: number;
  status: "active" | "maintenance" | "inactive";
}

export interface InventoryUnit {
  id: string;
  code: string; // e.g. KG, G, PCS, BOX, LTR, PORTION
  name: { ar: string; en: string };
  category: UnitCategory;
  isBaseUnit: boolean;
  baseUnitCode?: string | undefined;
  conversionFactor: number; // multiplier to get base unit
}

export interface InventoryProduct {
  id: string;
  sku: string;
  name: { ar: string; en: string };
  categoryId: string;
  warehouseId: string;
  unitId: string;
  costPrice: number;
  sellingPrice: number;
  qty: number;
  minStock: number;
  image?: string;
  isRawMaterial?: boolean;
  department?: string;
  classification?: string;
  rawType?: string;
}

export interface BomComponentItem {
  id?: string;
  componentProductId: string; // Raw material or semi-finished product
  rawMaterialProductId?: string; // alias
  quantity: number;
  unitId: string;
  unitCost: number;
  totalCost: number;
  multiplier?: number;
  weightQty?: number;
  weightUnit?: string;
  wastePercent?: number;
  netQty?: number;
  notes?: string;
}

export interface InventoryBom {
  id: string;
  code: string; // e.g. BOM-KSHR-LUX
  name: { ar: string; en: string };
  finishedProductId: string;
  branchId?: string | undefined; // Facility / Branch / Kitchen
  outputYield: number; // e.g. 10 portions
  outputUnitId: string;
  overheadCost: number; // labor + energy per batch in EGP
  components: BomComponentItem[];
  notes?: string | undefined;
  status: BomStatus;
  category?: string;
  department?: string;
  batchYieldWeightKg?: number;
  unitWeightKg?: number;
  totalMaterialCost?: number;
  unitCost?: number;
  isSemiFinished?: boolean;
}

// ==========================================
// Factory Master Data 2026 (Wazeer El-Helw)
// ==========================================

import {
  FACTORY_CATEGORIES,
  FACTORY_WAREHOUSES,
  FACTORY_UNITS,
  FACTORY_PRODUCTS,
  FACTORY_BOMS,
} from "./wazeer-factory-data-2026";

export const INITIAL_CATEGORIES: InventoryCategory[] = FACTORY_CATEGORIES;

export interface CategoryStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
  className: string;
}

export function getCategoryStyle(
  category?: { id?: string; code?: string; name?: { ar?: string; en?: string } } | null
): CategoryStyle {
  if (!category) {
    return {
      bg: "bg-secondary",
      text: "text-muted-foreground",
      border: "border-border",
      dot: "bg-muted-foreground",
      className: "bg-secondary text-muted-foreground border-border",
    };
  }

  const key = `${category.id || ""} ${category.code || ""} ${category.name?.en || ""} ${category.name?.ar || ""}`.toLowerCase();

  // Sponge & Bakery (CAT-SPONGE / تحضير الأسبونش) - Warm Amber
  if (key.includes("sponge") || key.includes("أسبونش") || key.includes("فرن")) {
    return {
      bg: "bg-amber-500/15",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-500/35",
      dot: "bg-amber-500",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35",
    };
  }

  // Dairy & Sauces (CAT-DAIRY / الألبان والصوصات) - Sky / Cyan
  if (key.includes("dairy") || key.includes("ألبان") || key.includes("صوص")) {
    return {
      bg: "bg-sky-500/15",
      text: "text-sky-700 dark:text-sky-300",
      border: "border-sky-500/35",
      dot: "bg-sky-500",
      className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/35",
    };
  }

  // Finished confectionery & jars (CAT-FINISHED / معلبات / منتج تام) - Emerald
  if (key.includes("finished") || key.includes("معلبات") || key.includes("تام")) {
    return {
      bg: "bg-emerald-500/15",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-500/35",
      dot: "bg-emerald-500",
      className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35",
    };
  }

  // 1. كشري الحلو المبتكر (CAT-KSHR) - Deep Indigo / Violet
  if (key.includes("kshr") || key.includes("كشري") || key.includes("koshary")) {
    return {
      bg: "bg-indigo-500/15",
      text: "text-indigo-700 dark:text-indigo-300",
      border: "border-indigo-500/35",
      dot: "bg-indigo-500",
      className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/35",
    };
  }

  // 2. قشطوطة الوزير (CAT-KSHT) - Pistachio / Mint Emerald
  if (key.includes("ksht") || key.includes("قشطوطة") || key.includes("kashtouta")) {
    return {
      bg: "bg-emerald-500/15",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-500/35",
      dot: "bg-emerald-500",
      className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35",
    };
  }

  // 3. عشاق الرز باللبن (CAT-RICE) - Sapphire / Sky Blue
  if (key.includes("rice") || key.includes("أرز") || key.includes("رز")) {
    return {
      bg: "bg-sky-500/15",
      text: "text-sky-700 dark:text-sky-300",
      border: "border-sky-500/35",
      dot: "bg-sky-500",
      className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/35",
    };
  }

  // 4. فتة الحلويات (CAT-FATTA) - Plum / Royal Purple
  if (key.includes("fatta") || key.includes("فتة")) {
    return {
      bg: "bg-purple-500/15",
      text: "text-purple-700 dark:text-purple-300",
      border: "border-purple-500/35",
      dot: "bg-purple-500",
      className: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/35",
    };
  }

  // 5. دنيا الدلع والمدلعة (CAT-DALA) - Strawberry Rose / Pink
  if (key.includes("dala") || key.includes("مدلعة") || key.includes("دلع")) {
    return {
      bg: "bg-pink-500/15",
      text: "text-pink-700 dark:text-pink-300",
      border: "border-pink-500/35",
      dot: "bg-pink-500",
      className: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/35",
    };
  }

  // 6. طواجن الفرن الساخنة (CAT-TJ) - Warm Caramel Amber
  if (key.includes("tj") || key.includes("طواجن") || key.includes("tajin")) {
    return {
      bg: "bg-amber-500/15",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-500/35",
      dot: "bg-amber-500",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35",
    };
  }

  // 7. شاورما الوزير الحلوة (CAT-SHW) - Tangerine Orange
  if (key.includes("shw") || key.includes("شاورما") || key.includes("shawarma")) {
    return {
      bg: "bg-orange-500/15",
      text: "text-orange-700 dark:text-orange-300",
      border: "border-orange-500/35",
      dot: "bg-orange-500",
      className: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/35",
    };
  }

  // 8. خامات ومكونات خام أساسية (CAT-RAW) - Slate / Zinc
  if (key.includes("raw") || key.includes("خام") || key.includes("خامات")) {
    return {
      bg: "bg-slate-500/15",
      text: "text-slate-700 dark:text-slate-300",
      border: "border-slate-500/35",
      dot: "bg-slate-500",
      className: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/35",
    };
  }

  // 9. عبوات ومواد التغليف (CAT-PKG) - Cyan / Oceanic Teal
  if (key.includes("pkg") || key.includes("تغليف") || key.includes("عبوات")) {
    return {
      bg: "bg-teal-500/15",
      text: "text-teal-700 dark:text-teal-300",
      border: "border-teal-500/35",
      dot: "bg-teal-500",
      className: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/35",
    };
  }

  // Deterministic fallback palettes for custom categories
  const FALLBACK_PALETTES: CategoryStyle[] = [
    { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/35", dot: "bg-blue-500", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/35" },
    { bg: "bg-lime-500/15", text: "text-lime-700 dark:text-lime-300", border: "border-lime-500/35", dot: "bg-lime-500", className: "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/35" },
    { bg: "bg-fuchsia-500/15", text: "text-fuchsia-700 dark:text-fuchsia-300", border: "border-fuchsia-500/35", dot: "bg-fuchsia-500", className: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/35" },
    { bg: "bg-cyan-500/15", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-500/35", dot: "bg-cyan-500", className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/35" },
    { bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/35", dot: "bg-rose-500", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35" },
    { bg: "bg-violet-500/15", text: "text-violet-700 dark:text-violet-300", border: "border-violet-500/35", dot: "bg-violet-500", className: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/35" },
  ];

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_PALETTES[Math.abs(hash) % FALLBACK_PALETTES.length]!;
}

export const INITIAL_WAREHOUSES: InventoryWarehouse[] = FACTORY_WAREHOUSES;

export const INITIAL_UNITS: InventoryUnit[] = FACTORY_UNITS;

export const INITIAL_PRODUCTS: InventoryProduct[] = FACTORY_PRODUCTS;

export const INITIAL_BOM: InventoryBom[] = FACTORY_BOMS;

// ==========================================
// LocalStorage Persistence Hook
// ==========================================

const STORAGE_KEYS = {
  CATEGORIES: "hafez_erp_inv_categories_v2026",
  WAREHOUSES: "hafez_erp_inv_warehouses_v2026",
  UNITS: "hafez_erp_inv_units_v2026",
  PRODUCTS: "hafez_erp_inv_products_v2026",
  BOM: "hafez_erp_inv_bom_v2026",
};

export const INITIAL_BOMS = INITIAL_BOM;

export function useInventoryStore() {
  const [categories, setCategories] = useState<InventoryCategory[]>(() => {
    if (typeof window === "undefined") return INITIAL_CATEGORIES;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>(() => {
    if (typeof window === "undefined") return INITIAL_WAREHOUSES;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WAREHOUSES);
      return saved ? JSON.parse(saved) : INITIAL_WAREHOUSES;
    } catch {
      return INITIAL_WAREHOUSES;
    }
  });

  const [units, setUnits] = useState<InventoryUnit[]>(() => {
    if (typeof window === "undefined") return INITIAL_UNITS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.UNITS);
      return saved ? JSON.parse(saved) : INITIAL_UNITS;
    } catch {
      return INITIAL_UNITS;
    }
  });

  const [products, setProducts] = useState<InventoryProduct[]>(() => {
    if (typeof window === "undefined") return INITIAL_PRODUCTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [boms, setBoms] = useState<InventoryBom[]>(() => {
    if (typeof window === "undefined") return INITIAL_BOM;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOM);
      return saved ? JSON.parse(saved) : INITIAL_BOM;
    } catch {
      return INITIAL_BOM;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error(e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(warehouses));
    } catch (e) {
      console.error(e);
    }
  }, [warehouses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(units));
    } catch (e) {
      console.error(e);
    }
  }, [units]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error(e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BOM, JSON.stringify(boms));
    } catch (e) {
      console.error(e);
    }
  }, [boms]);

  // ==========================================
  // Category Actions
  // ==========================================
  const addCategory = useCallback((cat: Omit<InventoryCategory, "id">) => {
    const newCat: InventoryCategory = {
      ...cat,
      id: `cat-${Date.now()}`,
    };
    setCategories((prev) => [newCat, ...prev]);
    return newCat;
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<InventoryCategory>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ==========================================
  // Warehouse Actions
  // ==========================================
  const addWarehouse = useCallback((wh: Omit<InventoryWarehouse, "id">) => {
    const newWh: InventoryWarehouse = {
      ...wh,
      id: `wh-${Date.now()}`,
    };
    setWarehouses((prev) => [newWh, ...prev]);
    return newWh;
  }, []);

  const updateWarehouse = useCallback((id: string, updates: Partial<InventoryWarehouse>) => {
    setWarehouses((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    );
  }, []);

  const deleteWarehouse = useCallback((id: string) => {
    setWarehouses((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // ==========================================
  // Unit Actions
  // ==========================================
  const addUnit = useCallback((unit: Omit<InventoryUnit, "id">) => {
    const newUnit: InventoryUnit = {
      ...unit,
      id: `u-${Date.now()}`,
    };
    setUnits((prev) => [...prev, newUnit]);
    return newUnit;
  }, []);

  const updateUnit = useCallback((id: string, updates: Partial<InventoryUnit>) => {
    setUnits((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    );
  }, []);

  const deleteUnit = useCallback((id: string) => {
    setUnits((prev) => prev.filter((u) => u.id !== id));
  }, []);

  // ==========================================
  // Product Actions
  // ==========================================
  const addProduct = useCallback((prod: Omit<InventoryProduct, "id">) => {
    const newProd: InventoryProduct = {
      ...prod,
      id: `p-${Date.now()}`,
    };
    setProducts((prev) => [newProd, ...prev]);
    return newProd;
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<InventoryProduct>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const adjustStock = useCallback((productId: string, deltaQty: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, qty: Math.max(0, p.qty + deltaQty) } : p
      )
    );
  }, []);

  // ==========================================
  // BOM Actions
  // ==========================================
  const addBom = useCallback((bom: Omit<InventoryBom, "id">) => {
    const newBom: InventoryBom = {
      ...bom,
      id: `bom-${Date.now()}`,
    };
    setBoms((prev) => [newBom, ...prev]);
    return newBom;
  }, []);

  const updateBom = useCallback((id: string, updates: Partial<InventoryBom>) => {
    setBoms((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    );
  }, []);

  const deleteBom = useCallback((id: string) => {
    setBoms((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Batch import helpers
  const importProducts = useCallback((items: Omit<InventoryProduct, "id">[]) => {
    const newItems: InventoryProduct[] = items.map((p, idx) => ({
      ...p,
      id: `p-${Date.now()}-${idx}`,
    }));
    setProducts((prev) => [...newItems, ...prev]);
    return newItems.length;
  }, []);

  const importCategories = useCallback((items: Omit<InventoryCategory, "id">[]) => {
    const newItems: InventoryCategory[] = items.map((c, idx) => ({
      ...c,
      id: `cat-${Date.now()}-${idx}`,
    }));
    setCategories((prev) => [...prev, ...newItems]);
    return newItems.length;
  }, []);

  const importWarehouses = useCallback((items: Omit<InventoryWarehouse, "id">[]) => {
    const newItems: InventoryWarehouse[] = items.map((w, idx) => ({
      ...w,
      id: `wh-${Date.now()}-${idx}`,
    }));
    setWarehouses((prev) => [...prev, ...newItems]);
    return newItems.length;
  }, []);

  const importUnits = useCallback((items: Omit<InventoryUnit, "id">[]) => {
    const newItems: InventoryUnit[] = items.map((u, idx) => ({
      ...u,
      id: `u-${Date.now()}-${idx}`,
    }));
    setUnits((prev) => [...prev, ...newItems]);
    return newItems.length;
  }, []);

  const importBoms = useCallback((items: Omit<InventoryBom, "id">[]) => {
    const newItems: InventoryBom[] = items.map((b, idx) => ({
      ...b,
      id: `bom-${Date.now()}-${idx}`,
    }));
    setBoms((prev) => [...newItems, ...prev]);
    return newItems.length;
  }, []);

  // Reset to seed data
  const resetToSeed = useCallback(() => {
    setCategories(INITIAL_CATEGORIES);
    setWarehouses(INITIAL_WAREHOUSES);
    setUnits(INITIAL_UNITS);
    setProducts(INITIAL_PRODUCTS);
    setBoms(INITIAL_BOM);
    try {
      localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
      localStorage.removeItem(STORAGE_KEYS.WAREHOUSES);
      localStorage.removeItem(STORAGE_KEYS.UNITS);
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.BOM);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return {
    categories,
    warehouses,
    units,
    products,
    boms,
    addCategory,
    updateCategory,
    deleteCategory,
    importCategories,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    importWarehouses,
    addUnit,
    updateUnit,
    deleteUnit,
    importUnits,
    addProduct,
    updateProduct,
    adjustStock,
    deleteProduct,
    importProducts,
    addBom,
    updateBom,
    deleteBom,
    importBoms,
    resetToSeed,
  };
}
