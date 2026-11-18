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

export const Route = createFileRoute("/customers")({
  validateSearch: (search: Record<string, unknown>): { id?: string | undefined } => {
    const rawId = search["id"];
    return {
      id: typeof rawId === "string" ? rawId : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "العملاء التجاريون — Hafez ERP" },
      {
        name: "description",
        content: "دليل العملاء التجاريين، الفنادق، المطاعم، الكافيهات، منظمي الحفلات والحدود الائتمانية والأرصدة المستحقة.",
      },
      { property: "og:title", content: "العملاء التجاريون — Hafez ERP" },
      { property: "og:description", content: "Corporate Clients, Hotels, Restaurants, Catering & Credit Limits." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
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

  // Filter only customers
  const allCustomers = useMemo(() => {
    return partners.filter((p) => p.type === "customer");
  }, [partners]);

  const [activeFilter, setActiveFilter] = useState<
    "all" | "hotels" | "restaurants" | "catering" | "retail" | "has_balance" | "inactive"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit / Create Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  // Quick Payment Modal state
  const [paymentCustomer, setPaymentCustomer] = useState<Partner | null>(null);

  // Active customer for the dedicated full details view
  const activeCustomer = useMemo(() => {
    if (!search.id) return null;
    const q = decodeURIComponent(String(search.id)).toLowerCase().trim();
    if (!q) return null;

    // 1. Direct match by ID, Code, or Transaction Doc Ref
    const directMatch = allCustomers.find(
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
    const nameMatch = allCustomers.find(
      (p) =>
        p.name.ar.toLowerCase().includes(q) ||
        p.name.en.toLowerCase().includes(q) ||
        q.includes(p.name.ar.toLowerCase()) ||
        q.includes(p.name.en.toLowerCase())
    );
    if (nameMatch) return nameMatch;

    return null;
  }, [search.id, allCustomers]);

  // Financial KPIs for Customers
  const totalCustomersCount = allCustomers.length;
  const activeCustomersCount = allCustomers.filter((c) => c.status === "active").length;
  const totalReceivables = allCustomers.reduce(
    (sum, c) => sum + (c.balance > 0 ? c.balance : 0),
    0
  );
  const hotelsAndCateringCount = allCustomers.filter(
    (c) => c.group === "hotels" || c.group === "catering"
  ).length;

  // Filtered customers list
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      if (activeFilter === "hotels" && c.group !== "hotels") return false;
      if (activeFilter === "restaurants" && c.group !== "restaurants") return false;
      if (activeFilter === "catering" && c.group !== "catering") return false;
      if (activeFilter === "retail" && c.group !== "retail") return false;
      if (activeFilter === "has_balance" && c.balance <= 0) return false;
      if (activeFilter === "inactive" && c.status !== "inactive") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = c.code.toLowerCase().includes(q);
        const nameMatch =
          c.name.ar.toLowerCase().includes(q) ||
          c.name.en.toLowerCase().includes(q);
        const phoneMatch = c.phone.includes(q);
        const taxMatch = c.taxNumber.includes(q);
        const contactMatch = c.contactPerson.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !phoneMatch && !taxMatch && !contactMatch) return false;
      }
      return true;
    });
  }, [allCustomers, activeFilter, searchQuery]);

  const {
    currentPage: customerPage,
    setCurrentPage: setCustomerPage,
    paginatedItems: paginatedCustomers,
  } = usePagination(filteredCustomers, 25);

  const handleExportExcel = () => {
    if (!filteredCustomers.length) {
      alert(pick("لا توجد سجلات عملاء للتصدير وفق الفلاتر الحالية", "No customer records matching current filters to export"));
      return;
    }

    const exportRows = filteredCustomers.map((c, idx) => ({
      "م": idx + 1,
      "كود العميل": c.code,
      "اسم العميل": pick(c.name.ar, c.name.en),
      "تصنيف النشاط":
        c.group === "hotels"
          ? "فنادق ومنتجعات"
          : c.group === "restaurants"
          ? "مطاعم وكافيهات"
          : c.group === "catering"
          ? "تنظيم مناسبات وحفلات"
          : "أفراد وتجزئة",
      "جهة الاتصال": c.contactPerson || "-",
      "الهاتف": c.phone,
      "البريد الإلكتروني": c.email || "-",
      "الرقم الضريبي": c.taxNumber || "-",
      "الرصيد المستحق (ج.م)": c.balance,
      "حد الائتمان (ج.م)": c.creditLimit,
      "شروط السداد": c.paymentTerms,
      "الحالة": c.status === "active" ? "نشط" : "مجمّد",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 30 },
      { wch: 22 },
      { wch: 20 },
      { wch: 16 },
      { wch: 24 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "دليل_العملاء");
    safeDownloadWorkbook(wb, `دليل_العملاء_التجاريين_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // If search.id is provided and customer is found, render the DEDICATED FULL DETAILS VIEW
  if (search.id && activeCustomer) {
    return (
      <>
        <PartnerDetailPage
          partner={activeCustomer}
          onBack={() => navigate({ search: {} })}
          onEdit={(partner) => {
            setEditingPartner(partner);
            setIsFormModalOpen(true);
          }}
          onToggleStatus={(id) => toggleStatus(id)}
          onRecordPayment={(partnerId, params) => recordPayment(partnerId, params)}
        />

        {/* Dedicated Customer Edit Modal */}
        <PartnerFormModal
          open={isFormModalOpen}
          initialType="customer"
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
  if (search.id && !activeCustomer) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-2xl border border-border bg-card text-center space-y-4 max-w-lg mx-auto mt-12">
          <div className="size-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="size-8" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {pick("لم يتم العثور على العميل المطلوب", "Customer Not Found")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {pick(
              `لا توجد سجلات تطابق معرف العميل (${search.id}). ربما تم حذفه أو تغييره.`,
              `No records found matching Customer ID (${search.id}).`
            )}
          </p>
          <Btn
            variant="solid"
            onClick={() => navigate({ search: {} })}
            className="gap-2 mx-auto"
          >
            {isRtl ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
            <span>{pick("العودة لدليل العملاء", "Back to Customers Directory")}</span>
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={pick("دليل العملاء التجاريين", "Corporate Customers Directory")}
        subtitle={pick(
          "سجل متكامل لعملاء الفنادق والمنتجعات، سلاسل المطاعم، منظمي الحفلات والمناسبات والأفراد",
          "Comprehensive ledger for corporate hotel clients, restaurant chains, catering organizers & retail"
        )}
        actions={
          <div className="flex items-center gap-2">
            <Btn
              variant="outline"
              onClick={handleExportExcel}
              className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10 gap-1.5"
              title={pick("تصدير دليل العملاء إلى Excel", "Export to Excel")}
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
              className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-sm font-bold"
            >
              <Plus className="size-4" />
              <span>{pick("إضافة عميل جديد", "Add Customer")}</span>
            </Btn>
          </div>
        }
      />

      {/* Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={pick("إجمالي العملاء المسجلين", "Total Customers")}
          value={String(totalCustomersCount)}
          accent="primary"
        />
        <KpiCard
          label={pick("عملاء نشطون ومتعاملون", "Active Customers")}
          value={String(activeCustomersCount)}
          accent="brand"
        />
        <KpiCard
          label={pick("أرصدة مستحقة للتحصيل (مدين)", "Total Receivables")}
          value={money(totalReceivables)}
          accent="gold"
        />
        <KpiCard
          label={pick("عملاء الفنادق والحفلات VIP", "Hotels & Catering VIP")}
          value={String(hotelsAndCateringCount)}
          accent="ink"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full w-full sm:w-auto">
          {[
            { id: "all", label: pick("الكل", "All"), count: allCustomers.length },
            {
              id: "hotels",
              label: pick("فنادق ومنتجعات", "Hotels & Resorts"),
              count: allCustomers.filter((c) => c.group === "hotels").length,
            },
            {
              id: "restaurants",
              label: pick("مطاعم وكافيهات", "Restaurants & Cafes"),
              count: allCustomers.filter((c) => c.group === "restaurants").length,
            },
            {
              id: "catering",
              label: pick("تنظيم حفلات وبوفيهات", "Catering & Events"),
              count: allCustomers.filter((c) => c.group === "catering").length,
            },
            {
              id: "retail",
              label: pick("أفراد وتجزئة", "Retail"),
              count: allCustomers.filter((c) => c.group === "retail").length,
            },
            {
              id: "has_balance",
              label: pick("أرصدة مستحقة للتحصيل", "Outstanding Balances"),
              count: allCustomers.filter((c) => c.balance > 0).length,
            },
            {
              id: "inactive",
              label: pick("حسابات مجمّدة", "Inactive"),
              count: allCustomers.filter((c) => c.status === "inactive").length,
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
              "بحث باسم العميل، الكود، الهاتف، أو الضريبي...",
              "Search customer name, code, phone, tax..."
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

      {/* Customers Table / Panel */}
      <Panel
        title={pick("سجل العملاء والشركات", "Customer Accounts Ledger")}
        aside={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">
              {pick(
                `إجمالي المعروض: ${filteredCustomers.length} عميل`,
                `Showing: ${filteredCustomers.length} customers`
              )}
            </span>
          </div>
        }
      >
        <DataTable
          head={[
            pick("كود العميل", "Customer Code"),
            pick("اسم العميل والنشاط", "Customer & Business"),
            pick("جهة الاتصال والهاتف", "Contact & Phone"),
            pick("الرقم الضريبي", "Tax ID"),
            pick("شروط السداد والائتمان", "Payment Terms & Limit"),
            pick("الرصيد المستحق (مدين)", "Receivables Balance"),
            pick("الحالة", "Status"),
            pick("إجراءات", "Actions"),
          ]}
        >
          {paginatedCustomers.map((c) => {
            const groupBadge =
              c.group === "hotels"
                ? { label: pick("فنادق ومنتجعات", "Hotels & Resorts"), class: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" }
                : c.group === "restaurants"
                ? { label: pick("مطاعم وكافيهات", "Restaurants & Cafes"), class: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" }
                : c.group === "catering"
                ? { label: pick("تنظيم مناسبات وحفلات", "Catering & Events"), class: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" }
                : { label: pick("أفراد وتجزئة", "Retail"), class: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" };

            return (
              <tr key={c.id} className="hover:bg-secondary/70 transition-colors">
                {/* Code */}
                <Td className="num font-bold">
                  <span className="font-mono text-primary font-black text-xs block">
                    {c.code}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-brand/15 text-brand font-black text-[9px] border border-brand/30">
                    CUSTOMER
                  </span>
                </Td>

                {/* Name & Business */}
                <Td>
                  <div className="space-y-0.5 max-w-[200px]">
                    <Link
                      to="/customers"
                      search={{ id: c.id }}
                      className="font-bold text-foreground text-xs hover:text-primary hover:underline transition-colors block truncate"
                    >
                      {pick(c.name.ar, c.name.en)}
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
                      👤 {c.contactPerson || "-"}
                    </span>
                    <a
                      href={`tel:${c.phone}`}
                      className="text-[11px] text-muted-foreground hover:text-primary font-mono block transition-colors"
                      dir="ltr"
                    >
                      📞 {c.phone}
                    </a>
                  </div>
                </Td>

                {/* Tax ID */}
                <Td className="num text-xs font-mono text-muted-foreground">
                  {c.taxNumber || "-"}
                </Td>

                {/* Payment Terms & Limit */}
                <Td>
                  <div className="space-y-0.5 text-xs">
                    <span className="font-bold text-foreground block">
                      {c.paymentTerms === "cash"
                        ? pick("نقداً فوري", "Cash on Delivery")
                        : c.paymentTerms === "15_days"
                        ? pick("آجل خلال 15 يوماً", "Net 15 Days")
                        : c.paymentTerms === "30_days"
                        ? pick("آجل خلال 30 يوماً", "Net 30 Days")
                        : pick("آجل خلال 60 يوماً", "Net 60 Days")}
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      {pick("الحد:", "Limit:")} {money(c.creditLimit)}
                    </span>
                  </div>
                </Td>

                {/* Balance (Receivables) */}
                <Td className="num">
                  <span
                    className={`font-black text-sm font-mono block ${
                      c.balance > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {money(c.balance)}
                  </span>
                  {c.balance > 0 && (
                    <span className="text-[10px] text-rose-500 font-bold block">
                      {pick("مستحق التحصيل", "Receivable")}
                    </span>
                  )}
                </Td>

                {/* Status */}
                <Td>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      c.status === "active"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/30"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${c.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                    <span>{c.status === "active" ? pick("نشط", "Active") : pick("مجمّد", "Inactive")}</span>
                  </span>
                </Td>

                {/* Actions */}
                <Td>
                  <div className="flex items-center gap-1">
                    {c.balance > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentCustomer(c)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                        title={pick("تسجيل سند تحصيل / دفعة", "Record Payment")}
                      >
                        <Receipt className="size-3.5" />
                      </button>
                    )}
                    <Link
                      to="/customers"
                      search={{ id: c.id }}
                      className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                      title={pick("عرض كشف الحساب وتفاصيل العميل", "View Customer Profile")}
                    >
                      <Eye className="size-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPartner(c);
                        setIsFormModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                      title={pick("تعديل بيانات العميل", "Edit Customer")}
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(pick(`هل أنت متأكد من حذف العميل "${c.name.ar}"؟`, `Delete customer "${c.name.en}"?`))) {
                          deletePartner(c.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                      title={pick("حذف العميل", "Delete Customer")}
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
          page={customerPage}
          totalItems={filteredCustomers.length}
          pageSize={25}
          onPageChange={setCustomerPage}
        />
      </Panel>

      {/* Dedicated Customer Form Modal */}
      <PartnerFormModal
        open={isFormModalOpen}
        initialType="customer"
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
      {paymentCustomer && (
        <PartnerPaymentModal
          open={Boolean(paymentCustomer)}
          onClose={() => setPaymentCustomer(null)}
          partner={paymentCustomer}
          onRecordPayment={(partnerId, params) => {
            recordPayment(partnerId, params);
            setPaymentCustomer(null);
          }}
        />
      )}
    </div>
  );
}
