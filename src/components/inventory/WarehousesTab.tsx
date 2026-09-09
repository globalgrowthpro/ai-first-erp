import { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
  Check,
  Phone,
  MapPin,
  User,
  Package,
  Sparkles,
  Layers,
  ThermometerSnowflake,
  Store,
  ChefHat,
  Warehouse,
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
  InventoryWarehouse,
  InventoryProduct,
  WarehouseType,
} from "@/lib/inventory-store";

interface WarehousesTabProps {
  warehouses: InventoryWarehouse[];
  products: InventoryProduct[];
  onAddWarehouse: (wh: Omit<InventoryWarehouse, "id">) => void;
  onUpdateWarehouse: (id: string, updates: Partial<InventoryWarehouse>) => void;
  onDeleteWarehouse: (id: string) => void;
}

export function WarehousesTab({
  warehouses,
  products,
  onAddWarehouse,
  onUpdateWarehouse,
  onDeleteWarehouse,
}: WarehousesTabProps) {
  const { t, pick, n, dir } = useI18n();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<InventoryWarehouse | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<InventoryWarehouse | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [type, setType] = useState<WarehouseType>("retail");
  const [addressAr, setAddressAr] = useState("");
  const [addressEn, setAddressEn] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [capacityPercent, setCapacityPercent] = useState<number>(60);
  const [status, setStatus] = useState<"active" | "inactive" | "maintenance">("active");

  const openAddModal = () => {
    setEditingWarehouse(null);
    setCode(`WH-${Date.now().toString().slice(-4)}`);
    setNameAr("");
    setNameEn("");
    setType("retail");
    setAddressAr("");
    setAddressEn("");
    setManagerName("");
    setPhone("+20 1");
    setCapacityPercent(50);
    setStatus("active");
    setIsFormModalOpen(true);
  };

  const openEditModal = (wh: InventoryWarehouse) => {
    setEditingWarehouse(wh);
    setCode(wh.code);
    setNameAr(wh.name.ar);
    setNameEn(wh.name.en);
    setType(wh.type);
    setAddressAr(wh.address.ar);
    setAddressEn(wh.address.en);
    setManagerName(wh.managerName);
    setPhone(wh.phone);
    setCapacityPercent(wh.capacityPercent);
    setStatus(wh.status);
    setIsFormModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !nameEn.trim() || !code.trim()) return;

    const payload = {
      code: code.trim().toUpperCase(),
      name: { ar: nameAr.trim(), en: nameEn.trim() },
      type,
      address: {
        ar: addressAr.trim() || nameAr.trim(),
        en: addressEn.trim() || nameEn.trim(),
      },
      managerName: managerName.trim() || "غير محدد",
      phone: phone.trim() || "N/A",
      capacityPercent: Math.min(100, Math.max(0, capacityPercent)),
      status,
    };

    if (editingWarehouse) {
      onUpdateWarehouse(editingWarehouse.id, payload);
    } else {
      onAddWarehouse(payload);
    }
    setIsFormModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    onDeleteWarehouse(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  // Filter warehouses
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((wh) => {
      if (selectedType !== "all" && wh.type !== selectedType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        wh.code.toLowerCase().includes(q) ||
        wh.name.ar.toLowerCase().includes(q) ||
        wh.name.en.toLowerCase().includes(q) ||
        wh.managerName.toLowerCase().includes(q) ||
        wh.phone.toLowerCase().includes(q) ||
        wh.address.ar.toLowerCase().includes(q) ||
        wh.address.en.toLowerCase().includes(q)
      );
    });
  }, [warehouses, selectedType, searchQuery]);

  // Type metadata
  const typeMeta: Record<
    WarehouseType,
    { label: { ar: string; en: string }; icon: any; color: string; bg: string }
  > = {
    kitchen: {
      label: { ar: "مطبخ مركزي ومصنع", en: "Central Kitchen" },
      icon: ChefHat,
      color: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    retail: {
      label: { ar: "فرع بيع وتوزيع", en: "Retail Branch" },
      icon: Store,
      color: "text-blue-700 dark:text-blue-300",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    cold_storage: {
      label: { ar: "تجميد وتبريد مركزي", en: "Cold Storage" },
      icon: ThermometerSnowflake,
      color: "text-cyan-700 dark:text-cyan-300",
      bg: "bg-cyan-500/10 border-cyan-500/20",
    },
    dry_storage: {
      label: { ar: "مستودع جاف وخامات", en: "Dry Storage" },
      icon: Warehouse,
      color: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
  };

  const getProductCount = (whId: string) =>
    products.filter((p) => p.warehouseId === whId).length;

  return (
    <div className="space-y-4">
      {/* Action Header & Filters */}
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
                ar: "بحث بكود المستودع، الاسم، الفرع، أو المسؤول...",
                en: "Search by code, branch name, or manager...",
              })}
              className={cn(
                "w-full text-xs h-9 bg-background/80 rounded-lg border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary/50",
                dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
              )}
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Btn
              variant="primary"
              size="sm"
              onClick={openAddModal}
              className="gap-1.5 shadow-sm text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>
                {pick({ ar: "إضافة مستودع / فرع", en: "Add Facility" })}
              </span>
            </Btn>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-xs">
          <span className="text-muted-foreground font-medium me-1">
            {pick({ ar: "نوع المنشأة:", en: "Facility Type:" })}
          </span>
          <button
            onClick={() => setSelectedType("all")}
            className={cn(
              "px-2.5 py-1 rounded-md transition-colors font-medium",
              selectedType === "all"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground"
            )}
          >
            {pick({ ar: "الكل", en: "All" })} ({warehouses.length})
          </button>
          {(
            ["kitchen", "retail", "cold_storage", "dry_storage"] as WarehouseType[]
          ).map((tType) => {
            const count = warehouses.filter((w) => w.type === tType).length;
            const meta = typeMeta[tType];
            return (
              <button
                key={tType}
                onClick={() => setSelectedType(tType)}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5",
                  selectedType === tType
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

      {/* Facilities Table */}
      <div className="surface-panel rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={[
            {
              header: pick({ ar: "الكود", en: "Code" }),
              className: "w-28",
            },
            {
              header: pick({ ar: "اسم المنشأة / الفرع", en: "Facility Name" }),
            },
            {
              header: pick({ ar: "نوع النشاط", en: "Type" }),
              className: "w-36",
            },
            {
              header: pick({ ar: "العنوان والموقع", en: "Location" }),
            },
            {
              header: pick({ ar: "المسؤول والهاتف", en: "Manager" }),
            },
            {
              header: pick({ ar: "نسبة الإشغال", en: "Capacity" }),
              className: "w-36 text-center",
            },
            {
              header: pick({ ar: "الأصناف", en: "SKUs" }),
              className: "w-20 text-center",
            },
            {
              header: pick({ ar: "الحالة", en: "Status" }),
              className: "w-20 text-center",
            },
            {
              header: pick({ ar: "إجراءات", en: "Actions" }),
              className: "w-24 text-end",
            },
          ]}
        >
          {filteredWarehouses.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="py-12 text-center text-muted-foreground text-sm"
              >
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {pick({
                  ar: "لا توجد مستودعات أو فروع مطابقة للبحث",
                  en: "No facilities found matching your filter",
                })}
              </td>
            </tr>
          ) : (
            filteredWarehouses.map((wh) => {
              const meta = typeMeta[wh.type] || typeMeta.retail;
              const skuCount = getProductCount(wh.id);
              const isHigh = wh.capacityPercent >= 80;
              const isModerate =
                wh.capacityPercent >= 60 && wh.capacityPercent < 80;

              return (
                <tr
                  key={wh.id}
                  className="hover:bg-muted/40 transition-colors border-b border-border/40 last:border-b-0 text-xs"
                >
                  {/* Code */}
                  <Td className="font-mono font-semibold text-primary">
                    {wh.code}
                  </Td>

                  {/* Name */}
                  <Td>
                    <div className="font-medium text-foreground">
                      {pick(wh.name)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {dir === "rtl" ? wh.name.en : wh.name.ar}
                    </div>
                  </Td>

                  {/* Type */}
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

                  {/* Address */}
                  <Td>
                    <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                      <span className="truncate max-w-[220px]">
                        {pick(wh.address)}
                      </span>
                    </div>
                  </Td>

                  {/* Manager & Phone */}
                  <Td>
                    <div className="flex items-center gap-1 text-foreground font-medium text-[11px]">
                      <User className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span>{wh.managerName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-mono">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span dir="ltr">{wh.phone}</span>
                    </div>
                  </Td>

                  {/* Capacity Bar */}
                  <Td>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">
                          {n(wh.capacityPercent)}%
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold",
                            isHigh
                              ? "text-rose-600 dark:text-rose-400"
                              : isModerate
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {isHigh
                            ? pick({ ar: "ممتلئ تقريباً", en: "Near Full" })
                            : isModerate
                            ? pick({ ar: "متوسط", en: "Optimal" })
                            : pick({ ar: "مستقر", en: "Spacious" })}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            isHigh
                              ? "bg-rose-500"
                              : isModerate
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          )}
                          style={{ width: `${wh.capacityPercent}%` }}
                        />
                      </div>
                    </div>
                  </Td>

                  {/* SKUs */}
                  <Td className="text-center font-mono font-medium">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground">
                      <Package className="w-3 h-3 text-muted-foreground" />
                      {n(skuCount)}
                    </span>
                  </Td>

                  {/* Status */}
                  <Td className="text-center">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-[10px] font-medium",
                        wh.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {wh.status === "active"
                        ? pick({ ar: "نشط", en: "Active" })
                        : pick({ ar: "معطل", en: "Inactive" })}
                    </span>
                  </Td>

                  {/* Actions */}
                  <Td className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(wh)}
                        title={pick({ ar: "تعديل", en: "Edit" })}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteCandidate(wh)}
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

      {/* Add / Edit Warehouse Dialog */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent
          className="max-w-xl max-h-[90vh] overflow-y-auto border-0 shadow-xl"
          dir={dir}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="w-5 h-5 text-primary" />
              <span>
                {editingWarehouse
                  ? pick({
                      ar: "تعديل بيانات المنشأة / الفرع",
                      en: "Edit Facility / Warehouse",
                    })
                  : pick({
                      ar: "إضافة منشأة أو فرع جديد",
                      en: "Add New Facility / Branch",
                    })}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Code */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "كود المنشأة", en: "Facility Code" })} *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="WH-KORBA"
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "نوع النشاط", en: "Facility Type" })} *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as WarehouseType)}
                  className="w-full h-8 px-2 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="kitchen">
                    {pick({
                      ar: "مطبخ مركزي ومصنع تجهيز",
                      en: "Central Kitchen & Factory",
                    })}
                  </option>
                  <option value="retail">
                    {pick({
                      ar: "فرع بيع وتوزيع مباشر",
                      en: "Retail Branch / Shop",
                    })}
                  </option>
                  <option value="cold_storage">
                    {pick({
                      ar: "مستودع تبريد وتجميد مركزي",
                      en: "Cold Storage Hub",
                    })}
                  </option>
                  <option value="dry_storage">
                    {pick({
                      ar: "مستودع خامات وتعبئة جافة",
                      en: "Dry Storage Hub",
                    })}
                  </option>
                </select>
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
                  placeholder="فرع الكوربة — مصر الجديدة"
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
                  placeholder="Heliopolis Branch"
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Address Ar */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "العنوان (عربي)", en: "Address (AR)" })}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={addressAr}
                  onChange={(e) => setAddressAr(e.target.value)}
                  placeholder="شارع بغداد، الكوربة، القاهرة"
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Address En */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "العنوان (إنجليزي)", en: "Address (EN)" })}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={addressEn}
                  onChange={(e) => setAddressEn(e.target.value)}
                  placeholder="Baghdad St, Korba, Cairo"
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Manager */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "اسم مدير المنشأة", en: "Manager Name" })}
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="أ. محمود سامي"
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "رقم هاتف المنشأة", en: "Contact Phone" })}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 100 000 0000"
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Capacity % */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({
                    ar: `نسبة الإشغال الحالية (${capacityPercent}%)`,
                    en: `Current Capacity (${capacityPercent}%)`,
                  })}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={capacityPercent}
                  onChange={(e) =>
                    setCapacityPercent(parseInt(e.target.value) || 0)
                  }
                  className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer mt-2"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "حالة التشغيل", en: "Operational Status" })}
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "active" | "inactive")
                  }
                  className="w-full h-8 px-2 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active">
                    {pick({ ar: "نشط ويعمل", en: "Active & Operational" })}
                  </option>
                  <option value="inactive">
                    {pick({ ar: "معطل أو تحت الصيانة", en: "Inactive / Maintenance" })}
                  </option>
                </select>
              </div>
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
                  {editingWarehouse
                    ? pick({ ar: "حفظ التعديلات", en: "Update Facility" })
                    : pick({ ar: "إنشاء المنشأة", en: "Create Facility" })}
                </span>
              </Btn>
            </div>
          </form>
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
                  ar: "تأكيد حذف المنشأة / المستودع",
                  en: "Confirm Facility Deletion",
                })}
              </span>
            </DialogTitle>
          </DialogHeader>

          {deleteCandidate && (
            <div className="space-y-3 py-2 text-xs">
              <p className="text-muted-foreground">
                {pick({
                  ar: `هل أنت متأكد من رغبتك في حذف المنشأة "${pick(
                    deleteCandidate.name
                  )}" (${deleteCandidate.code})؟`,
                  en: `Are you sure you want to delete facility "${pick(
                    deleteCandidate.name
                  )}" (${deleteCandidate.code})?`,
                })}
              </p>

              {getProductCount(deleteCandidate.id) > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    {pick({
                      ar: `تحذير: هذا المستودع يحتوي على (${getProductCount(
                        deleteCandidate.id
                      )}) صنف مسجل. سيتم فصل المنتجات عن هذا المستودع.`,
                      en: `Warning: This warehouse currently has (${getProductCount(
                        deleteCandidate.id
                      )}) linked items.`,
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
