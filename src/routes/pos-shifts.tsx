import { createFileRoute } from "@tanstack/react-router";
import { AdminPosShiftsView } from "@/components/pos/AdminPosShiftsView";

export const Route = createFileRoute("/pos-shifts")({
  head: () => ({
    meta: [
      { title: "ورديات ونقدية الكاشير — Hafez ERP" },
      {
        name: "description",
        content: "إدارة ومتابعة ورديات الكاشير اليومية، العهد الافتتاحية، النقدية المحسوبة والمحصلة، وفروقات العجز والزيادة (Ups / Downs).",
      },
      { property: "og:title", content: "ورديات ونقدية الكاشير — Hafez ERP" },
      { property: "og:description", content: "Daily Cashier Shifts & Cash Reconciliation Ledger" },
    ],
  }),
  component: PosShiftsPage,
});

function PosShiftsPage() {
  return (
    <div className="space-y-4">
      <AdminPosShiftsView />
    </div>
  );
}
