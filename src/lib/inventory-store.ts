import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  code: string;
  name: { ar: string; en: string };
  category: UnitCategory;
  isBaseUnit: boolean;
  baseUnitCode?: string | undefined;
  conversionFactor: number;
}

export interface Branch {
  id: string;
  code: string;
  name: { ar: string; en: string };
  managerName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  city?: string | undefined;
  district?: string | undefined;
  mapUrl?: string | undefined;
  isWazeerOwned: boolean; // Yes / No
  isActive: boolean;
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
  group?: string | undefined;
  branchId?: string | undefined;
  showOnPos?: boolean; // defaults to true when not present (non-raw products are shown on POS by default)
}

export interface BomComponentItem {
  id?: string;
  componentProductId: string;
  rawMaterialProductId?: string;
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
  code: string;
  name: { ar: string; en: string };
  finishedProductId: string;
  branchId?: string | undefined;
  outputYield: number;
  outputUnitId: string;
  overheadCost: number;
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
  
  if (key.includes("الرز") || key.includes("rice")) {
    return { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/35", dot: "bg-amber-500", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35" };
  }
  if (key.includes("فتة") || key.includes("fatta")) {
    return { bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/35", dot: "bg-rose-500", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35" };
  }
  if (key.includes("دلع") || key.includes("specialt")) {
    return { bg: "bg-purple-500/15", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/35", dot: "bg-purple-500", className: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/35" };
  }
  if (key.includes("طواجن") || key.includes("tajin")) {
    return { bg: "bg-orange-500/15", text: "text-orange-700 dark:text-orange-300", border: "border-orange-500/35", dot: "bg-orange-500", className: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/35" };
  }
  if (key.includes("كيك") || key.includes("cake")) {
    return { bg: "bg-pink-500/15", text: "text-pink-700 dark:text-pink-300", border: "border-pink-500/35", dot: "bg-pink-500", className: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/35" };
  }
  if (key.includes("هدايا") || key.includes("gift")) {
    return { bg: "bg-yellow-500/15", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-500/35", dot: "bg-yellow-500", className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/35" };
  }
  if (key.includes("خام") || key.includes("raw")) {
    return { bg: "bg-slate-500/15", text: "text-slate-700 dark:text-slate-300", border: "border-slate-500/35", dot: "bg-slate-500", className: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/35" };
  }
  return { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/35", dot: "bg-blue-500", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/35" };
}

// ==========================================
// Module-level Live Store (Synced with Database)
// ==========================================

let dbCategories: InventoryCategory[] = [];
let dbWarehouses: InventoryWarehouse[] = [];
let dbUnits: InventoryUnit[] = [];
let dbProducts: InventoryProduct[] = [];
let dbBoms: InventoryBom[] = [];
let dbBranches: Branch[] = [];
let isLoadedFromDb = false;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error("Inventory listener error:", e);
    }
  });
}

// Fetch all live records directly from Supabase Database
async function fetchDatabaseState() {
  try {
    const [catRes, whRes, unRes, prodRes, stockRes, bomRes, branchRes] = await Promise.all([
      supabase.from("categories").select("*").order("name_ar"),
      supabase.from("warehouses").select("*").order("name_ar"),
      supabase.from("units").select("*").order("name_ar"),
      supabase.from("products").select("*").order("name_ar"),
      supabase.from("stock_levels").select("*"),
      supabase.from("boms").select("*, bom_lines(*)"),
      supabase.from("branches").select("*").order("name_ar"),
    ]);

    if (branchRes.data) {
      dbBranches = branchRes.data.map((b: any) => ({
        id: b.id,
        code: b.code || "",
        name: { ar: b.name_ar, en: b.name_en },
        managerName: b.manager_name || undefined,
        email: b.email || undefined,
        phone: b.phone || undefined,
        city: b.city || undefined,
        district: b.district || undefined,
        mapUrl: b.map_url || undefined,
        isWazeerOwned: Boolean(b.is_wazeer_owned),
        isActive: Boolean(b.is_active),
      }));
    }

    if (catRes.data) {
      dbCategories = catRes.data.map((c: any) => ({
        id: c.id,
        code: c.code || "",
        name: { ar: c.name_ar, en: c.name_en },
        type: (c.code?.includes("RAW") ? "raw" : c.code?.includes("PKG") ? "packaging" : "finished") as CategoryType,
        description: { ar: c.name_ar || "", en: c.name_en || "" },
      }));
    }

    if (whRes.data) {
      dbWarehouses = whRes.data.map((w: any) => ({
        id: w.id,
        code: w.code || "",
        name: { ar: w.name_ar, en: w.name_en },
        type: (w.code?.includes("FACTORY") ? "kitchen" : "retail") as WarehouseType,
        address: { ar: w.location || "", en: w.location || "" },
        managerName: w.manager_id || "مدير الفرع",
        phone: "+20 100 000 0000",
        capacityPercent: 75,
        status: w.is_active ? "active" : "inactive",
      }));
    }

    if (unRes.data) {
      dbUnits = unRes.data.map((u: any) => ({
        id: u.id,
        code: u.code || "",
        name: { ar: u.name_ar, en: u.name_en },
        category: (u.code === "KG" || u.code === "G" ? "weight" : u.code === "LTR" ? "volume" : "count") as UnitCategory,
        isBaseUnit: true,
        conversionFactor: 1,
      }));
    }

    // Map Stock levels by product_id
    const stockMap = new Map<string, number>();
    if (stockRes.data) {
      for (const s of stockRes.data) {
        const cur = stockMap.get(s.product_id) || 0;
        stockMap.set(s.product_id, cur + Number(s.quantity || 0));
      }
    }

    if (prodRes.data) {
      dbProducts = prodRes.data.map((p: any) => {
        const totalStock = stockMap.get(p.id) ?? 0;
        return {
          id: p.id,
          sku: p.sku,
          name: { ar: p.name_ar, en: p.name_en },
          categoryId: p.category_id || "",
          warehouseId: dbWarehouses[0]?.id || "",
          unitId: p.unit_id || "",
          costPrice: Number(p.cost_price || 0),
          sellingPrice: Number(p.sale_price || 0),
          qty: Math.max(0, totalStock),
          minStock: Number(p.reorder_level || 10),
          image: p.image_url || undefined,
          isRawMaterial: Boolean(p.is_raw_material),
          department: "",
          group: p.product_group || undefined,
          branchId: p.branch_id || undefined,
          showOnPos: p.show_on_pos !== undefined ? Boolean(p.show_on_pos) : (p.is_raw_material ? false : true),
        };
      });
    }

    if (bomRes.data) {
      dbBoms = bomRes.data.map((b: any) => ({
        id: b.id,
        code: b.code || "",
        name: { ar: b.name_ar || "", en: b.name_en || "" },
        finishedProductId: b.product_id || "",
        outputYield: Number(b.output_quantity || 1),
        outputUnitId: "",
        overheadCost: 0,
        components: (b.bom_lines || []).map((bl: any) => ({
          componentProductId: bl.component_id,
          quantity: Number(bl.quantity || 0),
          unitId: "",
          unitCost: 0,
          totalCost: 0,
          wastePercent: Number(bl.waste_percent || 0),
        })),
        status: b.is_active ? "active" : "draft",
      }));
    }

    isLoadedFromDb = true;
    notify();
  } catch (err) {
    console.error("Error fetching inventory from database:", err);
  }
}

// Subscribe to Supabase Realtime changes
let realtimeSubscribed = false;
function initRealtime() {
  if (realtimeSubscribed || typeof window === "undefined") return;
  realtimeSubscribed = true;

  supabase
    .channel("inventory_db_realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchDatabaseState())
    .on("postgres_changes", { event: "*", schema: "public", table: "stock_levels" }, () => fetchDatabaseState())
    .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => fetchDatabaseState())
    .on("postgres_changes", { event: "*", schema: "public", table: "warehouses" }, () => fetchDatabaseState())
    .on("postgres_changes", { event: "*", schema: "public", table: "units" }, () => fetchDatabaseState())
    .on("postgres_changes", { event: "*", schema: "public", table: "branches" }, () => fetchDatabaseState())
    .subscribe();
}

// Initial trigger
if (typeof window !== "undefined") {
  fetchDatabaseState();
  initRealtime();
}

// ==========================================
// useInventoryStore Hook
// ==========================================

export function useInventoryStore() {
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(!isLoadedFromDb);

  useEffect(() => {
    const handleUpdate = () => {
      setLoading(false);
      setTick((prev) => prev + 1);
    };
    listeners.add(handleUpdate);

    if (!isLoadedFromDb) {
      fetchDatabaseState().then(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  // Actions connecting directly to Supabase Database
  const addCategory = useCallback(async (cat: Omit<InventoryCategory, "id">) => {
    const { data, error } = await supabase
      .from("categories")
      .insert({
        code: cat.code,
        name_ar: cat.name.ar,
        name_en: cat.name.en,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add category to database:", error);
      throw error;
    }
    await fetchDatabaseState();
    return {
      ...cat,
      id: data.id,
    };
  }, []);

  const updateCategory = useCallback(async (id: string, updates: Partial<InventoryCategory>) => {
    const dbUpdate: any = {};
    if (updates.code) dbUpdate.code = updates.code;
    if (updates.name) {
      dbUpdate.name_ar = updates.name.ar;
      dbUpdate.name_en = updates.name.en;
    }
    await supabase.from("categories").update(dbUpdate).eq("id", id);
    await fetchDatabaseState();
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    await fetchDatabaseState();
  }, []);

  const addWarehouse = useCallback(async (wh: Omit<InventoryWarehouse, "id">) => {
    const { data, error } = await supabase
      .from("warehouses")
      .insert({
        code: wh.code,
        name_ar: wh.name.ar,
        name_en: wh.name.en,
        location: wh.address?.ar || wh.address?.en || null,
        is_active: wh.status === "active",
      })
      .select()
      .single();

    if (error) throw error;
    await fetchDatabaseState();
    return { ...wh, id: data.id };
  }, []);

  const updateWarehouse = useCallback(async (id: string, updates: Partial<InventoryWarehouse>) => {
    const dbUpdate: any = {};
    if (updates.code) dbUpdate.code = updates.code;
    if (updates.name) {
      dbUpdate.name_ar = updates.name.ar;
      dbUpdate.name_en = updates.name.en;
    }
    if (updates.address) dbUpdate.location = updates.address.ar || updates.address.en;
    if (updates.status) dbUpdate.is_active = updates.status === "active";
    await supabase.from("warehouses").update(dbUpdate).eq("id", id);
    await fetchDatabaseState();
  }, []);

  const deleteWarehouse = useCallback(async (id: string) => {
    await supabase.from("warehouses").delete().eq("id", id);
    await fetchDatabaseState();
  }, []);

  const addUnit = useCallback(async (unit: Omit<InventoryUnit, "id">) => {
    const { data, error } = await supabase
      .from("units")
      .insert({
        code: unit.code,
        name_ar: unit.name.ar,
        name_en: unit.name.en,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchDatabaseState();
    return { ...unit, id: data.id };
  }, []);

  const updateUnit = useCallback(async (id: string, updates: Partial<InventoryUnit>) => {
    const dbUpdate: any = {};
    if (updates.code) dbUpdate.code = updates.code;
    if (updates.name) {
      dbUpdate.name_ar = updates.name.ar;
      dbUpdate.name_en = updates.name.en;
    }
    await supabase.from("units").update(dbUpdate).eq("id", id);
    await fetchDatabaseState();
  }, []);

  const deleteUnit = useCallback(async (id: string) => {
    await supabase.from("units").delete().eq("id", id);
    await fetchDatabaseState();
  }, []);

  const addProduct = useCallback(async (prod: Omit<InventoryProduct, "id">) => {
    const { data, error } = await supabase
      .from("products")
      .insert({
        sku: prod.sku,
        name_ar: prod.name.ar,
        name_en: prod.name.en,
        category_id: prod.categoryId || null,
        unit_id: prod.unitId || null,
        cost_price: prod.costPrice || 0,
        sale_price: prod.sellingPrice || 0,
        reorder_level: prod.minStock || 10,
        is_raw_material: Boolean(prod.isRawMaterial),
        is_active: true,
        image_url: prod.image || null,
        product_group: prod.group || null,
        branch_id: prod.branchId || null,
        show_on_pos: prod.showOnPos !== undefined ? prod.showOnPos : true,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert stock level if initial qty is set
    const whId = prod.warehouseId || dbWarehouses[0]?.id;
    if (whId) {
      await supabase.from("stock_levels").insert({
        product_id: data.id,
        warehouse_id: whId,
        quantity: prod.qty || 0,
      });
    }

    await fetchDatabaseState();
    return { ...prod, id: data.id };
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<InventoryProduct>) => {
    const dbUpdate: any = {};
    if (updates.sku) dbUpdate.sku = updates.sku;
    if (updates.name) {
      dbUpdate.name_ar = updates.name.ar;
      dbUpdate.name_en = updates.name.en;
    }
    if (updates.categoryId !== undefined) dbUpdate.category_id = updates.categoryId || null;
    if (updates.unitId !== undefined) dbUpdate.unit_id = updates.unitId || null;
    if (updates.costPrice !== undefined) dbUpdate.cost_price = updates.costPrice;
    if (updates.sellingPrice !== undefined) dbUpdate.sale_price = updates.sellingPrice;
    if (updates.minStock !== undefined) dbUpdate.reorder_level = updates.minStock;
    if (updates.isRawMaterial !== undefined) dbUpdate.is_raw_material = updates.isRawMaterial;
    if (updates.image !== undefined) dbUpdate.image_url = updates.image || null;
    if (updates.group !== undefined) dbUpdate.product_group = updates.group || null;
    if (updates.branchId !== undefined) dbUpdate.branch_id = updates.branchId || null;
    if (updates.showOnPos !== undefined) dbUpdate.show_on_pos = updates.showOnPos;

    if (Object.keys(dbUpdate).length > 0) {
      await supabase.from("products").update(dbUpdate).eq("id", id);
    }

    // Update stock level if quantity changed directly
    if (updates.qty !== undefined) {
      const whId = updates.warehouseId || dbWarehouses[0]?.id;
      if (whId) {
        await supabase.from("stock_levels").upsert({
          product_id: id,
          warehouse_id: whId,
          quantity: updates.qty,
        });
      }
    }

    await fetchDatabaseState();
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    await fetchDatabaseState();
  }, []);

  // Real-time Database Stock Adjustment
  const adjustStock = useCallback(async (productIdOrSku: string, deltaQty: number) => {
    const prod = dbProducts.find((p) => p.id === productIdOrSku || p.sku === productIdOrSku);
    if (!prod) return;

    // Optimistic UI update
    dbProducts = dbProducts.map((p) =>
      p.id === prod.id ? { ...p, qty: Math.max(0, p.qty + deltaQty) } : p
    );
    notify();

    // Persist to database
    try {
      const whId = dbWarehouses[0]?.id;
      if (!whId) return;

      const { data: currentStock } = await supabase
        .from("stock_levels")
        .select("quantity")
        .eq("product_id", prod.id)
        .eq("warehouse_id", whId)
        .maybeSingle();

      const existingQty = currentStock ? Number(currentStock.quantity) : prod.qty;
      const nextQty = Math.max(0, existingQty + deltaQty);

      await supabase.from("stock_levels").upsert({
        product_id: prod.id,
        warehouse_id: whId,
        quantity: nextQty,
      });

      // Record move
      await supabase.from("stock_moves").insert({
        move_type: deltaQty < 0 ? "out" : "in",
        product_id: prod.id,
        from_warehouse_id: deltaQty < 0 ? whId : null,
        to_warehouse_id: deltaQty > 0 ? whId : null,
        quantity: Math.abs(deltaQty),
        unit_cost: prod.costPrice,
        reference: deltaQty < 0 ? "POS-SALE" : "ADJUSTMENT",
      });
    } catch (e) {
      console.error("Failed to adjust stock in database:", e);
    }
  }, []);

  const addBom = useCallback(async (bom: Omit<InventoryBom, "id">) => {
    const { data, error } = await supabase
      .from("boms")
      .insert({
        code: bom.code,
        name_ar: bom.name.ar,
        name_en: bom.name.en,
        product_id: bom.finishedProductId,
        output_quantity: bom.outputYield,
        is_active: bom.status === "active",
      })
      .select()
      .single();

    if (error) throw error;
    await fetchDatabaseState();
    return { ...bom, id: data.id };
  }, []);

  const updateBom = useCallback(async (id: string, updates: Partial<InventoryBom>) => {
    const dbUpdate: any = {};
    if (updates.code) dbUpdate.code = updates.code;
    if (updates.name) {
      dbUpdate.name_ar = updates.name.ar;
      dbUpdate.name_en = updates.name.en;
    }
    if (updates.status) dbUpdate.is_active = updates.status === "active";
    if (updates.outputYield) dbUpdate.output_quantity = updates.outputYield;
    await supabase.from("boms").update(dbUpdate).eq("id", id);
    await fetchDatabaseState();
  }, []);

  const deleteBom = useCallback(async (id: string) => {
    await supabase.from("boms").delete().eq("id", id);
    await fetchDatabaseState();
  }, []);

  const resetToSeed = useCallback(async () => {
    await fetchDatabaseState();
  }, []);

  const importProducts = useCallback(() => 0, []);
  const importCategories = useCallback(() => 0, []);
  const importWarehouses = useCallback(() => 0, []);
  const importUnits = useCallback(() => 0, []);
  const importBoms = useCallback(() => 0, []);

  return {
    categories: dbCategories,
    warehouses: dbWarehouses,
    branches: dbBranches,
    units: dbUnits,
    products: dbProducts,
    boms: dbBoms,
    loading,
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
