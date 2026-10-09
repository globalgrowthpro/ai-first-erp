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
  ArrowLeftRight,
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
import { StockMovementsTab } from "@/components/inventory/StockMovementsTab";
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

type InventorySubTab = "products" | "categories" | "warehouses" | "branches" | "units" | "bom" | "stock_movements";

function InventoryPage() {
  const { t, pick, money, n, dir } = useI18n();
  const [activeTab, setActiveTab] = useState<InventorySubTab>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (
        p === "stock_movements" ||
        p === "movements" ||
        p === "products" ||
        p === "categories" ||
        p === "warehouses" ||
        p === "branches" ||
        p === "units" ||
        p === "bom"
      ) {
        return p === "movements" ? "stock_movements" : (p as InventorySubTab);
      }
    }
    return "products";
  });

  const handleTabChange = (tabId: InventorySubTab) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const {
    products,
    categories,
    warehouses,
    branches,
    units,
    boms,
    stockMoves,
    recordStockMove,
    refreshStockMoves,
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
      id: "stock_movements",
      label: { ar: "حركات المخزون وسجل التحويلات", en: "Stock Movements & Ledger" },
      icon: ArrowLeftRight,
      badge: stockMoves.length,
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
      id: "categories",
      label: { ar: "تصنيفات الأصناف", en: "Categories" },
      icon: Tag,
      badge: categories.length,
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
            ar: "المنتجات، حركات المخزون، المستودعات، وحدات القياس، وشجرة مكونات الحلويات",
            en: "Products, stock movements, facilities, units of measure, and sweet confectionery recipes",
          })}
        />

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Quick Tab Jump to Stock Movements */}
          <Btn
            variant={activeTab === "stock_movements" ? "solid" : "outline"}
            size="sm"
            onClick={() => handleTabChange("stock_movements")}
            className={cn(
              "gap-1.5 text-xs font-bold shadow-xs cursor-pointer",
              activeTab === "stock_movements"
                ? "bg-primary text-primary-foreground"
                : "border-primary/40 text-primary hover:bg-primary/10"
            )}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{pick({ ar: "حركات المخزون", en: "Stock Movements" })}</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-primary/20 text-foreground font-mono">
              {n(stockMoves.length)}
            </span>
          </Btn>

          {activeTab !== "branches" && activeTab !== "stock_movements" && (
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
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
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

        {/* Stock Movements Card (Clickable to switch tab) */}
        <button
          type="button"
          onClick={() => handleTabChange("stock_movements")}
          className={cn(
            "surface-panel rounded-xl p-4 shadow-sm space-y-1 text-start transition-all cursor-pointer border",
            activeTab === "stock_movements"
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
          )}
        >
          <span className="text-[11px] font-semibold text-primary flex items-center justify-between">
            <span>{pick({ ar: "حركات المخزون", en: "Stock Movements" })}</span>
            <ArrowLeftRight className="w-3.5 h-3.5 text-primary shrink-0" />
          </span>
          <div className="text-lg font-mono font-bold text-foreground">
            {n(stockMoves.length)}
          </div>
          <span className="text-[10px] text-muted-foreground block">
            {pick({ ar: "انقر لفتح سجل التحويلات والأذون", en: "Click to open movement ledger" })}
          </span>
        </button>

        {/* Branch Products */}
        <div className="surface-panel rounded-xl p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            {pick({ ar: "منتجات الفروع", en: "Branch Products" })}
          </span>
          <div className="text-lg font-mono font-bold text-primary">
            {n(finishedProductsCount)}
          </div>
          <span className="text-[10px] text-muted-foreground block">
            {pick({ ar: "أصناف جاهزة للبيع المباشر", en: "Ready for retail sale" })}
          </span>
        </div>

        {/* Factory Products */}
        <div className="surface-panel rounded-xl p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            {pick({ ar: "منتجات المصنع", en: "Factory Products" })}
          </span>
          <div className="text-lg font-mono font-bold text-foreground">
            {n(rawMaterialsCount)}
          </div>
          <span className="text-[10px] text-muted-foreground block">
            {pick({ ar: "خامات وتصنيع المطبخ المركزي", en: "Factory & kitchen supplies" })}
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
        <div className="surface-panel rounded-xl p-4 shadow-sm space-y-1">
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

      {/* Sub-module Tabs Strip - Wrapped & Highly Visible */}
      <div className="surface-panel rounded-2xl p-2 shadow-sm border border-border/60">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isStockMove = tab.id === "stock_movements";
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isStockMove
                    ? "text-primary hover:bg-primary/10 border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
              >
                <tab.icon className={cn("w-4 h-4 shrink-0", isStockMove && !isActive && "text-primary")} />
                <span>{pick(tab.label)}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] rounded-full font-mono font-medium",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : isStockMove
                        ? "bg-primary/15 text-primary"
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

        {activeTab === "stock_movements" && (
          <StockMovementsTab
            movements={stockMoves}
            products={products}
            warehouses={warehouses}
            onRecordMove={recordStockMove}
            onRefresh={refreshStockMoves}
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
