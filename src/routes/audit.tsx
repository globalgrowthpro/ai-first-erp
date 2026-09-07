import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DataTable, PageHeader, Panel, Td } from "@/components/kit";
import { auditLog } from "@/lib/demo-data";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — Hafez ERP" },
      {
        name: "description",
        content: "Every AI and user action is logged: who, which agent, what action, when and the result.",
      },
      { property: "og:title", content: "Audit Log — Hafez ERP" },
      { property: "og:description", content: "Full audit trail of user and AI agent actions." },
    ],
  }),
  component: Audit,
});

function Audit() {
  const { t, pick } = useI18n();

  return (
    <>
      <PageHeader
        title={t("nav_audit")}
        subtitle={pick("كل إجراء يُسجَّل — بما فيه الطلبات المرفوضة", "Every action is logged — including denied requests")}
      />

      <Panel title={t("nav_audit")}>
        <DataTable head={[t("user"), t("agent"), t("action"), t("time"), t("result")]}>
          {auditLog.map((row, i) => (
            <tr key={i} className="hover:bg-secondary">
              <Td className="font-semibold">{pick(row.user.ar, row.user.en)}</Td>
              <Td className="text-muted-foreground">{pick(row.agent.ar, row.agent.en)}</Td>
              <Td>{pick(row.action.ar, row.action.en)}</Td>
              <Td className="num text-muted-foreground">{row.time}</Td>
              <Td>
                <span
                  className={
                    row.ok
                      ? "rounded-sm border border-ink bg-success px-2 py-0.5 text-[11px] font-bold uppercase text-success-foreground"
                      : "rounded-sm border border-ink bg-destructive px-2 py-0.5 text-[11px] font-bold uppercase text-destructive-foreground"
                  }
                >
                  {row.ok ? "SUCCESS" : t("denied")}
                </span>
              </Td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
