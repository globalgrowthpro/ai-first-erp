import { useState, useMemo } from "react";
import {
  Download,
  Printer,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  RotateCcw,
  Check,
  FileSpreadsheet,
  Calendar,
  Layers,
  BarChart2,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Tag,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { Btn, StatusPill } from "@/components/kit";
import {
  type ReportColumn,
  type ReportSummaryCard,
  type ReportChartType,
  exportReportToExcel,
  exportReportToCsv,
  type BiText,
} from "@/lib/reports-store";
import { toast } from "sonner";

interface ReportTableViewProps {
  reportTitle: BiText;
  reportDescription?: BiText | undefined;
  categoryLabel?: BiText | undefined;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  summaryCards?: ReportSummaryCard[] | undefined;
  chartType?: ReportChartType | undefined;
  tags?: string[] | undefined;
  groupBy?: string | undefined;
  onRefresh?: (() => void) | undefined;
  extraHeaderActions?: React.ReactNode | undefined;
}

const CHART_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#6366f1",
];

export function ReportTableView({
  reportTitle,
  reportDescription,
  categoryLabel,
  columns,
  rows,
  summaryCards = [],
  chartType: initialChartType = "table",
  tags = [],
  groupBy,
  onRefresh,
  extraHeaderActions,
}: ReportTableViewProps) {
  const { lang, money, n } = useI18n();

  // Active Presentation View (allows user to switch between Table, Bar Chart, Donut Breakdown)
  const [activeView, setActiveView] = useState<ReportChartType>(initialChartType);

  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Column Visibility State
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(
    () => new Set(columns.map((c) => c.key)),
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Dynamic Filtering by Search Query
  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((row) => {
        return Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA ?? "");
        const strB = String(valB ?? "");
        return sortDirection === "asc"
          ? strA.localeCompare(strB, lang === "ar" ? "ar" : "en")
          : strB.localeCompare(strA, lang === "ar" ? "ar" : "en");
      });
    }

    return result;
  }, [rows, searchTerm, sortKey, sortDirection, lang]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Handle Sort Toggle
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection("desc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Toggle column visibility
  const toggleColumn = (key: string) => {
    setVisibleColumnKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Handle Excel Export
  const handleExportExcel = () => {
    const activeCols = columns.filter((c) => visibleColumnKeys.has(c.key));
    const ok = exportReportToExcel({
      reportTitle,
      columns: activeCols,
      rows: filteredRows,
      summaryCards,
      lang: lang as "ar" | "en",
    });

    if (ok) {
      toast.success(
        lang === "ar"
          ? `تم تصدير تقرير "${reportTitle.ar}" بنجاح!`
          : `Report "${reportTitle.en}" exported to Excel successfully!`,
      );
    } else {
      toast.error(lang === "ar" ? "حدث خطأ أثناء التصدير" : "Export failed");
    }
  };

  // Handle CSV Export
  const handleExportCsv = () => {
    const activeCols = columns.filter((c) => visibleColumnKeys.has(c.key));
    const ok = exportReportToCsv({
      reportTitle,
      columns: activeCols,
      rows: filteredRows,
      lang: lang as "ar" | "en",
    });

    if (ok) {
      toast.success(
        lang === "ar"
          ? `تم تصدير ملف CSV لتقرير "${reportTitle.ar}"!`
          : `Report "${reportTitle.en}" exported to CSV successfully!`,
      );
    } else {
      toast.error(lang === "ar" ? "حدث خطأ أثناء التصدير" : "Export failed");
    }
  };

  // Handle Browser Print
  const handlePrint = () => {
    window.print();
  };

  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleColumnKeys.has(c.key)),
    [columns, visibleColumnKeys],
  );

  return (
    <div className="space-y-6">
      {/* 1. Report Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {categoryLabel && (
              <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {lang === "ar" ? categoryLabel.ar : categoryLabel.en}
              </span>
            )}
            {groupBy && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-foreground">
                {lang === "ar" ? `مجمع حسب: ${groupBy}` : `Grouped by: ${groupBy}`}
              </span>
            )}
            <h2 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-foreground">
              {lang === "ar" ? reportTitle.ar : reportTitle.en}
            </h2>
          </div>

          {reportDescription && (
            <p className="mt-1 text-xs md:text-sm text-muted-foreground leading-relaxed">
              {lang === "ar" ? reportDescription.ar : reportDescription.en}
            </p>
          )}

          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className="rounded-md bg-secondary/80 border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {extraHeaderActions}

          {/* View Mode Switcher (Table / Bar Chart / Pie Chart) */}
          <div className="flex items-center rounded-xl border border-border bg-secondary/40 p-1">
            <button
              type="button"
              onClick={() => setActiveView("table")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                activeView === "table" || activeView === "kpi"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={lang === "ar" ? "جدول تفاعلي" : "Table View"}
            >
              <TableIcon className="size-3.5" />
              <span className="hidden sm:inline">{lang === "ar" ? "جدول" : "Table"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("bar")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                activeView === "bar"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={lang === "ar" ? "مخطط أعمدة بيانية" : "Bar Chart"}
            >
              <BarChart2 className="size-3.5" />
              <span className="hidden sm:inline">{lang === "ar" ? "أعمدة" : "Bar"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("pie")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                activeView === "pie"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={lang === "ar" ? "مخطط دائري نسبي" : "Donut Chart"}
            >
              <PieChartIcon className="size-3.5" />
              <span className="hidden sm:inline">{lang === "ar" ? "دائري" : "Pie"}</span>
            </button>
          </div>

          <Btn
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 font-bold"
          >
            <FileSpreadsheet className="size-4 text-emerald-600" />
            <span className="hidden sm:inline">{lang === "ar" ? "Excel (.xlsx)" : "Excel (.xlsx)"}</span>
          </Btn>

          <Btn
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-foreground hover:bg-secondary font-bold"
            title={lang === "ar" ? "تصدير ملف CSV" : "Export CSV"}
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Btn>

          <Btn
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-foreground hover:bg-secondary hidden sm:inline-flex"
            title={lang === "ar" ? "طباعة التقرير" : "Print"}
          >
            <Printer className="size-4" />
          </Btn>

          {onRefresh && (
            <Btn
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="text-muted-foreground hover:text-foreground"
              title={lang === "ar" ? "تحديث البيانات" : "Refresh"}
            >
              <RotateCcw className="size-4" />
            </Btn>
          )}
        </div>
      </div>

      {/* 2. KPI Summary Cards Bar */}
      {summaryCards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const toneBorder =
              card.color === "brand"
                ? "border-brand/40 bg-brand/5"
                : card.color === "success"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : card.color === "crimson"
                    ? "border-destructive/30 bg-destructive/5"
                    : card.color === "gold"
                      ? "border-gold/40 bg-gold/5"
                      : "border-border bg-card";

            const toneText =
              card.color === "brand"
                ? "text-brand"
                : card.color === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : card.color === "crimson"
                    ? "text-destructive"
                    : card.color === "gold"
                      ? "text-gold-foreground font-extrabold"
                      : "text-foreground";

            return (
              <div
                key={card.id}
                className={`rounded-xl border p-4 shadow-sm transition-all ${toneBorder}`}
              >
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {lang === "ar" ? card.label.ar : card.label.en}
                </div>
                <div className={`mt-1.5 text-2xl font-black ${toneText}`}>
                  {typeof card.value === "number" ? money(card.value) : card.value}
                </div>
                {card.subtext && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {lang === "ar" ? card.subtext.ar : card.subtext.en}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Visual Chart Rendering (if Bar or Pie view is selected) */}
      {activeView === "bar" && filteredRows.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <h3 className="text-sm font-black uppercase text-foreground tracking-tight">
              {lang === "ar" ? "مخطط الأعمدة البيانية التحليلي" : "Bar Chart Analytical Overview"}
            </h3>
            <span className="text-xs text-muted-foreground">
              {lang === "ar" ? "أعلى 12 قيمة معروضة" : "Top 12 values"}
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredRows.slice(0, 12).map((r) => {
                  const xKey = groupBy || visibleColumns[0]?.key || "id";
                  const yKey =
                    visibleColumns.find((c) => c.type === "currency" || c.type === "number")?.key ||
                    "_recordCount";
                  return {
                    name: String(r[xKey] ?? "—").slice(0, 18),
                    value: Number(r[yKey]) || 0,
                  };
                })}
              >
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeView === "pie" && filteredRows.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <h3 className="text-sm font-black uppercase text-foreground tracking-tight">
              {lang === "ar" ? "مخطط التوزيع الدائري والنسبي" : "Donut / Share Breakdown"}
            </h3>
            <span className="text-xs text-muted-foreground">
              {lang === "ar" ? "توزيع الحصص والنسب" : "Proportional share"}
            </span>
          </div>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredRows.slice(0, 8).map((r) => {
                    const labelKey = groupBy || visibleColumns[0]?.key || "id";
                    const numKey =
                      visibleColumns.find((c) => c.type === "currency" || c.type === "number")?.key ||
                      "_recordCount";
                    return {
                      name: String(r[labelKey] ?? "—"),
                      value: Number(r[numKey]) || 1,
                    };
                  })}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {filteredRows.slice(0, 8).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Filter Toolbar & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute right-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              lang === "ar"
                ? "بحث فوري في كل بيانات وسطور التقرير..."
                : "Instant search within report records..."
            }
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-3 pr-9 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute left-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Column Visibility Dropdown */}
          <div className="relative">
            <Btn
              variant="outline"
              size="sm"
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="text-xs font-semibold gap-1.5"
            >
              <SlidersHorizontal className="size-3.5" />
              {lang === "ar" ? "تخصيص الأعمدة" : "Columns"}
              <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.2 text-[10px] font-bold">
                {visibleColumns.length}/{columns.length}
              </span>
            </Btn>

            {showColumnPicker && (
              <div className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 z-50 w-56 rounded-xl border border-border bg-popover p-2.5 shadow-xl">
                <div className="mb-2 flex items-center justify-between border-b border-border pb-1.5 text-xs font-bold text-foreground">
                  <span>{lang === "ar" ? "إظهار / إخفاء الأعمدة" : "Toggle Columns"}</span>
                  <button
                    onClick={() => setShowColumnPicker(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {columns.map((col) => {
                    const isChecked = visibleColumnKeys.has(col.key);
                    return (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => toggleColumn(col.key)}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                          isChecked
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        <span>{lang === "ar" ? col.label.ar : col.label.en}</span>
                        {isChecked && <Check className="size-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Record Count Badge */}
          <div className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground">
            {lang === "ar"
              ? `${n(filteredRows.length)} سجل`
              : `${n(filteredRows.length)} Records`}
          </div>
        </div>
      </div>

      {/* 5. Main Data Table with Sticky Header and Footer Totals */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs md:text-sm">
            <thead className="border-b border-border bg-secondary/60 text-muted-foreground select-none">
              <tr>
                <th className="py-3 px-4 font-bold text-muted-foreground/70 w-12 text-center">#</th>
                {visibleColumns.map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`cursor-pointer py-3 px-4 font-bold tracking-wide transition-colors hover:bg-secondary hover:text-foreground ${
                        col.align === "center" ? "text-center" : col.align === "left" ? "text-left" : "text-right"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 ${
                          col.align === "center"
                            ? "justify-center"
                            : col.align === "left"
                              ? "justify-start"
                              : "justify-start"
                        }`}
                      >
                        <span>{lang === "ar" ? col.label.ar : col.label.en}</span>
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="size-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="size-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 1}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
                      <Search className="size-5 text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-sm font-bold text-foreground">
                      {lang === "ar" ? "لا توجد سجلات مطابقة" : "No records found"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lang === "ar"
                        ? "جرب تعديل شروط البحث أو مسح الفلاتر المطبقة"
                        : "Try adjusting search terms or clearing filters"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={row["id"] || row["sku"] || row["code"] || row["orderNumber"] || idx}
                      className="transition-colors hover:bg-secondary/40 font-medium"
                    >
                      <td className="py-3 px-4 text-center text-xs text-muted-foreground/70 font-mono">
                        {rowNumber}
                      </td>

                      {visibleColumns.map((col) => {
                        const rawVal = row[col.key];

                        return (
                          <td
                            key={col.key}
                            className={`py-3 px-4 text-foreground ${
                              col.align === "center"
                                ? "text-center"
                                : col.align === "left"
                                  ? "text-left"
                                  : "text-right"
                            }`}
                          >
                            {renderCellContent(col, rawVal, money, lang)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Summary Totals */}
            {filteredRows.length > 0 && (
              <tfoot className="border-t-2 border-border bg-secondary/80 font-black text-foreground">
                <tr>
                  <td className="py-3 px-4 text-center font-bold text-muted-foreground">Σ</td>
                  {visibleColumns.map((col) => {
                    const isNumeric = col.type === "currency" || col.type === "number";
                    const total = isNumeric
                      ? filteredRows.reduce((acc, r) => acc + (Number(r[col.key]) || 0), 0)
                      : null;

                    return (
                      <td
                        key={col.key}
                        className={`py-3 px-4 ${
                          col.align === "center"
                            ? "text-center"
                            : col.align === "left"
                              ? "text-left"
                              : "text-right"
                        }`}
                      >
                        {total !== null ? (
                          col.type === "currency" ? (
                            <span className="font-mono">{money(total)}</span>
                          ) : (
                            <span className="font-mono">{n(total)}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground/40 font-normal">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* 6. Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs bg-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{lang === "ar" ? "عرض:" : "Show:"}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded border border-border bg-background px-2 py-1 text-xs font-bold text-foreground focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              {lang === "ar"
                ? `من إجمالي ${n(filteredRows.length)} سجل`
                : `of ${n(filteredRows.length)} entries`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Btn
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-xs px-2.5 py-1 disabled:opacity-40"
            >
              {lang === "ar" ? "السابق" : "Previous"}
            </Btn>

            <span className="px-2 text-xs font-bold text-foreground">
              {currentPage} / {totalPages}
            </span>

            <Btn
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs px-2.5 py-1 disabled:opacity-40"
            >
              {lang === "ar" ? "التالي" : "Next"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to format table cells cleanly based on column definition
function renderCellContent(
  col: ReportColumn,
  val: any,
  money: (n: number) => string,
  lang: string,
) {
  if (val === null || val === undefined || val === "") {
    return <span className="text-muted-foreground/50">—</span>;
  }

  if (col.type === "currency") {
    const num = typeof val === "number" ? val : Number(val) || 0;
    return <span className="font-bold font-mono text-foreground">{money(num)}</span>;
  }

  if (col.type === "number") {
    return <span className="font-bold font-mono text-foreground">{val}</span>;
  }

  if (col.type === "badge") {
    if (col.badgeMap && col.badgeMap[val]) {
      const b = col.badgeMap[val];
      const colorCls =
        b.color === "success"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
          : b.color === "crimson"
            ? "bg-destructive/15 text-destructive border-destructive/20"
            : b.color === "gold"
              ? "bg-gold/20 text-gold-foreground border-gold/30"
              : b.color === "brand"
                ? "bg-brand/15 text-brand border-brand/20"
                : "bg-secondary text-muted-foreground border-border";

      return (
        <span
          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ${colorCls}`}
        >
          {lang === "ar" ? b.label.ar : b.label.en}
        </span>
      );
    }

    if (["paid", "partial", "overdue", "draft"].includes(val)) {
      return <StatusPill status={val} />;
    }

    return (
      <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-xs font-bold">
        {String(val)}
      </span>
    );
  }

  if (col.type === "date") {
    return <span className="font-mono text-xs text-muted-foreground">{String(val)}</span>;
  }

  return <span>{String(val)}</span>;
}
