import { useState, useMemo, useRef } from "react";
import {
  BookOpen,
  Search,
  Building2,
  Calendar,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronRight,
  Filter,
  RotateCcw,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Scale,
} from "lucide-react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, Panel, Td, TablePagination, usePagination } from "@/components/kit";
import { useAccountsStore, useJournalStore, type AccountItem, type JournalEntry } from "@/lib/accounting-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GeneralLedgerViewProps {
  branchOptions?: { id: string; label: { ar: string; en: string } }[];
}

export function GeneralLedgerView({ branchOptions = [] }: GeneralLedgerViewProps) {
  const { t, pick, money, n, dir } = useI18n();
  const { accounts } = useAccountsStore();
  const { entries, loading } = useJournalStore();

  // Active Selected Account
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>(() => {
    // Default to Cash or first active account with movements
    return "1101";
  });

  const [accountSearch, setAccountSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "week" | "month" | "custom">("all");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handleApplyPreset = (preset: "all" | "today" | "yesterday" | "week" | "month") => {
    setDatePreset(preset);
    const d = new Date();
    const formatD = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const day = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const today = formatD(d);

    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (preset === "today") {
      setDateFrom(today);
      setDateTo(today);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatD(y);
      setDateFrom(yStr);
      setDateTo(yStr);
    } else if (preset === "week") {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      setDateFrom(formatD(w));
      setDateTo(today);
    } else if (preset === "month") {
      const mStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      setDateFrom(mStart);
      setDateTo(today);
    }
  };

  // Find the selected account object
  const currentAccount = useMemo(() => {
    return (
      accounts.find((a) => a.code === selectedAccountCode) ||
      accounts[0] || {
        code: "1101",
        name: { ar: "الخزينة النقدية الرئيسية", en: "Main Cash Safe" },
        type: "asset" as const,
        normalBalance: "debit" as const,
        balance: 0,
        level: 3,
        status: "active" as const,
      }
    );
  }, [accounts, selectedAccountCode]);

  // Filtered Accounts list for the account selector
  const selectableAccounts = useMemo(() => {
    const q = accountSearch.toLowerCase().trim();
    return accounts
      .filter((a) => {
        if (!q) return true;
        const codeMatch = a.code.toLowerCase().includes(q);
        const arMatch = (a.name.ar || "").toLowerCase().includes(q);
        const enMatch = (a.name.en || "").toLowerCase().includes(q);
        return codeMatch || arMatch || enMatch;
      })
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [accounts, accountSearch]);

  // Account Ledger Transactions Calculation with Running Balance
  const ledgerData = useMemo(() => {
    const openingBal = Number(currentAccount.balance || 0);
    const isDebitNormal = currentAccount.normalBalance === "debit";

    // Filter entries belonging to this account code
    const accountEntries = entries.filter((entry) => {
      // Must match account code or prefix
      const matchesCode =
        entry.accountCode === currentAccount.code ||
        entry.accountCode?.startsWith(`${currentAccount.code}.`) ||
        entry.account?.ar === currentAccount.name.ar ||
        entry.account?.en === currentAccount.name.en;

      if (!matchesCode) return false;

      // Branch filter
      if (selectedBranch !== "all" && entry.branchId && entry.branchId !== selectedBranch) {
        return false;
      }

      // Date filter
      if (dateFrom || dateTo) {
        const itemDateOnly = entry.date ? (entry.date.includes("T") ? entry.date.slice(0, 10) : entry.date) : "";
        if (itemDateOnly) {
          if (dateFrom && itemDateOnly < dateFrom) return false;
          if (dateTo && itemDateOnly > dateTo) return false;
        }
      }

      return true;
    });

    // Sort chronologically
    accountEntries.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    let running = openingBal;
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = accountEntries.map((entry, index) => {
      const d = Number(entry.debit || 0);
      const c = Number(entry.credit || 0);
      totalDebit += d;
      totalCredit += c;

      // Running balance calculation based on normal balance
      if (isDebitNormal) {
        running = running + d - c;
      } else {
        running = running + c - d;
      }

      return {
        key: `${entry.id}-${index}`,
        id: entry.id,
        date: entry.date,
        reference: entry.reference || "—",
        branchName: entry.branchName || { ar: "الإدارة العامة", en: "HQ" },
        memo: entry.memo || { ar: "حركة محاسبية معتمدة", en: "Approved transaction" },
        debit: d,
        credit: c,
        runningBalance: running,
        status: entry.status || "posted",
      };
    });

    const closingBal = isDebitNormal
      ? openingBal + totalDebit - totalCredit
      : openingBal + totalCredit - totalDebit;

    return {
      openingBal,
      totalDebit,
      totalCredit,
      closingBal,
      isDebitNormal,
      rows,
    };
  }, [entries, currentAccount, selectedBranch, dateFrom, dateTo]);

  // Pagination for ledger rows
  const {
    currentPage,
    setCurrentPage,
    paginatedItems: paginatedRows,
  } = usePagination(ledgerData.rows, 30);

  // Export Account Ledger to Excel
  const handleExportExcel = () => {
    const exportRows = ledgerData.rows.map((row, idx) => ({
      "م": idx + 1,
      "التاريخ": row.date,
      "رقم سند القيد": row.id,
      "المرجع / المستند": row.reference,
      "الفرع / المركز": pick(row.branchName.ar, row.branchName.en),
      "البيان والشرح المحاسبي": pick(row.memo.ar, row.memo.en),
      "مدين (ج.م)": row.debit,
      "دائن (ج.م)": row.credit,
      "الرصيد الجاري (ج.م)": row.runningBalance,
    }));

    // Add Opening and Closing rows
    exportRows.unshift({
      "م": 0,
      "التاريخ": dateFrom || "البداية",
      "رقم سند القيد": "—",
      "المرجع / المستند": "—",
      "الفرع / المركز": "—",
      "البيان والشرح المحاسبي": "الرصيد الافتتاحي للحساب",
      "مدين (ج.م)": ledgerData.isDebitNormal && ledgerData.openingBal >= 0 ? ledgerData.openingBal : 0,
      "دائن (ج.م)": !ledgerData.isDebitNormal && ledgerData.openingBal >= 0 ? ledgerData.openingBal : 0,
      "الرصيد الجاري (ج.م)": ledgerData.openingBal,
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
      { wch: 40 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];
    const sheetName = `حساب_${currentAccount.code}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    safeDownloadWorkbook(
      wb,
      `كشف_حساب_الأستاذ_العام_${currentAccount.code}_${pick(currentAccount.name.ar, currentAccount.name.en)}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Account Selector & Control Bar */}
      <div className="surface-panel rounded-2xl p-4 border border-border/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Account Selection Dropdown & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative min-w-[280px] sm:min-w-[340px]">
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                {pick("اختر الحساب من دليل الحسابات:", "Select General Ledger Account:")}
              </label>
              <div className="relative">
                <select
                  value={selectedAccountCode}
                  onChange={(e) => {
                    setSelectedAccountCode(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs font-bold py-2.5 ps-3 pe-8 rounded-xl border border-border/80 bg-background text-foreground focus:outline-none cursor-pointer appearance-none shadow-xs"
                >
                  {selectableAccounts.map((acc) => (
                    <option key={acc.code} value={acc.code}>
                      {acc.code} — {pick(acc.name.ar, acc.name.en)} ({acc.normalBalance === "debit" ? pick("طبيعة مدينة", "Debit") : pick("طبيعة دائنة", "Credit")})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
              </div>
            </div>

            {/* Quick Search within Accounts */}
            <div className="relative flex-1 max-w-xs self-end">
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                {pick("تصفية الحسابات:", "Filter Accounts:")}
              </label>
              <div className="relative">
                <Search className="size-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  placeholder={pick("ابحث بكود أو اسم الحساب...", "Search code or name...")}
                  className="w-full rounded-xl border border-border bg-background ps-8 pe-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons: Export & Print */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              title={pick("تصدير كشف حساب الأستاذ العام إلى Excel", "Export to Excel")}
            >
              <FileSpreadsheet className="size-3.5" />
              <span>{pick("تصدير Excel", "Export Excel")}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-secondary text-foreground font-bold text-xs shadow-xs transition-colors cursor-pointer"
              title={pick("معاينة وطباعة كشف الحساب المعتمد", "Print Statement")}
            >
              <Printer className="size-3.5" />
              <span>{pick("طباعة كشف الحساب", "Print Statement")}</span>
            </button>
          </div>
        </div>

        {/* Filters Row: Branch & Date Range */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl px-2.5 py-1.5 shadow-2xs text-xs">
            <Building2 className="size-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-bold text-muted-foreground">{pick("الفرع:", "Branch:")}</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-foreground text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">{pick("جميع الفروع والمراكز", "All Branches")}</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {pick(b.label.ar, b.label.en)}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Presets */}
          <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => handleApplyPreset("today")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                datePreset === "today" ? "bg-[#0f2744] text-white shadow-xs dark:bg-blue-800" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {pick("اليوم", "Today")}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("week")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                datePreset === "week" ? "bg-[#0f2744] text-white shadow-xs dark:bg-blue-800" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {pick("آخر 7 أيام", "Last 7 Days")}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("month")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                datePreset === "month" ? "bg-[#0f2744] text-white shadow-xs dark:bg-blue-800" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {pick("هذا الشهر", "This Month")}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                datePreset === "all" && !dateFrom && !dateTo ? "bg-[#0f2744] text-white shadow-xs dark:bg-blue-800" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {pick("كل التواريخ", "All Dates")}
            </button>
          </div>

          {/* Date Picker Range */}
          <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl px-2.5 py-1.5 shadow-2xs text-xs">
            <Calendar className="size-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-bold text-muted-foreground">{pick("من", "From")}:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDatePreset("custom");
                setDateFrom(e.target.value);
              }}
              className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none cursor-pointer"
            />
            <span className="text-muted-foreground/40 font-bold">|</span>
            <span className="text-[11px] font-bold text-muted-foreground">{pick("إلى", "To")}:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDatePreset("custom");
                setDateTo(e.target.value);
              }}
              className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none cursor-pointer"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDatePreset("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-muted-foreground hover:text-foreground text-xs px-1 cursor-pointer"
                title={pick("مسح التاريخ", "Clear")}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Account KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Opening Balance */}
        <div className="surface-panel rounded-xl p-3.5 sm:p-4 border border-border/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground block truncate">
            {pick("الرصيد الافتتاحي", "Opening Balance")}
          </span>
          <p className="text-lg sm:text-2xl font-mono font-black text-foreground">
            {money(ledgerData.openingBal)}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            {ledgerData.isDebitNormal ? pick("طبيعة الحساب: مدين", "Normal: Debit") : pick("طبيعة الحساب: دائن", "Normal: Credit")}
          </span>
        </div>

        {/* Total Debit Movements */}
        <div className="surface-panel rounded-xl p-3.5 sm:p-4 border border-border/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block truncate">
            {pick("إجمالي الحركات المدينة (+)", "Total Debit Movements")}
          </span>
          <p className="text-lg sm:text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
            {money(ledgerData.totalDebit)}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            {ledgerData.rows.filter((r) => r.debit > 0).length} {pick("حركة قيد", "entries")}
          </span>
        </div>

        {/* Total Credit Movements */}
        <div className="surface-panel rounded-xl p-3.5 sm:p-4 border border-border/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 block truncate">
            {pick("إجمالي الحركات الدائنة (-)", "Total Credit Movements")}
          </span>
          <p className="text-lg sm:text-2xl font-mono font-black text-sky-600 dark:text-sky-400">
            {money(ledgerData.totalCredit)}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            {ledgerData.rows.filter((r) => r.credit > 0).length} {pick("حركة قيد", "entries")}
          </span>
        </div>

        {/* Closing Balance */}
        <div className="surface-panel rounded-xl p-3.5 sm:p-4 border border-border/80 shadow-xs space-y-1 bg-primary/5">
          <span className="text-[11px] font-bold text-primary block truncate">
            {pick("الرصيد الختامي الحالي", "Closing Balance")}
          </span>
          <p className="text-lg sm:text-2xl font-mono font-black text-primary">
            {money(ledgerData.closingBal)}
          </p>
          <span className="text-[10px] font-bold text-primary/80 block">
            {ledgerData.closingBal >= 0 ? pick("رصيد مطابق للطبيعة", "Normal balance") : pick("رصيد عكس الطبيعة", "Inverse balance")}
          </span>
        </div>
      </div>

      {/* 3. Ledger Transactions Table & Mobile Cards */}
      <Panel
        title={pick(
          `دفتر أستاذ الحساب: ${currentAccount.code} — ${pick(currentAccount.name.ar, currentAccount.name.en)}`,
          `General Ledger: ${currentAccount.code} — ${pick(currentAccount.name.ar, currentAccount.name.en)}`
        )}
        aside={
          <span className="text-xs text-muted-foreground font-semibold">
            {ledgerData.rows.length} {pick("حركة مقيدة", "transactions")}
          </span>
        }
      >
        {/* Mobile Ledger Cards (< md) */}
        <div className="md:hidden space-y-3">
          {ledgerData.rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs font-semibold">
              <BookOpen className="size-8 mx-auto opacity-30 mb-2" />
              <p>{pick("لا توجد حركات مسجلة لهذا الحساب خلال الفترة المحددة", "No recorded movements for this account in the selected period")}</p>
            </div>
          ) : (
            paginatedRows.map((row) => (
              <div
                key={row.key}
                className="surface-panel rounded-xl p-3.5 border border-border/80 shadow-xs space-y-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-black text-xs text-primary">{row.id}</span>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-mono">📅 {row.date}</span>
                      <span>•</span>
                      <span>📍 {pick(row.branchName.ar, row.branchName.en)}</span>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                    {row.reference}
                  </span>
                </div>

                <p className="text-xs text-foreground bg-muted/30 p-2 rounded-lg border border-border/40">
                  {pick(row.memo.ar, row.memo.en)}
                </p>

                <div className="grid grid-cols-3 gap-2 bg-muted/40 rounded-lg p-2 text-xs border border-border/40 text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">{pick("مدين", "Debit")}</span>
                    <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {row.debit > 0 ? money(row.debit) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">{pick("دائن", "Credit")}</span>
                    <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
                      {row.credit > 0 ? money(row.credit) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-primary font-bold block">{pick("الرصيد الجاري", "Balance")}</span>
                    <span className="font-mono font-black text-xs text-foreground">
                      {money(row.runningBalance)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <DataTable
            head={[
              pick("التاريخ", "Date"),
              pick("رقم القيد", "JV #"),
              pick("المرجع", "Ref"),
              pick("الفرع / المركز", "Branch / Hub"),
              pick("البيان والشرح المحاسبي", "Description & Memo"),
              pick("مدين (ج.م)", "Debit"),
              pick("دائن (ج.م)", "Credit"),
              pick("الرصيد الجاري", "Running Balance"),
            ]}
          >
            {/* Opening Balance Row */}
            <tr className="bg-muted/40 font-bold border-b border-border/80">
              <Td className="font-mono text-xs text-muted-foreground">{dateFrom || "البداية"}</Td>
              <Td className="font-mono text-xs text-muted-foreground">—</Td>
              <Td className="font-mono text-xs text-muted-foreground">—</Td>
              <Td className="text-xs text-muted-foreground">—</Td>
              <Td className="font-bold text-xs text-foreground">
                {pick("الرصيد الافتتاحي للحساب", "Account Opening Balance")}
              </Td>
              <Td className="num font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {ledgerData.isDebitNormal && ledgerData.openingBal >= 0 ? money(ledgerData.openingBal) : "—"}
              </Td>
              <Td className="num font-mono font-bold text-sky-600 dark:text-sky-400">
                {!ledgerData.isDebitNormal && ledgerData.openingBal >= 0 ? money(ledgerData.openingBal) : "—"}
              </Td>
              <Td className="num font-mono font-black text-foreground">
                {money(ledgerData.openingBal)}
              </Td>
            </tr>

            {ledgerData.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-muted-foreground text-xs font-semibold">
                  {pick("لا توجد حركات مسجلة لهذا الحساب خلال الفترة المحددة", "No recorded movements for this account")}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr key={row.key} className="hover:bg-secondary/40 transition-colors">
                  <Td className="font-mono text-xs text-muted-foreground">{row.date}</Td>
                  <Td className="font-mono font-bold text-xs text-primary">{row.id}</Td>
                  <Td className="font-mono text-xs text-muted-foreground">{row.reference}</Td>
                  <Td className="text-xs font-medium text-foreground">{pick(row.branchName.ar, row.branchName.en)}</Td>
                  <Td className="text-xs text-foreground max-w-sm">{pick(row.memo.ar, row.memo.en)}</Td>
                  <Td className="num font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {row.debit > 0 ? money(row.debit) : "—"}
                  </Td>
                  <Td className="num font-mono font-bold text-sky-600 dark:text-sky-400">
                    {row.credit > 0 ? money(row.credit) : "—"}
                  </Td>
                  <Td className="num font-mono font-black text-foreground">
                    {money(row.runningBalance)}
                  </Td>
                </tr>
              ))
            )}

            {/* Total Row */}
            <tr className="bg-secondary/70 font-black text-xs border-t-2 border-border">
              <Td colSpan={5} className="font-black uppercase text-foreground">
                {pick("إجمالي الحركات والرصيد الختامي", "Total Movements & Closing Balance")}
              </Td>
              <Td className="num font-mono font-black text-emerald-600 dark:text-emerald-400">
                {money(ledgerData.totalDebit)}
              </Td>
              <Td className="num font-mono font-black text-sky-600 dark:text-sky-400">
                {money(ledgerData.totalCredit)}
              </Td>
              <Td className="num font-mono font-black text-primary text-sm">
                {money(ledgerData.closingBal)}
              </Td>
            </tr>
          </DataTable>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={ledgerData.rows.length}
          pageSize={30}
          onPageChange={setCurrentPage}
          itemLabel={{ ar: "حركة", en: "Transactions" }}
        />
      </Panel>

      {/* 4. Printable Account Statement Modal */}
      {isPrintModalOpen && (
        <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
          <DialogContent className="max-w-3xl p-6 rounded-2xl print:border-none print:shadow-none">
            <DialogHeader className="border-b border-border/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-black">
                    {pick("كشف حساب الأستاذ العام المعتمد", "Certified General Ledger Account Statement")}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentAccount.code} — {pick(currentAccount.name.ar, currentAccount.name.en)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="size-3.5" />
                  <span>{pick("طباعة الآن", "Print Now")}</span>
                </button>
              </div>
            </DialogHeader>

            <div className="space-y-4 my-2 text-xs">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/40 rounded-xl border border-border/60">
                <div>
                  <p className="font-bold text-foreground">
                    {pick("اسم الحساب:", "Account:")} {pick(currentAccount.name.ar, currentAccount.name.en)}
                  </p>
                  <p className="text-muted-foreground">
                    {pick("كود الحساب:", "Code:")} <span className="font-mono font-bold text-foreground">{currentAccount.code}</span>
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-muted-foreground">
                    {pick("الفترة:", "Period:")} {dateFrom || "البداية"} ➔ {dateTo || "اليوم"}
                  </p>
                  <p className="font-bold text-foreground">
                    {pick("الرصيد الختامي:", "Closing Balance:")} <span className="font-mono text-primary font-black">{money(ledgerData.closingBal)}</span>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-xs text-start border-collapse border border-border/80">
                  <thead className="bg-muted text-muted-foreground font-bold">
                    <tr>
                      <th className="p-2 border border-border">{pick("التاريخ", "Date")}</th>
                      <th className="p-2 border border-border">{pick("رقم القيد", "JV #")}</th>
                      <th className="p-2 border border-border">{pick("البيان", "Description")}</th>
                      <th className="p-2 border border-border text-end">{pick("مدين", "Debit")}</th>
                      <th className="p-2 border border-border text-end">{pick("دائن", "Credit")}</th>
                      <th className="p-2 border border-border text-end">{pick("الرصيد", "Balance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-muted/30 font-bold">
                      <td className="p-2 border border-border">{dateFrom || "البداية"}</td>
                      <td className="p-2 border border-border">—</td>
                      <td className="p-2 border border-border">{pick("رصيد افتتاحي", "Opening Balance")}</td>
                      <td className="p-2 border border-border text-end font-mono">
                        {ledgerData.isDebitNormal ? money(ledgerData.openingBal) : "—"}
                      </td>
                      <td className="p-2 border border-border text-end font-mono">
                        {!ledgerData.isDebitNormal ? money(ledgerData.openingBal) : "—"}
                      </td>
                      <td className="p-2 border border-border text-end font-mono font-black">{money(ledgerData.openingBal)}</td>
                    </tr>
                    {ledgerData.rows.map((r) => (
                      <tr key={r.key}>
                        <td className="p-2 border border-border font-mono">{r.date}</td>
                        <td className="p-2 border border-border font-mono font-bold">{r.id}</td>
                        <td className="p-2 border border-border">{pick(r.memo.ar, r.memo.en)}</td>
                        <td className="p-2 border border-border text-end font-mono">{r.debit > 0 ? money(r.debit) : "—"}</td>
                        <td className="p-2 border border-border text-end font-mono">{r.credit > 0 ? money(r.credit) : "—"}</td>
                        <td className="p-2 border border-border text-end font-mono font-black">{money(r.runningBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
