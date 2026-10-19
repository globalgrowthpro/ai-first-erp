import { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Building2,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Printer,
  Plus,
  RefreshCw,
  Filter,
  Eye,
  FileText,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import { Btn, KpiCard, TablePagination, usePagination } from "@/components/kit";
import { useJournalStore, type JournalEntry } from "@/lib/accounting-store";
import { JournalEntryForm } from "./JournalEntryForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GroupedJournalVoucher {
  id: string;
  date: string;
  reference?: string | undefined;
  memo?: { ar: string; en: string } | undefined;
  branchId?: string | undefined;
  branchName?: { ar: string; en: string } | undefined;
  status: "posted" | "approved" | "draft";
  lines: JournalEntry[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

interface JournalEntriesTableProps {
  branchOptions?: { id: string; label: { ar: string; en: string } }[];
  onOpenNewEntry?: () => void;
}

export function JournalEntriesTable({
  branchOptions = [],
  onOpenNewEntry,
}: JournalEntriesTableProps) {
  const { pick, money, n, dir } = useI18n();
  const { entries, loading, isLive, fetchJournal } = useJournalStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] =
    useState<GroupedJournalVoucher | null>(null);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);

  // Filtered Lines
  const filteredLines = useMemo(() => {
    return entries.filter((item) => {
      if (selectedBranch !== "all" && item.branchId && item.branchId !== selectedBranch) {
        return false;
      }
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = (item.id || "").toLowerCase().includes(q);
        const refMatch = (item.reference || "").toLowerCase().includes(q);
        const codeMatch = (item.accountCode || "").toLowerCase().includes(q);
        const accArMatch = (item.account?.ar || "").toLowerCase().includes(q);
        const accEnMatch = (item.account?.en || "").toLowerCase().includes(q);
        const memoArMatch = (item.memo?.ar || "").toLowerCase().includes(q);
        const memoEnMatch = (item.memo?.en || "").toLowerCase().includes(q);
        if (
          !idMatch &&
          !refMatch &&
          !codeMatch &&
          !accArMatch &&
          !accEnMatch &&
          !memoArMatch &&
          !memoEnMatch
        ) {
          return false;
        }
      }
      return true;
    });
  }, [entries, selectedBranch, dateFrom, dateTo, statusFilter, searchQuery]);

  // Grouped into Journal Vouchers
  const groupedVouchers = useMemo(() => {
    const map = new Map<string, GroupedJournalVoucher>();

    for (const line of filteredLines) {
      const entryId = line.id;
      if (!map.has(entryId)) {
        map.set(entryId, {
          id: entryId,
          date: line.date,
          reference: line.reference,
          memo: line.memo,
          branchId: line.branchId,
          branchName: line.branchName,
          status: line.status || "posted",
          lines: [],
          totalDebit: 0,
          totalCredit: 0,
          isBalanced: true,
        });
      }
      const v = map.get(entryId)!;
      v.lines.push(line);
      v.totalDebit += Number(line.debit || 0);
      v.totalCredit += Number(line.credit || 0);
      v.isBalanced = Math.abs(v.totalDebit - v.totalCredit) < 0.01;
    }

    return Array.from(map.values()).sort((a, b) => {
      // Sort by date descending
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    });
  }, [filteredLines]);

  // KPIs
  const totalDebit = useMemo(
    () => filteredLines.reduce((s, r) => s + (Number(r.debit) || 0), 0),
    [filteredLines],
  );
  const totalCredit = useMemo(
    () => filteredLines.reduce((s, r) => s + (Number(r.credit) || 0), 0),
    [filteredLines],
  );
  const isOverallBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // Pagination (25 vouchers per page)
  const {
    currentPage,
    setCurrentPage,
    paginatedItems: paginatedVouchers,
  } = usePagination(groupedVouchers, 25);

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedRows.size === paginatedVouchers.length) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(paginatedVouchers.map((v) => v.id)));
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLines.length === 0) return;

    const rows = filteredLines.map((line, idx) => ({
      م: idx + 1,
      "رقم القيد": line.id,
      التاريخ: line.date,
      "المرجع / السند": line.reference || "-",
      "الفرع / المنشأة": pick(line.branchName?.ar || "الإدارة العامة", line.branchName?.en || "HQ"),
      "البيان / الوصف": pick(line.memo?.ar || "-", line.memo?.en || "-"),
      "كود الحساب": line.accountCode || "-",
      "اسم الحساب": pick(line.account?.ar || "-", line.account?.en || "-"),
      "مدين (ج.م)": line.debit || 0,
      "دائن (ج.م)": line.credit || 0,
      الحالة: line.status === "posted" ? "مرحل ومعتمد" : "مسودة",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 26 },
      { wch: 34 },
      { wch: 14 },
      { wch: 30 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "قيود_اليومية_العامة");
    safeDownloadWorkbook(wb, `قيود_اليومية_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* 1. KPIs Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={pick("إجمالي الحركات المدينة (Debit)", "Total Debit")}
          value={money(totalDebit)}
          accent="brand"
        />
        <KpiCard
          label={pick("إجمالي الحركات الدائنة (Credit)", "Total Credit")}
          value={money(totalCredit)}
          accent="primary"
        />
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground block">
            {pick("توازن القيود (Double-Entry)", "Balance Verification")}
          </span>
          <div className="flex items-center gap-2">
            {isOverallBalanced ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-xs border border-emerald-500/20">
                <CheckCircle2 className="size-4" />
                <span>{pick("متزن تماماً بنسبة 100%", "100% Balanced")}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs border border-rose-500/20">
                <AlertCircle className="size-4" />
                <span>
                  {pick(
                    `فارق: ${money(Math.abs(totalDebit - totalCredit))}`,
                    `Diff: ${money(Math.abs(totalDebit - totalCredit))}`,
                  )}
                </span>
              </span>
            )}
          </div>
        </div>
        <KpiCard
          label={pick("إجمالي قيود اليومية", "Total Journal Entries")}
          value={pick(
            `${n(groupedVouchers.length)} سند قيد`,
            `${n(groupedVouchers.length)} Vouchers`,
          )}
          accent="gold"
        />
      </div>

      {/* 2. Filter & Actions Toolbar */}
      <div className="p-3.5 rounded-2xl border border-border/70 bg-card shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="size-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={pick(
                "بحث برقم القيد، المرجع، البيان، كود أو اسم الحساب...",
                "Search by JV #, ref, memo, account...",
              )}
              className="w-full rounded-xl border border-border/70 bg-background ps-9 pe-3 py-2 text-xs font-medium outline-none focus:border-primary shadow-xs"
            />
          </div>

          {/* Branch Filter */}
          {branchOptions.length > 0 && (
            <div className="relative min-w-[190px]">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full text-xs font-bold py-2 ps-3 pe-8 rounded-xl border border-border/70 bg-background text-foreground focus:border-primary outline-none appearance-none cursor-pointer shadow-xs"
              >
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {pick(b.label.ar, b.label.en)}
                  </option>
                ))}
              </select>
              <Building2 className="size-3.5 absolute end-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            </div>
          )}

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-border/70 rounded-xl px-2.5 py-1.5 shadow-xs text-xs">
            <Calendar className="size-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-bold text-muted-foreground">
              {pick("من", "From")}:
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none cursor-pointer"
            />
            <span className="text-muted-foreground/40 font-bold">|</span>
            <span className="text-[11px] font-bold text-muted-foreground">
              {pick("إلى", "To")}:
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none cursor-pointer"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-muted-foreground hover:text-foreground text-xs px-1 cursor-pointer"
                title={pick("مسح التاريخ", "Clear dates")}
              >
                ✕
              </button>
            )}
          </div>

          {/* Actions: New Entry & Excel */}
          <div className="flex items-center gap-2 ms-auto">
            <button
              type="button"
              onClick={toggleExpandAll}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border bg-background hover:bg-secondary text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title={pick("توسيع / طي كافة القيود", "Expand / Collapse all")}
            >
              <ArrowUpDown className="size-3.5" />
              <span className="hidden md:inline">
                {expandedRows.size === paginatedVouchers.length
                  ? pick("طي الكل", "Collapse All")
                  : pick("توسيع الكل", "Expand All")}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              title={pick("تصدير قيود اليومية إلى إكسيل", "Export Journal to Excel")}
            >
              <FileSpreadsheet className="size-3.5" />
              <span>Excel</span>
            </button>

            <Btn
              variant="solid"
              onClick={() => {
                if (onOpenNewEntry) onOpenNewEntry();
                else setIsNewEntryOpen(true);
              }}
              className="text-xs font-bold gap-1.5 shadow-sm"
            >
              <Plus className="size-3.5" />
              <span>{pick("قيد يومية جديد", "New Entry")}</span>
            </Btn>
          </div>
        </div>
      </div>

      {/* 3. The Main Journal Entries Table */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start border-collapse">
            <thead>
              <tr className="bg-secondary/40 text-muted-foreground border-b border-border text-[11px] font-bold">
                <th className="py-3 px-3 text-start w-10"></th>
                <th className="py-3 px-3 text-start w-32">{pick("رقم القيد", "JV Number")}</th>
                <th className="py-3 px-3 text-start w-28">{pick("التاريخ", "Date")}</th>
                <th className="py-3 px-3 text-start w-40">
                  {pick("الفرع / المركز", "Branch / Hub")}
                </th>
                <th className="py-3 px-3 text-start w-28">{pick("المرجع", "Reference")}</th>
                <th className="py-3 px-3 text-start">
                  {pick("البيان / الشرح المحاسبي", "Description & Memo")}
                </th>
                <th className="py-3 px-3 text-end w-32 text-emerald-600 dark:text-emerald-400">
                  {pick("إجمالي المدين", "Total Debit")}
                </th>
                <th className="py-3 px-3 text-end w-32 text-sky-600 dark:text-sky-400">
                  {pick("إجمالي الدائن", "Total Credit")}
                </th>
                <th className="py-3 px-3 text-center w-24">{pick("الحالة", "Status")}</th>
                <th className="py-3 px-3 text-center w-20">{pick("معاينة", "Action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedVouchers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    <BookOpen className="size-8 mx-auto opacity-30 mb-2" />
                    <p className="font-bold">
                      {pick("لا توجد قيود يومية مطابقة لخيارات البحث", "No journal entries found")}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedVouchers.map((voucher) => {
                  const isExpanded = expandedRows.has(voucher.id);
                  return (
                    <tr key={voucher.id} className="group hover:bg-secondary/20 transition-colors">
                      <td colSpan={10} className="p-0">
                        {/* Summary Header Row */}
                        <div
                          onClick={() => toggleExpand(voucher.id)}
                          className={cn(
                            "flex items-center w-full px-3 py-3 cursor-pointer select-none transition-colors",
                            isExpanded
                              ? "bg-primary/5 border-b border-border/60"
                              : "hover:bg-secondary/30",
                          )}
                        >
                          <div className="w-10 shrink-0 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronUp className="size-4 text-primary" />
                            ) : (
                              <ChevronDown className="size-4" />
                            )}
                          </div>

                          <div className="w-32 shrink-0 font-mono font-black text-primary text-xs">
                            {voucher.id}
                          </div>

                          <div
                            className="w-28 shrink-0 font-mono font-bold text-muted-foreground text-[11px]"
                            dir="ltr"
                          >
                            {voucher.date}
                          </div>

                          <div className="w-40 shrink-0 truncate pe-2 text-foreground font-bold text-xs">
                            {voucher.branchName
                              ? pick(voucher.branchName.ar, voucher.branchName.en)
                              : pick("الإدارة العامة", "HQ")}
                          </div>

                          <div className="w-28 shrink-0 font-mono text-[11px] text-muted-foreground font-semibold">
                            {voucher.reference ? `#${voucher.reference}` : "—"}
                          </div>

                          <div className="flex-1 truncate pe-4 text-foreground/80 font-medium text-xs">
                            {voucher.memo
                              ? pick(voucher.memo.ar, voucher.memo.en)
                              : pick("قيد محاسبي معتمد", "Journal Voucher")}
                          </div>

                          <div className="w-32 shrink-0 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {money(voucher.totalDebit)}
                          </div>

                          <div className="w-32 shrink-0 text-end font-mono font-bold text-sky-600 dark:text-sky-400">
                            {money(voucher.totalCredit)}
                          </div>

                          <div className="w-24 shrink-0 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                              <CheckCircle2 className="size-3" />
                              <span>{pick("مرحل", "Posted")}</span>
                            </span>
                          </div>

                          <div
                            className="w-20 shrink-0 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedVoucherForPrint(voucher)}
                              className="p-1.5 rounded-lg border border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                              title={pick("معاينة وطباعة سند القيد", "View & Print Voucher")}
                            >
                              <Printer className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Detailed Lines Table (Accordion Expansion) */}
                        {isExpanded && (
                          <div className="bg-background/80 p-3 sm:px-8 border-b border-border/60 animate-in fade-in-50 duration-200">
                            <div className="rounded-xl border border-border/70 overflow-hidden shadow-2xs">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-secondary/40 text-muted-foreground border-b border-border/50 text-[11px]">
                                    <th className="py-2 px-3 text-start w-12 font-bold">#</th>
                                    <th className="py-2 px-3 text-start w-28 font-bold">
                                      {pick("كود الحساب", "Account Code")}
                                    </th>
                                    <th className="py-2 px-3 text-start font-bold">
                                      {pick("اسم الحساب وشجرة الحسابات", "Account Title")}
                                    </th>
                                    <th className="py-2 px-3 text-start font-bold">
                                      {pick("البيان الخاص بالسطر", "Line Narration")}
                                    </th>
                                    <th className="py-2 px-3 text-end w-32 font-bold text-emerald-600 dark:text-emerald-400">
                                      {pick("مدين (Debit)", "Debit")}
                                    </th>
                                    <th className="py-2 px-3 text-end w-32 font-bold text-sky-600 dark:text-sky-400">
                                      {pick("دائن (Credit)", "Credit")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {voucher.lines.map((ln, lIdx) => (
                                    <tr
                                      key={`${voucher.id}-line-${lIdx}`}
                                      className="hover:bg-muted/40"
                                    >
                                      <td className="py-2 px-3 text-muted-foreground/60 font-mono text-[10px]">
                                        {lIdx + 1}
                                      </td>
                                      <td className="py-2 px-3 font-mono font-bold text-primary">
                                        {ln.accountCode || "1000"}
                                      </td>
                                      <td className="py-2 px-3 font-bold text-foreground">
                                        {pick(
                                          ln.account?.ar || "حساب عام",
                                          ln.account?.en || "Account",
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-muted-foreground font-medium">
                                        {ln.memo
                                          ? pick(ln.memo.ar, ln.memo.en)
                                          : pick("تسوية بند", "Line item")}
                                      </td>
                                      <td className="py-2 px-3 text-end font-mono font-bold">
                                        {ln.debit > 0 ? (
                                          <span className="text-emerald-600 dark:text-emerald-400">
                                            {money(ln.debit)}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground/30">—</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-end font-mono font-bold">
                                        {ln.credit > 0 ? (
                                          <span className="text-sky-600 dark:text-sky-400">
                                            {money(ln.credit)}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground/30">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                  {/* Subtotal Row */}
                                  <tr className="bg-secondary/30 font-black border-t border-border">
                                    <td
                                      colSpan={4}
                                      className="py-2 px-3 text-end text-xs text-foreground"
                                    >
                                      {pick("إجمالي سند القيد:", "Voucher Total:")}
                                    </td>
                                    <td className="py-2 px-3 text-end font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                                      {money(voucher.totalDebit)}
                                    </td>
                                    <td className="py-2 px-3 text-end font-mono text-sky-600 dark:text-sky-400 text-xs">
                                      {money(voucher.totalCredit)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        {groupedVouchers.length > 0 && (
          <div className="p-2 border-t border-border/60">
            <TablePagination
              currentPage={currentPage}
              totalItems={groupedVouchers.length}
              pageSize={25}
              onPageChange={setCurrentPage}
              itemLabel={{ ar: "سند قيد", en: "Journal Vouchers" }}
            />
          </div>
        )}
      </div>

      {/* 5. Printable Voucher Preview Dialog */}
      {selectedVoucherForPrint && (
        <Dialog
          open={Boolean(selectedVoucherForPrint)}
          onOpenChange={() => setSelectedVoucherForPrint(null)}
        >
          <DialogContent className="max-w-2xl" dir={pick("rtl", "ltr")}>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-base font-bold border-b pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  <span>{pick("سند قيد يومية محاسبي معتمد", "Official Journal Voucher")}</span>
                </div>
                <span className="font-mono text-sm px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {selectedVoucherForPrint.id}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs pt-2">
              {/* Voucher Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-secondary/40 border border-border/60">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold">
                    {pick("تاريخ القيد:", "Date:")}
                  </span>
                  <span className="font-mono font-bold">{selectedVoucherForPrint.date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold">
                    {pick("المرجع / المستند:", "Reference:")}
                  </span>
                  <span className="font-mono font-bold">
                    {selectedVoucherForPrint.reference || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold">
                    {pick("الفرع / المركز:", "Branch:")}
                  </span>
                  <span className="font-bold">
                    {selectedVoucherForPrint.branchName
                      ? pick(
                          selectedVoucherForPrint.branchName.ar,
                          selectedVoucherForPrint.branchName.en,
                        )
                      : pick("الإدارة العامة", "HQ")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold">
                    {pick("حالة القيد:", "Status:")}
                  </span>
                  <span className="text-emerald-600 font-bold">
                    {pick("مرحل ومعتمد", "Posted")}
                  </span>
                </div>
              </div>

              {/* Memo */}
              {selectedVoucherForPrint.memo && (
                <div className="p-2.5 rounded-xl bg-background border border-border/60 font-semibold text-xs text-foreground/90">
                  {pick(selectedVoucherForPrint.memo.ar, selectedVoucherForPrint.memo.en)}
                </div>
              )}

              {/* Voucher Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/40 border-b border-border">
                    <tr>
                      <th className="p-2 text-start font-bold">{pick("كود الحساب", "Code")}</th>
                      <th className="p-2 text-start font-bold">{pick("اسم الحساب", "Account")}</th>
                      <th className="p-2 text-end font-bold text-emerald-600">
                        {pick("مدين", "Debit")}
                      </th>
                      <th className="p-2 text-end font-bold text-sky-600">
                        {pick("دائن", "Credit")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {selectedVoucherForPrint.lines.map((ln, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-mono font-bold text-primary">
                          {ln.accountCode || "-"}
                        </td>
                        <td className="p-2 font-bold">
                          {pick(ln.account?.ar || "", ln.account?.en || "")}
                        </td>
                        <td className="p-2 text-end font-mono font-bold">
                          {ln.debit > 0 ? money(ln.debit) : "—"}
                        </td>
                        <td className="p-2 text-end font-mono font-bold">
                          {ln.credit > 0 ? money(ln.credit) : "—"}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-secondary/40 font-black border-t border-border">
                      <td colSpan={2} className="p-2 text-end">
                        {pick("الإجمالي المتوازن:", "Balanced Total:")}
                      </td>
                      <td className="p-2 text-end font-mono text-emerald-600">
                        {money(selectedVoucherForPrint.totalDebit)}
                      </td>
                      <td className="p-2 text-end font-mono text-sky-600">
                        {money(selectedVoucherForPrint.totalCredit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/60 text-center text-[11px] text-muted-foreground">
                <div>{pick("إعداد المحاسب", "Prepared by Accountant")}</div>
                <div>{pick("مراجعة رئيس الحسابات", "Reviewed by Chief Accountant")}</div>
                <div>{pick("اعتماد المدير المالي (CFO)", "Approved by CFO")}</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Journal Entry Modal */}
      <JournalEntryForm open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen} />
    </div>
  );
}
