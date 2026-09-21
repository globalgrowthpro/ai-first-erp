import { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  FileCheck,
  Coins,
  Scale,
  Calendar,
  DollarSign,
  Building2,
  Users,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Receipt,
  FileText,
  Wallet,
  Upload,
  Image as ImageIcon,
  X,
  Eye,
  Sparkles,
  Paperclip,
  CheckCircle2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Partner, PaymentCategory, RecordPaymentParams } from "@/lib/partners-store";

interface PartnerPaymentModalProps {
  partner: Partner | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (params: RecordPaymentParams) => void;
}

// Generate realistic SVG sample receipt for instant testing
function generateSampleReceipt(
  method: string,
  amount: number,
  partnerName: string,
  date: string
): string {
  const methodLabel =
    method === "instapay"
      ? "InstaPay Egypt — EBC Instant Payment"
      : method === "wallet"
      ? "Mobile Wallet (Vodafone Cash / Orange)"
      : method === "nbe"
      ? "National Bank of Egypt (NBE Online)"
      : method === "cheque"
      ? "Certified Bank Cheque Deposit"
      : "Commercial International Bank (CIB Online)";

  const refNum = "TXN-" + Math.floor(100000000 + Math.random() * 900000000);
  const formattedAmt = (amount || 5000).toLocaleString();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="760" viewBox="0 0 600 760" fill="none">
    <rect width="600" height="760" rx="24" fill="#0b1329"/>
    <rect x="20" y="20" width="560" height="720" rx="18" fill="#131e3a" stroke="#253561" stroke-width="2"/>
    <circle cx="300" cy="110" r="42" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="3"/>
    <path d="M282 110L295 123L322 96" stroke="#10b981" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="300" y="185" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="21" font-weight="bold">Payment Transfer Successful</text>
    <text x="300" y="212" text-anchor="middle" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="13">${methodLabel}</text>
    
    <rect x="50" y="245" width="500" height="92" rx="14" fill="#0a0f24" stroke="#1e293b"/>
    <text x="300" y="280" text-anchor="middle" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="12">Verified Transfer Amount</text>
    <text x="300" y="318" text-anchor="middle" fill="#38bdf8" font-family="Segoe UI, sans-serif" font-size="28" font-weight="900">${formattedAmt} EGP</text>
    
    <text x="60" y="385" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="13">Beneficiary / Partner:</text>
    <text x="540" y="385" text-anchor="end" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="14" font-weight="bold">${partnerName.slice(0, 32)}</text>
    <line x1="60" y1="405" x2="540" y2="405" stroke="#253561" stroke-dasharray="4 4"/>
    
    <text x="60" y="440" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="13">Reference / Trans ID:</text>
    <text x="540" y="440" text-anchor="end" fill="#38bdf8" font-family="monospace" font-size="14" font-weight="bold">${refNum}</text>
    <line x1="60" y1="460" x2="540" y2="460" stroke="#253561" stroke-dasharray="4 4"/>
    
    <text x="60" y="495" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="13">Transfer Date:</text>
    <text x="540" y="495" text-anchor="end" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="14">${date} — 02:40 PM</text>
    <line x1="60" y1="515" x2="540" y2="515" stroke="#253561" stroke-dasharray="4 4"/>

    <text x="60" y="550" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="13">Channel:</text>
    <text x="540" y="550" text-anchor="end" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="14">${method.toUpperCase()}</text>
    <line x1="60" y1="570" x2="540" y2="570" stroke="#253561" stroke-dasharray="4 4"/>
    
    <text x="60" y="605" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="13">Verification Status:</text>
    <text x="540" y="605" text-anchor="end" fill="#10b981" font-family="Segoe UI, sans-serif" font-size="14" font-weight="bold">VERIFIED & SETTLED</text>
    
    <rect x="50" y="640" width="500" height="60" rx="12" fill="#10b981" fill-opacity="0.1" stroke="#10b981" stroke-opacity="0.3"/>
    <text x="300" y="676" text-anchor="middle" fill="#34d399" font-family="Segoe UI, sans-serif" font-size="12" font-weight="bold">Official Electronic Proof of Payment — Al Wazeer ERP</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function PartnerPaymentModal({
  partner,
  open,
  onClose,
  onSubmit,
}: PartnerPaymentModalProps) {
  const { t, pick, money, dir } = useI18n();
  const isRtl = dir === "rtl";

  const [category, setCategory] = useState<PaymentCategory>("invoice");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedDocRef, setSelectedDocRef] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cib");
  const [notes, setNotes] = useState("");
  const [proofImage, setProofImage] = useState<string>("");
  const [proofPreviewOpen, setProofPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Is this a non-cash method where proof is required or strongly recommended
  const isProofApplicable = paymentMethod !== "safe_cash";

  // Invoices or POs that can be paid against
  const eligibleInvoices = partner
    ? partner.transactions.filter(
        (tx) =>
          (tx.type === "invoice" || tx.type === "purchase_order") &&
          tx.status !== "paid"
      )
    : [];

  // Reset or preset when opening or changing category
  useEffect(() => {
    if (!open || !partner) return;

    if (category === "nulling") {
      setAmount(partner.balance);
      setSelectedDocRef("");
    } else if (category === "invoice") {
      if (eligibleInvoices.length > 0 && !selectedDocRef) {
        setSelectedDocRef(eligibleInvoices[0]!.docRef);
        setAmount(eligibleInvoices[0]!.amount);
      } else if (eligibleInvoices.length === 0) {
        setAmount(partner.balance > 0 ? partner.balance : 5000);
      }
    } else if (category === "advance") {
      setSelectedDocRef("");
      if (typeof amount !== "number" || amount <= 0) {
        setAmount(10000);
      }
    }
  }, [category, open, partner]);

  // Handle invoice selection change
  const handleSelectInvoice = (docRef: string) => {
    setSelectedDocRef(docRef);
    const target = partner?.transactions.find((tx) => tx.docRef === docRef);
    if (target) {
      setAmount(target.amount);
    }
  };

  // Handle file upload and resize if needed
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      // Create an image to check size and compress slightly if large
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          setProofImage(compressed);
        } else {
          setProofImage(result);
        }
      };
      img.onerror = () => {
        setProofImage(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Attach realistic sample receipt for testing
  const handleAttachSample = () => {
    if (!partner) return;
    const sample = generateSampleReceipt(
      paymentMethod,
      typeof amount === "number" ? amount : 5000,
      pick(partner.name.ar, partner.name.en),
      date
    );
    setProofImage(sample);
  };

  if (!partner) return null;

  const numericAmount = typeof amount === "number" ? amount : 0;
  const simulatedNewBalance = Math.max(0, partner.balance - numericAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    onSubmit({
      category,
      amount: numericAmount,
      date,
      relatedDocRef: category === "invoice" ? selectedDocRef || undefined : undefined,
      paymentMethod,
      notes: notes.trim() || undefined,
      proofImage: proofImage.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-7"
        dir={dir}
      >
        <DialogHeader>
          <div className="flex items-center gap-3.5 pb-1">
            <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-xs">
              <CreditCard className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                {partner.type === "customer"
                  ? pick("تسجيل دفعة / سند تحصيل نقدية", "Record Customer Payment / Receipt")
                  : pick("تسجيل سداد / سند صرف للمورد", "Record Supplier Payment Voucher")}
              </DialogTitle>
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5">
                <span className="font-bold text-foreground text-sm">
                  {pick(partner.name.ar, partner.name.en)}
                </span>
                <span>•</span>
                <span className="font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                  {partner.code}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2 text-xs">
          {/* Partner Current Balance Banner */}
          <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 flex items-center justify-between">
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">
                {partner.type === "customer"
                  ? pick("الرصيد الحالي المستحق للتحصيل:", "Current Outstanding Balance:")
                  : pick("الرصيد المستحق للمورد حالياً:", "Current Payable Balance:")}
              </span>
              <span
                className={`text-lg font-black font-mono mt-0.5 block ${
                  partner.balance > 0 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {money(partner.balance)}
              </span>
            </div>

            <div className="text-end">
              <span className="text-muted-foreground block text-[11px] font-medium">
                {pick("الرصيد المتوقع بعد العملية:", "Projected New Balance:")}
              </span>
              <span
                className={`text-lg font-black font-mono mt-0.5 block ${
                  simulatedNewBalance === 0 ? "text-emerald-600" : "text-foreground"
                }`}
              >
                {money(simulatedNewBalance)}
              </span>
            </div>
          </div>

          {/* Payment Category Option Selector (Invoice, Advance, Nulling) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground">
              {pick("نوع وطبيعة الدفعة / السند", "Payment Category & Allocation")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1: Related to Invoice */}
              <button
                type="button"
                onClick={() => setCategory("invoice")}
                className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex flex-col justify-between ${
                  category === "invoice"
                    ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                    : "border-border/80 bg-card hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`size-7 rounded-lg flex items-center justify-center ${
                      category === "invoice"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <FileCheck className="size-4" />
                  </div>
                  {category === "invoice" && (
                    <Check className="size-4 text-primary shrink-0" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-xs">
                    {pick("سداد مرتبط بفاتورة", "Invoice Payment")}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {pick(
                      "ربط السداد بمستند فاتورة أو أمر توريد",
                      "Allocate against a specific invoice or PO"
                    )}
                  </p>
                </div>
              </button>

              {/* Option 2: Advance Payment */}
              <button
                type="button"
                onClick={() => setCategory("advance")}
                className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex flex-col justify-between ${
                  category === "advance"
                    ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                    : "border-border/80 bg-card hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`size-7 rounded-lg flex items-center justify-center ${
                      category === "advance"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Coins className="size-4" />
                  </div>
                  {category === "advance" && (
                    <Check className="size-4 text-primary shrink-0" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-xs">
                    {pick("دفعة مقدمة (عربون)", "Advance Deposit")}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {pick(
                      "مبلغ تحت الحساب قبل إصدار الفاتورة",
                      "Advance on account before invoice issuance"
                    )}
                  </p>
                </div>
              </button>

              {/* Option 3: Nulling / Settlement */}
              <button
                type="button"
                onClick={() => setCategory("nulling")}
                className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex flex-col justify-between ${
                  category === "nulling"
                    ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                    : "border-border/80 bg-card hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`size-7 rounded-lg flex items-center justify-center ${
                      category === "nulling"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Scale className="size-4" />
                  </div>
                  {category === "nulling" && (
                    <Check className="size-4 text-primary shrink-0" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-xs">
                    {pick("تصفية وتسوية رصيد", "Balance Nulling")}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {pick(
                      "تسوية مقاصة أو تصفير المديونية بالكامل",
                      "Write-off / mutual clearance to zero out"
                    )}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* If category === "invoice": Show invoice picker */}
          {category === "invoice" && (
            <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                {pick("اختر الفاتورة أو أمر التوريد المراد سداده:", "Select Target Invoice / Document:")}
              </label>

              {eligibleInvoices.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {eligibleInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv.docRef)}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        selectedDocRef === inv.docRef
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border/60 bg-secondary/30 hover:bg-secondary text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{inv.docRef}</span>
                        <span>•</span>
                        <span className="text-[11px] text-foreground">
                          {pick(inv.description.ar, inv.description.en)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span>{money(inv.amount)}</span>
                        {selectedDocRef === inv.docRef && (
                          <Check className="size-3.5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-[11px] bg-secondary/30 p-2.5 rounded-lg">
                  {pick(
                    "لا توجد فواتير معلقة مسجلة. يمكنك إدخال رقم المستند يدوياً أدناه.",
                    "No pending invoices found. You can enter a document ref manually."
                  )}
                </div>
              )}

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">
                  {pick("رقم المستند المرجعي:", "Document Reference:")}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={selectedDocRef}
                  onChange={(e) => setSelectedDocRef(e.target.value)}
                  placeholder="INV-10452 / PO-2291"
                  className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* If category === "nulling": Informational message */}
          {category === "nulling" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  {pick("تسوية وتصفير الرصيد (Nulling):", "Balance Nullification / Clearance:")}
                </span>
                <p className="text-[11px] leading-relaxed mt-0.5">
                  {pick(
                    "سيتم تسجيل إشعار تسوية محاسبية لتصفير الحساب أو إعفاء الفارق المتبقي، ويصبح الرصيد المتبقي صفر جنيه.",
                    "An accounting settlement adjustment will be recorded to clear the balance to zero."
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Amount, Date, and Payment Method Row */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Amount & Presets */}
            <div className="space-y-1.5 sm:col-span-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-foreground">
                  {pick("قيمة المبلغ (ج.م)", "Payment Amount (EGP)")}
                </label>
                {partner.balance > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAmount(partner.balance)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                    >
                      {pick("100%", "100%")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(Math.round(partner.balance / 2))}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                    >
                      50%
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center rounded-xl border border-border bg-card overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all">
                <input
                  type="number"
                  dir="ltr"
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0.00"
                  className="w-full bg-transparent px-3.5 py-2 text-sm font-mono font-extrabold outline-none text-foreground"
                />
                <span className="px-3 py-2 bg-secondary/60 text-muted-foreground font-bold text-xs border-s border-border shrink-0 select-none">
                  {pick("ج.م", "EGP")}
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5 sm:col-span-1">
              <label className="block text-xs font-semibold text-foreground">
                {pick("تاريخ المعاملة", "Transaction Date")}
              </label>
              <input
                type="date"
                dir="ltr"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-mono outline-none focus:border-primary"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5 sm:col-span-1">
              <label className="block text-xs font-semibold text-foreground">
                {pick("طريقة السداد / الحساب المالي", "Payment Method / Safe")}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium outline-none focus:border-primary"
              >
                <option value="safe_cash">{pick("الخزينة النقدية الرئيسية (كاش)", "Main Cash Safe (Cash)")}</option>
                <option value="cib">{pick("حساب البنك التجاري الدولي (CIB تحويل بنكي)", "CIB Bank Transfer")}</option>
                <option value="nbe">{pick("حساب البنك الأهلي المصري (NBE تحويل بنكي)", "NBE Bank Transfer")}</option>
                <option value="instapay">{pick("إنستاباي (InstaPay)", "InstaPay Egypt")}</option>
                <option value="wallet">{pick("محفظة إلكترونية (فودافون كاش / أورنج / وي)", "Mobile Wallet (Vodafone / Orange / WE)")}</option>
                <option value="cheque">{pick("شيك بنكي معتمد", "Certified Bank Cheque")}</option>
              </select>
            </div>
          </div>

          {/* Conditional Upload Proof Section for Bank, InstaPay, Wallet, Cheque */}
          {isProofApplicable && (
            <div className="rounded-xl border border-border/90 bg-card p-3.5 space-y-2.5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <ImageIcon className="size-3.5" />
                  </div>
                  <label className="text-xs font-bold text-foreground">
                    {pick(
                      "إرفاق صورة إيصال التحويل / سكرين شوت الدفع",
                      "Attach Transfer Receipt / Screenshot Proof"
                    )}
                  </label>
                </div>

                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {paymentMethod === "instapay"
                    ? pick("إشعار إنستاباي", "InstaPay Receipt")
                    : paymentMethod === "wallet"
                    ? pick("إشعار المحفظة", "Wallet Receipt")
                    : paymentMethod === "cheque"
                    ? pick("صورة الشيك", "Cheque Photo")
                    : pick("إشعار بنكي", "Bank Slip")}
                </span>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleFileUpload}
              />

              {!proofImage ? (
                /* Empty upload dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-secondary/20 hover:bg-secondary/40 p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <div className="size-10 rounded-full bg-secondary group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors mb-2">
                    <Upload className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {pick("انقر هنا لرفع صورة الإيصال أو اسحب الملف", "Click to upload receipt or drag & drop")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {pick(
                      "يدعم صور JPG, PNG, WEBP (سكرين شوت من الموبايل أو التحويل البنكي)",
                      "Supports JPG, PNG, WEBP (Mobile screenshot or bank transfer voucher)"
                    )}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAttachSample();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer border border-primary/20"
                    >
                      <Sparkles className="size-3.5" />
                      <span>
                        {pick("تجربة سريعة: إرفاق إيصال نموذجي جاهز", "Quick Test: Attach Sample Receipt")}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Uploaded image preview */
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setProofPreviewOpen(true)}
                      className="relative group size-16 rounded-lg overflow-hidden border border-border bg-slate-900 shrink-0 cursor-pointer shadow-xs"
                      title={pick("انقر للتكبير", "Click to enlarge")}
                    >
                      <img
                        src={proofImage}
                        alt="Proof thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye className="size-4" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{pick("تم إرفاق إيصال التحويل بنجاح", "Proof receipt attached successfully")}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {pick(
                          "سيتم حفظ صورة الإيصال مع سند القبض/الصرف والرجوع لها في كشف الحساب",
                          "Receipt image will be linked to this transaction in the statement"
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setProofPreviewOpen(true)}
                      className="px-2.5 py-1 rounded-lg border border-border text-xs font-semibold hover:bg-secondary flex items-center gap-1 text-foreground cursor-pointer transition-colors"
                    >
                      <Eye className="size-3" />
                      <span>{pick("معاينة", "Preview")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg border border-border text-xs font-semibold hover:bg-secondary flex items-center gap-1 text-foreground cursor-pointer transition-colors"
                    >
                      <Upload className="size-3" />
                      <span>{pick("تغيير", "Change")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProofImage("")}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      title={pick("إزالة الإيصال", "Remove")}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lightbox Dialog to preview receipt full size */}
          {proofPreviewOpen && proofImage && (
            <Dialog open={proofPreviewOpen} onOpenChange={setProofPreviewOpen}>
              <DialogContent className="max-w-xl max-h-[88vh] p-4 flex flex-col items-center">
                <DialogHeader className="w-full pb-2 border-b border-border flex flex-row items-center justify-between">
                  <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Receipt className="size-4 text-primary" />
                    <span>{pick("معاينة إيصال التحويل المرفق", "Attached Transfer Receipt Preview")}</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="w-full max-h-[70vh] overflow-auto flex items-center justify-center bg-black/50 p-2 rounded-xl border border-border/60 my-2">
                  <img
                    src={proofImage}
                    alt="Proof Preview"
                    className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg"
                  />
                </div>
                <div className="w-full flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Btn variant="outline" onClick={() => setProofPreviewOpen(false)}>
                    {pick("إغلاق", "Close")}
                  </Btn>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {pick("ملاحظات ورقم السند الدفتري", "Remarks & Internal Notes")}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={pick("مثال: تحويل إنستاباي، شيك رقم 4091...", "e.g. Bank transfer ref #, cheque #")}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Btn variant="outline" type="button" onClick={onClose}>
              {t("cancel")}
            </Btn>
            <Btn
              variant="solid"
              type="submit"
              disabled={numericAmount <= 0}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <CreditCard className="size-4" />
              <span>
                {partner.type === "customer"
                  ? pick("تأكيد وتسجيل سند القبض", "Confirm Receipt Voucher")
                  : pick("تأكيد وتسجيل سند الصرف", "Confirm Payment Voucher")}
              </span>
            </Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
