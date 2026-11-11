import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FACTORY_CATEGORIES,
  FACTORY_WAREHOUSES,
  FACTORY_UNITS,
  FACTORY_PRODUCTS,
} from "./wazeer-factory-data-2026";

// ==========================================
// Types & Models
// ==========================================

export type CategoryType = "finished" | "raw" | "packaging" | "semi_finished";
export type WarehouseType = "kitchen" | "retail" | "cold_storage" | "dry_storage";
export type UnitCategory = "weight" | "volume" | "count" | "packaging";
export type BomStatus = "active" | "draft" | "archived";
export type StockMoveType = "in" | "out" | "transfer" | "adjustment";

export interface StockMovementRecord {
  id: string;
  moveNo: string;
  moveType: StockMoveType;
  productId: string;
  productName: { ar: string; en: string };
  productSku: string;
  categoryName?: { ar: string; en: string } | undefined;
  fromWarehouseId?: string | null | undefined;
  fromWarehouseName?: { ar: string; en: string } | undefined;
  toWarehouseId?: string | null | undefined;
  toWarehouseName?: { ar: string; en: string } | undefined;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reference: string;
  notes?: string | undefined;
  movedAt: string;
  createdAt: string;
  createdBy?: string | null | undefined;
  unitName?: { ar: string; en: string } | undefined;
}

export interface NewStockMovePayload {
  moveType: StockMoveType;
  productId: string;
  quantity: number;
  fromWarehouseId?: string | null | undefined;
  toWarehouseId?: string | null | undefined;
  unitCost?: number | undefined;
  reference?: string | undefined;
  notes?: string | undefined;
  movedAt?: string | undefined;
}


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

export type ProductTechnicalType = "RAW_MATERIAL" | "SEMI_FINISHED" | "FINISHED" | "ON_DEMAND_ASSEMBLY";

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
  productType?: "factory" | "branch";
  technicalType?: ProductTechnicalType;
  isAssemblyProduct?: boolean;
  trackInventory?: boolean;
  department?: string;
  classification?: string;
  rawType?: string;
  group?: string | undefined;
  branchId?: string | undefined;
  showOnPos?: boolean; // defaults to true when not present (non-raw products are shown on POS by default)
  vipPrice?: number | undefined;
  vipClientIds?: string[] | undefined;
  vipValidUntil?: string | undefined;
  vat?: number | undefined;
}

// ==========================================
// VAT Rules Cache & Utilities
// ==========================================

const VAT_STORAGE_KEY = "wazeer_erp_product_vat_rules_v1";

export function readCachedVatRules(): Map<string, number> {
  const map = new Map<string, number>();
  if (typeof window === "undefined") return map;
  try {
    const raw = localStorage.getItem(VAT_STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)))) {
          map.set(k.toUpperCase(), Number(v));
        }
      }
    }
  } catch {}
  return map;
}

export function saveVatRule(skuOrId: string, vat: number) {
  if (typeof window === "undefined" || !skuOrId) return;
  try {
    const map = readCachedVatRules();
    map.set(skuOrId.toUpperCase(), vat);
    const obj = Object.fromEntries(map.entries());
    localStorage.setItem(VAT_STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

// ==========================================
// VIP Client Pricing Engine & Utilities
// ==========================================

export const KNOWN_VIP_CLIENTS = [
  { id: "cl-masa", name: "فندق الماسة", nameEn: "Al-Masa Hotel", type: "hotel", phone: "+20 100 741 9344" },
  { id: "cl-cesar", name: "مطاعم وكافيهات سيزار", nameEn: "Cesar Restaurants", type: "restaurant", phone: "+20 122 555 8100" },
  { id: "cl-gezira", name: "نادي الجزيرة الرياضي", nameEn: "Gezira Sporting Club", type: "club", phone: "+20 111 903 4477" },
  { id: "cl-lusail", name: "مؤسسة لوسيل لتنظيم المناسبات", nameEn: "Lusail Events", type: "catering", phone: "+20 102 334 5566" },
  { id: "cl-sharq", name: "شركة الشرق للمؤتمرات والمعارض", nameEn: "Al-Sharq Conferences", type: "corporate", phone: "+20 109 887 6655" },
];

const VIP_STORAGE_KEY = "wazeer_erp_product_vip_rules_v1";

export interface VipPriceRule {
  vipPrice: number;
  vipClientIds: string[];
  vipValidUntil?: string | undefined;
}

export function readCachedVipRules(): Map<string, VipPriceRule> {
  const map = new Map<string, VipPriceRule>();
  if (typeof window === "undefined") return map;
  try {
    const raw = localStorage.getItem(VIP_STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === "object") {
          map.set(k.toUpperCase(), v as VipPriceRule);
        }
      }
    }
  } catch {}
  return map;
}

export function saveVipRule(skuOrId: string, rule: VipPriceRule) {
  if (typeof window === "undefined" || !skuOrId) return;
  try {
    const map = readCachedVipRules();
    map.set(skuOrId.toUpperCase(), rule);
    const obj = Object.fromEntries(map.entries());
    localStorage.setItem(VIP_STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

// ==========================================
// POS Product Image Mapping & Resolver
// ==========================================

export interface ProductImageLookupTarget {
  id?: string;
  sku?: string;
  name?: { ar?: string; en?: string } | string;
  image?: string;
  department?: string;
  group?: string;
  categoryId?: string;
}

export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  // Existing POS items
  "RICE-NUT": "/products/rice-nutella.jpg",
  "RICE-NUTS": "/products/rice-pistachio.jpg",
  "RICE-LOT": "/products/rice-pistachio.jpg",
  "RICE-PST": "/products/rice-pistachio.jpg",
  "RICE-WZR": "/products/rice-pistachio.jpg",
  "RICE-PLN": "/products/rice-pistachio.jpg",
  "FAT-WZR": "/products/fatta-wazeer.jpg",
  "FAT-NUT": "/products/fatta-wazeer.jpg",
  "FAT-MNG": "/products/kashtouta-mango.jpg",
  "FAT-PST": "/products/fatta-wazeer.jpg",
  "MDL-MNG": "/products/kashtouta-mango.jpg",
  "MDL-CRM": "/products/medalaa.jpg",
  "MLK-WZR": "/products/molokhito.jpg",
  "MLK-NUT": "/products/molokhito.jpg",
  "TJ-ALI": "/products/om-ali.jpg",
  "TJ-NUT": "/products/om-ali.jpg",
  "SHW-NUT": "/products/shawarma-crepe.jpg",
  "SHW-MIX": "/products/shawarma-crepe.jpg",
  "SHW-PST": "/products/shawarma-crepe.jpg",
  "CK-LND-KND": "/products/cheesecake-pistachio.jpg",
  "CK-LND-NUT": "/products/rice-nutella.jpg",
  "CHZ-PST": "/products/cheesecake-pistachio.jpg",
  "TRT-LOT-FAM": "/products/cheesecake-pistachio.jpg",
  "KSHR-LUX": "/products/koshary-luxe.jpg",
  "KSHR-KND": "/products/koshary-luxe.jpg",
  "KSHR-PST": "/products/koshary-luxe.jpg",
  "KSHR-NUT": "/products/koshary-luxe.jpg",
  "KSHR-WZR": "/products/koshary-luxe.jpg",
  "KSH-PST": "/products/kashtouta-pistachio.jpg",
  "KSH-MSR": "/products/kashtouta-pistachio.jpg",
  "KSH-NUT": "/products/kashtouta-pistachio.jpg",
  "KSH-MNG": "/products/kashtouta-mango.jpg",
  "KSH-RIC-NUT": "/products/rice-nutella.jpg",
  "KSH-RIC-PST": "/products/kashtouta-pistachio.jpg",
  "BOX-ROYAL-1KG": "/products/baklava-box.jpg",
  "BOX-ROYAL-2KG": "/products/baklava-box.jpg",
  "BKL-PIST-VIP": "/products/baklava-box.jpg",
  "ICE-SCOOP": "/products/ice-cream.jpg",
  "EX-PIST-SAUCE": "/products/cheesecake-pistachio.jpg",
  "EX-NUT-SAUCE": "/products/rice-nutella.jpg",
  "WATER-MINERAL": "/products/mineral-water.jpg",

  // Presets
  "SAN-LOTUS": "/products/cheesecake-pistachio.jpg",
  "CK-KND": "/products/rice-nutella.jpg",
  "TRT-FRT": "/products/kashtouta-mango.jpg",
  "BSB-PST": "/products/fatta-wazeer.jpg",
  "KNF-NBL": "/products/fatta-wazeer.jpg",
  "CHS-MNG": "/products/kashtouta-mango.jpg",
  "BRW-WLT": "/products/molten-cake.jpg",
  "BRW-BEL": "/products/molten-cake.jpg",
  "CIN-CAR": "/products/medalaa.jpg",
  "CIN-PCN": "/products/medalaa.jpg",

  // Wazeer Retail POS Items
  "SKU-10025": "/products/rice-pistachio.jpg",
  "SKU-10026": "/products/ice-cream.jpg",
  "SKU-10027": "/products/rice-pistachio.jpg",
  "SKU-10028": "/products/rice-pistachio.jpg",
  "SKU-10029": "/products/rice-pistachio.jpg",
  "SKU-10030": "/products/rice-pistachio.jpg",
  "SKU-10046": "/products/rice-pistachio.jpg",
  "SKU-10047": "/products/rice-pistachio.jpg",
  "SKU-10048": "/products/rice-pistachio.jpg",
  "SKU-10049": "/products/kashtouta-mango.jpg",
  "SKU-10050": "/products/rice-pistachio.jpg",
  "SKU-10051": "/products/rice-nutella.jpg",
  "SKU-10052": "/products/fatta-wazeer.jpg",
  "SKU-10053": "/products/kashtouta-pistachio.jpg",
  "SKU-10054": "/products/rice-nutella.jpg",
  "SKU-10055": "/products/rice-nutella.jpg",
  "SKU-10056": "/products/fatta-wazeer.jpg",
  "SKU-10057": "/products/kashtouta-pistachio.jpg",
  "SKU-10058": "/products/cheesecake-pistachio.jpg",
  "SKU-10059": "/products/rice-nutella.jpg",
  "SKU-10060": "/products/fatta-wazeer.jpg",
  "SKU-10061": "/products/rice-nutella.jpg",
  "SKU-10062": "/products/fatta-wazeer.jpg",
  "SKU-10063": "/products/rice-nutella.jpg",
  "SKU-10064": "/products/kashtouta-pistachio.jpg",
  "SKU-10065": "/products/rice-nutella.jpg",
  "SKU-10066": "/products/kashtouta-pistachio.jpg",
  "SKU-10067": "/products/rice-nutella.jpg",
  "SKU-10068": "/products/rice-nutella.jpg",
  "SKU-10069": "/products/cheesecake-pistachio.jpg",
  "SKU-10070": "/products/ice-cream.jpg",
  "SKU-10071": "/products/fatta-wazeer.jpg",
  "SKU-10072": "/products/rice-nutella.jpg",
  "SKU-10073": "/products/kashtouta-pistachio.jpg",
  "SKU-10074": "/products/cheesecake-pistachio.jpg",
  "SKU-10075": "/products/medalaa.jpg",
  "SKU-10076": "/products/rice-nutella.jpg",
  "SKU-10077": "/products/kashtouta-pistachio.jpg",
  "SKU-10078": "/products/rice-pistachio.jpg",
  "SKU-10079": "/products/fatta-wazeer.jpg",
  "SKU-10080": "/products/kashtouta-mango.jpg",
  "SKU-10081": "/products/rice-pistachio.jpg",
  "SKU-10082": "/products/ice-cream.jpg",
  "SKU-10083": "/products/ice-cream.jpg",
  "SKU-10084": "/products/ice-cream.jpg",
  "SKU-10085": "/products/ice-cream.jpg",
  "SKU-10086": "/products/donuts.jpg",
  "SKU-10087": "/products/donuts.jpg",
  "SKU-10088": "/products/cheesecake-pistachio.jpg",
  "SKU-10089": "/products/kashtouta-mango.jpg",
  "SKU-10090": "/products/kashtouta-pistachio.jpg",
  "SKU-10091": "/products/rice-nutella.jpg",
  "SKU-10092": "/products/rice-nutella.jpg",
  "SKU-10093": "/products/rice-nutella.jpg",
  "SKU-10094": "/products/cheesecake-pistachio.jpg",
  "SKU-10095": "/products/red-velvet.jpg",
  "SKU-10096": "/products/medalaa.jpg",
  "SKU-10097": "/products/cheesecake-pistachio.jpg",
  "SKU-10098": "/products/kashtouta-pistachio.jpg",
  "SKU-10099": "/products/rice-nutella.jpg",
  "SKU-10100": "/products/rice-nutella.jpg",
  "SKU-10101": "/products/kashtouta-pistachio.jpg",
  "SKU-10102": "/products/kashtouta-mango.jpg",
  "SKU-10103": "/products/om-ali.jpg",
  "SKU-10104": "/products/om-ali.jpg",
  "SKU-10105": "/products/om-ali.jpg",
  "SKU-10106": "/products/om-ali.jpg",
  "SKU-10107": "/products/om-ali.jpg",
  "SKU-10108": "/products/rice-nutella.jpg",
  "SKU-10109": "/products/kashtouta-pistachio.jpg",
  "SKU-10110": "/products/kashtouta-pistachio.jpg",
  "SKU-10111": "/products/kashtouta-pistachio.jpg",
  "SKU-10112": "/products/kashtouta-pistachio.jpg",
  "SKU-10113": "/products/kashtouta-pistachio.jpg",
  "SKU-10114": "/products/kashtouta-pistachio.jpg",
  "SKU-10115": "/products/kashtouta-pistachio.jpg",
  "SKU-10116": "/products/medalaa.jpg",
  "SKU-10117": "/products/kashtouta-pistachio.jpg",
  "SKU-10118": "/products/kashtouta-mango.jpg",
  "SKU-10119": "/products/kashtouta-mango.jpg",
  "SKU-10120": "/products/kashtouta-pistachio.jpg",
  "SKU-10121": "/products/kashtouta-pistachio.jpg",
  "SKU-10122": "/products/kashtouta-pistachio.jpg",
  "SKU-10123": "/products/kashtouta-pistachio.jpg",
  "SKU-10124": "/products/kashtouta-pistachio.jpg",
  "SKU-10125": "/products/medalaa.jpg",
  "SKU-10126": "/products/kashtouta-pistachio.jpg",
  "SKU-10127": "/products/kashtouta-mango.jpg",
  "SKU-10128": "/products/kashtouta-pistachio.jpg",
  "SKU-10129": "/products/rice-nutella.jpg",
  "SKU-10130": "/products/kashtouta-mango.jpg",
  "SKU-10131": "/products/koshary-luxe.jpg",
  "SKU-10132": "/products/koshary-luxe.jpg",
  "SKU-10133": "/products/koshary-luxe.jpg",
  "SKU-10134": "/products/koshary-luxe.jpg",
  "SKU-10135": "/products/koshary-luxe.jpg",
  "SKU-10136": "/products/koshary-luxe.jpg",
  "SKU-10137": "/products/koshary-luxe.jpg",
  "SKU-10138": "/products/koshary-luxe.jpg",
  "SKU-10139": "/products/koshary-luxe.jpg",
  "SKU-10140": "/products/koshary-luxe.jpg",
  "SKU-10141": "/products/koshary-luxe.jpg",
  "SKU-10142": "/products/koshary-luxe.jpg",
  "SKU-10143": "/products/cheesecake-pistachio.jpg",
  "SKU-10144": "/products/cheesecake-pistachio.jpg",
  "SKU-10145": "/products/rice-nutella.jpg",
  "SKU-10146": "/products/rice-nutella.jpg",
  "SKU-10147": "/products/medalaa.jpg",
  "SKU-10148": "/products/kashtouta-mango.jpg",
  "SKU-10149": "/products/molten-cake.jpg",
  "SKU-10150": "/products/baklava-box.jpg",
  "SKU-10151": "/products/baklava-box.jpg",
};

export function resolveProductImage(prod?: ProductImageLookupTarget | null): string {
  if (!prod) return "/products/rice-pistachio.jpg";
  const rawImg = prod.image ? prod.image.trim() : "";
  if (rawImg.length > 0 && !rawImg.includes("images.unsplash.com")) {
    return rawImg;
  }

  const sku = (prod.sku || prod.id || "").trim().toUpperCase();
  if (sku && PRODUCT_IMAGE_MAP[sku]) {
    return PRODUCT_IMAGE_MAP[sku];
  }

  const nameAr = typeof prod.name === "object" ? prod.name?.ar || "" : typeof prod.name === "string" ? prod.name : "";
  const nameEn = typeof prod.name === "object" ? prod.name?.en || "" : "";
  const dept = (prod.department || "").toLowerCase();
  const grp = (prod.group || "").toLowerCase();
  const combined = `${nameAr} ${nameEn} ${dept} ${grp}`.toLowerCase();

  // Water & Drinks
  if (combined.includes("مياه") || combined.includes("ماء") || combined.includes("water")) {
    return "/products/mineral-water.jpg";
  }

  // Ice Cream
  if (combined.includes("ايس كريم") || combined.includes("آيس كريم") || combined.includes("ice cream") || combined.includes("بولة")) {
    return "/products/ice-cream.jpg";
  }

  // Donuts
  if (combined.includes("دونات") || combined.includes("donut")) {
    return "/products/donuts.jpg";
  }

  // Molten Cake
  if (combined.includes("مولتن") || combined.includes("molten")) {
    return "/products/molten-cake.jpg";
  }

  // Red Velvet
  if (combined.includes("ريد فيلفيت") || combined.includes("red velvet")) {
    return "/products/red-velvet.jpg";
  }

  // Sweet Koshary
  if (grp.includes("كشرى") || combined.includes("كشرى") || combined.includes("كشري") || combined.includes("koshary")) {
    return "/products/koshary-luxe.jpg";
  }

  // Sweet Fatta & Giant Bowls (الحله، القنبلة، الديناميت)
  if (combined.includes("فتة") || combined.includes("فته") || combined.includes("fatta") || combined.includes("الحله") || combined.includes("قنبلة") || combined.includes("ديناميت")) {
    return "/products/fatta-wazeer.jpg";
  }

  // Baked Hot Tajins
  if (grp.includes("طواجن") || combined.includes("ام على") || combined.includes("ام علي") || combined.includes("طاجن") || combined.includes("om ali")) {
    return "/products/om-ali.jpg";
  }

  // Medalaa & Caramel
  if (combined.includes("مدلعة") || combined.includes("مدلعه") || combined.includes("medala")) {
    if (combined.includes("مانجو") || combined.includes("مانجا")) return "/products/kashtouta-mango.jpg";
    return "/products/medalaa.jpg";
  }

  // Molokhito
  if (combined.includes("ملوخيتو") || combined.includes("molokhito")) {
    return "/products/molokhito.jpg";
  }

  // Shawarma / Crepe
  if (combined.includes("شاورما") || combined.includes("shawarma") || combined.includes("كريب")) {
    return "/products/shawarma-crepe.jpg";
  }

  // Kashtouta Rice Pudding Bowls (قشطوطة أرز بلبن)
  if (grp.includes("قشطوطة أرز") || (combined.includes("قشطوطة") && combined.includes("أرز"))) {
    if (combined.includes("مانجو") || combined.includes("مانجا") || combined.includes("فروت")) return "/products/kashtouta-mango.jpg";
    if (combined.includes("نوتيلا")) return "/products/rice-nutella.jpg";
    if (combined.includes("كراميل")) return "/products/medalaa.jpg";
    return "/products/kashtouta-pistachio.jpg";
  }

  // Kashtouta (Tres Leches Cake)
  if (grp.includes("قشطوطة") || combined.includes("قشطوطة") || combined.includes("قشطوطه") || combined.includes("kashtota")) {
    if (combined.includes("مانجو") || combined.includes("مانجا") || combined.includes("فروت")) return "/products/kashtouta-mango.jpg";
    if (combined.includes("نوتيلا")) return "/products/rice-nutella.jpg";
    if (combined.includes("كراميل")) return "/products/medalaa.jpg";
    return "/products/kashtouta-pistachio.jpg";
  }

  // Rice Pudding (أرز باللبن)
  if (grp.includes("ارز بلبن") || combined.includes("أرز") || combined.includes("ارز") || combined.includes("rice")) {
    if (combined.includes("نوتيلا") || combined.includes("شيكولاتة") || combined.includes("شوكولاتة")) return "/products/rice-nutella.jpg";
    if (combined.includes("مانجو") || combined.includes("مانجا") || combined.includes("مانجواي")) return "/products/kashtouta-mango.jpg";
    return "/products/rice-pistachio.jpg";
  }

  // London Cake & Jars
  if (combined.includes("كيكة لندن") || combined.includes("لندن") || combined.includes("رويال") || combined.includes("جار")) {
    if (combined.includes("نوتيلا") || combined.includes("شوك") || combined.includes("دريم") || combined.includes("بندق") || combined.includes("كيت كات")) {
      return "/products/rice-nutella.jpg";
    }
    if (combined.includes("مانجو") || combined.includes("مانجا") || combined.includes("راسبري")) {
      return "/products/kashtouta-mango.jpg";
    }
    if (combined.includes("كافيه")) {
      return "/products/medalaa.jpg";
    }
    return "/products/cheesecake-pistachio.jpg";
  }

  // Cheesecake
  if (combined.includes("تشيز") || combined.includes("cheesecake")) {
    return "/products/cheesecake-pistachio.jpg";
  }

  // Wazeer Inventions: Cake Bomb / Chocolate / Pistachio treats
  if (grp.includes("أختراع") || grp.includes("اختراع")) {
    if (combined.includes("نوتيلا") || combined.includes("شوكولاتة") || combined.includes("شيكولاتة") || combined.includes("كيندر") || combined.includes("سنيكرو") || combined.includes("كيت كاته")) {
      return "/products/rice-nutella.jpg";
    }
    if (combined.includes("بستاشيو") || combined.includes("تشيز طاخ") || combined.includes("بستك")) {
      return "/products/kashtouta-pistachio.jpg";
    }
    return "/products/fatta-wazeer.jpg";
  }

  // Additions & Toppings
  if (grp.includes("إضافات") || grp.includes("اضافات") || combined.includes("إضافة") || combined.includes("اضافة")) {
    if (combined.includes("ايس كريم")) return "/products/ice-cream.jpg";
    if (combined.includes("مانجا") || combined.includes("مانجو")) return "/products/kashtouta-mango.jpg";
    if (combined.includes("نوتيلا") || combined.includes("أوريو") || combined.includes("شوك")) return "/products/rice-nutella.jpg";
    if (combined.includes("فسدق") || combined.includes("بستاشيو")) return "/products/cheesecake-pistachio.jpg";
    if (combined.includes("بسبوسة") || combined.includes("كنافة")) return "/products/fatta-wazeer.jpg";
    if (combined.includes("كراميل")) return "/products/medalaa.jpg";
    if (combined.includes("لوتس")) return "/products/kashtouta-pistachio.jpg";
    return "/products/rice-pistachio.jpg";
  }

  // Offers & Gift boxes
  if (combined.includes("عرض") || combined.includes("هامور") || combined.includes("علبة") || combined.includes("بوكس") || combined.includes("هدية") || combined.includes("box")) {
    return "/products/baklava-box.jpg";
  }

  // Default fallback
  return "/products/rice-pistachio.jpg";
}

/**
 * Checks whether a client qualifies for a product's VIP price and whether the price is within the valid date.
 */
export function getEffectiveProductPrice(
  product: {
    sellingPrice?: number;
    price?: number;
    costPrice?: number;
    vipPrice?: number;
    vipClientIds?: string[];
    vipValidUntil?: string;
    sku?: string;
    id?: string;
  },
  clientIdOrName?: string | null,
  orderDate: string = new Date().toISOString().slice(0, 10)
): {
  effectivePrice: number;
  isVipApplied: boolean;
  standardPrice: number;
  vipPrice?: number;
  validUntil?: string;
  savings: number;
} {
  const standardPrice = Number(product.sellingPrice ?? (product as any).price ?? 0);

  let vip = Number(product.vipPrice);
  let clientIds = product.vipClientIds || [];
  let validUntil = product.vipValidUntil;

  if ((!vip || vip <= 0) && (product.sku || product.id)) {
    const cached = readCachedVipRules().get((product.sku || product.id || "").toUpperCase());
    if (cached) {
      vip = Number(cached.vipPrice);
      clientIds = cached.vipClientIds || [];
      validUntil = cached.vipValidUntil;
    }
  }

  if (!vip || vip <= 0 || !clientIdOrName) {
    return { effectivePrice: standardPrice, isVipApplied: false, standardPrice, savings: 0 };
  }

  const cleanTarget = clientIdOrName.trim().toLowerCase();
  const isAllVip = clientIds.some((c) => c === "ALL_VIP" || c === "*");
  const matchesClient =
    isAllVip ||
    clientIds.some((idOrName) => {
      if (!idOrName) return false;
      const clean = idOrName.trim().toLowerCase();
      return clean === cleanTarget || cleanTarget.includes(clean) || clean.includes(cleanTarget);
    });

  if (!matchesClient) {
    return { effectivePrice: standardPrice, isVipApplied: false, standardPrice, savings: 0 };
  }

  // Check date validity
  if (validUntil) {
    const todayDate = orderDate.slice(0, 10);
    const expireDate = validUntil.slice(0, 10);
    if (todayDate > expireDate) {
      return {
        effectivePrice: standardPrice,
        isVipApplied: false,
        standardPrice,
        vipPrice: vip,
        validUntil,
        savings: 0,
      };
    }
  }

  const savings = Math.max(0, Math.round((standardPrice - vip) * 100) / 100);
  return {
    effectivePrice: vip,
    isVipApplied: true,
    standardPrice,
    vipPrice: vip,
    validUntil,
    savings,
  };
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

export interface ComponentAvailability {
  componentId: string;
  componentSku: string;
  componentName: { ar: string; en: string };
  requiredQty: number; // required quantity per 1 unit of finished product
  availableQty: number; // on hand inventory in branch/warehouse
  sufficient: boolean;
  maxUnitsPossible: number;
}

export interface BuildableCalculation {
  productId: string;
  isAssembly: boolean;
  maxBuildable: number;
  hasBom: boolean;
  bomId?: string;
  bottleneck: ComponentAvailability | null;
  components: ComponentAvailability[];
}

export function calculateBuildableQuantity(
  product: InventoryProduct,
  allProducts: InventoryProduct[],
  boms: InventoryBom[]
): BuildableCalculation {
  const isAssembly = product.technicalType === "ON_DEMAND_ASSEMBLY" || Boolean(product.isAssemblyProduct);
  const activeBom =
    boms.find((b) => b.finishedProductId === product.id && b.status === "active") ||
    boms.find((b) => b.finishedProductId === product.id);

  if (!activeBom || !activeBom.components || activeBom.components.length === 0) {
    return {
      productId: product.id,
      isAssembly,
      maxBuildable: product.qty,
      hasBom: false,
      bottleneck: null,
      components: [],
    };
  }

  const outputYield = Number(activeBom.outputYield) > 0 ? Number(activeBom.outputYield) : 1;
  const componentsAvailability: ComponentAvailability[] = [];
  let minBuildable = Infinity;
  let bottleneck: ComponentAvailability | null = null;

  for (const cmp of activeBom.components) {
    const cmpProd = allProducts.find(
      (p) =>
        p.id === cmp.componentProductId ||
        p.id === cmp.rawMaterialProductId ||
        p.sku === cmp.componentProductId
    );
    const requiredPerUnit = (Number(cmp.quantity) || 0) / outputYield;
    const availableQty = cmpProd ? Math.max(0, cmpProd.qty) : 0;
    const maxUnits = requiredPerUnit > 0 ? Math.floor(availableQty / requiredPerUnit) : Infinity;

    const record: ComponentAvailability = {
      componentId: cmp.componentProductId,
      componentSku: cmpProd?.sku || "",
      componentName: cmpProd?.name || { ar: "مكون غير معروف", en: "Unknown Component" },
      requiredQty: requiredPerUnit,
      availableQty,
      sufficient: maxUnits >= 1,
      maxUnitsPossible: maxUnits === Infinity ? 999999 : maxUnits,
    };

    componentsAvailability.push(record);

    if (maxUnits < minBuildable) {
      minBuildable = maxUnits;
      bottleneck = record;
    }
  }

  const finalBuildable = minBuildable === Infinity ? 0 : Math.max(0, minBuildable);

  return {
    productId: product.id,
    isAssembly: true,
    maxBuildable: finalBuildable,
    hasBom: true,
    bomId: activeBom.id,
    bottleneck,
    components: componentsAvailability,
  };
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

let dbCategories: InventoryCategory[] = [...FACTORY_CATEGORIES];
let dbWarehouses: InventoryWarehouse[] = [...FACTORY_WAREHOUSES];
let dbUnits: InventoryUnit[] = [...FACTORY_UNITS];
let dbProducts: InventoryProduct[] = [...FACTORY_PRODUCTS];
let dbBoms: InventoryBom[] = [];
let dbBranches: Branch[] = [];
let dbStockMoves: StockMovementRecord[] = [];
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
export async function fetchDatabaseState() {
  try {
    const [catRes, whRes, unRes, prodRes, stockRes, bomRes, branchRes, movesRes] = await Promise.all([
      supabase.from("categories").select("*").order("name_ar"),
      supabase.from("warehouses").select("*").order("name_ar"),
      supabase.from("units").select("*").order("name_ar"),
      supabase.from("products").select("*").order("name_ar"),
      supabase.from("stock_levels").select("*"),
      supabase.from("boms").select("*, bom_lines(*)"),
      supabase.from("branches").select("*").order("name_ar"),
      supabase.from("stock_moves").select("*").order("moved_at", { ascending: false }).limit(500),
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

    if (catRes.data && catRes.data.length > 0) {
      dbCategories = catRes.data.map((c: any) => ({
        id: c.id,
        code: c.code || "",
        name: { ar: c.name_ar, en: c.name_en },
        type: (c.code?.includes("RAW") ? "raw" : c.code?.includes("PKG") ? "packaging" : "finished") as CategoryType,
        description: { ar: c.name_ar || "", en: c.name_en || "" },
      }));
    } else {
      dbCategories = [...FACTORY_CATEGORIES];
    }

    if (whRes.data && whRes.data.length > 0) {
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
    } else {
      dbWarehouses = [...FACTORY_WAREHOUSES];
    }

    if (unRes.data && unRes.data.length > 0) {
      dbUnits = unRes.data.map((u: any) => ({
        id: u.id,
        code: u.code || "",
        name: { ar: u.name_ar, en: u.name_en },
        category: (u.code === "KG" || u.code === "G" ? "weight" : u.code === "LTR" ? "volume" : "count") as UnitCategory,
        isBaseUnit: true,
        conversionFactor: 1,
      }));
    } else {
      dbUnits = [...FACTORY_UNITS];
    }

    // Map Stock levels by product_id
    const stockMap = new Map<string, number>();
    if (stockRes.data) {
      for (const s of stockRes.data) {
        const cur = stockMap.get(s.product_id) || 0;
        stockMap.set(s.product_id, cur + Number(s.quantity || 0));
      }
    }

    if (prodRes.data && prodRes.data.length > 0) {
      dbProducts = prodRes.data.map((p: any) => {
        const totalStock = stockMap.get(p.id) ?? 0;
        const isRaw = Boolean(p.is_raw_material);
        let technicalType: ProductTechnicalType = "ON_DEMAND_ASSEMBLY";
        if (isRaw) {
          technicalType = "RAW_MATERIAL";
        } else if (p.product_group === "SEMI_FINISHED" || p.sku?.startsWith("FAC-")) {
          technicalType = "SEMI_FINISHED";
        } else if (p.product_group === "FINISHED" || p.sku === "BRN-1041") {
          technicalType = "FINISHED";
        } else if (p.product_group === "ON_DEMAND_ASSEMBLY") {
          technicalType = "ON_DEMAND_ASSEMBLY";
        } else {
          technicalType = p.sku?.startsWith("BRN-") ? "ON_DEMAND_ASSEMBLY" : "FINISHED";
        }

        const isAssembly = technicalType === "ON_DEMAND_ASSEMBLY";
        const trackInventory = technicalType !== "ON_DEMAND_ASSEMBLY";
        const productType: "factory" | "branch" =
          technicalType === "SEMI_FINISHED" || technicalType === "RAW_MATERIAL" ? "factory" : "branch";

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
          image: resolveProductImage({ sku: p.sku, name: { ar: p.name_ar, en: p.name_en }, group: p.product_group, image: p.image_url }),
          isRawMaterial: isRaw,
          productType,
          technicalType,
          isAssemblyProduct: isAssembly,
          trackInventory,
          department: "",
          group: p.product_group || undefined,
          branchId: p.branch_id || undefined,
          showOnPos: p.show_on_pos !== undefined ? Boolean(p.show_on_pos) : (isRaw ? false : true),
          vipPrice: p.vip_price !== undefined && p.vip_price !== null ? Number(p.vip_price) : readCachedVipRules().get(p.sku?.toUpperCase() || p.id?.toUpperCase())?.vipPrice,
          vipClientIds: p.vip_client_ids || readCachedVipRules().get(p.sku?.toUpperCase() || p.id?.toUpperCase())?.vipClientIds || [],
          vipValidUntil: p.vip_valid_until || readCachedVipRules().get(p.sku?.toUpperCase() || p.id?.toUpperCase())?.vipValidUntil || undefined,
          vat: p.vat !== undefined && p.vat !== null ? Number(p.vat) : (readCachedVatRules().get(p.sku?.toUpperCase() || p.id?.toUpperCase()) ?? 14),
        };
      });
    } else {
      dbProducts = FACTORY_PRODUCTS.map((p) => ({
        ...p,
        image: p.image || resolveProductImage(p),
      }));
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
        components: (b.bom_lines || []).map((bl: any) => {
          const compProd = dbProducts.find((p) => p.id === bl.component_id);
          const compUnitCost = compProd?.costPrice || 0;
          const qty = Number(bl.quantity || 0);
          return {
            componentProductId: bl.component_id,
            rawMaterialProductId: bl.component_id,
            quantity: qty,
            unitId: compProd?.unitId || "",
            unitCost: compUnitCost,
            totalCost: qty * compUnitCost,
            wastePercent: Number(bl.waste_percent || 0),
          };
        }),
        status: b.is_active ? "active" : "draft",
      }));
    }

    if (movesRes?.data) {
      dbStockMoves = movesRes.data.map((m: any) => {
        const prod = dbProducts.find((p) => p.id === m.product_id);
        const fromWh = dbWarehouses.find((w) => w.id === m.from_warehouse_id);
        const toWh = dbWarehouses.find((w) => w.id === m.to_warehouse_id);
        const unit = prod ? dbUnits.find((u) => u.id === prod.unitId) : undefined;
        const cat = prod ? dbCategories.find((c) => c.id === prod.categoryId) : undefined;
        const qty = Number(m.quantity || 0);
        const unitCost = Number(m.unit_cost !== null && m.unit_cost !== undefined ? m.unit_cost : prod?.costPrice || 0);

        return {
          id: m.id,
          moveNo: m.move_no || `SM-${m.id.slice(0, 8).toUpperCase()}`,
          moveType: (m.move_type as StockMoveType) || "adjustment",
          productId: m.product_id,
          productName: prod ? prod.name : { ar: "صنف غير معروف", en: "Unknown Product" },
          productSku: prod?.sku || "SKU-N/A",
          categoryName: cat?.name,
          fromWarehouseId: m.from_warehouse_id,
          fromWarehouseName: fromWh?.name,
          toWarehouseId: m.to_warehouse_id,
          toWarehouseName: toWh?.name,
          quantity: qty,
          unitCost,
          totalCost: qty * unitCost,
          reference: m.reference || "N/A",
          notes: m.notes || undefined,
          movedAt: m.moved_at || m.created_at || new Date().toISOString(),
          createdAt: m.created_at || m.moved_at || new Date().toISOString(),
          createdBy: m.created_by,
          unitName: unit?.name,
        };
      });
    }

    isLoadedFromDb = true;
    notify();
  } catch (err) {
    console.error("Error fetching inventory from database:", err);
  }
}

// Subscribe to Supabase Realtime changes safely (HMR / Multi-import guarded)
function initRealtime() {
  if (typeof window === "undefined") return;
  const win = window as any;
  if (win.__inventory_realtime_subscribed__) return;

  try {
    const existing = supabase.getChannels?.()?.find?.((ch: any) => ch.topic === "realtime:inventory_db_realtime");
    if (existing) {
      win.__inventory_realtime_subscribed__ = true;
      return;
    }

    win.__inventory_realtime_subscribed__ = true;
    const channel = supabase.channel("inventory_db_realtime");
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchDatabaseState())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_levels" }, () => fetchDatabaseState())
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => fetchDatabaseState())
      .on("postgres_changes", { event: "*", schema: "public", table: "warehouses" }, () => fetchDatabaseState())
      .on("postgres_changes", { event: "*", schema: "public", table: "units" }, () => fetchDatabaseState())
      .on("postgres_changes", { event: "*", schema: "public", table: "branches" }, () => fetchDatabaseState())
      .on("postgres_changes", { event: "*", schema: "public", table: "boms" }, () => fetchDatabaseState())
      .on("postgres_changes", { event: "*", schema: "public", table: "bom_lines" }, () => fetchDatabaseState())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_moves" }, () => fetchDatabaseState());

    channel.subscribe((status: string, err?: any) => {
      if (err) console.warn("Realtime subscription notice:", status, err);
    });
  } catch (err) {
    console.warn("Realtime initialization skipped:", err);
  }
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

  const isValidUuid = (val?: string | null): boolean =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));

  const resolveValidCategoryId = (rawId?: string): string | null => {
    if (isValidUuid(rawId)) return rawId!;
    if (rawId) {
      const low = rawId.toLowerCase();
      const match = dbCategories.find(
        (c) =>
          isValidUuid(c.id) &&
          (c.code?.toLowerCase() === low || c.name.ar.toLowerCase() === low || c.name.en?.toLowerCase() === low)
      );
      if (match) return match.id;
    }
    return dbCategories.find((c) => isValidUuid(c.id))?.id || null;
  };

  const resolveValidUnitId = (rawId?: string): string | null => {
    if (isValidUuid(rawId)) return rawId!;
    if (rawId) {
      const low = rawId.toLowerCase();
      const match = dbUnits.find(
        (u) =>
          isValidUuid(u.id) &&
          (u.code?.toLowerCase() === low ||
            (low.includes("kg") && u.code?.toLowerCase() === "kg") ||
            u.name.ar.toLowerCase() === low ||
            u.name.en?.toLowerCase() === low)
      );
      if (match) return match.id;
    }
    return dbUnits.find((u) => isValidUuid(u.id))?.id || null;
  };

  const resolveValidWarehouseId = (rawId?: string): string | null => {
    if (isValidUuid(rawId)) return rawId!;
    if (rawId) {
      const low = rawId.toLowerCase();
      const match = dbWarehouses.find(
        (w) => isValidUuid(w.id) && (w.code?.toLowerCase() === low || w.name.ar.toLowerCase() === low)
      );
      if (match) return match.id;
    }
    return dbWarehouses.find((w) => isValidUuid(w.id))?.id || null;
  };

  const upsertProductInternal = useCallback(async (prod: Omit<InventoryProduct, "id">, skipRefresh = false) => {
    const resolvedCategoryId = resolveValidCategoryId(prod.categoryId);
    const resolvedUnitId = resolveValidUnitId(prod.unitId);
    const resolvedBranchId = isValidUuid(prod.branchId) ? prod.branchId! : null;
    const resolvedImage =
      prod.image && !prod.image.includes("images.unsplash.com") ? prod.image : resolveProductImage(prod);
    const resolvedShowOnPos =
      prod.showOnPos !== undefined ? Boolean(prod.showOnPos) : !Boolean(prod.isRawMaterial);
    const finalVat = prod.vat !== undefined ? prod.vat : 14;

    const existing = dbProducts.find(
      (p) => p.sku && prod.sku && p.sku.trim().toUpperCase() === prod.sku.trim().toUpperCase()
    );

    const payloadWithVat: any = {
      sku: prod.sku,
      name_ar: prod.name.ar,
      name_en: prod.name.en,
      category_id: resolvedCategoryId,
      unit_id: resolvedUnitId,
      cost_price: prod.costPrice || 0,
      sale_price: prod.sellingPrice || 0,
      reorder_level: prod.minStock || 10,
      is_raw_material: Boolean(prod.isRawMaterial),
      is_active: true,
      image_url: resolvedImage || null,
      product_group: prod.group || null,
      branch_id: resolvedBranchId,
      show_on_pos: resolvedShowOnPos,
      vip_price: prod.vipPrice && prod.vipPrice > 0 ? prod.vipPrice : null,
      vip_client_ids: prod.vipClientIds || [],
      vip_valid_until: prod.vipValidUntil || null,
      vat: finalVat,
    };

    let savedRow: any = null;

    if (existing && isValidUuid(existing.id)) {
      const { error: updErr, data: updData } = await supabase
        .from("products")
        .update(payloadWithVat)
        .eq("id", existing.id)
        .select()
        .single();
      if (updErr) {
        const { vat: _v, ...fallbackUpd } = payloadWithVat;
        const retryUpd = await supabase.from("products").update(fallbackUpd).eq("id", existing.id).select().single();
        if (retryUpd.error) throw retryUpd.error;
        savedRow = retryUpd.data;
      } else {
        savedRow = updData;
      }
    } else {
      const { data, error } = await supabase.from("products").insert(payloadWithVat).select().single();
      if (error) {
        const { vat: _v, ...fallbackInsert } = payloadWithVat;
        const retryRes = await supabase.from("products").insert(fallbackInsert).select().single();
        if (retryRes.error) throw retryRes.error;
        savedRow = retryRes.data;
      } else {
        savedRow = data;
      }

      // Insert initial stock level for new products
      const whId = resolveValidWarehouseId(prod.warehouseId);
      if (whId && savedRow?.id) {
        await supabase.from("stock_levels").insert({
          product_id: savedRow.id,
          warehouse_id: whId,
          quantity: prod.qty || 0,
        });
      }
    }

    // Always cache VAT and VIP rules locally
    saveVatRule(prod.sku, finalVat);
    if (savedRow?.id) saveVatRule(savedRow.id, finalVat);

    if (prod.vipPrice && prod.vipPrice > 0) {
      const rule: VipPriceRule = {
        vipPrice: prod.vipPrice,
        vipClientIds: prod.vipClientIds || [],
        vipValidUntil: prod.vipValidUntil,
      };
      saveVipRule(prod.sku, rule);
      if (savedRow?.id) saveVipRule(savedRow.id, rule);
    }

    if (!skipRefresh) {
      await fetchDatabaseState();
    }
    return { ...prod, image: resolvedImage, id: savedRow?.id || existing?.id };
  }, []);

  const addProduct = useCallback(
    async (prod: Omit<InventoryProduct, "id">) => {
      return upsertProductInternal(prod, false);
    },
    [upsertProductInternal]
  );

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
    if (updates.vipPrice !== undefined) dbUpdate.vip_price = updates.vipPrice && updates.vipPrice > 0 ? updates.vipPrice : null;
    if (updates.vipClientIds !== undefined) dbUpdate.vip_client_ids = updates.vipClientIds || [];
    if (updates.vipValidUntil !== undefined) dbUpdate.vip_valid_until = updates.vipValidUntil || null;
    if (updates.vat !== undefined) dbUpdate.vat = updates.vat;

    if (Object.keys(dbUpdate).length > 0) {
      try {
        const { error: updErr } = await supabase.from("products").update(dbUpdate).eq("id", id);
        if (updErr && dbUpdate.vat !== undefined) {
          const { vat: _v, ...restDb } = dbUpdate;
          await supabase.from("products").update(restDb).eq("id", id);
        }
      } catch (err) {
        console.warn("Supabase update product warning:", err);
      }
    }

    if (updates.vat !== undefined) {
      saveVatRule(id, updates.vat);
      if (updates.sku) saveVatRule(updates.sku, updates.vat);
    }

    if (updates.vipPrice !== undefined || updates.vipClientIds !== undefined || updates.vipValidUntil !== undefined) {
      const existing = readCachedVipRules().get(id.toUpperCase()) || (updates.sku ? readCachedVipRules().get(updates.sku.toUpperCase()) : null);
      const newRule: VipPriceRule = {
        vipPrice: updates.vipPrice !== undefined ? updates.vipPrice : (existing?.vipPrice || 0),
        vipClientIds: updates.vipClientIds !== undefined ? updates.vipClientIds : (existing?.vipClientIds || []),
        vipValidUntil: updates.vipValidUntil !== undefined ? updates.vipValidUntil : existing?.vipValidUntil,
      };
      saveVipRule(id, newRule);
      if (updates.sku) saveVipRule(updates.sku, newRule);
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
  const adjustStock = useCallback(
    async (productIdOrSku: string, deltaQty: number, orderReference?: string) => {
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

        const finalRef = orderReference || (deltaQty < 0 ? "POS-SALE" : "ADJUSTMENT");

        // Record move
        await supabase.from("stock_moves").insert({
          move_type: deltaQty < 0 ? "out" : "in",
          product_id: prod.id,
          from_warehouse_id: deltaQty < 0 ? whId : null,
          to_warehouse_id: deltaQty > 0 ? whId : null,
          quantity: Math.abs(deltaQty),
          unit_cost: prod.costPrice,
          reference: finalRef,
        });
      } catch (e) {
        console.error("Failed to adjust stock in database:", e);
      }
    },
    []
  );

  // On-Demand Assembly Stock Consumption (per Technical Guide Section 21 & Section 41)
  const consumeAssemblyStock = useCallback(
    async (
      productIdOrSku: string,
      saleQty: number,
      targetWarehouseId?: string,
      orderReference?: string
    ) => {
      const prod = dbProducts.find((p) => p.id === productIdOrSku || p.sku === productIdOrSku);
      if (!prod) return;

      const activeBom =
        dbBoms.find((b) => b.finishedProductId === prod.id && b.status === "active") ||
        dbBoms.find((b) => b.finishedProductId === prod.id);

      const whId = targetWarehouseId || dbWarehouses[0]?.id;
      if (!whId) return;

      // If no active recipe or components, adjust standard finished product stock
      if (!activeBom || !activeBom.components || activeBom.components.length === 0) {
        await adjustStock(prod.id, -saleQty, orderReference);
        return;
      }

      const outputYield = Number(activeBom.outputYield) > 0 ? Number(activeBom.outputYield) : 1;

      // Optimistically deduct components
      const componentDeductions: { componentProduct: InventoryProduct; consumedQty: number }[] = [];

      for (const cmp of activeBom.components) {
        const cmpProd = dbProducts.find(
          (p) =>
            p.id === cmp.componentProductId ||
            p.id === cmp.rawMaterialProductId ||
            p.sku === cmp.componentProductId
        );
        if (!cmpProd) continue;

        const consumedQty = ((Number(cmp.quantity) || 0) / outputYield) * saleQty;
        componentDeductions.push({ componentProduct: cmpProd, consumedQty });

        dbProducts = dbProducts.map((p) =>
          p.id === cmpProd.id ? { ...p, qty: Math.max(0, p.qty - consumedQty) } : p
        );
      }
      notify();

      // Persist component deductions to Supabase
      try {
        const finalRef = orderReference ? `POS-SALE-${orderReference}` : `POS-ASSEMBLY-${prod.sku}`;
        for (const item of componentDeductions) {
          const { data: currentStock } = await supabase
            .from("stock_levels")
            .select("quantity")
            .eq("product_id", item.componentProduct.id)
            .eq("warehouse_id", whId)
            .maybeSingle();

          const existingQty = currentStock ? Number(currentStock.quantity) : item.componentProduct.qty;
          const nextQty = Math.max(0, existingQty - item.consumedQty);

          await supabase.from("stock_levels").upsert({
            product_id: item.componentProduct.id,
            warehouse_id: whId,
            quantity: nextQty,
          });

          await supabase.from("stock_moves").insert({
            move_type: "out",
            product_id: item.componentProduct.id,
            from_warehouse_id: whId,
            to_warehouse_id: null,
            quantity: item.consumedQty,
            unit_cost: item.componentProduct.costPrice,
            reference: finalRef,
          });
        }
      } catch (err) {
        console.error("Failed to persist assembly component deductions:", err);
      }
    },
    [adjustStock]
  );

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

    if (bom.components && bom.components.length > 0) {
      const validLines = bom.components
        .filter((c) => c.componentProductId || c.rawMaterialProductId)
        .map((c) => ({
          bom_id: data.id,
          component_id: c.componentProductId || c.rawMaterialProductId || "",
          quantity: c.quantity || 1,
          waste_percent: c.wastePercent || 0,
        }));
      if (validLines.length > 0) {
        try {
          await supabase.from("bom_lines").insert(validLines);
        } catch (blErr) {
          console.warn("Failed to insert bom_lines:", blErr);
        }
      }
    }

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
    if (Object.keys(dbUpdate).length > 0) {
      await supabase.from("boms").update(dbUpdate).eq("id", id);
    }

    if (updates.components !== undefined) {
      try {
        await supabase.from("bom_lines").delete().eq("bom_id", id);
        const validLines = updates.components
          .filter((c) => c.componentProductId || c.rawMaterialProductId)
          .map((c) => ({
            bom_id: id,
            component_id: c.componentProductId || c.rawMaterialProductId || "",
            quantity: c.quantity || 1,
            waste_percent: c.wastePercent || 0,
          }));
        if (validLines.length > 0) {
          await supabase.from("bom_lines").insert(validLines);
        }
      } catch (blErr) {
        console.warn("Failed to update bom_lines:", blErr);
      }
    }

    await fetchDatabaseState();
  }, []);

  const deleteBom = useCallback(async (id: string) => {
    await supabase.from("boms").delete().eq("id", id);
    await fetchDatabaseState();
  }, []);

  const resetToSeed = useCallback(async () => {
    await fetchDatabaseState();
  }, []);

  const importProducts = useCallback(
    async (items: Omit<InventoryProduct, "id">[]) => {
      if (!items || items.length === 0) return 0;
      let count = 0;
      for (const prod of items) {
        try {
          await upsertProductInternal(prod, true);
          count++;
        } catch (err) {
          console.error("Failed to import product:", prod.sku, err);
        }
      }
      await fetchDatabaseState();
      return count;
    },
    [upsertProductInternal]
  );
  const importCategories = useCallback(
    async (items: Omit<InventoryCategory, "id">[]) => {
      if (!items || items.length === 0) return 0;
      let count = 0;
      for (const cat of items) {
        try {
          await addCategory(cat);
          count++;
        } catch (err) {
          console.error("Failed to import category:", cat.code, err);
        }
      }
      await fetchDatabaseState();
      return count;
    },
    [addCategory]
  );

  const importWarehouses = useCallback(
    async (items: Omit<InventoryWarehouse, "id">[]) => {
      if (!items || items.length === 0) return 0;
      let count = 0;
      for (const wh of items) {
        try {
          await addWarehouse(wh);
          count++;
        } catch (err) {
          console.error("Failed to import warehouse:", wh.code, err);
        }
      }
      await fetchDatabaseState();
      return count;
    },
    [addWarehouse]
  );

  const importUnits = useCallback(
    async (items: Omit<InventoryUnit, "id">[]) => {
      if (!items || items.length === 0) return 0;
      let count = 0;
      for (const un of items) {
        try {
          await addUnit(un);
          count++;
        } catch (err) {
          console.error("Failed to import unit:", un.code, err);
        }
      }
      await fetchDatabaseState();
      return count;
    },
    [addUnit]
  );

  const importBoms = useCallback(
    async (items: Omit<InventoryBom, "id">[]) => {
      if (!items || items.length === 0) return 0;
      let count = 0;
      for (const b of items) {
        try {
          await addBom(b);
          count++;
        } catch (err) {
          console.error("Failed to import BOM:", b.code, err);
        }
      }
      await fetchDatabaseState();
      return count;
    },
    [addBom]
  );

  const recordStockMove = useCallback(
    async (payload: NewStockMovePayload) => {
      const prod = dbProducts.find((p) => p.id === payload.productId || p.sku === payload.productId);
      const qty = Math.abs(Number(payload.quantity) || 0);
      if (!prod || qty <= 0) {
        throw new Error("Invalid product or quantity");
      }

      const cost = payload.unitCost !== undefined ? Number(payload.unitCost) : prod.costPrice;
      const moveDate = payload.movedAt || new Date().toISOString();
      const moveYear = new Date(moveDate).getFullYear();
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const generatedMoveNo = `SM-${moveYear}-${randomSuffix}`;
      const defaultRef =
        payload.moveType === "transfer"
          ? "TRANSFER"
          : payload.moveType === "in"
          ? "INBOUND"
          : payload.moveType === "out"
          ? "OUTBOUND"
          : "ADJUSTMENT";
      const reference = payload.reference?.trim() || defaultRef;

      // Insert directly into Supabase stock_moves table
      const { data, error } = await supabase
        .from("stock_moves")
        .insert({
          move_no: generatedMoveNo,
          move_type: payload.moveType,
          product_id: prod.id,
          from_warehouse_id: payload.fromWarehouseId || null,
          to_warehouse_id: payload.toWarehouseId || null,
          quantity: qty,
          unit_cost: cost,
          reference: reference,
          moved_at: moveDate,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to insert stock move to Supabase:", error);
        throw error;
      }

      // Refresh store state to reflect the move and updated stock levels
      await fetchDatabaseState();
      return data;
    },
    []
  );

  return {
    categories: dbCategories,
    warehouses: dbWarehouses,
    branches: dbBranches,
    units: dbUnits,
    products: dbProducts,
    boms: dbBoms,
    stockMoves: dbStockMoves,
    recordStockMove,
    refreshStockMoves: fetchDatabaseState,
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
    consumeAssemblyStock,
    deleteProduct,
    importProducts,
    addBom,
    updateBom,
    deleteBom,
    importBoms,
    resetToSeed,
  };
}

export function getLatestInventoryProducts(): InventoryProduct[] {
  return dbProducts;
}

export function getLatestCategories(): InventoryCategory[] {
  return dbCategories;
}
