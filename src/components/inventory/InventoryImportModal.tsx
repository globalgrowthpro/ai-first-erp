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

  // Generate and download sample Excel Template
  const handleDownloadExcelTemplate = () => {
    let headers: Record<string, any>[] = [];
    let filename = "";

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
        },
      ];
      filename = "products_template.xlsx";
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
    }

    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_قالب_جاهز");
    XLSX.writeFile(wb, filename);
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

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => setSelectedPresetId(isSelected ? "" : preset.id)}
                            className="px-2.5 py-1 rounded-lg border border-border text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer text-foreground"
                          >
                            {isSelected ? pick("إخفاء المعاينة", "Hide Preview") : pick("معاينة البنود", "Preview Items")}
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
              {/* Download Sample Template Banner */}
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="size-4" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground text-xs block">
                      {pick(
                        "تحميل نموذج Excel فارغ معتمد ومجهز للتعبئة",
                        "Download Official Blank Excel Spreadsheet"
                      )}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="size-3.5 text-primary" />
                  <span>{pick("تحميل ملف النموذج (.xlsx)", "Download Template (.xlsx)")}</span>
                </button>
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
