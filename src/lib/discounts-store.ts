import { useState, useEffect, useCallback, useMemo } from "react";
import { type InventoryProduct, type InventoryCategory } from "./inventory-store";

export type DiscountType = "percentage" | "fixed_amount";
export type DiscountScope = "all_products" | "categories" | "products";
export type DiscountStatus = "active" | "scheduled" | "expired" | "paused";

export interface DiscountRule {
  id: string;
  code: string;
  name: { ar: string; en: string };
  description?: { ar: string; en: string };
  type: DiscountType; // "percentage" | "fixed_amount"
  value: number; // e.g. 20 (for 20%) or 50 (for 50 EGP)
  scope: DiscountScope; // "all_products" | "categories" | "products"
  categoryIds?: string[]; // category IDs when scope === "categories"
  categoryNames?: { ar: string; en: string }[];
  productIds?: string[]; // product IDs/SKUs when scope === "products"
  productNames?: { ar: string; en: string }[];
  branchIds?: string[]; // "all" or specific branch IDs
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  minOrderAmount?: number;
  maxDiscountAmount?: number; // Optional cap for percentage discounts
  couponCode?: string;
  isActive: boolean;
  priority: number;
  usageCount: number;
  createdAt: string;
  updatedAt?: string;
}

const STORAGE_KEY = "wazeer_erp_discounts_v1";

// ---------------------------------------------------------------------------
// DEFAULT SEED PROMOTIONS & DISCOUNT CAMPAIGNS
// ---------------------------------------------------------------------------
const SEED_DISCOUNTS: DiscountRule[] = [
  {
    id: "disc-1",
    code: "PROMO-SUMMER-ICE",
    name: {
      ar: "عروض الصيف المنعشة — آيس كريم وجيلاتو",
      en: "Summer Refresh — Ice Cream & Gelato Promo",
    },
    description: {
      ar: "خصم 20% على جميع أصناف الجيلاتو والآيس كريم الطبيعي بكافة فروع المحل",
      en: "20% off all artisanal gelato and ice cream across all branches",
    },
    type: "percentage",
    value: 20,
    scope: "categories",
    categoryIds: ["cat-gelato", "cat-ice-cream", "cat-drinks"],
    categoryNames: [
      { ar: "آيس كريم وجيلاتو", en: "Ice Cream & Gelato" },
      { ar: "كافيه ومشروبات منعشة", en: "Cafe & Refreshing Drinks" },
    ],
    branchIds: ["all"],
    startDate: "2026-05-01",
    endDate: "2026-12-31",
    minOrderAmount: 0,
    maxDiscountAmount: 150,
    couponCode: "SUMMER20",
    isActive: true,
    priority: 1,
    usageCount: 142,
    createdAt: "2026-05-01T10:00:00Z",
  },
  {
    id: "disc-2",
    code: "PROMO-WEEKEND-ALL",
    name: {
      ar: "خصم نهاية الأسبوع على كافة المنتجات",
      en: "Weekend Festival — All Products Discount",
    },
    description: {
      ar: "تخفيض 10% شامل على جميع الحلويات الشرقية والغربية والتورت والمخبوزات",
      en: "10% storewide discount on all oriental sweets, cakes, and bakery",
    },
    type: "percentage",
    value: 10,
    scope: "all_products",
    branchIds: ["all"],
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    minOrderAmount: 150,
    maxDiscountAmount: 300,
    couponCode: "WEEKEND10",
    isActive: true,
    priority: 2,
    usageCount: 88,
    createdAt: "2026-11-01T08:00:00Z",
  },
  {
    id: "disc-3",
    code: "PROMO-CAKES-50",
    name: {
      ar: "عرض التورت والمناسبات السعيدة (خصم 50 ج.م)",
      en: "Celebration Cakes Special — 50 EGP Off",
    },
    description: {
      ar: "خصم نقدي 50 ج.م على أي تورتة مقاس 24 سم أو أكبر لحفلات أعياد الميلاد",
      en: "50 EGP instant cash discount on any celebration cake 24cm+",
    },
    type: "fixed_amount",
    value: 50,
    scope: "categories",
    categoryIds: ["cat-cakes", "cat-western"],
    categoryNames: [
      { ar: "تورت وجاتوهات غربية", en: "Western Cakes & Gateaux" },
    ],
    branchIds: ["all"],
    startDate: "2026-10-15",
    endDate: "2026-12-15",
    minOrderAmount: 250,
    couponCode: "CAKE50",
    isActive: true,
    priority: 3,
    usageCount: 56,
    createdAt: "2026-10-15T09:00:00Z",
  },
  {
    id: "disc-4",
    code: "PROMO-RAMADAN-ORIENTAL",
    name: {
      ar: "عروض البسبوسة والكنافة الشرقية الفاخرة",
      en: "Grand Oriental Sweets Festival",
    },
    description: {
      ar: "خصم 15% على تشكيلة الحلويات الشرقية بالمكسرات والسمن البلدي",
      en: "15% off premium oriental pastries and kunafa",
    },
    type: "percentage",
    value: 15,
    scope: "categories",
    categoryIds: ["cat-oriental"],
    categoryNames: [
      { ar: "حلويات شرقية فاخرة", en: "Premium Oriental Pastries" },
    ],
    branchIds: ["all"],
    startDate: "2026-12-01",
    endDate: "2027-01-15",
    minOrderAmount: 100,
    couponCode: "ORIENTAL15",
    isActive: true,
    priority: 4,
    usageCount: 0,
    createdAt: "2026-11-10T12:00:00Z",
  },
];

// Helper to determine the status of a discount rule based on dates & isActive
export function computeDiscountStatus(discount: DiscountRule, targetDate?: string | Date): DiscountStatus {
  if (!discount.isActive) return "paused";

  const now = targetDate ? new Date(targetDate) : new Date();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  if (discount.startDate && todayStr < discount.startDate) {
    return "scheduled";
  }
  if (discount.endDate && todayStr > discount.endDate) {
    return "expired";
  }
  return "active";
}

// ---------------------------------------------------------------------------
// DISCOUNTS HOOK & STORE
// ---------------------------------------------------------------------------
export function useDiscountsStore() {
  const [discounts, setDiscounts] = useState<DiscountRule[]>(() => {
    if (typeof window === "undefined") return SEED_DISCOUNTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load discounts from localStorage, using seeds", e);
    }
    return SEED_DISCOUNTS;
  });

  const saveDiscounts = useCallback((newDiscounts: DiscountRule[]) => {
    setDiscounts(newDiscounts);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newDiscounts));
        window.dispatchEvent(new Event("wazeer_erp_discounts_updated"));
      } catch (e) {
        console.error("Failed to save discounts to localStorage", e);
      }
    }
  }, []);

  // Listen for storage events across tabs and components
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setDiscounts(parsed);
          }
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener("wazeer_erp_discounts_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("wazeer_erp_discounts_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Add new discount rule
  const addDiscount = useCallback(
    (rule: Omit<DiscountRule, "id" | "createdAt" | "usageCount">) => {
      const newRule: DiscountRule = {
        ...rule,
        id: `disc-${Date.now()}`,
        usageCount: 0,
        createdAt: new Date().toISOString(),
      };
      const updated = [newRule, ...discounts];
      saveDiscounts(updated);
      return newRule;
    },
    [discounts, saveDiscounts]
  );

  // Update existing discount rule
  const updateDiscount = useCallback(
    (id: string, updates: Partial<DiscountRule>) => {
      const updated = discounts.map((d) =>
        d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
      );
      saveDiscounts(updated);
    },
    [discounts, saveDiscounts]
  );

  // Delete discount rule
  const deleteDiscount = useCallback(
    (id: string) => {
      const updated = discounts.filter((d) => d.id !== id);
      saveDiscounts(updated);
    },
    [discounts, saveDiscounts]
  );

  // Toggle active / paused
  const toggleDiscountStatus = useCallback(
    (id: string) => {
      const updated = discounts.map((d) =>
        d.id === id ? { ...d, isActive: !d.isActive, updatedAt: new Date().toISOString() } : d
      );
      saveDiscounts(updated);
    },
    [discounts, saveDiscounts]
  );

  // Reset to original seeds
  const resetToSeedDiscounts = useCallback(() => {
    saveDiscounts(SEED_DISCOUNTS);
  }, [saveDiscounts]);

  // Active discounts currently valid today
  const activeDiscounts = useMemo(() => {
    return discounts.filter((d) => computeDiscountStatus(d) === "active");
  }, [discounts]);

  // -------------------------------------------------------------------------
  // DISCOUNT PRICING CALCULATOR
  // Evaluates a product against all active discounts and returns best discount
  // -------------------------------------------------------------------------
  const calculateProductDiscount = useCallback(
    (params: {
      productId: string;
      productSku?: string;
      categoryId?: string;
      categoryCode?: string;
      unitPrice: number;
      branchId?: string;
      targetDate?: string;
    }) => {
      const { productId, productSku, categoryId, categoryCode, unitPrice, branchId, targetDate } = params;
      if (unitPrice <= 0) {
        return { originalPrice: unitPrice, discountedPrice: unitPrice, discountAmount: 0, appliedRule: null };
      }

      // Filter active rules for this date and branch
      const candidates = discounts.filter((rule) => {
        if (computeDiscountStatus(rule, targetDate) !== "active") return false;

        // Branch check
        if (rule.branchIds && !rule.branchIds.includes("all") && branchId) {
          if (!rule.branchIds.includes(branchId)) return false;
        }

        // Scope check:
        if (rule.scope === "all_products") {
          return true;
        }

        if (rule.scope === "categories") {
          if (!rule.categoryIds || rule.categoryIds.length === 0) return false;
          const matchCatId = categoryId && rule.categoryIds.includes(categoryId);
          const matchCatCode = categoryCode && rule.categoryIds.includes(categoryCode);
          return Boolean(matchCatId || matchCatCode);
        }

        if (rule.scope === "products") {
          if (!rule.productIds || rule.productIds.length === 0) return false;
          const matchProdId = productId && rule.productIds.includes(productId);
          const matchProdSku = productSku && rule.productIds.includes(productSku);
          return Boolean(matchProdId || matchProdSku);
        }

        return false;
      });

      if (candidates.length === 0) {
        return { originalPrice: unitPrice, discountedPrice: unitPrice, discountAmount: 0, appliedRule: null };
      }

      // Calculate discount amount for each candidate and choose the highest saving
      let bestRule: DiscountRule | null = null;
      let maxDiscountSaving = 0;

      for (const rule of candidates) {
        let saving = 0;
        if (rule.type === "percentage") {
          saving = (unitPrice * rule.value) / 100;
          if (rule.maxDiscountAmount && rule.maxDiscountAmount > 0) {
            saving = Math.min(saving, rule.maxDiscountAmount);
          }
        } else if (rule.type === "fixed_amount") {
          saving = Math.min(rule.value, unitPrice);
        }

        if (saving > maxDiscountSaving) {
          maxDiscountSaving = saving;
          bestRule = rule;
        }
      }

      const finalPrice = Math.max(0, unitPrice - maxDiscountSaving);

      return {
        originalPrice: unitPrice,
        discountedPrice: Math.round(finalPrice * 100) / 100,
        discountAmount: Math.round(maxDiscountSaving * 100) / 100,
        appliedRule: bestRule,
      };
    },
    [discounts]
  );

  return {
    discounts,
    activeDiscounts,
    addDiscount,
    updateDiscount,
    deleteDiscount,
    toggleDiscountStatus,
    resetToSeedDiscounts,
    calculateProductDiscount,
  };
}
