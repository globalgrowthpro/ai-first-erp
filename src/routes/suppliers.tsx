import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Building2,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Eye,
  Edit2,
  Trash2,
  CreditCard,
  Building,
  CheckCircle2,
  Filter,
  DollarSign,
  Briefcase,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Receipt,
  RotateCcw,
  Boxes,
  Truck,
  Package,
} from "lucide-react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, PageHeader, Panel, Td, TablePagination, usePagination } from "@/components/kit";
import {
  usePartnersStore,
  type Partner,
  type PartnerGroup,
} from "@/lib/partners-store";
import { PartnerFormModal } from "@/components/partners/PartnerFormModal";
import { PartnerDetailPage } from "@/components/partners/PartnerDetailPage";
import { PartnerPaymentModal } from "@/components/partners/PartnerPaymentModal";

export const Route = createFileRoute("/suppliers")({
  validateSearch: (search: Record<string, unknown>): { id?: string | undefined } => {
    const rawId = search["id"];
    return {
      id: typeof rawId === "string" ? rawId : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "الموردون وجهات التوريد — Hafez ERP" },
      {
        name: "description",
        content: "دليل الموردين المعتمدين، خامات الحلويات، الألبان، الكرتون والتغليف، الخدمات اللوجستية والأرصدة الدائنة.",
      },
      { property: "og:title", content: "الموردون وجهات التوريد — Hafez ERP" },
      { property: "og:description", content: "Raw Material Vendors, Packaging Suppliers, Payables & Purchase Orders." },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { t, pick, money, dir, lang } = useI18n();
  const isRtl = dir === "rtl";
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const {
    partners,
    addPartner,
    updatePartner,
    deletePartner,
    toggleStatus,
    recordPayment,
  } = usePartnersStore();

  // Filter only suppliers
  const allSuppliers = useMemo(() => {
    return partners.filter((p) => p.type === "supplier");
  }, [partners]);

  const [activeFilter, setActiveFilter] = useState<
    "all" | "raw_ingredients" | "packaging" | "services" | "has_balance" | "inactive"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit / Create Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  // Quick Payment Modal state
  const [paymentSupplier, setPaymentSupplier] = useState<Partner | null>(null);

  // Active supplier for the dedicated full details view
  const activeSupplier = useMemo(() => {
    if (!search.id) return null;
    const q = decodeURIComponent(String(search.id)).toLowerCase().trim();
    if (!q) return null;

    // 1. Direct match by ID, Code, or Transaction Doc Ref (PO-XXXX)
    const directMatch = allSuppliers.find(
      (p) =>
        p.id.toLowerCase() === q ||
        p.code.toLowerCase() === q ||
        p.transactions?.some(
          (tx) =>
            tx.docRef?.toLowerCase() === q ||
            q.includes(tx.docRef?.toLowerCase() || "___")
        )
    );
    if (directMatch) return directMatch;

    // 2. Full Name / Substring Match
    const nameMatch = allSuppliers.find(
      (p) =>
        p.name.ar.toLowerCase().includes(q) ||
        p.name.en.toLowerCase().includes(q) ||
        q.includes(p.name.ar.toLowerCase()) ||
        q.includes(p.name.en.toLowerCase())
    );
    if (nameMatch) return nameMatch;

    return null;
  }, [search.id, allSuppliers]);

  // Financial KPIs for Suppliers
  const totalSuppliersCount = allSuppliers.length;
  const activeSuppliersCount = allSuppliers.filter((s) => s.status === "active").length;
  const totalPayables = allSuppliers.reduce(
    (sum, s) => sum + (s.balance > 0 ? s.balance : 0),
    0
  );
  const rawIngredientsCount = allSuppliers.filter((s) => s.group === "raw_ingredients").length;

  // Filtered suppliers list
  const filteredSuppliers = useMemo(() => {
    return allSuppliers.filter((s) => {
      if (activeFilter === "raw_ingredients" && s.group !== "raw_ingredients") return false;
      if (activeFilter === "packaging" && s.group !== "packaging") return false;
      if (activeFilter === "services" && s.group !== "services") return false;
      if (activeFilter === "has_balance" && s.balance <= 0) return false;
      if (activeFilter === "inactive" && s.status !== "inactive") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = s.code.toLowerCase().includes(q);
        const nameMatch =
          s.name.ar.toLowerCase().includes(q) ||
          s.name.en.toLowerCase().includes(q);
        const phoneMatch = s.phone.includes(q);
        const taxMatch = s.taxNumber.includes(q);
        const contactMatch = s.contactPerson.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !phoneMatch && !taxMatch && !contactMatch) return false;
      }
      return true;
    });
  }, [allSuppliers, activeFilter, searchQuery]);

  const {
    currentPage: supplierPage,
    setCurrentPage: setSupplierPage,
    paginatedItems: paginatedSuppliers,
  } = usePagination(filteredSuppliers, 25);

  const handleExportExcel = () => {
    if (!filteredSuppliers.length) {
      alert(pick("لا توجد سجلات موردين للتصدير وفق الفلاتر الحالية", "No supplier records matching current filters to export"));
      return;
    }

    const exportRows = filteredSuppliers.map((s, idx) => ({
      "م": idx + 1,
      "كود المورد": s.code,
      "اسم المورد": pick(s.name.ar, s.name.en),
      "تصنيف التوريد":
        s.group === "raw_ingredients"
          ? "خامات غذائية وألبان"
          : s.group === "packaging"
          ? "كرتون وتغليف ومطبوعات"
          : "خدمات ولوجستيات",
      "مسؤول المبيعات / الاتصال": s.contactPerson || "-",
      "الهاتف": s.phone,
      "البريد الإلكتروني": s.email || "-",
      "السجل التجاري / الضريبي": s.taxNumber || "-",
      "الرصيد المستحق للمورد (ج.م)": s.balance,
      "الحد الائتماني": s.creditLimit,
      "شروط السداد": s.paymentTerms,
      "الحالة": s.status === "active" ? "معتمد" : "مجمّد",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 30 },
      { wch: 24 },
      { wch: 22 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "دليل_الموردين");
    safeDownloadWorkbook(wb, `دليل_الموردين_المعتمدين_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // If search.id is provided and supplier is found, render the DEDICATED FULL DETAILS VIEW
  if (search.id && activeSupplier) {
    return (
      <>
        <PartnerDetailPage
          partner={activeSupplier}
          onBack={() => navigate({ search: {} })}
          onEdit={(partner) => {
            setEditingPartner(partner);
            setIsFormModalOpen(true);
          }}
          onToggleStatus={(id) => toggleStatus(id)}
          onRecordPayment={(partnerId, params) => recordPayment(partnerId, params)}
        />

        {/* Dedicated Supplier Edit Modal */}
        <PartnerFormModal
          open={isFormModalOpen}
          initialType="supplier"
          lockType={true}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingPartner(null);
          }}
          onSubmit={(partnerData) => {
            if (editingPartner) {
              updatePartner(editingPartner.id, partnerData);
            } else {
              addPartner(partnerData);
            }
          }}
          editingPartner={editingPartner}
        />
      </>
    );
  }

  // If search.id was provided but not found
  if (search.id && !activeSupplier) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-2xl border border-border bg-card text-center space-y-4 max-w-lg mx-auto mt-12">
          <div className="size-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="size-8" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {pick("لم يتم العثور على المورد المطلوب", "Supplier Not Found")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {pick(
              `لا توجد سجلات تطابق معرف المورد (${search.id}). ربما تم حذفه أو تغييره.`,
              `No records found matching Supplier ID (${search.id}).`
            )}
          </p>
          <Btn
            variant="solid"
            onClick={() => navigate({ search: {} })}
            className="gap-2 mx-auto"
          >
            {isRtl ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
            <span>{pick("العودة لدليل الموردين", "Back to Suppliers Directory")}</span>
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={pick("دليل الموردين وجهات التوريد", "Suppliers & Vendors Directory")}
        subtitle={pick(
          "سجل متكامل لموردي الخامات الغذائية والألبان، مواد التعبئة والتغليف، ومقدمي الخدمات اللوجستية",
          "Comprehensive ledger for raw ingredient vendors, dairy suppliers, confectionery packaging & logistics"
        )}
        actions={
          <div className="flex items-center gap-2">
            <Btn
              variant="outline"
              onClick={handleExportExcel}
              className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10 gap-1.5"
              title={pick("تصدير دليل الموردين إلى Excel", "Export to Excel")}
            >
              <FileSpreadsheet className="size-4" />
              <span className="hidden sm:inline">{pick("تصدير Excel", "Export Excel")}</span>
            </Btn>
            <Btn
              variant="solid"
              onClick={() => {
                setEditingPartner(null);
                setIsFormModalOpen(true);
              }}
              className="gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-sm font-bold"
            >
              <Plus className="size-4" />
              <span>{pick("إضافة مورد جديد", "Add Supplier")}</span>
            </Btn>
          </div>
        }
      />

      {/* Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={pick("إجمالي الموردين المسجلين", "Total Suppliers")}
          value={String(totalSuppliersCount)}
          accent="primary"
        />
        <KpiCard
          label={pick("موردون معتمدون ونشطون", "Verified Suppliers")}
          value={String(activeSuppliersCount)}
          accent="brand"
        />
        <KpiCard
          label={pick("أرصدة مستحقة للموردين (دائن)", "Total Payables")}
          value={money(totalPayables)}
          accent="ink"
        />
        <KpiCard
          label={pick("موردو خامات الحلويات والألبان", "Raw Ingredients Vendors")}
          value={String(rawIngredientsCount)}
          accent="gold"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full w-full sm:w-auto">
          {[
            { id: "all", label: pick("الكل", "All"), count: allSuppliers.length },
            {
              id: "raw_ingredients",
              label: pick("خامات غذائية وألبان", "Raw Ingredients"),
              count: allSuppliers.filter((s) => s.group === "raw_ingredients").length,
            },
            {
              id: "packaging",
              label: pick("كرتون وتعبئة وتغليف", "Packaging"),
              count: allSuppliers.filter((s) => s.group === "packaging").length,
            },
            {
              id: "services",
              label: pick("خدمات ولوجستيات", "Services & Logistics"),
              count: allSuppliers.filter((s) => s.group === "services").length,
            },
            {
              id: "has_balance",
              label: pick("أرصدة دائنة مستحقة", "Outstanding Payables"),
              count: allSuppliers.filter((s) => s.balance > 0).length,
            },
            {
              id: "inactive",
              label: pick("حسابات مجمّدة", "Inactive"),
              count: allSuppliers.filter((s) => s.status === "inactive").length,
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                activeFilter === item.id
                  ? "bg-primary text-primary-foreground shadow-sm scale-102"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeFilter === item.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-card text-foreground"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={pick(
              "بحث باسم المورد، الكود، الهاتف، أو الضريبي...",
              "Search supplier name, code, phone, tax..."
            )}
            className="w-full rounded-xl border border-border bg-secondary/50 ps-9 pe-8 py-2 text-xs outline-none focus:border-primary focus:bg-card transition-colors shadow-2xs font-semibold"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Suppliers Table / Panel */}
      <Panel
        title={pick("سجل الموردين وجهات التوريد", "Suppliers & Vendors Ledger")}
        aside={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">
              {pick(
                `إجمالي المعروض: ${filteredSuppliers.length} مورد`,
                `Showing: ${filteredSuppliers.length} suppliers`
              )}
            </span>
          </div>
        }
      >
        <DataTable
          head={[
            pick("كود المورد", "Supplier Code"),
            pick("اسم المورد والتصنيف", "Supplier & Category"),
            pick("مسؤول المبيعات والهاتف", "Sales Rep & Phone"),
            pick("السجل التجاري / الضريبي", "Tax / Commercial ID"),
            pick("شروط السداد والائتمان", "Payment Terms"),
            pick("الرصيد المستحق (دائن)", "Payables Balance"),
            pick("الحالة", "Status"),
            pick("إجراءات", "Actions"),
          ]}
        >
          {paginatedSuppliers.map((s) => {
            const groupBadge =
              s.group === "raw_ingredients"
                ? { label: pick("خامات غذائية وألبان", "Raw Ingredients"), class: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" }
                : s.group === "packaging"
                ? { label: pick("كرتون وتغليف ومطبوعات", "Packaging & Boxes"), class: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" }
                : { label: pick("خدمات ولوجستيات", "Logistics & Services"), class: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30" };

            return (
              <tr key={s.id} className="hover:bg-secondary/70 transition-colors">
                {/* Code */}
                <Td className="num font-bold">
                  <span className="font-mono text-primary font-black text-xs block">
                    {s.code}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-gold/25 text-gold-foreground font-black text-[9px] border border-gold/40">
                    SUPPLIER
                  </span>
                </Td>

                {/* Name & Category */}
                <Td>
                  <div className="space-y-0.5 max-w-[200px]">
                    <Link
                      to="/suppliers"
                      search={{ id: s.id }}
                      className="font-bold text-foreground text-xs hover:text-primary hover:underline transition-colors block truncate"
                    >
                      {pick(s.name.ar, s.name.en)}
                    </Link>
                    <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded-md border font-semibold ${groupBadge.class}`}>
                      {groupBadge.label}
                    </span>
                  </div>
                </Td>

                {/* Contact & Phone */}
                <Td>
                  <div className="space-y-0.5 text-xs">
                    <span className="font-medium text-foreground block truncate max-w-[140px]">
                      👤 {s.contactPerson || "-"}
                    </span>
                    <a
                      href={`tel:${s.phone}`}
                      className="text-[11px] text-muted-foreground hover:text-primary font-mono block transition-colors"
                      dir="ltr"
                    >
                      📞 {s.phone}
                    </a>
                  </div>
                </Td>

                {/* Tax ID */}
                <Td className="num text-xs font-mono text-muted-foreground">
                  {s.taxNumber || "-"}
                </Td>

                {/* Payment Terms */}
                <Td>
                  <div className="space-y-0.5 text-xs">
                    <span className="font-bold text-foreground block">
                      {s.paymentTerms === "cash"
                        ? pick("نقداً فوري عند الاستلام", "Cash on Delivery")
                        : s.paymentTerms === "15_days"
                        ? pick("آجل خلال 15 يوماً", "Net 15 Days")
                        : s.paymentTerms === "30_days"
                        ? pick("آجل خلال 30 يوماً", "Net 30 Days")
                        : pick("آجل خلال 60 يوماً", "Net 60 Days")}
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      {pick("الحد:", "Limit:")} {money(s.creditLimit)}
                    </span>
                  </div>
                </Td>

                {/* Balance (Payables) */}
                <Td className="num">
                  <span
                    className={`font-black text-sm font-mono block ${
                      s.balance > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {money(s.balance)}
                  </span>
                  {s.balance > 0 && (
                    <span className="text-[10px] text-rose-500 font-bold block">
                      {pick("مستحق للمورد", "Payable")}
                    </span>
                  )}
                </Td>

                {/* Status */}
                <Td>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      s.status === "active"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/30"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${s.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                    <span>{s.status === "active" ? pick("معتمد", "Active") : pick("مجمّد", "Inactive")}</span>
                  </span>
                </Td>

                {/* Actions */}
                <Td>
                  <div className="flex items-center gap-1">
                    {s.balance > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentSupplier(s)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                        title={pick("تسجيل سند صرف / سداد للمورد", "Record Payment to Supplier")}
                      >
                        <Receipt className="size-3.5" />
                      </button>
                    )}
                    <Link
                      to="/suppliers"
                      search={{ id: s.id }}
                      className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                      title={pick("عرض كشف الحساب وتفاصيل المورد", "View Supplier Profile")}
                    >
                      <Eye className="size-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPartner(s);
                        setIsFormModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                      title={pick("تعديل بيانات المورد", "Edit Supplier")}
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(pick(`هل أنت متأكد من حذف المورد "${s.name.ar}"؟`, `Delete supplier "${s.name.en}"?`))) {
                          deletePartner(s.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                      title={pick("حذف المورد", "Delete Supplier")}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </DataTable>

        <TablePagination
          page={supplierPage}
          totalItems={filteredSuppliers.length}
          pageSize={25}
          onPageChange={setSupplierPage}
        />
      </Panel>

      {/* Dedicated Supplier Form Modal */}
      <PartnerFormModal
        open={isFormModalOpen}
        initialType="supplier"
        lockType={true}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingPartner(null);
        }}
        onSubmit={(partnerData) => {
          if (editingPartner) {
            updatePartner(editingPartner.id, partnerData);
          } else {
            addPartner(partnerData);
          }
        }}
        editingPartner={editingPartner}
      />

      {/* Quick Payment Modal */}
      {paymentSupplier && (
        <PartnerPaymentModal
          open={Boolean(paymentSupplier)}
          onClose={() => setPaymentSupplier(null)}
          partner={paymentSupplier}
          onRecordPayment={(partnerId, params) => {
            recordPayment(partnerId, params);
            setPaymentSupplier(null);
          }}
        />
      )}
    </div>
  );
}
