import { createFileRoute } from "@tanstack/react-router";
import { InvoiceDetailPage } from "@/components/documents/InvoiceDetailPage";

export const Route = createFileRoute("/sales_/$invoiceId")({
  head: ({ params }) => ({
    meta: [
      { title: `Invoice ${params.invoiceId} — Hafez ERP` },
      { name: "description", content: `Tax invoice ${params.invoiceId} details, line items, and payment breakdown.` },
    ],
  }),
  component: SalesInvoiceRoute,
});

function SalesInvoiceRoute() {
  const { invoiceId } = Route.useParams();
  return <InvoiceDetailPage docId={invoiceId} kind="sales" />;
}
