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
  RefreshCw,
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
import { useJournalStore } from "@/lib/accounting-store";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

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
  {
    id: "kitchen",
    label: { ar: "المطبخ المركزي — تشغيل وتوصيل", en: "Central Kitchen Delivery Hub" },
  },
  { id: "hq", label: { ar: "الإدارة العامة — الخزينة المركزية", en: "Executive HQ Safe" } },
];

function Accounting() {
  const { t, pick, money, dir, n } = useI18n();
  const [activeTab, setActiveTab] = useState<"coa" | "journal" | "trial">("coa");
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
    [filteredEntries],
  );
  const totalCredit = useMemo(
    () => filteredEntries.reduce((s, r) => s + (Number(r.credit) || 0), 0),
    [filteredEntries],
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // Dynamic Real Trial Balance calculated from filteredEntries
  const realTrialBalance = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: { ar: string; en: string }; debit: number; credit: number }
    >();

    for (const item of filteredEntries) {
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

    return Array.from(map.values()).sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true }),
    );
  }, [filteredEntries]);

  // Trial Balance Totals
  const trialTotalDebit = useMemo(
    () => realTrialBalance.reduce((s, r) => s + (Number(r.debit) || 0), 0),
    [realTrialBalance],
  );
  const trialTotalCredit = useMemo(
    () => realTrialBalance.reduce((s, r) => s + (Number(r.credit) || 0), 0),
    [realTrialBalance],
  );

  // Excel Export Handler
  const handleExportToExcel = () => {
    const exportRows = filteredEntries.map((line, idx) => ({
      م: idx + 1,
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
      { wch: 5 }, // م
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

    const dateSuffix =
      dateFrom || dateTo
        ? `_من_${dateFrom || "البداية"}_إلى_${dateTo || "اليوم"}`
        : `_${new Date().toISOString().slice(0, 10)}`;
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
              {groupedEntries.length}
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
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold shadow-2xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{pick("بيانات حية مباشرة (Supabase)", "Live Supabase Data")}</span>
            </div>

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
              onClick={() => fetchJournal()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title={pick(
                "مزامنة وتحديث البيانات الحية من قاعدة البيانات",
                "Sync live operational journal",
              )}
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
                <span>
                  {pick("متوازن محاسبياً (المدين = الدائن)", "Balanced (Debit = Credit)")}
                </span>
              </div>
            </div>
          </div>

          <Panel
            title={pick(
              "ميزان المراجعة العام بالمجاميع والأرصدة (بيانات حية)",
              "General Ledger Trial Balance (Live Data)",
            )}
            aside={
              <span className="text-xs font-semibold text-muted-foreground">
                {pick(
                  "محسوب ديناميكياً من قيود العمليات اليومية الحية",
                  "Dynamically computed from live operational journals",
                )}
              </span>
            }
          >
            <DataTable
              head={[
                t("account"),
                pick("كود الحساب", "Code"),
                pick("مدين (ج.م)", "Debit"),
                pick("دائن (ج.م)", "Credit"),
              ]}
            >
              {realTrialBalance.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground text-xs">
                    {pick("لا توجد حركات في الفترة المحددة", "No ledger activity in this period")}
                  </td>
                </tr>
              ) : (
                realTrialBalance.map((r, i) => (
                  <tr key={`${r.code}-${i}`} className="hover:bg-secondary/40">
                    <Td className="font-semibold text-xs text-foreground">
                      {pick(r.name.ar, r.name.en)}
                    </Td>
                    <Td className="font-mono text-xs text-primary font-bold">{r.code}</Td>
                    <Td className="num font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {r.debit ? money(r.debit) : "—"}
                    </Td>
                    <Td className="num font-mono font-bold text-sky-600 dark:text-sky-400">
                      {r.credit ? money(r.credit) : "—"}
                    </Td>
                  </tr>
                ))
              )}
              <tr className="bg-secondary/60 font-black text-sm border-t-2 border-border">
                <Td colSpan={2} className="font-black uppercase">
                  {pick("الإجمالي العام المعتمد", "Grand Total Balance")}
                </Td>
                <Td className="num font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {money(trialTotalDebit)}
                </Td>
                <Td className="num font-mono font-black text-sky-600 dark:text-sky-400">
                  {money(trialTotalCredit)}
                </Td>
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
