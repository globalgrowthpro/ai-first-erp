import { useState, useMemo } from "react";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
  Check,
  Layers,
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
  InventoryCategory,
  InventoryProduct,
  CategoryType,
} from "@/lib/inventory-store";

interface CategoriesTabProps {
  categories: InventoryCategory[];
  products: InventoryProduct[];
  onAddCategory: (cat: Omit<InventoryCategory, "id">) => void;
  onUpdateCategory: (id: string, updates: Partial<InventoryCategory>) => void;
  onDeleteCategory: (id: string) => void;
}

export function CategoriesTab({
  categories,
  products,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoriesTabProps) {
  const { t, pick, n, dir } = useI18n();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<InventoryCategory | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [type, setType] = useState<CategoryType>("finished");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");

  const openAddModal = () => {
    setEditingCategory(null);
    setCode(`CAT-${Math.floor(100 + Math.random() * 900)}`);
    setNameAr("");
    setNameEn("");
    setType("finished");
    setDescAr("");
    setDescEn("");
    setIsFormModalOpen(true);
  };

  const openEditModal = (c: InventoryCategory) => {
    setEditingCategory(c);
    setCode(c.code);
    setNameAr(c.name.ar);
    setNameEn(c.name.en);
    setType(c.type);
    setDescAr(c.description.ar);
    setDescEn(c.description.en);
    setIsFormModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nameAr) return;

    if (editingCategory) {
      onUpdateCategory(editingCategory.id, {
        code,
        name: { ar: nameAr, en: nameEn || nameAr },
        type,
        description: { ar: descAr, en: descEn || descAr },
      });
    } else {
      onAddCategory({
        code,
        name: { ar: nameAr, en: nameEn || nameAr },
        type,
        description: { ar: descAr, en: descEn || descAr },
      });
    }
    setIsFormModalOpen(false);
  };

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories.filter((c) => {
      if (selectedType !== "all" && c.type !== selectedType) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.ar.toLowerCase().includes(q) ||
        c.name.en.toLowerCase().includes(q)
      );
    });
  }, [categories, searchQuery, selectedType]);

  const getTypeBadge = (type: CategoryType) => {
    switch (type) {
      case "finished":
        return {
          label: t("finishedProducts"),
          className: "bg-primary/10 text-primary border-primary/30",
        };
      case "raw":
        return {
          label: t("rawMaterials"),
          className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        };
      case "packaging":
        return {
          label: t("packaging"),
          className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
        };
      case "semi_finished":
        return {
          label: t("semiFinished"),
          className: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Actions */}
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
              placeholder={pick("بحث في التصنيفات بالكود أو الاسم...", "Search categories by code or name...")}
              className={cn(
                "w-full rounded-lg border border-border bg-card py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                dir === "rtl" ? "pr-9 pl-8" : "pl-9 pr-8",
              )}
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="all">{pick("جميع الأنواع", "All Types")}</option>
            <option value="finished">{t("finishedProducts")}</option>
            <option value="raw">{t("rawMaterials")}</option>
            <option value="packaging">{t("packaging")}</option>
            <option value="semi_finished">{t("semiFinished")}</option>
          </select>

          {/* Add Category Button */}
          <Btn onClick={openAddModal} variant="solid" className="ms-auto text-xs">
            <Plus className="size-3.5" />
            {t("addCategory")}
          </Btn>
        </div>
      </div>

      {/* Categories Table Card */}
      <div className="surface-panel rounded-xl overflow-x-auto shadow-sm">
        <DataTable
          head={[
            pick("كود التصنيف", "Category Code"),
            pick("اسم التصنيف", "Category Name"),
            pick("طبيعة التصنيف", "Type"),
            pick("عدد الأصناف المسجلة", "Assigned Products"),
            pick("الوصف / الاستخدام", "Description"),
            pick("الإجراءات", "Actions"),
          ]}
        >
          {filteredCategories.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-muted-foreground">
                <Tag className="mx-auto size-8 opacity-40 mb-2" />
                <p className="font-semibold">
                  {pick("لا توجد تصنيفات مطابقة للبحث", "No categories matching your search")}
                </p>
              </td>
            </tr>
          ) : (
            filteredCategories.map((c) => {
              const count = products.filter((p) => p.categoryId === c.id).length;
              const badge = getTypeBadge(c.type);

              return (
                <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                  <Td className="num font-bold">
                    <span className="font-mono text-xs bg-secondary border border-border px-2 py-0.5 rounded-md">
                      {c.code}
                    </span>
                  </Td>

                  <Td className="font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      <Tag className="size-4 text-primary shrink-0" />
                      <span>{pick(c.name.ar, c.name.en)}</span>
                    </div>
                  </Td>

                  <Td>
                    <span
                      className={cn(
                        "inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase",
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  </Td>

                  <Td className="num font-bold">
                    <span className="inline-flex items-center gap-1 text-sm">
                      {n(count)}
                      <span className="text-xs text-muted-foreground font-normal">
                        {pick("صنف", "items")}
                      </span>
                    </span>
                  </Td>

                  <Td className="text-xs text-muted-foreground max-w-xs truncate">
                    {pick(c.description.ar, c.description.en)}
                  </Td>

                  <Td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="rounded-lg border border-border bg-card p-1 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-sm"
                        title={t("edit")}
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(c)}
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

      {/* Add / Edit Category Modal */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="border border-border/80 shadow-2xl rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase flex items-center gap-2">
              <Tag className="size-5 text-primary" />
              {editingCategory ? pick("تعديل التصنيف", "Edit Category") : t("addCategory")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("كود التصنيف", "Category Code")} *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CAT-DESSERT"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("طبيعة التصنيف", "Category Type")}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CategoryType)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="finished">{t("finishedProducts")}</option>
                  <option value="raw">{t("rawMaterials")}</option>
                  <option value="packaging">{t("packaging")}</option>
                  <option value="semi_finished">{t("semiFinished")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                {pick("اسم التصنيف (عربي)", "Category Name (Arabic)")} *
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: طواجن الفرن الساخنة"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                {pick("اسم التصنيف (إنجليزي)", "Category Name (English)")}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Hot Oven Tajins"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                {pick("الوصف / الملاحظات (عربي)", "Description (Arabic)")}
              </label>
              <textarea
                rows={2}
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                placeholder="وصف مختصر لمحتويات واستخدام هذا التصنيف..."
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-border/70">
              <Btn type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
                {t("cancel")}
              </Btn>
              <Btn type="submit" variant="solid">
                <Check className="size-4" />
                {editingCategory ? pick("حفظ التعديلات", "Save Changes") : pick("إضافة التصنيف", "Add Category")}
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
              {deleteCandidate.code} — {pick(deleteCandidate.name.ar, deleteCandidate.name.en)}
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
                  onDeleteCategory(deleteCandidate.id);
                  setDeleteCandidate(null);
                }
              }}
            >
              {pick("نعم، احذف التصنيف", "Yes, Delete Category")}
            </Btn>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
