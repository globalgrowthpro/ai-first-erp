import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  Sparkles,
  Plus,
  FileSpreadsheet,
  Layers,
  Store,
  Receipt,
  Truck,
  Boxes,
  BookOpen,
  Users,
  Briefcase,
  SlidersHorizontal,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Copy,
  Edit,
  Eye,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, PageHeader, Panel } from "@/components/kit";
import { insights, issues, kpis } from "@/lib/demo-data";
import { usePosOrdersStore } from "@/lib/pos-orders-store";
import { useSalesStore, usePurchasesStore } from "@/lib/documents-store";
import { useInventoryStore } from "@/lib/inventory-store";
import { usePartnersStore } from "@/lib/partners-store";
import { useHrStore } from "@/lib/hr-store";
import {
  useReportsStore,
  STANDARD_REPORTS,
  type StandardReportDefinition,
  type CustomReportDefinition,
  type ReportCategory,
  executeReportQuery,
  DATA_SOURCE_CATALOG,
  exportReportToExcel,
  type ReportColumn,
  type LiveDataSourceCollections,
} from "@/lib/reports-store";
import { ReportTableView } from "@/components/reports/ReportTableView";
import { CustomReportBuilderModal } from "@/components/reports/CustomReportBuilderModal";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Enterprise Reports & Business Intelligence — Hafez ERP" },
      {
        name: "description",
        content:
          "Professional enterprise reports hub: sales, retail POS, inventory valuation, procurement, accounting ledger, HR payroll, and customizable report builder with Excel export.",
      },
      { property: "og:title", content: "Reports & BI — Hafez ERP" },
      { property: "og:description", content: "Professional table view reports and custom report engine." },
    ],
  }),
  component: ReportsHubPage,
});

function getReportIcon(iconName: string) {
  switch (iconName) {
    case "Receipt":
      return <Receipt className="size-5" />;
    case "Store":
      return <Store className="size-5" />;
    case "Truck":
      return <Truck className="size-5" />;
    case "Boxes":
      return <Boxes className="size-5" />;
    case "BookOpen":
      return <BookOpen className="size-5" />;
    case "Users":
      return <Users className="size-5" />;
    case "Briefcase":
      return <Briefcase className="size-5" />;
    default:
      return <Layers className="size-5" />;
  }
}

function ReportsHubPage() {
  const { lang, money, n, pick } = useI18n();

  // Reports Store (custom definitions & presets)
  const {
    customReports,
    standardReports,
    saveCustomReport,
    deleteCustomReport,
    duplicateCustomReport,
  } = useReportsStore();

  // Live Database Stores from Supabase & ERP Context
  const { orders: posOrders, loading: posLoading, refresh: refreshPosOrders } = usePosOrdersStore();
  const { documents: salesDocuments, loading: salesLoading } = useSalesStore();
  const { documents: purchasesDocuments, loading: purchasesLoading } = usePurchasesStore();
  const { products: inventoryProducts, loading: inventoryLoading } = useInventoryStore();
  const { partners: livePartners, loading: partnersLoading } = usePartnersStore();
  const { employees: liveEmployees, loading: hrLoading } = useHrStore();

  const isAnyLiveLoading = posLoading || salesLoading || purchasesLoading || inventoryLoading || partnersLoading || hrLoading;

  // Aggregate live collections for reports query engine
  const liveData = useMemo<LiveDataSourceCollections>(() => ({
    posOrders,
    salesDocuments,
    purchasesDocuments,
    inventoryProducts,
    partners: livePartners,
    employees: liveEmployees,
  }), [posOrders, salesDocuments, purchasesDocuments, inventoryProducts, livePartners, liveEmployees]);

  // Active Navigation Tab: 'catalog' | 'viewer' | 'custom' | 'executive'
  const [activeTab, setActiveTab] = useState<"catalog" | "viewer" | "custom" | "executive">("catalog");

  // Selected Report State (can be a standard report or a custom report definition)
  const [selectedStandardReport, setSelectedStandardReport] = useState<StandardReportDefinition | null>(
    STANDARD_REPORTS[0] ?? null,
  );
  const [selectedCustomReport, setSelectedCustomReport] = useState<CustomReportDefinition | null>(null);

  // Category filter for the catalog
  const [catalogCategory, setCatalogCategory] = useState<ReportCategory>("all");

  // Custom Report Builder Modal State
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingCustomReport, setEditingCustomReport] = useState<CustomReportDefinition | null>(null);

  // Filter Standard Reports by Category
  const filteredStandardReports = useMemo(() => {
    if (catalogCategory === "all") return standardReports;
    return standardReports.filter((r) => r.category === catalogCategory);
  }, [standardReports, catalogCategory]);

  // Execute active report query for the Table View
  const activeReportExecution = useMemo(() => {
    if (selectedCustomReport) {
      // Execute custom report definition with all advanced options
      const exec = executeReportQuery({
        dataSource: selectedCustomReport.dataSource,
        selectedColumns: selectedCustomReport.selectedColumns,
        filters: selectedCustomReport.filters,
        filterMatchMode: selectedCustomReport.filterMatchMode,
        dateField: selectedCustomReport.dateField,
        dateRangePreset: selectedCustomReport.dateRangePreset,
        customStartDate: selectedCustomReport.customStartDate,
        customEndDate: selectedCustomReport.customEndDate,
        groupBy: selectedCustomReport.groupBy,
        aggregations: selectedCustomReport.aggregations,
        calculatedColumns: selectedCustomReport.calculatedColumns,
        columnConfigs: selectedCustomReport.columnConfigs,
        sortBy: selectedCustomReport.sortBy,
        sortDirection: selectedCustomReport.sortDirection,
        secondarySortBy: selectedCustomReport.secondarySortBy,
        secondarySortDirection: selectedCustomReport.secondarySortDirection,
        lang: lang as "ar" | "en",
        liveData,
      });

      // Construct columns including groupBy, selected columns, and calculated columns
      const fieldCatalog = DATA_SOURCE_CATALOG[selectedCustomReport.dataSource].fields;
      const cols: ReportColumn[] = [];

      if (selectedCustomReport.groupBy) {
        const gf = fieldCatalog.find((x) => x.key === selectedCustomReport.groupBy);
        cols.push({
          key: selectedCustomReport.groupBy,
          label:
            selectedCustomReport.columnConfigs?.[selectedCustomReport.groupBy]?.customLabel ||
            gf?.label || {
              ar: selectedCustomReport.groupBy,
              en: selectedCustomReport.groupBy,
            },
          type: gf?.type || "text",
        });
        cols.push({
          key: "_recordCount",
          label: { ar: "عدد الحركات", en: "Count" },
          type: "number",
        });
      }

      for (const colKey of selectedCustomReport.selectedColumns) {
        if (selectedCustomReport.groupBy && colKey === selectedCustomReport.groupBy) continue;
        const f = fieldCatalog.find((x) => x.key === colKey);
        cols.push({
          key: colKey,
          label:
            selectedCustomReport.columnConfigs?.[colKey]?.customLabel ||
            f?.label || { ar: colKey, en: colKey },
          type: f?.type || "text",
          align: selectedCustomReport.columnConfigs?.[colKey]?.align,
        });
      }

      if (!selectedCustomReport.groupBy && selectedCustomReport.calculatedColumns) {
        for (const calc of selectedCustomReport.calculatedColumns) {
          cols.push({
            key: calc.id,
            label: calc.name,
            type: calc.type,
            align: "right",
          });
        }
      }

      return {
        title: selectedCustomReport.name,
        description: selectedCustomReport.description,
        categoryLabel: {
          ar: `مخصص — ${DATA_SOURCE_CATALOG[selectedCustomReport.dataSource].name.ar}`,
          en: `Custom — ${DATA_SOURCE_CATALOG[selectedCustomReport.dataSource].name.en}`,
        },
        columns: cols,
        rows: exec.rows,
        summaryCards: exec.summaryCards,
        chartType: selectedCustomReport.chartType,
        tags: selectedCustomReport.tags,
        groupBy: selectedCustomReport.groupBy,
      };
    }

    if (selectedStandardReport) {
      const exec = executeReportQuery({
        dataSource: selectedStandardReport.dataSource,
        sortBy: selectedStandardReport.defaultSort?.key,
        sortDirection: selectedStandardReport.defaultSort?.direction,
        lang: lang as "ar" | "en",
        liveData,
      });

      return {
        title: selectedStandardReport.name,
        description: selectedStandardReport.description,
        categoryLabel: {
          ar: getCategoryName(selectedStandardReport.category, "ar"),
          en: getCategoryName(selectedStandardReport.category, "en"),
        },
        columns: selectedStandardReport.columns,
        rows: exec.rows,
        summaryCards: exec.summaryCards,
        chartType: "table" as const,
      };
    }

    return null;
  }, [selectedStandardReport, selectedCustomReport, lang, liveData]);

  // Select a standard report and switch to viewer
  const handleOpenStandardReport = (report: StandardReportDefinition) => {
    setSelectedStandardReport(report);
    setSelectedCustomReport(null);
    setActiveTab("viewer");
  };

  // Select a custom report and switch to viewer
  const handleOpenCustomReport = (report: CustomReportDefinition) => {
    setSelectedCustomReport(report);
    setSelectedStandardReport(null);
    setActiveTab("viewer");
  };

  // Edit custom report
  const handleEditCustomReport = (report: CustomReportDefinition) => {
    setEditingCustomReport(report);
    setBuilderOpen(true);
  };

  // Duplicate custom report
  const handleDuplicateCustomReport = (id: string) => {
    const newId = duplicateCustomReport(id);
    if (newId) {
      toast.success(lang === "ar" ? "تم نسخ التقرير بنجاح!" : "Report cloned successfully!");
    }
  };

  // Delete custom report
  const handleDeleteCustomReport = (id: string, name: string) => {
    if (confirm(lang === "ar" ? `هل أنت متأكد من حذف تقرير "${name}"؟` : `Delete report "${name}"?`)) {
      deleteCustomReport(id);
      if (selectedCustomReport?.id === id) {
        setSelectedCustomReport(null);
        setSelectedStandardReport(STANDARD_REPORTS[0] ?? null);
      }
      toast.success(lang === "ar" ? "تم حذف التقرير" : "Report deleted");
    }
  };

  // Quick export standard report to Excel directly from card
  const handleQuickExportStandard = (report: StandardReportDefinition) => {
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
          ? `تم تصدير "${report.name.ar}" إلى ملف Excel بنجاح!`
          : `"${report.name.en}" exported to Excel successfully!`,
      );
    }
  };

  // Quick export custom report to Excel
  const handleQuickExportCustom = (report: CustomReportDefinition) => {
    const exec = executeReportQuery({
      dataSource: report.dataSource,
      selectedColumns: report.selectedColumns,
      filters: report.filters,
      filterMatchMode: report.filterMatchMode,
      dateField: report.dateField,
      dateRangePreset: report.dateRangePreset,
      customStartDate: report.customStartDate,
      customEndDate: report.customEndDate,
      groupBy: report.groupBy,
      aggregations: report.aggregations,
      calculatedColumns: report.calculatedColumns,
      columnConfigs: report.columnConfigs,
      sortBy: report.sortBy,
      sortDirection: report.sortDirection,
      secondarySortBy: report.secondarySortBy,
      secondarySortDirection: report.secondarySortDirection,
      lang: lang as "ar" | "en",
      liveData,
    });

    const fieldCatalog = DATA_SOURCE_CATALOG[report.dataSource].fields;
    const cols: ReportColumn[] = [];

    if (report.groupBy) {
      const gf = fieldCatalog.find((x) => x.key === report.groupBy);
      cols.push({
        key: report.groupBy,
        label: report.columnConfigs?.[report.groupBy]?.customLabel || gf?.label || { ar: report.groupBy, en: report.groupBy },
        type: gf?.type || "text",
      });
      cols.push({
        key: "_recordCount",
        label: { ar: "عدد الحركات", en: "Count" },
        type: "number",
      });
    }

    for (const colKey of report.selectedColumns) {
      if (report.groupBy && colKey === report.groupBy) continue;
      const f = fieldCatalog.find((x) => x.key === colKey);
      cols.push({
        key: colKey,
        label: report.columnConfigs?.[colKey]?.customLabel || f?.label || { ar: colKey, en: colKey },
        type: f?.type || "text",
      });
    }

    if (!report.groupBy && report.calculatedColumns) {
      for (const calc of report.calculatedColumns) {
        cols.push({
          key: calc.id,
          label: calc.name,
          type: calc.type,
        });
      }
    }

    const ok = exportReportToExcel({
      reportTitle: report.name,
      columns: cols,
      rows: exec.rows,
      summaryCards: exec.summaryCards,
      lang: lang as "ar" | "en",
    });

    if (ok) {
      toast.success(
        lang === "ar"
          ? `تم تصدير التقرير المخصص "${report.name.ar}" إلى Excel!`
          : `Custom report "${report.name.en}" exported to Excel!`,
      );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title={lang === "ar" ? "مركز تقارير الأعمال والذكاء التحليلي" : "Enterprise Reports & BI Center"}
        subtitle={
          lang === "ar"
            ? "منظومة التقارير المؤسسية الشاملة: جداول تفاعلية متقدمة، تصدير فوري إلى Excel، ومنشئ تقارير مخصص مع حفظ المنطق"
            : "Complete ERP reporting suite: interactive data tables, Excel export, and customizable report builder with stored query logic"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Btn
              variant="solid"
              onClick={() => {
                setEditingCustomReport(null);
                setBuilderOpen(true);
              }}
              className="gap-1.5 shadow-md"
            >
              <Plus className="size-4" />
              {lang === "ar" ? "تصميم تقرير مخصص" : "Create Custom Report"}
            </Btn>

            {activeTab === "viewer" && activeReportExecution && (
              <Btn
                variant="outline"
                onClick={() => {
                  exportReportToExcel({
                    reportTitle: activeReportExecution.title,
                    columns: activeReportExecution.columns,
                    rows: activeReportExecution.rows,
                    summaryCards: activeReportExecution.summaryCards,
                    lang: lang as "ar" | "en",
                  });
                  toast.success(lang === "ar" ? "تم تصدير التقرير إلى Excel" : "Report exported to Excel");
                }}
                className="border-emerald-600/30 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/10"
              >
                <FileSpreadsheet className="size-4 text-emerald-600" />
                {lang === "ar" ? "تصدير التقرير النشط (Excel)" : "Export Current (Excel)"}
              </Btn>
            )}
          </div>
        }
      />

      {/* 2. Main Navigation Bar (4 Hub Tabs) */}
      <div className="flex items-center gap-2 border-b border-border pb-2.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap shadow-xs ${
            activeTab === "catalog"
              ? "bg-[#064e3b] text-white shadow-md ring-1 ring-emerald-600/40 dark:bg-[#064e3b] dark:text-emerald-50"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
        >
          <Layers className={`size-4 shrink-0 ${activeTab === "catalog" ? "text-emerald-300" : ""}`} />
          <span>{lang === "ar" ? "مكتبة التقارير الشاملة" : "Reports Catalog"}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === "catalog"
                ? "bg-emerald-950/80 text-emerald-100 border border-emerald-600/30"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {standardReports.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("viewer")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap shadow-xs ${
            activeTab === "viewer"
              ? "bg-[#064e3b] text-white shadow-md ring-1 ring-emerald-600/40 dark:bg-[#064e3b] dark:text-emerald-50"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
        >
          <Eye className={`size-4 shrink-0 ${activeTab === "viewer" ? "text-emerald-300" : ""}`} />
          <span>{lang === "ar" ? "عرض التقرير النشط (جدول تفاعلي)" : "Active Table View"}</span>
          {activeReportExecution && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === "viewer"
                  ? "bg-emerald-800 text-emerald-100 border border-emerald-600/40"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {lang === "ar" ? activeReportExecution.title.ar : activeReportExecution.title.en}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("custom")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap shadow-xs ${
            activeTab === "custom"
              ? "bg-[#064e3b] text-white shadow-md ring-1 ring-emerald-600/40 dark:bg-[#064e3b] dark:text-emerald-50"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
        >
          <SlidersHorizontal className={`size-4 shrink-0 ${activeTab === "custom" ? "text-emerald-300" : ""}`} />
          <span>{lang === "ar" ? "التقارير المخصصة والذكية" : "Custom Reports Studio"}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === "custom"
                ? "bg-emerald-950/80 text-emerald-100 border border-emerald-600/30"
                : "bg-primary/20 text-primary"
            }`}
          >
            {customReports.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("executive")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap shadow-xs ${
            activeTab === "executive"
              ? "bg-[#064e3b] text-white shadow-md ring-1 ring-emerald-600/40 dark:bg-[#064e3b] dark:text-emerald-50"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
        >
          <Sparkles className={`size-4 shrink-0 ${activeTab === "executive" ? "text-emerald-300" : "text-primary"}`} />
          <span>{lang === "ar" ? "التقرير التنفيذي والرؤى الذكية (AI)" : "Executive AI Briefing"}</span>
        </button>
      </div>

      {/* 3. TAB 1: REPORTS CATALOG */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: { ar: "جميع التقارير", en: "All Reports" } },
              { id: "sales", label: { ar: "المبيعات والفواتير", en: "Sales & Invoices" } },
              { id: "pos", label: { ar: "نقاط البيع والفروع", en: "Retail POS" } },
              { id: "purchases", label: { ar: "المشتريات والتوريد", en: "Procurement" } },
              { id: "inventory", label: { ar: "المخزون ونواقص الخامات", en: "Inventory" } },
              { id: "financial", label: { ar: "الدفتر العام والمالية", en: "General Ledger" } },
              { id: "partners", label: { ar: "العملاء والموردون", en: "Partners" } },
              { id: "hr", label: { ar: "الرواتب والقوى البشرية", en: "HR & Payroll" } },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCatalogCategory(cat.id as any)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs ${
                  catalogCategory === cat.id
                    ? "bg-[#064e3b] text-white shadow-md ring-1 ring-emerald-600/40 dark:bg-[#064e3b] dark:text-emerald-50"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                {lang === "ar" ? cat.label.ar : cat.label.en}
              </button>
            ))}
          </div>

          {/* Standard Reports Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredStandardReports.map((report) => (
              <div
                key={report.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-bold uppercase text-muted-foreground">
                      {getCategoryName(report.category, lang as "ar" | "en")}
                    </span>
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                      {getReportIcon(report.icon)}
                    </div>
                  </div>

                  <h3 className="mt-3 text-sm font-black text-foreground group-hover:text-primary transition-colors">
                    {lang === "ar" ? report.name.ar : report.name.en}
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {lang === "ar" ? report.description.ar : report.description.en}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-3">
                  <Btn
                    variant="solid"
                    size="sm"
                    onClick={() => handleOpenStandardReport(report)}
                    className="flex-1 text-xs font-bold justify-center"
                  >
                    <Eye className="size-3.5" />
                    {lang === "ar" ? "عرض بالجدول" : "View Table"}
                  </Btn>

                  <Btn
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickExportStandard(report)}
                    className="px-2.5 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                    title={lang === "ar" ? "تصدير فوري إلى Excel" : "Quick Export to Excel"}
                  >
                    <FileSpreadsheet className="size-4 text-emerald-600" />
                  </Btn>
                </div>
              </div>
            ))}

            {/* Custom Report Promotion Card inside Catalog */}
            <div
              onClick={() => {
                setEditingCustomReport(null);
                setBuilderOpen(true);
              }}
              className="cursor-pointer flex flex-col justify-between rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 transition-all hover:bg-primary/10 hover:border-primary"
            >
              <div>
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Plus className="size-5" />
                </div>
                <h3 className="mt-3 text-sm font-black text-primary">
                  {lang === "ar" ? "تصميم تقرير مخصص جديد" : "Create Custom Report"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "حدد مصدر البيانات، الأعمدة، وقواعد الفلترة الخاصة بك واحفظ الاستعلام في ملفك"
                    : "Build your own custom report with tailored columns, multi-rule filters and stored logic"}
                </p>
              </div>

              <div className="mt-5">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                  {lang === "ar" ? "فتح منشئ التقارير" : "Open Studio Builder"}
                  <ChevronRight className="size-3.5 rtl:rotate-180" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: ACTIVE REPORT TABLE VIEWER */}
      {activeTab === "viewer" && activeReportExecution && (
        <div className="space-y-4">
          {/* Top Quick Report Switcher Dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-secondary/40 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <span>{lang === "ar" ? "التقرير المعروض حالياً:" : "Current Report:"}</span>
              <select
                value={
                  selectedCustomReport
                    ? `custom:${selectedCustomReport.id}`
                    : `std:${selectedStandardReport?.id}`
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith("std:")) {
                    const id = val.replace("std:", "");
                    const found = standardReports.find((r) => r.id === id);
                    if (found) {
                      setSelectedStandardReport(found);
                      setSelectedCustomReport(null);
                    }
                  } else if (val.startsWith("custom:")) {
                    const id = val.replace("custom:", "");
                    const found = customReports.find((r) => r.id === id);
                    if (found) {
                      setSelectedCustomReport(found);
                      setSelectedStandardReport(null);
                    }
                  }
                }}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <optgroup label={lang === "ar" ? "التقارير القياسية" : "Standard Reports"}>
                  {standardReports.map((r) => (
                    <option key={r.id} value={`std:${r.id}`}>
                      {lang === "ar" ? r.name.ar : r.name.en}
                    </option>
                  ))}
                </optgroup>
                {customReports.length > 0 && (
                  <optgroup label={lang === "ar" ? "تقاريري المخصصة" : "My Custom Reports"}>
                    {customReports.map((r) => (
                      <option key={r.id} value={`custom:${r.id}`}>
                        {lang === "ar" ? r.name.ar : r.name.en}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Realtime DB Sync Indicator Badge */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{lang === "ar" ? "قاعدة البيانات الحية (Realtime DB Sync)" : "Live Database Sync"}</span>
                <button
                  type="button"
                  onClick={() => {
                    refreshPosOrders();
                    toast.success(lang === "ar" ? "تم تحديث البيانات الحية من قاعدة البيانات" : "Live data refreshed from database");
                  }}
                  className="p-0.5 hover:bg-emerald-500/20 rounded transition-colors"
                  title={lang === "ar" ? "تحديث فوري للبيانات الحية" : "Refresh live data"}
                >
                  <RotateCcw className={`size-3.5 ${isAnyLiveLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              <Btn
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("catalog")}
                className="text-xs"
              >
                {lang === "ar" ? "الرجوع للفهرس" : "Catalog"}
              </Btn>

              <Btn
                variant="solid"
                size="sm"
                onClick={() => {
                  setEditingCustomReport(null);
                  setBuilderOpen(true);
                }}
                className="text-xs gap-1"
              >
                <Plus className="size-3.5" />
                {lang === "ar" ? "تقرير جديد" : "New Report"}
              </Btn>
            </div>
          </div>

          {/* Full Table View Component */}
          <ReportTableView
            reportTitle={activeReportExecution.title}
            reportDescription={activeReportExecution.description}
            categoryLabel={activeReportExecution.categoryLabel}
            columns={activeReportExecution.columns}
            rows={activeReportExecution.rows}
            summaryCards={activeReportExecution.summaryCards}
            chartType={activeReportExecution.chartType}
            tags={activeReportExecution.tags}
            groupBy={activeReportExecution.groupBy}
          />
        </div>
      )}

      {/* 5. TAB 3: CUSTOM REPORTS STUDIO */}
      {activeTab === "custom" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
            <div>
              <h2 className="text-lg lg:text-xl font-black text-foreground uppercase tracking-tight">
                {lang === "ar" ? "ستوديو التقارير المخصصة والذكية" : "Custom Reports Studio"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "ar"
                  ? "تقارير تم تصميم منطقها بواسطة المستخدمين: تجميع، رسوم بيانية، أعمدة حسابية، وحفظ دائم للمنطق"
                  : "User-configured custom reports: grouping, visual charts, formula columns, and stored logic"}
              </p>
            </div>

            <Btn
              variant="solid"
              onClick={() => {
                setEditingCustomReport(null);
                setBuilderOpen(true);
              }}
              className="gap-1.5 shadow-md text-xs font-bold"
            >
              <Plus className="size-4" />
              {lang === "ar" ? "إنشاء تقرير مخصص جديد" : "Create Custom Report"}
            </Btn>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customReports.map((report) => {
              const ds = DATA_SOURCE_CATALOG[report.dataSource];
              return (
                <div
                  key={report.id}
                  className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                          {lang === "ar" ? ds.name.ar : ds.name.en}
                        </span>
                        {report.chartType && report.chartType !== "table" && (
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-black uppercase text-foreground">
                            {report.chartType === "bar"
                              ? lang === "ar"
                                ? "أعمدة"
                                : "Bar"
                              : report.chartType === "pie"
                                ? lang === "ar"
                                  ? "دائري"
                                  : "Pie"
                                : "KPI"}
                          </span>
                        )}
                        {report.scheduleFrequency && report.scheduleFrequency !== "on_demand" && (
                          <span className="rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold">
                            {report.scheduleFrequency === "daily"
                              ? lang === "ar"
                                ? "يومي"
                                : "Daily"
                              : report.scheduleFrequency === "weekly"
                                ? lang === "ar"
                                  ? "أسبوعي"
                                  : "Weekly"
                                : lang === "ar"
                                  ? "شهري"
                                  : "Monthly"}
                          </span>
                        )}
                      </div>
                      {report.isPreset && (
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {lang === "ar" ? "قالب جاهز" : "Preset"}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-sm font-black text-foreground">
                      {lang === "ar" ? report.name.ar : report.name.en}
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {lang === "ar" ? report.description.ar : report.description.en}
                    </p>

                    {/* Metadata Badges */}
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      {report.groupBy && (
                        <span className="rounded bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 font-bold text-[10px]">
                          {lang === "ar" ? `تجميع: ${report.groupBy}` : `Group: ${report.groupBy}`}
                        </span>
                      )}
                      {report.calculatedColumns && report.calculatedColumns.length > 0 && (
                        <span className="rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 font-bold text-[10px]">
                          {report.calculatedColumns.length} {lang === "ar" ? "معادلات حسابية" : "formulas"}
                        </span>
                      )}
                      <span className="rounded bg-secondary px-2 py-0.5 font-bold text-[10px]">
                        {report.selectedColumns.length}{" "}
                        {lang === "ar" ? "أعمدة" : "cols"}
                      </span>
                      {report.filters.length > 0 && (
                        <span className="rounded bg-primary/10 text-primary px-2 py-0.5 font-bold text-[10px]">
                          {report.filters.length} {lang === "ar" ? "شروط" : "rules"}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {report.tags && report.tags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {report.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-secondary/80 px-1.5 py-0.2 text-[9px] font-medium text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-2 border-t border-border/60 pt-3">
                    <div className="flex items-center gap-2">
                      <Btn
                        variant="solid"
                        size="sm"
                        onClick={() => handleOpenCustomReport(report)}
                        className="flex-1 text-xs font-bold justify-center"
                      >
                        <Eye className="size-3.5" />
                        {lang === "ar" ? "تشغيل وعرض" : "Run Report"}
                      </Btn>

                      <Btn
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickExportCustom(report)}
                        className="px-2.5 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                        title={lang === "ar" ? "تصدير إلى Excel" : "Export to Excel"}
                      >
                        <FileSpreadsheet className="size-4 text-emerald-600" />
                      </Btn>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditCustomReport(report)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          title={lang === "ar" ? "تعديل المنطق" : "Edit Logic"}
                        >
                          <Edit className="size-3" />
                          <span>{lang === "ar" ? "تعديل" : "Edit"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateCustomReport(report.id)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          title={lang === "ar" ? "نسخ" : "Duplicate"}
                        >
                          <Copy className="size-3" />
                          <span>{lang === "ar" ? "نسخ" : "Clone"}</span>
                        </button>
                      </div>

                      {!report.isPreset && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteCustomReport(
                              report.id,
                              lang === "ar" ? report.name.ar : report.name.en,
                            )
                          }
                          className="flex items-center gap-1 rounded px-2 py-1 text-destructive hover:bg-destructive/10"
                          title={lang === "ar" ? "حذف التقرير" : "Delete"}
                        >
                          <Trash2 className="size-3" />
                          <span>{lang === "ar" ? "حذف" : "Delete"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. TAB 4: EXECUTIVE AI BRIEFING & CEO REPORT */}
      {activeTab === "executive" && (
        <div className="space-y-6">
          {/* KPI 4-Block Overview */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Block
              title={lang === "ar" ? "المبيعات ونقاط البيع" : "Sales & POS"}
              rows={[
                [lang === "ar" ? "إجمالي مبيعات اليوم" : "Today Sales", money(kpis.sales)],
                [lang === "ar" ? "الفواتير المصدرة" : "Invoices Issued", n(kpis.invoices)],
                [lang === "ar" ? "العملاء المخدومين" : "Customers Served", n(kpis.customersServed)],
                [lang === "ar" ? "متوسط الفاتورة" : "Average Ticket", money(kpis.avgInvoice)],
              ]}
            />
            <Block
              title={lang === "ar" ? "المشتريات والتوريد" : "Procurement"}
              rows={[
                [lang === "ar" ? "إجمالي أوامر الشراء" : "Purchase Total", money(kpis.purchases)],
                [lang === "ar" ? "أوامر توريد اليوم" : "Purchase Orders", n(9)],
                [lang === "ar" ? "خامات نوتيلا وبستاشيو" : "Core Confectionery", money(45500)],
              ]}
            />
            <Block
              title={lang === "ar" ? "المخزون والمستودعات" : "Stock Valuation"}
              rows={[
                [lang === "ar" ? "القيمة الإجمالية للمخزون" : "Stock Valuation", money(kpis.stockValue)],
                [lang === "ar" ? "أصناف تحت حد الأمان" : "Low Stock Alerts", n(3)],
                [lang === "ar" ? "حركات دخول (تشغيل)" : "Stock in", n(142)],
                [lang === "ar" ? "حركات خروج (فروع)" : "Stock out", n(97)],
              ]}
            />
            <Block
              title={lang === "ar" ? "المالية والسيولة" : "Cash & Balances"}
              rows={[
                [lang === "ar" ? "النقدية والبنوك CIB" : "Cash & Bank Balance", money(kpis.cash)],
                [lang === "ar" ? "مستحقات العملاء" : "Receivables", money(kpis.receivables)],
                [lang === "ar" ? "مستحقات الموردين" : "Payables", money(kpis.payables)],
              ]}
            />
          </div>

          {/* AI Insights & Issues Watchdog */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title={lang === "ar" ? "تحليل الذكاء الاصطناعي التنفيذي (AI)" : "Executive AI Insights"}
              tone="ink"
              aside={<Sparkles className="size-4 text-gold" />}
            >
              <ul className="space-y-3 text-sm">
                {insights.map((i) => (
                  <li
                    key={i.en}
                    className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs text-sm font-semibold text-card-foreground leading-relaxed flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{pick(i.ar, i.en)}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title={lang === "ar" ? "تنبيهات ومخاطر تتطلب التدخل" : "Watchdog Operational Issues"}
              aside={<AlertTriangle className="size-4 text-destructive" />}
            >
              <ul className="space-y-2.5 text-sm">
                {issues.map((i) => (
                  <li
                    key={i.en}
                    className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm font-semibold text-foreground flex items-center gap-2.5"
                  >
                    <span className="flex size-2 rounded-full bg-destructive shrink-0" />
                    <span>{pick(i.ar, i.en)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {/* 7. Custom Report Builder Modal */}
      <CustomReportBuilderModal
        open={builderOpen}
        onClose={() => {
          setBuilderOpen(false);
          setEditingCustomReport(null);
        }}
        onSave={(reportDef) => {
          const savedId = saveCustomReport(reportDef);
          // If created, automatically switch to custom tab
          setActiveTab("custom");
          if (savedId) {
            const saved = customReports.find((r) => r.id === savedId);
            if (saved) setSelectedCustomReport(saved);
          }
        }}
        initialReport={editingCustomReport}
        liveData={liveData}
      />
    </div>
  );
}

function Block({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <Panel title={title}>
      <dl className="space-y-2.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0">
            <dt className="text-muted-foreground text-xs font-bold">{k}</dt>
            <dd className="font-mono font-black text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function getCategoryName(category: string, lang: "ar" | "en") {
  const map: Record<string, { ar: string; en: string }> = {
    sales: { ar: "مبيعات", en: "Sales" },
    pos: { ar: "كاشير وفروع", en: "POS" },
    purchases: { ar: "مشتريات", en: "Purchases" },
    inventory: { ar: "مخزون", en: "Inventory" },
    financial: { ar: "مالية", en: "Financial" },
    partners: { ar: "عملاء وموردون", en: "Partners" },
    hr: { ar: "رواتب وموظفون", en: "HR" },
    custom: { ar: "مخصص", en: "Custom" },
    all: { ar: "الكل", en: "All" },
  };
  return map[category] ? (lang === "ar" ? map[category].ar : map[category].en) : category;
}
