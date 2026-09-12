import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, FileUp, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, PageHeader, Panel, StatusPill, Td } from "@/components/kit";
import { kpis } from "@/lib/demo-data";
import { usePurchasesStore, type BizDocument } from "@/lib/documents-store";
import { DocumentFormModal, ConfirmDeleteDialog } from "@/components/documents/DocumentFormModal";

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases — Hafez ERP" },
      {
        name: "description",
        content: "Purchase orders, supplier balances and AI document extraction from PDFs and receipts.",
      },
      { property: "og:title", content: "Purchases — Hafez ERP" },
      { property: "og:description", content: "Purchase orders and supplier document processing." },
    ],
  }),
  component: Purchases,
});

function Purchases() {
  const { t, pick, money } = useI18n();
  const { documents, addDocument, updateDocument, deleteDocument, markPaid, nextCode } =
    usePurchasesStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BizDocument | null>(null);
  const [deleting, setDeleting] = useState<BizDocument | null>(null);

  const total = documents.reduce((s, d) => s + d.amount, 0);

  const openNew = () => {
    setEditing(null);
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
        title={t("nav_purchases")}
        subtitle={pick("أوامر الشراء والموردون", "Purchase orders and suppliers")}
        actions={
          <>
            <Btn variant="outline" onClick={openNew}>
              <FileUp className="size-4" />
              {pick("رفع مستند", "Upload document")}
            </Btn>
            <Btn onClick={openNew}>
              <Plus className="size-4" />
              {t("purchaseOrders")}
            </Btn>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("kpi_purchases")} value={money(total || kpis.purchases)} delta={kpis.purchasesDelta} accent="brand" />
        <KpiCard label={t("kpi_payables")} value={money(kpis.payables)} delta={kpis.payablesDelta} accent="ink" />
        <KpiCard label={t("purchaseOrders")} value={String(documents.length)} accent="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={t("purchaseOrders")} className="lg:col-span-2">
          <DataTable
            head={[
              t("invoice"),
              t("supplier"),
              t("date"),
              t("amount"),
              t("status"),
              pick("إجراءات", "Actions"),
            ]}
          >
            {documents.map((po) => (
              <tr key={po.id} className="hover:bg-secondary">
                <Td className="num font-bold">{po.id}</Td>
                <Td>{pick(po.party.ar, po.party.en)}</Td>
                <Td className="num text-muted-foreground">{po.date}</Td>
                <Td className="num font-semibold">{money(po.amount)}</Td>
                <Td>
                  <StatusPill status={po.status} />
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    {po.status !== "paid" && (
                      <button
                        type="button"
                        onClick={() => markPaid(po.id)}
                        title={pick("تسجيل سداد", "Mark paid")}
                        className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-600"
                      >
                        <CheckCircle2 className="size-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(po);
                        setFormOpen(true);
                      }}
                      title={pick("تعديل", "Edit")}
                      className="p-1.5 rounded-md hover:bg-primary/10 text-primary"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(po)}
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

        <Panel title={pick("وكيل المستندات", "Document Agent")} tone="ink">
          <p className="text-sm text-ink-foreground/70">
            {pick(
              "ارفع فاتورة PDF أو صورة، والوكيل يستخرج البيانات ويجهّز مسودة للمراجعة.",
              "Upload a PDF or photo; the agent extracts the data and prepares a draft for review.",
            )}
          </p>
          <div className="mt-4 rounded-xl border-2 border-dashed border-border/80 bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
            invoice.pdf · receipt.jpg
          </div>
          <div className="mt-4 rounded-xl border border-border/70 bg-card text-card-foreground p-3 text-sm shadow-sm">
            <p className="font-bold">{pick("آخر استخراج", "Last extraction")}</p>
            <p className="mt-1 text-muted-foreground">
              {pick("فاتورة من مورد النيل بقيمة", "Invoice from Nile Supplies for")}{" "}
              <span className="num font-bold text-foreground">{money(25500)}</span>
            </p>
          </div>
        </Panel>
      </div>

      <DocumentFormModal
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        suggestedCode={nextCode()}
        kind="purchases"
        onSave={handleSave}
      />

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={pick("حذف أمر شراء", "Delete purchase order")}
        message={pick(
          `سيتم حذف أمر الشراء ${deleting?.id ?? ""} نهائياً.`,
          `Purchase order ${deleting?.id ?? ""} will be permanently deleted.`,
        )}
        onConfirm={() => {
          if (deleting) deleteDocument(deleting.id);
          setDeleting(null);
        }}
      />
    </>
  );
}
