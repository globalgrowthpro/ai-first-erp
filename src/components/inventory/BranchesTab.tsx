import { useState } from "react";
import {
  Building2,
  Plus,
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  User,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Search,
  Check,
  Building,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { DataTable, Td, Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Branch } from "@/lib/inventory-store";

interface BranchesTabProps {
  branches: Branch[];
  onRefresh?: () => void;
}

export function BranchesTab({ branches, onRefresh }: BranchesTabProps) {
  const { pick, dir } = useI18n();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterOwner, setFilterOwner] = useState<"all" | "wazeer" | "franchise">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form State
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [managerName, setManagerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("القاهرة");
  const [district, setDistrict] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [isWazeerOwned, setIsWazeerOwned] = useState(true); // Is Wazeer owning? Yes / No

  const openAddModal = () => {
    setEditingBranch(null);
    setNameAr("");
    setNameEn("");
    setCode(`br-${Math.floor(100 + Math.random() * 900)}`);
    setManagerName("");
    setEmail("");
    setPhone("");
    setCity("القاهرة");
    setDistrict("");
    setMapUrl("");
    setIsWazeerOwned(true);
    setIsModalOpen(true);
  };

  const openEditModal = (b: Branch) => {
    setEditingBranch(b);
    setNameAr(b.name.ar);
    setNameEn(b.name.en);
    setCode(b.code);
    setManagerName(b.managerName || "");
    setEmail(b.email || "");
    setPhone(b.phone || "");
    setCity(b.city || "القاهرة");
    setDistrict(b.district || "");
    setMapUrl(b.mapUrl || "");
    setIsWazeerOwned(b.isWazeerOwned);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !code) {
      toast.error(pick("يرجى إدخال اسم الفرع والكود", "Please enter branch name and code"));
      return;
    }

    try {
      if (editingBranch) {
        const { error } = await supabase
          .from("branches")
          .update({
            name_ar: nameAr,
            name_en: nameEn || nameAr,
            code,
            manager_name: managerName || null,
            email: email || null,
            phone: phone || null,
            city: city || null,
            district: district || null,
            map_url: mapUrl || null,
            is_wazeer_owned: isWazeerOwned,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingBranch.id);

        if (error) throw error;
        toast.success(pick("تم تحديث بيانات الفرع بنجاح", "Branch updated successfully"));
      } else {
        const { error } = await supabase
          .from("branches")
          .insert({
            name_ar: nameAr,
            name_en: nameEn || nameAr,
            code,
            manager_name: managerName || null,
            email: email || null,
            phone: phone || null,
            city: city || null,
            district: district || null,
            map_url: mapUrl || null,
            is_wazeer_owned: isWazeerOwned,
          });

        if (error) throw error;
        toast.success(pick("تم إضافة الفرع الجديد بنجاح", "Branch created successfully"));
      }

      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Branch save error:", err);
      toast.error(err.message || "Failed to save branch");
    }
  };

  const handleDelete = async (b: Branch) => {
    if (!confirm(pick(`هل أنت متأكد من حذف ${b.name.ar}؟`, `Delete branch ${b.name.en}?`))) return;
    try {
      const { error } = await supabase.from("branches").delete().eq("id", b.id);
      if (error) throw error;
      toast.success(pick("تم حذف الفرع", "Branch deleted"));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete branch");
    }
  };

  const filtered = branches.filter((b) => {
    if (filterOwner === "wazeer" && !b.isWazeerOwned) return false;
    if (filterOwner === "franchise" && b.isWazeerOwned) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.name.ar.toLowerCase().includes(q) ||
      b.name.en.toLowerCase().includes(q) ||
      (b.city && b.city.toLowerCase().includes(q)) ||
      (b.district && b.district.toLowerCase().includes(q)) ||
      (b.managerName && b.managerName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="surface-panel rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search
              className={cn(
                "absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground",
                dir === "rtl" ? "right-3" : "left-3"
              )}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={pick("بحث بالاسم، المدير، المدينة أو المنطقة...", "Search by name, manager, city...")}
              className={cn(
                "w-full rounded-lg border border-border bg-card py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary",
                dir === "rtl" ? "pr-9 pl-8" : "pl-9 pr-8"
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value as any)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">{pick("جميع الفروع والملكيات", "All Ownerships")}</option>
              <option value="wazeer">{pick("مملوك لوزير الحلو (Yes)", "Wazeer Owned (Yes)")}</option>
              <option value="franchise">{pick("فرنشايز / غير مملوك (No)", "Franchise (No)")}</option>
            </select>

            <Btn onClick={openAddModal} variant="solid" className="text-xs gap-1.5 shadow-xs">
              <Plus className="size-3.5" />
              <span>{pick("إضافة فرع جديد", "Add Branch")}</span>
            </Btn>
          </div>
        </div>
      </div>

      {/* Branches Table */}
      <div className="surface-panel rounded-xl overflow-x-auto shadow-sm">
        <DataTable
          head={[
            pick("كود الفرع", "Code"),
            pick("اسم الفرع (Name)", "Branch Name"),
            pick("المدير المسؤول (Manager)", "Manager"),
            pick("بيانات الاتصال (Email & Phone)", "Contact"),
            pick("المدينة والمنطقة (City / District)", "Location"),
            pick("الموقع بالخريطة (Map)", "Map"),
            pick("ملكية وزير الحلو؟ (Is Wazeer Owning?)", "Is Wazeer Owning?"),
            pick("الإجراءات", "Actions"),
          ]}
        >
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-muted-foreground">
                <Building className="mx-auto size-8 opacity-40 mb-2" />
                <p className="font-semibold">{pick("لا توجد فروع مطابقة", "No branches found")}</p>
              </td>
            </tr>
          ) : (
            filtered.map((b) => (
              <tr key={b.id} className="hover:bg-secondary/40 transition-colors">
                {/* Code */}
                <Td className="font-mono text-xs font-bold text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-md bg-secondary border border-border">
                    {b.code}
                  </span>
                </Td>

                {/* Name */}
                <Td className="font-bold text-foreground">
                  <div>
                    <p className="text-sm font-black">{pick(b.name.ar, b.name.en)}</p>
                    <p className="text-xs text-muted-foreground font-normal">{pick(b.name.en, b.name.ar)}</p>
                  </div>
                </Td>

                {/* Manager */}
                <Td>
                  {b.managerName ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <User className="size-3.5 text-primary shrink-0" />
                      <span>{b.managerName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </Td>

                {/* Contact */}
                <Td className="text-xs">
                  <div className="space-y-0.5">
                    {b.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground font-mono">
                        <Phone className="size-3 text-emerald-600" />
                        <span dir="ltr">{b.phone}</span>
                      </div>
                    )}
                    {b.email && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="size-3 text-blue-600" />
                        <span>{b.email}</span>
                      </div>
                    )}
                    {!b.phone && !b.email && <span className="text-muted-foreground">—</span>}
                  </div>
                </Td>

                {/* Location */}
                <Td className="text-xs">
                  <div className="flex items-center gap-1 font-medium text-foreground">
                    <MapPin className="size-3.5 text-rose-500 shrink-0" />
                    <span>{b.city || "—"}</span>
                    {b.district && <span className="text-muted-foreground">({b.district})</span>}
                  </div>
                </Td>

                {/* Map */}
                <Td className="text-center">
                  {b.mapUrl ? (
                    <a
                      href={b.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold transition-all shadow-2xs"
                    >
                      <MapPin className="size-3" />
                      <span>{pick("الخريطة", "View Map")}</span>
                      <ExternalLink className="size-2.5 opacity-70" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </Td>

                {/* Is Wazeer owning? Yes / No */}
                <Td className="text-center">
                  {b.isWazeerOwned ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-black shadow-2xs">
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      <span>{pick("نعم (Yes) — مملوك لوزير الحلو", "Yes (Wazeer Owned)")}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-black shadow-2xs">
                      <XCircle className="size-3.5 text-amber-600" />
                      <span>{pick("لا (No) — فرنشايز / شريك", "No (Franchise Partner)")}</span>
                    </span>
                  )}
                </Td>

                {/* Actions */}
                <Td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(b)}
                      className="rounded-lg border border-border bg-card p-1 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-sm"
                      title={pick("تعديل", "Edit")}
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b)}
                      className="rounded-lg border border-border bg-card p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors shadow-sm"
                      title={pick("حذف", "Delete")}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))
          )}
        </DataTable>
      </div>

      {/* Add / Edit Branch Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="border border-border/80 shadow-2xl rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              {editingBranch ? pick("تعديل بيانات الفرع", "Edit Branch Details") : pick("إضافة فرع جديد", "Add New Branch")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("اسم الفرع (عربي) *", "Branch Name (Arabic) *")}
                </label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: فرع الكوربة — مصر الجديدة"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("اسم الفرع (إنجليزي)", "Branch Name (English)")}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Korba — Heliopolis Branch"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("كود الفرع (Code) *", "Branch Code *")}
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. korba, maadi"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("المدير المسؤول (Manager)", "Branch Manager")}
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="مثال: أحمد سالم"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("رقم الهاتف (Phone)", "Phone Number")}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 100 000 0000"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("البريد الإلكتروني (Email)", "Email Address")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="branch@wazeer-elhelw.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("المدينة (City)", "City")}
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثال: القاهرة"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  {pick("المنطقة / الحي (District)", "District")}
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="مثال: مصر الجديدة"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                {pick("رابط الخريطة (Map URL)", "Google Maps URL")}
              </label>
              <input
                type="url"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="https://maps.google.com/?q=..."
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Is Wazeer owning? Yes / No */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-primary/25 bg-primary/5 shadow-2xs">
              <div>
                <label htmlFor="wazeer-owning-switch" className="text-xs font-bold block text-foreground cursor-pointer">
                  {pick("هل الفرع مملوك لوزير الحلو؟ (Is Wazeer owning?)", "Is Wazeer owning? (Yes / No)")}
                </label>
                <span className="text-[11px] text-muted-foreground block">
                  {isWazeerOwned
                    ? pick("نعم (Yes) — الفرع مملوك بالكامل لشركة وزير الحلو", "Yes — Fully owned by Wazeer El-Helw")
                    : pick("لا (No) — الفرع يعمل بنظام الفرنشايز أو الشراكة", "No — Franchise or partner-operated")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="wazeer-owning-switch"
                  checked={isWazeerOwned}
                  onCheckedChange={setIsWazeerOwned}
                />
                <span className={cn("text-xs font-black min-w-[36px]", isWazeerOwned ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600")}>
                  {isWazeerOwned ? pick("نعم (Yes)", "Yes") : pick("لا (No)", "No")}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-border/70">
              <Btn type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                {pick("إلغاء", "Cancel")}
              </Btn>
              <Btn type="submit" variant="solid">
                <Check className="size-4" />
                {editingBranch ? pick("حفظ التعديلات", "Save Changes") : pick("إضافة الفرع", "Add Branch")}
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
