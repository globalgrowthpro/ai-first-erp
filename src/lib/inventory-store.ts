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
}

export interface BomComponentItem {
  id?: string;
  componentProductId: string; // Raw material or semi-finished product
  rawMaterialProductId?: string; // alias
  quantity: number;
  unitId: string;
  unitCost: number;
  totalCost: number;
}

export interface InventoryBom {
  id: string;
  code: string; // e.g. BOM-KSHR-LUX
  name: { ar: string; en: string };
  finishedProductId: string;
  outputYield: number; // e.g. 10 portions
  outputUnitId: string;
  overheadCost: number; // labor + energy per batch in EGP
  components: BomComponentItem[];
  notes?: string | undefined;
  status: BomStatus;
}

// ==========================================
// Seed Data (Wazeer El-Helw Confectionery)
// ==========================================

export const INITIAL_CATEGORIES: InventoryCategory[] = [
  { id: "cat-1", code: "CAT-RICE", name: { ar: "عشاق الرز باللبن", en: "Rice Pudding Specialties" }, type: "finished", description: { ar: "أطباق أرز بلبن بالخلطات والنكهات الشرقية والغربية", en: "Specialty rice pudding bowls with toppings" } },
  { id: "cat-2", code: "CAT-FATTA", name: { ar: "فتة الحلويات", en: "Sweet Fatta Bowls" }, type: "finished", description: { ar: "فتة بالكراميل والشوكولاتة والفواكه مع قطع الكيك المقرمش", en: "Sweet fatta bowls with sponge and sauces" } },
  { id: "cat-3", code: "CAT-DALA", name: { ar: "دنيا الدلع والمدلعة", en: "Medala'a & Delicacies" }, type: "finished", description: { ar: "المدلعة الطنطاوية الأصلية والملوخيتو الخاصة بوزير الحلو", en: "Authentic Medala'a layers and specialty desserts" } },
  { id: "cat-4", code: "CAT-TJ", name: { ar: "طواجن الفرن الساخنة", en: "Hot Oven Tajins" }, type: "finished", description: { ar: "أم علي وطواجن السعادة الطازجة من الفرن", en: "Fresh baked Om Ali and chocolate tajins" } },
  { id: "cat-5", code: "CAT-SHW", name: { ar: "شاورما الوزير الحلوة", en: "Sweet Shawarma" }, type: "finished", description: { ar: "كريب رول شاورما بحشوات النوتيلا والبستاشيو والمكسرات", en: "Rolled sweet shawarma crepes" } },
  { id: "cat-6", code: "CAT-KSHR", name: { ar: "كشري الحلو المبتكر", en: "Sweet Koshary" }, type: "finished", description: { ar: "الابتكار المصري الأكثر شهرة بطبقات الرز والكنافة والصلصات", en: "Famous dessert koshary with crunchy konafa" } },
  { id: "cat-7", code: "CAT-KSHT", name: { ar: "قشطوطة الوزير", en: "Kashtouta Cakes" }, type: "finished", description: { ar: "كيك الحليب الإسفنجي الغارق بالقشطة والكريمة والنكهات", en: "Sponge milk cakes drenched in cream and toppings" } },
  { id: "cat-8", code: "CAT-RAW", name: { ar: "خامات ومكونات خام أساسية", en: "Raw Materials & Ingredients" }, type: "raw", description: { ar: "الألبان، النوتيلا، القشطة، السكر، الأرز، والشوكولاتة الخام", en: "Dairy, spreads, nuts, flour, sugar, and cocoa" } },
  { id: "cat-9", code: "CAT-PKG", name: { ar: "عبوات ومواد التغليف", en: "Packaging & Containers" }, type: "packaging", description: { ar: "أطباق فويل، علب كرتون، أكياس، وملاعق التقديم", en: "Bowls, branded boxes, foil pans, and spoons" } },
];

export const INITIAL_WAREHOUSES: InventoryWarehouse[] = [
  { id: "wh-1", code: "WH-CENTRAL", name: { ar: "المطبخ المركزي ومصنع العاشر", en: "Central Kitchen & Factory" }, type: "kitchen", address: { ar: "المنطقة الصناعية B3، العاشر من رمضان", en: "Industrial Zone B3, 10th of Ramadan" }, managerName: "م. إبراهيم فؤاد", phone: "+20 100 882 1900", capacityPercent: 78, status: "active" },
  { id: "wh-2", code: "WH-KORBA", name: { ar: "فرع الكوربة — مصر الجديدة", en: "Heliopolis Branch" }, type: "retail", address: { ar: "14 شارع بغداد، الكوربة، القاهرة", en: "14 Baghdad St, Korba, Cairo" }, managerName: "أ. محمود سامي", phone: "+20 111 405 9210", capacityPercent: 62, status: "active" },
  { id: "wh-3", code: "WH-MAADI", name: { ar: "فرع المعادي — شارع النصر", en: "Maadi Branch" }, type: "retail", address: { ar: "تقاطع شارع النصر مع اللاسلكي، المعادي", en: "El-Nasr St, New Maadi, Cairo" }, managerName: "أ. كريم عبد الله", phone: "+20 122 710 4433", capacityPercent: 55, status: "active" },
  { id: "wh-4", code: "WH-TAGAMOA", name: { ar: "فرع التجمع الخامس — التسعين", en: "Tagamoa 90th Branch" }, type: "retail", address: { ar: "مجمع البنوك، التسعين الشمالي، القاهرة الجديدة", en: "North 90th St, New Cairo" }, managerName: "أ. عمر فاروق", phone: "+20 109 332 5580", capacityPercent: 70, status: "active" },
  { id: "wh-5", code: "WH-COLD", name: { ar: "مستودع التبريد والخامات المركزي", en: "Central Cold Storage Hub" }, type: "cold_storage", address: { ar: "طريق مصر إسماعيلية الصحراوي، الكيلو 42", en: "Cairo-Ismailia Desert Rd, Km 42" }, managerName: "م. شريف بدوي", phone: "+20 115 620 9011", capacityPercent: 88, status: "active" },
];

export const INITIAL_UNITS: InventoryUnit[] = [
  { id: "u-1", code: "PORTION", name: { ar: "طبق / بولة", en: "Portion / Bowl" }, category: "count", isBaseUnit: true, conversionFactor: 1 },
  { id: "u-2", code: "PCS", name: { ar: "قطعة", en: "Piece" }, category: "count", isBaseUnit: true, conversionFactor: 1 },
  { id: "u-3", code: "BOX", name: { ar: "كرتونة / علبة", en: "Box / Carton" }, category: "packaging", isBaseUnit: false, baseUnitCode: "PCS", conversionFactor: 12 },
  { id: "u-4", code: "KG", name: { ar: "كيلوجرام", en: "Kilogram (kg)" }, category: "weight", isBaseUnit: true, conversionFactor: 1 },
  { id: "u-5", code: "G", name: { ar: "جرام", en: "Gram (g)" }, category: "weight", isBaseUnit: false, baseUnitCode: "KG", conversionFactor: 0.001 },
  { id: "u-6", code: "LTR", name: { ar: "لتر", en: "Liter (L)" }, category: "volume", isBaseUnit: true, conversionFactor: 1 },
  { id: "u-7", code: "TRAY", name: { ar: "صينية عائلية", en: "Family Tray" }, category: "count", isBaseUnit: false, baseUnitCode: "PORTION", conversionFactor: 6 },
];

export const INITIAL_PRODUCTS: InventoryProduct[] = [
  // Finished confectionery items
  { id: "p-1", sku: "KSHR-LUX", name: { ar: "كشري حلو سوبر لوكس", en: "Sweet Koshary Super Luxe" }, categoryId: "cat-6", warehouseId: "wh-2", unitId: "u-1", costPrice: 42, sellingPrice: 100, qty: 64, minStock: 20 },
  { id: "p-2", sku: "KSHR-KND", name: { ar: "كشري حلو كيندر", en: "Sweet Koshary Kinder" }, categoryId: "cat-6", warehouseId: "wh-1", unitId: "u-1", costPrice: 35, sellingPrice: 80, qty: 115, minStock: 30 },
  { id: "p-3", sku: "KSHR-PST", name: { ar: "كشري حلو بستاشيو", en: "Sweet Koshary Pistachio" }, categoryId: "cat-6", warehouseId: "wh-4", unitId: "u-1", costPrice: 45, sellingPrice: 95, qty: 58, minStock: 20 },
  { id: "p-4", sku: "KSHR-NUT", name: { ar: "كشري حلو نوتيلا", en: "Sweet Koshary Nutella" }, categoryId: "cat-6", warehouseId: "wh-3", unitId: "u-1", costPrice: 32, sellingPrice: 75, qty: 88, minStock: 25 },
  { id: "p-5", sku: "KSH-PST", name: { ar: "قشطوطة بستاشيو", en: "Kashtouta Pistachio" }, categoryId: "cat-7", warehouseId: "wh-2", unitId: "u-1", costPrice: 38, sellingPrice: 90, qty: 85, minStock: 20 },
  { id: "p-6", sku: "KSH-NUT", name: { ar: "قشطوطة نوتيلا", en: "Kashtouta Nutella" }, categoryId: "cat-7", warehouseId: "wh-3", unitId: "u-1", costPrice: 34, sellingPrice: 80, qty: 95, minStock: 20 },
  { id: "p-7", sku: "KSH-MNG", name: { ar: "قشطوطة مانجو", en: "Kashtouta Mango" }, categoryId: "cat-7", warehouseId: "wh-4", unitId: "u-1", costPrice: 36, sellingPrice: 80, qty: 92, minStock: 20 },
  { id: "p-8", sku: "RICE-NUT", name: { ar: "رز بلبن نوتيلا", en: "Rice Pudding Nutella" }, categoryId: "cat-1", warehouseId: "wh-2", unitId: "u-1", costPrice: 21, sellingPrice: 50, qty: 120, minStock: 30 },
  { id: "p-9", sku: "RICE-PST", name: { ar: "رز بلبن بستاشيو", en: "Rice Pudding Pistachio" }, categoryId: "cat-1", warehouseId: "wh-4", unitId: "u-1", costPrice: 35, sellingPrice: 80, qty: 60, minStock: 20 },
  { id: "p-10", sku: "FAT-WZR", name: { ar: "فتة ميكس الوزير", en: "Fatta Mix Al-Wazeer" }, categoryId: "cat-2", warehouseId: "wh-2", unitId: "u-1", costPrice: 40, sellingPrice: 90, qty: 45, minStock: 15 },
  { id: "p-11", sku: "FAT-PST", name: { ar: "فتة بستاشيو", en: "Fatta Pistachio" }, categoryId: "cat-2", warehouseId: "wh-1", unitId: "u-1", costPrice: 44, sellingPrice: 95, qty: 8, minStock: 15 }, // low stock
  { id: "p-12", sku: "MDL-MNG", name: { ar: "مدلعة مانجو", en: "Medala'a Mango" }, categoryId: "cat-3", warehouseId: "wh-2", unitId: "u-1", costPrice: 33, sellingPrice: 75, qty: 65, minStock: 20 },
  { id: "p-13", sku: "MLK-WZR", name: { ar: "ملوخيتو سلانكاتية وزير", en: "Molokhito Wazeer" }, categoryId: "cat-3", warehouseId: "wh-1", unitId: "u-1", costPrice: 42, sellingPrice: 95, qty: 6, minStock: 15 }, // low stock
  { id: "p-14", sku: "TJ-ALI", name: { ar: "طاجن ام علي قشطة مكسرات", en: "Om Ali Cream & Nuts" }, categoryId: "cat-4", warehouseId: "wh-2", unitId: "u-1", costPrice: 28, sellingPrice: 70, qty: 90, minStock: 25 },
  { id: "p-15", sku: "SHW-NUT", name: { ar: "شاورما نوتيلا", en: "Sweet Shawarma Nutella" }, categoryId: "cat-5", warehouseId: "wh-2", unitId: "u-1", costPrice: 48, sellingPrice: 115, qty: 4, minStock: 12 }, // low stock

  // Raw Materials (For Kitchen & BOM)
  { id: "rm-1", sku: "RM-MILK", name: { ar: "حليب طازج بقري 100%", en: "Fresh Cow Milk" }, categoryId: "cat-8", warehouseId: "wh-5", unitId: "u-6", costPrice: 38, sellingPrice: 45, qty: 850, minStock: 200, isRawMaterial: true },
  { id: "rm-2", sku: "RM-NUT-15K", name: { ar: "نوتيلا إيطالي أصلي برميل 15 كجم", en: "Italian Nutella Tub 15kg" }, categoryId: "cat-8", warehouseId: "wh-5", unitId: "u-4", costPrice: 240, sellingPrice: 280, qty: 45, minStock: 10, isRawMaterial: true },
  { id: "rm-3", sku: "RM-PST-CR", name: { ar: "زبدة بستاشيو إيطالي فاخرة", en: "Pistachio Butter Cream" }, categoryId: "cat-8", warehouseId: "wh-5", unitId: "u-4", costPrice: 490, sellingPrice: 580, qty: 18, minStock: 8, isRawMaterial: true },
  { id: "rm-4", sku: "RM-KNF-DOUGH", name: { ar: "عجينة كنافة شعر طازجة", en: "Fresh Konafa Strands" }, categoryId: "cat-8", warehouseId: "wh-1", unitId: "u-4", costPrice: 45, sellingPrice: 55, qty: 160, minStock: 50, isRawMaterial: true },
  { id: "rm-5", sku: "RM-CREAM-BLD", name: { ar: "قشطة بلدي طبيعية ممتازة", en: "Fresh Clotted Baladi Cream" }, categoryId: "cat-8", warehouseId: "wh-5", unitId: "u-4", costPrice: 190, sellingPrice: 220, qty: 90, minStock: 25, isRawMaterial: true },
  { id: "rm-6", sku: "RM-RICE-EGY", name: { ar: "أرز مصري حبة رفيعة ممتاز", en: "Egyptian Premium Rice" }, categoryId: "cat-8", warehouseId: "wh-1", unitId: "u-4", costPrice: 32, sellingPrice: 38, qty: 420, minStock: 100, isRawMaterial: true },
  { id: "rm-7", sku: "RM-SUG-PURE", name: { ar: "سكر أبيض نقي مطحون", en: "Pure White Sugar" }, categoryId: "cat-8", warehouseId: "wh-1", unitId: "u-4", costPrice: 35, sellingPrice: 42, qty: 600, minStock: 150, isRawMaterial: true },
  { id: "rm-8", sku: "RM-LOTUS-SPR", name: { ar: "زبدة لوتس بيسكوف بلجيكي", en: "Lotus Biscoff Spread" }, categoryId: "cat-8", warehouseId: "wh-5", unitId: "u-4", costPrice: 310, sellingPrice: 360, qty: 28, minStock: 10, isRawMaterial: true },

  // Packaging
  { id: "pkg-1", sku: "PKG-BOWL-WZR", name: { ar: "علبة كشري حلو مطبوعة لوجو الوزير", en: "Branded Sweet Koshary Bowl" }, categoryId: "cat-9", warehouseId: "wh-1", unitId: "u-2", costPrice: 3.5, sellingPrice: 5, qty: 2800, minStock: 500, isRawMaterial: true },
  { id: "pkg-2", sku: "PKG-FOIL-TJ", name: { ar: "طاجن فويل حراري عالي الجودة", en: "Heat-Resistant Foil Tajin Pan" }, categoryId: "cat-9", warehouseId: "wh-1", unitId: "u-2", costPrice: 2.8, sellingPrice: 4, qty: 1500, minStock: 400, isRawMaterial: true },
];

export const INITIAL_BOM: InventoryBom[] = [
  {
    id: "bom-1",
    code: "BOM-KSHR-LUX-10",
    name: { ar: "وصفة كشري حلو سوبر لوكس (دفعة 10 أطباق)", en: "Sweet Koshary Super Luxe Batch (10 Portions)" },
    finishedProductId: "p-1",
    outputYield: 10,
    outputUnitId: "u-1",
    overheadCost: 65, // Direct labor, gas, cold refrigeration per batch
    status: "active",
    notes: "الوصفة الأكثر طلباً في فروع وزير الحلو، تعتمد على الكنافة المقرمشة وصوصات النوتيلا واللوتس الغنية.",
    components: [
      { id: "cmp-1", componentProductId: "rm-1", quantity: 2.5, unitId: "u-6", unitCost: 38, totalCost: 95 }, // 2.5 L Milk = 95
      { id: "cmp-2", componentProductId: "rm-6", quantity: 0.6, unitId: "u-4", unitCost: 32, totalCost: 19.2 }, // 0.6 kg Rice = 19.2
      { id: "cmp-3", componentProductId: "rm-7", quantity: 0.5, unitId: "u-4", unitCost: 35, totalCost: 17.5 }, // 0.5 kg Sugar = 17.5
      { id: "cmp-4", componentProductId: "rm-4", quantity: 0.8, unitId: "u-4", unitCost: 45, totalCost: 36 }, // 0.8 kg Konafa = 36
      { id: "cmp-5", componentProductId: "rm-2", quantity: 0.4, unitId: "u-4", unitCost: 240, totalCost: 96 }, // 0.4 kg Nutella = 96
      { id: "cmp-6", componentProductId: "rm-5", quantity: 0.3, unitId: "u-4", unitCost: 190, totalCost: 57 }, // 0.3 kg Baladi Cream = 57
      { id: "cmp-7", componentProductId: "pkg-1", quantity: 10, unitId: "u-2", unitCost: 3.5, totalCost: 35 }, // 10 Packaging Bowls = 35
    ],
  },
  {
    id: "bom-2",
    code: "BOM-KSH-PST-10",
    name: { ar: "وصفة قشطوطة بستاشيو (دفعة 10 قطع)", en: "Kashtouta Pistachio Batch (10 Portions)" },
    finishedProductId: "p-5",
    outputYield: 10,
    outputUnitId: "u-1",
    overheadCost: 55,
    status: "active",
    notes: "كيكة الحليب الإسفنجية المنقوعة بالحليب المكثف مع كريمة البستاشيو الإيطالية.",
    components: [
      { id: "cmp-8", componentProductId: "rm-1", quantity: 3.0, unitId: "u-6", unitCost: 38, totalCost: 114 },
      { id: "cmp-9", componentProductId: "rm-7", quantity: 0.6, unitId: "u-4", unitCost: 35, totalCost: 21 },
      { id: "cmp-10", componentProductId: "rm-3", quantity: 0.35, unitId: "u-4", unitCost: 490, totalCost: 171.5 },
      { id: "cmp-11", componentProductId: "rm-5", quantity: 0.4, unitId: "u-4", unitCost: 190, totalCost: 76 },
      { id: "cmp-12", componentProductId: "pkg-1", quantity: 10, unitId: "u-2", unitCost: 3.5, totalCost: 35 },
    ],
  },
  {
    id: "bom-3",
    code: "BOM-TJ-ALI-10",
    name: { ar: "وصفة طاجن أم علي قشطة ومكسرات (10 طواجن)", en: "Om Ali Cream & Nuts Tajin Batch (10 Tajins)" },
    finishedProductId: "p-14",
    outputYield: 10,
    outputUnitId: "u-1",
    overheadCost: 45,
    status: "active",
    notes: "عجينة الميلفيه المحمصة مع الحليب الساخن والقشطة البلدي المسواة في الفرن الحجري.",
    components: [
      { id: "cmp-13", componentProductId: "rm-1", quantity: 3.5, unitId: "u-6", unitCost: 38, totalCost: 133 },
      { id: "cmp-14", componentProductId: "rm-7", quantity: 0.5, unitId: "u-4", unitCost: 35, totalCost: 17.5 },
      { id: "cmp-15", componentProductId: "rm-5", quantity: 0.5, unitId: "u-4", unitCost: 190, totalCost: 95 },
      { id: "cmp-16", componentProductId: "pkg-2", quantity: 10, unitId: "u-2", unitCost: 2.8, totalCost: 28 },
    ],
  },
];

// ==========================================
// LocalStorage Persistence Hook
// ==========================================

const STORAGE_KEYS = {
  CATEGORIES: "hafez_erp_inv_categories_v1",
  WAREHOUSES: "hafez_erp_inv_warehouses_v1",
  UNITS: "hafez_erp_inv_units_v1",
  PRODUCTS: "hafez_erp_inv_products_v1",
  BOM: "hafez_erp_inv_bom_v1",
};

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
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    addUnit,
    updateUnit,
    deleteUnit,
    addProduct,
    updateProduct,
    deleteProduct,
    addBom,
    updateBom,
    deleteBom,
    resetToSeed,
  };
}
