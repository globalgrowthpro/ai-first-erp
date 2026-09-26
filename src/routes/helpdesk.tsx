import { createFileRoute } from "@tanstack/react-router";
import { HelpdeskManagement } from "@/components/settings/HelpdeskManagement";
import { PageHeader } from "@/components/kit";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/helpdesk")({
  head: () => ({
    meta: [
      { title: "Helpdesk & Operations Support — Wazeer ERP" },
      {
        name: "description",
        content:
          "Helpdesk ticketing and operations support for branch POS, kitchen, inventory, and accounting.",
      },
      { property: "og:title", content: "Helpdesk — Wazeer ERP" },
    ],
  }),
  component: HelpdeskPage,
});

function HelpdeskPage() {
  const { pick } = useI18n();

  return (
    <div className="space-y-6">
      <PageHeader
        title={pick({
          ar: "الدعم الفني والعمليات (Helpdesk)",
          en: "Helpdesk & Support Operations",
        })}
        subtitle={pick({
          ar: "إدارة ومتابعة بلاغات وتذاكر نقاط البيع، المطابخ، التوريدات، والمحاسبة مع اتفاقيات SLA",
          en: "Manage and resolve POS, kitchen, supply chain, and billing tickets with real-time SLA tracking",
        })}
      />

      <HelpdeskManagement />
    </div>
  );
}
