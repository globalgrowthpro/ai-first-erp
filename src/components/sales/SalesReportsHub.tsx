import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileSpreadsheet,
  Download,
  Store,
  Boxes,
  Clock,
  TrendingUp,
  Flame,
  CreditCard,
  Share2,
  DollarSign,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Layers,
  ChevronLeft,
  ChevronRight,
  Printer,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, StatusPill } from "@/components/kit";
import {
  STANDARD_REPORTS,
  type StandardReportDefinition,
  executeReportQuery,
  exportReportToExcel,
  exportAllSalesReportsToExcel,
  type LiveDataSourceCollections,
} from "@/lib/reports-store";
import { usePosOrdersStore } from "@/lib/pos-orders-store";
import { useSalesStore } from "@/lib/documents-store";
import { useInventoryStore } from "@/lib/inventory-store";
import { toast } from "sonner";

export function SalesReportsHub() {
  const { lang, money, pick } = useI18n();

  // Live database collections
  const { orders: posOrders } = usePosOrdersStore();
  const { documents: salesDocuments } = useSalesStore();
  const { products: inventoryProducts } = useInventoryStore();

  const liveData: LiveDataSourceCollections = useMemo(
    () => ({
      posOrders,
      salesDocuments,
      inventoryProducts,
    }),
    [posOrders, salesDocuments, inventoryProducts],
  );

  // The 8 requested sales report IDs
  const salesReportIds = [
    "branch_sales_ytd",
    "product_sales_group",
    "hourly_sales_analysis",
    "sales_forecast_ai",
    "consumption_sales_velocity",
    "payment_methods_analysis",
    "sales_channels_breakdown",
    "sales_cogs_margins",
  ];

  const salesReports = useMemo(() => {
    return salesReportIds
      .map((id) => STANDARD_REPORTS.find((r) => r.id === id))
      .filter((r): r is StandardReportDefinition => Boolean(r));
  }, []);

  const [activeReportId, setActiveReportId] = useState<string>("branch_sales_ytd");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const currentReport = useMemo(() => {
    return salesReports.find((r) => r.id === activeReportId) || salesReports[0];
  }, [salesReports, activeReportId]);

  // Execute query for active report
  const execution = useMemo(() => {
    if (!currentReport) return { rows: [], summaryCards: [] };
    return executeReportQuery({
      dataSource: currentReport.dataSource,
      lang: lang as "ar" | "en",
      liveData,
    });
  }, [currentReport, lang, liveData]);

  // Filtered & sorted rows
  const displayRows = useMemo(() => {
    let rows = [...execution.rows];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter((r) => {
        return Object.values(r).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    if (sortKey) {
      rows.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDir === "asc" ? valA - valB : valB - valA;
        }
        const strA = String(valA ?? "");
        const strB = String(valB ?? "");
        return sortDir === "asc"
          ? strA.localeCompare(strB, lang === "ar" ? "ar" : "en")
          : strB.localeCompare(strA, lang === "ar" ? "ar" : "en");
      });
    }

    return rows;
  }, [execution.rows, searchQuery, sortKey, sortDir, lang]);

  const totalPages = Math.ceil(displayRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayRows.slice(start, start + pageSize);
  }, [displayRows, page, pageSize]);

  // Handle Export Current Report to Excel
  const handleExportCurrentToExcel = () => {
    if (!currentReport) return;
    const ok = exportReportToExcel({
      reportTitle: currentReport.name,
      columns: currentReport.columns,
      rows: execution.rows,
      summaryCards: execution.summaryCards,
      lang: lang as "ar" | "en",
    });
    if (ok) {
      toast.success(
        lang === "ar"
          ? `تم تحميل تقرير "${currentReport.name.ar}" كملف Excel بنجاح!`
          : `"${currentReport.name.en}" exported to Excel successfully!`,
      );
    }
  };

  // Handle Quick Export Single Report from Card
  const handleQuickExportReport = (report: StandardReportDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    const exec = executeReportQuery({
      dataSource: report.dataSource,
      lang: lang as "ar" | "en",
      liveData,
    });
    const ok = exportReportToExcel({
      reportTitle: report.name,
      columns: report.columns,
      rows: exec.rows,
      summaryCards: exec.summaryCards,
      lang: lang as "ar" | "en",
    });
    if (ok) {
      toast.success(
        lang === "ar"
          ? `تم تحميل "${report.name.ar}" كملف Excel بنجاح!`
          : `"${report.name.en}" exported to Excel successfully!`,
      );
    }
  };

  // Handle Export All 8 Reports in 1 Master Excel Workbook
  const handleExportMasterExcel = () => {
    const ok = exportAllSalesReportsToExcel({ liveData, lang: lang as "ar" | "en" });
    if (ok) {
      toast.success(
        lang === "ar"
          ? "تم تحميل مصنف Excel الشامل (كافة تقارير المبيعات الـ 8 مع مؤشرات الأداء) بنجاح!"
          : "Master Excel Workbook (All 8 Sales Reports + KPIs) downloaded successfully!",
      );
    }
  };

  const getReportIconElement = (id: string) => {
    switch (id) {
      case "branch_sales_ytd":
        return <Store className="size-5 text-amber-500" />;
      case "product_sales_group":
        return <Boxes className="size-5 text-blue-500" />;
      case "hourly_sales_analysis":
        return <Clock className="size-5 text-purple-500" />;
      case "sales_forecast_ai":
        return <TrendingUp className="size-5 text-emerald-500" />;
      case "consumption_sales_velocity":
        return <Flame className="size-5 text-rose-500" />;
      case "payment_methods_analysis":
        return <CreditCard className="size-5 text-cyan-500" />;
      case "sales_channels_breakdown":
        return <Share2 className="size-5 text-indigo-500" />;
      case "sales_cogs_margins":
        return <DollarSign className="size-5 text-amber-600" />;
      default:
        return <Layers className="size-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner with Master Export Button */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-primary/15 text-primary border border-primary/30">
                <Sparkles className="size-3.5" />
                {pick("منظومة تقارير المبيعات المعتمدة (8 تقارير)", "Certified Sales Reporting Suite (8 Reports)")}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {pick("تحديث مباشر ومزامنة تامة", "Real-time Live Sync")}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-foreground">
              {pick("تقارير وتحليلات المبيعات الشاملة", "Comprehensive Sales Analytics & Intelligence")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {pick(
                "لوحة تقارير المبيعات المتكاملة: مبيعات الفروع عبر الفترات، حركة الأصناف والمجموعات، نشاط الساعات والذروة، التوقعات التنبؤية، قنوات السداد، مصادر البيع، وتكلفة المبيعات COGS — قابلة للتصدير الفوري إلى Excel.",
                "Consolidated sales reports: Branch sales (Day/Month/YTD), product categories, hourly peak times, AI forecasting, payment tenders, multi-channel platforms, and COGS margins — all downloadable to Excel.",
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportMasterExcel}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/25 transition-all cursor-pointer hover:scale-102 active:scale-98"
              title={pick("تحميل كل تقارير المبيعات (8 في 1) في مصنف Excel متكامل", "Download Master Excel Workbook (8-in-1)")}
            >
              <FileSpreadsheet className="size-5" />
              <span>{pick("تحميل كل تقارير المبيعات (8 في 1) Excel", "Download All 8 Sales Reports in 1 Excel")}</span>
            </button>

            <Link
              to="/reports"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
            >
              <ExternalLink className="size-4" />
              <span>{pick("فتح في مركز BI للتقارير", "Open in BI Hub")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Grid of 8 Sales Reports Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">
            {pick("قائمة تقارير المبيعات المتوفرة (اختر التقرير للعرض أو التحميل المباشر)", "Available Sales Reports (Select to Preview or Export)")}
          </h3>
          <span className="text-xs font-mono text-muted-foreground">
            8 {pick("تقارير جاهزة للتحميل", "reports ready for download")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {salesReports.map((rep, idx) => {
            const isSelected = rep.id === activeReportId;
            return (
              <div
                key={rep.id}
                onClick={() => {
                  setActiveReportId(rep.id);
                  setSearchQuery("");
                  setPage(1);
                }}
                className={`group relative rounded-xl p-4 transition-all cursor-pointer border text-right ${
                  isSelected
                    ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/40"
                    : "bg-card border-border hover:border-primary/40 hover:bg-muted/40 shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-9 rounded-lg bg-card border border-border flex items-center justify-center shadow-xs">
                      {getReportIconElement(rep.id)}
                    </div>
                    <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      #{idx + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleQuickExportReport(rep, e)}
                    className="size-8 rounded-lg border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center transition-colors cursor-pointer"
                    title={pick("تحميل هذا التقرير كملف Excel فوراً", "Download this report as Excel immediately")}
                  >
                    <Download className="size-3.5" />
                  </button>
                </div>

                <h4 className="text-sm font-black text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {lang === "ar" ? rep.name.ar : rep.name.en}
                </h4>

                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {lang === "ar" ? rep.description.ar : rep.description.en}
                </p>

                <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px]">
                  <span className={`font-bold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                    {isSelected ? pick("معروض حالياً ✓", "Viewing now ✓") : pick("عرض التقرير", "View Report")}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <FileSpreadsheet className="size-3" />
                    <span>Excel</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Active Report Viewer Section */}
      {currentReport && (
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-6 shadow-sm">
          {/* Active Header & Quick Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                {getReportIconElement(currentReport.id)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-foreground">
                    {lang === "ar" ? currentReport.name.ar : currentReport.name.en}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    Excel Ready
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "ar" ? currentReport.description.ar : currentReport.description.en}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Btn
                onClick={handleExportCurrentToExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black gap-2 shadow-sm"
              >
                <FileSpreadsheet className="size-4" />
                <span>{pick("تحميل التقرير كـ Excel", "Download Report as Excel")}</span>
              </Btn>
            </div>
          </div>

          {/* 4 Summary KPI Cards */}
          {execution.summaryCards.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {execution.summaryCards.map((card) => {
                const colorMap = {
                  brand: "border-primary/30 bg-primary/5 text-primary",
                  success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
                  warning: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
                  gold: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
                  crimson: "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400",
                  ink: "border-border bg-muted/40 text-muted-foreground",
                };
                const themeClass = colorMap[card.color || "brand"];

                return (
                  <div key={card.id} className={`rounded-xl border p-4 ${themeClass}`}>
                    <div className="text-xs font-bold text-muted-foreground">
                      {lang === "ar" ? card.label.ar : card.label.en}
                    </div>
                    <div className="text-xl md:text-2xl font-black mt-1 font-mono text-foreground">
                      {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                      {typeof card.value === "number" && !card.id.includes("order") && !card.id.includes("unit") && !card.id.includes("sku") ? (
                        <span className="text-xs font-normal text-muted-foreground ms-1">ج.م</span>
                      ) : null}
                    </div>
                    {card.subtext && (
                      <div className="text-[11px] text-muted-foreground mt-1 truncate">
                        {lang === "ar" ? card.subtext.ar : card.subtext.en}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={pick("بحث في نتائج التقرير...", "Search in report records...")}
                className="w-full h-10 pr-9 pl-3 rounded-xl bg-card border border-border text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {pick("عدد السجلات:", "Records:")}{" "}
                <strong className="text-foreground font-mono">{displayRows.length}</strong>
              </span>
            </div>
          </div>

          {/* Interactive Table View */}
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-muted/70 text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="py-3 px-3 text-center w-12 font-mono">#</th>
                    {currentReport.columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => {
                          if (sortKey === col.key) {
                            setSortDir(sortDir === "asc" ? "desc" : "asc");
                          } else {
                            setSortKey(col.key);
                            setSortDir("desc");
                          }
                        }}
                        className="py-3 px-3 cursor-pointer hover:text-foreground transition-colors select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{lang === "ar" ? col.label.ar : col.label.en}</span>
                          <ArrowUpDown className="size-3 opacity-50" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={currentReport.columns.length + 1}
                        className="py-12 text-center text-muted-foreground"
                      >
                        {pick("لا توجد بيانات مطابقة للبحث", "No matching data found")}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const absoluteIdx = (page - 1) * pageSize + idx + 1;
                      return (
                        <tr key={idx} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-muted-foreground text-[11px]">
                            {absoluteIdx}
                          </td>
                          {currentReport.columns.map((col) => {
                            const val = row[col.key];

                            if (col.type === "currency") {
                              const num = typeof val === "number" ? val : Number(val) || 0;
                              return (
                                <td key={col.key} className="py-2.5 px-3 font-mono font-bold text-foreground">
                                  {num.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">ج.م</span>
                                </td>
                              );
                            }

                            if (col.type === "number") {
                              return (
                                <td key={col.key} className="py-2.5 px-3 font-mono font-bold text-foreground">
                                  {typeof val === "number" ? val.toLocaleString() : val}
                                </td>
                              );
                            }

                            if (col.type === "badge" && col.badgeMap && val && col.badgeMap[val]) {
                              const b = col.badgeMap[val];
                              const colorStyles: Record<string, string> = {
                                success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
                                brand: "bg-primary/15 text-primary border-primary/30",
                                gold: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
                                crimson: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
                                ink: "bg-muted text-muted-foreground border-border",
                              };
                              return (
                                <td key={col.key} className="py-2.5 px-3">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      colorStyles[b.color] || colorStyles.brand
                                    }`}
                                  >
                                    {lang === "ar" ? b.label.ar : b.label.en}
                                  </span>
                                </td>
                              );
                            }

                            return (
                              <td key={col.key} className="py-2.5 px-3 text-foreground font-medium">
                                {val ?? "—"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-mono">
                  {pick(`صفحة ${page} من ${totalPages}`, `Page ${page} of ${totalPages}`)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
