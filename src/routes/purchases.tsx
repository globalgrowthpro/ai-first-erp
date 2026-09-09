import { createFileRoute } from "@tanstack/react-router";
import { Plus, FileUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, PageHeader, Panel, StatusPill, Td } from "@/components/kit";
import { kpis, purchaseOrders } from "@/lib/demo-data";

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases — Hafez ERP" },
      {
        name: "description",
        content: "Purchase orders, supplier balances and AI document extraction from PDFs and receipts.",
      },
      { property: "og:title", content: "Purchases — Hafez ERP" },
      { property: "og:description", content: "Purchase orders and supplier document processing." },
    ],
  }),
  component: Purchases,
});

function Purchases() {
  const { t, pick, money } = useI18n();

  return (
    <>
      <PageHeader
        title={t("nav_purchases")}
        subtitle={pick("أوامر الشراء والموردون", "Purchase orders and suppliers")}
        actions={
          <>
            <Btn variant="outline">
              <FileUp className="size-4" />
              {pick("رفع مستند", "Upload document")}
            </Btn>
            <Btn>
              <Plus className="size-4" />
              {t("purchaseOrders")}
            </Btn>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("kpi_purchases")} value={money(kpis.purchases)} delta={kpis.purchasesDelta} accent="brand" />
        <KpiCard label={t("kpi_payables")} value={money(kpis.payables)} delta={kpis.payablesDelta} accent="ink" />
        <KpiCard label={t("purchaseOrders")} value={String(purchaseOrders.length)} accent="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={t("purchaseOrders")} className="lg:col-span-2">
          <DataTable head={[t("invoice"), t("supplier"), t("date"), t("amount"), t("status")]}>
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="hover:bg-secondary">
                <Td className="num font-bold">{po.id}</Td>
                <Td>{pick(po.party.ar, po.party.en)}</Td>
                <Td className="num text-muted-foreground">{po.date}</Td>
                <Td className="num font-semibold">{money(po.amount)}</Td>
                <Td>
                  <StatusPill status={po.status} />
                </Td>
              </tr>
            ))}
          </DataTable>
        </Panel>

        <Panel title={pick("وكيل المستندات", "Document Agent")} tone="ink">
          <p className="text-sm text-ink-foreground/70">
            {pick(
              "ارفع فاتورة PDF أو صورة، والوكيل يستخرج البيانات ويجهّز مسودة للمراجعة.",
              "Upload a PDF or photo; the agent extracts the data and prepares a draft for review.",
            )}
          </p>
          <div className="mt-4 rounded-xl border-2 border-dashed border-border/80 bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
            invoice.pdf · receipt.jpg
          </div>
          <div className="mt-4 rounded-xl border border-border/70 bg-card text-card-foreground p-3 text-sm shadow-sm">
            <p className="font-bold">{pick("آخر استخراج", "Last extraction")}</p>
            <p className="mt-1 text-muted-foreground">
              {pick("فاتورة من مورد النيل بقيمة", "Invoice from Nile Supplies for")}{" "}
              <span className="num font-bold text-foreground">{money(25500)}</span>
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
