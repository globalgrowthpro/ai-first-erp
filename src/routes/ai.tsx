import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  FileText,
  Landmark,
  LoaderCircle,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  User,
  WalletCards,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, PageHeader, Panel } from "@/components/kit";
import { agents } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "AI Workspace — Hafez ERP" },
      { name: "description", content: "Preview and confirm ERP invoices, bills, payments, purchase orders and management reports with Hafez AI." },
      { property: "og:title", content: "AI Workspace — Hafez ERP" },
      { property: "og:description", content: "A permission-aware AI workspace for previewing and confirming ERP actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiWorkspace,
});

type ActionId = "invoice" | "bill" | "report" | "payment" | "purchase";
type Bi = { ar: string; en: string };

const actions: Array<{ id: ActionId; label: Bi; prompt: Bi; icon: typeof ReceiptText }> = [
  { id: "invoice", label: { ar: "فاتورة بيع", en: "Sales Invoice" }, prompt: { ar: "أنشئ فاتورة بيع لأحمد محمد", en: "Create a sales invoice for Ahmed Mohamed" }, icon: ReceiptText },
  { id: "bill", label: { ar: "فاتورة مصروف", en: "Expense Bill" }, prompt: { ar: "سجّل فاتورة إنترنت المكتب", en: "Record the office internet bill" }, icon: FileText },
  { id: "report", label: { ar: "تقرير الإدارة", en: "Management Report" }, prompt: { ar: "جهّز تقرير أداء اليوم", en: "Prepare today's performance report" }, icon: BarChart3 },
  { id: "payment", label: { ar: "تحصيل دفعة", en: "Record Payment" }, prompt: { ar: "سجّل تحصيل 20 ألف من شركة ABC", en: "Record a 20,000 payment from ABC" }, icon: WalletCards },
  { id: "purchase", label: { ar: "أمر شراء", en: "Purchase Order" }, prompt: { ar: "جهّز أمر شراء من مورد النيل", en: "Prepare a purchase order from Nile Supplies" }, icon: ShoppingCart },
];

const pipeline = [
  { ar: "فهم الأمر", en: "Identify intent" },
  { ar: "فحص الصلاحيات", en: "Permission check" },
  { ar: "تطبيق قواعد العمل", en: "Apply business rules" },
  { ar: "إنشاء المعاينة", en: "Generate preview" },
  { ar: "انتظار التأكيد", en: "Await confirmation" },
  { ar: "تنفيذ وتسجيل", en: "Execute & audit" },
];

function DocumentFrame({ title, code, children }: { title: string; code: string; children: ReactNode }) {
  const { pick } = useI18n();
  return (
    <div className="overflow-hidden rounded-md border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
      <div className="flex items-start justify-between gap-4 border-b-2 border-ink bg-secondary p-4">
        <div>
          <p className="text-lg font-bold uppercase">{title}</p>
          <p className="num mt-0.5 text-xs text-muted-foreground">{code} · 07/09/2026</p>
        </div>
        <div className="border-2 border-ink bg-card px-2 py-1 text-[10px] font-bold uppercase">
          {pick("معاينة", "Preview")}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-b border-border py-2 text-sm", strong && "border-t-2 border-b-0 border-ink pt-3 font-bold")}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-end", strong && "num text-base text-foreground")}>{value}</span>
    </div>
  );
}

function ActionPreview({ action }: { action: ActionId }) {
  const { pick, money } = useI18n();

  if (action === "invoice") {
    return (
      <DocumentFrame title={pick("فاتورة بيع", "Sales invoice")} code="INV-10453">
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-[10px] font-bold uppercase text-muted-foreground">{pick("العميل", "Customer")}</p><p className="font-bold">{pick("أحمد محمد", "Ahmed Mohamed")}</p></div>
          <div><p className="text-[10px] font-bold uppercase text-muted-foreground">{pick("الدفع", "Payment")}</p><p className="font-bold">{pick("نقدي", "Cash")}</p></div>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-y-2 border-ink py-2 text-xs font-bold uppercase">
          <span>{pick("الصنف", "Item")}</span><span>{pick("الكمية", "Qty")}</span><span>{pick("الإجمالي", "Total")}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 py-3 text-sm">
          <span>{pick("شاشة 27 بوصة 4K", "27-inch 4K Monitor")}</span><span className="num">3</span><span className="num">{money(36000)}</span>
        </div>
        <Row label={pick("الإجمالي قبل الضريبة", "Subtotal")} value={money(31304)} />
        <Row label={pick("ضريبة القيمة المضافة", "VAT")} value={money(4696)} />
        <Row label={pick("الإجمالي المستحق", "Total due")} value={money(36000)} strong />
      </DocumentFrame>
    );
  }

  if (action === "bill") {
    return (
      <DocumentFrame title={pick("فاتورة مصروف", "Expense bill")} code="BILL-3078">
        <Row label={pick("المورد", "Supplier")} value={pick("المصرية للاتصالات", "Telecom Egypt")} />
        <Row label={pick("التصنيف", "Category")} value={pick("إنترنت واتصالات", "Internet & communications")} />
        <Row label={pick("الفترة", "Period")} value={pick("سبتمبر 2026", "September 2026")} />
        <Row label={pick("الحساب", "Account")} value={pick("مصروفات تشغيلية", "Operating expenses")} />
        <Row label={pick("الإجمالي المستحق", "Total due")} value={money(8250)} strong />
      </DocumentFrame>
    );
  }

  if (action === "report") {
    const stats = [
      { label: { ar: "مبيعات اليوم", en: "Today's sales" }, value: money(258400), delta: "+12%" },
      { label: { ar: "المتحصلات", en: "Collections" }, value: money(184000), delta: "+7%" },
      { label: { ar: "المشتريات", en: "Purchases" }, value: money(96200), delta: "-4%" },
    ];
    return (
      <DocumentFrame title={pick("تقرير أداء اليوم", "Daily performance report")} code="RPT-0907">
        <div className="grid gap-2 sm:grid-cols-3">
          {stats.map((stat) => <div key={stat.label.en} className="border-2 border-ink p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">{pick(stat.label.ar, stat.label.en)}</p><p className="num mt-2 font-bold">{stat.value}</p><p className="num text-xs text-success">{stat.delta}</p></div>)}
        </div>
        <div className="mt-4 border-s-4 border-primary bg-secondary p-3 text-sm leading-6">
          <p className="font-bold">{pick("ملخص حافظ", "Hafez summary")}</p>
          <p>{pick("المبيعات أعلى من أمس بقيادة الشاشات 4K. يوجد 7 فواتير متأخرة و3 أصناف تحت الحد الأدنى تستحق المتابعة.", "Sales outperformed yesterday, led by 4K monitors. Seven overdue invoices and three low-stock items need attention.")}</p>
        </div>
      </DocumentFrame>
    );
  }

  if (action === "payment") {
    return (
      <DocumentFrame title={pick("سند قبض", "Payment receipt")} code="PAY-6192">
        <Row label={pick("العميل", "Customer")} value={pick("شركة ABC للتجارة", "ABC Trading Co.")} />
        <Row label={pick("مقابل الفاتورة", "Against invoice")} value="INV-10451" />
        <Row label={pick("طريقة التحصيل", "Payment method")} value={pick("تحويل بنكي", "Bank transfer")} />
        <Row label={pick("المبلغ المحصل", "Amount received")} value={money(20000)} strong />
      </DocumentFrame>
    );
  }

  return (
    <DocumentFrame title={pick("أمر شراء", "Purchase order")} code="PO-2292">
      <Row label={pick("المورد", "Supplier")} value={pick("مورد النيل للتوريدات", "Nile Supplies")} />
      <Row label={pick("الصنف", "Item")} value={pick("طابعات ليزر A4 × 5", "A4 laser printers × 5")} />
      <Row label={pick("التسليم", "Delivery")} value={pick("المخزن الرئيسي", "Main Warehouse")} />
      <Row label={pick("إجمالي الطلب", "Order total")} value={money(45500)} strong />
    </DocumentFrame>
  );
}

function AiWorkspace() {
  const { t, pick } = useI18n();
  const [active, setActive] = useState<ActionId>("invoice");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"preview" | "running" | "done" | "cancelled">("preview");

  const selected = actions.find((item) => item.id === active) ?? actions[0];
  const chooseAction = (id: ActionId) => {
    const action = actions.find((item) => item.id === id);
    setActive(id);
    setInput(action ? pick(action.prompt.ar, action.prompt.en) : "");
    setStatus("preview");
  };
  const execute = () => {
    setStatus("running");
    window.setTimeout(() => setStatus("done"), 700);
  };

  return (
    <>
      <PageHeader title={t("nav_ai")} subtitle={pick("حافظ — نفّذ أعمالك اليومية بأمر واحد", "Hafez — run daily operations with one command")} />

      <section className="border-b-2 border-ink pb-5">
        <p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">{pick("إجراءات تجريبية", "Mock actions")}</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {actions.map(({ id, label, icon: Icon }) => (
            <Btn key={id} variant={active === id ? "solid" : "outline"} onClick={() => chooseAction(id)} className="shrink-0">
              <Icon className="size-4" />{pick(label.ar, label.en)}
            </Btn>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Panel title={t("appName")} aside={<Sparkles className="size-4" />}>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="gradient-brand grid size-9 shrink-0 place-items-center rounded-md border-2 border-ink text-primary-foreground"><Bot className="size-4" /></span>
                <p className="surface-flat rounded-md p-3 text-sm">{t("aiGreeting")}</p>
              </div>
              <div className="flex flex-row-reverse gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md border-2 border-ink bg-secondary"><User className="size-4" /></span>
                <p className="rounded-md border-2 border-ink bg-ink p-3 text-sm text-ink-foreground">{input || pick(selected.prompt.ar, selected.prompt.en)}</p>
              </div>
              <div className="flex gap-3">
                <span className="gradient-brand grid size-9 shrink-0 place-items-center rounded-md border-2 border-ink text-primary-foreground"><Bot className="size-4" /></span>
                <div className="min-w-0 flex-1 space-y-3">
                  <ActionPreview action={active} />
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-ink bg-secondary p-3">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <ShieldCheck className="size-4 text-success" />
                      {pick("تم فحص الصلاحية وقواعد العمل", "Permission and business rules checked")}
                    </div>
                    {status === "done" ? (
                      <span className="inline-flex items-center gap-2 bg-success px-3 py-2 text-xs font-bold text-success-foreground"><Check className="size-4" />{pick("تم التنفيذ والتسجيل", "Executed and logged")}</span>
                    ) : status === "cancelled" ? (
                      <span className="inline-flex items-center gap-2 bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground"><X className="size-4" />{pick("تم إلغاء المسودة", "Draft cancelled")}</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Btn onClick={execute} disabled={status === "running"}>{status === "running" && <LoaderCircle className="size-4 animate-spin" />}{status === "running" ? pick("جاري التنفيذ", "Executing") : t("confirm")}</Btn>
                        <Btn variant="outline" onClick={() => setInput(pick("عدّل تفاصيل المسودة الحالية", "Edit the current draft details"))}>{t("edit")}</Btn>
                        <Btn variant="ghost" onClick={() => setStatus("cancelled")}>{t("cancel")}</Btn>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <form className="mt-6 flex gap-2 border-t-2 border-ink/10 pt-4" onSubmit={(event) => { event.preventDefault(); setStatus("preview"); }}>
              <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={t("aiPlaceholder")} className="min-w-0 flex-1 rounded-md border-2 border-ink bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground" />
              <Btn type="submit">{t("send")}<ArrowRight className="size-4" /></Btn>
            </form>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title={t("pipeline")} tone="ink">
            <ol className="space-y-3 text-sm">
              {pipeline.map((step, index) => <li key={step.en} className="flex items-center gap-3"><span className={cn("num grid size-7 shrink-0 place-items-center border border-ink-foreground/30 text-xs font-bold", index < 5 ? "bg-primary text-primary-foreground" : "bg-ink-foreground/10")}>{index + 1}</span>{pick(step.ar, step.en)}</li>)}
            </ol>
          </Panel>
          <Panel title={t("agents")}>
            <ul className="space-y-2">
              {agents.slice(0, 5).map((agent) => <li key={agent.key} className="surface-flat flex items-center justify-between rounded-md px-3 py-2"><span className="flex items-center gap-2 text-sm font-semibold"><PackageCheck className="size-4 text-brand" />{pick(agent.name.ar, agent.name.en)}</span><span className="size-2 bg-success" aria-label={pick("نشط", "Active")} /></li>)}
            </ul>
          </Panel>
          <div className="flex items-start gap-3 border-2 border-ink bg-gold p-4 text-gold-foreground shadow-[3px_3px_0_0_var(--ink)]">
            <Landmark className="mt-0.5 size-5 shrink-0" />
            <p className="text-xs font-semibold leading-5">{pick("هذا نموذج تجريبي؛ لا يتم إنشاء قيود أو تغيير بيانات فعلية.", "This is a mock workspace; no real records or data are changed.")}</p>
          </div>
        </aside>
      </div>
    </>
  );
}