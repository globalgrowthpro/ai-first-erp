import { useState, useRef, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Edit2, Trash2, CheckCircle2, Building2, ExternalLink, Eye, Upload, Download, AlertTriangle, Store, FileSpreadsheet, Calendar, RotateCcw, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, PageHeader, Panel, StatusPill, Td, TablePagination, usePagination } from "@/components/kit";
import { kpis } from "@/lib/demo-data";
import { useSalesStore, type BizDocument } from "@/lib/documents-store";
import { useDispatchStore } from "@/lib/dispatch-store";
import { DocumentFormModal, ConfirmDeleteDialog } from "@/components/documents/DocumentFormModal";
import { AdminPosOrdersView } from "@/components/pos/AdminPosOrdersView";
import { usePosOrdersStore } from "@/lib/pos-orders-store";
import { FileText, ShoppingBag } from "lucide-react";

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
  const navigate = useNavigate();
  const { documents, addDocument, updateDocument, deleteDocument, markPaid, nextCode } =
    useSalesStore();
  const { addOrder: addDispatchOrder } = useDispatchStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BizDocument | null>(null);
  const [deleting, setDeleting] = useState<BizDocument | null>(null);
  const [importMsg, setImportMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [salesTab, setSalesTab] = useState<"pos_orders" | "all_invoices" | "commercial">("pos_orders");
  const { metrics: posMetrics } = usePosOrdersStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters for Standard & Commercial Invoices
  const [invSearch, setInvSearch] = useState("");
  const [invDateFrom, setInvDateFrom] = useState("");
  const [invDateTo, setInvDateTo] = useState("");
  const [invStatus, setInvStatus] = useState("all");

  const filteredDocuments = useMemo(() => {
    return documents.filter((inv) => {
      if (salesTab === "commercial" && !(inv.balance > 0 || inv.status !== "paid")) return false;
      if (invStatus !== "all" && inv.status !== invStatus) return false;
      if (invSearch.trim()) {
        const q = invSearch.toLowerCase().trim();
        const matchId = String(inv.id || "").toLowerCase().includes(q);
        const matchParty = `${inv.party?.ar || ""} ${inv.party?.en || ""}`.toLowerCase().includes(q);
        if (!matchId && !matchParty) return false;
      }
      if (invDateFrom && inv.date < invDateFrom) return false;
      if (invDateTo && inv.date > invDateTo) return false;
      return true;
    });
  }, [documents, salesTab, invStatus, invSearch, invDateFrom, invDateTo]);

  const {
    currentPage: invPage,
    setCurrentPage: setInvPage,
    paginatedItems: paginatedDocuments,
  } = usePagination(filteredDocuments, 30);

  const outstanding = filteredDocuments.reduce((s, i) => s + i.balance, 0);
  const total = filteredDocuments.reduce((s, i) => s + i.amount, 0);

  const handleExportInvoicesExcel = () => {
    if (!filteredDocuments.length) {
      alert(pick("لا توجد فواتير لتصديرها وفق الفلاتر الحالية", "No invoices matching current filters to export"));
      return;
    }

    const exportRows = filteredDocuments.map((inv, idx) => ({
      "م": idx + 1,
      "رقم الفاتورة": inv.id,
      "العميل": pick(inv.party.ar, inv.party.en),
      "الفرع": inv.branch ? pick(inv.branch.ar, inv.branch.en) : "-",
      "التاريخ": inv.date,
      "قيمة الفاتورة (ج.م)": inv.amount,
      "الرصيد المتبقي (ج.م)": inv.balance,
      "حالة السداد":
        inv.status === "paid"
          ? "مسدد بالكامل"
          : inv.status === "partial"
          ? "مسدد جزئياً"
          : inv.status === "overdue"
          ? "متأخر"
          : "مسودة",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 16 },
      { wch: 25 },
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "فواتير_المبيعات");
    const dateSuffix = invDateFrom || invDateTo ? `_من_${invDateFrom || "البداية"}_إلى_${invDateTo || "اليوم"}` : `_${new Date().toISOString().slice(0, 10)}`;
    safeDownloadWorkbook(wb, `فواتير_المبيعات${dateSuffix}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        "رقم_الفاتورة_ID": "INV-1001",
        "العميل_Customer": "شركة الأمل",
        "الفرع_Branch": "الفرع الرئيسي",
        "التاريخ_Date": "2026-10-01",
        "كود_الصنف_SKU": "SKU-001",
        "اسم_الصنف_ItemName": "منتج أ",
        "الكمية_Qty": 10,
        "سعر_الوحدة_Price": 150,
        "الوحدة_Unit": "قطعة",
        "طريقة_الدفع_PaymentMethod": "cash",
        "المدفوع_Paid": 2000,
        "حالة_السداد_Status": "partial"
      },
      {
        "رقم_الفاتورة_ID": "INV-1001",
        "العميل_Customer": "شركة الأمل",
        "الفرع_Branch": "الفرع الرئيسي",
        "التاريخ_Date": "2026-10-01",
        "كود_الصنف_SKU": "SKU-002",
        "اسم_الصنف_ItemName": "منتج ب",
        "الكمية_Qty": 5,
        "سعر_الوحدة_Price": 100,
        "الوحدة_Unit": "قطعة",
        "طريقة_الدفع_PaymentMethod": "cash",
        "المدفوع_Paid": 2000,
        "حالة_السداد_Status": "partial"
      },
      {
        "رقم_الفاتورة_ID": "INV-1002",
        "العميل_Customer": "مؤسسة النور",
        "الفرع_Branch": "مستودع الشرق",
        "التاريخ_Date": "2026-10-02",
        "كود_الصنف_SKU": "SKU-003",
        "اسم_الصنف_ItemName": "منتج ج",
        "الكمية_Qty": 20,
        "سعر_الوحدة_Price": 50,
        "الوحدة_Unit": "قطعة",
        "طريقة_الدفع_PaymentMethod": "bank_transfer",
        "المدفوع_Paid": 1000,
        "حالة_السداد_Status": "paid"
      }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, ws, "الفواتير_Invoices");
    safeDownloadWorkbook(wb, "نموذج_استيراد_الفواتير_الشامل.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) return;
        const sheet = wb.Sheets[sheetName];
        if (!sheet) return;
        const rawRows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

        const grouped = rawRows.reduce((acc: Record<string, Record<string, any>[]>, row: Record<string, any>, idx: number) => {
          const rawId = String(row["رقم_الفاتورة_ID"] || row["ID"] || `INV-IMP-${Date.now()}-${idx}`).trim();
          if (!acc[rawId]) acc[rawId] = [];
          acc[rawId].push(row);
          return acc;
        }, {});

        let count = 0;
        for (const [invId, rows] of Object.entries(grouped)) {
          const firstRow = rows[0] || {};
          const rawCustomer = String(firstRow["العميل_Customer"] || firstRow["Customer"] || "عميل مبيعات").trim();
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
            id: invId,
            date: rawDate,
            party: { ar: rawCustomer, en: rawCustomer },
            ...(rawBranch ? { branch: { ar: rawBranch, en: rawBranch } } : {}),
            amount: totalAmount,
            balance: Math.max(0, totalAmount - rawPaid),
            status: rawStatus as any,
            paymentMethod: rawPaymentMethod,
            items
          };
          const created = await addDocument(newDoc);
          
          // Auto-create Dispatch Order
          addDispatchOrder({
            date: created.date,
            branch: created.branch || { ar: "الفرع الرئيسي", en: "Main Branch" },
            linkedDoc: { type: "sales", id: created.id },
            status: "draft",
            totalItems: created.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
            items: [],
          });
          count++;
        }

        setImportMsg({ type: "success", text: pick(`تم استيراد ${count} فاتورة بنجاح`, `Successfully imported ${count} invoices`) });
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

  const openEdit = (doc: BizDocument) => {
    setEditing(doc);
    setFormOpen(true);
  };

  const handleSave = async (doc: Omit<BizDocument, "id"> & { id?: string }) => {
    if (editing) {
      updateDocument(editing.id, doc);
    } else {
      const created = await addDocument(doc);
      // Auto-create Dispatch Order
      addDispatchOrder({
        date: created.date,
        branch: created.branch || { ar: "الفرع الرئيسي", en: "Main Branch" },
        linkedDoc: { type: "sales", id: created.id },
        status: "draft",
        totalItems: created.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
        items: [],
      });
    }
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title={t("nav_sales")}
        subtitle={pick("الفواتير والتحصيل", "Invoices and collection")}
        actions={
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".xlsx, .xls"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImportExcel}
            />
            <Btn variant="outline" onClick={handleDownloadTemplate} title={pick("تحميل نموذج استيراد الفواتير", "Download Invoices Template")}>
              <Download className="size-4" />
            </Btn>
            <Btn variant="outline" className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10" onClick={() => fileInputRef.current?.click()} title={pick("استيراد فواتير", "Import Invoices")}>
              <Upload className="size-4" />
              <span className="hidden sm:inline">{pick("استيراد", "Import")}</span>
            </Btn>
            <Btn
              variant="outline"
              className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10"
              onClick={handleExportInvoicesExcel}
              title={pick("تصدير الفواتير إلى Excel", "Export Invoices to Excel")}
            >
              <FileSpreadsheet className="size-4" />
              <span className="hidden sm:inline">{pick("تصدير Excel", "Export Excel")}</span>
            </Btn>
            <Link to="/pos">
              <Btn className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold border-none shadow-sm shadow-amber-500/25">
                <Store className="size-4" />
                <span className="hidden sm:inline">{pick("شاشة الكاشير (POS)", "POS Terminal")}</span>
              </Btn>
            </Link>
            <Btn onClick={openNew}>
              <Plus className="size-4" />
              {t("newInvoice")}
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

      {/* Sales Section Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3 mb-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSalesTab("pos_orders")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            salesTab === "pos_orders"
              ? "bg-primary text-primary-foreground shadow-sm scale-102"
              : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Store className={`w-4 h-4 ${salesTab === "pos_orders" ? "text-amber-300" : "text-amber-500"}`} />
          <span>{pick("فواتير وطلبات الكاشير (POS)", "POS Retail Orders")}</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black transition-all ${
              salesTab === "pos_orders"
                ? "bg-white text-slate-950 shadow-sm ring-1 ring-black/10"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
            }`}
          >
            {posMetrics?.totalCount ?? 0} {pick("طلب", "orders")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSalesTab("all_invoices")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            salesTab === "all_invoices"
              ? "bg-primary text-primary-foreground shadow-sm scale-102"
              : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{pick("فواتير المبيعات العامة", "General Sales Invoices")}</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black transition-all ${
              salesTab === "all_invoices"
                ? "bg-white text-slate-950 shadow-sm ring-1 ring-black/10"
                : "bg-muted text-muted-foreground border border-border/70"
            }`}
          >
            {documents.length} {pick("فاتورة", "invoices")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSalesTab("commercial")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            salesTab === "commercial"
              ? "bg-primary text-primary-foreground shadow-sm scale-102"
              : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{pick("فواتير الشركات والآجل (B2B)", "Commercial / B2B Invoices")}</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black transition-all ${
              salesTab === "commercial"
                ? "bg-white text-slate-950 shadow-sm ring-1 ring-black/10"
                : "bg-muted text-muted-foreground border border-border/70"
            }`}
          >
            {documents.filter((inv) => inv.balance > 0 || inv.status !== "paid").length} {pick("فاتورة", "invoices")}
          </span>
        </button>
      </div>

      {/* View 1: POS Retail Orders */}
      {salesTab === "pos_orders" && <AdminPosOrdersView />}

      {/* View 2 & 3: Standard Invoices Table */}
      {salesTab !== "pos_orders" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label={t("kpi_sales")} value={money(total || kpis.sales)} delta={kpis.salesDelta} accent="primary" />
            <KpiCard label={t("balance")} value={money(outstanding)} accent="gold" />
            <KpiCard label={t("kpi_receivables")} value={money(kpis.receivables)} delta={kpis.receivablesDelta} accent="brand" />
          </div>

          {/* Filters Bar for Standard Invoices */}
          <div className="p-3 bg-card rounded-2xl border border-border/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  placeholder={pick("بحث برقم الفاتورة أو اسم العميل...", "Search invoice # or customer...")}
                  className="w-full ps-9 pe-8 py-2 text-xs font-semibold rounded-xl border border-border/70 bg-background text-foreground focus:outline-none focus:border-primary shadow-xs"
                />
                {invSearch && (
                  <button
                    type="button"
                    onClick={() => setInvSearch("")}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Select */}
              <select
                value={invStatus}
                onChange={(e) => setInvStatus(e.target.value)}
                className="text-xs font-bold py-2 px-3 rounded-xl border border-border/70 bg-background text-foreground focus:outline-none cursor-pointer shadow-xs"
              >
                <option value="all">{pick("كل حالات السداد", "All Payment Statuses")}</option>
                <option value="paid">{pick("مسدد بالكامل", "Paid")}</option>
                <option value="partial">{pick("مسدد جزئياً", "Partial")}</option>
                <option value="overdue">{pick("متأخر", "Overdue")}</option>
                <option value="draft">{pick("مسودة", "Draft")}</option>
              </select>

              {/* Date From & To */}
              <div className="flex items-center gap-1.5 bg-background border border-border/70 rounded-xl px-2.5 py-1.5 shadow-xs text-xs">
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[11px] font-bold text-muted-foreground">{pick("من", "From")}:</span>
                <input
                  type="date"
                  value={invDateFrom}
                  onChange={(e) => setInvDateFrom(e.target.value)}
                  className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none cursor-pointer"
                />
                <span className="text-muted-foreground/40 font-bold">|</span>
                <span className="text-[11px] font-bold text-muted-foreground">{pick("إلى", "To")}:</span>
                <input
                  type="date"
                  value={invDateTo}
                  onChange={(e) => setInvDateTo(e.target.value)}
                  className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none cursor-pointer"
                />
                {(invDateFrom || invDateTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setInvDateFrom("");
                      setInvDateTo("");
                    }}
                    className="text-muted-foreground hover:text-foreground text-xs px-1"
                    title={pick("مسح التاريخ", "Clear date")}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Reset */}
              {(invSearch || invStatus !== "all" || invDateFrom || invDateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setInvSearch("");
                    setInvStatus("all");
                    setInvDateFrom("");
                    setInvDateTo("");
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{pick("إعادة ضبط", "Reset")}</span>
                </button>
              )}
            </div>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportInvoicesExcel}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
              title={pick("تصدير الفواتير المعروضة إلى ملف Excel", "Export filtered invoices to Excel")}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{pick("تصدير إلى Excel", "Export to Excel")}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono font-black">
                {filteredDocuments.length}
              </span>
            </button>
          </div>

          <Panel
            title={salesTab === "commercial" ? pick("فواتير الشركات والعملاء التجاريين", "Commercial B2B Invoices") : t("recentInvoices")}
            aside={
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold hidden sm:inline">
                  {pick(
                    `المعروض: ${filteredDocuments.length} فاتورة (${money(total)})`,
                    `Showing: ${filteredDocuments.length} invoices (${money(total)})`
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleExportInvoicesExcel}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs transition-colors cursor-pointer"
                  title={pick("تصدير إلى ملف إكسيل", "Export to Excel")}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
              </div>
            }
          >
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
              {paginatedDocuments
                .map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button, a")) return;
                      navigate({ to: "/sales/$invoiceId", params: { invoiceId: inv.id } });
                    }}
                    className="hover:bg-secondary/70 cursor-pointer transition-colors group"
                  >
                    <Td className="num font-bold">
                      <Link
                        to="/sales/$invoiceId"
                        params={{ invoiceId: inv.id }}
                        className="hover:text-primary transition-colors inline-flex items-center gap-1 group-hover:underline text-primary font-bold"
                        title={pick("عرض تفاصيل الفاتورة وبنودها", "View invoice details & items")}
                      >
                        <span>{inv.id}</span>
                        <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                      </Link>
                    </Td>
                    <Td>
                      <div className="space-y-0.5">
                        <Link
                          to="/sales/$invoiceId"
                          params={{ invoiceId: inv.id }}
                          className="font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group hover:underline cursor-pointer"
                          title={pick("عرض تفاصيل الفاتورة والعميل", "View invoice & customer profile")}
                        >
                          <Building2 className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          <span>{pick(inv.party.ar, inv.party.en)}</span>
                          <ExternalLink className="size-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </Link>
                        {inv.branch && (
                          <span className="block text-[10px] text-muted-foreground font-medium">
                            📍 {pick(inv.branch.ar, inv.branch.en)}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="num text-muted-foreground">{inv.date}</Td>
                    <Td className="num font-semibold">{money(inv.amount)}</Td>
                    <Td className="num">{money(inv.balance)}</Td>
                    <Td>
                      <StatusPill status={inv.status} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Link
                          to="/sales/$invoiceId"
                          params={{ invoiceId: inv.id }}
                          title={pick("عرض بنود وتفاصيل الفاتورة", "View invoice details & items")}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Eye className="size-4" />
                        </Link>
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
            <TablePagination
              currentPage={invPage}
              totalItems={filteredDocuments.length}
              pageSize={30}
              onPageChange={setInvPage}
              itemLabel={{ ar: "فاتورة", en: "Invoices" }}
            />
          </Panel>
        </div>
      )}

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
