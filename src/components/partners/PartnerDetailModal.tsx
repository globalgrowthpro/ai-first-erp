import { useState } from "react";
import {
  Users,
  Building2,
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
  Percent,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Partner } from "@/lib/partners-store";

interface PartnerDetailModalProps {
  partner: Partner | null;
  open: boolean;
  onClose: () => void;
  onEdit: (partner: Partner) => void;
  onToggleStatus: (id: string) => void;
}

export function PartnerDetailModal({
  partner,
  open,
  onClose,
  onEdit,
  onToggleStatus,
}: PartnerDetailModalProps) {
  const { t, pick, money, dir, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<"overview" | "ledger">("overview");

  if (!partner) return null;

  const creditUsedPercent =
    partner.creditLimit > 0
      ? Math.min(100, Math.round((partner.balance / partner.creditLimit) * 100))
      : 0;

  const handlePrint = () => {
    window.print();
  };

  const cleanPhone = partner.phone.replace(/[^0-9]/g, "");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        dir={dir}
      >
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`size-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  partner.type === "customer"
                    ? "bg-brand/15 text-brand"
                    : "bg-gold/25 text-gold-foreground"
                }`}
              >
                {partner.type === "customer" ? <Building2 className="size-5" /> : <Users className="size-5" />}
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>{pick(partner.name.ar, partner.name.en)}</span>
                </DialogTitle>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <span className="font-mono font-bold text-primary">{partner.code}</span>
                  <span>•</span>
                  <span>
                    {partner.type === "customer"
                      ? pick("عميل تجاري", "Customer")
                      : pick("مورد معتمد", "Supplier")}
                  </span>
                  {partner.taxNumber && (
                    <>
                      <span>•</span>
                      <span>
                        {pick("ضريبي: ", "Tax: ")}
                        <span className="font-mono">{partner.taxNumber}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  onClose();
                  onEdit(partner);
                }}
                className="size-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title={pick("تعديل البيانات", "Edit")}
              >
                <Edit2 className="size-3.5" />
              </button>
              <button
                onClick={handlePrint}
                className="size-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title={pick("طباعة كشف الحساب", "Print")}
              >
                <Printer className="size-3.5" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Status & Quick Contact Banner */}
          <div className="rounded-xl border border-border/80 bg-secondary/40 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  partner.status === "active"
                    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {partner.status === "active" ? pick("نشط", "Active") : pick("مجمّد", "Inactive")}
              </span>
              <span className="text-muted-foreground">
                {pick("مسجل منذ: ", "Registered: ")}
                <span className="font-mono font-medium text-foreground">{partner.createdAt}</span>
              </span>
            </div>

            {/* Communication Shortcuts */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:${cleanPhone}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card text-foreground hover:bg-secondary font-medium transition-colors"
              >
                <Phone className="size-3 text-primary" />
                <span>{partner.phone}</span>
              </a>

              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-medium transition-colors"
              >
                <MessageCircle className="size-3" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Financial Balances & Credit Utilization */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <p className="text-[11px] text-muted-foreground font-medium">
                {partner.type === "customer"
                  ? pick("الرصيد المستحق عليه (مدين)", "Outstanding Balance (Receivable)")
                  : pick("الرصيد المستحق له (دائن)", "Payable Balance")}
              </p>
              <p
                className={`text-base font-extrabold font-mono mt-0.5 ${
                  partner.balance > 0 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {money(partner.balance)}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3">
              <p className="text-[11px] text-muted-foreground font-medium">
                {pick("الحد الائتماني المعتمد", "Authorized Credit Limit")}
              </p>
              <p className="text-base font-extrabold font-mono mt-0.5 text-foreground">
                {money(partner.creditLimit)}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3">
              <p className="text-[11px] text-muted-foreground font-medium">
                {pick("الرصيد الائتماني المتاح", "Remaining Credit")}
              </p>
              <p className="text-base font-extrabold font-mono mt-0.5 text-primary">
                {money(Math.max(0, partner.creditLimit - partner.balance))}
              </p>
            </div>
          </div>

          {/* Credit Progress Bar */}
          {partner.creditLimit > 0 && (
            <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-muted-foreground">
                  {pick("نسبة استهلاك الائتمان", "Credit Limit Utilization")}
                </span>
                <span className="font-mono font-bold text-foreground">
                  {creditUsedPercent}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
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

          {/* Address & Contact Person */}
          <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">
                    {pick("العنوان وموقع التسليم", "Delivery / Main Location")}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {pick(partner.address.ar, partner.address.en) || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">
                    {pick("مسؤول التواصل والمشتريات", "Contact Representative")}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {partner.contactPerson || "—"}
                  </p>
                </div>
              </div>
            </div>

            {partner.notes && (
              <div className="mt-2 pt-2 border-t border-border/40 text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground block text-[11px] mb-0.5">
                  {pick("ملاحظات وشروط خاصة:", "Notes & Invoicing Terms:")}
                </span>
                {partner.notes}
              </div>
            )}
          </div>

          {/* Transaction Ledger Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="size-3.5 text-primary" />
              <span>{pick("سجل المعاملات والفواتير الأخيرة", "Recent Transactions & Invoices")}</span>
            </h4>

            <div className="rounded-xl border border-border/70 overflow-hidden bg-card text-xs">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-secondary/60 border-b border-border/70 text-[11px] text-muted-foreground">
                    <th className="p-2.5 text-start">{pick("التاريخ", "Date")}</th>
                    <th className="p-2.5 text-start">{pick("رقم المستند", "Doc Ref")}</th>
                    <th className="p-2.5 text-start">{pick("البيان", "Description")}</th>
                    <th className="p-2.5 text-end">{pick("القيمة", "Amount")}</th>
                    <th className="p-2.5 text-center">{pick("الحالة", "Status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {partner.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground text-[11px]">
                        {pick("لا توجد حركات مسجلة حالياً", "No transactions recorded yet")}
                      </td>
                    </tr>
                  ) : (
                    partner.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-secondary/30">
                        <td className="p-2.5 font-mono text-muted-foreground">{tx.date}</td>
                        <td className="p-2.5 font-mono font-bold text-primary">{tx.docRef}</td>
                        <td className="p-2.5">{pick(tx.description.ar, tx.description.en)}</td>
                        <td className="p-2.5 text-end font-mono font-bold text-foreground">
                          {money(tx.amount)}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : tx.status === "partial"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-rose-500/10 text-rose-600"
                            }`}
                          >
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              onClick={() => onToggleStatus(partner.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                partner.status === "active"
                  ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                  : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
              }`}
            >
              {partner.status === "active"
                ? pick("تجميد حساب الشريك", "Deactivate Partner")
                : pick("تنشيط الحساب", "Activate Partner")}
            </button>

            <Btn variant="outline" onClick={onClose}>
              {t("close")}
            </Btn>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
