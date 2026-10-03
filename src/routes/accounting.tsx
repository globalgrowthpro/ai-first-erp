import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FolderTree,
  BookOpen,
  Scale,
  Plus,
  Search,
  Filter,
  Building2,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  List,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, PageHeader, Panel, Td, TablePagination, usePagination } from "@/components/kit";
import { trialBalance } from "@/lib/demo-data";
import { ChartOfAccounts } from "@/components/accounting/ChartOfAccounts";
import { JournalEntryForm } from "@/components/accounting/JournalEntryForm";
import { useJournalStore } from "@/lib/accounting-store";

export const Route = createFileRoute("/accounting")({
  head: () => ({
    meta: [
      { title: "Accounting & General Ledger — Wazeer El-Helw ERP" },
      {
        name: "description",
        content:
          "Multi-branch chart of accounts, real POS sales journal entries, and balanced trial balance.",
      },
      { property: "og:title", content: "Accounting & General Ledger — Wazeer El-Helw ERP" },
      {
        property: "og:description",
        content: "Chart of accounts, branch POS journal entries and trial balance.",
      },
    ],
  }),
  component: Accounting,
});

const BRANCH_FILTER_OPTIONS = [
  { id: "all", label: { ar: "جميع الفروع والمراكز", en: "All Branches & Hubs" } },
  { id: "korba", label: { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis" } },
  { id: "maadi", label: { ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St." } },
  { id: "tagamoa", label: { ar: "فرع التجمع الخامس — التسعين", en: "New Cairo — 90th St." } },
  { id: "sahel", label: { ar: "فرع الساحل الشمالي — مارينا", en: "North Coast — Marina" } },
  { id: "alex", label: { ar: "فرع الإسكندرية — سموحة", en: "Alexandria — Smouha" } },
  { id: "kitchen", label: { ar: "المطبخ المركزي — تشغيل وتوصيل", en: "Central Kitchen Delivery Hub" } },
  { id: "hq", label: { ar: "الإدارة العامة — الخزينة المركزية", en: "Executive HQ Safe" } },
];

function Accounting() {
  const { t, pick, money, dir } = useI18n();
  const [activeTab, setActiveTab] = useState<"coa" | "journal" | "trial">("coa");
  const [isJournalFormOpen, setIsJournalFormOpen] = useState(false);
  const { entries, resetToDefaultEntries } = useJournalStore();

  // Journal Filters & View State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  // Filtered Journal Entries
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      // Branch filter
      if (selectedBranch !== "all" && item.branchId && item.branchId !== selectedBranch) {
        return false;
      }

      // Date range filter
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;

      // Text search
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
  }, [entries, selectedBranch, dateFrom, dateTo, searchQuery]);

  // Grouped Entries by Entry ID (JV-xxxx)
  const groupedEntries = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        date: string;
        reference?: string | undefined;
        memo?: { ar: string; en: string } | undefined;
        branchId?: string | undefined;
        branchName?: { ar: string; en: string } | undefined;
        status?: "posted" | "approved" | "draft";
        lines: typeof entries;
        totalDebit: number;
        totalCredit: number;
      }
    >();

    for (const line of filteredEntries) {
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
          lines: [] as typeof entries,
          totalDebit: 0,
          totalCredit: 0,
        });
      }
      const entryGroup = map.get(entryId)!;
      entryGroup.lines.push(line);
      entryGroup.totalDebit += Number(line.debit || 0);
      entryGroup.totalCredit += Number(line.credit || 0);
    }

    return Array.from(map.values());
  }, [filteredEntries]);

  // Pagination for grouped journal entries (30 per page)
  const {
    currentPage: groupedPage,
    setCurrentPage: setGroupedPage,
    paginatedItems: paginatedGroupedEntries,
  } = usePagination(groupedEntries, 30);

  // Pagination for flat ledger entries (30 per page)
  const {
    currentPage: flatPage,
    setCurrentPage: setFlatPage,
    paginatedItems: paginatedFlatEntries,
  } = usePagination(filteredEntries, 30);

  // Financial Summary KPIs for Filtered Entries
  const totalDebit = useMemo(
    () => filteredEntries.reduce((s, r) => s + (Number(r.debit) || 0), 0),
    [filteredEntries]
  );
  const totalCredit = useMemo(
    () => filteredEntries.reduce((s, r) => s + (Number(r.credit) || 0), 0),
    [filteredEntries]
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // Trial Balance Totals
  const trialTotalDebit = useMemo(
    () => trialBalance.reduce((s, r) => s + (Number(r.debit) || 0), 0),
    []
  );
  const trialTotalCredit = useMemo(
    () => trialBalance.reduce((s, r) => s + (Number(r.credit) || 0), 0),
    []
  );

  // Excel Export Handler
  const handleExportToExcel = () => {
    const exportRows = filteredEntries.map((line, idx) => ({
      "م": idx + 1,
      "رقم القيد": line.id,
      "التاريخ": line.date,
      "المرجع / المستند": line.reference || "-",
      "الفرع / المركز": pick(line.branchName?.ar || "الإدارة العامة", line.branchName?.en || "HQ"),
      "البيان والشرح": pick(line.memo?.ar || "-", line.memo?.en || "-"),
      "كود الحساب": line.accountCode || "-",
      "اسم الحساب": pick(line.account?.ar || "غير محدد", line.account?.en || "Unknown"),
      "مدين (ج.م)": Number(line.debit) || 0,
      "دائن (ج.م)": Number(line.credit) || 0,
      "الحالة": line.status === "posted" ? "مرحل ومعتمد" : "مسودة",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = [
      { wch: 5 },  // م
      { wch: 14 }, // رقم القيد
      { wch: 12 }, // التاريخ
      { wch: 16 }, // المرجع
      { wch: 24 }, // الفرع
      { wch: 38 }, // البيان
      { wch: 12 }, // كود الحساب
      { wch: 28 }, // اسم الحساب
      { wch: 14 }, // مدين
      { wch: 14 }, // دائن
      { wch: 12 }, // الحالة
    ];
    XLSX.utils.book_append_sheet(wb, ws, "قيود_اليومية_العامة");

    const dateSuffix = dateFrom || dateTo ? `_من_${dateFrom || "البداية"}_إلى_${dateTo || "اليوم"}` : `_${new Date().toISOString().slice(0, 10)}`;
    safeDownloadWorkbook(wb, `دفتر_قيود_اليومية_العامة${dateSuffix}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav_accounting")}
        subtitle={pick(
          "دليل الحسابات الشجري وقيود اليومية لفروع ونقاط البيع وميزان المراجعة المعتمد",
          "Chart of accounts, multi-branch POS journal entries, and verified trial balance",
        )}
        actions={
          activeTab === "journal" ? (
            <div className="flex items-center gap-2">
              <Btn onClick={() => setIsJournalFormOpen(true)} className="gap-2 font-bold shadow-sm">
                <Plus className="size-4" />
                <span>{pick("قيد يومية جديد", "New Journal Entry")}</span>
              </Btn>
            </div>
          ) : undefined
        }
      />

      {/* Accounting View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <Btn
            variant={activeTab === "coa" ? "solid" : "outline"}
            onClick={() => setActiveTab("coa")}
            className="text-xs font-bold gap-2"
          >
            <FolderTree className="size-4" />
            <span>{t("chartOfAccounts")}</span>
          </Btn>
          <Btn
            variant={activeTab === "journal" ? "solid" : "outline"}
            onClick={() => setActiveTab("journal")}
            className="text-xs font-bold gap-2"
          >
            <BookOpen className="size-4" />
            <span>{t("journal")}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-[10px] font-mono">
              {entries.length}
            </span>
          </Btn>
          <Btn
            variant={activeTab === "trial" ? "solid" : "outline"}
            onClick={() => setActiveTab("trial")}
            className="text-xs font-bold gap-2"
          >
            <Scale className="size-4" />
            <span>{t("trialBalance")}</span>
          </Btn>
        </div>

        {activeTab === "journal" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs transition-colors cursor-pointer"
              title={pick("تصدير قيود اليومية إلى إكسيل", "Export Journal to Excel")}
            >
              <FileSpreadsheet className="size-3.5" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={resetToDefaultEntries}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/70 hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
              title={pick("استعادة القيود النموذجية للفروع", "Reset to sample branch entries")}
            >
              <RotateCcw className="size-3" />
              <span>{pick("استعادة القيود", "Reset")}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Chart of Accounts */}
      {activeTab === "coa" && <ChartOfAccounts />}

      {/* Tab 2: Journal Entries (Rich Multi-Branch Ledger) */}
      {activeTab === "journal" && (
        <div className="space-y-5">
          {/* Financial KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={pick("إجمالي الحركات المدينة", "Total Debit")}
              value={money(totalDebit)}
              accent="brand"
            />
            <KpiCard
              label={pick("إجمالي الحركات الدائنة", "Total Credit")}
              value={money(totalCredit)}
              accent="primary"
            />
            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground block">
                {pick("حالة توازن القيود", "Ledger Balance Status")}
              </span>
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                    <CheckCircle2 className="size-4" />
                    <span>{pick("متزن بنسبة 100%", "100% Balanced")}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-sm">
                    <span>{pick(`غير متزن: ${money(Math.abs(totalDebit - totalCredit))}`, `Diff: ${money(Math.abs(totalDebit - totalCredit))}`)}</span>
                  </span>
                )}
              </div>
            </div>
            <KpiCard
              label={pick("عدد قيود اليومية", "Journal Entries Count")}
              value={`${groupedEntries.length} ${pick("قيد محاسبي", "Entries")}`}
              accent="gold"
            />
          </div>

          {/* Filters Bar: Search, Branch, Date Range, View Mode */}
          <div className="p-3.5 rounded-2xl border border-border/70 bg-card shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="size-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={pick("بحث برقم القيد، المرجع، البيان، كود أو اسم الحساب...", "Search by JV #, reference, memo, account...")}
                  className="w-full rounded-xl border border-border/70 bg-background ps-9 pe-3 py-2 text-xs font-medium outline-none focus:border-primary shadow-xs"
                />
              </div>

              {/* Branch Filter */}
              <div className="relative min-w-[200px]">
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full text-xs font-bold py-2 ps-3 pe-8 rounded-xl border border-border/70 bg-background text-foreground focus:border-primary outline-none appearance-none cursor-pointer shadow-xs"
                >
                  {BRANCH_FILTER_OPTIONS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {pick(b.label.ar, b.label.en)}
                    </option>
                  ))}
                </select>
                <Building2 className="size-3.5 absolute end-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
              </div>

              {/* Date Pickers */}
              <div className="flex items-center gap-1.5 bg-background border border-border/70 rounded-xl px-2.5 py-1 shadow-xs text-xs">
                <Calendar className="size-3.5 text-primary shrink-0" />
                <span className="text-[11px] font-bold text-muted-foreground">{pick("من", "From")}:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none cursor-pointer"
                />
                <span className="text-muted-foreground/40 font-bold">|</span>
                <span className="text-[11px] font-bold text-muted-foreground">{pick("إلى", "To")}:</span>
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
                    className="text-muted-foreground hover:text-foreground text-xs px-1"
                    title={pick("إلغاء تحديد التاريخ", "Clear date filter")}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* View Mode Toggle: Grouped vs Flat */}
              <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60 ms-auto">
                <button
                  type="button"
                  onClick={() => setViewMode("grouped")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "grouped" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={pick("عرض مجمع حسب كل قيد محاسبي", "Grouped by Journal Entry")}
                >
                  <Layers className="size-3.5" />
                  <span className="hidden sm:inline">{pick("عرض القيود", "By Entry")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("flat")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "flat" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={pick("عرض سطور دفتر الأستاذ العام بالتفصيل", "Detailed Ledger Rows")}
                >
                  <List className="size-3.5" />
                  <span className="hidden sm:inline">{pick("دفتر أستاذ تفصيلي", "Detailed Lines")}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grouped View: Modern Entry Cards */}
          {viewMode === "grouped" && (
            <div className="space-y-4">
              {groupedEntries.length === 0 ? (
                <div className="p-8 text-center bg-card rounded-2xl border border-border text-muted-foreground text-xs">
                  <BookOpen className="size-8 mx-auto opacity-30 mb-2" />
                  <p>{pick("لا توجد قيود يومية مطابقة لخيارات البحث المحددة", "No journal entries match the filter criteria")}</p>
                </div>
              ) : (
                paginatedGroupedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    {/* Entry Header */}
                    <div className="p-3 sm:px-4 bg-secondary/35 border-b border-border/70 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-foreground px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                          {entry.id}
                        </span>

                        <span className="font-mono font-bold text-muted-foreground text-[11px]" dir="ltr">
                          📅 {entry.date}
                        </span>

                        {entry.branchName && (
                          <span className="px-2 py-0.5 rounded-lg bg-card border border-border text-[11px] font-bold text-foreground">
                            📍 {pick(entry.branchName.ar, entry.branchName.en)}
                          </span>
                        )}

                        {entry.reference && (
                          <span className="px-2 py-0.5 rounded-lg bg-muted text-muted-foreground font-mono text-[10px] font-bold">
                            #{entry.reference}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 ms-auto">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" />
                          <span>{pick("مرحل ومعتمد", "Posted")}</span>
                        </span>

                        <span className="text-[11px] font-mono font-black text-foreground/90">
                          {pick("المجموع:", "Total:")} {money(entry.totalDebit)}
                        </span>
                      </div>
                    </div>

                    {/* Entry Memo */}
                    {entry.memo && (
                      <div className="px-4 py-2 bg-background/50 border-b border-border/40 text-xs font-semibold text-foreground/80">
                        💬 {pick(entry.memo.ar, entry.memo.en)}
                      </div>
                    )}

                    {/* Entry Lines Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-secondary/20 text-muted-foreground/80 border-b border-border/40 text-[11px]">
                          <tr>
                            <th className="p-2.5 text-start font-bold w-28">{pick("كود الحساب", "Code")}</th>
                            <th className="p-2.5 text-start font-bold">{pick("اسم الحساب", "Account Name")}</th>
                            <th className="p-2.5 text-start font-bold w-36">{pick("مدين (ج.م)", "Debit")}</th>
                            <th className="p-2.5 text-start font-bold w-36">{pick("دائن (ج.م)", "Credit")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {entry.lines.map((ln, idx) => (
                            <tr key={`${entry.id}-${idx}`} className="hover:bg-secondary/20">
                              <td className="p-2.5 font-mono font-bold text-primary">
                                {ln.accountCode || "-"}
                              </td>
                              <td className="p-2.5 font-semibold text-foreground">
                                {pick(ln.account.ar, ln.account.en)}
                              </td>
                              <td className="p-2.5 font-mono font-bold">
                                {ln.debit > 0 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {money(ln.debit)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono font-bold">
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
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
              {groupedEntries.length > 0 && (
                <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
                  <TablePagination
                    currentPage={groupedPage}
                    totalItems={groupedEntries.length}
                    pageSize={30}
                    onPageChange={setGroupedPage}
                    itemLabel={{ ar: "قيد يومية", en: "Journal Entries" }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Flat Ledger Table View */}
          {viewMode === "flat" && (
            <Panel title={pick("دفتر الأستاذ التفصيلي لقيود اليومية", "Detailed Journal Ledger")}>
              <DataTable
                head={[
                  pick("رقم القيد", "JV #"),
                  pick("التاريخ", "Date"),
                  pick("الفرع", "Branch"),
                  pick("المرجع", "Ref"),
                  pick("كود الحساب", "Code"),
                  pick("الحساب المحاسبي", "Account Name"),
                  pick("مدين (Debit)", "Debit"),
                  pick("دائن (Credit)", "Credit"),
                ]}
              >
                {paginatedFlatEntries.map((j, idx) => (
                  <tr key={`${j.id}-${idx}`} className="hover:bg-secondary/40">
                    <Td className="num font-bold text-primary">{j.id}</Td>
                    <Td className="num text-muted-foreground font-mono text-[11px]">{j.date}</Td>
                    <Td className="text-xs font-semibold">
                      {pick(j.branchName?.ar || "الإدارة", j.branchName?.en || "HQ")}
                    </Td>
                    <Td className="font-mono text-[10px] text-muted-foreground">{j.reference || "-"}</Td>
                    <Td className="font-mono text-primary font-bold text-xs">{j.accountCode || "-"}</Td>
                    <Td className="font-medium text-foreground text-xs">{pick(j.account.ar, j.account.en)}</Td>
                    <Td className="num font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {j.debit ? money(j.debit) : "—"}
                    </Td>
                    <Td className="num font-mono font-bold text-sky-600 dark:text-sky-400">
                      {j.credit ? money(j.credit) : "—"}
                    </Td>
                  </tr>
                ))}
              </DataTable>
              <TablePagination
                currentPage={flatPage}
                totalItems={filteredEntries.length}
                pageSize={30}
                onPageChange={setFlatPage}
                itemLabel={{ ar: "سطر أستاذ", en: "Ledger Rows" }}
              />
            </Panel>
          )}
        </div>
      )}

      {/* Tab 3: Trial Balance (ميزان المراجعة بالمجاميع والأرصدة) */}
      {activeTab === "trial" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              label={pick("إجمالي ميزان المراجعة (مدين)", "Total Trial Balance (Debit)")}
              value={money(trialTotalDebit)}
              accent="brand"
            />
            <KpiCard
              label={pick("إجمالي ميزان المراجعة (دائن)", "Total Trial Balance (Credit)")}
              value={money(trialTotalCredit)}
              accent="primary"
            />
            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground block">
                {pick("حالة توازن ميزان المراجعة", "Trial Balance Equilibrium")}
              </span>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                <CheckCircle2 className="size-4" />
                <span>{pick("متوازن محاسبياً (المدين = الدائن)", "Balanced (Debit = Credit)")}</span>
              </div>
            </div>
          </div>

          <Panel
            title={pick("ميزان المراجعة العام بالمجاميع والأرصدة", "General Ledger Trial Balance")}
            aside={
              <span className="text-xs font-semibold text-muted-foreground">
                {pick("يشمل خزائن الفروع وأدراج نقاط البيع وإيرادات الفروع", "Includes branch safes, POS drawers & branch sales")}
              </span>
            }
          >
            <DataTable head={[t("account"), pick("مدين (ج.م)", "Debit"), pick("دائن (ج.م)", "Credit")]}>
              {trialBalance.map((r, i) => (
                <tr key={`${r.account.en}-${i}`} className="hover:bg-secondary/40">
                  <Td className="font-semibold text-xs text-foreground">{pick(r.account.ar, r.account.en)}</Td>
                  <Td className="num font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {r.debit ? money(r.debit) : "—"}
                  </Td>
                  <Td className="num font-mono font-bold text-sky-600 dark:text-sky-400">
                    {r.credit ? money(r.credit) : "—"}
                  </Td>
                </tr>
              ))}
              <tr className="bg-secondary/60 font-black text-sm border-t-2 border-border">
                <Td className="font-black uppercase">{pick("الإجمالي العام المعتمد", "Grand Total Balance")}</Td>
                <Td className="num font-mono font-black text-emerald-600 dark:text-emerald-400">{money(trialTotalDebit)}</Td>
                <Td className="num font-mono font-black text-sky-600 dark:text-sky-400">{money(trialTotalCredit)}</Td>
              </tr>
            </DataTable>
          </Panel>
        </div>
      )}

      {/* Journal Entry Form Modal */}
      <JournalEntryForm open={isJournalFormOpen} onOpenChange={setIsJournalFormOpen} />
    </div>
  );
}
