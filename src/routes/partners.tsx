import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, PageHeader, Panel, Td } from "@/components/kit";
import { partners } from "@/lib/demo-data";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Customers & Suppliers — Hafez ERP" },
      {
        name: "description",
        content: "Customer and supplier directory with balances, contacts and account codes.",
      },
      { property: "og:title", content: "Customers & Suppliers — Hafez ERP" },
      { property: "og:description", content: "Directory of customers and suppliers with balances." },
    ],
  }),
  component: Partners,
});

function Partners() {
  const { t, pick, money } = useI18n();

  return (
    <>
      <PageHeader
        title={t("partners")}
        subtitle={pick("الأرصدة وبيانات التواصل", "Balances and contact details")}
        actions={
          <Btn>
            <Plus className="size-4" />
            {pick("إضافة", "Add")}
          </Btn>
        }
      />

      <Panel title={t("partners")}>
        <DataTable head={["#", pick("الاسم", "Name"), t("type"), t("phone"), t("balance")]}>
          {partners.map((p) => (
            <tr key={p.code} className="hover:bg-secondary">
              <Td className="num font-bold">{p.code}</Td>
              <Td>{pick(p.name.ar, p.name.en)}</Td>
              <Td>
                <span
                  className={
                    p.type === "customer"
                      ? "rounded-md bg-brand/15 text-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                      : "rounded-md bg-gold/25 text-gold-foreground px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                  }
                >
                  {p.type === "customer" ? t("customer") : t("supplier")}
                </span>
              </Td>
              <Td className="num text-muted-foreground">{p.phone}</Td>
              <Td className="num font-semibold">{money(p.balance)}</Td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
