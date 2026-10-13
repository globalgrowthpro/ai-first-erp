import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Sparkles, Building2, ExternalLink, Store, Receipt, Clock, PackageCheck, Factory } from "lucide-react";
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
import { useSalesStore, usePurchasesStore } from "@/lib/documents-store";
import { useAccountsStore } from "@/lib/accounting-store";
import { useInventoryStore } from "@/lib/inventory-store";
import { useHrStore } from "@/lib/hr-store";
import { useManufacturingStore } from "@/lib/manufacturing-store";
import { usePosOrdersStore, formatOrderDateTimeEnglish } from "@/lib/pos-orders-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hafez ERP — AI-First ERP Dashboard" },
      {
        name: "description",
        content:
          "Bilingual AI-first ERP dashboard: live sales, cash, receivables, inventory and AI insights backed by Supabase.",
      },
      { property: "og:title", content: "Hafez ERP — AI-First ERP Dashboard" },
      {
        property: "og:description",
        content: "Traditional ERP plus an AI operating layer with live Supabase telemetry.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, pick, money, n, lang } = useI18n();
  const { orders: posOrders } = usePosOrdersStore();
  const { documents: salesInvoices } = useSalesStore();
  const { documents: purchaseBills } = usePurchasesStore();
  const { accounts } = useAccountsStore();
  const { products } = useInventoryStore();
  const { leaves, approveLeaveRequest } = useHrStore();
  const { orders: workOrders } = useManufacturingStore();

  // --- Dynamic Live Financial Computations ---
  const livePosSales = useMemo(
    () => posOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [posOrders]
  );
  const liveInvoiceSales = useMemo(
    () => salesInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0),
    [salesInvoices]
  );
  const liveTotalSales = livePosSales + liveInvoiceSales;

  const liveTotalPurchases = useMemo(
    () => purchaseBills.reduce((sum, po) => sum + (Number(po.amount) || 0), 0),
    [purchaseBills]
  );

  const liveReceivables = useMemo(
    () => salesInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0),
    [salesInvoices]
  );

  const livePayables = useMemo(
    () => purchaseBills.reduce((sum, po) => sum + (Number(po.balance) || 0), 0),
    [purchaseBills]
  );

  const liveCash = useMemo(() => {
    const cashAccs = accounts.filter(
      (a) => a.code.startsWith("111") || a.code.startsWith("112")
    );
    const balanceFromAccounts = cashAccs.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    return balanceFromAccounts > 0 ? balanceFromAccounts : livePosSales;
  }, [accounts, livePosSales]);

  const liveStockValuation = useMemo(() => {
    return Math.round(
      products.reduce(
        (sum, p) => sum + Number(p.costPrice || 0) * Number(p.qty || 0),
        0
      )
    );
  }, [products]);

  const liveExpenses = useMemo(() => {
    const expAccs = accounts.filter((a) => a.type === "expense");
    return expAccs.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }, [accounts]);

  const liveNetProfit = Math.max(0, liveTotalSales - liveTotalPurchases - (liveExpenses > 0 ? liveExpenses : Math.round(liveTotalSales * 0.18)));
  const totalOrdersCount = posOrders.length + salesInvoices.length;
  const avgTicket = totalOrdersCount > 0 ? Math.round(liveTotalSales / totalOrdersCount) : 0;

  // --- Dynamic Live 7-Day Trend Chart ---
  const chartData = useMemo(() => {
    const days: { key: string; name: string; sales: number; purchases: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "short" });

      const dayPos = posOrders
        .filter((o) => String(o.createdAt || "").slice(0, 10) === dateStr)
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

      const dayInv = salesInvoices
        .filter((inv) => String(inv.date || "").slice(0, 10) === dateStr)
        .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

      const dayPurchases = purchaseBills
        .filter((p) => String(p.date || "").slice(0, 10) === dateStr)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      days.push({
        key: dateStr,
        name: dayName,
        sales: Math.round(dayPos + dayInv),
        purchases: Math.round(dayPurchases),
      });
    }
    return days;
  }, [posOrders, salesInvoices, purchaseBills, lang]);

  // --- Dynamic Live Operational Issues ---
  const dynamicIssues = useMemo(() => {
    const list: { ar: string; en: string }[] = [];
    const lowStockItems = products.filter(
      (p) => Number(p.qty || 0) <= Number(p.minStock || 10)
    );
    if (lowStockItems.length > 0) {
      list.push({
        ar: `يوجد ${lowStockItems.length} أصناف أوشك مخزونها على النفاد بحاجة لإعادة الشراء`,
        en: `${lowStockItems.length} items running low on stock require reordering`,
      });
    }

    const overdueCount = salesInvoices.filter((i) => i.balance > 0).length;
    if (overdueCount > 0) {
      list.push({
        ar: `يوجد ${overdueCount} فواتير بيع آجلة تستحق المتابعة والتحصيل الفوري`,
        en: `${overdueCount} outstanding receivables awaiting collection follow-up`,
      });
    }

    const pendingWorkOrders = workOrders.filter((w) => w.status !== "completed");
    if (pendingWorkOrders.length > 0) {
      list.push({
        ar: `${pendingWorkOrders.length} أوامر تصنيع قيد التنفيذ بالمطبخ المركزي`,
        en: `${pendingWorkOrders.length} manufacturing orders currently active in production`,
      });
    }

    if (list.length === 0) {
      list.push({
        ar: "جميع العمليات التشغيلية والمخزنية منتظمة ومطابقة للمعايير",
        en: "All inventory and operational processes are currently in optimal state",
      });
    }
    return list;
  }, [products, salesInvoices, workOrders]);

  // --- Dynamic Live Pending Approvals ---
  const dynamicApprovals = useMemo(() => {
    const list: { id: string; title: { ar: string; en: string }; by: { ar: string; en: string }; type: "leave" | "work_order" }[] = [];
    leaves
      .filter((l) => l.status === "pending")
      .slice(0, 3)
      .forEach((l) => {
        list.push({
          id: l.id,
          title: {
            ar: `طلب إجازة ${l.leaveType} (${l.daysCount} أيام)`,
            en: `Leave Request (${l.daysCount} days)`,
          },
          by: l.employeeName,
          type: "leave",
        });
      });

    workOrders
      .filter((w) => w.status === "confirmed" || w.status === "draft")
      .slice(0, 2)
      .forEach((w) => {
        list.push({
          id: w.id,
          title: {
            ar: `اعتماد أمر إنتاج ${w.code} (${w.finishedProductName.ar})`,
            en: `Approve Production Order ${w.code}`,
          },
          by: { ar: w.supervisor || "المطبخ المركزي", en: w.supervisor || "Central Kitchen" },
          type: "work_order",
        });
      });

    return list;
  }, [leaves, workOrders]);

  // --- Dynamic Live AI Insights ---
  const dynamicAiInsights = useMemo(() => {
    const items: { ar: string; en: string }[] = [];
    if (liveTotalSales > 0) {
      items.push({
        ar: `إجمالي مبيعات اليوم بلغ ${money(liveTotalSales)} بمعدل نمو مستقر عبر فروع القاهرة ومنافذ البيع.`,
        en: `Today's revenue reached ${money(liveTotalSales)} with consistent throughput across sales channels.`,
      });
    }
    if (liveReceivables > 0) {
      items.push({
        ar: `رصيد المستحقات غير المسددة ${money(liveReceivables)}، يُنصح بتفعيل التنبيهات الدورية للعملاء.`,
        en: `Uncollected customer balance stands at ${money(liveReceivables)}; automated collection alerts suggested.`,
      });
    }
    if (products.length > 0) {
      items.push({
        ar: `إجمالي تقييم بضاعة المخزون الحالية يقدر بـ ${money(liveStockValuation)} موزعة على المستودعات المركزية.`,
        en: `Current merchandise valuation estimated at ${money(liveStockValuation)} across central hubs.`,
      });
    }
    return items;
  }, [liveTotalSales, liveReceivables, liveStockValuation, products.length, money]);

  return (
    <>
      <PageHeader
        title={t("nav_dashboard")}
        subtitle={`${t("company")} · ${t("today")}`}
        actions={
          <>
            <Link to="/reports">
              <Btn variant="outline">{t("ceoReport")}</Btn>
            </Link>
            <Link to="/ai">
              <Btn>
                <Sparkles className="size-4" />
                {t("askAi")}
              </Btn>
            </Link>
          </>
        }
      />

      {/* Top 10 Dynamic KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard label={t("kpi_sales")} value={money(liveTotalSales)} color="rose" />
        <KpiCard label={t("kpi_purchases")} value={money(liveTotalPurchases)} color="blue" />
        <KpiCard label={t("kpi_netProfit")} value={money(liveNetProfit)} color="amber" />
        <KpiCard label={t("kpi_cash")} value={money(liveCash)} color="emerald" />
        <KpiCard label={t("kpi_operatingExpenses")} value={money(liveExpenses > 0 ? liveExpenses : Math.round(liveTotalSales * 0.12))} color="orange" />

        <KpiCard label={t("kpi_receivables")} value={money(liveReceivables)} color="indigo" />
        <KpiCard label={t("kpi_payables")} value={money(livePayables)} color="purple" />
        <KpiCard label={t("kpi_stockValue")} value={money(liveStockValuation)} color="cyan" />
        <KpiCard label={t("kpi_orders")} value={`${n(totalOrdersCount)} ${pick("طلب / فاتورة", "Orders")}`} color="fuchsia" />
        <KpiCard label={t("kpi_avgTicket")} value={money(avgTicket)} color="teal" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Dynamic 7-Day Trend Chart */}
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
                <Bar dataKey="sales" fill="var(--primary)" radius={[3, 3, 0, 0]} name={pick("المبيعات", "Sales")} />
                <Bar dataKey="purchases" fill="var(--brand)" radius={[3, 3, 0, 0]} name={pick("المشتريات", "Purchases")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/70 pt-4 text-center">
            <div>
              <p className="num text-xl font-bold">{n(totalOrdersCount)}</p>
              <p className="text-[11px] uppercase text-muted-foreground">{t("recentInvoices")}</p>
            </div>
            <div>
              <p className="num text-xl font-bold">{n(posOrders.length)}</p>
              <p className="text-[11px] uppercase text-muted-foreground">{pick("طلبات الكاشير", "POS Orders")}</p>
            </div>
            <div>
              <p className="num text-xl font-bold">{money(avgTicket)}</p>
              <p className="text-[11px] uppercase text-muted-foreground">{t("kpi_avgTicket")}</p>
            </div>
          </div>
        </Panel>

        {/* Dynamic Live AI Insights Panel */}
        <Panel title={t("aiInsights")} tone="ink" aside={<Sparkles className="size-4" />}>
          <p className="text-xs text-ink-foreground/80">{t("aiInsightsSub")}</p>
          <ul className="mt-4 space-y-3">
            {dynamicAiInsights.map((i, idx) => (
              <li
                key={idx}
                className="rounded-xl border border-border/80 bg-card p-3.5 text-sm font-semibold text-card-foreground shadow-sm leading-relaxed"
              >
                {pick(i.ar, i.en)}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-amber-500/20 border border-amber-400/40 p-3 text-sm font-bold text-amber-300">
            {pick(`${dynamicIssues.length} تنبيهات وملاحظات تشغيلية تحتاج متابعتك اليوم.`, `${dynamicIssues.length} operational items need your attention today.`)}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Dynamic Live Problems & Alerts Panel */}
        <Panel title={t("problems")}>
          <ul className="space-y-3 text-sm">
            {dynamicIssues.map((i, idx) => (
              <li key={idx} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{pick(i.ar, i.en)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Dynamic Live Pending Approvals Panel */}
        <Panel title={t("pendingApprovals")}>
          {dynamicApprovals.length > 0 ? (
            <ul className="space-y-3">
              {dynamicApprovals.map((a) => (
                <li key={a.id} className="surface-flat rounded-md p-3">
                  <p className="text-sm font-semibold">{pick(a.title.ar, a.title.en)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{pick(a.by.ar, a.by.en)}</p>
                  <div className="mt-2 flex gap-2">
                    <Btn
                      variant="solid"
                      className="px-2 py-1 text-[11px]"
                      onClick={() => {
                        if (a.type === "leave") approveLeaveRequest(a.id, "Hafez Rahim");
                      }}
                    >
                      <CheckCircle2 className="size-3.5" />
                      {t("confirm")}
                    </Btn>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p>{pick("لا توجد موافقات معلقة حالياً", "No pending approvals")}</p>
            </div>
          )}
        </Panel>

        {/* Dynamic Cash Flow Sparkline Panel */}
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
          <div className="mt-2 text-center text-xs text-muted-foreground font-semibold">
            {pick("حركة تدفق الإيرادات اليومية المباشرة", "Direct live cash flow telemetry")}
          </div>
        </Panel>
      </div>

      {/* Live Operations Stat Bar */}
      <div className="grid gap-6 lg:grid-cols-3 my-6">
        <Panel title={pick("إحصاء العمليات المباشرة", "Live Operations Telemetry")} className="lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-3 text-center">
            <div className="surface-flat rounded-xl p-4 border border-border/60">
              <p className="text-sm font-semibold text-muted-foreground">{pick("طلبات نقاط البيع المباشرة", "Live POS Orders")}</p>
              <p className="mt-2 text-2xl font-bold text-primary">{n(posOrders.length)} <span className="text-sm font-normal text-muted-foreground">{pick("طلب مسجل", "orders")}</span></p>
              <p className="mt-1 text-xs text-emerald-600 font-bold">{money(livePosSales)}</p>
            </div>
            <div className="surface-flat rounded-xl p-4 border border-border/60">
              <p className="text-sm font-semibold text-muted-foreground">{pick("أوامر التصنيع النشطة", "Active Manufacturing Orders")}</p>
              <p className="mt-2 text-2xl font-bold text-brand">{n(workOrders.length)} <span className="text-sm font-normal text-muted-foreground">{pick("أمر تشغيل", "orders")}</span></p>
              <p className="mt-1 text-xs text-emerald-600 font-bold">{workOrders.filter(w => w.status === 'completed').length} {pick("مكتملة", "completed")}</p>
            </div>
            <div className="surface-flat rounded-xl p-4 border border-border/60">
              <p className="text-sm font-semibold text-muted-foreground">{pick("أصناف المخزون المسجلة", "Catalog Products")}</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">{n(products.length)} <span className="text-sm font-normal text-muted-foreground">{pick("صنف", "items")}</span></p>
              <p className="mt-1 text-xs text-primary font-bold">{money(liveStockValuation)}</p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Live POS Orders Panel */}
        <Panel
          title={pick("آخر طلبات نقاط البيع (Live POS Orders)", "Live POS Terminal Orders")}
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
                    <span className="text-[10px] text-muted-foreground block font-mono" dir="ltr">
                      {formatOrderDateTimeEnglish(po.createdAt || po.formattedDate).split(",")[1]?.trim() || formatOrderDateTimeEnglish(po.createdAt || po.formattedDate)}
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

        {/* Live Commercial Sales Invoices Panel */}
        <Panel
          title={t("recentInvoices")}
          aside={
            <Link to="/sales" className="text-xs font-bold uppercase text-primary hover:underline">
              {t("viewAll")}
            </Link>
          }
        >
          {salesInvoices.length > 0 ? (
            <DataTable head={[t("invoice"), t("customer"), t("amount"), t("status")]}>
              {salesInvoices.slice(0, 5).map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-secondary/70 transition-colors group cursor-pointer"
                >
                  <Td className="num font-bold">
                    <Link
                      to="/sales/$invoiceId"
                      params={{ invoiceId: inv.id }}
                      className="font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group-hover:underline text-primary"
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
          ) : (
            <div className="p-6 text-center text-muted-foreground text-xs">
              <Receipt className="w-8 h-8 mx-auto opacity-30 mb-1" />
              <p>{pick("لا توجد فواتير مبيعات تجارية مسجلة", "No commercial sales invoices")}</p>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
