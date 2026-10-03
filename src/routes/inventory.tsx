import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Package,
  Tag,
  Building2,
  Scale,
  ChefHat,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowUpRight,
  FileSpreadsheet,
  Store,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, KpiCard, Btn } from "@/components/kit";
import { cn } from "@/lib/utils";
import { useInventoryStore } from "@/lib/inventory-store";
import { ProductsTab } from "@/components/inventory/ProductsTab";
import { CategoriesTab } from "@/components/inventory/CategoriesTab";
import { WarehousesTab } from "@/components/inventory/WarehousesTab";
import { BranchesTab } from "@/components/inventory/BranchesTab";
import { UnitsTab } from "@/components/inventory/UnitsTab";
import { BomTab } from "@/components/inventory/BomTab";
import {
  InventoryImportModal,
  type InventoryImportTarget,
} from "@/components/inventory/InventoryImportModal";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory & Manufacturing (BOM) — Wazeer El-Helw ERP" },
      {
        name: "description",
        content:
          "Manage confectionery products, categories, branches & warehouses, units of measure, and BOM manufacturing recipes.",
      },
      {
        property: "og:title",
        content: "Inventory & Manufacturing (BOM) — Wazeer El-Helw ERP",
      },
      {
        property: "og:description",
        content:
          "End-to-end inventory control, branch facilities, units, and sweet confectionery recipes.",
      },
    ],
  }),
  component: InventoryPage,
});

type InventorySubTab = "products" | "categories" | "warehouses" | "branches" | "units" | "bom";

function InventoryPage() {
  const { t, pick, money, n, dir } = useI18n();
  const [activeTab, setActiveTab] = useState<InventorySubTab>("products");

  const {
    products,
    categories,
    warehouses,
    branches,
    units,
    boms,
    addProduct,
    updateProduct,
    deleteProduct,
    importProducts,
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
    addBom,
    updateBom,
    deleteBom,
    importBoms,
    resetToSeed,
  } = useInventoryStore();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<InventoryImportTarget>("products");

  const handleOpenImport = (target: InventoryImportTarget) => {
    setImportTarget(target);
    setIsImportModalOpen(true);
  };

  // Inventory KPI calculations
  const totalValuation = useMemo(() => {
    return products.reduce((sum, p) => sum + p.qty * p.costPrice, 0);
  }, [products]);

  const finishedProductsCount = useMemo(() => {
    return products.filter((p) => !p.isRawMaterial).length;
  }, [products]);

  const rawMaterialsCount = useMemo(() => {
    return products.filter((p) => p.isRawMaterial).length;
  }, [products]);

  const lowStockItems = useMemo(() => {
    return products.filter((p) => p.qty < p.minStock);
  }, [products]);

  // Tab definitions
  const tabs: {
    id: InventorySubTab;
    label: { ar: string; en: string };
    icon: any;
    badge?: number;
  }[] = [
    {
      id: "products",
      label: { ar: "المنتجات والأصناف", en: "Products & Stock" },
      icon: Package,
      badge: products.length,
    },
    {
      id: "categories",
      label: { ar: "تصنيفات الأصناف", en: "Categories" },
      icon: Tag,
      badge: categories.length,
    },
    {
      id: "warehouses",
      label: { ar: "المستودعات والمخازن", en: "Warehouses" },
      icon: Building2,
      badge: warehouses.length,
    },
    {
      id: "branches",
      label: { ar: "الفروع وتفاصيل الملكية", en: "Branches & Ownership" },
      icon: Store,
      badge: branches.length,
    },
    {
      id: "units",
      label: { ar: "وحدات القياس", en: "Units of Measure" },
      icon: Scale,
      badge: units.length,
    },
    {
      id: "bom",
      label: { ar: "شجرة المنتج والوصفات (BOM)", en: "Bill of Materials (BOM)" },
      icon: ChefHat,
      badge: boms.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={pick({
            ar: "إدارة المخزون والتصنيع (BOM)",
            en: "Inventory & Production (BOM)",
          })}
          subtitle={pick({
            ar: "المنتجات، التصنيفات، المستودعات، وحدات القياس، وشجرة مكونات الحلويات",
            en: "Products, categories, facilities, units of measure, and sweet confectionery recipes",
          })}
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab !== "branches" && (
            <Btn
              variant="outline"
              size="sm"
              onClick={() => handleOpenImport(activeTab as InventoryImportTarget)}
              className="gap-1.5 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {pick(
                  "استيراد من قالب جاهز / Excel",
                  "Import from Ready Template / Excel"
                )}
              </span>
            </Btn>
          )}

          <Btn
            variant="outline"
            size="sm"
            onClick={resetToSeed}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title={pick({
              ar: "مزامنة وتحديث البيانات من قاعدة البيانات المباشرة",
              en: "Sync live data from database",
            })}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{pick({ ar: "تحديث قاعدة البيانات", en: "Sync Database" })}</span>
          </Btn>
        </div>
      </div>

      {/* Global Inventory KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-5">
        {/* Total Stock Value */}
        <div className="surface-panel rounded-xl p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            {pick({ ar: "قيمة المخزون (بالتكلفة)", en: "Total Stock Valuation" })}
          </span>
          <div className="text-lg font-mono font-bold text-foreground">
            {money(totalValuation)}
          </div>
          <span className="text-[10px] text-muted-foreground block">
            {n(products.reduce((sum, p) => sum + p.qty, 0))}{" "}
            {pick({ ar: "قطعة / وحدة إجمالاً", en: "total units in stock" })}
          </span>
        </div>

        {/* Branch Products */}
        <div className="surface-panel rounded-xl p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            {pick({ ar: "منتجات الفروع (Branch Products)", en: "Branch Products" })}
          </span>
          <div className="text-lg font-mono font-bold text-primary">
            {n(finishedProductsCount)}
          </div>
          <span className="text-[10px] text-muted-foreground block">
            {pick({ ar: "أصناف جاهزة للبيع المباشر بالفروع", en: "Ready for retail sale at branches" })}
          </span>
        </div>

        {/* Factory Products */}
        <div className="surface-panel rounded-xl p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            {pick({ ar: "منتجات المصنع (Factory Products)", en: "Factory Products" })}
          </span>
          <div className="text-lg font-mono font-bold text-foreground">
            {n(rawMaterialsCount)}
          </div>
          <span className="text-[10px] text-muted-foreground block">
            {pick({ ar: "خامات وتصنيع المطبخ المركزي", en: "Factory & central kitchen supplies" })}
          </span>
        </div>

        {/* Low Stock Warning */}
        <div
          className={cn(
            "surface-panel rounded-xl p-4 shadow-sm space-y-1",
            lowStockItems.length > 0
              ? "bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/20"
              : ""
          )}
        >
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            {lowStockItems.length > 0 && (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            )}
            <span>{pick({ ar: "نواقص المخزون", en: "Low Stock Items" })}</span>
          </span>
          <div
            className={cn(
              "text-lg font-mono font-bold",
              lowStockItems.length > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground"
            )}
          >
            {n(lowStockItems.length)}
          </div>
          <span className="text-[10px] text-muted-foreground block">
            {lowStockItems.length > 0
              ? pick({ ar: "تحت الحد الأدنى للطلب", en: "below reorder threshold" })
              : pick({ ar: "جميع الأرصدة كافية", en: "all stocks healthy" })}
          </span>
        </div>

        {/* Active BOM Recipes */}
        <div className="surface-panel rounded-xl p-4 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            {pick({ ar: "وصفات التصنيع (BOM)", en: "Active BOM Recipes" })}
          </span>
          <div className="text-lg font-mono font-bold text-primary">
            {n(boms.length)}
          </div>
          <span className="text-[10px] text-muted-foreground block">
            {n(warehouses.length)}{" "}
            {pick({ ar: "فروع ومطابخ مركزية", en: "operating facilities" })}
          </span>
        </div>
      </div>

      {/* Sub-module Tabs Strip */}
      <div className="surface-panel rounded-xl p-1.5 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                <span>{pick(tab.label)}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 text-[10px] rounded-full font-mono font-medium",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {n(tab.badge)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === "products" && (
          <ProductsTab
            products={products}
            categories={categories}
            warehouses={warehouses}
            branches={branches}
            units={units}
            boms={boms}
            onAddProduct={addProduct}
            onUpdateProduct={updateProduct}
            onDeleteProduct={deleteProduct}
            onOpenImport={() => handleOpenImport("products")}
          />
        )}

        {activeTab === "categories" && (
          <CategoriesTab
            categories={categories}
            products={products}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
            onOpenImport={() => handleOpenImport("categories")}
          />
        )}

        {activeTab === "warehouses" && (
          <WarehousesTab
            warehouses={warehouses}
            products={products}
            onAddWarehouse={addWarehouse}
            onUpdateWarehouse={updateWarehouse}
            onDeleteWarehouse={deleteWarehouse}
            onOpenImport={() => handleOpenImport("warehouses")}
          />
        )}

        {activeTab === "branches" && (
          <BranchesTab
            branches={branches}
            onRefresh={resetToSeed}
          />
        )}

        {activeTab === "units" && (
          <UnitsTab
            units={units}
            products={products}
            onAddUnit={addUnit}
            onUpdateUnit={updateUnit}
            onDeleteUnit={deleteUnit}
            onOpenImport={() => handleOpenImport("units")}
          />
        )}

        {activeTab === "bom" && (
          <BomTab
            boms={boms}
            products={products}
            units={units}
            warehouses={warehouses}
            onAddBom={addBom}
            onUpdateBom={updateBom}
            onDeleteBom={deleteBom}
            onOpenImport={() => handleOpenImport("bom")}
          />
        )}
      </div>

      {/* Bulk Import from Ready-Made Templates / Excel Modal */}
      <InventoryImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialTarget={importTarget}
        categories={categories}
        warehouses={warehouses}
        units={units}
        products={products}
        onImportProducts={importProducts}
        onImportCategories={importCategories}
        onImportWarehouses={importWarehouses}
        onImportUnits={importUnits}
        onImportBoms={importBoms}
      />
    </div>
  );
}
