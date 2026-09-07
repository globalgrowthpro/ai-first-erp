import { createFileRoute } from "@tanstack/react-router";
import { Download, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, PageHeader, Panel } from "@/components/kit";
import { insights, issues, kpis } from "@/lib/demo-data";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Daily CEO Report — Hafez ERP" },
      {
        name: "description",
        content: "End-of-day business report: sales, purchases, inventory, finance and AI written analysis.",
      },
      { property: "og:title", content: "Daily CEO Report — Hafez ERP" },
      { property: "og:description", content: "Database-backed daily figures with an AI summary." },
    ],
  }),
  component: Reports,
});

function Block({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <Panel title={title}>
      <dl className="space-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="num font-bold">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function Reports() {
  const { t, pick, money, n } = useI18n();

  return (
    <>
      <PageHeader
        title={t("ceoReport")}
        subtitle={t("reportsSub")}
        actions={
          <Btn variant="outline">
            <Download className="size-4" />
            PDF
          </Btn>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Block
          title={t("nav_sales")}
          rows={[
            [t("kpi_sales"), money(kpis.sales)],
            [t("recentInvoices"), n(kpis.invoices)],
            [t("customer"), n(kpis.customersServed)],
            [t("amount"), money(kpis.avgInvoice)],
          ]}
        />
        <Block
          title={t("nav_purchases")}
          rows={[
            [t("kpi_purchases"), money(kpis.purchases)],
            [t("purchaseOrders"), n(9)],
          ]}
        />
        <Block
          title={t("nav_inventory")}
          rows={[
            [t("kpi_stockValue"), money(kpis.stockValue)],
            [t("lowStock"), n(3)],
            [pick("حركة دخول", "Stock in"), n(142)],
            [pick("حركة خروج", "Stock out"), n(97)],
          ]}
        />
        <Block
          title={t("nav_accounting")}
          rows={[
            [t("kpi_cash"), money(kpis.cash)],
            [t("kpi_receivables"), money(kpis.receivables)],
            [t("kpi_payables"), money(kpis.payables)],
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t("aiInsights")} tone="ink" aside={<Sparkles className="size-4" />}>
          <ul className="space-y-3 text-sm">
            {insights.map((i) => (
              <li key={i.en} className="rounded-md border border-ink-foreground/20 bg-ink-foreground/5 p-3">
                {pick(i.ar, i.en)}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("problems")}>
          <ul className="list-inside list-disc space-y-2 text-sm">
            {issues.map((i) => (
              <li key={i.en}>{pick(i.ar, i.en)}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
