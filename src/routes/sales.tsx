import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, PageHeader, Panel, StatusPill, Td } from "@/components/kit";
import { kpis } from "@/lib/demo-data";
import { useSalesStore, type BizDocument } from "@/lib/documents-store";
import { DocumentFormModal, ConfirmDeleteDialog } from "@/components/documents/DocumentFormModal";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales & Invoices — Hafez ERP" },
      {
        name: "description",
        content: "Sales invoices, balances and collection status with AI-assisted invoice creation.",
      },
      { property: "og:title", content: "Sales & Invoices — Hafez ERP" },
      { property: "og:description", content: "Track invoices, balances and overdue collections." },
    ],
  }),
  component: Sales,
});

function Sales() {
  const { t, pick, money } = useI18n();
  const { documents, addDocument, updateDocument, deleteDocument, markPaid, nextCode } =
    useSalesStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BizDocument | null>(null);
  const [deleting, setDeleting] = useState<BizDocument | null>(null);

  const outstanding = documents.reduce((s, i) => s + i.balance, 0);
  const total = documents.reduce((s, i) => s + i.amount, 0);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (doc: BizDocument) => {
    setEditing(doc);
    setFormOpen(true);
  };

  const handleSave = (doc: Omit<BizDocument, "id"> & { id?: string }) => {
    if (editing) {
      updateDocument(editing.id, doc);
    } else {
      addDocument(doc);
    }
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title={t("nav_sales")}
        subtitle={pick("الفواتير والتحصيل", "Invoices and collection")}
        actions={
          <Btn onClick={openNew}>
            <Plus className="size-4" />
            {t("newInvoice")}
          </Btn>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("kpi_sales")} value={money(total || kpis.sales)} delta={kpis.salesDelta} accent="primary" />
        <KpiCard label={t("balance")} value={money(outstanding)} accent="gold" />
        <KpiCard label={t("kpi_receivables")} value={money(kpis.receivables)} delta={kpis.receivablesDelta} accent="brand" />
      </div>

      <Panel title={t("recentInvoices")}>
        <DataTable
          head={[
            t("invoice"),
            t("customer"),
            t("date"),
            t("amount"),
            t("balance"),
            t("status"),
            pick("إجراءات", "Actions"),
          ]}
        >
          {documents.map((inv) => (
            <tr key={inv.id} className="hover:bg-secondary">
              <Td className="num font-bold">{inv.id}</Td>
              <Td>{pick(inv.party.ar, inv.party.en)}</Td>
              <Td className="num text-muted-foreground">{inv.date}</Td>
              <Td className="num font-semibold">{money(inv.amount)}</Td>
              <Td className="num">{money(inv.balance)}</Td>
              <Td>
                <StatusPill status={inv.status} />
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  {inv.status !== "paid" && (
                    <button
                      type="button"
                      onClick={() => markPaid(inv.id)}
                      title={pick("تسجيل تحصيل", "Mark paid")}
                      className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-600"
                    >
                      <CheckCircle2 className="size-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(inv)}
                    title={pick("تعديل", "Edit")}
                    className="p-1.5 rounded-md hover:bg-primary/10 text-primary"
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(inv)}
                    title={pick("حذف", "Delete")}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      <DocumentFormModal
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        suggestedCode={nextCode()}
        kind="sales"
        onSave={handleSave}
      />

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={pick("حذف فاتورة", "Delete invoice")}
        message={pick(
          `سيتم حذف الفاتورة ${deleting?.id ?? ""} نهائياً.`,
          `Invoice ${deleting?.id ?? ""} will be permanently deleted.`,
        )}
        onConfirm={() => {
          if (deleting) deleteDocument(deleting.id);
          setDeleting(null);
        }}
      />
    </>
  );
}
