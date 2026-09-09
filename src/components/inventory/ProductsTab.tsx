import { useState, useMemo } from "react";
import {
  Search,
  X,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Boxes,
  ArrowUpDown,
  Check,
  Package,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { DataTable, Td, Btn } from "@/components/kit";
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
} from "@/lib/inventory-store";

interface ProductsTabProps {
  products: InventoryProduct[];
  categories: InventoryCategory[];
  warehouses: InventoryWarehouse[];
  units: InventoryUnit[];
  onAddProduct: (prod: Omit<InventoryProduct, "id">) => void;
  onUpdateProduct: (id: string, updates: Partial<InventoryProduct>) => void;
  onDeleteProduct: (id: string) => void;
}

export function ProductsTab({
  products,
  categories,
  warehouses,
  units,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: ProductsTabProps) {
  const { t, pick, money, n, dir } = useI18n();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<InventoryProduct | null>(null);

  // Form states
  const [sku, setSku] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [qty, setQty] = useState(0);
  const [minStock, setMinStock] = useState(10);
  const [isRawMaterial, setIsRawMaterial] = useState(false);

  const openAddModal = () => {
    setEditingProduct(null);
    setSku(`PROD-${Math.floor(1000 + Math.random() * 9000)}`);
    setNameAr("");
    setNameEn("");
    setCategoryId(categories[0]?.id || "");
    setWarehouseId(warehouses[0]?.id || "");
    setUnitId(units[0]?.id || "");
    setCostPrice(30);
    setSellingPrice(60);
    setQty(50);
    setMinStock(15);
    setIsRawMaterial(false);
    setIsFormModalOpen(true);
  };

  const openEditModal = (p: InventoryProduct) => {
    setEditingProduct(p);
    setSku(p.sku);
    setNameAr(p.name.ar);
    setNameEn(p.name.en);
    setCategoryId(p.categoryId);
    setWarehouseId(p.warehouseId);
    setUnitId(p.unitId);
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setQty(p.qty);
    setMinStock(p.minStock);
    setIsRawMaterial(Boolean(p.isRawMaterial));
    setIsFormModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !nameAr) return;

    if (editingProduct) {
      onUpdateProduct(editingProduct.id, {
        sku,
        name: { ar: nameAr, en: nameEn || nameAr },
        categoryId,
        warehouseId,
        unitId,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        qty: Number(qty),
        minStock: Number(minStock),
        isRawMaterial,
      });
    } else {
      onAddProduct({
        sku,
        name: { ar: nameAr, en: nameEn || nameAr },
        categoryId,
        warehouseId,
        unitId,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        qty: Number(qty),
        minStock: Number(minStock),
        isRawMaterial,
      });
    }
    setIsFormModalOpen(false);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (showLowStockOnly && p.qty >= p.minStock) return false;
      if (selectedCategory !== "all" && p.categoryId !== selectedCategory) return false;
      if (selectedWarehouse !== "all" && p.warehouseId !== selectedWarehouse) return false;
      if (!q) return true;
      return (
        p.sku.toLowerCase().includes(q) ||
        p.name.ar.toLowerCase().includes(q) ||
        p.name.en.toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, selectedCategory, selectedWarehouse, showLowStockOnly]);

  const lowStockCount = useMemo(() => products.filter((p) => p.qty < p.minStock).length, [products]);

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Toolbar */}
      <div className="surface-panel rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search
              className={cn(
                "absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground",
                dir === "rtl" ? "right-3" : "left-3",
              )}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={pick(
                "بحث بكود الصنف أو الاسم (نوتيلا، بستاشيو، فتة...)",
                "Search by SKU or item name...",
              )}
              className={cn(
                "w-full rounded-lg border border-border bg-card py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                dir === "rtl" ? "pr-9 pl-8" : "pl-9 pr-8",
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground",
                  dir === "rtl" ? "left-2.5" : "right-2.5",
                )}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="all">{pick("جميع التصنيفات", "All Categories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c.name.ar, c.name.en)}
              </option>
            ))}
          </select>

          {/* Warehouse Dropdown */}
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="all">{pick("جميع المخازن والفروع", "All Warehouses")}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {pick(w.name.ar, w.name.en)}
              </option>
            ))}
          </select>

          {/* Low stock toggle */}
          <button
            type="button"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all shadow-sm",
              showLowStockOnly
                ? "border-destructive bg-destructive text-destructive-foreground"
                : "border-border bg-card text-foreground hover:bg-secondary",
            )}
          >
            <AlertTriangle className="size-3.5" />
            <span>{pick("النواقص فقط", "Low Stock Only")}</span>
            <span className="rounded-full bg-destructive/20 px-1.5 py-0.2 text-[10px] font-mono">
              {lowStockCount}
            </span>
          </button>

          {/* Add Product Button */}
          <Btn onClick={openAddModal} variant="solid" className="ms-auto text-xs">
            <Plus className="size-3.5" />
            {t("addProduct")}
          </Btn>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="surface-panel rounded-xl overflow-x-auto shadow-sm">
        <DataTable
          head={[
            t("sku"),
            pick("اسم الصنف / المنتج", "Product Name"),
            pick("التصنيف", "Category"),
            pick("الموقع / المخزن", "Warehouse"),
            pick("الرصيد والوحدة", "Stock & Unit"),
            t("costPrice"),
            t("sellingPrice"),
            t("profitMargin"),
            t("value"),
            pick("الإجراءات", "Actions"),
          ]}
        >
          {filteredProducts.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-12 text-center text-muted-foreground">
                <Boxes className="mx-auto size-8 opacity-40 mb-2" />
                <p className="font-semibold">
                  {pick("لا توجد أصناف مطابقة للبحث", "No products matching your search")}
                </p>
              </td>
            </tr>
          ) : (
            filteredProducts.map((p) => {
              const cat = categories.find((c) => c.id === p.categoryId);
              const wh = warehouses.find((w) => w.id === p.warehouseId);
              const unit = units.find((u) => u.id === p.unitId);
              const isLow = p.qty <= p.minStock;
              const margin = p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0;

              return (
                <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                  {/* SKU */}
                  <Td className="num font-bold">
                    <span className="font-mono text-xs bg-secondary border border-border px-2 py-0.5 rounded-md">
                      {p.sku}
                    </span>
                  </Td>

                  {/* Name */}
                  <Td className="font-bold text-foreground">
                    <div>
                      <p>{pick(p.name.ar, p.name.en)}</p>
                      {p.isRawMaterial && (
                        <span className="inline-block rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-bold uppercase mt-0.5">
                          {pick("مادة خام", "Raw Material")}
                        </span>
                      )}
                    </div>
                  </Td>

                  {/* Category */}
                  <Td>
                    <span className="inline-block rounded-md bg-secondary/80 border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {cat ? pick(cat.name.ar, cat.name.en) : "—"}
                    </span>
                  </Td>

                  {/* Warehouse */}
                  <Td className="text-xs text-muted-foreground">
                    {wh ? pick(wh.name.ar, wh.name.en) : "—"}
                  </Td>

                  {/* Qty & Unit */}
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("num font-extrabold text-sm", isLow ? "text-destructive" : "text-foreground")}>
                        {n(p.qty)}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {unit ? pick(unit.name.ar, unit.code) : ""}
                      </span>
                      {isLow && (
                        <span className="ms-1 rounded bg-destructive/15 text-destructive border border-destructive/30 px-1.5 py-0.2 text-[9px] font-bold uppercase">
                          {pick("ناقص", "Low")}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {pick("حد الأمان", "Min")}: {n(p.minStock)}
                    </span>
                  </Td>

                  {/* Cost Price */}
                  <Td className="num text-xs text-muted-foreground">{money(p.costPrice)}</Td>

                  {/* Selling Price */}
                  <Td className="num font-bold text-foreground">{money(p.sellingPrice)}</Td>

                  {/* Margin */}
                  <Td className="num text-xs font-bold">
                    <span className={cn(margin >= 40 ? "text-emerald-600" : margin >= 20 ? "text-primary" : "text-destructive")}>
                      {margin}%
                    </span>
                  </Td>

                  {/* Valuation */}
                  <Td className="num font-bold">{money(p.qty * p.costPrice)}</Td>

                  {/* Actions */}
                  <Td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="rounded-lg border border-border bg-card p-1 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-sm"
                        title={t("edit")}
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(p)}
                        className="rounded-lg border border-border bg-card p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors shadow-sm"
                        title={pick("حذف", "Delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </DataTable>
      </div>

      {/* Add / Edit Product Modal */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="border border-border/80 shadow-2xl rounded-2xl sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase flex items-center gap-2">
              <Package className="size-5 text-primary" />
              {editingProduct ? pick("تعديل الصنف والمخزون", "Edit Product & Stock") : t("addProduct")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {t("sku")} *
                </label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. KSHR-LUX"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("نوع الصنف", "Item Nature")}
                </label>
                <select
                  value={isRawMaterial ? "raw" : "finished"}
                  onChange={(e) => setIsRawMaterial(e.target.value === "raw")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="finished">{t("finishedProducts")}</option>
                  <option value="raw">{t("rawMaterials")}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("اسم الصنف (عربي)", "Product Name (Arabic)")} *
                </label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: كشري حلو كيندر"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("اسم الصنف (إنجليزي)", "Product Name (English)")}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Sweet Koshary Kinder"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("التصنيف", "Category")}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {pick(c.name.ar, c.name.en)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("المخزن / الفرع", "Warehouse")}
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {pick(w.name.ar, w.name.en)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("وحدة الصرف", "Unit")}
                </label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {pick(u.name.ar, u.name.en)} ({u.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {t("costPrice")} (ج.م) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm num font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {t("sellingPrice")} (ج.م) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm num font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("الرصيد الحالي", "Current Qty")} *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm num font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {t("reorderLimit")} *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm num font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-border/70">
              <Btn type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
                {t("cancel")}
              </Btn>
              <Btn type="submit" variant="solid">
                <Check className="size-4" />
                {editingProduct ? pick("حفظ التعديلات", "Save Changes") : pick("إضافة الصنف", "Add Product")}
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteCandidate)} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <DialogContent className="border border-border/80 shadow-2xl rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              {t("deleteConfirmTitle")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2 leading-relaxed">
            {t("deleteConfirmMsg")}
          </p>
          {deleteCandidate && (
            <div className="rounded-xl border border-border bg-secondary/50 p-3 text-xs font-mono font-bold">
              {deleteCandidate.sku} — {pick(deleteCandidate.name.ar, deleteCandidate.name.en)}
            </div>
          )}
          <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-border/70">
            <Btn variant="outline" onClick={() => setDeleteCandidate(null)}>
              {t("cancel")}
            </Btn>
            <Btn
              variant="solid"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteCandidate) {
                  onDeleteProduct(deleteCandidate.id);
                  setDeleteCandidate(null);
                }
              }}
            >
              {pick("نعم، احذف الصنف", "Yes, Delete Product")}
            </Btn>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
