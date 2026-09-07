import { createFileRoute } from "@tanstack/react-router";
import { Check, X, ShieldAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { DataTable, PageHeader, Panel, Td } from "@/components/kit";
import { highRiskActions, permissionMatrix, roles } from "@/lib/demo-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Roles — Hafez ERP" },
      {
        name: "description",
        content: "Role-based access control, permission matrix and the actions that always require confirmation.",
      },
      { property: "og:title", content: "Settings & Roles — Hafez ERP" },
      { property: "og:description", content: "Roles, permissions and high-risk action policy." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { t, pick, n } = useI18n();

  return (
    <>
      <PageHeader
        title={t("nav_settings")}
        subtitle={pick(
          "الصلاحيات تُفحص في الخادم — الذكاء الاصطناعي لا يقرر بنفسه",
          "Permissions are enforced on the server — the AI never decides on its own",
        )}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={t("roles")}>
          <ul className="space-y-2">
            {roles.map((r) => (
              <li key={r.key.en} className="surface-flat flex items-center justify-between rounded-md px-3 py-2 text-sm">
                <span className="font-semibold">{pick(r.key.ar, r.key.en)}</span>
                <span className="num text-muted-foreground">
                  {n(r.users)} {pick("مستخدم", "users")}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t("permissionMatrix")} className="lg:col-span-2">
          <DataTable head={[t("permissions"), ...permissionMatrix.columns.map((c) => pick(c.ar, c.en))]}>
            {permissionMatrix.rows.map((row) => (
              <tr key={row.perm}>
                <Td className="font-mono text-xs font-bold">{row.perm}</Td>
                {row.allow.map((ok, i) => (
                  <Td key={i}>
                    {ok ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <X className="size-4 text-destructive" />
                    )}
                  </Td>
                ))}
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>

      <Panel title={t("highRisk")} tone="ink" aside={<ShieldAlert className="size-4" />}>
        <div className="flex flex-wrap gap-2">
          {highRiskActions.map((a) => (
            <span
              key={a.en}
              className="rounded-md border border-ink-foreground/25 bg-ink-foreground/5 px-3 py-1.5 text-sm"
            >
              {pick(a.ar, a.en)}
            </span>
          ))}
        </div>
      </Panel>
    </>
  );
}
