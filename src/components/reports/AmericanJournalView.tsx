import { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Building2,
  Calendar,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Eye,
  SlidersHorizontal,
  RotateCcw,
  BadgeCheck,
  ArrowRightLeft,
  DollarSign,
  Scale,
  Hash,
  Download,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useI18n } from "@/lib/i18n";
import { Btn, TablePagination, usePagination } from "@/components/kit";
import { useJournalStore, type JournalEntry } from "@/lib/accounting-store";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { BRANCH_NAMES_MAP } from "@/lib/pos-orders-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ============================================================================
// ACCOUNT GROUP DEFINITIONS FOR AMERICAN JOURNAL
// ============================================================================

export interface AccountColumnGroup {
  id: string;
  codePrefixes: string[];
  name: { ar: string; en: string };
  shortName: { ar: string; en: string };
  badgeColor: string;
}

export const AMERICAN_JOURNAL_ACCOUNT_GROUPS: AccountColumnGroup[] = [
  {
    id: "cash",
    codePrefixes: ["1111", "1114", "1115", "1119"],
    name: { ar: "الخزينة والصناديق", en: "Cash & Branch Safes" },
    shortName: { ar: "الخزينة", en: "Cash" },
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    id: "banks",
    codePrefixes: ["1112", "1113", "1125", "1128"],
    name: { ar: "البنوك والوسيط الإلكتروني", en: "Banks & Clearing" },
    shortName: { ar: "البنوك", en: "Banks" },
    badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  {
    id: "customers",
    codePrefixes: ["113"],
    name: { ar: "العملاء والمدينون", en: "Customers & Receivables" },
    shortName: { ar: "العملاء", en: "Customers" },
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  {
    id: "suppliers",
    codePrefixes: ["211"],
    name: { ar: "الموردون والدائنون", en: "Suppliers & Payables" },
    shortName: { ar: "الموردون", en: "Suppliers" },
    badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  {
    id: "inventory",
    codePrefixes: ["114"],
    name: { ar: "المخزون وبضاعة المستودع", en: "Inventory & Goods" },
    shortName: { ar: "المخزون", en: "Inventory" },
    badgeColor: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30",
  },
  {
    id: "sales",
    codePrefixes: ["41"],
    name: { ar: "المبيعات والإيرادات", en: "Sales & Revenues" },
    shortName: { ar: "المبيعات", en: "Sales" },
    badgeColor: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30",
  },
  {
    id: "cogs",
    codePrefixes: ["51"],
    name: { ar: "تكلفة المبيعات والمشتريات", en: "COGS & Purchases" },
    shortName: { ar: "ت. المبيعات", en: "COGS" },
    badgeColor: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
  },
  {
    id: "expenses",
    codePrefixes: ["52"],
    name: { ar: "المصروفات التشغيلية والعمومية", en: "Operating Expenses" },
    shortName: { ar: "المصروفات", en: "Expenses" },
    badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  {
    id: "payroll",
    codePrefixes: ["53"],
    name: { ar: "الأجور والمرتبات والمستحقات", en: "Payroll & Salaries" },
    shortName: { ar: "الأجور", en: "Payroll" },
    badgeColor: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  },
  {
    id: "vat",
    codePrefixes: ["212"],
    name: { ar: "ضريبة القيمة المضافة والضرائب", en: "VAT & Taxes" },
    shortName: { ar: "الضرائب", en: "Taxes" },
    badgeColor: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  },
  {
    id: "fixed_assets",
    codePrefixes: ["12"],
    name: { ar: "الأصول الثابتة ومجمعات الإهلاك", en: "Fixed Assets & Deprec." },
    shortName: { ar: "الأصول", en: "Assets" },
    badgeColor: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  },
  {
    id: "equity",
    codePrefixes: ["31"],
    name: { ar: "حقوق الملكية ورأس المال", en: "Capital & Equity" },
    shortName: { ar: "الملكية", en: "Equity" },
    badgeColor: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  },
  {
    id: "other",
    codePrefixes: [],
    name: { ar: "حسابات وسيطة ومتنوعة", en: "Clearing & Other Accounts" },
    shortName: { ar: "أخرى", en: "Other" },
    badgeColor: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
  },
];

// Determine which group an entry line belongs to
function categorizeJournalLine(line: JournalEntry): string {
  const code = (line.accountCode || "").trim();
  if (code) {
    for (const grp of AMERICAN_JOURNAL_ACCOUNT_GROUPS) {
      if (grp.codePrefixes.some((pfx) => code.startsWith(pfx))) {
        return grp.id;
      }
    }
  }

  // Fallback heuristic based on account name
  const nameAr = (line.account?.ar || "").toLowerCase();
  const nameEn = (line.account?.en || "").toLowerCase();
  const txt = `${nameAr} ${nameEn}`;

  if (txt.includes("خزين") || txt.includes("درج") || txt.includes("كاشير") || txt.includes("صندوق") || txt.includes("cash") || txt.includes("drawer") || txt.includes("safe")) {
    return "cash";
  }
  if (txt.includes("بنك") || txt.includes("bank") || txt.includes("cib") || txt.includes("qnb") || txt.includes("إنستاباي") || txt.includes("instapay") || txt.includes("clearing") || txt.includes("فيزا")) {
    return "banks";
  }
  if (txt.includes("عميل") || txt.includes("عملاء") || txt.includes("customer") || txt.includes("receivable")) {
    return "customers";
  }
  if (txt.includes("مورد") || txt.includes("موردين") || txt.includes("supplier") || txt.includes("payable")) {
    return "suppliers";
  }
  if (txt.includes("مخزن") || txt.includes("مخزون") || txt.includes("خامات") || txt.includes("بضاعة") || txt.includes("inventory") || txt.includes("stock")) {
    return "inventory";
  }
  if (txt.includes("مبيعات") || txt.includes("إيراد") || txt.includes("sales") || txt.includes("revenue")) {
    return "sales";
  }
  if (txt.includes("تكلفة") || txt.includes("مشتريات") || txt.includes("cogs") || txt.includes("purchases")) {
    return "cogs";
  }
  if (txt.includes("إيجار") || txt.includes("كهرباء") || txt.includes("صيانة") || txt.includes("مصروف") || txt.includes("expense") || txt.includes("utilities")) {
    return "expenses";
  }
  if (txt.includes("راتب") || txt.includes("رواتب") || txt.includes("أجور") || txt.includes("مرتبات") || txt.includes("payroll") || txt.includes("salary")) {
    return "payroll";
  }
  if (txt.includes("ضريب") || txt.includes("vat") || txt.includes("tax")) {
    return "vat";
  }
  if (txt.includes("أصول") || txt.includes("سيار") || txt.includes("فرن") || txt.includes("ثلاج") || txt.includes("asset") || txt.includes("depreciation")) {
    return "fixed_assets";
  }
  if (txt.includes("رأس المال") || txt.includes("حقوق الملكية") || txt.includes("أرباح مرحلة") || txt.includes("capital") || txt.includes("equity")) {
    return "equity";
  }

  return "other";
}

export interface AmericanJournalVoucherRow {
  id: string;
  date: string;
  reference: string;
  memo: { ar: string; en: string };
  branchId?: string | undefined;
  branchName: { ar: string; en: string };
  status: "posted" | "approved" | "draft";
  lines: JournalEntry[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  groupValues: Record<string, { debit: number; credit: number }>;
}

export interface AmericanJournalViewProps {
  onBackToCatalog?: () => void;
}

export function AmericanJournalView({ onBackToCatalog }: AmericanJournalViewProps) {
  const { pick, money, n, dir, lang } = useI18n();
  const { entries, loading, isLive, fetchJournal } = useJournalStore();

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "week" | "month" | "quarter" | "year" | "custom">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Column toggles state (default all active)
  const [visibleGroupIds, setVisibleGroupIds] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of AMERICAN_JOURNAL_ACCOUNT_GROUPS) {
      init[g.id] = true;
    }
    return init;
  });
  const [showColumnToggles, setShowColumnToggles] = useState(false);

  // Drilldown modal state
  const [selectedVoucher, setSelectedVoucher] = useState<AmericanJournalVoucherRow | null>(null);

  // Quick preset helper
  const handleApplyPreset = (preset: "all" | "today" | "yesterday" | "week" | "month" | "quarter" | "year") => {
    setDatePreset(preset);
    const d = new Date();
    const formatD = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const day = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (preset === "today") {
      const str = formatD(d);
      setDateFrom(str);
      setDateTo(str);
    } else if (preset === "yesterday") {
      d.setDate(d.getDate() - 1);
      const str = formatD(d);
      setDateFrom(str);
      setDateTo(str);
    } else if (preset === "week") {
      const start = new Date(d);
      start.setDate(d.getDate() - 7);
      setDateFrom(formatD(start));
      setDateTo(formatD(d));
    } else if (preset === "month") {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setDateFrom(formatD(start));
      setDateTo(formatD(end));
    } else if (preset === "quarter") {
      const qMonth = Math.floor(d.getMonth() / 3) * 3;
      const start = new Date(d.getFullYear(), qMonth, 1);
      const end = new Date(d.getFullYear(), qMonth + 3, 0);
      setDateFrom(formatD(start));
      setDateTo(formatD(end));
    } else if (preset === "year") {
      const start = new Date(d.getFullYear(), 0, 1);
      const end = new Date(d.getFullYear(), 11, 31);
      setDateFrom(formatD(start));
      setDateTo(formatD(end));
    }
  };

  // Group raw journal lines into complete American Journal vouchers
  const allVoucherRows = useMemo<AmericanJournalVoucherRow[]>(() => {
    const voucherMap = new Map<string, {
      id: string;
      date: string;
      reference: string;
      memo: { ar: string; en: string };
      branchId?: string | undefined;
      branchName: { ar: string; en: string };
      status: "posted" | "approved" | "draft";
      lines: JournalEntry[];
      totalDebit: number;
      totalCredit: number;
      groupValues: Record<string, { debit: number; credit: number }>;
    }>();

    for (const entry of entries) {
      const vId = entry.id || "JV-UNKNOWN";
      let row = voucherMap.get(vId);

      if (!row) {
        const initGroups: Record<string, { debit: number; credit: number }> = {};
        for (const grp of AMERICAN_JOURNAL_ACCOUNT_GROUPS) {
          initGroups[grp.id] = { debit: 0, credit: 0 };
        }

        const bInfo = entry.branchId && BRANCH_NAMES_MAP[entry.branchId]
          ? BRANCH_NAMES_MAP[entry.branchId]
          : entry.branchName || { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis" };

        row = {
          id: vId,
          date: String(entry.date || "").slice(0, 10),
          reference: entry.reference || "—",
          memo: entry.memo || { ar: "قيد محاسبي معتمد", en: "Journal Voucher" },
          branchId: entry.branchId,
          branchName: { ar: bInfo.ar, en: bInfo.en },
          status: entry.status || "posted",
          lines: [],
          totalDebit: 0,
          totalCredit: 0,
          groupValues: initGroups,
        };
        voucherMap.set(vId, row);
      }

      row.lines.push(entry);
      const d = Number(entry.debit) || 0;
      const c = Number(entry.credit) || 0;
      row.totalDebit += d;
      row.totalCredit += c;

      const grpId = categorizeJournalLine(entry);
      if (row.groupValues[grpId]) {
        row.groupValues[grpId].debit += d;
        row.groupValues[grpId].credit += c;
      } else if (row.groupValues["other"]) {
        row.groupValues["other"].debit += d;
        row.groupValues["other"].credit += c;
      }
    }

    const list: AmericanJournalVoucherRow[] = [];
    for (const r of voucherMap.values()) {
      const isBalanced = Math.abs(r.totalDebit - r.totalCredit) < 0.05;
      list.push({
        ...r,
        isBalanced,
      });
    }

    // Sort chronologically descending
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [entries]);

  // Filter voucher rows
  const filteredRows = useMemo(() => {
    return allVoucherRows.filter((v) => {
      // Branch filter
      if (selectedBranch !== "all") {
        const matchesId = v.branchId === selectedBranch;
        const matchesName = (v.branchName.ar || "").includes(selectedBranch) || (v.branchName.en || "").toLowerCase().includes(selectedBranch.toLowerCase());
        if (!matchesId && !matchesName) return false;
      }

      // Date filter
      if (dateFrom && v.date < dateFrom) return false;
      if (dateTo && v.date > dateTo) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inId = v.id.toLowerCase().includes(q);
        const inRef = v.reference.toLowerCase().includes(q);
        const inMemoAr = (v.memo.ar || "").toLowerCase().includes(q);
        const inMemoEn = (v.memo.en || "").toLowerCase().includes(q);
        const inBranch = (v.branchName.ar || "").toLowerCase().includes(q) || (v.branchName.en || "").toLowerCase().includes(q);
        const inLines = v.lines.some((l) =>
          (l.account.ar || "").toLowerCase().includes(q) ||
          (l.account.en || "").toLowerCase().includes(q) ||
          (l.accountCode || "").toLowerCase().includes(q)
        );
        if (!inId && !inRef && !inMemoAr && !inMemoEn && !inBranch && !inLines) return false;
      }

      return true;
    });
  }, [allVoucherRows, selectedBranch, dateFrom, dateTo, searchQuery]);

  // Pagination for large journals
  const {
    paginatedItems: paginatedRows,
    currentPage,
    totalPages,
    setPage,
    pageSize,
  } = usePagination(filteredRows, 15);

  // Active account groups (which ones have non-zero activity or user enabled)
  const activeAccountGroups = useMemo(() => {
    return AMERICAN_JOURNAL_ACCOUNT_GROUPS.filter((g) => visibleGroupIds[g.id] !== false);
  }, [visibleGroupIds]);

  // Overall Totals & Balance Verification Calculations across filtered vouchers
  const summaryTotals = useMemo(() => {
    let grandDebit = 0;
    let grandCredit = 0;
    const groupSums: Record<string, { debit: number; credit: number }> = {};

    for (const g of AMERICAN_JOURNAL_ACCOUNT_GROUPS) {
      groupSums[g.id] = { debit: 0, credit: 0 };
    }

    for (const v of filteredRows) {
      grandDebit += v.totalDebit;
      grandCredit += v.totalCredit;

      for (const [gid, vals] of Object.entries(v.groupValues)) {
        if (groupSums[gid]) {
          groupSums[gid].debit += vals.debit;
          groupSums[gid].credit += vals.credit;
        }
      }
    }

    const difference = Math.abs(grandDebit - grandCredit);
    const isBalanced = difference < 0.05;

    // Count how many distinct accounts had activity
    const activeAccountsSet = new Set<string>();
    for (const v of filteredRows) {
      for (const l of v.lines) {
        if (l.debit > 0 || l.credit > 0) {
          activeAccountsSet.add(l.accountCode || l.account.ar);
        }
      }
    }

    return {
      grandDebit,
      grandCredit,
      difference,
      isBalanced,
      groupSums,
      vouchersCount: filteredRows.length,
      activeAccountsCount: activeAccountsSet.size,
    };
  }, [filteredRows]);

  // Distinct branch options for filter
  const branchFilterOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const v of allVoucherRows) {
      if (v.branchId) {
        set.set(v.branchId, pick(v.branchName));
      }
    }
    return Array.from(set.entries()).map(([id, label]) => ({ id, label }));
  }, [allVoucherRows, pick]);

  // ============================================================================
  // PROFESSIONAL MULTI-HEADER EXCEL EXPORT
  // ============================================================================
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Row 1: Company Title & Report Header
      const headerRows: any[][] = [
        ["حلويات الوزير — دفتر اليومية الأمريكية المجمع (American Multi-Column Journal Matrix)"],
        [
          `تاريخ الاستخراج: ${new Date().toLocaleDateString("ar-EG")} | الفترة: ${dateFrom || "البداية"} إلى ${dateTo || "حتى الآن"} | الفرع: ${selectedBranch === "all" ? "كافة الفروع" : selectedBranch}`,
        ],
        [], // blank separator
      ];

      // Row 4: Tier 1 Super Header (Merged account groups)
      const tier1Row: any[] = [
        "مسلسل",
        "رقم القيد",
        "التاريخ",
        "المرجع",
        "الفرع / مركز التكلفة",
        "البيان وشرح القيد",
        "إجمالي القيد",
        "", // placeholder for merged Debit/Credit
      ];

      // Row 5: Tier 2 Sub Header (Debit / Credit per account)
      const tier2Row: any[] = [
        "",
        "",
        "",
        "",
        "",
        "",
        "مدين (Debit)",
        "دائن (Credit)",
      ];

      // Merges configuration array
      const merges: XLSX.Range[] = [
        // Title merge across full width (approx 35 columns)
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 + activeAccountGroups.length * 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 + activeAccountGroups.length * 2 } },
        // Voucher info columns vertical merge (Row 3 to 4)
        { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, // م
        { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } }, // رقم القيد
        { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } }, // التاريخ
        { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } }, // المرجع
        { s: { r: 3, c: 4 }, e: { r: 4, c: 4 } }, // الفرع
        { s: { r: 3, c: 5 }, e: { r: 4, c: 5 } }, // البيان
        // Total Voucher horizontal merge
        { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
      ];

      // Add account groups headers & merges
      let colPointer = 8;
      for (const grp of activeAccountGroups) {
        tier1Row.push(grp.name.ar, "");
        tier2Row.push("مدين", "دائن");

        merges.push({
          s: { r: 3, c: colPointer },
          e: { r: 3, c: colPointer + 1 },
        });
        colPointer += 2;
      }

      headerRows.push(tier1Row);
      headerRows.push(tier2Row);

      // Data Rows
      const dataRows: any[][] = [];
      filteredRows.forEach((v, idx) => {
        const row: any[] = [
          idx + 1,
          v.id,
          v.date,
          v.reference,
          v.branchName.ar,
          v.memo.ar,
          v.totalDebit,
          v.totalCredit,
        ];

        for (const grp of activeAccountGroups) {
          const vals = v.groupValues[grp.id] || { debit: 0, credit: 0 };
          row.push(vals.debit > 0 ? vals.debit : 0);
          row.push(vals.credit > 0 ? vals.credit : 0);
        }

        dataRows.push(row);
      });

      // Grand Totals Row
      const totalsRow: any[] = [
        "المجموع",
        `عدد القيود: ${filteredRows.length}`,
        "—",
        "—",
        "—",
        summaryTotals.isBalanced ? "✅ اليومية متزنة تماماً" : `⚠️ غير متزنة (الفرق: ${summaryTotals.difference.toFixed(2)})`,
        summaryTotals.grandDebit,
        summaryTotals.grandCredit,
      ];

      for (const grp of activeAccountGroups) {
        const s = summaryTotals.groupSums[grp.id] || { debit: 0, credit: 0 };
        totalsRow.push(s.debit);
        totalsRow.push(s.credit);
      }

      // Net Balances Row (رصيد الحساب مدين أو دائن)
      const balancesRow: any[] = [
        "صافي الرصيد",
        "—",
        "—",
        "—",
        "—",
        "—",
        summaryTotals.grandDebit - summaryTotals.grandCredit > 0 ? summaryTotals.grandDebit - summaryTotals.grandCredit : 0,
        summaryTotals.grandCredit - summaryTotals.grandDebit > 0 ? summaryTotals.grandCredit - summaryTotals.grandDebit : 0,
      ];

      for (const grp of activeAccountGroups) {
        const s = summaryTotals.groupSums[grp.id] || { debit: 0, credit: 0 };
        const diff = s.debit - s.credit;
        balancesRow.push(diff > 0 ? diff : 0); // صافي رصيد مدين
        balancesRow.push(diff < 0 ? Math.abs(diff) : 0); // صافي رصيد دائن
      }

      const allSheetRows = [...headerRows, ...dataRows, totalsRow, balancesRow];
      const ws = XLSX.utils.aoa_to_sheet(allSheetRows);
      ws["!merges"] = merges;

      // Set column widths
      const colWidths: { wch: number }[] = [
        { wch: 6 },  // مسلسل
        { wch: 15 }, // رقم القيد
        { wch: 12 }, // التاريخ
        { wch: 16 }, // المرجع
        { wch: 22 }, // الفرع
        { wch: 38 }, // البيان
        { wch: 14 }, // إجمالي مدين
        { wch: 14 }, // إجمالي دائن
      ];
      for (let i = 0; i < activeAccountGroups.length * 2; i++) {
        colWidths.push({ wch: 13 });
      }
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "اليومية الأمريكية");
      const dateSuffix = new Date().toISOString().slice(0, 10);
      safeDownloadWorkbook(wb, `دفتر_اليومية_الأمريكية_المجمع_${dateSuffix}.xlsx`);
    } catch (e) {
      console.error("Failed to export American Journal Excel:", e);
    }
  };

  // Landscape Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP HEADER & ACCREDITATION BANNER */}
      <div className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/10 via-background to-secondary/30 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-xs">
                <BookOpen className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                  <span>{lang === "ar" ? "دفتر اليومية الأمريكية المجمع" : "American Multi-Column Journal Matrix"}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    <BadgeCheck className="size-3.5" />
                    <span>{lang === "ar" ? "دفتر قانوني معتمد" : "Statutory Journal"}</span>
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "ar"
                    ? "السجل المحاسبي القانوني المعتمد متعدد الأعمدة وفق معايير المحاسبة المصرية (EAS) والدولية (IFRS) — يربط القيود المركبة بالحسابات الرئيسية مع التحقق الآني من التوازن"
                    : "Official columnar general journal ledger linking composite vouchers to primary control accounts with live real-time debit/credit equilibrium audit."}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions (Catalog return, Excel, Print, Refresh) */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {onBackToCatalog && (
              <Btn variant="outline" size="sm" onClick={onBackToCatalog} className="text-xs">
                {lang === "ar" ? "← الرجوع للفهرس" : "← Catalog"}
              </Btn>
            )}

            <Btn
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{lang === "ar" ? "تصدير إكسيل محاسبي" : "Export Excel"}</span>
            </Btn>

            <Btn
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs gap-1.5 font-bold"
            >
              <Printer className="size-3.5 text-muted-foreground" />
              <span>{lang === "ar" ? "طباعة السجل (A3/A4)" : "Print Ledger"}</span>
            </Btn>

            <button
              type="button"
              onClick={() => fetchJournal()}
              className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={lang === "ar" ? "تحديث فوري من قاعدة البيانات" : "Refresh live entries"}
            >
              <RotateCcw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. STATUTORY BALANCE AUDIT & KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Balance Status (Crucial for Egyptian accounting) */}
        <div
          className={cn(
            "rounded-xl border p-4 flex items-center justify-between transition-all",
            summaryTotals.isBalanced
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
              : "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200"
          )}
        >
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {lang === "ar" ? "تدقيق التوازن المحاسبي" : "Balance Audit"}
            </div>
            <div className="text-base font-black flex items-center gap-1.5">
              {summaryTotals.isBalanced ? (
                <>
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-300">
                    {lang === "ar" ? "اليومية متزنة تماماً" : "Fully Balanced"}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span className="text-red-700 dark:text-red-300">
                    {lang === "ar" ? `فرق: ${money(summaryTotals.difference)}` : `Diff: ${money(summaryTotals.difference)}`}
                  </span>
                </>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {summaryTotals.isBalanced
                ? lang === "ar" ? "المدين = الدائن بدون أي انحراف" : "Σ Debits === Σ Credits"
                : lang === "ar" ? "يوجد خلل في أحد أطراف القيود" : "Voucher imbalance detected"}
            </div>
          </div>
          <div
            className={cn(
              "p-2.5 rounded-xl shrink-0",
              summaryTotals.isBalanced ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-500/20 text-red-700 dark:text-red-300"
            )}
          >
            <Scale className="size-5" />
          </div>
        </div>

        {/* KPI 2: Total Debits */}
        <div className="rounded-xl border border-border/80 bg-card p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-muted-foreground">
              {lang === "ar" ? "إجمالي حركات المدين" : "Total Debits (Σ)"}
            </div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {money(summaryTotals.grandDebit)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {lang === "ar" ? "مجموع قيود الجانب المدين" : "Sum of all debit lines"}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <DollarSign className="size-5" />
          </div>
        </div>

        {/* KPI 3: Total Credits */}
        <div className="rounded-xl border border-border/80 bg-card p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-muted-foreground">
              {lang === "ar" ? "إجمالي حركات الدائن" : "Total Credits (Σ)"}
            </div>
            <div className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
              {money(summaryTotals.grandCredit)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {lang === "ar" ? "مجموع قيود الجانب الدائن" : "Sum of all credit lines"}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <DollarSign className="size-5" />
          </div>
        </div>

        {/* KPI 4: Vouchers Count */}
        <div className="rounded-xl border border-border/80 bg-card p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-muted-foreground">
              {lang === "ar" ? "عدد قيود اليومية" : "Vouchers Count"}
            </div>
            <div className="text-lg font-black text-foreground font-mono tracking-tight">
              {n(summaryTotals.vouchersCount)} {lang === "ar" ? "سند قيد" : "Vouchers"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {lang === "ar" ? "معتمدة ومرحلة للأستاذ" : "Posted transactions"}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Hash className="size-5" />
          </div>
        </div>

        {/* KPI 5: Active Accounts Spread */}
        <div className="rounded-xl border border-border/80 bg-card p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-muted-foreground">
              {lang === "ar" ? "الحسابات النشطة" : "Active Accounts"}
            </div>
            <div className="text-lg font-black text-foreground font-mono tracking-tight">
              {n(summaryTotals.activeAccountsCount)} {lang === "ar" ? "حساب" : "Accounts"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {lang === "ar" ? `${activeAccountGroups.length} عمود رئيسي مجمع` : `${activeAccountGroups.length} Active Columns`}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <ArrowRightLeft className="size-5" />
          </div>
        </div>
      </div>

      {/* 3. FILTERS & CONTROLS TOOLBAR */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "ar" ? "بحث برقم القيد، المرجع، البيان، الحساب..." : "Search voucher #, ref, memo, account..."}
              className="w-full h-9 ps-9 pe-3 rounded-lg border border-border bg-background text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground shrink-0">
              {lang === "ar" ? "الفرع:" : "Branch:"}
            </span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">{lang === "ar" ? "جميع الفروع والمنشآت" : "All Branches"}</option>
              {branchFilterOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Column Toggles Dropdown Trigger */}
          <div className="relative">
            <Btn
              variant="outline"
              size="sm"
              onClick={() => setShowColumnToggles(!showColumnToggles)}
              className="text-xs gap-1.5 font-bold"
            >
              <SlidersHorizontal className="size-3.5 text-muted-foreground" />
              <span>{lang === "ar" ? "تخصيص أعمدة الحسابات" : "Column Matrix"}</span>
              <span className="ms-1 px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px]">
                {activeAccountGroups.length}
              </span>
            </Btn>

            {showColumnToggles && (
              <div className="absolute end-0 top-full mt-2 w-72 rounded-xl border border-border bg-popover p-3 shadow-xl z-30 space-y-2 animate-in fade-in-50 zoom-in-95">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-bold text-foreground">
                    {lang === "ar" ? "أعمدة الحسابات المعروضة" : "Visible Account Groups"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allOn: Record<string, boolean> = {};
                      for (const g of AMERICAN_JOURNAL_ACCOUNT_GROUPS) allOn[g.id] = true;
                      setVisibleGroupIds(allOn);
                    }}
                    className="text-[11px] text-primary hover:underline font-bold"
                  >
                    {lang === "ar" ? "إظهار الكل" : "Show All"}
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pe-1">
                  {AMERICAN_JOURNAL_ACCOUNT_GROUPS.map((grp) => (
                    <label
                      key={grp.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/60 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={visibleGroupIds[grp.id] !== false}
                        onChange={(e) =>
                          setVisibleGroupIds((prev) => ({
                            ...prev,
                            [grp.id]: e.target.checked,
                          }))
                        }
                        className="rounded border-border text-primary focus:ring-primary size-3.5"
                      />
                      <span className="flex-1 font-medium">{pick(grp.name)}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {grp.codePrefixes[0] ? `${grp.codePrefixes[0]}*` : "—"}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="border-t border-border/60 pt-2 flex justify-end">
                  <Btn size="sm" variant="solid" onClick={() => setShowColumnToggles(false)} className="text-xs h-7">
                    {lang === "ar" ? "تطبيق" : "Apply"}
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Date Filter Presets Row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
          <span className="text-xs font-bold text-muted-foreground me-1 shrink-0 flex items-center gap-1">
            <Calendar className="size-3.5" />
            <span>{lang === "ar" ? "الفترة:" : "Period:"}</span>
          </span>

          {[
            { id: "all", label: { ar: "الكل", en: "All" } },
            { id: "today", label: { ar: "اليوم", en: "Today" } },
            { id: "yesterday", label: { ar: "أمس", en: "Yesterday" } },
            { id: "week", label: { ar: "آخر 7 أيام", en: "Last 7D" } },
            { id: "month", label: { ar: "هذا الشهر", en: "This Month" } },
            { id: "quarter", label: { ar: "هذا الربع", en: "Quarter" } },
            { id: "year", label: { ar: "هذا العام", en: "Year" } },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset.id as any)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors",
                datePreset === preset.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {pick(preset.label)}
            </button>
          ))}

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-1 ms-auto flex-wrap">
            <span className="text-[11px] text-muted-foreground font-bold">{lang === "ar" ? "من:" : "From:"}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDatePreset("custom");
                setDateFrom(e.target.value);
              }}
              className="h-7 rounded-md border border-border bg-background px-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[11px] text-muted-foreground font-bold">{lang === "ar" ? "إلى:" : "To:"}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDatePreset("custom");
                setDateTo(e.target.value);
              }}
              className="h-7 rounded-md border border-border bg-background px-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDatePreset("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground underline px-1"
              >
                {lang === "ar" ? "إلغاء" : "Clear"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. THE AMERICAN JOURNAL MULTI-COLUMN MATRIX TABLE */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px] relative">
          <table className="w-full text-xs border-collapse text-start">
            {/* TIER 1 & TIER 2 TABLE HEADERS */}
            <thead className="bg-muted/80 text-foreground sticky top-0 z-20 backdrop-blur-md shadow-xs">
              {/* TIER 1: Super Header Row (Account Group Titles & Voucher Info) */}
              <tr className="border-b border-border/80 text-[11px] font-bold">
                {/* Fixed Voucher Info Columns */}
                <th rowSpan={2} className="py-2.5 px-3 text-center border-e border-border/60 w-12 bg-muted/90">
                  {lang === "ar" ? "م" : "#"}
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-start border-e border-border/60 min-w-[120px] bg-muted/90">
                  {lang === "ar" ? "رقم القيد" : "Voucher #"}
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-start border-e border-border/60 min-w-[100px] bg-muted/90">
                  {lang === "ar" ? "التاريخ" : "Date"}
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-start border-e border-border/60 min-w-[120px] bg-muted/90">
                  {lang === "ar" ? "المرجع" : "Ref"}
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-start border-e border-border/60 min-w-[150px] bg-muted/90">
                  {lang === "ar" ? "الفرع / المركز" : "Cost Center"}
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-start border-e border-border/60 min-w-[220px] bg-muted/90">
                  {lang === "ar" ? "البيان وشرح القيد" : "Memo / Description"}
                </th>

                {/* Total Voucher Debits & Credits (Merged over 2 sub-columns) */}
                <th colSpan={2} className="py-2 px-3 text-center border-e border-border/80 bg-primary/10 text-primary font-black">
                  {lang === "ar" ? "إجمالي القيد (Voucher)" : "Total Voucher"}
                </th>

                {/* Account Column Groups (Merged over Debit/Credit) */}
                {activeAccountGroups.map((grp) => (
                  <th
                    key={grp.id}
                    colSpan={2}
                    className={cn(
                      "py-2 px-3 text-center border-e border-border/60 font-black tracking-tight",
                      grp.badgeColor
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{pick(grp.shortName)}</span>
                      {grp.codePrefixes[0] && (
                        <span className="text-[10px] font-mono opacity-70">
                          ({grp.codePrefixes[0]})
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>

              {/* TIER 2: Sub Header Row (Debit / Credit for Totals & each Account Group) */}
              <tr className="border-b border-border text-[10px] font-bold text-muted-foreground bg-muted">
                {/* Total Voucher Sub-headers */}
                <th className="py-1.5 px-2.5 text-end border-e border-border/60 text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/5 min-w-[95px]">
                  {lang === "ar" ? "مدين Debit" : "Debit"}
                </th>
                <th className="py-1.5 px-2.5 text-end border-e border-border/80 text-blue-600 dark:text-blue-400 font-mono bg-blue-500/5 min-w-[95px]">
                  {lang === "ar" ? "دائن Credit" : "Credit"}
                </th>

                {/* Account Groups Debit/Credit Sub-headers */}
                {activeAccountGroups.map((grp) => (
                  <th key={`${grp.id}-sub`} colSpan={2} className="p-0 border-e border-border/60">
                    <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border/60">
                      <div className="py-1.5 px-2 text-end text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/5 min-w-[85px]">
                        {lang === "ar" ? "مدين" : "Dr"}
                      </div>
                      <div className="py-1.5 px-2 text-end text-blue-600 dark:text-blue-400 font-mono bg-blue-500/5 min-w-[85px]">
                        {lang === "ar" ? "دائن" : "Cr"}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* TABLE BODY (VOUCHER ROWS) */}
            <tbody className="divide-y divide-border/50 text-foreground font-medium">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8 + activeAccountGroups.length * 2}
                    className="py-16 text-center text-muted-foreground"
                  >
                    <BookOpen className="size-8 mx-auto mb-2 opacity-40" />
                    <div className="text-sm font-bold">
                      {lang === "ar" ? "لا توجد قيود مطابقة لمعايير البحث" : "No journal vouchers matching filters"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {lang === "ar" ? "يرجى تغيير نطاق التاريخ أو الفرع أو كلمة البحث" : "Adjust your date range or search terms"}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((v, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVoucher(v)}
                      className={cn(
                        "hover:bg-muted/40 cursor-pointer transition-colors group",
                        !v.isBalanced && "bg-red-500/5 hover:bg-red-500/10"
                      )}
                    >
                      {/* 1. م (Index) */}
                      <td className="py-2.5 px-3 text-center border-e border-border/40 text-muted-foreground font-mono text-[11px]">
                        {globalIdx}
                      </td>

                      {/* 2. رقم القيد */}
                      <td className="py-2.5 px-3 border-e border-border/40 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                            {v.id}
                          </span>
                          {!v.isBalanced && (
                            <span title={lang === "ar" ? "قيد غير متزن!" : "Unbalanced voucher!"}>
                              <AlertTriangle className="size-3 text-red-500 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. التاريخ */}
                      <td className="py-2.5 px-3 border-e border-border/40 whitespace-nowrap font-mono text-muted-foreground">
                        {v.date}
                      </td>

                      {/* 4. المرجع */}
                      <td className="py-2.5 px-3 border-e border-border/40 whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {v.reference}
                      </td>

                      {/* 5. الفرع */}
                      <td className="py-2.5 px-3 border-e border-border/40 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[11px] text-foreground font-medium">
                          <Building2 className="size-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[140px]">{pick(v.branchName)}</span>
                        </span>
                      </td>

                      {/* 6. البيان */}
                      <td className="py-2.5 px-3 border-e border-border/40 max-w-[240px]">
                        <div className="truncate text-foreground text-xs" title={pick(v.memo)}>
                          {pick(v.memo)}
                        </div>
                      </td>

                      {/* 7. إجمالي القيد: مدين */}
                      <td className="py-2.5 px-2.5 text-end border-e border-border/40 font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 whitespace-nowrap">
                        {v.totalDebit > 0 ? money(v.totalDebit) : "—"}
                      </td>

                      {/* 8. إجمالي القيد: دائن */}
                      <td className="py-2.5 px-2.5 text-end border-e border-border/70 font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/5 whitespace-nowrap">
                        {v.totalCredit > 0 ? money(v.totalCredit) : "—"}
                      </td>

                      {/* 9. Account Groups Multi-Columns (Debit & Credit per group) */}
                      {activeAccountGroups.map((grp) => {
                        const vals = v.groupValues[grp.id] || { debit: 0, credit: 0 };
                        return (
                          <td key={grp.id} colSpan={2} className="p-0 border-e border-border/40">
                            <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border/40 h-full">
                              {/* Debit */}
                              <div
                                className={cn(
                                  "py-2.5 px-2 text-end font-mono whitespace-nowrap text-xs",
                                  vals.debit > 0
                                    ? "font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                                    : "text-muted-foreground/40"
                                )}
                              >
                                {vals.debit > 0 ? money(vals.debit) : "—"}
                              </div>
                              {/* Credit */}
                              <div
                                className={cn(
                                  "py-2.5 px-2 text-end font-mono whitespace-nowrap text-xs",
                                  vals.credit > 0
                                    ? "font-bold text-blue-600 dark:text-blue-400 bg-blue-500/5"
                                    : "text-muted-foreground/40"
                                )}
                              >
                                {vals.credit > 0 ? money(vals.credit) : "—"}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* STICKY BOTTOM TOTALS & BALANCES FOOTER */}
            <tfoot className="bg-muted font-bold sticky bottom-0 z-20 border-t-2 border-border/80 shadow-md">
              {/* Row 1: Grand Total Sums (المجاميع الإجمالية) */}
              <tr className="border-b border-border/60 text-xs">
                <td colSpan={6} className="py-3 px-3 text-start border-e border-border/60 text-foreground font-black">
                  <div className="flex items-center justify-between">
                    <span>{lang === "ar" ? "المجاميع الإجمالية لليومية (Total Movements)" : "Grand Total Movements"}</span>
                    <span className="text-[11px] font-mono text-muted-foreground font-normal">
                      ({filteredRows.length} {lang === "ar" ? "قيد" : "Vouchers"})
                    </span>
                  </div>
                </td>

                {/* Grand Total Debit */}
                <td className="py-3 px-2.5 text-end border-e border-border/60 font-mono text-sm font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 whitespace-nowrap">
                  {money(summaryTotals.grandDebit)}
                </td>

                {/* Grand Total Credit */}
                <td className="py-3 px-2.5 text-end border-e border-border/80 font-mono text-sm font-black text-blue-700 dark:text-blue-400 bg-blue-500/10 whitespace-nowrap">
                  {money(summaryTotals.grandCredit)}
                </td>

                {/* Account Column Totals */}
                {activeAccountGroups.map((grp) => {
                  const s = summaryTotals.groupSums[grp.id] || { debit: 0, credit: 0 };
                  return (
                    <td key={`tot-${grp.id}`} colSpan={2} className="p-0 border-e border-border/60">
                      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border/60">
                        <div className="py-3 px-2 text-end font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 whitespace-nowrap">
                          {s.debit > 0 ? money(s.debit) : "—"}
                        </div>
                        <div className="py-3 px-2 text-end font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-500/10 whitespace-nowrap">
                          {s.credit > 0 ? money(s.credit) : "—"}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 2: Net Closing Balances (صافي الأرصدة: مدين / دائن) */}
              <tr className="text-[11px] bg-secondary/50">
                <td colSpan={6} className="py-2.5 px-3 text-start border-e border-border/60 text-muted-foreground font-bold">
                  <div className="flex items-center gap-2">
                    <span>{lang === "ar" ? "صافي الرصيد الختامي (Net Account Balance)" : "Net Closing Balance"}</span>
                    {summaryTotals.isBalanced && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-500/10">
                        {lang === "ar" ? "متزنة بالكامل ✓" : "Audit Verified ✓"}
                      </span>
                    )}
                  </div>
                </td>

                {/* Net Total Difference */}
                <td className="py-2.5 px-2.5 text-end border-e border-border/60 font-mono text-xs font-bold text-foreground whitespace-nowrap">
                  {summaryTotals.grandDebit - summaryTotals.grandCredit > 0
                    ? money(summaryTotals.grandDebit - summaryTotals.grandCredit)
                    : "—"}
                </td>
                <td className="py-2.5 px-2.5 text-end border-e border-border/80 font-mono text-xs font-bold text-foreground whitespace-nowrap">
                  {summaryTotals.grandCredit - summaryTotals.grandDebit > 0
                    ? money(summaryTotals.grandCredit - summaryTotals.grandDebit)
                    : "—"}
                </td>

                {/* Account Column Net Balances */}
                {activeAccountGroups.map((grp) => {
                  const s = summaryTotals.groupSums[grp.id] || { debit: 0, credit: 0 };
                  const diff = s.debit - s.credit;
                  return (
                    <td key={`bal-${grp.id}`} colSpan={2} className="p-0 border-e border-border/60">
                      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border/60">
                        <div className="py-2.5 px-2 text-end font-mono font-bold text-foreground whitespace-nowrap">
                          {diff > 0 ? money(diff) : "—"}
                        </div>
                        <div className="py-2.5 px-2 text-end font-mono font-bold text-foreground whitespace-nowrap">
                          {diff < 0 ? money(Math.abs(diff)) : "—"}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="border-t border-border/80 px-4 py-3 bg-card">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filteredRows.length}
            pageSize={pageSize}
          />
        </div>
      </div>

      {/* 5. VOUCHER DRILLDOWN DETAILS MODAL */}
      <Dialog open={Boolean(selectedVoucher)} onOpenChange={(open) => !open && setSelectedVoucher(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedVoucher && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between text-base font-black">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-5 text-primary" />
                    <span>{lang === "ar" ? `تفاصيل سند القيد المحاسبي: ${selectedVoucher.id}` : `Voucher Details: ${selectedVoucher.id}`}</span>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold px-2.5 py-0.5 rounded-full border",
                      selectedVoucher.isBalanced
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                    )}
                  >
                    {selectedVoucher.isBalanced
                      ? lang === "ar" ? "قيد متزن تماماً" : "Balanced"
                      : lang === "ar" ? "قيد غير متزن!" : "Imbalanced"}
                  </span>
                </DialogTitle>
              </DialogHeader>

              {/* Voucher Meta Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border/80 text-xs">
                <div>
                  <div className="text-muted-foreground text-[11px]">{lang === "ar" ? "التاريخ" : "Date"}</div>
                  <div className="font-mono font-bold text-foreground mt-0.5">{selectedVoucher.date}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">{lang === "ar" ? "السند المرجعي" : "Reference"}</div>
                  <div className="font-mono font-bold text-foreground mt-0.5">{selectedVoucher.reference}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">{lang === "ar" ? "مركز التكلفة / الفرع" : "Cost Center"}</div>
                  <div className="font-bold text-foreground mt-0.5 truncate">{pick(selectedVoucher.branchName)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">{lang === "ar" ? "الحالة" : "Status"}</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {lang === "ar" ? "معتمد ومرحل للأستاذ" : "Posted & Approved"}
                  </div>
                </div>
              </div>

              {/* Voucher Memo */}
              <div className="p-3 rounded-xl bg-background border border-border/80">
                <div className="text-[11px] font-bold text-muted-foreground mb-1">{lang === "ar" ? "البيان والشرح التفصيلي:" : "Voucher Narrative:"}</div>
                <div className="text-xs text-foreground font-medium leading-relaxed">
                  {pick(selectedVoucher.memo)}
                </div>
              </div>

              {/* Voucher Line Items Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="p-2.5 bg-muted/60 border-b border-border text-xs font-bold text-foreground flex items-center justify-between">
                  <span>{lang === "ar" ? "أطراف القيد المحاسبي (طرف مدين / طرف دائن)" : "Journal Entry Line Items"}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {selectedVoucher.lines.length} {lang === "ar" ? "حسابات" : "Lines"}
                  </span>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-muted text-[11px] font-bold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 px-3 text-start">{lang === "ar" ? "كود الحساب" : "Account Code"}</th>
                      <th className="py-2 px-3 text-start">{lang === "ar" ? "اسم الحساب المالي" : "Account Name"}</th>
                      <th className="py-2 px-3 text-start">{lang === "ar" ? "المجموعة" : "Group"}</th>
                      <th className="py-2 px-3 text-end text-emerald-600 dark:text-emerald-400">{lang === "ar" ? "مدين" : "Debit"}</th>
                      <th className="py-2 px-3 text-end text-blue-600 dark:text-blue-400">{lang === "ar" ? "دائن" : "Credit"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {selectedVoucher.lines.map((l, i) => {
                      const grpId = categorizeJournalLine(l);
                      const grpObj = AMERICAN_JOURNAL_ACCOUNT_GROUPS.find((g) => g.id === grpId);
                      return (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">{l.accountCode || "—"}</td>
                          <td className="py-2.5 px-3 font-bold text-foreground">{pick(l.account)}</td>
                          <td className="py-2.5 px-3">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", grpObj?.badgeColor || "bg-muted text-muted-foreground")}>
                              {grpObj ? pick(grpObj.shortName) : "أخرى"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {l.debit > 0 ? money(l.debit) : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono font-bold text-blue-600 dark:text-blue-400">
                            {l.credit > 0 ? money(l.credit) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted font-bold text-xs border-t border-border">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-start font-black">
                        {lang === "ar" ? "إجمالي القيد" : "Total Voucher"}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-black text-emerald-700 dark:text-emerald-400">
                        {money(selectedVoucher.totalDebit)}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-black text-blue-700 dark:text-blue-400">
                        {money(selectedVoucher.totalCredit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <Btn variant="outline" size="sm" onClick={() => setSelectedVoucher(null)} className="text-xs">
                  {lang === "ar" ? "إغلاق النافذة" : "Close"}
                </Btn>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
