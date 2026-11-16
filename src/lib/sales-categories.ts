/**
 * Sales & POS Categories Definition & Filtering Engine
 * Supports standard confectionery product categories, dynamic inventory categories,
 * and smart SKU / item keyword resolution.
 */

export interface SalesCategoryOption {
  id: string;
  name: { ar: string; en: string };
  icon: string;
  keywords: string[];
}

export const STANDARD_SALES_CATEGORIES: SalesCategoryOption[] = [
  {
    id: "oriental",
    name: { ar: "حلويات شرقية فاخرة (كنافة، بسبوسة)", en: "Oriental Sweets (Konafa, Basbousa)" },
    icon: "🥮",
    keywords: ["شرقي", "شرقية", "بسبوسة", "بسبوسه", "كنافة", "كنافه", "بقلاوة", "بقلاوه", "جلاش", "بلح الشام", "نابلسية", "oriental", "basbousa", "konafa", "baklava"],
  },
  {
    id: "cakes",
    name: { ar: "تورت وكيك وجاتوه غربي", en: "Cakes, Tarts & Gateaux" },
    icon: "🎂",
    keywords: ["تورت", "تورته", "تورتة", "كيك", "جاتوه", "تشيز", "براونيز", "لوتس", "cake", "tart", "gateau", "brownie", "cheesecake"],
  },
  {
    id: "tajin",
    name: { ar: "طواجن ساخنة وأم علي", en: "Hot Tajins & Om Ali" },
    icon: "🍲",
    keywords: ["طاجن", "طواجن", "أم علي", "ام علي", "tajin", "om ali"],
  },
  {
    id: "fatta",
    name: { ar: "الفتة الملكية والكاسات", en: "Royal Fatta & Cups" },
    icon: "🍨",
    keywords: ["فتة", "فته", "كاسات", "fatta", "kinder", "nutella"],
  },
  {
    id: "rice",
    name: { ar: "عشاق الرز والألبان", en: "Rice Pudding & Dairy" },
    icon: "🥣",
    keywords: ["أرز", "ارز", "رز", "لبن", "مهلبية", "rice", "pudding"],
  },
  {
    id: "kashtouta",
    name: { ar: "القشطوطة والمدلعة", en: "Kashtouta & Specialties" },
    icon: "🍮",
    keywords: ["قشطوطة", "قشطوطه", "مدلعة", "مدلعه", "kashtouta"],
  },
  {
    id: "gelato",
    name: { ar: "آيس كريم وجيلاتو ومثلجات", en: "Ice Cream & Gelato" },
    icon: "🍦",
    keywords: ["آيس كريم", "ايس كريم", "جيلاتو", "مثلجات", "ice cream", "gelato"],
  },
  {
    id: "drinks",
    name: { ar: "كافيه ومشروبات منعشة", en: "Cafe & Refreshing Drinks" },
    icon: "☕",
    keywords: ["مشروب", "عصير", "قهوة", "شاي", "لاتيه", "كافيه", "drink", "coffee", "juice", "beverage"],
  },
  {
    id: "gifts",
    name: { ar: "علب هدايا وضيافة وVIP", en: "Gift Boxes & Hospitality" },
    icon: "🎁",
    keywords: ["علب", "هدية", "هدايا", "بوكس", "ضيافة", "vip", "gift", "box"],
  },
  {
    id: "catering",
    name: { ar: "بوفيهات وحفلات ومناسبات", en: "Buffets & Event Catering" },
    icon: "🎪",
    keywords: ["بوفيه", "مناسبات", "حفلات", "buffet", "catering", "event"],
  },
];

/**
 * Checks if a specific order or invoice item matches the selected category ID
 */
export function itemMatchesCategory(
  item: { sku?: string; id?: string; productId?: string; name?: any; category?: any; categoryId?: string },
  selectedCategoryId: string,
  inventoryProducts?: any[],
  inventoryCategories?: any[]
): boolean {
  if (!selectedCategoryId || selectedCategoryId === "all") return true;

  // 1. Check direct item category fields
  const itCat = (item as any).category || (item as any).categoryId;
  if (typeof itCat === "string") {
    const itCatNorm = itCat.trim().toLowerCase();
    const selNorm = selectedCategoryId.trim().toLowerCase();
    if (itCatNorm === selNorm) return true;
  }
  if (itCat && typeof itCat === "object") {
    if (itCat.id === selectedCategoryId || itCat.code === selectedCategoryId) return true;
  }

  // 2. Lookup against inventory products catalog
  if (inventoryProducts && inventoryProducts.length > 0) {
    const sku = (item.sku || "").trim().toLowerCase();
    const id = (item.id || (item as any).productId || "").trim().toLowerCase();
    const prod = inventoryProducts.find((p) => {
      const pSku = (p.sku || "").trim().toLowerCase();
      const pId = (p.id || "").trim().toLowerCase();
      return (sku && pSku === sku) || (id && (pId === id || pSku === id));
    });

    if (prod) {
      if (prod.categoryId === selectedCategoryId) return true;
      if (prod.department && prod.department.toLowerCase() === selectedCategoryId.toLowerCase()) return true;
      if (prod.classification && prod.classification.toLowerCase() === selectedCategoryId.toLowerCase()) return true;
      if (prod.category && (prod.category === selectedCategoryId || prod.category.id === selectedCategoryId)) return true;
    }
  }

  // 3. Keyword matching against standard categories
  const targetCategory = STANDARD_SALES_CATEGORIES.find((c) => c.id === selectedCategoryId);
  if (targetCategory) {
    const textToMatch = [
      item.sku,
      typeof item.name === "string" ? item.name : `${item.name?.ar || ""} ${item.name?.en || ""}`,
    ].join(" ").toLowerCase();

    const matchesKeyword = targetCategory.keywords.some((kw) => textToMatch.includes(kw.toLowerCase()));
    if (matchesKeyword) return true;
  }

  // 4. Match against dynamic inventory categories
  if (inventoryCategories && inventoryCategories.length > 0) {
    const invCat = inventoryCategories.find((c) => c.id === selectedCategoryId || c.code === selectedCategoryId);
    if (invCat) {
      const catText = `${invCat.name?.ar || ""} ${invCat.name?.en || ""} ${invCat.code || ""}`.toLowerCase();
      const textToMatch = [
        item.sku,
        typeof item.name === "string" ? item.name : `${item.name?.ar || ""} ${item.name?.en || ""}`,
      ].join(" ").toLowerCase();

      const words = catText.split(/[\s,،-]+/).filter((w) => w.length > 2);
      if (words.some((w) => textToMatch.includes(w))) return true;
    }
  }

  return false;
}

/**
 * Checks if an invoice or order document has any item matching the selected category
 */
export function documentMatchesCategory(
  doc: { items?: any[] },
  selectedCategoryId: string,
  inventoryProducts?: any[],
  inventoryCategories?: any[]
): boolean {
  if (!selectedCategoryId || selectedCategoryId === "all") return true;
  if (!doc.items || doc.items.length === 0) return false;
  return doc.items.some((it) =>
    itemMatchesCategory(it, selectedCategoryId, inventoryProducts, inventoryCategories)
  );
}

/**
 * Resolves a full list of category options merging standard categories with DB inventory categories
 */
export function getMergedSalesCategories(inventoryCategories?: any[]): { id: string; nameAr: string; nameEn: string; icon: string }[] {
  const list: { id: string; nameAr: string; nameEn: string; icon: string }[] = [];
  const seenIds = new Set<string>();

  // Add standard pastry & confectionery categories
  for (const cat of STANDARD_SALES_CATEGORIES) {
    seenIds.add(cat.id);
    list.push({
      id: cat.id,
      nameAr: cat.name.ar,
      nameEn: cat.name.en,
      icon: cat.icon,
    });
  }

  // Add inventory DB categories if not already present
  if (inventoryCategories && inventoryCategories.length > 0) {
    for (const c of inventoryCategories) {
      if (!c.id || seenIds.has(c.id)) continue;
      // Skip raw materials or packaging categories in finished goods sales
      if (c.type === "raw" || c.type === "packaging") continue;
      seenIds.add(c.id);
      list.push({
        id: c.id,
        nameAr: c.name?.ar || c.code || c.id,
        nameEn: c.name?.en || c.code || c.id,
        icon: "📂",
      });
    }
  }

  return list;
}
