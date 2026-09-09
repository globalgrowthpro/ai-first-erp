import { useState } from "react";
import { Printer, QrCode, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { type CompanySettings } from "@/lib/settings-store";
import { cn } from "@/lib/utils";
import { Btn } from "@/components/kit";

interface Props {
  settings: CompanySettings;
}

export function DocumentLivePreview({ settings }: Props) {
  const { t, pick, dir, money } = useI18n();
  const [docType, setDocType] = useState<"invoice" | "bill">("invoice");

  const isInvoice = docType === "invoice";

  const items = isInvoice
    ? [
        { desc: pick("قشطوطة بستاشيو فاخرة — طلبية حفلات", "Kashtouta Pistachio Premium — Catering Order"), qty: 15, price: 90 },
        { desc: pick("كشري حلو سوبر لوكس وكيندر", "Sweet Koshary Super Luxe & Kinder"), qty: 25, price: 100 },
        { desc: pick("فتة ميكس الوزير المميزة", "Fatta Mix Al-Wazeer Signature"), qty: 20, price: 90 },
        { desc: pick("طاجن ام علي قشطة ومكسرات", "Om Ali with Fresh Cream & Nuts"), qty: 18, price: 70 },
        { desc: pick("شاورما الوزير نوتيلا وبستاشيو", "Sweet Shawarma Nutella & Pistachio"), qty: 12, price: 125 },
      ]
    : [
        { desc: pick("خامات شوكولاتة نوتيلا أصلية 15 كجم", "Original Nutella Spread 15kg Tubs"), qty: 4, price: 4200 },
        { desc: pick("فستق حلبي محمص ومجروش درجة أولى 10 كجم", "Roasted Pistachio Grade A 10kg"), qty: 2, price: 5800 },
        { desc: pick("عبوات وكرتون شاورما وقشطوطة الوزير (1000 قطعة)", "Custom Boxes & Packaging (1,000 pcs)"), qty: 5, price: 1260 },
      ];

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const vat = Math.round(subtotal * 0.14);
  const grandTotal = subtotal + vat;

  return (
    <div className="space-y-3">
      {/* Header bar with Document Type selector & Print simulation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-1.5 bg-card p-1 rounded-lg border border-border/80 shadow-sm">
          <button
            type="button"
            onClick={() => setDocType("invoice")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-bold uppercase transition-colors",
              isInvoice
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("previewInvoice")}
          </button>
          <button
            type="button"
            onClick={() => setDocType("bill")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-bold uppercase transition-colors",
              !isInvoice
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("previewBill")}
          </button>
        </div>

        <Btn
          variant="outline"
          className="h-8 px-3 text-xs"
          onClick={() => window.print()}
        >
          <Printer className="size-3.5" />
          <span className="hidden sm:inline">{pick("طباعة / تصدير PDF", "Print / PDF")}</span>
        </Btn>
      </div>

      {/* Simulated Document Paper */}
      <div
        className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 text-foreground shadow-lg transition-all"
        style={{
          fontFamily: dir === "rtl" ? "'Cairo', sans-serif" : "'Space Grotesk', sans-serif",
        }}
      >
        {/* Top Accent Color Bar */}
        <div
          className="h-2 rounded-full mb-6 w-full"
          style={{ backgroundColor: settings.primaryColor }}
        />

        {/* Header section based on headerLayout */}
        <div
          className={cn(
            "flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-border",
            settings.headerLayout === "centered" && "flex-col items-center text-center",
            settings.headerLayout === "logo-end" && "flex-row-reverse",
          )}
        >
          {/* Logo */}
          <div className="flex flex-col items-start gap-2">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Company Logo"
                className="max-h-16 max-w-[220px] object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-bold text-sm uppercase"
                style={{ backgroundColor: `${settings.primaryColor}15`, color: settings.primaryColor }}
              >
                <FileText className="size-5" />
                <span>{pick(settings.nameAr, settings.nameEn)}</span>
              </div>
            )}
            <span
              className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${settings.accentColor}30`, color: settings.primaryColor }}
            >
              {isInvoice
                ? pick(settings.invoiceSubtitleAr, settings.invoiceSubtitleEn)
                : pick(settings.billSubtitleAr, settings.billSubtitleEn)}
            </span>
          </div>

          {/* Company Details */}
          <div
            className={cn(
              "text-xs space-y-1 text-muted-foreground",
              settings.headerLayout === "centered" ? "text-center" : dir === "rtl" ? "text-left" : "text-right",
            )}
          >
            <h2 className="text-base font-extrabold text-foreground">
              {pick(settings.nameAr, settings.nameEn)}
            </h2>
            <p>{pick(settings.addressAr, settings.addressEn)}</p>
            <p className="num">
              {pick("هاتف", "Tel")}: {settings.phone} | {settings.email}
            </p>
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px] font-semibold text-foreground">
              <span className="rounded-md bg-secondary px-1.5 py-0.5 border border-border">
                {pick("س.ت", "CR")}: {settings.commercialRegister}
              </span>
              <span className="rounded-md bg-secondary px-1.5 py-0.5 border border-border">
                {pick("ب.ض", "TAX ID")}: {settings.taxNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Document Title & Invoice Meta */}
        <div className="my-6 grid gap-4 rounded-xl border border-border/70 bg-secondary/50 p-4 sm:grid-cols-2">
          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              {pick("وثيقة رسمية", "Document")}
            </span>
            <h3
              className="text-lg font-black uppercase"
              style={{ color: settings.primaryColor }}
            >
              {pick(settings.headerTitleAr, settings.headerTitleEn)}
            </h3>
            <p className="font-mono text-sm font-bold text-foreground mt-0.5">
              {isInvoice ? "INV-2026-0842" : "PO-2026-0195"}
            </p>
          </div>

          <div className="space-y-1 text-xs sm:text-end">
            <p>
              <span className="text-muted-foreground">{pick("تاريخ الإصدار", "Issue Date")}: </span>
              <span className="font-mono font-bold text-foreground">2026-09-08</span>
            </p>
            <p>
              <span className="text-muted-foreground">{pick("تاريخ الاستحقاق", "Due Date")}: </span>
              <span className="font-mono font-bold text-foreground">2026-09-22</span>
            </p>
            <p>
              <span className="text-muted-foreground">{pick("العملة", "Currency")}: </span>
              <span className="font-bold text-foreground">{settings.currency}</span>
            </p>
          </div>
        </div>

        {/* Bill To / Target Party */}
        <div className="mb-6 rounded-xl border border-border p-3 text-xs">
          <span className="font-bold uppercase tracking-wide text-muted-foreground text-[10px]">
            {isInvoice ? pick("فاتورة صادرة إلى (العميل)", "Bill To (Customer)") : pick("أمر توريد إلى (المورد)", "Vendor / Supplier")}
          </span>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold text-sm text-foreground">
                {isInvoice ? "شركة النور للمقاولات العامة والتجارة" : "مورد النيل للتوريدات والتجارة"}
              </p>
              <p className="text-muted-foreground">
                {isInvoice ? "شارع الجمهورية، وسط البلد، القاهرة" : "المنطقة الصناعية الثالثة، السادس من أكتوبر"}
              </p>
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {pick("الرقم الضريبي للطرف الثاني", "Party Tax ID")}: {isInvoice ? "100-221-554" : "204-118-990"}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-xs">
            <thead>
              <tr
                className="border-b border-border/80 text-white font-bold uppercase"
                style={{ backgroundColor: settings.primaryColor }}
              >
                <th className="px-3 py-2 text-start">{pick("البند / البيان", "Description")}</th>
                <th className="px-3 py-2 text-center w-16">{pick("الكمية", "Qty")}</th>
                <th className="px-3 py-2 text-end w-28">{pick("السعر", "Unit Price")}</th>
                <th className="px-3 py-2 text-end w-28">{pick("الإجمالي", "Total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-secondary/40">
                  <td className="px-3 py-2.5 font-medium">{item.desc}</td>
                  <td className="px-3 py-2.5 text-center num font-bold">{item.qty}</td>
                  <td className="px-3 py-2.5 text-end num">{money(item.price)}</td>
                  <td className="px-3 py-2.5 text-end num font-bold">{money(item.qty * item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Totals & QR Code */}
        <div className="grid gap-6 sm:grid-cols-2 items-start border-t border-border/80 pt-4">
          {/* QR Code & Verification Note */}
          <div className="flex items-center gap-3">
            {settings.showTaxQr && (
              <div className="size-20 shrink-0 rounded-lg border border-border bg-white p-1 shadow-sm flex items-center justify-center">
                <QrCode className="size-full text-foreground" />
              </div>
            )}
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <p className="font-bold flex items-center gap-1 text-foreground">
                <CheckCircle2 className="size-3.5 text-success inline" />
                {pick("منظومة الفاتورة الإلكترونية المعتمدة", "Certified Electronic Invoice")}
              </p>
              <p>{pick("صادرة وفق المعايير واللوائح الضريبية الرسمية.", "Issued per standard accounting regulations.")}</p>
            </div>
          </div>

          {/* Totals Table */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>{pick("المجموع الفرعي", "Subtotal")}:</span>
              <span className="num font-semibold">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{pick("ضريبة القيمة المضافة (14%)", "VAT (14%)")}:</span>
              <span className="num font-semibold">{money(vat)}</span>
            </div>
            <div
              className="flex justify-between border-t border-border/80 pt-2 text-sm font-black"
              style={{ color: settings.primaryColor }}
            >
              <span>{pick("الإجمالي المستحق", "Grand Total")}:</span>
              <span className="num text-base">{money(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Bank Details Box */}
        {settings.bankDetailsAr && (
          <div
            className="mt-6 rounded-xl border p-3 text-xs"
            style={{
              borderColor: `${settings.accentColor}50`,
              backgroundColor: `${settings.accentColor}10`,
            }}
          >
            <span className="block font-bold uppercase tracking-wider text-[10px] text-muted-foreground mb-0.5">
              {pick("بيانات السداد والتحويل البنكي", "Bank Payment Information")}
            </span>
            <p className="font-semibold text-foreground">
              {pick(settings.bankDetailsAr, settings.bankDetailsEn)}
            </p>
          </div>
        )}

        {/* Footer Notes & Authorized Signatures */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6 border-t border-border pt-4 text-xs">
          <div className="max-w-md text-muted-foreground">
            <span className="block font-bold text-[10px] uppercase text-foreground mb-0.5">
              {pick("الشروط والأحكام", "Terms & Conditions")}
            </span>
            <p>{pick(settings.footerNotesAr, settings.footerNotesEn)}</p>
          </div>

          {/* Signature and Stamp */}
          {settings.showSignature && (
            <div className="flex flex-col items-center">
              <div className="relative flex size-20 items-center justify-center rounded-full border-2 border-dashed border-border text-center text-[9px] font-bold text-muted-foreground/70">
                <span className="rotate-[-12deg] uppercase">
                  {pick("الختم الرسمي", "Official Stamp")}
                </span>
              </div>
              <div className="mt-2 border-t border-foreground/60 w-32 text-center pt-1 text-[10px] font-bold text-foreground">
                {pick("توقيع المدير المالي", "Finance Director")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
