import { createFileRoute } from "@tanstack/react-router";
import { SalesAnalysisReportView } from "@/components/sales/SalesAnalysisReportView";

export const Route = createFileRoute("/sales-analysis")({
  head: () => ({
    meta: [
      { title: "تقرير تحليل المبيعات — وزير الحلو — Hafez ERP" },
      {
        name: "description",
        content: "تقرير تحليل المبيعات التفصيلي لنقاط البيع والفروع: إجمالي المبيعات، أنواع الطلب (تيك أواي، صالة، توصيل)، وطرق الدفع (كاش، فيزا).",
      },
      { property: "og:title", content: "تقرير تحليل المبيعات — Hafez ERP" },
      { property: "og:description", content: "Executive Sales Analysis, Channels, and Payment Methods Report" },
    ],
  }),
  component: SalesAnalysisPage,
});

function SalesAnalysisPage() {
  return (
    <div className="space-y-4">
      <SalesAnalysisReportView initialBranch="khosoos" />
    </div>
  );
}
