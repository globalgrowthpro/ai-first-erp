import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Sparkles, Building2, ExternalLink, Store, Receipt } from "lucide-react";
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
import { usePosOrdersStore } from "@/lib/pos-orders-store";

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
  const { orders: posOrders } = usePosOrdersStore();

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

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard label={t("kpi_sales")} value={money(kpis.sales)} delta={kpis.salesDelta} color="rose" />
        <KpiCard label={t("kpi_purchases")} value={money(kpis.purchases)} delta={kpis.purchasesDelta} color="blue" />
        <KpiCard label={t("kpi_netProfit")} value={money(kpis.netProfit)} delta={kpis.netProfitDelta} color="amber" />
        <KpiCard label={t("kpi_cash")} value={money(kpis.cash)} delta={kpis.cashDelta} color="emerald" />
        <KpiCard label={t("kpi_operatingExpenses")} value={money(kpis.operatingExpenses)} delta={kpis.operatingExpensesDelta} color="orange" />

        <KpiCard label={t("kpi_receivables")} value={money(kpis.receivables)} delta={kpis.receivablesDelta} color="indigo" />
        <KpiCard label={t("kpi_payables")} value={money(kpis.payables)} delta={kpis.payablesDelta} color="purple" />
        <KpiCard label={t("kpi_stockValue")} value={money(kpis.stockValue)} delta={kpis.stockDelta} color="cyan" />
        <KpiCard label={t("kpi_orders")} value={`${n(kpis.invoices)} ${pick("فاتورة", "Orders")}`} delta={kpis.invoicesDelta} color="fuchsia" />
        <KpiCard label={t("kpi_avgTicket")} value={money(kpis.avgInvoice)} delta={kpis.avgInvoiceDelta} color="teal" />
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
          <p className="text-xs text-ink-foreground/80">{t("aiInsightsSub")}</p>
          <ul className="mt-4 space-y-3">
            {insights.map((i) => (
              <li
                key={i.en}
                className="rounded-xl border border-border/80 bg-card p-3.5 text-sm font-semibold text-card-foreground shadow-sm leading-relaxed"
              >
                {pick(i.ar, i.en)}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-amber-500/20 border border-amber-400/40 p-3 text-sm font-bold text-amber-300">
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

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Panel title={pick("إحصاء العمليات (اليوم)", "Operations Stats (Today)")} className="lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-3 text-center">
            <div className="surface-flat rounded-xl p-4 border border-border/60">
              <p className="text-sm font-semibold text-muted-foreground">{pick("مبيعات اليوم", "Today's Sales")}</p>
              <p className="mt-2 text-2xl font-bold text-primary">{n(124)} <span className="text-sm font-normal text-muted-foreground">{pick("طلب", "orders")}</span></p>
              <p className="mt-1 text-xs text-emerald-600 font-bold">↑ 12% {pick("عن الأمس", "vs yesterday")}</p>
            </div>
            <div className="surface-flat rounded-xl p-4 border border-border/60">
              <p className="text-sm font-semibold text-muted-foreground">{pick("الإنتاج التام", "Completed Production")}</p>
              <p className="mt-2 text-2xl font-bold text-brand">{n(850)} <span className="text-sm font-normal text-muted-foreground">{pick("وحدة", "units")}</span></p>
              <p className="mt-1 text-xs text-emerald-600 font-bold">↑ 5% {pick("عن الأمس", "vs yesterday")}</p>
            </div>
            <div className="surface-flat rounded-xl p-4 border border-border/60">
              <p className="text-sm font-semibold text-muted-foreground">{pick("صرف المخزون (خامات)", "Stock Issued (Raw)")}</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">{n(420)} <span className="text-sm font-normal text-muted-foreground">{pick("كجم", "kg")}</span></p>
              <p className="mt-1 text-xs text-rose-600 font-bold">↓ 3% {pick("عن الأمس", "vs yesterday")}</p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live POS Orders Panel */}
        <Panel
          title={pick("آخر طلبات نقاط البيع (Live POS Activity)", "Live POS Terminal Orders")}
          aside={
            <Link to="/sales" className="text-xs font-bold uppercase text-primary hover:underline flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-amber-500" />
              <span>{pick("عرض الكل في المبيعات", "View in Sales")}</span>
            </Link>
          }
        >
          {posOrders.length > 0 ? (
            <div className="space-y-2">
              {posOrders.slice(0, 5).map((po) => (
                <div
                  key={po.id}
                  className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-foreground">{po.orderNumber}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-muted text-muted-foreground">
                          📍 {pick(po.branchName.ar, po.branchName.en)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        👨‍🍳 {po.cashierName} • {po.customerName}
                      </span>
                    </div>
                  </div>

                  <div className="text-end shrink-0">
                    <span className="font-mono font-black text-sm text-[#16A34A] dark:text-emerald-400 block">
                      {money(po.total)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {po.formattedDate.split(",")[1] || po.formattedDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-xs">
              <Store className="w-8 h-8 mx-auto opacity-30 mb-1" />
              <p>{pick("لا توجد طلبات نقاط بيع مسجلة حالياً", "No POS orders yet")}</p>
            </div>
          )}
        </Panel>

        {/* General Sales Invoices Panel */}
        <Panel
          title={t("recentInvoices")}
          aside={
            <Link to="/sales" className="text-xs font-bold uppercase text-primary hover:underline">
              {t("viewAll")}
            </Link>
          }
        >
          <DataTable head={[t("invoice"), t("customer"), t("amount"), t("status")]}>
            {invoices.slice(0, 5).map((inv) => (
              <tr
                key={inv.id}
                className="hover:bg-secondary/70 transition-colors group cursor-pointer"
              >
                <Td className="num font-bold">
                  <Link
                    to="/sales/$invoiceId"
                    params={{ invoiceId: inv.id }}
                    className="font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group-hover:underline text-primary font-bold"
                    title={pick("عرض تفاصيل وبنود الفاتورة", "View invoice details & items")}
                  >
                    <span>{inv.id}</span>
                    <ExternalLink className="size-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                </Td>
                <Td>
                  <Link
                    to="/sales/$invoiceId"
                    params={{ invoiceId: inv.id }}
                    className="font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group hover:underline cursor-pointer"
                    title={pick("عرض تفاصيل وبنود الفاتورة", "View invoice details & items")}
                  >
                    <Building2 className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <span className="truncate max-w-[120px] block">{pick(inv.party.ar, inv.party.en)}</span>
                  </Link>
                </Td>
                <Td className="num font-semibold">{money(inv.amount)}</Td>
                <Td>
                  <StatusPill status={inv.status} />
                </Td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>
    </>
  );
}
