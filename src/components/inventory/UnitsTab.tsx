import { useState, useMemo } from "react";
import {
  Scale,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
  Check,
  Package,
  Layers,
  Sparkles,
  Droplets,
  Box,
  Hash,
  ArrowRightLeft,
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
  InventoryUnit,
  InventoryProduct,
  UnitCategory,
} from "@/lib/inventory-store";

interface UnitsTabProps {
  units: InventoryUnit[];
  products: InventoryProduct[];
  onAddUnit: (unit: Omit<InventoryUnit, "id">) => void;
  onUpdateUnit: (id: string, updates: Partial<InventoryUnit>) => void;
  onDeleteUnit: (id: string) => void;
}

export function UnitsTab({
  units,
  products,
  onAddUnit,
  onUpdateUnit,
  onDeleteUnit,
}: UnitsTabProps) {
  const { t, pick, n, dir } = useI18n();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<InventoryUnit | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<InventoryUnit | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [category, setCategory] = useState<UnitCategory>("count");
  const [isBaseUnit, setIsBaseUnit] = useState(true);
  const [baseUnitCode, setBaseUnitCode] = useState("");
  const [conversionFactor, setConversionFactor] = useState<number>(1);

  const openAddModal = () => {
    setEditingUnit(null);
    setCode("");
    setNameAr("");
    setNameEn("");
    setCategory("count");
    setIsBaseUnit(true);
    setBaseUnitCode("");
    setConversionFactor(1);
    setIsFormModalOpen(true);
  };

  const openEditModal = (unit: InventoryUnit) => {
    setEditingUnit(unit);
    setCode(unit.code);
    setNameAr(unit.name.ar);
    setNameEn(unit.name.en);
    setCategory(unit.category);
    setIsBaseUnit(unit.isBaseUnit);
    setBaseUnitCode(unit.baseUnitCode || "");
    setConversionFactor(unit.conversionFactor || 1);
    setIsFormModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !nameAr.trim() || !nameEn.trim()) return;

    const payload: Omit<InventoryUnit, "id"> = {
      code: code.trim().toUpperCase(),
      name: { ar: nameAr.trim(), en: nameEn.trim() },
      category,
      isBaseUnit,
      baseUnitCode: isBaseUnit ? undefined : baseUnitCode.trim().toUpperCase() || undefined,
      conversionFactor: isBaseUnit ? 1 : Number(conversionFactor) || 1,
    };

    if (editingUnit) {
      onUpdateUnit(editingUnit.id, payload);
    } else {
      onAddUnit(payload);
    }
    setIsFormModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    onDeleteUnit(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  // Filter units
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (selectedCategory !== "all" && u.category !== selectedCategory)
        return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.code.toLowerCase().includes(q) ||
        u.name.ar.toLowerCase().includes(q) ||
        u.name.en.toLowerCase().includes(q)
      );
    });
  }, [units, selectedCategory, searchQuery]);

  // Category metadata
  const categoryMeta: Record<
    UnitCategory,
    { label: { ar: string; en: string }; icon: any; color: string; bg: string }
  > = {
    weight: {
      label: { ar: "وزن وكتلة", en: "Weight" },
      icon: Scale,
      color: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    volume: {
      label: { ar: "حجم وسوائل", en: "Volume" },
      icon: Droplets,
      color: "text-cyan-700 dark:text-cyan-300",
      bg: "bg-cyan-500/10 border-cyan-500/20",
    },
    count: {
      label: { ar: "عدد وقطع", en: "Count / Pieces" },
      icon: Hash,
      color: "text-indigo-700 dark:text-indigo-300",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
    packaging: {
      label: { ar: "تعبئة وكرتون", en: "Packaging" },
      icon: Box,
      color: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
  };

  const getProductCount = (unitId: string) =>
    products.filter((p) => p.unitId === unitId).length;

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="surface-panel rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
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
                ar: "بحث برمز الوحدة، الاسم بالعربية أو الإنجليزية...",
                en: "Search unit symbol, Arabic or English name...",
              })}
              className={cn(
                "w-full text-xs h-9 bg-background/80 rounded-lg border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary/50",
                dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
              )}
            />
          </div>

          {/* Add Button */}
          <div className="flex items-center gap-2">
            <Btn
              variant="primary"
              size="sm"
              onClick={openAddModal}
              className="gap-1.5 shadow-sm text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>
                {pick({ ar: "إضافة وحدة قياس", en: "Add Unit of Measure" })}
              </span>
            </Btn>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-xs">
          <span className="text-muted-foreground font-medium me-1">
            {pick({ ar: "نوع القياس:", en: "Measurement Type:" })}
          </span>
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-2.5 py-1 rounded-md transition-colors font-medium",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground"
            )}
          >
            {pick({ ar: "الكل", en: "All" })} ({units.length})
          </button>
          {(
            ["count", "weight", "volume", "packaging"] as UnitCategory[]
          ).map((uCat) => {
            const count = units.filter((u) => u.category === uCat).length;
            const meta = categoryMeta[uCat];
            return (
              <button
                key={uCat}
                onClick={() => setSelectedCategory(uCat)}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5",
                  selectedCategory === uCat
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                )}
              >
                <meta.icon className="w-3.5 h-3.5" />
                <span>{pick(meta.label)}</span>
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Units Table */}
      <div className="surface-panel rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={[
            {
              header: pick({ ar: "رمز الوحدة", en: "Unit Symbol" }),
              className: "w-28",
            },
            {
              header: pick({ ar: "اسم الوحدة", en: "Unit Name" }),
            },
            {
              header: pick({ ar: "نوع القياس", en: "Category" }),
              className: "w-36",
            },
            {
              header: pick({ ar: "صفة الوحدة", en: "Unit Nature" }),
              className: "w-32 text-center",
            },
            {
              header: pick({ ar: "معادلة التحويل", en: "Conversion Formula" }),
            },
            {
              header: pick({ ar: "الأصناف المرتبطة", en: "Linked SKUs" }),
              className: "w-28 text-center",
            },
            {
              header: pick({ ar: "إجراءات", en: "Actions" }),
              className: "w-24 text-end",
            },
          ]}
        >
          {filteredUnits.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="py-12 text-center text-muted-foreground text-sm"
              >
                <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {pick({
                  ar: "لا توجد وحدات قياس مطابقة",
                  en: "No units found matching filter",
                })}
              </td>
            </tr>
          ) : (
            filteredUnits.map((u) => {
              const meta = categoryMeta[u.category] || categoryMeta.count;
              const productCount = getProductCount(u.id);

              return (
                <tr
                  key={u.id}
                  className="hover:bg-muted/40 transition-colors border-b border-border/40 last:border-b-0 text-xs"
                >
                  {/* Code */}
                  <Td className="font-mono font-bold text-primary tracking-wide">
                    {u.code}
                  </Td>

                  {/* Name */}
                  <Td>
                    <div className="font-medium text-foreground">
                      {pick(u.name)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {dir === "rtl" ? u.name.en : u.name.ar}
                    </div>
                  </Td>

                  {/* Category */}
                  <Td>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                        meta.bg,
                        meta.color
                      )}
                    >
                      <meta.icon className="w-3 h-3" />
                      {pick(meta.label)}
                    </span>
                  </Td>

                  {/* Nature */}
                  <Td className="text-center">
                    {u.isBaseUnit ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        {pick({ ar: "وحدة أساسية", en: "Base Unit" })}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                        {pick({ ar: "مشتقة", en: "Derived" })}
                      </span>
                    )}
                  </Td>

                  {/* Conversion */}
                  <Td>
                    {u.isBaseUnit ? (
                      <span className="text-muted-foreground text-[11px] italic">
                        {pick({
                          ar: "1.0 (الوحدة المرجعية الأساسية)",
                          en: "1.0 (Standard Benchmark Unit)",
                        })}
                      </span>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2 py-0.5 rounded bg-muted/60 text-foreground">
                        <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                        <span>
                          1 {u.code} = {n(u.conversionFactor || 1)}{" "}
                          {u.baseUnitCode || "BASE"}
                        </span>
                      </div>
                    )}
                  </Td>

                  {/* Products */}
                  <Td className="text-center font-mono font-medium">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground">
                      <Package className="w-3 h-3 text-muted-foreground" />
                      {n(productCount)}
                    </span>
                  </Td>

                  {/* Actions */}
                  <Td className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(u)}
                        title={pick({ ar: "تعديل", en: "Edit" })}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteCandidate(u)}
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

      {/* Add / Edit Unit Modal */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-md border-0 shadow-xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Scale className="w-5 h-5 text-primary" />
              <span>
                {editingUnit
                  ? pick({ ar: "تعديل وحدة القياس", en: "Edit Unit of Measure" })
                  : pick({ ar: "إضافة وحدة قياس جديدة", en: "Add Unit of Measure" })}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2 text-xs">
            <div className="space-y-3">
              {/* Code */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "رمز الوحدة المختصر", en: "Unit Symbol / Code" })}{" "}
                  *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="KG, BOX, TRAY..."
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Name Ar */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "الاسم بالعربية", en: "Arabic Name" })} *
                </label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="كيلوجرام، طبق، كرتونة..."
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Name En */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "الاسم بالإنجليزية", en: "English Name" })} *
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Kilogram, Portion, Carton..."
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "نوع وفئة القياس", en: "Measurement Category" })}{" "}
                  *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as UnitCategory)}
                  className="w-full h-8 px-2 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="count">
                    {pick({ ar: "عدد وقطع (Count)", en: "Count / Pieces" })}
                  </option>
                  <option value="weight">
                    {pick({ ar: "وزن وكتلة (Weight)", en: "Weight / Mass" })}
                  </option>
                  <option value="volume">
                    {pick({ ar: "حجم وسوائل (Volume)", en: "Volume / Liquid" })}
                  </option>
                  <option value="packaging">
                    {pick({ ar: "تعبئة وكرتون (Packaging)", en: "Packaging" })}
                  </option>
                </select>
              </div>

              {/* Is Base Unit toggle */}
              <div className="pt-2 border-t border-border/40">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBaseUnit}
                    onChange={(e) => setIsBaseUnit(e.target.checked)}
                    className="rounded accent-primary w-4 h-4 cursor-pointer"
                  />
                  <span className="font-semibold text-foreground">
                    {pick({
                      ar: "وحدة أساسية مرجعية (Base Unit)",
                      en: "Is Base Standard Unit",
                    })}
                  </span>
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5 ps-6">
                  {pick({
                    ar: "إذا تم تفعيلها، تكون هذه الوحدة هي الأساس لحساب التكلفة والتحويلات.",
                    en: "If enabled, this unit will serve as the benchmark for conversions.",
                  })}
                </p>
              </div>

              {/* If not base unit: conversion fields */}
              {!isBaseUnit && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-3">
                  <div>
                    <label className="block font-medium mb-1 text-muted-foreground">
                      {pick({
                        ar: "الوحدة المرجعية الأساسية",
                        en: "Base Benchmark Unit",
                      })}
                    </label>
                    <select
                      value={baseUnitCode}
                      onChange={(e) => setBaseUnitCode(e.target.value)}
                      className="w-full h-8 px-2 text-xs rounded-lg border border-border/80 bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">
                        {pick({ ar: "اختر الوحدة الأساسية", en: "Select Base Unit" })}
                      </option>
                      {units
                        .filter((u) => u.isBaseUnit)
                        .map((bu) => (
                          <option key={bu.id} value={bu.code}>
                            {bu.code} — {pick(bu.name)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-muted-foreground">
                      {pick({
                        ar: "معامل التحويل (كم وحدة أساسية في هذه الوحدة؟)",
                        en: "Conversion Factor",
                      })}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      required={!isBaseUnit}
                      value={conversionFactor}
                      onChange={(e) =>
                        setConversionFactor(parseFloat(e.target.value) || 1)
                      }
                      placeholder="e.g. 12 or 0.001"
                      className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {pick({
                        ar: `مثال: 1 ${code || "BOX"} = ${conversionFactor} ${
                          baseUnitCode || "PCS"
                        }`,
                        en: `e.g. 1 ${code || "BOX"} = ${conversionFactor} ${
                          baseUnitCode || "PCS"
                        }`,
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>

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
                  {editingUnit
                    ? pick({ ar: "حفظ التعديلات", en: "Update Unit" })
                    : pick({ ar: "إنشاء الوحدة", en: "Create Unit" })}
                </span>
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
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
                  ar: "تأكيد حذف وحدة القياس",
                  en: "Confirm Unit Deletion",
                })}
              </span>
            </DialogTitle>
          </DialogHeader>

          {deleteCandidate && (
            <div className="space-y-3 py-2 text-xs">
              <p className="text-muted-foreground">
                {pick({
                  ar: `هل أنت متأكد من رغبتك في حذف وحدة القياس "${pick(
                    deleteCandidate.name
                  )}" (${deleteCandidate.code})؟`,
                  en: `Are you sure you want to delete unit "${pick(
                    deleteCandidate.name
                  )}" (${deleteCandidate.code})?`,
                })}
              </p>

              {getProductCount(deleteCandidate.id) > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    {pick({
                      ar: `تحذير: توجد (${getProductCount(
                        deleteCandidate.id
                      )}) أصناف مسجلة بهذه الوحدة.`,
                      en: `Warning: (${getProductCount(
                        deleteCandidate.id
                      )}) products currently use this unit.`,
                    })}
                  </p>
                </div>
              )}

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
