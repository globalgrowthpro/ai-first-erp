import { useState, useMemo } from "react";
import {
  ChefHat,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
  Check,
  Eye,
  Layers,
  Sparkles,
  Calculator,
  Percent,
  X,
  PlusCircle,
  FileSpreadsheet,
  Info,
  TrendingUp,
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
  InventoryBom,
  InventoryProduct,
  InventoryUnit,
  BomComponentItem,
  BomStatus,
} from "@/lib/inventory-store";

interface BomTabProps {
  boms: InventoryBom[];
  products: InventoryProduct[];
  units: InventoryUnit[];
  onAddBom: (bom: Omit<InventoryBom, "id">) => void;
  onUpdateBom: (id: string, updates: Partial<InventoryBom>) => void;
  onDeleteBom: (id: string) => void;
}

export function BomTab({
  boms,
  products,
  units,
  onAddBom,
  onUpdateBom,
  onDeleteBom,
}: BomTabProps) {
  const { t, pick, n, dir } = useI18n();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<InventoryBom | null>(null);
  const [viewingBom, setViewingBom] = useState<InventoryBom | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<InventoryBom | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [finishedProductId, setFinishedProductId] = useState("");
  const [outputYield, setOutputYield] = useState<number>(10);
  const [outputUnitId, setOutputUnitId] = useState("");
  const [overheadCost, setOverheadCost] = useState<number>(50);
  const [status, setStatus] = useState<BomStatus>("active");
  const [notes, setNotes] = useState("");
  const [components, setComponents] = useState<BomComponentItem[]>([]);

  // Open Create Modal
  const openAddModal = () => {
    setEditingBom(null);
    setCode(`BOM-${Date.now().toString().slice(-4)}`);
    setNameAr("");
    setNameEn("");

    const finished = products.find((p) => !p.isRawMaterial) || products[0];
    setFinishedProductId(finished ? finished.id : "");
    setOutputYield(10);

    const portionUnit =
      units.find((u) => u.code === "PORTION") || units[0] || null;
    setOutputUnitId(portionUnit ? portionUnit.id : "");
    setOverheadCost(60);
    setStatus("active");
    setNotes("");

    // default 1 empty component
    const defaultRaw = products.find((p) => p.isRawMaterial) || products[0];
    if (defaultRaw) {
      setComponents([
        {
          componentProductId: defaultRaw.id,
          rawMaterialProductId: defaultRaw.id,
          quantity: 1,
          unitId: defaultRaw.unitId,
          unitCost: defaultRaw.costPrice,
          totalCost: defaultRaw.costPrice,
        },
      ]);
    } else {
      setComponents([]);
    }

    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (bom: InventoryBom) => {
    setEditingBom(bom);
    setCode(bom.code);
    setNameAr(bom.name.ar);
    setNameEn(bom.name.en);
    setFinishedProductId(bom.finishedProductId);
    setOutputYield(bom.outputYield);
    setOutputUnitId(bom.outputUnitId);
    setOverheadCost(bom.overheadCost);
    setStatus(bom.status);
    setNotes(bom.notes || "");
    setComponents(
      bom.components.map((c) => ({
        ...c,
      }))
    );
    setIsFormModalOpen(true);
  };

  // Add component row
  const addComponentRow = () => {
    const rawMaterials = products.filter((p) => p.isRawMaterial);
    const item = rawMaterials[0] || products[0];
    if (!item) return;

    setComponents((prev) => [
      ...prev,
      {
        componentProductId: item.id,
        rawMaterialProductId: item.id,
        quantity: 1,
        unitId: item.unitId,
        unitCost: item.costPrice,
        totalCost: item.costPrice,
      },
    ]);
  };

  // Remove component row
  const removeComponentRow = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  // Update component item
  const updateComponent = (
    index: number,
    field: keyof BomComponentItem,
    val: any
  ) => {
    setComponents((prev) => {
      const copy = [...prev];
      const existing = copy[index];
      if (!existing) return prev;
      const row: BomComponentItem = {
        ...existing,
        componentProductId: existing.componentProductId || existing.rawMaterialProductId || "",
      };

      if (field === "componentProductId" || field === "rawMaterialProductId") {
        row.componentProductId = val;
        row.rawMaterialProductId = val;
        const prod = products.find((p) => p.id === val);
        if (prod) {
          row.unitCost = prod.costPrice;
          row.unitId = prod.unitId;
          row.totalCost = (row.quantity || 1) * prod.costPrice;
        }
      } else if (field === "quantity") {
        const qty = parseFloat(val) || 0;
        row.quantity = qty;
        row.totalCost = qty * (row.unitCost || 0);
      } else if (field === "unitCost") {
        const cost = parseFloat(val) || 0;
        row.unitCost = cost;
        row.totalCost = (row.quantity || 0) * cost;
      } else {
        (row as any)[field] = val;
      }

      copy[index] = row;
      return copy;
    });
  };

  // Live calculations for current form
  const formCalculations = useMemo(() => {
    const materialCost = components.reduce((sum, c) => sum + (c.totalCost || 0), 0);
    const totalBatchCost = materialCost + Number(overheadCost || 0);
    const costPerUnit =
      outputYield > 0 ? totalBatchCost / outputYield : totalBatchCost;

    const finishedProd = products.find((p) => p.id === finishedProductId);
    const sellingPrice = finishedProd ? finishedProd.sellingPrice : 0;
    const profitPerUnit = sellingPrice - costPerUnit;
    const marginPercent =
      sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;

    return {
      materialCost,
      totalBatchCost,
      costPerUnit,
      sellingPrice,
      profitPerUnit,
      marginPercent,
    };
  }, [components, overheadCost, outputYield, finishedProductId, products]);

  // Form submit
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !finishedProductId || components.length === 0) return;

    const finished = products.find((p) => p.id === finishedProductId);
    const autoNameAr = nameAr.trim() || (finished ? `وصفة ${finished.name.ar}` : code);
    const autoNameEn = nameEn.trim() || (finished ? `Recipe ${finished.name.en}` : code);

    const payload: Omit<InventoryBom, "id"> = {
      code: code.trim().toUpperCase(),
      name: { ar: autoNameAr, en: autoNameEn },
      finishedProductId,
      outputYield: Math.max(1, Number(outputYield) || 1),
      outputUnitId,
      overheadCost: Math.max(0, Number(overheadCost) || 0),
      components,
      notes: notes.trim() || undefined,
      status,
    };

    if (editingBom) {
      onUpdateBom(editingBom.id, payload);
    } else {
      onAddBom(payload);
    }
    setIsFormModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    onDeleteBom(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  // Filtered recipes
  const filteredBoms = useMemo(() => {
    return boms.filter((bom) => {
      if (statusFilter !== "all" && bom.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const finished = products.find((p) => p.id === bom.finishedProductId);
      return (
        bom.code.toLowerCase().includes(q) ||
        bom.name.ar.toLowerCase().includes(q) ||
        bom.name.en.toLowerCase().includes(q) ||
        (finished &&
          (finished.name.ar.toLowerCase().includes(q) ||
            finished.name.en.toLowerCase().includes(q)))
      );
    });
  }, [boms, statusFilter, searchQuery, products]);

  // Calculations for any BOM
  const calculateBomSummary = (bom: InventoryBom) => {
    const materialCost = bom.components.reduce(
      (sum, c) => sum + (c.totalCost || c.quantity * c.unitCost || 0),
      0
    );
    const totalBatchCost = materialCost + bom.overheadCost;
    const unitCost = bom.outputYield > 0 ? totalBatchCost / bom.outputYield : 0;
    const finishedProd = products.find((p) => p.id === bom.finishedProductId);
    const sellingPrice = finishedProd ? finishedProd.sellingPrice : 0;
    const marginPercent =
      sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : 0;

    return {
      materialCost,
      totalBatchCost,
      unitCost,
      sellingPrice,
      marginPercent,
      finishedProd,
    };
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="surface-panel rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search
              className={cn(
                "w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 pointer-events-none",
                dir === "rtl" ? "right-3" : "left-3"
              )}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={pick({
                ar: "بحث بكود الوصفة، اسم المنتج النهائي أو المكونات...",
                en: "Search recipe code, finished product or ingredients...",
              })}
              className={cn(
                "w-full text-xs h-9 bg-background/80 rounded-lg border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary/50",
                dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
              )}
            />
          </div>

          {/* Action button */}
          <div className="flex items-center gap-2">
            <Btn
              variant="primary"
              size="sm"
              onClick={openAddModal}
              className="gap-1.5 shadow-sm text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>
                {pick({ ar: "إنشاء شجرة منتج جديدة (BOM)", en: "Create Recipe / BOM" })}
              </span>
            </Btn>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-xs">
          <span className="text-muted-foreground font-medium me-1">
            {pick({ ar: "حالة الوصفة:", en: "Recipe Status:" })}
          </span>
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-2.5 py-1 rounded-md transition-colors font-medium",
              statusFilter === "all"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground"
            )}
          >
            {pick({ ar: "الكل", en: "All" })} ({boms.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={cn(
              "px-2.5 py-1 rounded-md transition-colors font-medium",
              statusFilter === "active"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground"
            )}
          >
            {pick({ ar: "نشطة ومعتمدة", en: "Active" })} (
            {boms.filter((b) => b.status === "active").length})
          </button>
          <button
            onClick={() => setStatusFilter("draft")}
            className={cn(
              "px-2.5 py-1 rounded-md transition-colors font-medium",
              statusFilter === "draft"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground"
            )}
          >
            {pick({ ar: "مسودة تجريبية", en: "Draft" })} (
            {boms.filter((b) => b.status === "draft").length})
          </button>
        </div>
      </div>

      {/* BOM Recipes Table */}
      <div className="surface-panel rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={[
            {
              header: pick({ ar: "كود الوصفة", en: "BOM Code" }),
              className: "w-32",
            },
            {
              header: pick({ ar: "المنتج التام (النهائي)", en: "Finished Product" }),
            },
            {
              header: pick({ ar: "إنتاج الدفعة", en: "Batch Yield" }),
              className: "w-28 text-center",
            },
            {
              header: pick({ ar: "المكونات", en: "Ingredients" }),
              className: "w-24 text-center",
            },
            {
              header: pick({ ar: "تكلفة الدفعة", en: "Batch Cost" }),
              className: "w-28 text-end",
            },
            {
              header: pick({ ar: "تكلفة القطعة", en: "Unit Cost" }),
              className: "w-28 text-end",
            },
            {
              header: pick({ ar: "سعر البيع", en: "Selling Price" }),
              className: "w-28 text-end",
            },
            {
              header: pick({ ar: "هامش الربح", en: "Margin %" }),
              className: "w-28 text-center",
            },
            {
              header: pick({ ar: "الحالة", en: "Status" }),
              className: "w-24 text-center",
            },
            {
              header: pick({ ar: "إجراءات", en: "Actions" }),
              className: "w-28 text-end",
            },
          ]}
        >
          {filteredBoms.length === 0 ? (
            <tr>
              <td
                colSpan={10}
                className="py-12 text-center text-muted-foreground text-sm"
              >
                <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {pick({
                  ar: "لا توجد وصفات أو أشجار منتجات مطابقة",
                  en: "No BOM recipes found matching filter",
                })}
              </td>
            </tr>
          ) : (
            filteredBoms.map((bom) => {
              const summary = calculateBomSummary(bom);
              const outputUnit = units.find((u) => u.id === bom.outputUnitId);

              return (
                <tr
                  key={bom.id}
                  className="hover:bg-muted/40 transition-colors border-b border-border/40 last:border-b-0 text-xs"
                >
                  {/* Code */}
                  <Td className="font-mono font-bold text-primary">
                    {bom.code}
                  </Td>

                  {/* Finished Item */}
                  <Td>
                    <div className="font-semibold text-foreground">
                      {summary.finishedProd
                        ? pick(summary.finishedProd.name)
                        : pick(bom.name)}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono">
                        {summary.finishedProd?.sku || "N/A"}
                      </span>
                      <span>•</span>
                      <span>{pick(bom.name)}</span>
                    </div>
                  </Td>

                  {/* Batch Yield */}
                  <Td className="text-center font-mono">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-foreground font-medium">
                      {n(bom.outputYield)}{" "}
                      <span className="text-muted-foreground text-[10px]">
                        {outputUnit ? pick(outputUnit.name) : "وحدة"}
                      </span>
                    </span>
                  </Td>

                  {/* Ingredients Count */}
                  <Td className="text-center font-mono">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground font-medium">
                      <Layers className="w-3 h-3 text-primary/70" />
                      {n(bom.components.length)}
                    </span>
                  </Td>

                  {/* Batch Cost */}
                  <Td className="text-end font-mono font-medium text-foreground">
                    {n(summary.totalBatchCost, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{" "}
                    <span className="text-[10px] text-muted-foreground">ج.م</span>
                  </Td>

                  {/* Unit Cost */}
                  <Td className="text-end font-mono font-bold text-foreground">
                    {n(summary.unitCost, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] text-muted-foreground">ج.م</span>
                  </Td>

                  {/* Selling Price */}
                  <Td className="text-end font-mono font-semibold text-foreground">
                    {n(summary.sellingPrice, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}{" "}
                    <span className="text-[10px] text-muted-foreground">ج.م</span>
                  </Td>

                  {/* Margin % */}
                  <Td className="text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded-full",
                        summary.marginPercent >= 50
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : summary.marginPercent >= 30
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      )}
                    >
                      <TrendingUp className="w-3 h-3" />
                      {n(summary.marginPercent, { maximumFractionDigits: 1 })}%
                    </span>
                  </Td>

                  {/* Status */}
                  <Td className="text-center">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-[10px] font-medium",
                        bom.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {bom.status === "active"
                        ? pick({ ar: "معتمدة", en: "Active" })
                        : pick({ ar: "مسودة", en: "Draft" })}
                    </span>
                  </Td>

                  {/* Actions */}
                  <Td className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setViewingBom(bom)}
                        title={pick({ ar: "عرض التفاصيل", en: "View Breakdown" })}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                      </button>
                      <button
                        onClick={() => openEditModal(bom)}
                        title={pick({ ar: "تعديل", en: "Edit" })}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteCandidate(bom)}
                        title={pick({ ar: "حذف", en: "Delete" })}
                        className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </DataTable>
      </div>

      {/* Add / Edit BOM Modal */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent
          className="max-w-3xl max-h-[92vh] overflow-y-auto border-0 shadow-2xl"
          dir={dir}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <ChefHat className="w-5 h-5 text-primary" />
              <span>
                {editingBom
                  ? pick({
                      ar: "تعديل شجرة المنتج والوصفة (BOM)",
                      en: "Edit Recipe & Bill of Materials",
                    })
                  : pick({
                      ar: "إنشاء شجرة منتج ووصفة تصنيع جديدة",
                      en: "Create New Recipe & BOM",
                    })}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2 text-xs">
            {/* Header info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
              {/* Code */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "كود الوصفة", en: "BOM Code" })} *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="BOM-KSHR-LUX"
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Finished Product */}
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({
                    ar: "المنتج النهائي المُصنّع",
                    en: "Finished Product",
                  })}{" "}
                  *
                </label>
                <select
                  required
                  value={finishedProductId}
                  onChange={(e) => {
                    setFinishedProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod && !nameAr) {
                      setNameAr(`وصفة ${prod.name.ar}`);
                      setNameEn(`Recipe for ${prod.name.en}`);
                    }
                  }}
                  className="w-full h-8 px-2 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">
                    {pick({ ar: "اختر المنتج النهائي...", en: "Select Finished Product..." })}
                  </option>
                  {products
                    .filter((p) => !p.isRawMaterial)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {pick(p.name)} ({n(p.sellingPrice)} ج.م)
                      </option>
                    ))}
                </select>
              </div>

              {/* Recipe Name Ar */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "اسم الوصفة (عربي)", en: "Recipe Name (AR)" })}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="وصفة كشري حلو سوبر لوكس"
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Recipe Name En */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "اسم الوصفة (إنجليزي)", en: "Recipe Name (EN)" })}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Sweet Koshary Recipe"
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "حالة الاعتماد", en: "Recipe Status" })}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BomStatus)}
                  className="w-full h-8 px-2 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active">
                    {pick({ ar: "نشطة ومعتمدة للإنتاج", en: "Active & Approved" })}
                  </option>
                  <option value="draft">
                    {pick({ ar: "مسودة قيد الاختبار", en: "Draft / Testing" })}
                  </option>
                </select>
              </div>

              {/* Batch Yield */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "كمية إنتاج الدفعة", en: "Batch Yield Quantity" })}{" "}
                  *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={outputYield}
                  onChange={(e) =>
                    setOutputYield(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Output Unit */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "وحدة الإنتاج", en: "Yield Unit" })} *
                </label>
                <select
                  value={outputUnitId}
                  onChange={(e) => setOutputUnitId(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} — {pick(u.name)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Overhead Cost */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({
                    ar: "المصاريف المباشرة والعمالة (ج.م)",
                    en: "Labor & Overhead (EGP)",
                  })}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={overheadCost}
                  onChange={(e) =>
                    setOverheadCost(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Ingredients Component Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground text-xs">
                    {pick({
                      ar: "المكونات والخامات المطلوبة للدفعة",
                      en: "Raw Ingredients Required per Batch",
                    })}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono">
                    {components.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addComponentRow}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>
                    {pick({ ar: "إضافة مادة خام", en: "Add Ingredient" })}
                  </span>
                </button>
              </div>

              <div className="border border-border/60 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-start">
                  <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3 text-start font-medium">
                        {pick({ ar: "المادة الخام / الصنف", en: "Raw Material" })}
                      </th>
                      <th className="py-2 px-3 text-center font-medium w-28">
                        {pick({ ar: "الكمية", en: "Quantity" })}
                      </th>
                      <th className="py-2 px-3 text-start font-medium w-28">
                        {pick({ ar: "الوحدة", en: "Unit" })}
                      </th>
                      <th className="py-2 px-3 text-end font-medium w-28">
                        {pick({ ar: "تكلفة الوحدة", en: "Unit Cost" })}
                      </th>
                      <th className="py-2 px-3 text-end font-medium w-28">
                        {pick({ ar: "الإجمالي", en: "Total Cost" })}
                      </th>
                      <th className="py-2 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {components.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-6 text-center text-muted-foreground text-xs"
                        >
                          {pick({
                            ar: "لم يتم إضافة خامات بعد. اضغط 'إضافة مادة خام' للبدء.",
                            en: "No ingredients added yet. Click 'Add Ingredient' to start.",
                          })}
                        </td>
                      </tr>
                    ) : (
                      components.map((comp, idx) => {
                        return (
                          <tr key={idx} className="hover:bg-muted/20">
                            {/* Material Selector */}
                            <td className="py-1.5 px-3">
                              <select
                                required
                                value={comp.componentProductId || comp.rawMaterialProductId || ""}
                                onChange={(e) =>
                                  updateComponent(
                                    idx,
                                    "componentProductId",
                                    e.target.value
                                  )
                                }
                                className="w-full h-8 px-2 text-xs rounded-md border border-border/70 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                {products.map((prod) => (
                                  <option key={prod.id} value={prod.id}>
                                    {prod.sku} — {pick(prod.name)}{" "}
                                    {prod.isRawMaterial ? "(خام)" : ""}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Quantity */}
                            <td className="py-1.5 px-3">
                              <input
                                type="number"
                                min="0.001"
                                step="any"
                                required
                                value={comp.quantity}
                                onChange={(e) =>
                                  updateComponent(idx, "quantity", e.target.value)
                                }
                                className="w-full h-8 px-2 text-xs text-center rounded-md border border-border/70 bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </td>

                            {/* Unit */}
                            <td className="py-1.5 px-3">
                              <select
                                value={comp.unitId}
                                onChange={(e) =>
                                  updateComponent(idx, "unitId", e.target.value)
                                }
                                className="w-full h-8 px-2 text-xs rounded-md border border-border/70 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                {units.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.code}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Unit Cost */}
                            <td className="py-1.5 px-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={comp.unitCost}
                                onChange={(e) =>
                                  updateComponent(idx, "unitCost", e.target.value)
                                }
                                className="w-full h-8 px-2 text-xs text-end rounded-md border border-border/70 bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </td>

                            {/* Total Cost */}
                            <td className="py-1.5 px-3 text-end font-mono font-semibold text-foreground">
                              {n(comp.totalCost || 0, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}{" "}
                              <span className="text-[10px] text-muted-foreground">
                                ج.م
                              </span>
                            </td>

                            {/* Delete */}
                            <td className="py-1.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeComponentRow(idx)}
                                className="p-1 rounded text-muted-foreground hover:text-rose-600 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Financial Costing Calculator Widget */}
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center gap-1.5 text-primary font-semibold text-xs">
                <Calculator className="w-4 h-4" />
                <span>
                  {pick({
                    ar: "ملخص التكلفة وهامش الربحية التقديري للدفعة",
                    en: "Estimated Cost & Profit Margin Summary",
                  })}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                {/* Material Cost */}
                <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">
                    {pick({ ar: "تكلفة المواد الخام", en: "Material Cost" })}
                  </span>
                  <span className="text-sm font-mono font-bold text-foreground">
                    {n(formCalculations.materialCost, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{" "}
                    <span className="text-[10px] text-muted-foreground">ج.م</span>
                  </span>
                </div>

                {/* Total Batch Cost */}
                <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">
                    {pick({ ar: "إجمالي تكلفة الدفعة", en: "Total Batch Cost" })}
                  </span>
                  <span className="text-sm font-mono font-bold text-foreground">
                    {n(formCalculations.totalBatchCost, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{" "}
                    <span className="text-[10px] text-muted-foreground">ج.م</span>
                  </span>
                </div>

                {/* Unit Cost */}
                <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">
                    {pick({ ar: "تكلفة القطعة الواحدة", en: "Cost Per Unit" })}
                  </span>
                  <span className="text-sm font-mono font-extrabold text-primary">
                    {n(formCalculations.costPerUnit, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] text-muted-foreground">ج.م</span>
                  </span>
                </div>

                {/* Margin % */}
                <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">
                    {pick({ ar: "هامش الربح المتوقع", en: "Projected Margin" })}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-mono font-bold",
                      formCalculations.marginPercent >= 40
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {n(formCalculations.marginPercent, {
                      maximumFractionDigits: 1,
                    })}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">
                {pick({
                  ar: "ملاحظات وتعليمات التحضير الخاصة بالشيف",
                  en: "Chef's Preparation Notes & Instructions",
                })}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={pick({
                  ar: "مثال: يتم خلط الكنافة المحمصة بالزبدة في النهاية للحفاظ على القرمشة...",
                  en: "e.g. Mix toasted konafa at the end to maintain crunchiness...",
                })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
              <Btn
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setIsFormModalOpen(false)}
              >
                {pick({ ar: "إلغاء", en: "Cancel" })}
              </Btn>
              <Btn variant="primary" size="sm" type="submit" className="gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>
                  {editingBom
                    ? pick({ ar: "حفظ تعديلات الوصفة", en: "Update BOM Recipe" })
                    : pick({ ar: "اعتماد وحفظ الوصفة", en: "Save BOM Recipe" })}
                </span>
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Recipe Breakdown Modal */}
      <Dialog
        open={!!viewingBom}
        onOpenChange={(open) => !open && setViewingBom(null)}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl"
          dir={dir}
        >
          {viewingBom && (() => {
            const summary = calculateBomSummary(viewingBom);
            const outputUnit = units.find((u) => u.id === viewingBom.outputUnitId);

            return (
              <div className="space-y-4 pt-1 text-xs">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                      <ChefHat className="w-5 h-5 text-primary" />
                      <span>{pick(viewingBom.name)}</span>
                    </DialogTitle>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {viewingBom.code}
                    </span>
                  </div>
                </DialogHeader>

                {/* Product info banner */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      {pick({ ar: "المنتج النهائي المُصنّع", en: "Finished Product" })}
                    </span>
                    <span className="font-bold text-sm text-foreground">
                      {summary.finishedProd ? pick(summary.finishedProd.name) : "N/A"}
                    </span>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      SKU: {summary.finishedProd?.sku}
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="text-[10px] text-muted-foreground block">
                      {pick({ ar: "إنتاج الدفعة الكاملة", en: "Full Batch Output" })}
                    </span>
                    <span className="font-mono font-bold text-base text-primary">
                      {n(viewingBom.outputYield)}{" "}
                      <span className="text-xs">
                        {outputUnit ? pick(outputUnit.name) : "قطعة"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Ingredients table */}
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {pick({
                        ar: "المكونات والمقادير لكل دفعة",
                        en: "Recipe Ingredients & Portions per Batch",
                      })}
                    </span>
                  </h4>
                  <div className="border border-border/60 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground">
                        <tr>
                          <th className="py-2 px-3 text-start">
                            {pick({ ar: "المادة الخام", en: "Raw Material" })}
                          </th>
                          <th className="py-2 px-3 text-center w-24">
                            {pick({ ar: "الكمية", en: "Quantity" })}
                          </th>
                          <th className="py-2 px-3 text-end w-24">
                            {pick({ ar: "سعر الوحدة", en: "Unit Cost" })}
                          </th>
                          <th className="py-2 px-3 text-end w-28">
                            {pick({ ar: "الإجمالي", en: "Line Total" })}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {viewingBom.components.map((c, i) => {
                          const matId = c.componentProductId || c.rawMaterialProductId;
                          const rawProd = products.find((p) => p.id === matId);
                          const unitObj = units.find((u) => u.id === c.unitId);
                          return (
                            <tr key={i} className="hover:bg-muted/20">
                              <td className="py-2 px-3 font-medium text-foreground">
                                {rawProd ? pick(rawProd.name) : matId}
                              </td>
                              <td className="py-2 px-3 text-center font-mono">
                                {n(c.quantity)}{" "}
                                <span className="text-[10px] text-muted-foreground">
                                  {unitObj ? unitObj.code : ""}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-end font-mono text-muted-foreground">
                                {n(c.unitCost)} ج.م
                              </td>
                              <td className="py-2 px-3 text-end font-mono font-semibold text-foreground">
                                {n(c.totalCost || c.quantity * c.unitCost, {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })}{" "}
                                <span className="text-[10px]">ج.م</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cost breakdown summary card */}
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">
                      {pick({ ar: "إجمالي تكلفة المواد الخام:", en: "Total Raw Materials:" })}
                    </span>
                    <span className="font-mono font-semibold">
                      {n(summary.materialCost, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{" "}
                      ج.م
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">
                      {pick({
                        ar: "المصاريف التشغيلية والعمالة المباشرة:",
                        en: "Overhead & Labor Cost:",
                      })}
                    </span>
                    <span className="font-mono font-semibold">
                      {n(viewingBom.overheadCost, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{" "}
                      ج.م
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40 font-bold text-foreground">
                    <span>
                      {pick({ ar: "إجمالي تكلفة الدفعة:", en: "Total Batch Cost:" })}
                    </span>
                    <span className="font-mono text-primary">
                      {n(summary.totalBatchCost, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{" "}
                      ج.م
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center">
                    <div className="p-2 rounded bg-background/80">
                      <span className="text-[10px] text-muted-foreground block">
                        {pick({ ar: "تكلفة القطعة", en: "Unit Cost" })}
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {n(summary.unitCost, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ج.م
                      </span>
                    </div>
                    <div className="p-2 rounded bg-background/80">
                      <span className="text-[10px] text-muted-foreground block">
                        {pick({ ar: "سعر بيع الصنف", en: "Selling Price" })}
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {n(summary.sellingPrice)} ج.م
                      </span>
                    </div>
                    <div className="p-2 rounded bg-background/80">
                      <span className="text-[10px] text-muted-foreground block">
                        {pick({ ar: "نسبة الربح", en: "Profit Margin" })}
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {n(summary.marginPercent, { maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {viewingBom.notes && (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground block mb-1">
                      {pick({ ar: "ملاحظات الشيف:", en: "Chef Notes:" })}
                    </span>
                    {viewingBom.notes}
                  </div>
                )}

                <div className="flex items-center justify-end pt-2">
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingBom(null)}
                  >
                    {pick({ ar: "إغلاق", en: "Close" })}
                  </Btn>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteCandidate}
        onOpenChange={(open) => !open && setDeleteCandidate(null)}
      >
        <DialogContent className="max-w-md border-0 shadow-xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm font-semibold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>
                {pick({
                  ar: "تأكيد حذف شجرة المنتج (BOM)",
                  en: "Confirm Recipe Deletion",
                })}
              </span>
            </DialogTitle>
          </DialogHeader>

          {deleteCandidate && (
            <div className="space-y-3 py-2 text-xs">
              <p className="text-muted-foreground">
                {pick({
                  ar: `هل أنت متأكد من رغبتك في حذف الوصفة "${pick(
                    deleteCandidate.name
                  )}" (${deleteCandidate.code})؟`,
                  en: `Are you sure you want to delete BOM recipe "${pick(
                    deleteCandidate.name
                  )}" (${deleteCandidate.code})?`,
                })}
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteCandidate(null)}
                >
                  {pick({ ar: "إلغاء", en: "Cancel" })}
                </Btn>
                <Btn
                  variant="danger"
                  size="sm"
                  onClick={handleConfirmDelete}
                  className="gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{pick({ ar: "تأكيد الحذف", en: "Delete" })}</span>
                </Btn>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
