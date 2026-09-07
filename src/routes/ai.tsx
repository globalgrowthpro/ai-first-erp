import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ShieldCheck, ArrowRight, Bot, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, PageHeader, Panel } from "@/components/kit";
import { agents, quickReplies } from "@/lib/demo-data";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "AI Workspace — Hafez ERP" },
      {
        name: "description",
        content:
          "Talk to Hafez, the AI operations manager: quick replies, action cards and confirmation before anything is executed.",
      },
      { property: "og:title", content: "AI Workspace — Hafez ERP" },
      {
        property: "og:description",
        content: "Permission-aware AI assistant that prepares ERP actions and waits for confirmation.",
      },
    ],
  }),
  component: AiWorkspace,
});

const pipeline = [
  { ar: "فهم الأمر", en: "Identify intent" },
  { ar: "تحديد المستخدم", en: "Identify user" },
  { ar: "فحص الصلاحيات", en: "Permission check" },
  { ar: "اختيار الوكيل", en: "Select agent" },
  { ar: "قواعد العمل", en: "Business rules" },
  { ar: "تأكيد المستخدم", en: "Confirmation" },
  { ar: "تنفيذ + سجل تدقيق", en: "Execute + audit log" },
];

function AiWorkspace() {
  const { t, pick, money } = useI18n();
  const [input, setInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  return (
    <>
      <PageHeader
        title={t("nav_ai")}
        subtitle={pick("حافظ — مدير العمليات الذكي", "Hafez — AI Operations Manager")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title={t("appName")} aside={<Sparkles className="size-4" />}>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="gradient-brand grid size-8 shrink-0 place-items-center rounded-md border-2 border-ink text-primary-foreground">
                  <Bot className="size-4" />
                </span>
                <p className="surface-flat rounded-md p-3 text-sm">{t("aiGreeting")}</p>
              </div>

              <div className="flex flex-row-reverse gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-md border-2 border-ink bg-secondary">
                  <User className="size-4" />
                </span>
                <p className="rounded-md border-2 border-ink bg-ink p-3 text-sm text-ink-foreground">
                  {pick(
                    "اعمل فاتورة لأحمد محمد، 3 شاشات، الشاشة بـ 12 ألف جنيه، والدفع كاش.",
                    "Create an invoice for Ahmed Mohamed: 3 monitors at 12,000 each, cash payment.",
                  )}
                </p>
              </div>

              <div className="flex gap-3">
                <span className="gradient-brand grid size-8 shrink-0 place-items-center rounded-md border-2 border-ink text-primary-foreground">
                  <Bot className="size-4" />
                </span>
                <div className="w-full space-y-3">
                  <div className="surface-panel rounded-md p-4">
                    <div className="flex items-center justify-between gap-2 border-b-2 border-ink/10 pb-2">
                      <p className="text-sm font-bold uppercase">{t("invoice")} · DRAFT</p>
                      <span className="inline-flex items-center gap-1 rounded-sm border border-ink bg-success px-2 py-0.5 text-[11px] font-bold uppercase text-success-foreground">
                        <ShieldCheck className="size-3" />
                        {t("allowed")}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-[11px] uppercase text-muted-foreground">{t("customer")}</dt>
                        <dd className="font-semibold">{pick("أحمد محمد", "Ahmed Mohamed")}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase text-muted-foreground">{t("product")}</dt>
                        <dd className="font-semibold">
                          {pick("شاشة 27 بوصة 4K × 3", 'Monitor 27" 4K × 3')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase text-muted-foreground">{t("amount")}</dt>
                        <dd className="num font-semibold">{money(36000)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase text-muted-foreground">
                          {pick("طريقة الدفع", "Payment method")}
                        </dt>
                        <dd className="font-semibold">{pick("كاش", "Cash")}</dd>
                      </div>
                    </dl>
                    {confirmed ? (
                      <p className="mt-4 rounded-md border-2 border-ink bg-success px-3 py-2 text-sm font-bold text-success-foreground">
                        {pick(
                          "تم إنشاء الفاتورة INV-10453 وتسجيل القيد وسجل التدقيق.",
                          "Invoice INV-10453 created, journal entry and audit log recorded.",
                        )}
                      </p>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Btn onClick={() => setConfirmed(true)}>{t("confirm")}</Btn>
                        <Btn variant="outline">{t("edit")}</Btn>
                        <Btn variant="ghost">{t("cancel")}</Btn>
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border-2 border-ink bg-secondary p-3 text-xs">
                    <p className="font-bold uppercase">{t("permissionCheck")}</p>
                    <p className="mt-1 font-mono">invoice.create → {t("allowed")}</p>
                    <p className="font-mono text-destructive">profit.read → {t("denied")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t-2 border-ink/10 pt-4">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">
                {t("quickReplies")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {quickReplies.map((q) => (
                  <button
                    key={q.en}
                    onClick={() => setInput(pick(q.ar, q.en))}
                    className="rounded-md border-2 border-ink bg-card px-3 py-1.5 text-xs font-bold hover:bg-gold hover:text-gold-foreground"
                  >
                    {pick(q.ar, q.en)}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("aiPlaceholder")}
                  className="min-w-0 flex-1 rounded-md border-2 border-ink bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <Btn>
                  {t("send")}
                  <ArrowRight className="size-4" />
                </Btn>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t("pipeline")} tone="ink">
            <ol className="space-y-2 text-sm">
              {pipeline.map((step, i) => (
                <li key={step.en} className="flex items-center gap-3">
                  <span className="num grid size-6 shrink-0 place-items-center rounded-sm bg-ink-foreground/10 text-xs font-bold">
                    {i + 1}
                  </span>
                  {pick(step.ar, step.en)}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title={t("agents")}>
            <ul className="space-y-2">
              {agents.map((a) => (
                <li key={a.key} className="surface-flat flex items-center justify-between rounded-md px-3 py-2">
                  <span className="text-sm font-semibold">{pick(a.name.ar, a.name.en)}</span>
                  <span className="num text-xs text-muted-foreground">
                    {a.jobs} · {a.state === "active" ? pick("نشط", "active") : pick("خامل", "idle")}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
