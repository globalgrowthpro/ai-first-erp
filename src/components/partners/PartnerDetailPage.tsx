import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Users,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Printer,
  Edit2,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Plus,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Building,
  Calendar,
  Layers,
  Receipt,
  Paperclip,
  Image as ImageIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, KpiCard, Panel, StatusPill } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Partner, PartnerTransaction, RecordPaymentParams } from "@/lib/partners-store";
import { PartnerPaymentModal } from "@/components/partners/PartnerPaymentModal";

interface PartnerDetailPageProps {
  partner: Partner;
  onBack: () => void;
  onEdit: (partner: Partner) => void;
  onToggleStatus: (id: string) => void;
  onRecordPayment: (partnerId: string, params: RecordPaymentParams) => void;
  onAddTransaction?: (partnerId: string, tx: Omit<PartnerTransaction, "id">) => void;
}

export function PartnerDetailPage({
  partner,
  onBack,
  onEdit,
  onToggleStatus,
  onRecordPayment,
  onAddTransaction,
}: PartnerDetailPageProps) {
  const { t, pick, money, dir } = useI18n();
  const isRtl = dir === "rtl";

  const [copiedTax, setCopiedTax] = useState(false);
  const [activeTxTab, setActiveTxTab] = useState<"all" | "invoices" | "payments">("all");
  const [txSearch, setTxSearch] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedProofTx, setSelectedProofTx] = useState<PartnerTransaction | null>(null);

  const creditUsedPercent =
    partner.creditLimit > 0
      ? Math.min(100, Math.round((partner.balance / partner.creditLimit) * 100))
      : 0;

  const cleanPhone = partner.phone.replace(/[^0-9]/g, "");

  const handleCopyTax = () => {
    if (!partner.taxNumber) return;
    navigator.clipboard.writeText(partner.taxNumber);
    setCopiedTax(true);
    setTimeout(() => setCopiedTax(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Group label helper
  const getGroupLabel = (group: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      hotels: { ar: "قطاع الفنادق والمنتجعات", en: "Hotels & Resorts" },
      restaurants: { ar: "المطاعم والكافيهات", en: "Restaurants & Cafes" },
      catering: { ar: "شركات تنظيم الحفلات والمناسبات", en: "Catering & Events" },
      retail: { ar: "سلاسل التجزئة والسوبرماركت", en: "Retail & Supermarkets" },
      raw_ingredients: { ar: "موردو الخامات ومستلزمات الحلويات", en: "Raw Ingredients & Dairy" },
      packaging: { ar: "موردو الكرتون ومواد التعبئة", en: "Packaging & Boxes" },
      services: { ar: "خدمات وصيانة المخابز", en: "Services & Maintenance" },
    };
    return labels[group] ? pick(labels[group].ar, labels[group].en) : group;
  };

  // Payment terms label helper
  const getTermsLabel = (terms: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      immediate: { ar: "دفع فوري عند الاستلام (كاش / تحويل)", en: "Immediate on Delivery" },
      "15_days": { ar: "أجل 15 يوماً من تاريخ الفاتورة", en: "Net 15 Days" },
      "30_days": { ar: "أجل 30 يوماً (الشهر التالي)", en: "Net 30 Days" },
      "45_days": { ar: "أجل 45 يوماً معتمد", en: "Net 45 Days" },
      "60_days": { ar: "أجل 60 يوماً معتمد للشركات الكبرى", en: "Net 60 Days" },
    };
    return map[terms] ? pick(map[terms].ar, map[terms].en) : terms;
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return partner.transactions.filter((tx) => {
      if (activeTxTab === "invoices" && tx.type !== "invoice" && tx.type !== "purchase_order") return false;
      if (activeTxTab === "payments" && tx.type !== "payment" && tx.type !== "credit_note") return false;

      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const refMatch = tx.docRef.toLowerCase().includes(q);
        const descMatch =
          tx.description.ar.toLowerCase().includes(q) ||
          tx.description.en.toLowerCase().includes(q);
        if (!refMatch && !descMatch) return false;
      }
      return true;
    });
  }, [partner.transactions, activeTxTab, txSearch]);

  // Aggregate totals
  const totalDebits = partner.transactions
    .filter((tx) => tx.type === "invoice" || tx.type === "purchase_order")
    .reduce((s, tx) => s + tx.amount, 0);

  const totalCredits = partner.transactions
    .filter((tx) => tx.type === "payment" || tx.type === "credit_note")
    .reduce((s, tx) => s + tx.amount, 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Breadcrumb and Back Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5 min-w-0 shrink">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary hover:text-primary transition-colors text-xs font-semibold shadow-xs cursor-pointer group shrink-0 whitespace-nowrap"
          >
            {isRtl ? (
              <ArrowRight className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            ) : (
              <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            )}
            <span>{pick("العودة إلى دليل الشركاء", "Back to Directory")}</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium min-w-0 truncate">
            <span className="shrink-0">{pick("دليل الشركاء", "Partners Directory")}</span>
            <span className="shrink-0">/</span>
            <span className="text-foreground font-bold truncate">
              {pick(partner.name.ar, partner.name.en)}
            </span>
          </div>
        </div>

        {/* Status & Quick Action buttons (Single row, never wrap) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0 overflow-x-auto py-0.5">
          {/* Status Toggle */}
          <button
            onClick={() => onToggleStatus(partner.id)}
            className={`text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              partner.status === "active"
                ? "border-amber-500/30 text-amber-600 bg-amber-500/5 hover:bg-amber-500/15"
                : "border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/15"
            }`}
          >
            <ShieldCheck className="size-3.5" />
            <span>
              {partner.status === "active"
                ? pick("تجميد الحساب", "Freeze Account")
                : pick("تنشيط الحساب", "Activate Account")}
            </span>
          </button>

          {/* Edit Profile */}
          <Btn
            variant="outline"
            size="sm"
            onClick={() => onEdit(partner)}
            className="gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap"
          >
            <Edit2 className="size-3.5" />
            <span>{pick("تعديل البيانات", "Edit Profile")}</span>
          </Btn>

          {/* Print Statement */}
          <Btn
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap"
          >
            <Printer className="size-3.5" />
            <span>{pick("طباعة كشف الحساب", "Print Statement")}</span>
          </Btn>

          {/* Record Payment / Receipt Button */}
          <Btn
            variant="solid"
            size="sm"
            onClick={() => setIsPaymentModalOpen(true)}
            className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            <CreditCard className="size-3.5" />
            <span>
              {partner.type === "customer"
                ? pick("سند تحصيل / دفعة", "Record Payment")
                : pick("سند صرف للمورد", "Record Payment")}
            </span>
          </Btn>

          {/* Link to create invoice or PO */}
          {partner.type === "customer" ? (
            <Link
              to="/sales"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors shadow-xs shrink-0 whitespace-nowrap"
            >
              <Plus className="size-3.5" />
              <span>{pick("إصدار فاتورة بيع", "New Sales Invoice")}</span>
            </Link>
          ) : (
            <Link
              to="/purchases"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors shadow-xs shrink-0 whitespace-nowrap"
            >
              <Plus className="size-3.5" />
              <span>{pick("إصدار أمر توريد", "New Purchase Order")}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Profile Header Banner */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-secondary/30 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Partner Identity */}
          <div className="flex items-start gap-4">
            <div
              className="size-16 rounded-2xl bg-card border border-border/80 p-1.5 shadow-sm flex items-center justify-center shrink-0 overflow-hidden"
            >
              {partner.logo ? (
                <img
                  src={partner.logo}
                  alt={pick(partner.name.ar, partner.name.en)}
                  className="size-full object-contain rounded-xl"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div
                  className={`size-full rounded-xl flex items-center justify-center ${
                    partner.type === "customer"
                      ? "bg-brand/15 text-brand"
                      : "bg-gold/25 text-gold-foreground"
                  }`}
                >
                  {partner.type === "customer" ? (
                    <Building2 className="size-8" />
                  ) : (
                    <Users className="size-8" />
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  {pick(partner.name.ar, partner.name.en)}
                </h1>

                {/* Status Pill */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    partner.status === "active"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      partner.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"
                    }`}
                  />
                  <span>
                    {partner.status === "active" ? pick("نشط ومعتمد", "Active") : pick("مجمّد مؤقتاً", "Inactive")}
                  </span>
                </span>
              </div>

              {/* Subtitles, Code, Type, and Group */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono font-bold">
                  {partner.code}
                </span>
                <span>•</span>
                <span className="font-bold text-foreground">
                  {partner.type === "customer"
                    ? pick("عميل تجاري (فنادق وحفلات)", "Corporate Client")
                    : pick("مورد معتمد (خامات وتغليف)", "Verified Supplier")}
                </span>
                <span>•</span>
                <span>{getGroupLabel(partner.group)}</span>
                {partner.taxNumber && (
                  <>
                    <span>•</span>
                    <button
                      onClick={handleCopyTax}
                      className="inline-flex items-center gap-1 hover:text-foreground font-mono transition-colors cursor-pointer"
                      title={pick("نسخ الرقم الضريبي", "Copy Tax Number")}
                    >
                      <span className="text-muted-foreground">{pick("الرقم الضريبي: ", "Tax: ")}</span>
                      <span dir="ltr" className="tabular-nums font-bold" style={{ unicodeBidi: "isolate" }}>
                        {partner.taxNumber}
                      </span>
                      {copiedTax ? (
                        <Check className="size-3 text-emerald-600 shrink-0" />
                      ) : (
                        <Copy className="size-3 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Contact & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={`tel:${cleanPhone}`}
              dir="ltr"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold transition-colors shadow-2xs"
            >
              <Phone className="size-3.5 text-primary shrink-0" />
              <span className="font-mono tracking-wide tabular-nums" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                {partner.phone}
              </span>
            </a>

            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold transition-colors shadow-2xs"
            >
              <MessageCircle className="size-3.5 shrink-0" />
              <span>{pick("مراسلة واتساب", "WhatsApp Chat")}</span>
            </a>

            {partner.email && (
              <a
                href={`mailto:${partner.email}`}
                dir="ltr"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors shadow-2xs"
              >
                <Mail className="size-3.5 shrink-0" />
                <span className="font-mono tabular-nums" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                  {partner.email}
                </span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Financial KPIs Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Balance */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold">
              {partner.type === "customer"
                ? pick("الرصيد المستحق للتحصيل (مدين)", "Outstanding Receivable")
                : pick("الرصيد المستحق للمورد (دائن)", "Outstanding Payable")}
            </p>
            <DollarSign className="size-4 text-primary/70" />
          </div>
          <p
            className={`text-2xl font-black font-mono mt-1 ${
              partner.balance > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {money(partner.balance)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {partner.balance > 0
              ? pick("يوجد مبالغ غير مسددة", "Pending invoices due")
              : pick("الحساب خالص ومطابق", "Zero balance / Fully settled")}
          </p>
        </div>

        {/* Credit Limit */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold">
              {pick("الحد الائتماني المعتمد", "Authorized Credit Limit")}
            </p>
            <CreditCard className="size-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-black font-mono mt-1 text-foreground">
            {money(partner.creditLimit)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {pick("السقف الأقصى للتسهيلات", "Max credit ceiling")}
          </p>
        </div>

        {/* Remaining Credit */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold">
              {pick("الرصيد الائتماني المتاح", "Remaining Available Credit")}
            </p>
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black font-mono mt-1 text-emerald-600">
            {money(Math.max(0, partner.creditLimit - partner.balance))}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {pick("المتاح للطلبيات الجديدة", "Available for new orders")}
          </p>
        </div>

        {/* Payment Terms */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold">
              {pick("شروط وفترة السداد", "Payment Terms")}
            </p>
            <Clock className="size-4 text-muted-foreground" />
          </div>
          <p className="text-base font-extrabold mt-1 text-foreground line-clamp-1">
            {getTermsLabel(partner.paymentTerms)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            {pick("تاريخ التسجيل: ", "Since: ")}{partner.createdAt}
          </p>
        </div>
      </div>

      {/* Credit Utilization Progress Bar */}
      {partner.creditLimit > 0 && (
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">
                {pick("مؤشر استهلاك الحد الائتماني", "Credit Limit Utilization Gauge")}
              </span>
              <span className="text-muted-foreground">
                ({money(partner.balance)} / {money(partner.creditLimit)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  creditUsedPercent > 85
                    ? "bg-rose-500/15 text-rose-600"
                    : creditUsedPercent > 60
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-emerald-500/15 text-emerald-600"
                }`}
              >
                {creditUsedPercent > 85
                  ? pick("خطر تجاوز الائتمان", "High Risk")
                  : creditUsedPercent > 60
                  ? pick("استهلاك متوسط", "Moderate")
                  : pick("ضمن الحدود الآمنة", "Safe")}
              </span>
              <span className="font-mono font-bold text-foreground text-sm">
                {creditUsedPercent}%
              </span>
            </div>
          </div>

          <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                creditUsedPercent > 85
                  ? "bg-rose-500"
                  : creditUsedPercent > 60
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${creditUsedPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Contact & Commercial Info Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Card: Representative & Location */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border/60 pb-2.5">
            <Building className="size-4 text-primary" />
            <span>{pick("بيانات التواصل وموقع التسليم", "Contact & Delivery Details")}</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <Users className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  {pick("المسؤول المعتمد والمشتريات:", "Authorized Representative:")}
                </span>
                <span className="font-bold text-foreground text-sm">
                  {partner.contactPerson || pick("غير محدد", "Not specified")}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  {pick("الهاتف المباشر والرسائل:", "Direct Phone:")}
                </span>
                <a
                  href={`tel:${cleanPhone}`}
                  dir="ltr"
                  className="font-mono font-bold text-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1.5"
                >
                  <span dir="ltr" className="tabular-nums" style={{ unicodeBidi: "isolate" }}>
                    {partner.phone}
                  </span>
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  {pick("البريد الإلكتروني الرسمي للفواتير:", "Official Invoicing Email:")}
                </span>
                <a
                  href={`mailto:${partner.email}`}
                  dir="ltr"
                  className="font-mono text-foreground font-medium hover:text-primary transition-colors"
                >
                  <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
                    {partner.email || "—"}
                  </span>
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  {pick("العنوان الجغرافي وموقع التوريد:", "Delivery Location / Address:")}
                </span>
                <span className="font-medium text-foreground leading-relaxed">
                  {pick(partner.address.ar, partner.address.en) || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Commercial, Terms & Notes */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border/60 pb-2.5">
            <FileText className="size-4 text-primary" />
            <span>{pick("البيانات القانونية وشروط التعاقد", "Legal & Contract Terms")}</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">
                {pick("الرقم الضريبي للمنشأة:", "Tax Identification No:")}
              </span>
              <span
                dir="ltr"
                className="font-mono font-bold text-foreground tabular-nums inline-block"
                style={{ unicodeBidi: "isolate" }}
              >
                {partner.taxNumber || "—"}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">
                {pick("نوع النشاط والتصنيف:", "Business Classification:")}
              </span>
              <span className="font-semibold text-foreground">
                {getGroupLabel(partner.group)}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">
                {pick("شروط وتسهيلات السداد:", "Agreed Payment Terms:")}
              </span>
              <span className="font-semibold text-foreground">
                {getTermsLabel(partner.paymentTerms)}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">
                {pick("العملة المعتمدة للتعامل:", "Trading Currency:")}
              </span>
              <span className="font-mono font-bold text-primary">
                EGP (جنيه مصري)
              </span>
            </div>

            {partner.notes && (
              <div className="mt-3 pt-3 border-t border-border/60">
                <span className="font-bold text-foreground block text-[11px] mb-1">
                  {pick("ملاحظات وشروط خاصة:", "Special Terms & Invoicing Notes:")}
                </span>
                <p className="text-muted-foreground leading-relaxed bg-secondary/40 p-2.5 rounded-lg border border-border/40 text-xs">
                  {partner.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statement of Account & Transaction Ledger Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-secondary/20">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span>{pick("كشف الحساب وسجل المعاملات", "Statement of Account & Ledger")}</span>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {pick(
                "سجل تفصيلي بالفواتير الصادرة وسندات القبض والدفع والمديونية الحالية",
                "Detailed ledger of issued invoices, receipts, payment vouchers, and running balance"
              )}
            </p>
          </div>

          {/* Filter tabs and search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg border border-border/60 text-xs">
              {[
                { id: "all", label: pick("الكل", "All") },
                {
                  id: "invoices",
                  label: partner.type === "customer" ? pick("الفواتير", "Invoices") : pick("أوامر الشراء", "POs"),
                },
                { id: "payments", label: pick("سندات السداد", "Receipts") },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTxTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    activeTxTab === tab.id
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder={pick("بحث برقم المستند...", "Search ref...")}
              className="px-2.5 py-1 rounded-lg border border-border bg-card text-xs outline-none focus:border-primary w-36 sm:w-44"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-secondary/50 text-[11px] font-semibold text-muted-foreground">
                <th className="p-3 text-start">{pick("التاريخ", "Date")}</th>
                <th className="p-3 text-start">{pick("رقم المستند", "Doc Ref")}</th>
                <th className="p-3 text-center">{pick("النوع", "Type")}</th>
                <th className="p-3 text-start">{pick("البيان والشرح", "Description")}</th>
                <th className="p-3 text-end">{pick("مدين (+)", "Debit (+)")}</th>
                <th className="p-3 text-end">{pick("دائن (-)", "Credit (-)")}</th>
                <th className="p-3 text-center">{pick("الحالة", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                    {pick("لا توجد معاملات مسجلة تطابق البحث", "No transactions found matching criteria")}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isDebit = tx.type === "invoice" || tx.type === "purchase_order";
                  return (
                    <tr key={tx.id} className="hover:bg-secondary/40 transition-colors">
                      {/* Date */}
                      <td className="p-3 font-mono text-muted-foreground">
                        {tx.date}
                      </td>

                      {/* Document Ref */}
                      <td className="p-3">
                        <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {tx.docRef}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === "invoice"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : tx.type === "payment"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : tx.type === "purchase_order"
                              ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {tx.type === "invoice"
                            ? pick("فاتورة بيع", "Invoice")
                            : tx.type === "payment"
                            ? pick("سند قبض / سداد", "Payment")
                            : tx.type === "purchase_order"
                            ? pick("أمر شراء", "PO")
                            : pick("إشعار دائن", "Credit Note")}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="p-3 font-medium text-foreground">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{pick(tx.description.ar, tx.description.en)}</span>
                          {tx.paymentCategory && (
                            <span
                              className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                                tx.paymentCategory === "invoice"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/25"
                                  : tx.paymentCategory === "advance"
                                  ? "bg-purple-500/10 text-purple-600 border-purple-500/25"
                                  : "bg-amber-500/10 text-amber-700 border-amber-500/25"
                              }`}
                            >
                              {tx.paymentCategory === "invoice"
                                ? pick("مرتبط بفاتورة", "Invoice")
                                : tx.paymentCategory === "advance"
                                ? pick("دفعة مقدمة", "Advance")
                                : pick("تصفية وتسوية", "Nulling")}
                            </span>
                          )}

                          {tx.proofImage && (
                            <button
                              type="button"
                              onClick={() => setSelectedProofTx(tx)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-500/20 cursor-pointer shadow-xs"
                              title={pick("عرض إيصال السداد المرفق", "View attached payment receipt")}
                            >
                              <Paperclip className="size-3" />
                              <span>{pick("إيصال التحويل", "Proof Receipt")}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Debit */}
                      <td className="p-3 text-end font-mono font-bold">
                        {isDebit ? (
                          <span className="text-foreground">{money(tx.amount)}</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Credit */}
                      <td className="p-3 text-end font-mono font-bold">
                        {!isDebit ? (
                          <span className="text-emerald-600">{money(tx.amount)}</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.status === "paid"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : tx.status === "partial"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-rose-500/10 text-rose-600"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Totals Summary Footer */}
            {partner.transactions.length > 0 && (
              <tfoot className="bg-secondary/60 font-bold border-t-2 border-border text-xs">
                <tr>
                  <td colSpan={4} className="p-3 text-start font-bold text-foreground">
                    {pick("إجمالي الحركات والرصيد الختامي", "Total Movements & Net Closing Balance")}
                  </td>
                  <td className="p-3 text-end font-mono text-foreground font-extrabold">
                    {money(totalDebits)}
                  </td>
                  <td className="p-3 text-end font-mono text-emerald-600 font-extrabold">
                    {money(totalCredits)}
                  </td>
                  <td className="p-3 text-center font-mono font-black text-amber-600">
                    {money(partner.balance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Payment / Receipt Modal */}
      <PartnerPaymentModal
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        partner={partner}
        onSubmit={(params) => onRecordPayment(partner.id, params)}
      />

      {/* Transaction Proof Receipt Lightbox Modal */}
      {selectedProofTx && selectedProofTx.proofImage && (
        <Dialog
          open={!!selectedProofTx}
          onOpenChange={(v) => !v && setSelectedProofTx(null)}
        >
          <DialogContent
            className="max-w-2xl max-h-[90vh] p-5 flex flex-col"
            dir={dir}
          >
            <DialogHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                    <Receipt className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground">
                      {pick("إشعار وإيصال السداد المالي المعتمد", "Verified Payment Transfer Receipt")}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {selectedProofTx.docRef} • {selectedProofTx.date}
                    </p>
                  </div>
                </div>

                <div className="text-end">
                  <span className="text-xs text-muted-foreground block">
                    {pick("المبلغ المسدد", "Paid Amount")}
                  </span>
                  <span className="text-base font-mono font-black text-emerald-600">
                    {money(selectedProofTx.amount)}
                  </span>
                </div>
              </div>
            </DialogHeader>

            <div className="py-3 flex-1 overflow-auto flex flex-col items-center justify-center bg-black/40 rounded-xl border border-border/80 my-2 p-2">
              <img
                src={selectedProofTx.proofImage}
                alt="Payment proof"
                className="max-h-[62vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
              <div className="text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {pick("البيان:", "Description:")}{" "}
                </span>
                <span>{pick(selectedProofTx.description.ar, selectedProofTx.description.en)}</span>
              </div>
              <Btn variant="outline" onClick={() => setSelectedProofTx(null)}>
                {t("close")}
              </Btn>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
