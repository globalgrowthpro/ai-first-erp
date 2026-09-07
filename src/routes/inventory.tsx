import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { DataTable, KpiCard, PageHeader, Panel, Td } from "@/components/kit";
import { kpis, products } from "@/lib/demo-data";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Hafez ERP" },
      {
        name: "description",
        content: "Stock levels per warehouse, minimum thresholds, low-stock alerts and inventory value.",
      },
      { property: "og:title", content: "Inventory — Hafez ERP" },
      { property: "og:description", content: "Warehouse stock levels and low-stock alerts." },
    ],
  }),
  component: Inventory,
});

function Inventory() {
  const { t, pick, money, n } = useI18n();
  const low = products.filter((p) => p.qty < p.min);

  return (
    <>
      <PageHeader
        title={t("nav_inventory")}
        subtitle={pick("الأرصدة والحركات والحد الأدنى", "Balances, movements and minimums")}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("kpi_stockValue")} value={money(kpis.stockValue)} delta={kpis.stockDelta} accent="brand" />
        <KpiCard label={t("totalStock")} value={n(products.length)} accent="ink" />
        <KpiCard label={t("lowStock")} value={n(low.length)} accent="primary" />
      </div>

      {low.length ? (
        <div className="surface-panel rounded-lg border-primary bg-primary p-4 text-primary-foreground">
          <p className="flex items-center gap-2 text-sm font-bold uppercase">
            <AlertTriangle className="size-4" />
            {t("lowStock")}
          </p>
          <p className="mt-1 text-sm">
            {low.map((p) => pick(p.name.ar, p.name.en)).join(" · ")}
          </p>
        </div>
      ) : null}

      <Panel title={t("nav_inventory")}>
        <DataTable head={[t("sku"), t("product"), t("warehouse"), t("qty"), t("min"), t("value")]}>
          {products.map((p) => (
            <tr key={p.sku} className="hover:bg-secondary">
              <Td className="num font-bold">{p.sku}</Td>
              <Td>{pick(p.name.ar, p.name.en)}</Td>
              <Td className="text-muted-foreground">{pick(p.warehouse.ar, p.warehouse.en)}</Td>
              <Td className={p.qty < p.min ? "num font-bold text-destructive" : "num font-semibold"}>
                {n(p.qty)}
              </Td>
              <Td className="num text-muted-foreground">{n(p.min)}</Td>
              <Td className="num">{money(p.qty * p.price)}</Td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
