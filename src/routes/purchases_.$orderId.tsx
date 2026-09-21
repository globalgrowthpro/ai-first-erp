import { createFileRoute } from "@tanstack/react-router";
import { InvoiceDetailPage } from "@/components/documents/InvoiceDetailPage";

export const Route = createFileRoute("/purchases_/$orderId")({
  head: ({ params }) => ({
    meta: [
      { title: `Purchase Order ${params.orderId} — Hafez ERP` },
      { name: "description", content: `Purchase order ${params.orderId} details, items, supplier information, and receiving status.` },
    ],
  }),
  component: PurchaseOrderRoute,
});

function PurchaseOrderRoute() {
  const { orderId } = Route.useParams();
  return <InvoiceDetailPage docId={orderId} kind="purchases" />;
}
