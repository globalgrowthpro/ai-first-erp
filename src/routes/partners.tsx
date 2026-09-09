import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, PageHeader, Panel, Td } from "@/components/kit";
import {
  usePartnersStore,
  type Partner,
  type PartnerType,
} from "@/lib/partners-store";
import { PartnerFormModal } from "@/components/partners/PartnerFormModal";
import { PartnerDetailModal } from "@/components/partners/PartnerDetailModal";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Customers & Suppliers — Wazeer ERP" },
      {
        name: "description",
        content:
          "Enterprise directory of corporate clients, hotels, restaurants, and confectionery raw material & packaging suppliers.",
      },
      { property: "og:title", content: "Customers & Suppliers — Wazeer ERP" },
      {
        property: "og:description",
        content:
          "Balances, credit limits, contact directory and transaction history.",
      },
    ],
  }),
  component: PartnersPage,
});

function PartnersPage() {
  const { t, pick, money } = useI18n();
  const {
    partners,
    addPartner,
    updatePartner,
    deletePartner,
    toggleStatus,
  } = usePartnersStore();

  const [activeFilter, setActiveFilter] = useState<
    "all" | "customers" | "suppliers" | "has_balance" | "inactive"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedPartnerForDetail, setSelectedPartnerForDetail] =
    useState<Partner | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  // Financial Aggregations
  const totalCustomers = partners.filter((p) => p.type === "customer").length;
  const totalSuppliers = partners.filter((p) => p.type === "supplier").length;

  const totalReceivables = partners
    .filter((p) => p.type === "customer")
    .reduce((sum, p) => sum + (p.balance > 0 ? p.balance : 0), 0);

  const totalPayables = partners
    .filter((p) => p.type === "supplier")
    .reduce((sum, p) => sum + (p.balance > 0 ? p.balance : 0), 0);

  // Filtered List
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      if (activeFilter === "customers" && p.type !== "customer") return false;
      if (activeFilter === "suppliers" && p.type !== "supplier") return false;
      if (activeFilter === "has_balance" && p.balance <= 0) return false;
      if (activeFilter === "inactive" && p.status !== "inactive") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = p.code.toLowerCase().includes(q);
        const nameMatch =
          p.name.ar.toLowerCase().includes(q) ||
          p.name.en.toLowerCase().includes(q);
        const phoneMatch = p.phone.includes(q);
        const taxMatch = p.taxNumber.includes(q);
        if (!codeMatch && !nameMatch && !phoneMatch && !taxMatch) return false;
      }
      return true;
    });
  }, [partners, activeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={pick("دليل العملاء والموردين", "Customers & Suppliers Directory")}
        subtitle={pick(
          "سجل متكامل لعملاء الفنادق والحفلات، موردي الخامات ومواد التعبئة، والحدود الائتمانية",
          "Comprehensive ledger for corporate catering clients, raw material vendors, and credit limits"
        )}
        actions={
          <Btn
            variant="solid"
            onClick={() => {
              setEditingPartner(null);
              setIsFormModalOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            <span>{pick("إضافة شريك جديد", "Add Partner")}</span>
          </Btn>
        }
      />

      {/* Top Financial & Count KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={pick("إجمالي الشركاء المسجلين", "Total Partners")}
          value={String(partners.length)}
          accent="primary"
        />
        <KpiCard
          label={pick("العملاء (فنادق وحفلات ومطاعم)", "Corporate Customers")}
          value={String(totalCustomers)}
          accent="brand"
        />
        <KpiCard
          label={pick("أرصدة مستحقة للتحصيل (مدين)", "Total Receivables")}
          value={money(totalReceivables)}
          accent="gold"
        />
        <KpiCard
          label={pick("أرصدة مستحقة للموردين (دائن)", "Total Payables")}
          value={money(totalPayables)}
          accent="ink"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: pick("الكل", "All"), count: partners.length },
            { id: "customers", label: pick("العملاء فقط", "Customers"), count: totalCustomers },
            { id: "suppliers", label: pick("الموردون فقط", "Suppliers"), count: totalSuppliers },
            {
              id: "has_balance",
              label: pick("أرصدة مستحقة", "Outstanding Balances"),
              count: partners.filter((p) => p.balance > 0).length,
            },
            {
              id: "inactive",
              label: pick("حسابات مجمّدة", "Inactive"),
              count: partners.filter((p) => p.status === "inactive").length,
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeFilter === item.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
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
              "بحث بالاسم، الكود، الهاتف، أو الضريبي...",
              "Search name, code, phone, or tax..."
            )}
            className="w-full rounded-lg border border-border bg-secondary/50 ps-9 pe-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-card transition-colors"
          />
        </div>
      </div>

      {/* Partners Data Table */}
      <Panel title={pick("سجل العملاء والموردين", "Partners Directory Table")}>
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/70 bg-secondary/40 text-[11px] font-semibold text-muted-foreground">
                <th className="p-3 text-start">{pick("الكود", "Code")}</th>
                <th className="p-3 text-start">{pick("الاسم التجاري والنشاط", "Company & Group")}</th>
                <th className="p-3 text-center">{pick("النوع", "Type")}</th>
                <th className="p-3 text-start">{pick("بيانات التواصل", "Contact")}</th>
                <th className="p-3 text-end">{pick("الحد الائتماني", "Credit Limit")}</th>
                <th className="p-3 text-end">{pick("الرصيد الحالي", "Balance")}</th>
                <th className="p-3 text-center">{pick("الحالة", "Status")}</th>
                <th className="p-3 text-center">{pick("الإجراءات", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    {pick(
                      "لا يوجد عملاء أو موردون مطابقون لمعايير البحث",
                      "No partners matching current filter criteria"
                    )}
                  </td>
                </tr>
              ) : (
                filteredPartners.map((p) => {
                  const cleanPhone = p.phone.replace(/[^0-9]/g, "");
                  return (
                    <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                      {/* Code */}
                      <td className="p-3 font-mono font-bold text-primary">
                        {p.code}
                      </td>

                      {/* Name & Group */}
                      <td className="p-3">
                        <button
                          onClick={() => setSelectedPartnerForDetail(p)}
                          className="font-bold text-foreground text-start hover:text-primary transition-colors block"
                        >
                          {pick(p.name.ar, p.name.en)}
                        </button>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                          {p.contactPerson && <span>{p.contactPerson}</span>}
                          {p.taxNumber && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{p.taxNumber}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            p.type === "customer"
                              ? "bg-brand/15 text-brand border-brand/30"
                              : "bg-gold/25 text-gold-foreground border-gold/40"
                          }`}
                        >
                          {p.type === "customer" ? <Building2 className="size-3" /> : <Users className="size-3" />}
                          <span>{p.type === "customer" ? t("customer") : t("supplier")}</span>
                        </span>
                      </td>

                      {/* Phone & Shortcuts */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${cleanPhone}`}
                            className="font-mono text-muted-foreground hover:text-foreground font-medium"
                          >
                            {p.phone}
                          </a>
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="size-5 rounded bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-500/20"
                            title="WhatsApp"
                          >
                            <MessageCircle className="size-3" />
                          </a>
                        </div>
                      </td>

                      {/* Credit Limit */}
                      <td className="p-3 text-end font-mono text-muted-foreground font-medium">
                        {money(p.creditLimit)}
                      </td>

                      {/* Balance */}
                      <td className="p-3 text-end font-mono font-bold">
                        <span
                          className={
                            p.balance > 0
                              ? "text-amber-600 font-extrabold"
                              : "text-foreground"
                          }
                        >
                          {money(p.balance)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {p.status === "active" ? pick("نشط", "Active") : pick("مجمّد", "Inactive")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedPartnerForDetail(p)}
                            title={pick("عرض التفاصيل وكشف الحساب", "View details")}
                            className="size-7 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPartner(p);
                              setIsFormModalOpen(true);
                            }}
                            title={pick("تعديل", "Edit")}
                            className="size-7 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => deletePartner(p.id)}
                            title={pick("حذف", "Delete")}
                            className="size-7 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Modals */}
      <PartnerFormModal
        open={isFormModalOpen}
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

      <PartnerDetailModal
        partner={selectedPartnerForDetail}
        open={!!selectedPartnerForDetail}
        onClose={() => setSelectedPartnerForDetail(null)}
        onEdit={(partner) => {
          setEditingPartner(partner);
          setIsFormModalOpen(true);
        }}
        onToggleStatus={(id) => {
          toggleStatus(id);
          setSelectedPartnerForDetail((prev) =>
            prev && prev.id === id
              ? { ...prev, status: prev.status === "active" ? "inactive" : "active" }
              : prev
          );
        }}
      />
    </div>
  );
}
