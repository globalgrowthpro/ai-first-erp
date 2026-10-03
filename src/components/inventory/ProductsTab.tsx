import { useState, useMemo, useRef, useCallback } from "react";
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
  FileSpreadsheet,
  Upload,
  Link,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { DataTable, Td, Btn, TablePagination, usePagination } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  type InventoryProduct,
  type InventoryCategory,
  type InventoryWarehouse,
  type InventoryUnit,
  type Branch,
  getCategoryStyle,
} from "@/lib/inventory-store";

interface ProductsTabProps {
  products: InventoryProduct[];
  categories: InventoryCategory[];
  warehouses: InventoryWarehouse[];
  units: InventoryUnit[];
  branches?: Branch[];
  onAddProduct: (prod: Omit<InventoryProduct, "id">) => void;
  onUpdateProduct: (id: string, updates: Partial<InventoryProduct>) => void;
  onDeleteProduct: (id: string) => void;
  onOpenImport?: () => void;
}

export function ProductsTab({
  products,
  categories,
  warehouses,
  units,
  branches = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onOpenImport,
}: ProductsTabProps) {
  const { t, pick, money, n, dir } = useI18n();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
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
  const [group, setGroup] = useState("");
  const [branchId, setBranchId] = useState("");
  const [showOnPos, setShowOnPos] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [imageSource, setImageSource] = useState<"url" | "upload">("url");
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "safe" | "danger">("idle");
  const [scanMessage, setScanMessage] = useState("");
  const [skuError, setSkuError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Virus / Safety scan helpers ──────────────────────────────────────
  const MAGIC_BYTES: Record<string, number[][]> = {
    "image/png":  [[0x89,0x50,0x4E,0x47]],
    "image/jpeg": [[0xFF,0xD8,0xFF]],
    "image/webp": [[0x52,0x49,0x46,0x46]],
  };
  const SUSPICIOUS_PATTERNS = [
    /<script/i, /javascript:/i, /vbscript:/i, /data:text/i,
    /onload=/i, /onerror=/i, /%3Cscript/i, /eval\(/i,
  ];

  const scanFile = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.size > 100 * 1024) {
        reject(pick("الملف أكبر من 100KB المسموح به", "File exceeds 100KB limit"));
        return;
      }
      const allowed = ["image/png","image/jpeg","image/webp","image/jpg"];
      if (!allowed.includes(file.type)) {
        reject(pick("نوع الملف غير مدعوم. المسموح: PNG, JPEG, WebP", "Unsupported type. Allowed: PNG, JPEG, WebP"));
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const buf = ev.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buf);
        // Magic bytes check
        const magics = MAGIC_BYTES[file.type] || [];
        const validMagic = magics.some(seq =>
          seq.every((b, i) => bytes[i] === b)
        );
        if (!validMagic) {
          reject(pick("تحذير: الملف لا يطابق نوعه الحقيقي (محتمل تزوير)", "Warning: File magic bytes mismatch — possibly spoofed"));
          return;
        }
        // Suspicious content check
        const text = new TextDecoder("utf-8",{fatal:false}).decode(bytes.slice(0,4096));
        for (const pat of SUSPICIOUS_PATTERNS) {
          if (pat.test(text)) {
            reject(pick("تحذير: الملف يحتوي على كود مشبوه — تم رفضه", "Danger: Suspicious script detected in file — rejected"));
            return;
          }
        }
        // All checks passed → create object URL
        const url = URL.createObjectURL(file);
        resolve(url);
      };
      reader.onerror = () => reject(pick("فشل قراءة الملف", "Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }, [pick]);

  const scanUrl = useCallback(async (url: string): Promise<void> => {
    if (!url) return;
    // Basic pattern checks on the URL itself
    for (const pat of SUSPICIOUS_PATTERNS) {
      if (pat.test(url)) throw new Error(pick("الرابط يحتوي على نمط مشبوه", "URL contains suspicious pattern"));
    }
    if (!url.startsWith("https://")) throw new Error(pick("يجب أن يبدأ الرابط بـ https://", "URL must use https://"));
    // Check content-type via HEAD request
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      const ct = res.headers.get("content-type") || "";
      if (!ct.startsWith("image/")) throw new Error(pick("الرابط لا يشير إلى صورة صحيحة", "URL does not point to a valid image"));
    } catch (e: unknown) {
      // If fetch fails (CORS etc.) but URL looks like an image path, allow it
      const ext = url.split(".").pop()?.toLowerCase() || "";
      if (!["png","jpg","jpeg","webp"].includes(ext)) {
        throw new Error(pick("تعذر التحقق من الرابط — يجب أن ينتهي بـ png/jpg/webp", "Cannot verify URL — must end with png/jpg/webp"));
      }
    }
  }, [pick]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanStatus("scanning");
    setScanMessage(pick("جاري فحص الملف...", "Scanning file..."));
    try {
      const objUrl = await scanFile(file);
      setImageUrl(objUrl);
      setScanStatus("safe");
      setScanMessage(pick("✅ الصورة آمنة وتم رفعها بنجاح", "✅ Image is safe and uploaded"));
    } catch (err: unknown) {
      setScanStatus("danger");
      setScanMessage(String(err));
      setImageUrl("");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [scanFile, pick]);

  const handleUrlScan = useCallback(async (url: string) => {
    if (!url) { setScanStatus("idle"); setScanMessage(""); return; }
    setScanStatus("scanning");
    setScanMessage(pick("جاري فحص الرابط...", "Scanning URL..."));
    try {
      await scanUrl(url);
      setScanStatus("safe");
      setScanMessage(pick("✅ الرابط آمن", "✅ URL is safe"));
    } catch (err: unknown) {
      setScanStatus("danger");
      setScanMessage(String(err));
    }
  }, [scanUrl, pick]);

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
    setGroup("");
    setBranchId("");
    setShowOnPos(true);
    setImageUrl("");
    setImageSource("url");
    setScanStatus("idle");
    setScanMessage("");
    setSkuError(null);
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
    setGroup(p.group || "");
    setBranchId(p.branchId || "");
    setShowOnPos(p.showOnPos !== undefined ? p.showOnPos : !p.isRawMaterial);
    setImageUrl(p.image || "");
    setImageSource("url");
    setScanStatus(p.image ? "safe" : "idle");
    setScanMessage(p.image ? pick("✅ صورة محفوظة مسبقاً", "✅ Previously saved image") : "");
    setSkuError(null);
    setIsFormModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !nameAr) return;

    // Duplicate SKU guard
    const skuTrimmed = sku.trim().toUpperCase();
    const duplicateSku = products.find(
      (p) => p.sku.toUpperCase() === skuTrimmed && p.id !== editingProduct?.id
    );
    if (duplicateSku) {
      setSkuError(
        pick(
          `كود الصنف "${sku}" مستخدم بالفعل في: ${pick(duplicateSku.name.ar, duplicateSku.name.en)}`,
          `SKU "${sku}" already exists: ${pick(duplicateSku.name.ar, duplicateSku.name.en)}`
        )
      );
      return;
    }
    setSkuError(null);

    if (editingProduct) {
      onUpdateProduct(editingProduct.id, {
        sku: skuTrimmed,
        name: { ar: nameAr, en: nameEn || nameAr },
        categoryId,
        warehouseId,
        unitId,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        qty: Number(qty),
        minStock: Number(minStock),
        isRawMaterial,
        group: group || undefined,
        branchId: branchId || undefined,
        showOnPos,
        ...(imageUrl.trim() ? { image: imageUrl.trim() } : {}),
      });
    } else {
      onAddProduct({
        sku: skuTrimmed,
        name: { ar: nameAr, en: nameEn || nameAr },
        categoryId,
        warehouseId,
        unitId,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        qty: Number(qty),
        minStock: Number(minStock),
        isRawMaterial,
        group: group || undefined,
        branchId: branchId || undefined,
        showOnPos,
        ...(imageUrl.trim() ? { image: imageUrl.trim() } : {}),
      });
    }
    setIsFormModalOpen(false);
  };

  // Unique groups from products list
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.group) set.add(p.group);
    }
    return Array.from(set);
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (showLowStockOnly && p.qty >= p.minStock) return false;
      if (selectedCategory !== "all" && p.categoryId !== selectedCategory) return false;
      if (selectedWarehouse !== "all" && p.warehouseId !== selectedWarehouse) return false;
      if (selectedGroup !== "all" && p.group !== selectedGroup) return false;
      if (!q) return true;
      return (
        p.sku.toLowerCase().includes(q) ||
        p.name.ar.toLowerCase().includes(q) ||
        p.name.en.toLowerCase().includes(q) ||
        (p.group && p.group.toLowerCase().includes(q))
      );
    });
  }, [products, searchQuery, selectedCategory, selectedWarehouse, selectedGroup, showLowStockOnly]);

  const {
    currentPage: productPage,
    setCurrentPage: setProductPage,
    paginatedItems: paginatedProducts,
  } = usePagination(filteredProducts, 30);

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

          {/* Group Dropdown */}
          {availableGroups.length > 0 && (
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">{pick("جميع المجموعات (All Groups)", "All Groups")}</option>
              {availableGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}

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

          {/* Import from Template Button */}
          {onOpenImport && (
            <Btn
              onClick={onOpenImport}
              variant="outline"
              className="ms-auto text-xs gap-1.5 font-bold border-primary/30 text-primary hover:bg-primary/10 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>{pick("استيراد من قالب جاهز", "Import from Template")}</span>
            </Btn>
          )}

          {/* Add Product Button */}
          <Btn
            onClick={openAddModal}
            variant="solid"
            className={cn("text-xs gap-1.5 shadow-xs", !onOpenImport && "ms-auto")}
          >
            <Plus className="size-3.5" />
            {t("addProduct")}
          </Btn>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="surface-panel rounded-xl overflow-x-auto shadow-sm">
        <DataTable
          head={[
            pick("الصورة", "Image"),
            t("sku"),
            pick("اسم الصنف / المنتج", "Product Name"),
            pick("المجموعة", "Group"),
            pick("الفرع", "Branch"),
            pick("التصنيف", "Category"),
            pick("الموقع / المخزن", "Warehouse"),
            pick("الرصيد والوحدة", "Stock & Unit"),
            t("costPrice"),
            t("sellingPrice"),
            pick("عرض في POS", "Show on POS"),
            t("value"),
            pick("الإجراءات", "Actions"),
          ]}
        >
          {filteredProducts.length === 0 ? (
            <tr>
              <td colSpan={13} className="py-12 text-center text-muted-foreground">
                <Boxes className="mx-auto size-8 opacity-40 mb-2" />
                <p className="font-semibold">
                  {pick("لا توجد أصناف مطابقة للبحث", "No products matching your search")}
                </p>
              </td>
            </tr>
          ) : (
            paginatedProducts.map((p) => {
              const cat = categories.find((c) => c.id === p.categoryId);
              const wh = warehouses.find((w) => w.id === p.warehouseId);
              const unit = units.find((u) => u.id === p.unitId);
              const isLow = p.qty <= p.minStock;
              const margin = p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0;

              return (
                <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                  {/* Image Thumbnail */}
                  <Td>
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={pick(p.name.ar, p.name.en)}
                        className="w-10 h-10 rounded-lg object-cover border border-border shadow-sm bg-secondary"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg border border-dashed border-border bg-secondary/60 flex items-center justify-center">
                        <Package className="size-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </Td>

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

                  {/* Group */}
                  <Td>
                    {p.group ? (
                      <span className="inline-block rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap">
                        {p.group}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </Td>

                  {/* Branch */}
                  <Td>
                    {p.branchId ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary border border-border px-2 py-0.5 text-[11px] font-semibold text-foreground whitespace-nowrap">
                        <span>📍</span>
                        <span>
                          {branches.find((b) => b.id === p.branchId)?.name[pick("ar", "en") as "ar" | "en"] || p.branchId}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        <span>🌐</span>
                        <span>{pick("جميع الفروع", "All Branches")}</span>
                      </span>
                    )}
                  </Td>

                  {/* Category */}
                  <Td>
                    {cat ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold shadow-2xs whitespace-nowrap",
                          getCategoryStyle(cat).className
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full shrink-0",
                            getCategoryStyle(cat).dot
                          )}
                        />
                        <span>{pick(cat.name.ar, cat.name.en)}</span>
                      </span>
                    ) : (
                      <span className="inline-block rounded-md bg-secondary/80 border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        —
                      </span>
                    )}
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

                  {/* Show on POS on/off Switch */}
                  <Td className="text-center">
                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={Boolean(p.showOnPos)}
                        onCheckedChange={(checked) => onUpdateProduct(p.id, { showOnPos: checked })}
                      />
                      <span className={cn("text-[10px] font-bold min-w-[28px]", p.showOnPos ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                        {p.showOnPos ? pick("مفعّل", "ON") : pick("إخفاء", "OFF")}
                      </span>
                    </div>
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
        <TablePagination
          currentPage={productPage}
          totalItems={filteredProducts.length}
          pageSize={30}
          onPageChange={setProductPage}
          itemLabel={{ ar: "صنف", en: "Products" }}
        />
      </div>

      {/* ─── Add / Edit Product Modal ─── */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="border border-border/70 shadow-2xl rounded-2xl sm:max-w-[820px] overflow-hidden p-0 gap-0">

          {/* ── Header ── */}
          <div className={cn(
            "flex items-center gap-3 px-5 py-3 border-b border-border/60 shrink-0",
            editingProduct
              ? "bg-gradient-to-r from-amber-500/8 via-background to-background"
              : "bg-gradient-to-r from-primary/8 via-background to-background"
          )}>
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-xl shadow-sm shrink-0",
              editingProduct
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : "bg-primary/15 text-primary border border-primary/30"
            )}>
              <Package className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm font-extrabold text-foreground leading-tight">
                {editingProduct ? pick("تعديل الصنف والمخزون", "Edit Product & Stock") : pick("إضافة صنف جديد", "Add New Product")}
              </DialogTitle>
              <p className="text-[10px] text-muted-foreground">
                {editingProduct
                  ? pick(editingProduct.name.ar, editingProduct.name.en)
                  : pick("أدخل بيانات الصنف الجديد", "Fill in the new product details")}
              </p>
            </div>
            {sellingPrice > 0 && costPrice > 0 && (
              <div className={cn(
                "shrink-0 text-center px-3 py-1 rounded-xl border text-xs font-black",
                ((sellingPrice - costPrice) / sellingPrice) * 100 >= 30
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : ((sellingPrice - costPrice) / sellingPrice) * 100 >= 15
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                    : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
              )}>
                <div className="text-[9px] opacity-70">{pick("هامش", "Margin")}</div>
                <div>{Math.round(((sellingPrice - costPrice) / sellingPrice) * 100)}%</div>
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <form onSubmit={handleSubmit} className="flex overflow-hidden" style={{ height: "calc(min(90vh, 560px) - 56px)" }}>

            {/* LEFT: Image + Controls */}
            <div className="w-48 shrink-0 border-e border-border/60 bg-secondary/30 flex flex-col p-3 gap-2.5 overflow-hidden">

              {/* Preview */}
              <div className={cn(
                "w-full aspect-square rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center bg-background transition-all shrink-0",
                imageUrl ? "border-primary/50" : "border-border/60",
                scanStatus === "danger" && "border-destructive/60 bg-destructive/5",
                scanStatus === "safe" && "border-emerald-500/50"
              )}>
                {imageUrl ? (
                  <img src={imageUrl} alt="preview" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }} />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                    <Package className="size-8" />
                    <span className="text-[9px] font-medium">{pick("لا توجد صورة", "No image")}</span>
                  </div>
                )}
              </div>

              {/* Scan status */}
              {scanStatus !== "idle" && (
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border leading-tight",
                  scanStatus === "scanning" && "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
                  scanStatus === "safe" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                  scanStatus === "danger" && "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
                )}>
                  {scanStatus === "scanning" && <Loader2 className="size-3 animate-spin shrink-0" />}
                  {scanStatus === "safe" && <ShieldCheck className="size-3 shrink-0" />}
                  {scanStatus === "danger" && <ShieldAlert className="size-3 shrink-0" />}
                  <span>{scanMessage}</span>
                </div>
              )}

              {/* URL / Upload tabs */}
              <div className="border border-border/60 rounded-xl overflow-hidden shrink-0">
                <div className="flex">
                  {(["url","upload"] as const).map(src => (
                    <button key={src} type="button" onClick={() => setImageSource(src)}
                      className={cn("flex-1 flex items-center justify-center gap-1 py-1 text-[9px] font-bold transition-all",
                        imageSource === src ? "bg-primary/15 text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-secondary"
                      )}>
                      {src === "url" ? <Link className="size-2.5" /> : <Upload className="size-2.5" />}
                      {src === "url" ? pick("رابط","URL") : pick("رفع","Upload")}
                    </button>
                  ))}
                </div>
                <div className="p-1.5">
                  {imageSource === "url" ? (
                    <div className="flex gap-1">
                      <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://..." dir="ltr"
                        className="flex-1 min-w-0 rounded-lg border border-border bg-background px-2 py-1 text-[9px] focus:outline-none focus:ring-1 focus:ring-primary" />
                      <button type="button" onClick={() => handleUrlScan(imageUrl)}
                        disabled={!imageUrl || scanStatus === "scanning"}
                        title={pick("فحص الرابط","Scan URL")}
                        className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 disabled:opacity-40 transition-all">
                        {scanStatus === "scanning" ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}
                      </button>
                    </div>
                  ) : (
                    <>
                      <input ref={fileInputRef} type="file"
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        onChange={handleFileUpload} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        disabled={scanStatus === "scanning"}
                        className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-border text-[9px] font-bold text-muted-foreground hover:bg-background hover:border-primary/40 transition-all disabled:opacity-40">
                        {scanStatus === "scanning" ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                        {pick("PNG/JPG/WebP · ≤100KB","PNG/JPG/WebP · ≤100KB")}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Type toggle */}
              <div className="shrink-0">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1 text-center tracking-widest">{pick("نوع الصنف","Item Type")}</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { v: "finished", ar: "نهائي", en: "Finished", icon: "🏪" },
                    { v: "raw", ar: "خام", en: "Raw", icon: "🌾" },
                  ].map(opt => (
                    <button key={opt.v} type="button" onClick={() => setIsRawMaterial(opt.v === "raw")}
                      className={cn(
                        "flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[9px] font-bold transition-all",
                        (isRawMaterial ? "raw" : "finished") === opt.v
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-background border-border text-muted-foreground hover:bg-secondary"
                      )}>
                      <span>{opt.icon}</span>
                      <span>{pick(opt.ar, opt.en)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* POS toggle */}
              <button type="button" onClick={() => setShowOnPos(!showOnPos)}
                className={cn(
                  "shrink-0 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[9px] font-bold transition-all",
                  showOnPos
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-secondary border-border text-muted-foreground"
                )}>
                <Switch checked={showOnPos} onCheckedChange={setShowOnPos} onClick={(e) => e.stopPropagation()} />
                <span>{showOnPos ? pick("🟢 ظاهر في POS","🟢 On POS") : pick("⚫ مخفي من POS","⚫ Off POS")}</span>
              </button>
            </div>

            {/* RIGHT: Form Fields */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">

                {/* Identity section */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{pick("هوية الصنف","Product Identity")}</span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      {pick("كود SKU","SKU")} <span className="text-destructive">*</span>
                    </label>
                    <input type="text" required value={sku}
                      onChange={(e) => { setSku(e.target.value); setSkuError(null); }}
                      placeholder="KSHR-LUX"
                      className={cn(
                        "w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs font-mono font-extrabold tracking-wider focus:outline-none focus:ring-1 focus:ring-primary transition-all",
                        skuError ? "border-destructive bg-destructive/5" : "border-border hover:border-primary/40"
                      )} />
                    {skuError && <p className="mt-0.5 text-[9px] text-destructive font-bold">{skuError}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      {pick("اسم (عربي)","Name (AR)")} <span className="text-destructive">*</span>
                    </label>
                    <input type="text" required dir="rtl" value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)} placeholder="كشري حلو كيندر"
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">{pick("اسم (إنجليزي)","Name (EN)")}</label>
                    <input type="text" dir="ltr" value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)} placeholder="Sweet Koshary Kinder"
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
                  </div>
                </div>

                {/* Classification section */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{pick("التصنيف والموقع","Classification & Location")}</span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">{pick("التصنيف","Category")}</label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                      {categories.map(c => <option key={c.id} value={c.id}>{pick(c.name.ar, c.name.en)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">{pick("المخزن","Warehouse")}</label>
                    <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                      {warehouses.map(w => <option key={w.id} value={w.id}>{pick(w.name.ar, w.name.en)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">{pick("الوحدة","Unit")}</label>
                    <select value={unitId} onChange={(e) => setUnitId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                      {units.map(u => <option key={u.id} value={u.id}>{pick(u.name.ar, u.name.en)} ({u.code})</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">{pick("المجموعة (Group)","Product Group")}</label>
                    <input type="text" value={group} onChange={(e) => setGroup(e.target.value)}
                      list="product-group-suggestions"
                      placeholder={pick("مثال: عشاق الرز...","e.g. Rice Pudding...")}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
                    <datalist id="product-group-suggestions">
                      {["عشاق الرز","الفتة الملكية","دنيا الدلع","طواجن ساخنة","شاورما الحلو","كيك وتشييز","كشري الحلو","القشطوطة الأصلية","علب الهدايا","مشروبات وإضافات"].map(g => <option key={g} value={g} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">{pick("الفرع (اختياري)","Branch (Optional)")}</label>
                    <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                      <option value="">{pick("🌐 جميع الفروع","🌐 All Branches")}</option>
                      {branches.map(b => <option key={b.id} value={b.id}>📍 {pick(b.name.ar, b.name.en)} {b.isWazeerOwned ? "" : pick("(فرنشايز)","(Franchise)")}</option>)}
                    </select>
                  </div>
                </div>

                {/* Pricing & Stock section */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{pick("الأسعار والمخزون","Pricing & Stock")}</span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {/* Cost Price — EGP badge addon */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      {pick("سعر التكلفة","Cost")} <span className="text-destructive">*</span>
                    </label>
                    <div className="flex rounded-lg border border-border overflow-hidden hover:border-primary/40 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all bg-background">
                      <span className="flex items-center px-2 bg-muted border-e border-border text-[10px] font-black text-muted-foreground shrink-0 select-none whitespace-nowrap">
                        {pick("ج.م","EGP")}
                      </span>
                      <input type="number" required min={0} step="any" value={costPrice}
                        onChange={(e) => setCostPrice(Number(e.target.value))}
                        className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm num font-extrabold focus:outline-none" />
                    </div>
                  </div>

                  {/* Selling Price — EGP badge addon */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      {pick("سعر البيع","Sell")} <span className="text-destructive">*</span>
                    </label>
                    <div className="flex rounded-lg border border-border overflow-hidden hover:border-primary/40 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all bg-background">
                      <span className="flex items-center px-2 bg-muted border-e border-border text-[10px] font-black text-muted-foreground shrink-0 select-none whitespace-nowrap">
                        {pick("ج.م","EGP")}
                      </span>
                      <input type="number" required min={0} step="any" value={sellingPrice}
                        onChange={(e) => setSellingPrice(Number(e.target.value))}
                        className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm num font-extrabold focus:outline-none" />
                    </div>
                  </div>

                  {/* Qty */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      {pick("الرصيد","Qty")} <span className="text-destructive">*</span>
                    </label>
                    <input type="number" required min={0} value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className={cn(
                        "w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm num font-extrabold hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary transition-all",
                        qty <= minStock && qty > 0 ? "border-amber-400 bg-amber-500/5" : qty === 0 ? "border-destructive/50 bg-destructive/5" : "border-border"
                      )} />
                    {qty <= minStock && qty > 0 && <p className="mt-0.5 text-[9px] text-amber-600 font-bold">⚠ {pick("تحت حد الأمان","Below min")}</p>}
                    {qty === 0 && <p className="mt-0.5 text-[9px] text-destructive font-bold">❌ {pick("نفد","Out of stock")}</p>}
                  </div>

                  {/* Min Stock */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      {pick("حد الأمان","Min Stock")} <span className="text-destructive">*</span>
                    </label>
                    <input type="number" required min={0} value={minStock}
                      onChange={(e) => setMinStock(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm num font-extrabold hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
                  </div>
                </div>

                {/* Margin bar */}
                {sellingPrice > 0 && (
                  <div className="rounded-lg bg-secondary/60 border border-border/60 px-3 py-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                      <span className="text-muted-foreground">{pick("هامش الربح","Net Margin")}</span>
                      <span className={cn("font-extrabold",
                        ((sellingPrice - costPrice) / sellingPrice) * 100 >= 30 ? "text-emerald-600 dark:text-emerald-400"
                        : ((sellingPrice - costPrice) / sellingPrice) * 100 >= 15 ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400")}>
                        {Math.round(((sellingPrice - costPrice) / sellingPrice) * 100)}%
                        &nbsp;·&nbsp;{pick("ربح","profit")}: {sellingPrice - costPrice} {pick("ج.م","EGP")}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500",
                        ((sellingPrice - costPrice) / sellingPrice) * 100 >= 30 ? "bg-emerald-500"
                        : ((sellingPrice - costPrice) / sellingPrice) * 100 >= 15 ? "bg-amber-500" : "bg-red-500"
                      )} style={{ width: `${Math.min(100, Math.max(0, Math.round(((sellingPrice - costPrice) / sellingPrice) * 100)))}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 bg-background/95 backdrop-blur-sm border-t border-border/70 px-4 py-2.5 flex items-center justify-between gap-3">
                <p className="text-[9px] text-muted-foreground flex items-center gap-2">
                  <span><span className="text-destructive font-bold">*</span> {pick("حقول مطلوبة","Required fields")}</span>
                  {scanStatus === "danger" && <span className="text-destructive font-bold">{pick("⚠ الصورة مرفوضة","⚠ Image rejected — fix before saving")}</span>}
                </p>
                <div className="flex items-center gap-2">
                  <Btn type="button" variant="outline" onClick={() => setIsFormModalOpen(false)} className="text-xs h-8">{t("cancel")}</Btn>
                  <Btn type="submit" variant="solid"
                    disabled={scanStatus === "scanning" || scanStatus === "danger"}
                    className="text-xs h-8 gap-1.5 px-4">
                    <Check className="size-3.5" />
                    {editingProduct ? pick("حفظ التعديلات","Save Changes") : pick("إضافة للمخزون","Add Product")}
                  </Btn>
                </div>
              </div>
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
