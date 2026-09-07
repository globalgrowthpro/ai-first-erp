import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, PageHeader, Panel, StatusPill, Td } from "@/components/kit";
import { invoices, kpis } from "@/lib/demo-data";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales & Invoices — Hafez ERP" },
      {
        name: "description",
        content: "Sales invoices, balances and collection status with AI-assisted invoice creation.",
      },
      { property: "og:title", content: "Sales & Invoices — Hafez ERP" },
      { property: "og:description", content: "Track invoices, balances and overdue collections." },
    ],
  }),
  component: Sales,
});

function Sales() {
  const { t, pick, money } = useI18n();
  const outstanding = invoices.reduce((s, i) => s + i.balance, 0);

  return (
    <>
      <PageHeader
        title={t("nav_sales")}
        subtitle={pick("الفواتير والتحصيل", "Invoices and collection")}
        actions={
          <Btn>
            <Plus className="size-4" />
            {t("newInvoice")}
          </Btn>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("kpi_sales")} value={money(kpis.sales)} delta={kpis.salesDelta} accent="primary" />
        <KpiCard label={t("balance")} value={money(outstanding)} accent="gold" />
        <KpiCard label={t("kpi_receivables")} value={money(kpis.receivables)} delta={kpis.receivablesDelta} accent="brand" />
      </div>

      <Panel title={t("recentInvoices")}>
        <DataTable
          head={[t("invoice"), t("customer"), t("date"), t("amount"), t("balance"), t("status")]}
        >
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-secondary">
              <Td className="num font-bold">{inv.id}</Td>
              <Td>{pick(inv.party.ar, inv.party.en)}</Td>
              <Td className="num text-muted-foreground">{inv.date}</Td>
              <Td className="num font-semibold">{money(inv.amount)}</Td>
              <Td className="num">{money(inv.balance)}</Td>
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
