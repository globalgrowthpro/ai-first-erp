import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Upload,
  Download,
  Sparkles,
  Check,
  AlertCircle,
  X,
  FileCheck,
  Package,
  Tag,
  Building2,
  Scale,
  ChefHat,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, Td } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  InventoryProduct,
  InventoryCategory,
  InventoryWarehouse,
  InventoryUnit,
  InventoryBom,
} from "@/lib/inventory-store";
import {
  FACTORY_PRODUCTS,
  FACTORY_BOMS,
  FACTORY_CATEGORIES,
  FACTORY_WAREHOUSES,
  FACTORY_UNITS,
} from "@/lib/wazeer-factory-data-2026";

export type InventoryImportTarget =
  | "products"
  | "categories"
  | "warehouses"
  | "units"
  | "bom";

interface InventoryImportModalProps {
  open: boolean;
  onClose: () => void;
  initialTarget?: InventoryImportTarget;
  categories: InventoryCategory[];
  warehouses: InventoryWarehouse[];
  units: InventoryUnit[];
  products: InventoryProduct[];
  onImportProducts: (items: Omit<InventoryProduct, "id">[]) => void;
  onImportCategories: (items: Omit<InventoryCategory, "id">[]) => void;
  onImportWarehouses: (items: Omit<InventoryWarehouse, "id">[]) => void;
  onImportUnits: (items: Omit<InventoryUnit, "id">[]) => void;
  onImportBoms: (items: Omit<InventoryBom, "id">[]) => void;
}

// ==========================================
// Curated Ready-Made Industry Presets
// ==========================================
const READY_PRESETS = {
  products: [
    {
      id: "preset-wazeer-factory-109",
      title: {
        ar: "قالب مصنع وزير الحلو 2026 الكامل (109 صنف قياسي معتمد)",
        en: "Wazeer El-Helw 2026 Factory Master Catalog (109 Items)",
      },
      description: {
        ar: "الكتالوج الرسمي الكامل للمصنع لعام 2026: خامات مشتراه (51 خامة) + خامات مصنعة ونصف مصنعة (38 خلطة) + منتجات تامة الصنع (20 صنف)",
        en: "Official factory master catalog: 51 raw materials + 38 semi-finished + 20 finished goods",
      },
      badge: "معتمد مصنع 2026",
      items: FACTORY_PRODUCTS.map((p) => ({
        sku: p.sku,
        name: p.name,
        categoryId: p.categoryId,
        warehouseId: p.warehouseId,
        unitId: p.unitId,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        qty: p.qty,
        minStock: p.minStock,
        isRawMaterial: p.isRawMaterial,
        department: p.department,
        classification: p.classification,
        rawType: p.rawType,
      })),
    },
    {
      id: "preset-wazeer-raw-51",
      title: {
        ar: "قالب خامات ومشتريات مصنع وزير الحلو 2026 (51 خامة أساسية)",
        en: "Wazeer El-Helw Factory Raw Materials (51 Items)",
      },
      description: {
        ar: "سكر، دقيق جولد/جونزارو، بيض، زبدة فيرن، كاكاو، فانيليا، لبن بخيره، نشا، زيت، مكسرات، ومواد التعبئة والتغليف",
        en: "Flour, sugar, butter, eggs, milk, cocoa, vanilla, nuts, starch & packaging",
      },
      badge: "خامات مشتراه 2026",
      items: FACTORY_PRODUCTS.filter((p) => p.rawType?.includes("مشتراه") || p.isRawMaterial).map((p) => ({
        sku: p.sku,
        name: p.name,
        categoryId: p.categoryId,
        warehouseId: p.warehouseId,
        unitId: p.unitId,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        qty: p.qty,
        minStock: p.minStock,
        isRawMaterial: true,
        department: p.department,
        classification: p.classification,
        rawType: p.rawType,
      })),
    },
    {
      id: "preset-wazeer-semi-38",
      title: {
        ar: "قالب خامات مصنعة وقواعد كيك وأسبونش وصوصات (38 صنف)",
        en: "Wazeer El-Helw Semi-Finished & Sponges (38 Items)",
      },
      description: {
        ar: "صاجات فادج، صاجات أسبونش، ريد فيلفيت، كيك بوم فولكانو، سابليه، صوصات مخففة، بودينج، وأرز بلبن خام",
        en: "Fudge sheets, sponge bases, diluted sauces, puddings & cooked rice bases",
      },
      badge: "خامات مصنعة 2026",
      items: FACTORY_PRODUCTS.filter((p) => p.rawType?.includes("مصنعة")).map((p) => ({
        sku: p.sku,
        name: p.name,
        categoryId: p.categoryId,
        warehouseId: p.warehouseId,
        unitId: p.unitId,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        qty: p.qty,
        minStock: p.minStock,
        isRawMaterial: false,
        department: p.department,
        classification: p.classification,
        rawType: p.rawType,
      })),
    },
    {
      id: "preset-wazeer-finished-20",
      title: {
        ar: "قالب حلويات ومنتجات وزير الحلو التامة للفروع (20 منتج نهائي)",
        en: "Wazeer El-Helw Finished Retail Products (20 Items)",
      },
      description: {
        ar: "علب رويال (دبي، كيت كات، ريد فيلفيت)، كرانشي، متسلطنة مانجو، جارات دريم كيك وشوكلت، وعبوات الأرز باللبن",
        en: "Royal cakes, crunchy bowls, motsaltana, layered jars & retail bowls",
      },
      badge: "منتجات تامة 2026",
      items: FACTORY_PRODUCTS.filter((p) => p.rawType?.includes("منتج تام") || (!p.isRawMaterial && !p.rawType?.includes("مصنعة"))).map((p) => ({
        sku: p.sku,
        name: p.name,
        categoryId: p.categoryId,
        warehouseId: p.warehouseId,
        unitId: p.unitId,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        qty: p.qty,
        minStock: p.minStock,
        isRawMaterial: false,
        department: p.department,
        classification: p.classification,
        rawType: p.rawType,
      })),
    },
    {
      id: "preset-desserts-luxe",
      title: {
        ar: "قالب تشكيلة حلويات وكيك فاخرة (8 أصناف)",
        en: "Luxury Cakes & Desserts Pack (8 Items)",
      },
      description: {
        ar: "سان سيباستيان، كوكيز كيندر، تارت فواكه، بسبوسة قشطة، كنافة نابلسية، تشيز كيك وبراونيز",
        en: "San Sebastian, Kinder cookies, fruit tarts, basbousa, kunafa, cheesecake & brownies",
      },
      badge: "جاهز للتطبيق",
      items: [
        {
          sku: "SAN-LOTUS",
          name: { ar: "كيكة سان سيباستيان لوتس ديلوكس", en: "San Sebastian Lotus Deluxe" },
          categoryId: "cat-7",
          warehouseId: "wh-2",
          unitId: "u-1",
          costPrice: 65,
          sellingPrice: 150,
          qty: 40,
          minStock: 15,
        },
        {
          sku: "CK-KND",
          name: { ar: "كوكيز كيندر دبل تشوكليت سبريد", en: "Kinder Double Chocolate Cookie" },
          categoryId: "cat-6",
          warehouseId: "wh-1",
          unitId: "u-2",
          costPrice: 22,
          sellingPrice: 55,
          qty: 90,
          minStock: 25,
        },
        {
          sku: "TRT-FRT",
          name: { ar: "تارت ميكس فواكه استوائية كريمة", en: "Tropical Fruit Tart Cream" },
          categoryId: "cat-2",
          warehouseId: "wh-4",
          unitId: "u-1",
          costPrice: 48,
          sellingPrice: 110,
          qty: 35,
          minStock: 10,
        },
        {
          sku: "BSB-PST",
          name: { ar: "بسبوسة قشطة بلدي وفستق حلبي", en: "Basbousa Fresh Cream & Pistachio" },
          categoryId: "cat-3",
          warehouseId: "wh-2",
          unitId: "u-1",
          costPrice: 50,
          sellingPrice: 120,
          qty: 50,
          minStock: 15,
        },
        {
          sku: "KNF-NBL",
          name: { ar: "كنافة نابلسية بالجبن العكاوي", en: "Nabulsi Kunafa Akkawi Cheese" },
          categoryId: "cat-4",
          warehouseId: "wh-1",
          unitId: "u-1",
          costPrice: 55,
          sellingPrice: 130,
          qty: 45,
          minStock: 15,
        },
        {
          sku: "CHS-MNG",
          name: { ar: "كاسات تشيز كيك مانجو فريش", en: "Mango Cheesecake Cups" },
          categoryId: "cat-7",
          warehouseId: "wh-3",
          unitId: "u-1",
          costPrice: 38,
          sellingPrice: 85,
          qty: 70,
          minStock: 20,
        },
        {
          sku: "BRW-BEL",
          name: { ar: "براونيز فادج شوكولاتة بلجيكي 70%", en: "Belgian Fudge Brownies 70%" },
          categoryId: "cat-6",
          warehouseId: "wh-2",
          unitId: "u-2",
          costPrice: 28,
          sellingPrice: 65,
          qty: 85,
          minStock: 20,
        },
        {
          sku: "CIN-PCN",
          name: { ar: "سينابون كراميل بيكان رول كبير", en: "Cinnabon Caramel Pecan Roll" },
          categoryId: "cat-5",
          warehouseId: "wh-4",
          unitId: "u-2",
          costPrice: 34,
          sellingPrice: 80,
          qty: 60,
          minStock: 20,
        },
      ],
    },
    {
      id: "preset-raw-materials",
      title: {
        ar: "قالب خامات ومستلزمات إنتاج ومكسرات مستوردة (6 خامات)",
        en: "Imported Raw Materials & Nuts Pack (6 Items)",
      },
      description: {
        ar: "فستق حلبي، شوكولاتة خام، زبدة نيوزيلندي، عجينة ميلفيه، وبندق محمص",
        en: "Pistachios, raw dark chocolate, NZ butter, mille-feuille dough & roasted hazelnuts",
      },
      badge: "مواد خام",
      items: [
        {
          sku: "RM-PST-GR",
          name: { ar: "فستق حلبي إيراني مجروش إكسترا", en: "Crushed Iranian Pistachio Extra" },
          categoryId: "cat-8",
          warehouseId: "wh-5",
          unitId: "u-4",
          costPrice: 720,
          sellingPrice: 820,
          qty: 30,
          minStock: 10,
          isRawMaterial: true,
        },
        {
          sku: "RM-BEL-DK",
          name: { ar: "شوكولاتة خام دارك بلجيكي 70% كاليوت", en: "Belgian Dark Chocolate 70%" },
          categoryId: "cat-8",
          warehouseId: "wh-5",
          unitId: "u-4",
          costPrice: 380,
          sellingPrice: 440,
          qty: 80,
          minStock: 20,
          isRawMaterial: true,
        },
        {
          sku: "RM-NZ-BTR",
          name: { ar: "زبدة نيوزيلندي طبيعية نقية 100%", en: "Pure New Zealand Butter 100%" },
          categoryId: "cat-8",
          warehouseId: "wh-5",
          unitId: "u-4",
          costPrice: 310,
          sellingPrice: 350,
          qty: 120,
          minStock: 40,
          isRawMaterial: true,
        },
        {
          sku: "RM-MNG-CB",
          name: { ar: "مانجو سكري مكعبات فريش مجمدة", en: "Frozen Diced Sweet Mango" },
          categoryId: "cat-8",
          warehouseId: "wh-5",
          unitId: "u-4",
          costPrice: 65,
          sellingPrice: 75,
          qty: 250,
          minStock: 60,
          isRawMaterial: true,
        },
        {
          sku: "RM-HZN-TK",
          name: { ar: "بندق تركي محمص مقشر جامبو", en: "Turkish Roasted Hazelnuts Jumbo" },
          categoryId: "cat-8",
          warehouseId: "wh-5",
          unitId: "u-4",
          costPrice: 420,
          sellingPrice: 490,
          qty: 45,
          minStock: 15,
          isRawMaterial: true,
        },
        {
          sku: "RM-CRM-DLS",
          name: { ar: "صوص كراميل دولسي دي ليتشي إسباني", en: "Dulce de Leche Caramel Spread" },
          categoryId: "cat-8",
          warehouseId: "wh-5",
          unitId: "u-4",
          costPrice: 180,
          sellingPrice: 220,
          qty: 60,
          minStock: 20,
          isRawMaterial: true,
        },
      ],
    },
    {
      id: "preset-packaging",
      title: {
        ar: "قالب مستلزمات وعبوات التغليف الفاخرة (5 أصناف)",
        en: "Luxury Packaging & Supplies Pack (5 Items)",
      },
      description: {
        ar: "علب كرتون فاخرة، أطباق فويل حرارية، أكياس هدايا، وملاعق خشبية",
        en: "Branded gift boxes, foil pans, paper carry bags & wooden cutlery",
      },
      badge: "تغليف وكرتون",
      items: [
        {
          sku: "PKG-BX-LG",
          name: { ar: "علبة تورتة كرتون فاخرة مقاس 30×30 سم", en: "Luxury Cake Box 30x30 cm" },
          categoryId: "cat-9",
          warehouseId: "wh-1",
          unitId: "u-2",
          costPrice: 16,
          sellingPrice: 22,
          qty: 400,
          minStock: 100,
        },
        {
          sku: "PKG-FL-RD",
          name: { ar: "أطباق فويل دائرية ميكروويف مع غطاء", en: "Round Foil Microwave Pans" },
          categoryId: "cat-9",
          warehouseId: "wh-1",
          unitId: "u-2",
          costPrice: 4.5,
          sellingPrice: 7,
          qty: 1200,
          minStock: 300,
        },
        {
          sku: "PKG-BG-PR",
          name: { ar: "أكياس تسوق ورقية كرافت مقوى مع يد", en: "Kraft Paper Shopping Bags" },
          categoryId: "cat-9",
          warehouseId: "wh-2",
          unitId: "u-2",
          costPrice: 6,
          sellingPrice: 9,
          qty: 850,
          minStock: 200,
        },
        {
          sku: "PKG-CP-CR",
          name: { ar: "كاسات حلويات بلاستيك كريستال 250 مل", en: "Crystal Plastic Dessert Cups 250ml" },
          categoryId: "cat-9",
          warehouseId: "wh-3",
          unitId: "u-2",
          costPrice: 3.2,
          sellingPrice: 5,
          qty: 1500,
          minStock: 400,
        },
        {
          sku: "PKG-SP-WD",
          name: { ar: "ملاعق حلوى خشبية صديقة للبيئة (باكت 100)", en: "Eco Wooden Spoons (Pack 100)" },
          categoryId: "cat-9",
          warehouseId: "wh-1",
          unitId: "u-3",
          costPrice: 25,
          sellingPrice: 35,
          qty: 180,
          minStock: 50,
        },
      ],
    },
  ],

  categories: [
    {
      id: "preset-cats-modern",
      title: {
        ar: "قالب تصنيفات مطاعم وحلويات معاصرة (5 تصنيفات)",
        en: "Modern Confectionery Categories (5 Categories)",
      },
      description: {
        ar: "كيك ومناسبات، جيلاتي وآيس كريم، مخبوزات فرنسية، مشروبات، وشوكولاتة",
        en: "Cakes, authentic gelato, french bakery, specialty drinks & chocolates",
      },
      badge: "معتمد",
      items: [
        {
          code: "CAT-CAKE",
          name: { ar: "تورتات وكيك المناسبات", en: "Celebration Cakes & Torts" },
          type: "finished" as const,
          description: {
            ar: "تورتات أعياد الميلاد والزفاف وكيك الفادج والشوكولاتة المخصصة",
            en: "Custom birthday, wedding and celebration cakes",
          },
        },
        {
          code: "CAT-GEL",
          name: { ar: "الآيس كريم والجيلاتي الإيطالي", en: "Italian Gelato & Ice Cream" },
          type: "finished" as const,
          description: {
            ar: "بولات وكاسات جيلاتي طبيعي بالفستق والمانجو والشوكولاتة الإيطالية",
            en: "Artisanal gelato cups and scoops",
          },
        },
        {
          code: "CAT-BAKE",
          name: { ar: "المخبوزات والكرواسون الفرنسي", en: "French Bakery & Croissants" },
          type: "finished" as const,
          description: {
            ar: "كرواسون زبدة طازج ودانيش وفطائر محشوة شوكولاتة وجبن",
            en: "Fresh butter croissants and danish pastries",
          },
        },
        {
          code: "CAT-BEV",
          name: { ar: "المشروبات والقهوة المختصة", en: "Specialty Coffee & Beverages" },
          type: "finished" as const,
          description: {
            ar: "سبانش لاتيه، موهيتو، سموذي فواكه طبيعية، وشاي مثلج",
            en: "Iced specialty coffees, mojitos and natural smoothies",
          },
        },
        {
          code: "CAT-CHOC",
          name: { ar: "الشوكولاتات الفاخرة والبرالينيه", en: "Artisan Chocolate & Pralines" },
          type: "finished" as const,
          description: {
            ar: "علب شوكولاتة بلجيكية فاخرة وهدايا بوكسات المناسبات",
            en: "Luxury Belgian chocolate gift boxes",
          },
        },
      ],
    },
  ],

  warehouses: [
    {
      id: "preset-wh-cairo",
      title: {
        ar: "قالب شبكة فروع القاهرة الكبرى والتوزيع (4 فروع ومستودع)",
        en: "Greater Cairo Branches & Logistics Network (4 Facilities)",
      },
      description: {
        ar: "فروع مدينة نصر، الشيخ زايد، المهندسين، ومستودع اللوجستيات",
        en: "Branches in Nasr City, Zayed, Mohandessin and logistics hub",
      },
      badge: "شبكة فروع",
      items: [
        {
          code: "WH-NASR",
          name: { ar: "فرع مدينة نصر — سيتي ستارز", en: "Nasr City Branch" },
          type: "retail" as const,
          address: {
            ar: "شارع عباس العقاد، تقاطع مكرم عبيد، مدينة نصر",
            en: "Abbas El-Akkad St, Nasr City, Cairo",
          },
          managerName: "أ. طارق عبد الحميد",
          phone: "+20 102 334 5566",
          capacityPercent: 68,
          status: "active" as const,
        },
        {
          code: "WH-ZAYED",
          name: { ar: "فرع الشيخ زايد — كابيتال بيزنس بارك", en: "Sheikh Zayed Branch" },
          type: "retail" as const,
          address: {
            ar: "محور 26 يوليو، مدخل زايد 2، كابيتال بارك",
            en: "26th of July Corridor, Zayed 2",
          },
          managerName: "أ. زياد ممدوح",
          phone: "+20 114 556 7788",
          capacityPercent: 54,
          status: "active" as const,
        },
        {
          code: "WH-MOHAND",
          name: { ar: "فرع المهندسين — جامعة الدول", en: "Mohandessin Branch" },
          type: "retail" as const,
          address: {
            ar: "28 شارع جامعة الدول العربية، أمام نادي الصيد",
            en: "Gamiat El-Dowal St, Mohandessin",
          },
          managerName: "أ. ماجد فوزي",
          phone: "+20 128 990 1122",
          capacityPercent: 62,
          status: "active" as const,
        },
        {
          code: "WH-LOGIS",
          name: { ar: "مستودع التوزيع الجاف واللوجستيات", en: "Central Dry Logistics Hub" },
          type: "dry_storage" as const,
          address: {
            ar: "طريق مصر إسكندرية الزراعي، الكيلو 18، قليوب",
            en: "Cairo-Alex Agriculture Rd, Km 18",
          },
          managerName: "م. خالد الأنصاري",
          phone: "+20 109 444 3322",
          capacityPercent: 74,
          status: "active" as const,
        },
      ],
    },
  ],

  units: [
    {
      id: "preset-units-bakery",
      title: {
        ar: "قالب وحدات الأوزان والحجوم وعبوات المخابز (5 وحدات)",
        en: "Bakery & Culinary Measurement Pack (5 Units)",
      },
      description: {
        ar: "شيكارة 25 كجم، دستة 12 قطعة، جالون صناعي، باكت 500 جم، وبالتة كرتون",
        en: "25kg Sack, Dozen (12 pcs), 5L Gallon, 500g Pack & Pallet",
      },
      badge: "وحدات قياسية",
      items: [
        {
          code: "BAG-25",
          name: { ar: "شيكارة 25 كجم", en: "Sack 25kg" },
          category: "weight" as const,
          isBaseUnit: false,
          baseUnitCode: "KG",
          conversionFactor: 25,
        },
        {
          code: "DOZ",
          name: { ar: "دزينة / دستة (12 قطعة)", en: "Dozen (12 Pieces)" },
          category: "count" as const,
          isBaseUnit: false,
          baseUnitCode: "PCS",
          conversionFactor: 12,
        },
        {
          code: "GAL-5",
          name: { ar: "جالون صناعي 5 لتر", en: "Industrial Gallon 5L" },
          category: "volume" as const,
          isBaseUnit: false,
          baseUnitCode: "LTR",
          conversionFactor: 5,
        },
        {
          code: "PKT-500",
          name: { ar: "باكت نصف كيلو (500 جم)", en: "Pack 500g" },
          category: "weight" as const,
          isBaseUnit: false,
          baseUnitCode: "KG",
          conversionFactor: 0.5,
        },
        {
          code: "PALLET",
          name: { ar: "بالتة شحن خشبية (100 كرتونة)", en: "Shipping Pallet (100 Boxes)" },
          category: "packaging" as const,
          isBaseUnit: false,
          baseUnitCode: "BOX",
          conversionFactor: 100,
        },
      ],
    },
  ],

  bom: [
    {
      id: "preset-wazeer-bom-all-55",
      title: {
        ar: "قالب وصفات وتشغيل مصنع وزير الحلو 2026 الكامل (55 ريسبي قياسي)",
        en: "Wazeer El-Helw Standard Production Recipes (55 BOMs)",
      },
      description: {
        ar: "جميع وصفات التشغيل المعتمدة 2026: خلطات الأسبونش والفادج + الصوصات والكريمات + تجميع جارات وعلب الحلويات مع الأوزان ونسب الهدر",
        en: "Complete 55 multi-level recipes with batch weights, waste scrap rates, and component costs",
      },
      badge: "وصفات معتمدة 2026",
      items: FACTORY_BOMS.map((b) => ({
        code: b.code,
        name: b.name,
        finishedProductId: b.finishedProductId,
        branchId: b.branchId,
        outputYield: b.outputYield,
        outputUnitId: b.outputUnitId,
        overheadCost: b.overheadCost,
        components: b.components,
        notes: b.notes,
        status: b.status,
        category: b.category,
        department: b.department,
        batchYieldWeightKg: b.batchYieldWeightKg,
        unitWeightKg: b.unitWeightKg,
        totalMaterialCost: b.totalMaterialCost,
        unitCost: b.unitCost,
        isSemiFinished: b.isSemiFinished,
      })),
    },
    {
      id: "preset-wazeer-bom-sponge",
      title: {
        ar: "وصفات عنبر تحضير الأسبونش والفرن (14 ريسبي صاج وكيك)",
        en: "Sponge & Baking Dept Recipes (14 BOMs)",
      },
      description: {
        ar: "صاج قشطوطة، صاج فادج 1.6k و2.2k، تورت فادج، مولتن كيك، صاج ريد فيلفيت، كيك بوم، وبراونيز",
        en: "Sponge sheets, fudge trays, lava cakes, red velvet & brownies",
      },
      badge: "عنبر الأسبونش",
      items: FACTORY_BOMS.filter((b) => b.department?.includes("أسبونش")).map((b) => ({
        code: b.code,
        name: b.name,
        finishedProductId: b.finishedProductId,
        branchId: b.branchId,
        outputYield: b.outputYield,
        outputUnitId: b.outputUnitId,
        overheadCost: b.overheadCost,
        components: b.components,
        notes: b.notes,
        status: b.status,
        category: b.category,
        department: b.department,
        batchYieldWeightKg: b.batchYieldWeightKg,
        unitWeightKg: b.unitWeightKg,
        totalMaterialCost: b.totalMaterialCost,
        unitCost: b.unitCost,
        isSemiFinished: b.isSemiFinished,
      })),
    },
    {
      id: "preset-wazeer-bom-dairy",
      title: {
        ar: "وصفات قسم الألبان والصوصات والتبريد (18 ريسبي صوص وكريمة)",
        en: "Dairy & Sauces Dept Recipes (18 BOMs)",
      },
      description: {
        ar: "أرز بلبن خام، صوصات نوتيلا وبستاشيو ولوتس مخففة، كريمة تشيز، بودينج شوكولاتة وأبيض، واجلاسية",
        en: "Rice pudding, diluted sauces, cheese creams, chocolate puddings & glazes",
      },
      badge: "عنبر الألبان",
      items: FACTORY_BOMS.filter((b) => b.department?.includes("الألبان")).map((b) => ({
        code: b.code,
        name: b.name,
        finishedProductId: b.finishedProductId,
        branchId: b.branchId,
        outputYield: b.outputYield,
        outputUnitId: b.outputUnitId,
        overheadCost: b.overheadCost,
        components: b.components,
        notes: b.notes,
        status: b.status,
        category: b.category,
        department: b.department,
        batchYieldWeightKg: b.batchYieldWeightKg,
        unitWeightKg: b.unitWeightKg,
        totalMaterialCost: b.totalMaterialCost,
        unitCost: b.unitCost,
        isSemiFinished: b.isSemiFinished,
      })),
    },
    {
      id: "preset-wazeer-bom-assembly",
      title: {
        ar: "وصفات تجميع ومعلبات الحلويات الفاخرة (23 ريسبي تشطيب)",
        en: "Assembly & Packaging Dept Recipes (23 BOMs)",
      },
      description: {
        ar: "عبوات كشري وفتة وديناميت أرز بلبن، علب رويال دبي وكيت كات، كرانشي، متسلطنة مانجو، وجارات الحلو",
        en: "Sweet koshary bowls, royal cakes, crunchy bowls, and layered jars",
      },
      badge: "عنبر المعلبات",
      items: FACTORY_BOMS.filter((b) => b.department?.includes("معلبات")).map((b) => ({
        code: b.code,
        name: b.name,
        finishedProductId: b.finishedProductId,
        branchId: b.branchId,
        outputYield: b.outputYield,
        outputUnitId: b.outputUnitId,
        overheadCost: b.overheadCost,
        components: b.components,
        notes: b.notes,
        status: b.status,
        category: b.category,
        department: b.department,
        batchYieldWeightKg: b.batchYieldWeightKg,
        unitWeightKg: b.unitWeightKg,
        totalMaterialCost: b.totalMaterialCost,
        unitCost: b.unitCost,
        isSemiFinished: b.isSemiFinished,
      })),
    },
    {
      id: "preset-bom-popular",
      title: {
        ar: "قالب وصفات تصنيع جاهزة بالمعايير الدقيقة (3 وصفات)",
        en: "Standardized Recipe Pack with BOM (3 Recipes)",
      },
      description: {
        ar: "وصفة كيك سان سيباستيان، وصفة براونيز بلجيكي، ووصفة تشيز كيك مانجو",
        en: "San Sebastian cake, Belgian fudge brownies & fresh mango cheesecake",
      },
      badge: "وصفات BOM",
      items: [
        {
          code: "BOM-SAN-01",
          name: { ar: "وصفة كيكة سان سيباستيان لوتس", en: "San Sebastian Lotus Recipe" },
          finishedProductId: "p-1",
          outputYield: 10,
          outputUnitId: "u-1",
          overheadCost: 150,
          status: "active" as const,
          notes: "خبز على حرارة 220 درجة مئوية لمدة 28 دقيقة لتحقيق الكراميل الإسباني",
          components: [
            { componentProductId: "rm-1", quantity: 4, unitId: "u-6", unitCost: 38, totalCost: 152 },
            { componentProductId: "rm-5", quantity: 2, unitId: "u-4", unitCost: 190, totalCost: 380 },
            { componentProductId: "rm-8", quantity: 1.5, unitId: "u-4", unitCost: 310, totalCost: 465 },
            { componentProductId: "rm-7", quantity: 1, unitId: "u-4", unitCost: 35, totalCost: 35 },
          ],
        },
        {
          code: "BOM-BRW-01",
          name: { ar: "وصفة براونيز شوكولاتة بلجيكي فادج", en: "Belgian Fudge Brownies Recipe" },
          finishedProductId: "p-2",
          outputYield: 24,
          outputUnitId: "u-2",
          overheadCost: 120,
          status: "active" as const,
          notes: "استخدام زبدة طبيعية نقية مع الشوكولاتة 70% المذابة بحمام مائي",
          components: [
            { componentProductId: "rm-2", quantity: 2, unitId: "u-4", unitCost: 240, totalCost: 480 },
            { componentProductId: "rm-7", quantity: 1.5, unitId: "u-4", unitCost: 35, totalCost: 52.5 },
            { componentProductId: "rm-1", quantity: 1, unitId: "u-6", unitCost: 38, totalCost: 38 },
          ],
        },
        {
          code: "BOM-CHS-01",
          name: { ar: "وصفة كاسات تشيز كيك مانجو فريش", en: "Mango Cheesecake Cups Recipe" },
          finishedProductId: "p-7",
          outputYield: 30,
          outputUnitId: "u-1",
          overheadCost: 90,
          status: "active" as const,
          notes: "طبقات متوازنة من البسكويت المطحون والكريمة المخفوقة مع جيلي المانجو",
          components: [
            { componentProductId: "rm-5", quantity: 3, unitId: "u-4", unitCost: 190, totalCost: 570 },
            { componentProductId: "rm-1", quantity: 2, unitId: "u-6", unitCost: 38, totalCost: 76 },
            { componentProductId: "rm-7", quantity: 1, unitId: "u-4", unitCost: 35, totalCost: 35 },
          ],
        },
      ],
    },
  ],
};

export function InventoryImportModal({
  open,
  onClose,
  initialTarget = "products",
  categories,
  warehouses,
  units,
  products,
  onImportProducts,
  onImportCategories,
  onImportWarehouses,
  onImportUnits,
  onImportBoms,
}: InventoryImportModalProps) {
  const { t, pick, money, n, dir } = useI18n();
  const isRtl = dir === "rtl";

  const [activeTab, setActiveTab] = useState<InventoryImportTarget>(initialTarget);
  const [importMode, setImportMode] = useState<"preset" | "excel">("preset");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial target if modal reopens
  useState(() => {
    setActiveTab(initialTarget);
  });

  const targetTabs = [
    { id: "products", label: pick("المنتجات والأصناف", "Products & Stock"), icon: Package },
    { id: "categories", label: pick("تصنيفات الأصناف", "Categories"), icon: Tag },
    { id: "warehouses", label: pick("الفروع والمستودعات", "Warehouses"), icon: Building2 },
    { id: "units", label: pick("وحدات القياس", "Units"), icon: Scale },
    { id: "bom", label: pick("وصفات الإنتاج (BOM)", "BOM Recipes"), icon: ChefHat },
  ];

  // Presets available for currently selected target tab
  const currentPresets = READY_PRESETS[activeTab] || [];

  // Reset file parsed data when switching target
  const handleSwitchTarget = (target: InventoryImportTarget) => {
    setActiveTab(target);
    setSelectedPresetId("");
    setParsedRows([]);
    setFileError(null);
    setFileName("");
  };

  // Safe bulletproof Excel workbook download in browser
  const safeDownloadWorkbook = (workbook: XLSX.WorkBook, filename: string): boolean => {
    try {
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        try {
          document.body.removeChild(anchor);
          window.URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }, 300);
      return true;
    } catch (err) {
      console.warn("Direct blob download failed, attempting XLSX.writeFile fallback:", err);
      try {
        XLSX.writeFile(workbook, filename);
        return true;
      } catch (err2) {
        console.error("XLSX.writeFile also failed:", err2);
        return false;
      }
    }
  };

  // Direct download of the authentic official factory 2026 Excel spreadsheet
  const handleDownloadOfficialExcel = async () => {
    const filename = "Standard Recipe - Wazeer EL-Helw Factory 2026.xlsx";
    try {
      const res = await fetch(`/${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error("Fetch failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 300);
      setDownloadNotice(
        pick(
          "تم تنزيل شيت مصنع وزير الحلو 2026 الرسمي المعتمد بنجاح!",
          "Wazeer El-Helw 2026 Official Factory Sheet downloaded successfully!"
        )
      );
      setTimeout(() => setDownloadNotice(null), 5000);
    } catch (err) {
      console.warn("Direct fetch failed, falling back to window.open", err);
      window.open(`/${encodeURIComponent(filename)}`, "_blank");
    }
  };

  // Export any ready preset directly as a complete Excel (.xlsx) file
  const handleDownloadPresetExcel = (preset: any) => {
    const wb = XLSX.utils.book_new();
    let filename = `${preset.id}.xlsx`;

    if (activeTab === "products") {
      filename = `قالب_أصناف_${preset.id}.xlsx`;
      const rows = preset.items.map((it: any) => ({
        "كود الصنف (SKU)": it.sku || "",
        "اسم الصنف بالعربية": it.name?.ar || it.name || "",
        "اسم الصنف بالإنجليزية": it.name?.en || it.name || "",
        "كود التصنيف": it.categoryId || "",
        "كود المستودع": it.warehouseId || "",
        "كود وحدة القياس": it.unitId || "",
        "سعر التكلفة (ج.م)": it.costPrice || 0,
        "سعر البيع (ج.م)": it.sellingPrice || 0,
        "الرصيد الافتتاحي": it.qty || 0,
        "حد إعادة الطلب": it.minStock || 10,
        "مادة خام (نعم/لا)": it.isRawMaterial ? "نعم" : "لا",
        "القسم / العنبر": it.department || "",
        "التصنيف الفني": it.classification || "",
        "نوع الخامة": it.rawType || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 18 }, { wch: 34 }, { wch: 30 }, { wch: 15 },
        { wch: 15 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
        { wch: 15 }, { wch: 14 }, { wch: 16 }, { wch: 22 },
        { wch: 22 }, { wch: 22 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "الأصناف_والمنتجات");
    } else if (activeTab === "bom") {
      filename = `قالب_وصفات_التصنيع_ريسبي_${preset.id}.xlsx`;
      const masterRows = preset.items.map((b: any) => ({
        "كود الوصفة": b.code || "",
        "اسم الوصفة بالعربية": b.name?.ar || b.name || "",
        "اسم الوصفة بالإنجليزية": b.name?.en || b.name || "",
        "كود المنتج النهائي": b.finishedProductId || "",
        "إنتاجية الوجبة": b.outputYield || 1,
        "وحدة الإنتاج": b.outputUnitId || "",
        "القسم / العنبر": b.department || "",
        "وزن الوجبة (كجم)": b.batchYieldWeightKg || "",
        "وزن الوحدة (كجم)": b.unitWeightKg || "",
        "تكلفة الخامات (ج.م)": b.totalMaterialCost || 0,
        "تكلفة الوحدة (ج.م)": b.unitCost || 0,
        "المصاريف الإضافية (ج.م)": b.overheadCost || 0,
        "الحالة": b.status || "active",
        "ملاحظات التشغيل": b.notes || "",
      }));
      const ws1 = XLSX.utils.json_to_sheet(masterRows);
      ws1["!cols"] = [
        { wch: 16 }, { wch: 35 }, { wch: 30 }, { wch: 18 },
        { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 16 },
        { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
        { wch: 12 }, { wch: 35 }
      ];
      XLSX.utils.book_append_sheet(wb, ws1, "وصفات_التصنيع_Recipes");

      // Ingredients sheet
      const ingredientRows: any[] = [];
      preset.items.forEach((b: any) => {
        if (Array.isArray(b.components)) {
          b.components.forEach((c: any) => {
            const rawProd = FACTORY_PRODUCTS.find(
              (p) => p.id === c.componentProductId || p.sku === c.componentProductId
            );
            ingredientRows.push({
              "كود الوصفة": b.code,
              "اسم الوصفة": b.name?.ar || b.name,
              "كود الخامة (SKU)": rawProd?.sku || c.componentProductId,
              "اسم الخامة بالعربية": rawProd?.name?.ar || c.componentProductId,
              "الكمية المطلوبة": c.quantity,
              "وحدة القياس": c.unitId || rawProd?.unitId || "KG",
              "سعر الوحدة (ج.م)": c.unitCost || rawProd?.costPrice || 0,
              "التكلفة الإجمالية (ج.م)": c.totalCost || (c.quantity * (c.unitCost || 0)),
              "نسبة الهدر المسموح %": c.wastePercentage || 0,
            });
          });
        }
      });
      if (ingredientRows.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(ingredientRows);
        ws2["!cols"] = [
          { wch: 16 }, { wch: 32 }, { wch: 18 }, { wch: 30 },
          { wch: 15 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, ws2, "شجرة_المكونات_Ingredients");
      }
    } else if (activeTab === "categories") {
      filename = `قالب_تصنيفات_المخزون_${preset.id}.xlsx`;
      const rows = preset.items.map((it: any) => ({
        "كود التصنيف": it.code || "",
        "الاسم بالعربية": it.name?.ar || it.name || "",
        "الاسم بالإنجليزية": it.name?.en || it.name || "",
        "نوع التصنيف": it.type || "finished",
        "الوصف والبيان": it.description?.ar || it.description || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 16 }, { wch: 30 }, { wch: 25 }, { wch: 16 }, { wch: 45 }];
      XLSX.utils.book_append_sheet(wb, ws, "التصنيفات_Categories");
    } else if (activeTab === "warehouses") {
      filename = `قالب_الفروع_والمستودعات_${preset.id}.xlsx`;
      const rows = preset.items.map((it: any) => ({
        "كود المستودع": it.code || "",
        "الاسم بالعربية": it.name?.ar || it.name || "",
        "الاسم بالإنجليزية": it.name?.en || it.name || "",
        "النوع": it.type || "retail",
        "العنوان": it.location?.address || it.address?.ar || it.address || "",
        "اسم المسؤول": it.managerName || "",
        "رقم الهاتف": it.phone || "",
        "نسبة الاستيعاب %": it.capacityPercentage || 80,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 16 }, { wch: 30 }, { wch: 25 }, { wch: 14 },
        { wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "الفروع_Warehouses");
    } else if (activeTab === "units") {
      filename = `قالب_وحدات_القياس_${preset.id}.xlsx`;
      const rows = preset.items.map((it: any) => ({
        "كود الوحدة": it.code || "",
        "الاسم بالعربية": it.name?.ar || it.name || "",
        "الاسم بالإنجليزية": it.name?.en || it.name || "",
        "نوع القياس": it.type || "weight",
        "معامل التحويل": it.conversionFactor || 1,
        "كود الوحدة الأساسية": it.baseUnitCode || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 16 }, { wch: 25 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws, "الوحدات_Units");
    }

    const success = safeDownloadWorkbook(wb, filename);
    if (success) {
      setDownloadNotice(
        pick(
          `تم تنزيل القالب بنجاح كملف إكسيل: ${filename}`,
          `Downloaded template Excel file: ${filename}`
        )
      );
      setTimeout(() => setDownloadNotice(null), 5000);
    }
  };

  // Generate and download sample blank Excel Template
  const handleDownloadExcelTemplate = () => {
    let headers: Record<string, any>[] = [];
    let filename = "";
    let sheetName = "Template_قالب_فارغ";

    if (activeTab === "products") {
      headers = [
        {
          "كود الصنف (SKU)": "KSHR-LUX",
          "اسم الصنف بالعربية": "كشري حلو سوبر لوكس",
          "اسم الصنف بالإنجليزية": "Sweet Koshary Super Luxe",
          "كود التصنيف": "CAT-KSHR",
          "كود المستودع": "WH-KORBA",
          "كود وحدة القياس": "PORTION",
          "سعر التكلفة": 45,
          "سعر البيع": 100,
          "الرصيد الافتتاحي": 60,
          "حد إعادة الطلب": 20,
          "مادة خام (نعم/لا)": "لا",
          "القسم": "قسم المعلبات",
        },
        {
          "كود الصنف (SKU)": "RM-PST-GR",
          "اسم الصنف بالعربية": "فستق حلبي إيراني مجروش",
          "اسم الصنف بالإنجليزية": "Crushed Iranian Pistachios",
          "كود التصنيف": "CAT-RAW",
          "كود المستودع": "WH-COLD",
          "كود وحدة القياس": "KG",
          "سعر التكلفة": 650,
          "سعر البيع": 750,
          "الرصيد الافتتاحي": 25,
          "حد إعادة الطلب": 10,
          "مادة خام (نعم/لا)": "نعم",
          "القسم": "المخزن الرئيسي",
        },
      ];
      filename = "products_template.xlsx";
      sheetName = "أصناف_Products";
    } else if (activeTab === "categories") {
      headers = [
        {
          "كود التصنيف": "CAT-CAKE",
          "الاسم بالعربية": "تورتات وكيك المناسبات",
          "الاسم بالإنجليزية": "Celebration Cakes",
          "نوع التصنيف (finished/raw/packaging)": "finished",
          "الوصف والبيان": "تورتات أعياد الميلاد والشوكولاتة المخصصة",
        },
        {
          "كود التصنيف": "CAT-GEL",
          "الاسم بالعربية": "الآيس كريم والجيلاتي",
          "الاسم بالإنجليزية": "Gelato & Ice Cream",
          "نوع التصنيف (finished/raw/packaging)": "finished",
          "الوصف والبيان": "جيلاتي طبيعي بالفواكه والمكسرات",
        },
      ];
      filename = "categories_template.xlsx";
      sheetName = "تصنيفات_Categories";
    } else if (activeTab === "warehouses") {
      headers = [
        {
          "كود المستودع": "WH-NASR",
          "الاسم بالعربية": "فرع مدينة نصر — سيتي ستارز",
          "الاسم بالإنجليزية": "Nasr City Branch",
          "النوع (kitchen/retail/cold_storage)": "retail",
          "العنوان": "شارع عباس العقاد، مدينة نصر",
          "اسم المسؤول": "طارق عبد الحميد",
          "رقم الهاتف": "+20 102 334 5566",
          "نسبة الاستيعاب %": 70,
        },
      ];
      filename = "warehouses_template.xlsx";
      sheetName = "فروع_Warehouses";
    } else if (activeTab === "units") {
      headers = [
        {
          "كود الوحدة": "BAG-25",
          "الاسم بالعربية": "شيكارة 25 كجم",
          "الاسم بالإنجليزية": "Sack 25kg",
          "نوع القياس (count/weight/volume/packaging)": "weight",
          "معامل التحويل": 25,
          "كود الوحدة الأساسية": "KG",
        },
        {
          "كود الوحدة": "DOZ",
          "الاسم بالعربية": "دستة (12 قطعة)",
          "الاسم بالإنجليزية": "Dozen",
          "نوع القياس (count/weight/volume/packaging)": "count",
          "معامل التحويل": 12,
          "كود الوحدة الأساسية": "PCS",
        },
      ];
      filename = "units_template.xlsx";
      sheetName = "وحدات_Units";
    } else if (activeTab === "bom") {
      headers = [
        {
          "كود الوصفة": "BOM-LOTUS",
          "اسم الوصفة بالعربية": "وصفة كيك سان سيباستيان لوتس",
          "اسم الوصفة بالإنجليزية": "San Sebastian Lotus Recipe",
          "كود المنتج النهائي": "SAN-LOTUS",
          "الإنتاجية بالوجبة": 10,
          "كود وحدة الإنتاج": "PORTION",
          "المصاريف الإضافية (تشغيل وطاقة)": 120,
          "ملاحظات التصنيع": "خبز على حرارة 220 درجة لمدة 28 دقيقة",
        },
      ];
      filename = "recipes_bom_template.xlsx";
      sheetName = "وصفات_BOM";
    }

    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const success = safeDownloadWorkbook(wb, filename);
    if (success) {
      setDownloadNotice(
        pick(`تم تنزيل نموذج الإكسيل بنجاح: ${filename}`, `Downloaded blank template: ${filename}`)
      );
      setTimeout(() => setDownloadNotice(null), 5000);
    }
  };

  // Handle uploaded Excel / CSV file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });

        // Auto-detect Wazeer El-Helw Factory 2026 sheet structure
        if (activeTab === "products" && wb.Sheets["الأصناف والمنتجات"]) {
          const s1 = wb.Sheets["الأصناف والمنتجات"];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(s1, { header: 1, defval: "" });
          const items: any[] = [];
          for (let r = 3; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!row || !row[1] || !row[2]) continue;
            const code = String(row[2]).trim();
            const name = String(row[1]).trim();
            const unit = String(row[4] || "كيلو").trim();
            const cost = typeof row[3] === "number" ? row[3] : 0;
            const type = String(row[5] || "").trim();
            const dept = String(row[8] || "المخزن").trim();
            items.push({
              "كود الصنف (SKU)": `SKU-${code}`,
              "اسم الصنف بالعربية": name,
              "اسم الصنف بالإنجليزية": name,
              "كود التصنيف": dept.includes("أسبونش") ? "CAT-SPONGE" : dept.includes("الألبان") ? "CAT-DAIRY" : type.includes("منتج تام") ? "CAT-FINISHED" : "CAT-RAW",
              "كود المستودع": dept.includes("أسبونش") ? "WH-SPONGE" : dept.includes("الألبان") ? "WH-DAIRY" : "WH-RAW-STORE",
              "كود وحدة القياس": unit.includes("كيلو") ? "KG" : unit.includes("جرام") ? "G" : unit.includes("صاج") ? "SAJ" : unit.includes("عبوة") ? "BOX" : unit.includes("جار") ? "JAR" : "PCS",
              "سعر التكلفة": cost,
              "سعر البيع": cost > 0 ? Math.round(cost * 1.6) : 0,
              "الرصيد الافتتاحي": 100,
              "حد إعادة الطلب": 20,
              "مادة خام (نعم/لا)": type.includes("مشتراه") ? "نعم" : "لا",
              "القسم": dept,
            });
          }
          if (items.length > 0) {
            setParsedRows(items);
            return;
          }
        }

        const wsName = wb.SheetNames[0];
        if (!wsName) {
          setFileError("الملف فارغ أو لا يحتوي على أوراق عمل صالحة.");
          return;
        }
        const ws = wb.Sheets[wsName];
        if (!ws) {
          setFileError("تعذر قراءة محتوى ورقة العمل.");
          return;
        }
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!data || data.length === 0) {
          setFileError("لم يتم العثور على صفوف بيانات صالحة داخل الملف.");
          return;
        }
        setParsedRows(data);
      } catch (err: any) {
        console.error(err);
        setFileError("حدث خطأ أثناء قراءة ملف الإكسيل. تأكد من سلامة التنسيق.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Apply Curated Preset
  const handleApplyPreset = (preset: (typeof READY_PRESETS.products)[0]) => {
    if (activeTab === "products") {
      onImportProducts(preset.items as any);
    } else if (activeTab === "categories") {
      onImportCategories(preset.items as any);
    } else if (activeTab === "warehouses") {
      onImportWarehouses(preset.items as any);
    } else if (activeTab === "units") {
      onImportUnits(preset.items as any);
    } else if (activeTab === "bom") {
      onImportBoms(preset.items as any);
    }
    onClose();
  };

  // Finalize Excel Uploaded Import
  const handleConfirmExcelImport = () => {
    if (parsedRows.length === 0) return;

    if (activeTab === "products") {
      const items: Omit<InventoryProduct, "id">[] = parsedRows.map((r, i) => {
        const sku = String(r["كود الصنف (SKU)"] || r["SKU"] || r["sku"] || `SKU-${Date.now()}-${i}`).trim();
        const ar = String(r["اسم الصنف بالعربية"] || r["اسم الصنف"] || r["name_ar"] || sku).trim();
        const en = String(r["اسم الصنف بالإنجليزية"] || r["Name En"] || r["name_en"] || sku).trim();
        const catCode = String(r["كود التصنيف"] || r["Category"] || "").trim();
        const whCode = String(r["كود المستودع"] || r["Warehouse"] || "").trim();
        const unitCode = String(r["كود وحدة القياس"] || r["Unit"] || "").trim();

        const cat = categories.find((c) => c.code === catCode || c.id === catCode) || categories[0];
        const wh = warehouses.find((w) => w.code === whCode || w.id === whCode) || warehouses[0];
        const un = units.find((u) => u.code === unitCode || u.id === unitCode) || units[0];

        const cost = Number(r["سعر التكلفة"] || r["Cost"] || 0) || 10;
        const sell = Number(r["سعر البيع"] || r["Price"] || 0) || Math.round(cost * 1.8);
        const qty = Number(r["الرصيد الافتتاحي"] || r["Qty"] || 0) || 50;
        const minStock = Number(r["حد إعادة الطلب"] || r["Min"] || 0) || 15;
        const isRaw = String(r["مادة خام (نعم/لا)"] || r["isRaw"] || "").includes("نعم");

        return {
          sku,
          name: { ar, en },
          categoryId: cat?.id || "cat-1",
          warehouseId: wh?.id || "wh-1",
          unitId: un?.id || "u-1",
          costPrice: cost,
          sellingPrice: sell,
          qty,
          minStock,
          isRawMaterial: isRaw,
        };
      });

      onImportProducts(items);
    } else if (activeTab === "categories") {
      const items: Omit<InventoryCategory, "id">[] = parsedRows.map((r, i) => {
        const code = String(r["كود التصنيف"] || r["Code"] || `CAT-${Date.now()}-${i}`).trim();
        const ar = String(r["الاسم بالعربية"] || r["اسم التصنيف"] || code).trim();
        const en = String(r["الاسم بالإنجليزية"] || code).trim();
        const typeRaw = String(r["نوع التصنيف (finished/raw/packaging)"] || r["Type"] || "finished").trim();
        const type = (["finished", "raw", "packaging", "semi_finished"].includes(typeRaw)
          ? typeRaw
          : "finished") as any;
        const desc = String(r["الوصف والبيان"] || r["Description"] || "").trim();

        return {
          code,
          name: { ar, en },
          type,
          description: { ar: desc || ar, en: desc || en },
        };
      });

      onImportCategories(items);
    } else if (activeTab === "warehouses") {
      const items: Omit<InventoryWarehouse, "id">[] = parsedRows.map((r, i) => {
        const code = String(r["كود المستودع"] || r["Code"] || `WH-${Date.now()}-${i}`).trim();
        const ar = String(r["الاسم بالعربية"] || code).trim();
        const en = String(r["الاسم بالإنجليزية"] || code).trim();
        const type = "retail" as const;
        const address = String(r["العنوان"] || "").trim();
        const manager = String(r["اسم المسؤول"] || "").trim();
        const phone = String(r["رقم الهاتف"] || "").trim();
        const cap = Number(r["نسبة الاستيعاب %"] || 60);

        return {
          code,
          name: { ar, en },
          type,
          address: { ar: address || ar, en: address || en },
          managerName: manager || "غير محدد",
          phone: phone || "N/A",
          capacityPercent: cap,
          status: "active" as const,
        };
      });

      onImportWarehouses(items);
    } else if (activeTab === "units") {
      const items: Omit<InventoryUnit, "id">[] = parsedRows.map((r, i) => {
        const code = String(r["كود الوحدة"] || r["Code"] || `U-${Date.now()}-${i}`).trim();
        const ar = String(r["الاسم بالعربية"] || code).trim();
        const en = String(r["الاسم بالإنجليزية"] || code).trim();
        const cat = "count" as const;
        const factor = Number(r["معامل التحويل"] || 1);
        const base = String(r["كود الوحدة الأساسية"] || "PCS").trim();

        return {
          code,
          name: { ar, en },
          category: cat,
          isBaseUnit: factor === 1,
          baseUnitCode: base,
          conversionFactor: factor,
        };
      });

      onImportUnits(items);
    } else if (activeTab === "bom") {
      const items: Omit<InventoryBom, "id">[] = parsedRows.map((r, i) => {
        const code = String(r["كود الوصفة"] || `BOM-${Date.now()}-${i}`).trim();
        const ar = String(r["اسم الوصفة بالعربية"] || code).trim();
        const en = String(r["اسم الوصفة بالإنجليزية"] || code).trim();
        const targetProdCode = String(r["كود المنتج النهائي"] || "").trim();
        const targetProd = products.find((p) => p.sku === targetProdCode || p.id === targetProdCode) || products[0];

        return {
          code,
          name: { ar, en },
          finishedProductId: targetProd?.id || "p-1",
          outputYield: Number(r["الإنتاجية بالوجبة"] || 10),
          outputUnitId: "u-1",
          overheadCost: Number(r["المصاريف الإضافية"] || 100),
          status: "active" as const,
          components: [
            { componentProductId: "rm-1", quantity: 2, unitId: "u-6", unitCost: 38, totalCost: 76 },
            { componentProductId: "rm-7", quantity: 1, unitId: "u-4", unitCost: 35, totalCost: 35 },
          ],
        };
      });

      onImportBoms(items);
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-6"
        dir={dir}
      >
        <DialogHeader>
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0 shadow-xs">
                <FileSpreadsheet className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-foreground">
                  {pick(
                    "استيراد بيانات من قوالب جاهزة وملفات Excel",
                    "Import Inventory Data from Ready-Made Templates"
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pick(
                    "إضافة أصناف، تصنيفات، فروع، وحدات، أو وصفات إنتاج من قوالب مسبقة أو إكسيل",
                    "Bulk import stock, categories, facilities, units, or BOM recipes seamlessly"
                  )}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Target Tabs (Products, Categories, Warehouses, Units, BOM) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/60 border border-border/80 overflow-x-auto text-xs">
            {targetTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSwitchTarget(tab.id as any)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer",
                    isActive
                      ? "bg-card text-foreground shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("size-3.5", isActive ? "text-primary" : "")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Download Notification Toast / Alert */}
          {downloadNotice && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <span>{downloadNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setDownloadNotice(null)}
                className="p-1 hover:bg-emerald-500/20 rounded cursor-pointer text-emerald-700 dark:text-emerald-300"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Official Wazeer Factory 2026 Master Download Banner */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <FileSpreadsheet className="size-5" />
              </div>
              <div>
                <span className="font-bold text-foreground text-xs block">
                  {pick(
                    "شيت مصنع وزير الحلو 2026 المعتمد (Excel الأصلي الكامل)",
                    "Official Wazeer El-Helw 2026 Factory Master Sheet"
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {pick(
                    "ملف Excel يضم 3 أوراق عمل: كتالوج الـ 109 صنف، شجرة الـ 55 وصفة ريسبي، وجداول تكاليف الإنتاج",
                    "Complete 3-sheet factory workbook: 109 items, 55 BOM recipes, & production cost rollups"
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadOfficialExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Download className="size-3.5" />
                <span>
                  {pick("تنزيل شيت المصنع الأصلي (.xlsx)", "Download Master Factory (.xlsx)")}
                </span>
              </button>
            </div>
          </div>

          {/* Import Mode Switcher: Ready Presets vs Excel File Upload */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setImportMode("preset")}
              className={cn(
                "p-3 rounded-xl border text-start flex items-center gap-3 transition-all cursor-pointer",
                importMode === "preset"
                  ? "border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/40 text-foreground"
                  : "border-border/80 bg-card hover:bg-secondary/40 text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center shrink-0",
                  importMode === "preset" ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}
              >
                <Sparkles className="size-4" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-xs">
                  {pick("قوالب صناعية معتمدة جاهزة", "Ready-Made Industry Templates")}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {pick("بيانات حلويات ومخابز متكاملة بنقرة واحدة", "One-click pre-built confection data")}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setImportMode("excel")}
              className={cn(
                "p-3 rounded-xl border text-start flex items-center gap-3 transition-all cursor-pointer",
                importMode === "excel"
                  ? "border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/40 text-foreground"
                  : "border-border/80 bg-card hover:bg-secondary/40 text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center shrink-0",
                  importMode === "excel" ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}
              >
                <Upload className="size-4" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-xs">
                  {pick("رفع ملف Excel / CSV وتنزيل النموذج", "Upload Excel / Download Blank")}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {pick("استيراد شيت مخصص من جهازك مع معاينة", "Custom spreadsheet import with preview")}
                </p>
              </div>
            </button>
          </div>

          {/* MODE 1: Ready-Made Industry Presets */}
          {importMode === "preset" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {pick("اختر القالب الجاهز المراد تطبيقه واستيراده:", "Select Ready Template to Import:")}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {currentPresets.length} {pick("قالب متاح", "templates")}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-1">
                {currentPresets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={cn(
                        "rounded-xl border p-4 transition-all bg-card shadow-2xs space-y-3",
                        isSelected
                          ? "border-primary ring-1 ring-primary/50 bg-primary/5"
                          : "border-border/80 hover:border-primary/50"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <Layers className="size-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-foreground">
                              {pick(preset.title.ar, preset.title.en)}
                            </h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {pick(preset.description.ar, preset.description.en)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => setSelectedPresetId(isSelected ? "" : preset.id)}
                            className="px-2.5 py-1 rounded-lg border border-border text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer text-foreground"
                          >
                            {isSelected ? pick("إخفاء المعاينة", "Hide Preview") : pick("معاينة البنود", "Preview Items")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPresetExcel(preset)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title={pick(
                              "تنزيل هذا القالب كملف Excel (.xlsx) كامل على جهازك",
                              "Download this preset as an Excel (.xlsx) file"
                            )}
                          >
                            <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{pick("تنزيل كـ Excel", "Download .xlsx")}</span>
                          </button>
                          <Btn
                            variant="solid"
                            size="sm"
                            onClick={() => handleApplyPreset(preset as any)}
                            className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="size-3.5" />
                            <span>
                              {pick(
                                `استيراد القالب فوراً (${preset.items.length})`,
                                `Import Pack (${preset.items.length})`
                              )}
                            </span>
                          </Btn>
                        </div>
                      </div>

                      {/* Expanded Preview of items in preset */}
                      {isSelected && (
                        <div className="pt-2 border-t border-border/60">
                          <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background/60 p-1 text-xs">
                            <table className="w-full text-start text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-border/80 text-[10px] text-muted-foreground bg-secondary/50 font-bold">
                                  <th className="p-2 text-start">{pick("الكود", "Code/SKU")}</th>
                                  <th className="p-2 text-start">{pick("الاسم بالعربية", "Arabic Name")}</th>
                                  <th className="p-2 text-start">{pick("الاسم بالإنجليزية", "English Name")}</th>
                                  {activeTab === "products" && (
                                    <>
                                      <th className="p-2 text-end">{pick("التكلفة", "Cost")}</th>
                                      <th className="p-2 text-end">{pick("البيع", "Price")}</th>
                                      <th className="p-2 text-end">{pick("الرصيد", "Stock")}</th>
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                                {preset.items.map((it: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-secondary/30">
                                    <td className="p-2 font-bold text-primary">{it.sku || it.code}</td>
                                    <td className="p-2 font-sans font-medium text-foreground">{it.name?.ar}</td>
                                    <td className="p-2 font-sans text-muted-foreground">{it.name?.en}</td>
                                    {activeTab === "products" && (
                                      <>
                                        <td className="p-2 text-end">{money(it.costPrice)}</td>
                                        <td className="p-2 text-end text-emerald-600 font-bold">
                                          {money(it.sellingPrice)}
                                        </td>
                                        <td className="p-2 text-end text-foreground font-bold">{n(it.qty)}</td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE 2: Custom Excel / CSV File Upload */}
          {importMode === "excel" && (
            <div className="space-y-3.5">
              {/* Download Sample Template & Master Factory Cards */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <FileSpreadsheet className="size-4" />
                    </div>
                    <div>
                      <span className="font-bold text-foreground text-xs block">
                        {pick(
                          "تحميل نموذج Excel فارغ مجهز للتعبئة",
                          "Download Official Blank Excel Spreadsheet"
                        )}
                      </span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        {pick(
                          "يحتوي الملف على الأعمدة والمسميات المطابقة للنظام لتسهيل الإدخال السريع",
                          "Pre-formatted with expected columns and sample guidance"
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-secondary text-xs font-bold transition-all shadow-xs cursor-pointer w-full"
                  >
                    <Download className="size-3.5 text-primary" />
                    <span>{pick("تحميل ملف النموذج الفارغ (.xlsx)", "Download Blank Template (.xlsx)")}</span>
                  </button>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Download className="size-4" />
                    </div>
                    <div>
                      <span className="font-bold text-foreground text-xs block">
                        {pick(
                          "شيت مصنع وزير الحلو 2026 الأصلي المعتمد",
                          "Wazeer El-Helw 2026 Factory Master File"
                        )}
                      </span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        {pick(
                          "ملف الإكسيل الأصلي الكامل (109 صنف، 55 ريسبي، وتكاليف الإنتاج)",
                          "Authentic master workbook with 3 full sheets"
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadOfficialExcel}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer w-full"
                  >
                    <Download className="size-3.5" />
                    <span>{pick("تحميل شيت المصنع الأصلي (.xlsx)", "Download Master Factory (.xlsx)")}</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />

              {parsedRows.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-card p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <div className="size-12 rounded-full bg-secondary group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors mb-2">
                    <Upload className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {pick("انقر لاختيار ملف الإكسيل أو اسحبه هنا", "Click to select Excel/CSV file or drag & drop")}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {pick(
                      "يدعم صيغ .xlsx و .xls و .csv (حتى 5000 سجل دفعة واحدة)",
                      "Supports .xlsx, .xls, and .csv files (up to 5,000 rows)"
                    )}
                  </p>

                  {fileError && (
                    <div className="mt-3 flex items-center gap-1.5 text-rose-500 text-xs font-bold bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="size-5" />
                      </div>
                      <div>
                        <span className="font-bold text-foreground text-xs block">
                          {pick("تم قراءة الملف وتجهيز السجلات للاستيراد", "File read successfully")}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {fileName} • {parsedRows.length} {pick("سجل تم رصده", "rows found")}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setParsedRows([]);
                        setFileName("");
                      }}
                      className="px-2.5 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {pick("تغيير الملف", "Change File")}
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="rounded-xl border border-border overflow-hidden bg-card">
                    <div className="p-2.5 bg-secondary/40 border-b border-border text-xs font-bold text-foreground flex items-center justify-between">
                      <span>{pick("معاينة أولية للسجلات:", "Previewing Records:")}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {pick("عرض أول 5 صفوف", "Showing first 5 rows")}
                      </span>
                    </div>
                    <div className="max-h-48 overflow-x-auto text-xs">
                      <table className="w-full text-start border-collapse">
                        <thead>
                          <tr className="border-b border-border text-[10px] text-muted-foreground bg-secondary/50 font-bold">
                            {Object.keys(parsedRows[0] || {}).map((col) => (
                              <th key={col} className="p-2 text-start whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                          {parsedRows.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-secondary/30">
                              {Object.values(row).map((val: any, cIdx) => (
                                <td key={cIdx} className="p-2 whitespace-nowrap max-w-[180px] truncate">
                                  {String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Btn
                      variant="solid"
                      onClick={handleConfirmExcelImport}
                      className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="size-4" />
                      <span>
                        {pick(
                          `تأكيد استيراد وحفظ (${parsedRows.length}) سجل في المنظومة`,
                          `Confirm Import of (${parsedRows.length}) Records`
                        )}
                      </span>
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
            <span className="text-muted-foreground text-[11px]">
              {pick(
                "💡 سيتم إدراج الأصناف مع التحقق التلقائي من عدم تكرار الأكواد",
                "💡 Unique codes will be verified automatically"
              )}
            </span>
            <Btn variant="outline" onClick={onClose}>
              {t("close")}
            </Btn>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
