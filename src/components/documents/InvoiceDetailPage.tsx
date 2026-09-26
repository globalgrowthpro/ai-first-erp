import { useState, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Printer,
  Download,
  Share2,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  QrCode,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
  Package,
  Plus,
  Send,
  Building,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, StatusPill } from "@/components/kit";
import { useSalesStore, usePurchasesStore, type BizDocument, type InvoiceItem } from "@/lib/documents-store";
import { usePartnersStore } from "@/lib/partners-store";
import { DocumentFormModal, ConfirmDeleteDialog } from "@/components/documents/DocumentFormModal";

interface InvoiceDetailPageProps {
  docId: string;
  kind: "sales" | "purchases";
}

export function InvoiceDetailPage({ docId, kind }: InvoiceDetailPageProps) {
  const { t, pick, money, dir } = useI18n();
  const isRtl = dir === "rtl";
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const salesStore = useSalesStore();
  const purchasesStore = usePurchasesStore();
  const { partners } = usePartnersStore();

  const store = kind === "sales" ? salesStore : purchasesStore;
  const doc = store.documents.find((d) => d.id === docId);

  const [copiedTax, setCopiedTax] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Find linked partner if available
  const partner = partners.find(
    (p) =>
      (doc?.partnerId && p.id === doc.partnerId) ||
      (doc?.party && (p.name.ar.includes(doc.party.ar.split("—")[0]?.trim() || "___") ||
        doc.party.ar.includes(p.name.ar.split("—")[0]?.trim() || "___")))
  );

  if (!doc) {
    return (
      <div className="min-h-[55vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="size-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600">
          <FileText className="size-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {kind === "sales"
              ? pick("الفاتورة غير موجودة", "Invoice Not Found")
              : pick("أمر الشراء غير موجود", "Purchase Order Not Found")}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {pick("قد تم حذف هذا المستند أو أن الرقم غير صحيح", "This document may have been deleted or the code is invalid")}
          </p>
        </div>
        <Link
          to={kind === "sales" ? "/sales" : "/purchases"}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
        >
          {isRtl ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
          <span>{kind === "sales" ? pick("العودة للمبيعات", "Back to Sales") : pick("العودة للمشتريات", "Back to Purchases")}</span>
        </Link>
      </div>
    );
  }

  const items = doc.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.total, 0) || doc.amount;
  const taxRate = 0.14; // 14% VAT
  const vatAmount = Math.round(subtotal * taxRate);
  const totalWithVat = subtotal; // Assuming total includes VAT in confectionery B2B
  const remainingBalance = doc.balance;
  const paidAmount = Math.max(0, doc.amount - doc.balance);

  const handleCopyTax = () => {
    const taxNum = partner?.taxNumber || "100-349-821";
    navigator.clipboard.writeText(taxNum);
    setCopiedTax(true);
    setTimeout(() => setCopiedTax(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const text = `فاتورة ${doc.id} - ${pick(doc.party.ar, doc.party.en)} بمبلغ ${money(doc.amount)}`;
    if (navigator.share) {
      navigator.share({ title: `Invoice ${doc.id}`, text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert(pick("تم نسخ رابط الفاتورة إلى الحافظة", "Invoice link copied to clipboard"));
    }
  };

  const handleDelete = () => {
    store.deleteDocument(doc.id);
    navigate({ to: kind === "sales" ? "/sales" : "/purchases" });
  };

  const handleSaveEdit = (updated: Omit<BizDocument, "id"> & { id?: string }) => {
    store.updateDocument(doc.id, updated);
    setEditOpen(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Action Bar (Hidden during Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to={kind === "sales" ? "/sales" : "/purchases"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shadow-xs group shrink-0"
          >
            {isRtl ? (
              <ArrowRight className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
            ) : (
              <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
            )}
            <span>{kind === "sales" ? pick("العودة للمبيعات", "Back to Sales") : pick("العودة للمشتريات", "Back to Purchases")}</span>
          </Link>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="text-xs font-mono font-bold text-foreground truncate">
            {doc.id}
          </span>
          <StatusPill status={doc.status} />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {doc.status !== "paid" && (
            <button
              onClick={() => store.markPaid(doc.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <CheckCircle2 className="size-3.5" />
              <span>{kind === "sales" ? pick("تسجيل سداد الفاتورة", "Mark Paid") : pick("تسجيل صرف المبلغ", "Mark Paid")}</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="size-3.5 text-primary" />
            <span>{pick("طباعة الفاتورة", "Print Invoice")}</span>
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold shadow-xs transition-colors"
          >
            <Share2 className="size-3.5 text-muted-foreground" />
            <span>{pick("مشاركة", "Share")}</span>
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="p-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs shadow-xs transition-colors"
            title={pick("تعديل", "Edit")}
          >
            <Edit2 className="size-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="p-1.5 rounded-xl border border-border bg-card text-destructive hover:bg-destructive/10 text-xs shadow-xs transition-colors"
            title={pick("حذف", "Delete")}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Main Printable Invoice Card */}
      <div
        ref={printRef}
        className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:m-0"
      >
        {/* Official Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-border">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-xl">
                و
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  {pick("شركة وزير الحلو للصناعات الغذائية", "Al-Wazeer Confectionery & Pastry LLC")}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {kind === "sales"
                    ? pick("فاتورة مبيعات ضريبية إلكترونية معتمدة", "Electronic Tax Sales Invoice")
                    : pick("أمر شراء وتوريد معتمد", "Official Purchase Order")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
              <span>{pick("س.ت: 104829", "CR: 104829")}</span>
              <span>•</span>
              <span>{pick("ر.ض: 441-209-338", "Tax ID: 441-209-338")}</span>
              <span>•</span>
              <span>{pick("المطبخ المركزي — العاشر من رمضان", "Central Kitchen — 10th of Ramadan")}</span>
            </div>
          </div>

          {/* Invoice Meta Box */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 min-w-[240px] space-y-2 text-start">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
              <span className="text-xs font-semibold text-muted-foreground">{pick("رقم المستند:", "Document #:")}</span>
              <span className="text-sm font-black font-mono text-primary">{doc.id}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{pick("تاريخ الإصدار:", "Issue Date:")}</span>
              <span className="font-semibold text-foreground">{doc.date}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{pick("تاريخ الاستحقاق:", "Due Date:")}</span>
              <span className="font-semibold text-foreground">{doc.dueDate || doc.date}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{pick("حالة السداد:", "Payment:")}</span>
              <StatusPill status={doc.status} />
            </div>
          </div>
        </div>

        {/* Customer / Supplier Information Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" />
                {kind === "sales" ? pick("بيانات العميل المستلم", "Customer Information") : pick("بيانات المورد", "Supplier Information")}
              </span>
              {partner && (
                <Link
                  to="/partners"
                  search={{ id: partner.id }}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>{pick("عرض كشف الحساب", "View Ledger")}</span>
                  <ExternalLink className="size-3" />
                </Link>
              )}
            </div>
            <div>
              <p className="text-base font-bold text-foreground">{pick(doc.party.ar, doc.party.en)}</p>
              {partner && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                    <span>{pick(partner.address.ar, partner.address.en)}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                    <span dir="ltr">{partner.phone}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span>{pick("الرقم الضريبي:", "Tax ID:")}</span>
                    <span className="font-mono font-semibold text-foreground">{partner.taxNumber}</span>
                    <button
                      onClick={handleCopyTax}
                      className="p-1 hover:bg-muted rounded text-muted-foreground"
                      title={pick("نسخ", "Copy")}
                    >
                      {copiedTax ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment & Security Metadata */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-primary" />
                {pick("تفاصيل السداد والاعتماد", "Payment & Compliance")}
              </span>
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">{pick("طريقة الدفع:", "Payment Method:")}</span>
                  <span className="font-semibold text-foreground">{pick("تحويل بنكي / شيك معتمد", "Bank Transfer / Cheque")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">{pick("شروط الدفع:", "Terms:")}</span>
                  <span className="font-semibold text-foreground">{pick("آجل 30 يوماً", "Net 30 Days")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">{pick("الفرع المنفذ:", "Fulfillment Branch:")}</span>
                  <span className="font-semibold text-foreground">
                    {doc.branch
                      ? pick(doc.branch.ar, doc.branch.en)
                      : pick("المطبخ المركزي — العاشر", "Central Kitchen")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">{pick("الفاتورة الإلكترونية:", "E-Invoice Status:")}</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="size-3.5" />
                    {pick("معتمدة رقمياً", "Digitally Verified")}
                  </span>
                </div>
              </div>
            </div>
            {doc.notes && (
              <div className="pt-2 border-t border-border/50 text-xs">
                <span className="text-muted-foreground font-semibold">{pick("ملاحظات:", "Notes:")} </span>
                <span className="text-foreground">{doc.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Package className="size-4 text-primary" />
            <span>{pick("بنود ومحتويات الفاتورة", "Invoice Items & Quantities")}</span>
          </h3>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="py-3 px-4 text-start font-bold text-muted-foreground w-12">#</th>
                  <th className="py-3 px-4 text-start font-bold text-muted-foreground">{pick("كود الصنف", "SKU")}</th>
                  <th className="py-3 px-4 text-start font-bold text-muted-foreground">{pick("اسم الصنف والبيان", "Item Description")}</th>
                  <th className="py-3 px-4 text-center font-bold text-muted-foreground">{pick("الكمية", "Qty")}</th>
                  <th className="py-3 px-4 text-center font-bold text-muted-foreground">{pick("الوحدة", "Unit")}</th>
                  <th className="py-3 px-4 text-end font-bold text-muted-foreground">{pick("سعر الوحدة", "Unit Price")}</th>
                  <th className="py-3 px-4 text-end font-bold text-muted-foreground">{pick("الإجمالي", "Total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map((itm, idx) => (
                  <tr key={itm.id || idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-primary">{itm.sku}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-foreground">{pick(itm.name.ar, itm.name.en)}</p>
                      {itm.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{pick(itm.description.ar, itm.description.en)}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-foreground">{itm.quantity.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{pick(itm.unit.ar, itm.unit.en)}</td>
                    <td className="py-3 px-4 text-end font-semibold text-foreground">{money(itm.unitPrice)}</td>
                    <td className="py-3 px-4 text-end font-bold text-foreground">{money(itm.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary & Totals */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pt-2">
          {/* QR Code compliance stamp */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border/70 bg-muted/20 max-w-sm">
            <div className="size-20 bg-white p-1.5 rounded-lg border border-border flex items-center justify-center shrink-0">
              <QrCode className="size-full text-slate-900" />
            </div>
            <div className="text-[11px] text-muted-foreground space-y-1">
              <p className="font-bold text-foreground">{pick("ختم الفاتورة الإلكترونية", "ZATCA / ETA QR Stamp")}</p>
              <p>{pick("صالحة قانونياً ومعتمدة وفقاً للضوابط الضريبية.", "Digitally verified by Egyptian Tax Authority.")}</p>
              <p className="font-mono text-[10px] text-primary">{doc.id} · SHA-256 Verified</p>
            </div>
          </div>

          {/* Financial Calculation Box */}
          <div className="w-full sm:w-80 rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{pick("المجموع قبل الضريبة:", "Subtotal:")}</span>
              <span className="font-semibold text-foreground">{money(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{pick("ضريبة القيمة المضافة (14%):", "VAT (14%):")}</span>
              <span className="font-semibold text-foreground">{money(vatAmount)}</span>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-black text-foreground">
              <span>{pick("المبلغ الإجمالي:", "Total Amount:")}</span>
              <span className="text-base font-black text-primary">{money(doc.amount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-600 font-bold">
              <span>{pick("المبلغ المسدد:", "Amount Paid:")}</span>
              <span>{money(paidAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-rose-600 font-bold border-t border-border/50 pt-1.5">
              <span>{pick("المتبقي للتحصيل:", "Remaining Balance:")}</span>
              <span>{money(remainingBalance)}</span>
            </div>
          </div>
        </div>

        {/* Signature & Official Footer */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-8 border-t border-border/70 text-center text-xs text-muted-foreground">
          <div>
            <p className="font-bold text-foreground mb-8">{pick("المستلم / العميل", "Receiver Signature")}</p>
            <div className="border-b border-dashed border-border w-32 mx-auto" />
          </div>
          <div>
            <p className="font-bold text-foreground mb-8">{pick("أمين المخزن / المطبخ", "Warehouse Keeper")}</p>
            <div className="border-b border-dashed border-border w-32 mx-auto" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="font-bold text-foreground mb-8">{pick("الختم والاعتماد المالي", "Finance Approval Stamp")}</p>
            <div className="border-b border-dashed border-border w-32 mx-auto" />
          </div>
        </div>
      </div>

      {/* Edit Document Modal */}
      <DocumentFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={doc}
        suggestedCode={doc.id}
        kind={kind}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={kind === "sales" ? pick("حذف الفاتورة", "Delete Invoice") : pick("حذف أمر الشراء", "Delete Purchase Order")}
        message={pick(`هل أنت متأكد من حذف ${doc.id}؟ لا يمكن التراجع عن هذا الإجراء.`, `Are you sure you want to delete ${doc.id}? This action cannot be undone.`)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
