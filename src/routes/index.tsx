import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { DataTable, KpiCard, PageHeader, Panel, StatusPill, Td, Btn } from "@/components/kit";
import { approvals, insights, invoices, issues, kpis, salesTrend } from "@/lib/demo-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hafez ERP — AI-First ERP Dashboard" },
      {
        name: "description",
        content:
          "Bilingual AI-first ERP dashboard: sales, cash, receivables, inventory and AI insights from Hafez.",
      },
      { property: "og:title", content: "Hafez ERP — AI-First ERP Dashboard" },
      {
        property: "og:description",
        content: "Traditional ERP plus an AI operating layer with permissions and audit logging.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, pick, money, n } = useI18n();

  const chartData = salesTrend.map((d) => ({
    name: pick(d.day.ar, d.day.en),
    sales: d.sales,
    purchases: d.purchases,
  }));

  return (
    <>
      <PageHeader
        title={t("nav_dashboard")}
        subtitle={`${t("company")} · ${t("today")}`}
        actions={
          <>
            <Btn variant="outline">{t("ceoReport")}</Btn>
            <Link to="/ai">
              <Btn>
                <Sparkles className="size-4" />
                {t("askAi")}
              </Btn>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label={t("kpi_sales")} value={money(kpis.sales)} delta={kpis.salesDelta} accent="primary" />
        <KpiCard label={t("kpi_purchases")} value={money(kpis.purchases)} delta={kpis.purchasesDelta} accent="brand" />
        <KpiCard label={t("kpi_cash")} value={money(kpis.cash)} delta={kpis.cashDelta} accent="gold" />
        <KpiCard label={t("kpi_receivables")} value={money(kpis.receivables)} delta={kpis.receivablesDelta} accent="primary" />
        <KpiCard label={t("kpi_payables")} value={money(kpis.payables)} delta={kpis.payablesDelta} accent="ink" />
        <KpiCard label={t("kpi_stockValue")} value={money(kpis.stockValue)} delta={kpis.stockDelta} accent="brand" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={t("salesTrend")} className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={54} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "2px solid var(--ink)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="sales" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="purchases" fill="var(--brand)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/70 pt-4 text-center">
            <div>
              <p className="num text-xl font-bold">{n(kpis.invoices)}</p>
              <p className="text-[11px] uppercase text-muted-foreground">{t("recentInvoices")}</p>
            </div>
            <div>
              <p className="num text-xl font-bold">{n(kpis.customersServed)}</p>
              <p className="text-[11px] uppercase text-muted-foreground">{t("customer")}</p>
            </div>
            <div>
              <p className="num text-xl font-bold">{money(kpis.avgInvoice)}</p>
              <p className="text-[11px] uppercase text-muted-foreground">{t("amount")}</p>
            </div>
          </div>
        </Panel>

        <Panel title={t("aiInsights")} tone="ink" aside={<Sparkles className="size-4" />}>
          <p className="text-xs text-ink-foreground/60">{t("aiInsightsSub")}</p>
          <ul className="mt-4 space-y-3">
            {insights.map((i) => (
              <li key={i.en} className="rounded-xl border border-border/70 bg-card p-3 text-sm shadow-sm">
                {pick(i.ar, i.en)}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-gold/20 border border-gold/40 p-3 text-sm font-bold text-gold-foreground">
            {pick("3 أشياء تحتاج انتباهك اليوم.", "3 things need your attention today.")}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={t("problems")}>
          <ul className="space-y-3 text-sm">
            {issues.map((i) => (
              <li key={i.en} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{pick(i.ar, i.en)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t("pendingApprovals")}>
          <ul className="space-y-3">
            {approvals.map((a) => (
              <li key={a.title.en} className="surface-flat rounded-md p-3">
                <p className="text-sm font-semibold">{pick(a.title.ar, a.title.en)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{pick(a.by.ar, a.by.en)}</p>
                <div className="mt-2 flex gap-2">
                  <Btn variant="solid" className="px-2 py-1 text-[11px]">
                    <CheckCircle2 className="size-3.5" />
                    {t("confirm")}
                  </Btn>
                  <Btn variant="outline" className="px-2 py-1 text-[11px]">
                    {t("cancel")}
                  </Btn>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t("kpi_cash")}>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "2px solid var(--ink)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="sales" stroke="var(--crimson)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel
        title={t("recentInvoices")}
        aside={
          <Link to="/sales" className="text-xs font-bold uppercase text-primary underline">
            {t("viewAll")}
          </Link>
        }
      >
        <DataTable head={[t("invoice"), t("customer"), t("date"), t("amount"), t("status")]}>
          {invoices.slice(0, 5).map((inv) => (
            <tr key={inv.id}>
              <Td className="num font-bold">{inv.id}</Td>
              <Td>{pick(inv.party.ar, inv.party.en)}</Td>
              <Td className="num text-muted-foreground">{inv.date}</Td>
              <Td className="num font-semibold">{money(inv.amount)}</Td>
              <Td>
                <StatusPill status={inv.status} />
              </Td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
