import { useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, FileUp, Edit2, Trash2, CheckCircle2, Users, ExternalLink, Eye, Upload, Download, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, PageHeader, Panel, StatusPill, Td } from "@/components/kit";
import { kpis } from "@/lib/demo-data";
import { usePurchasesStore, type BizDocument } from "@/lib/documents-store";
import { useDispatchStore } from "@/lib/dispatch-store";
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
  const navigate = useNavigate();
  const { documents, addDocument, updateDocument, deleteDocument, markPaid, nextCode } =
    usePurchasesStore();
  const { addOrder: addDispatchOrder } = useDispatchStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BizDocument | null>(null);
  const [deleting, setDeleting] = useState<BizDocument | null>(null);
  const [importMsg, setImportMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = documents.reduce((s, i) => s + i.amount, 0);

  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        "رقم_الطلب_ID": "PO-1001",
        "المورد_Supplier": "شركة التوريدات العالمية",
        "الفرع_Branch": "الفرع الرئيسي",
        "التاريخ_Date": "2026-10-01",
        "كود_الصنف_SKU": "SKU-P001",
        "اسم_الصنف_ItemName": "مواد خام أ",
        "الكمية_Qty": 100,
        "سعر_الوحدة_Price": 50,
        "الوحدة_Unit": "كجم",
        "طريقة_الدفع_PaymentMethod": "bank_transfer",
        "المدفوع_Paid": 5000,
        "حالة_السداد_Status": "paid"
      },
      {
        "رقم_الطلب_ID": "PO-1002",
        "المورد_Supplier": "مصنع الحديد",
        "الفرع_Branch": "مستودع الشرق",
        "التاريخ_Date": "2026-10-02",
        "كود_الصنف_SKU": "SKU-P002",
        "اسم_الصنف_ItemName": "حديد تسليح",
        "الكمية_Qty": 20,
        "سعر_الوحدة_Price": 1500,
        "الوحدة_Unit": "طن",
        "طريقة_الدفع_PaymentMethod": "check",
        "المدفوع_Paid": 15000,
        "حالة_السداد_Status": "partial"
      }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, ws, "المشتريات_Purchases");
    safeDownloadWorkbook(wb, "نموذج_استيراد_المشتريات_الشامل.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) return;
        const sheet = wb.Sheets[sheetName];
        if (!sheet) return;
        const rawRows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

        const grouped = rawRows.reduce((acc: Record<string, Record<string, any>[]>, row: Record<string, any>, idx: number) => {
          const rawId = String(row["رقم_الطلب_ID"] || row["رقم_الفاتورة_ID"] || row["ID"] || `PO-IMP-${Date.now()}-${idx}`).trim();
          if (!acc[rawId]) acc[rawId] = [];
          acc[rawId].push(row);
          return acc;
        }, {});

        let count = 0;
        Object.entries(grouped).forEach(([poId, rows]) => {
          const firstRow = rows[0] || {};
          const rawSupplier = String(firstRow["المورد_Supplier"] || firstRow["العميل_Customer"] || firstRow["Supplier"] || "مورد عام").trim();
          const rawBranch = String(firstRow["الفرع_Branch"] || firstRow["Branch"] || "").trim();
          const rawDate = String(firstRow["التاريخ_Date"] || firstRow["Date"] || new Date().toISOString().slice(0, 10)).trim();
          const rawPaymentMethod = String(firstRow["طريقة_الدفع_PaymentMethod"] || firstRow["PaymentMethod"] || "cash").trim();
          const rawPaid = Number(firstRow["المدفوع_Paid"] || firstRow["Paid"]) || 0;
          let rawStatus = String(firstRow["حالة_السداد_Status"] || firstRow["Status"] || "").trim().toLowerCase();

          const items = rows.map((r: Record<string, any>, i: number) => {
            const qty = Number(r["الكمية_Qty"] || r["Qty"]) || 1;
            const price = Number(r["سعر_الوحدة_Price"] || r["Price"]) || 0;
            const unit = String(r["الوحدة_Unit"] || r["Unit"] || "قطعة").trim();
            return {
              id: `itm-${Date.now()}-${i}`,
              sku: String(r["كود_الصنف_SKU"] || r["SKU"] || `SKU-${i+1}`).trim(),
              name: { ar: String(r["اسم_الصنف_ItemName"] || r["ItemName"] || "صنف مستورد").trim(), en: "Imported Item" },
              quantity: qty,
              unit: { ar: unit, en: unit === "قطعة" ? "pcs" : unit },
              unitPrice: price,
              total: qty * price
            };
          });

          const totalAmount = items.reduce((sum: number, item: any) => sum + item.total, 0);

          if (!["draft", "partial", "paid", "overdue"].includes(rawStatus)) {
            if (rawPaid >= totalAmount && totalAmount > 0) rawStatus = "paid";
            else if (rawPaid > 0 && rawPaid < totalAmount) rawStatus = "partial";
            else rawStatus = "draft";
          }
          
          const newDoc: Omit<BizDocument, "id"> & { id: string } = {
            id: poId,
            date: rawDate,
            party: { ar: rawSupplier, en: rawSupplier },
            ...(rawBranch ? { branch: { ar: rawBranch, en: rawBranch } } : {}),
            amount: totalAmount,
            balance: Math.max(0, totalAmount - rawPaid),
            status: rawStatus as any,
            paymentMethod: rawPaymentMethod,
            items
          };
          const created = addDocument(newDoc);
          
          // Auto-create Dispatch Order
          addDispatchOrder({
            date: created.date,
            branch: created.branch || { ar: "الفرع الرئيسي", en: "Main Branch" },
            linkedDoc: { type: "purchase", id: created.id },
            status: "draft",
            totalItems: created.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
            items: [],
          });
          count++;
        });

        setImportMsg({ type: "success", text: pick(`تم استيراد ${count} أمر شراء بنجاح`, `Successfully imported ${count} purchase orders`) });
        setTimeout(() => setImportMsg(null), 4000);
      } catch (err) {
        console.error(err);
        setImportMsg({ type: "error", text: pick("حدث خطأ أثناء الاستيراد", "Error during import") });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSave = (doc: Omit<BizDocument, "id"> & { id?: string }) => {
    if (editing) {
      updateDocument(editing.id, doc);
    } else {
      const created = addDocument(doc);
      // Auto-create Dispatch Order
      addDispatchOrder({
        date: created.date,
        branch: created.branch || { ar: "الفرع الرئيسي", en: "Main Branch" },
        linkedDoc: { type: "purchase", id: created.id },
        status: "draft",
        totalItems: created.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        items: [],
      });
    }
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title={t("nav_purchases")}
        subtitle={pick("أوامر الشراء والتوريد", "Purchase orders and procurement")}
        actions={
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".xlsx, .xls"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImportExcel}
            />
            <Btn variant="outline" onClick={handleDownloadTemplate} title={pick("تحميل نموذج استيراد المشتريات", "Download Purchases Template")}>
              <Download className="size-4" />
            </Btn>
            <Btn variant="outline" className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10" onClick={() => fileInputRef.current?.click()} title={pick("استيراد مشتريات من إكسيل", "Import Purchases from Excel")}>
              <Upload className="size-4" />
              <span className="hidden sm:inline">{pick("استيراد إكسيل", "Import Excel")}</span>
            </Btn>
            <Btn onClick={openNew}>
              <Plus className="size-4" />
              {t("newPurchaseOrder")}
            </Btn>
          </div>
        }
      />

      {importMsg && (
        <div className={`p-3 mb-4 rounded-lg text-sm font-bold flex items-center gap-2 ${importMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'}`}>
          {importMsg.type === 'success' ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
          <span>{importMsg.text}</span>
        </div>
      )}

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
              <tr
                key={po.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button, a")) return;
                  navigate({ to: "/purchases/$orderId", params: { orderId: po.id } });
                }}
                className="hover:bg-secondary/70 cursor-pointer transition-colors group"
              >
                <Td className="num font-bold">
                  <Link
                    to="/purchases/$orderId"
                    params={{ orderId: po.id }}
                    className="hover:text-primary transition-colors inline-flex items-center gap-1 group-hover:underline text-primary font-bold"
                    title={pick("عرض تفاصيل وبنود أمر الشراء", "View purchase order details & items")}
                  >
                    <span>{po.id}</span>
                    <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                  </Link>
                </Td>
                <Td>
                  <div className="space-y-0.5">
                    <Link
                      to="/purchases/$orderId"
                      params={{ orderId: po.id }}
                      className="font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group hover:underline cursor-pointer"
                      title={pick("عرض تفاصيل أمر الشراء والمورد", "View purchase order & supplier")}
                    >
                      <Users className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      <span>{pick(po.party.ar, po.party.en)}</span>
                      <ExternalLink className="size-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                    {po.branch && (
                      <span className="block text-[10px] text-muted-foreground font-medium">
                        📍 {pick(po.branch.ar, po.branch.en)}
                      </span>
                    )}
                  </div>
                </Td>
                <Td className="num text-muted-foreground">{po.date}</Td>
                <Td className="num font-semibold">{money(po.amount)}</Td>
                <Td>
                  <StatusPill status={po.status} />
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Link
                      to="/purchases/$orderId"
                      params={{ orderId: po.id }}
                      title={pick("عرض تفاصيل وبنود أمر الشراء", "View order details & items")}
                      className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Eye className="size-4" />
                    </Link>
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
