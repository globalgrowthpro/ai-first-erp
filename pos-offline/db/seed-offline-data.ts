/**
 * Hafez ERP — POS Offline Seed Data & Catalog Snapshot
 * Preloads realistic oriental & western sweets catalog, branch settings,
 * and authenticated cashier credentials into local IndexedDB.
 */

import { posLocalDb, type OfflineProductRecord, type OfflineCategoryRecord, type OfflineCashierAuth } from "./pos-local-db";

export const OFFLINE_SEED_CATEGORIES: OfflineCategoryRecord[] = [
  { id: "kashtouta_rice", nameAr: "أرز بلبن وقشطوطة", nameEn: "Kashtouta & Rice Pudding", sortOrder: 1 },
  { id: "oriental_sweets", nameAr: "حلويات شرقية فاخرة", nameEn: "Luxury Oriental Sweets", sortOrder: 2 },
  { id: "cakes_tortes", nameAr: "تورت وجاتوه ومناسبات", nameEn: "Cakes, Tortes & Gateaux", sortOrder: 3 },
  { id: "ice_cream_pudding", nameAr: "كاسات آيس كريم وبودينج", nameEn: "Ice Cream & Pudding Cups", sortOrder: 4 },
  { id: "boxes_gifts", nameAr: "علب هدايا ومكسرات", nameEn: "Gift Boxes & Luxury Nuts", sortOrder: 5 },
];

export const OFFLINE_SEED_PRODUCTS: OfflineProductRecord[] = [
  // 1. أرز بلبن وقشطوطة
  {
    sku: "SKU-OM-ALI-NUTS",
    barcode: "622100101",
    nameAr: "طاجن أم علي بالمكسرات والقشطة",
    nameEn: "Om Ali Claypot with Cream & Nuts",
    categoryId: "kashtouta_rice",
    categoryNameAr: "أرز بلبن وقشطوطة",
    price: 110,
    costPrice: 55,
    stock: 45,
    unit: "طاجن",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
  {
    sku: "SKU-QASH-PISTACHIO",
    barcode: "622100102",
    nameAr: "قشطوطة أرز بلبن بستاشيو فاخر",
    nameEn: "Kashtouta Rice Pudding with Pistachio",
    categoryId: "kashtouta_rice",
    categoryNameAr: "أرز بلبن وقشطوطة",
    price: 90,
    costPrice: 42,
    stock: 28,
    unit: "علبة",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
  {
    sku: "SKU-QASH-MANGO",
    barcode: "622100103",
    nameAr: "قشطوطة مانجو فريش ولوتس",
    nameEn: "Kashtouta Fresh Mango & Lotus",
    categoryId: "kashtouta_rice",
    categoryNameAr: "أرز بلبن وقشطوطة",
    price: 125,
    costPrice: 60,
    stock: 35,
    unit: "علبة",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
  {
    sku: "SKU-ROZ-FORN",
    barcode: "622100104",
    nameAr: "أرز باللبن فرن بالقشطة البلدي",
    nameEn: "Oven Baked Rice Pudding with Baladi Cream",
    categoryId: "kashtouta_rice",
    categoryNameAr: "أرز بلبن وقشطوطة",
    price: 65,
    costPrice: 28,
    stock: 50,
    unit: "طاجن",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
  {
    sku: "SKU-FATTA-KIN",
    barcode: "622100105",
    nameAr: "فتة كندر ونوتيلا مميزة وزير الحلو",
    nameEn: "Signature Kinder & Nutella Fatta",
    categoryId: "kashtouta_rice",
    categoryNameAr: "أرز بلبن وقشطوطة",
    price: 85,
    costPrice: 38,
    stock: 32,
    unit: "كاسة",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },

  // 2. حلويات شرقية فاخرة
  {
    sku: "SKU-KON-NAB",
    barcode: "622100201",
    nameAr: "صينية كنافة نابلسية بالجبنة الساخنة",
    nameEn: "Hot Cheese Nabulsi Konafa",
    categoryId: "oriental_sweets",
    categoryNameAr: "حلويات شرقية فاخرة",
    price: 310,
    costPrice: 160,
    stock: 18,
    unit: "صينية وسط",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
  {
    sku: "SKU-MIX-SHARQI-1KG",
    barcode: "622100202",
    nameAr: "طبق مشكل حلويات شرقية فاخرة 1 كجم",
    nameEn: "Luxury Oriental Mix Platter 1kg",
    categoryId: "oriental_sweets",
    categoryNameAr: "حلويات شرقية فاخرة",
    price: 260,
    costPrice: 130,
    stock: 60,
    unit: "طبق 1 كجم",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
  {
    sku: "SKU-BASBOUSA-ESHTA",
    barcode: "622100203",
    nameAr: "صينية بسبوسة مرملة بالقشطة واللوز",
    nameEn: "Soft Basbousa with Cream & Almonds",
    categoryId: "oriental_sweets",
    categoryNameAr: "حلويات شرقية فاخرة",
    price: 195,
    costPrice: 95,
    stock: 25,
    unit: "صينية",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
  {
    sku: "SKU-BAQLAWA-FESTOQ",
    barcode: "622100204",
    nameAr: "بقلاوة تركي بالفستق الحلبي 500 جم",
    nameEn: "Turkish Baklava with Aleppo Pistachio 500g",
    categoryId: "oriental_sweets",
    categoryNameAr: "حلويات شرقية فاخرة",
    price: 240,
    costPrice: 120,
    stock: 30,
    unit: "علبة 500جم",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
  {
    sku: "SKU-RAMOUSH-ELSET",
    barcode: "622100205",
    nameAr: "رموش الست بالسمن البلدي 1 كجم",
    nameEn: "Ramoush El-Set with Baladi Ghee 1kg",
    categoryId: "oriental_sweets",
    categoryNameAr: "حلويات شرقية فاخرة",
    price: 180,
    costPrice: 85,
    stock: 40,
    unit: "كيلو",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },

  // 3. تورت وجاتوه ومناسبات
  {
    sku: "SKU-TORTE-LOTUS-CHOC",
    barcode: "622100301",
    nameAr: "تورتة رويال ميكس لوتس وشوكولاتة مقاس 24",
    nameEn: "Royal Mix Lotus & Chocolate Torte Size 24",
    categoryId: "cakes_tortes",
    categoryNameAr: "تورت وجاتوه ومناسبات",
    price: 450,
    costPrice: 220,
    stock: 12,
    unit: "تورتة",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
  {
    sku: "SKU-TORTE-RED-VELVET",
    barcode: "622100302",
    nameAr: "تورتة ريد فيلفيت بجبن الماسكاربوني مقاس 22",
    nameEn: "Red Velvet Mascarpone Torte Size 22",
    categoryId: "cakes_tortes",
    categoryNameAr: "تورت وجاتوه ومناسبات",
    price: 420,
    costPrice: 200,
    stock: 10,
    unit: "تورتة",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
  {
    sku: "SKU-GATEAU-DOZEN-SOIR",
    barcode: "622100303",
    nameAr: "دستة جاتوه سواريه مشكل فاخر (12 قطعة)",
    nameEn: "Luxury Soiree Gateaux Dozen (12 pcs)",
    categoryId: "cakes_tortes",
    categoryNameAr: "تورت وجاتوه ومناسبات",
    price: 280,
    costPrice: 135,
    stock: 22,
    unit: "دستة",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },

  // 4. كاسات آيس كريم وبودينج
  {
    sku: "SKU-ICE-MASTIKA-PIST",
    barcode: "622100401",
    nameAr: "كاسة آيس كريم مستكة تركي بالفستق الحلبي",
    nameEn: "Turkish Mastic Ice Cream with Pistachio",
    categoryId: "ice_cream_pudding",
    categoryNameAr: "كاسات آيس كريم وبودينج",
    price: 75,
    costPrice: 32,
    stock: 45,
    unit: "كاسة",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
  {
    sku: "SKU-BUD-BELGIAN-CHOC",
    barcode: "622100402",
    nameAr: "بودينج شوكولاتة بلجيكية بالبراونيز",
    nameEn: "Belgian Chocolate Pudding with Brownies",
    categoryId: "ice_cream_pudding",
    categoryNameAr: "كاسات آيس كريم وبودينج",
    price: 80,
    costPrice: 35,
    stock: 38,
    unit: "كاسة",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },

  // 5. علب هدايا ومكسرات
  {
    sku: "SKU-BOX-VIP-WAZEER",
    barcode: "622100501",
    nameAr: "صندوق هدايا وزير الحلو الملكي الفاخر 2 كجم",
    nameEn: "Wazeer El-Helw Royal VIP Gift Box 2kg",
    categoryId: "boxes_gifts",
    categoryNameAr: "علب هدايا ومكسرات",
    price: 680,
    costPrice: 350,
    stock: 15,
    unit: "صندوق فاخر",
    isAvailable: true,
    updatedAt: "2026-11-19T00:00:00Z",
  },
];

export const OFFLINE_SEED_CASHIERS: OfflineCashierAuth[] = [
  {
    cashierId: "usr-korba",
    branchId: "korba",
    nameAr: "أحمد سالم (الكوربة)",
    // SHA-256 for PIN: "1234" (03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4)
    pinHash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
    role: "pos_cashier",
    permissions: ["create_order", "print_receipt", "refund_upto_500", "close_shift"],
    expiresAt: "2027-12-31T23:59:59Z",
  },
  {
    cashierId: "usr-khosoos",
    branchId: "khosoos",
    nameAr: "محمود بدوي (الخصوص)",
    pinHash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
    role: "pos_cashier",
    permissions: ["create_order", "print_receipt", "refund_upto_500", "close_shift"],
    expiresAt: "2027-12-31T23:59:59Z",
  },
  {
    cashierId: "usr-supervisor",
    branchId: "korba",
    nameAr: "المشرف العام (فرع الكوربة)",
    // SHA-256 for PIN: "9999" (c51ce410c124a10e0db5e4b97fc2af39)
    pinHash: "c51ce410c124a10e0db5e4b97fc2af3973a90995f1a675db909ac26f01b78923",
    role: "pos_supervisor",
    permissions: ["create_order", "unlimited_discount", "void_order", "reconcile_shift", "export_offline_queue"],
    expiresAt: "2027-12-31T23:59:59Z",
  },
];

/**
 * Seed initial catalog & credentials into local IndexedDB if empty
 */
export async function seedInitialOfflineData(): Promise<{ productsCount: number; categoriesCount: number }> {
  const existingProds = await posLocalDb.count("products_cache");
  if (existingProds === 0) {
    await posLocalDb.putBulk("categories_cache", OFFLINE_SEED_CATEGORIES);
    await posLocalDb.putBulk("products_cache", OFFLINE_SEED_PRODUCTS);
    await posLocalDb.putBulk("cashiers_auth", OFFLINE_SEED_CASHIERS);

    // Initial default terminal config
    await posLocalDb.put("terminal_config", {
      key: "active_branch",
      value: {
        branchId: "korba",
        branchNameAr: "فرع الكوربة — مصر الجديدة",
        terminalId: "term-01",
        receiptPrefix: "INV-KB-",
      },
      updatedAt: new Date().toISOString(),
    });

    await posLocalDb.ensurePersistentStorage();
  }

  const finalProdCount = await posLocalDb.count("products_cache");
  const finalCatCount = await posLocalDb.count("categories_cache");

  return {
    productsCount: finalProdCount,
    categoriesCount: finalCatCount,
  };
}
