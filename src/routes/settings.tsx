import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, X, ShieldAlert, Building2, ShieldCheck, Users, Radio } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, PageHeader, Panel, Td } from "@/components/kit";
import { highRiskActions, permissionMatrix, roles } from "@/lib/demo-data";
import { CompanyBrandingSettings } from "@/components/settings/CompanyBrandingSettings";
import { UsersManagement } from "@/components/settings/UsersManagement";
import { GatewaySettings } from "@/components/settings/GatewaySettings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings, Users & Branding — Hafez ERP" },
      {
        name: "description",
        content: "Configure company info, color palette, invoice branding, users, departments, positions, roles, SMS and SMTP gateways.",
      },
      { property: "og:title", content: "Settings, Users & Branding — Hafez ERP" },
      { property: "og:description", content: "Company branding, invoice customization, users, departments, and permissions." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { t, pick, n } = useI18n();
  const [activeTab, setActiveTab] = useState<"branding" | "users" | "roles" | "gateways">("branding");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav_settings")}
        subtitle={pick(
          "إعدادات الشركة، الهوية البصرية، المستخدمون والهيكل الإداري ومصفوفة الصلاحيات",
          "Company profile, visual branding, users, departments, job positions, and security matrix"
        )}
      />

      {/* Main Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-3">
        <Btn
          variant={activeTab === "branding" ? "solid" : "outline"}
          onClick={() => setActiveTab("branding")}
          className="text-xs"
        >
          <Building2 className="size-4" />
          {t("companyBranding")}
        </Btn>
        <Btn
          variant={activeTab === "users" ? "solid" : "outline"}
          onClick={() => setActiveTab("users")}
          className="text-xs"
        >
          <Users className="size-4" />
          {t("usersAndOrg")}
        </Btn>
        <Btn
          variant={activeTab === "roles" ? "solid" : "outline"}
          onClick={() => setActiveTab("roles")}
          className="text-xs"
        >
          <ShieldCheck className="size-4" />
          {t("rolesAndSecurity")}
        </Btn>
        <Btn
          variant={activeTab === "gateways" ? "solid" : "outline"}
          onClick={() => setActiveTab("gateways")}
          className="text-xs"
        >
          <Radio className="size-4" />
          {pick("بوابات الرسائل والبريد (SMS & SMTP)", "Gateways & Notifications")}
        </Btn>
      </div>

      {/* Tab 1: Company Profile & Document Branding */}
      {activeTab === "branding" && <CompanyBrandingSettings />}

      {/* Tab 2: Users, Departments, Positions, Allowed Pages & Actions */}
      {activeTab === "users" && <UsersManagement />}

      {/* Tab 3: Gateways & SMS / SMTP Notifications */}
      {activeTab === "gateways" && <GatewaySettings />}

      {/* Tab 4: Roles & Security Matrix */}
      {activeTab === "roles" && (
        <div className="space-y-6">
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
                  className="surface-sunken border-destructive/30 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold text-destructive shadow-sm"
                >
                  <ShieldAlert className="size-3.5" />
                  {pick(a.ar, a.en)}
                </span>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
