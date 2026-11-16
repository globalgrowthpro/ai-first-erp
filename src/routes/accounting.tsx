import { useState, useMemo, useEffect } from "react";
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
  AlertTriangle,
  Layers,
  List,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Download,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import {
  Btn,
  DataTable,
  KpiCard,
  PageHeader,
  Panel,
  Td,
  TablePagination,
  usePagination,
} from "@/components/kit";
import { ChartOfAccounts } from "@/components/accounting/ChartOfAccounts";
import { JournalEntryForm } from "@/components/accounting/JournalEntryForm";
import { JournalEntriesTable } from "@/components/accounting/JournalEntriesTable";
import { GeneralLedgerView } from "@/components/accounting/GeneralLedgerView";
import { AmericanJournalView } from "@/components/reports/AmericanJournalView";
import { useJournalStore } from "@/lib/accounting-store";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/accounting")({
  head: () => ({
    meta: [
      { title: "Accounting & General Ledger — Wazeer El-Helw ERP" },
      {
        name: "description",
        content:
          "Multi-branch chart of accounts, real POS sales journal entries, American Journal, general ledger, and balanced trial balance.",
      },
      { property: "og:title", content: "Accounting & General Ledger — Wazeer El-Helw ERP" },
      {
        property: "og:description",
        content: "Chart of accounts, branch POS journal entries, American Journal and trial balance.",
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
  {
    id: "kitchen",
    label: { ar: "المطبخ المركزي — تشغيل وتوصيل", en: "Central Kitchen Delivery Hub" },
  },
  { id: "hq", label: { ar: "الإدارة العامة — الخزينة المركزية", en: "Executive HQ Safe" } },
];

type AccountingTab = "coa" | "journal" | "american" | "ledger" | "trial";

function Accounting() {
  const { t, pick, money, dir, n } = useI18n();
  const [activeTab, setActiveTab] = useState<AccountingTab>("coa");
  const [isJournalFormOpen, setIsJournalFormOpen] = useState(false);
  const { entries, loading, isLive, fetchJournal } = useJournalStore();

  // Dynamic Branches from Supabase
  const [branchesList, setBranchesList] = useState<
    { id: string; code: string; label: { ar: string; en: string } }[]
  >([]);

  useEffect(() => {
    supabase
      .from("branches")
      .select("id, code, name_ar, name_en")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setBranchesList(
            data.map((b) => ({
              id: b.code || b.id,
              code: b.code,
              label: { ar: b.name_ar, en: b.name_en },
            })),
          );
        }
      });
  }, []);

  const branchFilterOptions = useMemo(() => {
    const allOpt = { id: "all", label: { ar: "جميع الفروع والمراكز", en: "All Branches & Hubs" } };
    if (branchesList.length > 0) {
      return [allOpt, ...branchesList];
    }
    return BRANCH_FILTER_OPTIONS;
  }, [branchesList]);

  // Grouped Entries Count for Badge
  const groupedEntriesCount = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.id) set.add(e.id);
    }
    return set.size;
  }, [entries]);

  // -------------------------------------------------------------------------
  // TRIAL BALANCE FILTERS & COMPUTATIONS
  // -------------------------------------------------------------------------
  const [trialSearch, setTrialSearch] = useState("");
  const [trialBranch, setTrialBranch] = useState("all");
  const [trialDateFrom, setTrialDateFrom] = useState("");
  const [trialDateTo, setTrialDateTo] = useState("");
  const [trialDatePreset, setTrialDatePreset] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [hideZeroBalances, setHideZeroBalances] = useState(false);

  const handleApplyTrialPreset = (preset: "all" | "today" | "week" | "month") => {
    setTrialDatePreset(preset);
    const d = new Date();
    const formatD = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const day = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const today = formatD(d);

    if (preset === "all") {
      setTrialDateFrom("");
      setTrialDateTo("");
    } else if (preset === "today") {
      setTrialDateFrom(today);
      setTrialDateTo(today);
    } else if (preset === "week") {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      setTrialDateFrom(formatD(w));
      setTrialDateTo(today);
    } else if (preset === "month") {
      const mStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      setTrialDateFrom(mStart);
      setTrialDateTo(today);
    }
  };

  // Filter entries for Trial Balance
  const trialFilteredEntries = useMemo(() => {
    return entries.filter((item) => {
      if (trialBranch !== "all" && item.branchId && item.branchId !== trialBranch) {
        return false;
      }
      if (trialDateFrom || trialDateTo) {
        const itemDateOnly = item.date ? (item.date.includes("T") ? item.date.slice(0, 10) : item.date) : "";
        if (itemDateOnly) {
          if (trialDateFrom && itemDateOnly < trialDateFrom) return false;
          if (trialDateTo && itemDateOnly > trialDateTo) return false;
        }
      }
      return true;
    });
  }, [entries, trialBranch, trialDateFrom, trialDateTo]);

  // Dynamic Real Trial Balance calculated by Totals and Net Balances
  const realTrialBalance = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: { ar: string; en: string }; debit: number; credit: number }
    >();

    for (const item of trialFilteredEntries) {
      const code = item.accountCode || "1000";
      const curr = map.get(code) || {
        code,
        name: item.account || { ar: "حساب", en: "Account" },
        debit: 0,
        credit: 0,
      };
      curr.debit += Number(item.debit || 0);
      curr.credit += Number(item.credit || 0);
      map.set(code, curr);
    }

    const q = trialSearch.toLowerCase().trim();

    return Array.from(map.values())
      .map((item) => {
        const diff = item.debit - item.credit;
        const netDebit = diff > 0 ? diff : 0;
        const netCredit = diff < 0 ? Math.abs(diff) : 0;
        return {
          ...item,
          netDebit,
          netCredit,
        };
      })
      .filter((item) => {
        if (hideZeroBalances && item.debit === 0 && item.credit === 0) return false;
        if (!q) return true;
        const codeMatch = item.code.toLowerCase().includes(q);
        const arMatch = (item.name.ar || "").toLowerCase().includes(q);
        const enMatch = (item.name.en || "").toLowerCase().includes(q);
        return codeMatch || arMatch || enMatch;
      })
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [trialFilteredEntries, trialSearch, hideZeroBalances]);

  // Trial Balance Totals
  const trialTotalDebit = useMemo(
    () => realTrialBalance.reduce((s, r) => s + (Number(r.debit) || 0), 0),
    [realTrialBalance],
  );
  const trialTotalCredit = useMemo(
    () => realTrialBalance.reduce((s, r) => s + (Number(r.credit) || 0), 0),
    [realTrialBalance],
  );
  const trialNetDebit = useMemo(
    () => realTrialBalance.reduce((s, r) => s + (Number(r.netDebit) || 0), 0),
    [realTrialBalance],
  );
  const trialNetCredit = useMemo(
    () => realTrialBalance.reduce((s, r) => s + (Number(r.netCredit) || 0), 0),
    [realTrialBalance],
  );

  const isTrialBalanced =
    Math.abs(trialTotalDebit - trialTotalCredit) < 0.01 &&
    Math.abs(trialNetDebit - trialNetCredit) < 0.01;

  // Pagination for trial balance
  const {
    currentPage: trialPage,
    setCurrentPage: setTrialPage,
    paginatedItems: paginatedTrialRows,
  } = usePagination(realTrialBalance, 40);

  // Excel Export for Trial Balance
  const handleExportTrialBalanceExcel = () => {
    const exportRows = realTrialBalance.map((r, idx) => ({
      "م": idx + 1,
      "كود الحساب": r.code,
      "اسم الحساب": pick(r.name.ar, r.name.en),
      "مجاميع حركات مدينة (ج.م)": r.debit,
      "مجاميع حركات دائنة (ج.م)": r.credit,
      "صافي رصيد مدين (ج.م)": r.netDebit,
      "صافي رصيد دائن (ج.م)": r.netCredit,
    }));

    exportRows.push({
      "م": 0,
      "كود الحساب": "—",
      "اسم الحساب": "الإجمالي العام المعتمد",
      "مجاميع حركات مدينة (ج.م)": trialTotalDebit,
      "مجاميع حركات دائنة (ج.م)": trialTotalCredit,
      "صافي رصيد مدين (ج.م)": trialNetDebit,
      "صافي رصيد دائن (ج.م)": trialNetCredit,
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 32 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "ميزان_المراجعة");
    safeDownloadWorkbook(
      wb,
      `ميزان_المراجعة_بالمجاميع_والأرصدة_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // General Journal Export to Excel
  const handleExportJournalToExcel = () => {
    const exportRows = entries.map((line, idx) => ({
      "م": idx + 1,
      "رقم القيد": line.id,
      التاريخ: line.date,
      "المرجع / المستند": line.reference || "-",
      "الفرع / المركز": pick(line.branchName?.ar || "الإدارة العامة", line.branchName?.en || "HQ"),
      "البيان والشرح": pick(line.memo?.ar || "-", line.memo?.en || "-"),
      "كود الحساب": line.accountCode || "-",
      "اسم الحساب": pick(line.account?.ar || "غير محدد", line.account?.en || "Unknown"),
      "مدين (ج.م)": Number(line.debit) || 0,
      "دائن (ج.م)": Number(line.credit) || 0,
      الحالة: line.status === "posted" ? "مرحل ومعتمد" : "مسودة",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 24 },
      { wch: 38 },
      { wch: 12 },
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "قيود_اليومية_العامة");
    safeDownloadWorkbook(wb, `دفتر_قيود_اليومية_العامة_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav_accounting")}
        subtitle={pick(
          "دليل الحسابات الشجري، دفتر قيود اليومية، اليومية الأمريكية، دفتر الأستاذ العام، وميزان المراجعة بالمجاميع والأرصدة",
          "Chart of accounts, general journal, American journal matrix, general ledger, and verified trial balance"
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

      {/* Accounting View Tabs - Horizontally scrollable strip on mobile */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 max-w-full">
          {/* Tab 1: Chart of Accounts */}
          <Btn
            variant={activeTab === "coa" ? "solid" : "outline"}
            onClick={() => setActiveTab("coa")}
            className="text-xs font-bold gap-2 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <FolderTree className="size-4" />
            <span>{t("chartOfAccounts")}</span>
          </Btn>

          {/* Tab 2: General Journal */}
          <Btn
            variant={activeTab === "journal" ? "solid" : "outline"}
            onClick={() => setActiveTab("journal")}
            className="text-xs font-bold gap-2 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <BookOpen className="size-4" />
            <span>{t("journal")}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-[10px] font-mono">
              {groupedEntriesCount}
            </span>
          </Btn>

          {/* Tab 3: American Journal (اليومية الأمريكية) */}
          <Btn
            variant={activeTab === "american" ? "solid" : "outline"}
            onClick={() => setActiveTab("american")}
            className="text-xs font-bold gap-2 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Layers className="size-4 text-purple-600 dark:text-purple-400" />
            <span>{pick("اليومية الأمريكية", "American Journal")}</span>
          </Btn>

          {/* Tab 4: General Ledger (دفتر الأستاذ العام) */}
          <Btn
            variant={activeTab === "ledger" ? "solid" : "outline"}
            onClick={() => setActiveTab("ledger")}
            className="text-xs font-bold gap-2 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <List className="size-4 text-amber-500" />
            <span>{pick("دفتر الأستاذ العام", "General Ledger")}</span>
          </Btn>

          {/* Tab 5: Trial Balance (ميزان المراجعة) */}
          <Btn
            variant={activeTab === "trial" ? "solid" : "outline"}
            onClick={() => setActiveTab("trial")}
            className="text-xs font-bold gap-2 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Scale className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t("trialBalance")}</span>
          </Btn>
        </div>

        {/* Live Supabase Sync & Fast Excel Export on Journal tab */}
        {activeTab === "journal" && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold shadow-2xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{pick("بيانات حية مباشرة (Supabase)", "Live Supabase Data")}</span>
            </div>

            <button
              type="button"
              onClick={handleExportJournalToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs transition-colors cursor-pointer"
              title={pick("تصدير قيود اليومية إلى إكسيل", "Export Journal to Excel")}
            >
              <FileSpreadsheet className="size-3.5" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={() => fetchJournal()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title={pick("مزامنة وتحديث البيانات الحية من قاعدة البيانات", "Sync live operational journal")}
            >
              <RefreshCw className={cn("size-3", loading && "animate-spin")} />
              <span>
                {loading
                  ? pick("جاري المزامنة...", "Syncing...")
                  : pick("مزامنة البيانات الحية", "Sync Live")}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Chart of Accounts */}
      {activeTab === "coa" && <ChartOfAccounts />}

      {/* Tab 2: Journal Entries (جدول قيود اليومية المحاسبي المعتمد) */}
      {activeTab === "journal" && (
        <JournalEntriesTable
          branchOptions={branchFilterOptions}
          onOpenNewEntry={() => setIsJournalFormOpen(true)}
        />
      )}

      {/* Tab 3: American Journal Matrix (اليومية الأمريكية المجمعة) */}
      {activeTab === "american" && <AmericanJournalView />}

      {/* Tab 4: General Ledger Account Statement (دفتر الأستاذ العام وتفاصيل حركة الحساب) */}
      {activeTab === "ledger" && <GeneralLedgerView branchOptions={branchFilterOptions} />}

      {/* Tab 5: Trial Balance (ميزان المراجعة بالمجاميع والأرصدة) */}
      {activeTab === "trial" && (
        <div className="space-y-6">
          {/* Top 4 KPI Cards for Trial Balance */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="surface-panel rounded-xl p-3.5 sm:p-4 border border-border/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block truncate">
                {pick("مجموع الحركات المدينة", "Total Debit Turnover")}
              </span>
              <p className="text-base sm:text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                {money(trialTotalDebit)}
              </p>
              <span className="text-[10px] text-muted-foreground block">{realTrialBalance.length} {pick("حساب نشط", "accounts")}</span>
            </div>

            <div className="surface-panel rounded-xl p-3.5 sm:p-4 border border-border/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 block truncate">
                {pick("مجموع الحركات الدائنة", "Total Credit Turnover")}
              </span>
              <p className="text-base sm:text-xl font-mono font-black text-sky-600 dark:text-sky-400">
                {money(trialTotalCredit)}
              </p>
              <span className="text-[10px] text-muted-foreground block">{realTrialBalance.length} {pick("حساب نشط", "accounts")}</span>
            </div>

            <div className="surface-panel rounded-xl p-3.5 sm:p-4 border border-border/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-primary block truncate">
                {pick("صافي الأرصدة (مدينة = دائنة)", "Net Equilibrium Balances")}
              </span>
              <p className="text-base sm:text-xl font-mono font-black text-primary">
                {money(trialNetDebit)}
              </p>
              <span className="text-[10px] text-muted-foreground block">{pick("تطابق تام للأرصدة", "Exact Net Match")}</span>
            </div>

            <div className="surface-panel rounded-xl p-3.5 sm:p-4 border border-border/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground block truncate">
                {pick("حالة توازن ميزان المراجعة", "Equilibrium Status")}
              </span>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-xs sm:text-sm mt-1">
                {isTrialBalanced ? (
                  <>
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span className="truncate">{pick("متوازن محاسبياً (0.00)", "Balanced")}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-4 text-rose-600 shrink-0" />
                    <span className="text-rose-600 truncate">{pick("يوجد فارق تسوية", "Discrepancy")}</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground block">
                {isTrialBalanced ? pick("المجاميع والأرصدة مطابقة", "Totals and balances match") : pick("يرجى مراجعة قيود التسوية", "Review adjustments")}
              </span>
            </div>
          </div>

          {/* Trial Balance Filter Bar */}
          <div className="surface-panel rounded-2xl p-4 border border-border/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search by code or account name */}
              <div className="relative flex-1 max-w-sm">
                <Search className="size-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={trialSearch}
                  onChange={(e) => setTrialSearch(e.target.value)}
                  placeholder={pick("بحث بكود أو اسم الحساب في الميزان...", "Search account code or name...")}
                  className="w-full rounded-xl border border-border bg-background ps-9 pe-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Branch Filter */}
              <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl px-2.5 py-1.5 shadow-2xs text-xs">
                <Building2 className="size-3.5 text-primary shrink-0" />
                <span className="text-[11px] font-bold text-muted-foreground">{pick("الفرع:", "Branch:")}</span>
                <select
                  value={trialBranch}
                  onChange={(e) => setTrialBranch(e.target.value)}
                  className="bg-transparent text-foreground text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">{pick("جميع الفروع والمراكز", "All Branches")}</option>
                  {branchFilterOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {pick(b.label.ar, b.label.en)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hide zero balances toggle */}
              <button
                type="button"
                onClick={() => setHideZeroBalances(!hideZeroBalances)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                  hideZeroBalances
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {hideZeroBalances
                  ? pick("إخفاء الأرصدة الصفرية (مفعّل)", "Hide Zero Balances (ON)")
                  : pick("عرض كافة الحسابات", "Show All Accounts")}
              </button>

              {/* Export to Excel */}
              <button
                type="button"
                onClick={handleExportTrialBalanceExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                title={pick("تصدير ميزان المراجعة إلى Excel", "Export Trial Balance to Excel")}
              >
                <FileSpreadsheet className="size-3.5" />
                <span>{pick("تصدير إلى Excel", "Export to Excel")}</span>
              </button>
            </div>

            {/* Date Presets Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
              <span className="text-[11px] font-bold text-muted-foreground">{pick("الفترة المحاسبية:", "Accounting Period:")}</span>
              <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => handleApplyTrialPreset("today")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                    trialDatePreset === "today" ? "bg-[#0f2744] text-white shadow-xs dark:bg-blue-800" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {pick("اليوم", "Today")}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTrialPreset("week")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                    trialDatePreset === "week" ? "bg-[#0f2744] text-white shadow-xs dark:bg-blue-800" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {pick("آخر 7 أيام", "Last 7 Days")}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTrialPreset("month")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                    trialDatePreset === "month" ? "bg-[#0f2744] text-white shadow-xs dark:bg-blue-800" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {pick("هذا الشهر", "This Month")}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTrialPreset("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                    trialDatePreset === "all" && !trialDateFrom && !trialDateTo ? "bg-[#0f2744] text-white shadow-xs dark:bg-blue-800" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {pick("كل الفترات", "All Time")}
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl px-2 py-1 shadow-2xs">
                <Calendar className="size-3 text-primary shrink-0" />
                <input
                  type="date"
                  value={trialDateFrom}
                  onChange={(e) => {
                    setTrialDatePreset("custom");
                    setTrialDateFrom(e.target.value);
                  }}
                  className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none cursor-pointer"
                />
                <span>➔</span>
                <input
                  type="date"
                  value={trialDateTo}
                  onChange={(e) => {
                    setTrialDatePreset("custom");
                    setTrialDateTo(e.target.value);
                  }}
                  className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none cursor-pointer"
                />
                {(trialDateFrom || trialDateTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTrialDatePreset("all");
                      setTrialDateFrom("");
                      setTrialDateTo("");
                    }}
                    className="text-muted-foreground hover:text-foreground text-xs px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Trial Balance Table & Mobile Cards */}
          <Panel
            title={pick(
              "ميزان المراجعة العام بالمجاميع والأرصدة (بيانات حية ومباشرة)",
              "General Ledger Trial Balance by Totals & Net Balances"
            )}
            aside={
              <span className="text-xs font-semibold text-muted-foreground">
                {realTrialBalance.length} {pick("حساب معتمد", "accounts verified")}
              </span>
            }
          >
            {/* Mobile Trial Balance Cards (< md) */}
            <div className="md:hidden space-y-3">
              {realTrialBalance.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs font-semibold">
                  {pick("لا توجد حركات في الفترة أو الحسابات المحددة", "No ledger activity in this period")}
                </div>
              ) : (
                paginatedTrialRows.map((r, i) => (
                  <div
                    key={`${r.code}-${i}`}
                    className="surface-panel rounded-xl p-3.5 border border-border/80 shadow-xs space-y-2.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-black text-xs text-primary">{r.code}</span>
                        <p className="font-bold text-foreground text-xs mt-0.5">{pick(r.name.ar, r.name.en)}</p>
                      </div>

                      <div className="text-end">
                        {r.netDebit > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            {pick("رصيد مدين", "Debit Bal")}: {money(r.netDebit)}
                          </span>
                        ) : r.netCredit > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30">
                            {pick("رصيد دائن", "Credit Bal")}: {money(r.netCredit)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50">
                            0.00 {pick("مصفى", "Zero")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-muted/40 rounded-lg p-2 text-xs border border-border/40 text-center">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">{pick("مجموع المدين", "Debit Total")}</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          {r.debit > 0 ? money(r.debit) : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">{pick("مجموع الدائن", "Credit Total")}</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">
                          {r.credit > 0 ? money(r.credit) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Multi-Column Table View (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <DataTable
                head={[
                  pick("كود الحساب", "Code"),
                  pick("اسم الحساب", "Account Name"),
                  pick("مجموع مدين (ج.م)", "Turnover Debit"),
                  pick("مجموع دائن (ج.م)", "Turnover Credit"),
                  pick("رصيد مدين (ج.م)", "Net Debit Bal"),
                  pick("رصيد دائن (ج.م)", "Net Credit Bal"),
                ]}
              >
                {realTrialBalance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                      {pick("لا توجد حركات في الفترة أو الحسابات المحددة", "No ledger activity in this period")}
                    </td>
                  </tr>
                ) : (
                  paginatedTrialRows.map((r, i) => (
                    <tr key={`${r.code}-${i}`} className="hover:bg-secondary/40 transition-colors">
                      <Td className="font-mono text-xs text-primary font-bold">{r.code}</Td>
                      <Td className="font-semibold text-xs text-foreground">
                        {pick(r.name.ar, r.name.en)}
                      </Td>
                      <Td className="num font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {r.debit > 0 ? money(r.debit) : "—"}
                      </Td>
                      <Td className="num font-mono font-bold text-sky-600 dark:text-sky-400">
                        {r.credit > 0 ? money(r.credit) : "—"}
                      </Td>
                      <Td className="num font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/5">
                        {r.netDebit > 0 ? money(r.netDebit) : "—"}
                      </Td>
                      <Td className="num font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-500/5">
                        {r.netCredit > 0 ? money(r.netCredit) : "—"}
                      </Td>
                    </tr>
                  ))
                )}

                {/* Verified Grand Total Row */}
                <tr className="bg-secondary/70 font-black text-xs border-t-2 border-border">
                  <Td colSpan={2} className="font-black uppercase text-foreground">
                    {pick("الإجمالي العام المعتمد (ميزان متوازن)", "Grand Total Balance (Equilibrium)")}
                  </Td>
                  <Td className="num font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {money(trialTotalDebit)}
                  </Td>
                  <Td className="num font-mono font-black text-sky-600 dark:text-sky-400">
                    {money(trialTotalCredit)}
                  </Td>
                  <Td className="num font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
                    {money(trialNetDebit)}
                  </Td>
                  <Td className="num font-mono font-black text-sky-700 dark:text-sky-300 bg-sky-500/10">
                    {money(trialNetCredit)}
                  </Td>
                </tr>
              </DataTable>
            </div>

            <TablePagination
              currentPage={trialPage}
              totalItems={realTrialBalance.length}
              pageSize={40}
              onPageChange={setTrialPage}
              itemLabel={{ ar: "حساب في الميزان", en: "Accounts in Trial" }}
            />
          </Panel>
        </div>
      )}

      {/* Journal Entry Form Modal */}
      <JournalEntryForm open={isJournalFormOpen} onOpenChange={setIsJournalFormOpen} />
    </div>
  );
}
