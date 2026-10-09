import { useState, useMemo } from "react";
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Eye,
  FileSpreadsheet,
  Download,
  Layers,
  SlidersHorizontal,
  Save,
  Store,
  Receipt,
  Truck,
  Boxes,
  BookOpen,
  Users,
  Briefcase,
  AlertCircle,
  Calendar,
  Calculator,
  ArrowUp,
  ArrowDown,
  BarChart2,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Clock,
  Tag,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Maximize2,
  Minimize2,
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
import { Btn } from "@/components/kit";
import {
  DATA_SOURCE_CATALOG,
  type DataSourceKey,
  type CustomReportDefinition,
  type CustomReportFilter,
  type FilterOperator,
  type FilterMatchMode,
  type DateRangePreset,
  type CalculatedColumn,
  type ColumnConfig,
  type ReportChartType,
  type ScheduleFrequency,
  type ReportCategory,
  executeReportQuery,
  exportReportToExcel,
  exportReportToCsv,
  computeDateRange,
  type ReportColumn,
  type LiveDataSourceCollections,
} from "@/lib/reports-store";
import { toast } from "sonner";

interface CustomReportBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (reportDef: Omit<CustomReportDefinition, "id" | "createdAt" | "updatedAt"> & { id?: string }) => void;
  initialReport?: CustomReportDefinition | null;
  liveData?: LiveDataSourceCollections | undefined;
}

const CHART_COLORS = [
  "#2563eb", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
];

export function CustomReportBuilderModal({
  open,
  onClose,
  onSave,
  initialReport,
  liveData,
}: CustomReportBuilderModalProps) {
  const { lang, money } = useI18n();

  // Wizard Tabs: "info" | "columns" | "grouping" | "filters" | "preview"
  const [activeTab, setActiveTab] = useState<"info" | "columns" | "grouping" | "filters" | "preview">("info");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Tab 1: Info & Data Source
  const [nameAr, setNameAr] = useState(initialReport?.name?.ar || "");
  const [nameEn, setNameEn] = useState(initialReport?.name?.en || "");
  const [descAr, setDescAr] = useState(initialReport?.description?.ar || "");
  const [descEn, setDescEn] = useState(initialReport?.description?.en || "");
  const [category, setCategory] = useState<ReportCategory>(initialReport?.category || "custom");
  const [dataSource, setDataSource] = useState<DataSourceKey>(initialReport?.dataSource || "sales");
  const [tagsInput, setTagsInput] = useState<string>(initialReport?.tags?.join(", ") || "");
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>(
    initialReport?.scheduleFrequency || "on_demand",
  );

  // Tab 2: Columns & Formatting & Calculations
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    if (initialReport?.selectedColumns && initialReport.selectedColumns.length > 0) {
      return initialReport.selectedColumns;
    }
    return DATA_SOURCE_CATALOG[initialReport?.dataSource || "sales"].fields
      .slice(0, 5)
      .map((f) => f.key);
  });
  const [columnConfigs, setColumnConfigs] = useState<Record<string, ColumnConfig>>(
    initialReport?.columnConfigs || {},
  );
  const [calculatedColumns, setCalculatedColumns] = useState<CalculatedColumn[]>(
    initialReport?.calculatedColumns || [],
  );

  // Tab 3: Grouping, Aggregations & Charts
  const [groupBy, setGroupBy] = useState<string>(initialReport?.groupBy || "");
  const [chartType, setChartType] = useState<ReportChartType>(initialReport?.chartType || "table");

  // Tab 4: Filters & Sorting
  const [filterMatchMode, setFilterMatchMode] = useState<FilterMatchMode>(
    initialReport?.filterMatchMode || "all",
  );
  const [filters, setFilters] = useState<CustomReportFilter[]>(initialReport?.filters || []);
  const [dateField, setDateField] = useState<string>(initialReport?.dateField || "");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>(
    initialReport?.dateRangePreset || "all",
  );
  const [customStartDate, setCustomStartDate] = useState<string>(initialReport?.customStartDate || "");
  const [customEndDate, setCustomEndDate] = useState<string>(initialReport?.customEndDate || "");
  const [sortBy, setSortBy] = useState<string>(initialReport?.sortBy || "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialReport?.sortDirection || "desc");
  const [secondarySortBy, setSecondarySortBy] = useState<string>(initialReport?.secondarySortBy || "");
  const [secondarySortDirection, setSecondarySortDirection] = useState<"asc" | "desc">(
    initialReport?.secondarySortDirection || "desc",
  );

  // Available raw fields for current data source
  const availableFields = DATA_SOURCE_CATALOG[dataSource].fields;

  // Potential date fields for current data source
  const dateFieldOptions = useMemo(() => {
    return availableFields.filter((f) => f.type === "date");
  }, [availableFields]);

  // Potential group-by fields (categorical text/badge fields)
  const groupByOptions = useMemo(() => {
    return availableFields.filter((f) => f.type === "text" || f.type === "badge");
  }, [availableFields]);

  // Potential numeric fields for calculation/aggregations
  const numericFields = useMemo(() => {
    return availableFields.filter((f) => f.type === "currency" || f.type === "number");
  }, [availableFields]);

  // Switch Data Source handler
  const handleDataSourceChange = (nextSource: DataSourceKey) => {
    setDataSource(nextSource);
    const newFields = DATA_SOURCE_CATALOG[nextSource].fields.slice(0, 5).map((f) => f.key);
    setSelectedColumns(newFields);
    setColumnConfigs({});
    setCalculatedColumns([]);
    setFilters([]);
    setGroupBy("");
    setDateField(DATA_SOURCE_CATALOG[nextSource].fields.find((f) => f.type === "date")?.key || "");
    setDateRangePreset("all");
    setSortBy("");
    setSecondarySortBy("");
  };

  // Toggle Column in Selected Columns
  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // Column Reordering
  const moveColumn = (index: number, direction: "up" | "down") => {
    const nextCols = [...selectedColumns];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextCols.length) return;
    const temp = nextCols[index]!;
    nextCols[index] = nextCols[targetIdx]!;
    nextCols[targetIdx] = temp;
    setSelectedColumns(nextCols);
  };

  // Add / Edit Calculated Column
  const addCalculatedColumn = () => {
    const defA = numericFields[0]?.key || "amount";
    const defB = numericFields[1]?.key || "";
    const newCalc: CalculatedColumn = {
      id: `calc_${Date.now()}`,
      name: {
        ar: lang === "ar" ? "عمود حسابي جديد" : "New Calculated Column",
        en: "New Calculated Column",
      },
      fieldA: defA,
      operation: defB ? "subtract" : "multiply",
      fieldB: defB || undefined,
      constantValue: defB ? undefined : 0.25,
      type: "currency",
    };
    setCalculatedColumns([...calculatedColumns, newCalc]);
  };

  const updateCalculatedColumn = (id: string, updates: Partial<CalculatedColumn>) => {
    setCalculatedColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const removeCalculatedColumn = (id: string) => {
    setCalculatedColumns((prev) => prev.filter((c) => c.id !== id));
  };

  // Add filter
  const addFilter = () => {
    const defaultField = availableFields[0]?.key || "";
    setFilters([
      ...filters,
      {
        id: `flt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        field: defaultField,
        operator: "equals",
        value: "",
      },
    ]);
  };

  const updateFilter = (id: string, updates: Partial<CustomReportFilter>) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  };

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  // Compile active report columns (including selected raw columns + calculated columns + group by column)
  const activeReportColumns: ReportColumn[] = useMemo(() => {
    const cols: ReportColumn[] = [];

    // If groupBy is active, show the grouped field as column #1
    if (groupBy) {
      const gField = availableFields.find((f) => f.key === groupBy);
      cols.push({
        key: groupBy,
        label: columnConfigs[groupBy]?.customLabel || gField?.label || { ar: groupBy, en: groupBy },
        type: gField?.type || "text",
        align: columnConfigs[groupBy]?.align || "right",
      });
      cols.push({
        key: "_recordCount",
        label: { ar: "عدد الحركات والطلبات", en: "Record Count" },
        type: "number",
        align: "center",
      });
    }

    // Selected raw fields
    for (const key of selectedColumns) {
      if (groupBy && key === groupBy) continue;
      const fieldDef = availableFields.find((f) => f.key === key);
      cols.push({
        key,
        label: columnConfigs[key]?.customLabel || fieldDef?.label || { ar: key, en: key },
        type: fieldDef?.type || "text",
        align: columnConfigs[key]?.align || (fieldDef?.type === "currency" || fieldDef?.type === "number" ? "right" : "right"),
      });
    }

    // Dynamic calculated columns (if not grouped)
    if (!groupBy) {
      for (const calc of calculatedColumns) {
        cols.push({
          key: calc.id,
          label: calc.name,
          type: calc.type,
          align: "right",
        });
      }
    }

    return cols;
  }, [groupBy, selectedColumns, calculatedColumns, columnConfigs, availableFields]);

  // Execute Live Preview
  const previewExecution = useMemo(() => {
    return executeReportQuery({
      dataSource,
      selectedColumns,
      filters,
      filterMatchMode,
      dateField: dateField || undefined,
      dateRangePreset,
      customStartDate: customStartDate || undefined,
      customEndDate: customEndDate || undefined,
      groupBy: groupBy || undefined,
      calculatedColumns,
      columnConfigs,
      sortBy: sortBy || undefined,
      sortDirection,
      secondarySortBy: secondarySortBy || undefined,
      secondarySortDirection,
      lang: lang as "ar" | "en",
      liveData,
    });
  }, [
    dataSource,
    selectedColumns,
    filters,
    filterMatchMode,
    dateField,
    dateRangePreset,
    customStartDate,
    customEndDate,
    groupBy,
    calculatedColumns,
    columnConfigs,
    sortBy,
    sortDirection,
    secondarySortBy,
    secondarySortDirection,
    lang,
    liveData,
  ]);

  // Parse Tags from string
  const parsedTags = useMemo(() => {
    return tagsInput
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tagsInput]);

  // Handle Save
  const handleSave = () => {
    if (!nameAr.trim() && !nameEn.trim()) {
      toast.error(lang === "ar" ? "يرجى كتابة اسم التقرير" : "Please provide a report title");
      setActiveTab("info");
      return;
    }

    if (selectedColumns.length === 0 && !groupBy) {
      toast.error(lang === "ar" ? "يرجى تحديد عمود واحد على الأقل" : "Select at least one column");
      setActiveTab("columns");
      return;
    }

    onSave({
      ...(initialReport?.id ? { id: initialReport.id } : {}),
      name: {
        ar: nameAr.trim() || nameEn.trim(),
        en: nameEn.trim() || nameAr.trim(),
      },
      description: {
        ar: descAr.trim() || descEn.trim(),
        en: descEn.trim() || descAr.trim(),
      },
      category,
      dataSource,
      selectedColumns,
      columnConfigs,
      filters,
      filterMatchMode,
      dateField: dateField || undefined,
      dateRangePreset,
      customStartDate: customStartDate || undefined,
      customEndDate: customEndDate || undefined,
      groupBy: groupBy || undefined,
      calculatedColumns,
      chartType,
      tags: parsedTags,
      scheduleFrequency,
      sortBy: sortBy || undefined,
      sortDirection,
      secondarySortBy: secondarySortBy || undefined,
      secondarySortDirection,
      isPreset: false,
    });

    toast.success(
      lang === "ar"
        ? `تم حفظ منطق التقرير المخصص "${nameAr || nameEn}" بنجاح!`
        : `Report logic "${nameEn || nameAr}" saved successfully!`,
    );
    onClose();
  };

  // Quick Export directly from builder
  const handleQuickExportExcel = () => {
    exportReportToExcel({
      reportTitle: {
        ar: nameAr || "تقرير مخصص",
        en: nameEn || "Custom Report",
      },
      columns: activeReportColumns,
      rows: previewExecution.rows,
      summaryCards: previewExecution.summaryCards,
      lang: lang as "ar" | "en",
    });
    toast.success(lang === "ar" ? "تم تصدير المعاينة إلى Excel بنجاح" : "Preview exported to Excel");
  };

  const handleQuickExportCsv = () => {
    exportReportToCsv({
      reportTitle: {
        ar: nameAr || "تقرير مخصص",
        en: nameEn || "Custom Report",
      },
      columns: activeReportColumns,
      rows: previewExecution.rows,
      lang: lang as "ar" | "en",
    });
    toast.success(lang === "ar" ? "تم تصدير المعاينة إلى CSV بنجاح" : "Preview exported to CSV");
  };

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs ${isFullscreen ? "p-1 sm:p-2" : "p-2 sm:p-4 md:p-6"} overflow-y-auto`}>
      <div
        className={`relative w-full ${
          isFullscreen
            ? "max-w-[99vw] h-[98vh] max-h-[98vh] rounded-xl"
            : "max-w-7xl xl:max-w-[1540px] 2xl:max-w-[1720px] max-h-[94vh] rounded-2xl"
        } border border-border bg-card shadow-2xl overflow-hidden flex flex-col transition-all duration-200`}
      >
        {/* 1. Modal Top Bar */}
        <header className="flex items-center justify-between border-b border-border bg-secondary/80 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground">
                  {initialReport
                    ? lang === "ar"
                      ? "تعديل وتخصيص منطق التقرير المتقدم"
                      : "Customize Advanced Report Logic"
                    : lang === "ar"
                      ? "ستوديو بناء وتخصيص التقارير الذكية"
                      : "Enterprise Custom Report Studio"}
                </h2>
                <span className="rounded-full bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-black uppercase">
                  BI Pro
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "ar"
                  ? "خيارات شاملة: تجميع السجلات، حسابات وصيغ مخصصة، نطاقات زمنية، رسوم بيانية وتصدير"
                  : "Grouping, dynamic calculated columns, time windows, visual chart analytics & exports"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title={
                isFullscreen
                  ? lang === "ar"
                    ? "استعادة الحجم الطبيعي"
                    : "Restore Normal Size"
                  : lang === "ar"
                    ? "تكبير بعرض الشاشة الكامل"
                    : "Expand Fullscreen"
              }
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {/* 2. Wizard Navigation Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 dark:bg-muted/10 px-4 py-2.5 overflow-x-auto scrollbar-none">
          {[
            { id: "info", icon: Layers, label: { ar: "1. البيانات والمصدر", en: "1. Source & Basics" } },
            {
              id: "columns",
              icon: Calculator,
              label: { ar: "2. الأعمدة والعمليات الحسابية", en: "2. Columns & Formulas" },
              count: selectedColumns.length + calculatedColumns.length,
            },
            {
              id: "grouping",
              icon: BarChart2,
              label: { ar: "3. التجميع والرسم البياني", en: "3. Grouping & Charts" },
              badge: groupBy ? (lang === "ar" ? "مجمع" : "Grouped") : undefined,
            },
            {
              id: "filters",
              icon: SlidersHorizontal,
              label: { ar: "4. الشروط والنافذة الزمنية", en: "4. Filters & Time" },
              count: filters.length,
            },
            {
              id: "preview",
              icon: Eye,
              label: { ar: "5. المعاينة المباشرة", en: "5. Live Preview" },
              badge: `${previewExecution.totalCount} ${lang === "ar" ? "سجل" : "rows"}`,
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all shadow-xs ${
                  isActive
                    ? "bg-[#064e3b] text-white shadow-md ring-1 ring-emerald-600/40 dark:bg-[#064e3b] dark:text-emerald-50"
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                <Icon className={`size-4 shrink-0 ${isActive ? "text-emerald-300" : ""}`} />
                <span>{lang === "ar" ? tab.label.ar : tab.label.en}</span>
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? "bg-emerald-950/80 text-emerald-100 border border-emerald-600/30"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? "bg-emerald-800 text-emerald-100 border border-emerald-600/40"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. Wizard Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ============================================================== */}
          {/* TAB 1: SOURCE & BASICS */}
          {/* ============================================================== */}
          {activeTab === "info" && (
            <div className="space-y-6">
              {/* Report Titles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    {lang === "ar" ? "اسم التقرير المخصص (بالعربية) *" : "Report Name (Arabic) *"}
                  </label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: تحليل مبيعات فروع التجزئة ومعدل التحصيل"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    {lang === "ar" ? "اسم التقرير (بالإنجليزية)" : "Report Name (English)"}
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Retail Branch Sales & Collection Analytics"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Description & Category */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    {lang === "ar" ? "وصف وملاحظات التقرير" : "Description / Business Purpose"}
                  </label>
                  <input
                    type="text"
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    placeholder={
                      lang === "ar"
                        ? "الغرض من التقرير، والجمهور المستهدف (المدير المالي، مدير الفرع، المراجعة)"
                        : "Purpose of report and primary stakeholders"
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    {lang === "ar" ? "تصنيف التقرير" : "Category"}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="sales">{lang === "ar" ? "المبيعات" : "Sales"}</option>
                    <option value="pos">{lang === "ar" ? "نقاط البيع والفروع" : "POS Branches"}</option>
                    <option value="purchases">{lang === "ar" ? "المشتريات" : "Purchases"}</option>
                    <option value="inventory">{lang === "ar" ? "المخزون" : "Inventory"}</option>
                    <option value="financial">{lang === "ar" ? "المالية والمحاسبة" : "Financial"}</option>
                    <option value="partners">{lang === "ar" ? "العملاء والموردون" : "Partners"}</option>
                    <option value="hr">{lang === "ar" ? "الموارد البشرية" : "HR"}</option>
                    <option value="custom">{lang === "ar" ? "تقارير مخصصة" : "Custom"}</option>
                  </select>
                </div>
              </div>

              {/* Operational Metadata: Tags & Scheduling */}
              <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border/80 bg-secondary/30 p-3.5">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1.5">
                    <Tag className="size-3.5 text-primary" />
                    <span>{lang === "ar" ? "الوسوم والكلمات الدلالية (مفصولة بفاصلة)" : "Report Tags (comma separated)"}</span>
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="مبيعات, أسبوعي, ضرائب, فروع, تدقيق"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {parsedTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parsedTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1.5">
                    <Clock className="size-3.5 text-primary" />
                    <span>{lang === "ar" ? "دورية المراجعة والجدولة" : "Review / Schedule Frequency"}</span>
                  </label>
                  <select
                    value={scheduleFrequency}
                    onChange={(e) => setScheduleFrequency(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="on_demand">{lang === "ar" ? "عند الطلب (يدوياً)" : "On Demand"}</option>
                    <option value="daily">{lang === "ar" ? "يومياً (نهاية الوردية)" : "Daily"}</option>
                    <option value="weekly">{lang === "ar" ? "أسبوعياً (كل سبت)" : "Weekly"}</option>
                    <option value="monthly">{lang === "ar" ? "شهرياً (إقفال مالي)" : "Monthly"}</option>
                  </select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {lang === "ar"
                      ? "يساعد في فلترة وتوليد الملخصات الذكية للمدراء في الموعد المحدد"
                      : "Helps executive BI alerts trigger automatically"}
                  </p>
                </div>
              </div>

              {/* Visual Data Source Cards */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  {lang === "ar" ? "اختر مصدر البيانات الأساسي (Data Source) *" : "Select Core Data Source *"}
                </label>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
                  {(Object.keys(DATA_SOURCE_CATALOG) as DataSourceKey[]).map((dsKey) => {
                    const ds = DATA_SOURCE_CATALOG[dsKey];
                    const isSelected = dataSource === dsKey;

                    return (
                      <div
                        key={dsKey}
                        onClick={() => handleDataSourceChange(dsKey)}
                        className={`cursor-pointer rounded-xl border p-3.5 transition-all text-right ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30"
                            : "border-border bg-card hover:bg-secondary/60 hover:border-border/90"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-foreground">
                            {lang === "ar" ? ds.name.ar : ds.name.en}
                          </span>
                          <div
                            className={`flex size-7 items-center justify-center rounded-lg ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {isSelected ? <Check className="size-4" /> : <Layers className="size-3.5" />}
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {lang === "ar" ? ds.description.ar : ds.description.en}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: COLUMNS & FORMULAS */}
          {/* ============================================================== */}
          {activeTab === "columns" && (
            <div className="space-y-6">
              {/* Section 2.1: Available Fields Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {lang === "ar"
                        ? `أعمدة مصدر البيانات: ${DATA_SOURCE_CATALOG[dataSource].name.ar}`
                        : `Columns for: ${DATA_SOURCE_CATALOG[dataSource].name.en}`}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar"
                        ? "حدد الحقول التي ترغب في تضمينها في التقرير"
                        : "Check the fields to include in your report"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Btn
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedColumns(availableFields.map((f) => f.key))}
                      className="text-xs"
                    >
                      {lang === "ar" ? "تحديد الكل" : "Select All"}
                    </Btn>
                    <Btn
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedColumns([availableFields[0]?.key || "id"])}
                      className="text-xs"
                    >
                      {lang === "ar" ? "إعادة تعيين" : "Reset"}
                    </Btn>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {availableFields.map((field) => {
                    const isChecked = selectedColumns.includes(field.key);
                    return (
                      <button
                        key={field.key}
                        type="button"
                        onClick={() => toggleColumn(field.key)}
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-right transition-all ${
                          isChecked
                            ? "border-primary/50 bg-primary/10 shadow-xs"
                            : "border-border bg-card hover:bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex size-4.5 items-center justify-center rounded border ${
                              isChecked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background"
                            }`}
                          >
                            {isChecked && <Check className="size-3" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">
                              {lang === "ar" ? field.label.ar : field.label.en}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {field.key}
                            </span>
                          </div>
                        </div>

                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                          {field.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2.2: Reorder & Rename Selected Columns */}
              <div className="space-y-3 rounded-2xl border border-border/80 bg-secondary/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {lang === "ar" ? "ترتيب الأعمدة وتخصيص المسميات" : "Column Order & Display Labels"}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {lang === "ar"
                        ? "قم بتغيير ترتيب ظهور الأعمدة، وتعديل المسمى التجاري أو المحاذاة لكل عمود"
                        : "Reorder columns or override display titles and alignments"}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">
                    {selectedColumns.length} {lang === "ar" ? "عمود محدد" : "active"}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 max-h-72 overflow-y-auto pr-1">
                  {selectedColumns.map((colKey, index) => {
                    const fieldDef = availableFields.find((f) => f.key === colKey);
                    const config = columnConfigs[colKey] || {};

                    return (
                      <div
                        key={colKey}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-2.5 shadow-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">
                              {lang === "ar" ? fieldDef?.label.ar : fieldDef?.label.en}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono truncate block">{colKey}</span>
                          </div>
                        </div>

                        {/* Reorder Up / Down */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveColumn(index, "up")}
                            className="flex size-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-secondary disabled:opacity-30"
                            title="Move Up"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === selectedColumns.length - 1}
                            onClick={() => moveColumn(index, "down")}
                            className="flex size-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-secondary disabled:opacity-30"
                            title="Move Down"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>

                          {/* Alignment selector */}
                          <select
                            value={columnConfigs[colKey]?.align || "right"}
                            onChange={(e) =>
                              setColumnConfigs({
                                ...columnConfigs,
                                [colKey]: {
                                  ...(columnConfigs[colKey] || { key: colKey }),
                                  key: colKey,
                                  align: e.target.value as any,
                                },
                              })
                            }
                            className="rounded border border-border bg-background px-2 py-1 text-[11px] font-bold text-foreground"
                          >
                            <option value="right">{lang === "ar" ? "يمين" : "Right"}</option>
                            <option value="center">{lang === "ar" ? "وسط" : "Center"}</option>
                            <option value="left">{lang === "ar" ? "يسار" : "Left"}</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2.3: Dynamic Calculated Columns Studio */}
              <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Calculator className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                        {lang === "ar" ? "الأعمدة الحسابية والصيغ المخصصة" : "Dynamic Calculated Columns (Formulas)"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {lang === "ar"
                          ? "أضف معادلات رياضية (مثل: هامش الربح، نسبة التحصيل، ضرب في نسبة مئوية)"
                          : "Create custom calculated metrics (e.g. margin, percentage ratio, discount rate)"}
                      </p>
                    </div>
                  </div>
                  <Btn
                    variant="solid"
                    size="sm"
                    onClick={addCalculatedColumn}
                    className="text-xs gap-1 font-bold"
                  >
                    <Plus className="size-3" />
                    {lang === "ar" ? "إضافة معادلة حسابية" : "Add Formula Column"}
                  </Btn>
                </div>

                {calculatedColumns.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    {lang === "ar"
                      ? "لا توجد أعمدة حسابية مخصصة. يمكنك إضافة عمود لحساب نسبة التحصيل أو هامش الربح تلقائياً."
                      : "No calculated columns added. Click Add Formula Column to compute custom metrics."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {calculatedColumns.map((calc) => (
                      <div
                        key={calc.id}
                        className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <input
                              type="text"
                              value={calc.name.ar}
                              onChange={(e) =>
                                updateCalculatedColumn(calc.id, {
                                  name: { ...calc.name, ar: e.target.value },
                                })
                              }
                              placeholder="اسم العمود (مثال: هامش الربح 25%)"
                              className="w-full rounded border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={calc.type}
                              onChange={(e) =>
                                updateCalculatedColumn(calc.id, { type: e.target.value as any })
                              }
                              className="rounded border border-border bg-background px-2 py-1 text-xs font-bold text-foreground"
                            >
                              <option value="currency">{lang === "ar" ? "عملة (ج.م)" : "Currency"}</option>
                              <option value="number">{lang === "ar" ? "رقم / نسبة" : "Number"}</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => removeCalculatedColumn(calc.id)}
                              className="flex size-6 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Formula Controls */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* Field A */}
                          <select
                            value={calc.fieldA}
                            onChange={(e) => updateCalculatedColumn(calc.id, { fieldA: e.target.value })}
                            className="rounded-lg border border-border bg-background px-2.5 py-1 font-bold text-foreground"
                          >
                            {numericFields.map((nf) => (
                              <option key={nf.key} value={nf.key}>
                                {lang === "ar" ? nf.label.ar : nf.label.en}
                              </option>
                            ))}
                          </select>

                          {/* Operator */}
                          <select
                            value={calc.operation}
                            onChange={(e) =>
                              updateCalculatedColumn(calc.id, { operation: e.target.value as any })
                            }
                            className="rounded-lg border border-primary/40 bg-primary/10 text-primary px-2 py-1 font-black"
                          >
                            <option value="add">+ {lang === "ar" ? "جمع" : "Add"}</option>
                            <option value="subtract">- {lang === "ar" ? "طرح" : "Subtract"}</option>
                            <option value="multiply">× {lang === "ar" ? "ضرب في" : "Multiply by"}</option>
                            <option value="divide">÷ {lang === "ar" ? "قسمة على" : "Divide by"}</option>
                            <option value="percentage_of">% {lang === "ar" ? "نسبة مئوية من" : "% of"}</option>
                          </select>

                          {/* Field B or Constant */}
                          {calc.operation === "multiply" || calc.operation === "divide" ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-muted-foreground">
                                {lang === "ar" ? "قيمة ثابتة:" : "Constant:"}
                              </span>
                              <input
                                type="number"
                                step="any"
                                value={calc.constantValue ?? 1}
                                onChange={(e) =>
                                  updateCalculatedColumn(calc.id, {
                                    constantValue: Number(e.target.value) || 0,
                                    fieldB: undefined,
                                  })
                                }
                                className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-xs font-mono text-foreground"
                              />
                            </div>
                          ) : (
                            <select
                              value={calc.fieldB || ""}
                              onChange={(e) =>
                                updateCalculatedColumn(calc.id, {
                                  fieldB: e.target.value || undefined,
                                })
                              }
                              className="rounded-lg border border-border bg-background px-2.5 py-1 font-bold text-foreground"
                            >
                              <option value="">{lang === "ar" ? "اختر حقل..." : "Select field..."}</option>
                              {numericFields.map((nf) => (
                                <option key={nf.key} value={nf.key}>
                                  {lang === "ar" ? nf.label.ar : nf.label.en}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: GROUPING, AGGREGATIONS & CHARTS */}
          {/* ============================================================== */}
          {activeTab === "grouping" && (
            <div className="space-y-6">
              {/* Group By Configuration */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {lang === "ar" ? "تجميع السجلات والبيانات (Group By)" : "Data Grouping & Summary Breakdown"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar"
                        ? "قم بتجميع السجلات حسب فرع، عميل، صنف، أو حالة لحساب المجاميع الإجمالية لكل مجموعة"
                        : "Group records by facility, partner, product or status for pivot-style aggregates"}
                    </p>
                  </div>
                  {groupBy && (
                    <Btn
                      variant="outline"
                      size="sm"
                      onClick={() => setGroupBy("")}
                      className="text-xs text-muted-foreground"
                    >
                      {lang === "ar" ? "إلغاء التجميع" : "Clear Grouping"}
                    </Btn>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  <div
                    onClick={() => setGroupBy("")}
                    className={`cursor-pointer rounded-xl border p-3 text-right transition-all ${
                      !groupBy
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                        : "border-border bg-secondary/30 hover:bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {lang === "ar" ? "بدون تجميع (سجلات تفصيلية)" : "No Grouping (Detailed Rows)"}
                      </span>
                      {!groupBy && <Check className="size-4 text-primary" />}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {lang === "ar" ? "عرض كل الحركات سطر بسطر" : "Show all individual rows"}
                    </p>
                  </div>

                  {groupByOptions.map((f) => {
                    const isSelected = groupBy === f.key;
                    return (
                      <div
                        key={f.key}
                        onClick={() => setGroupBy(f.key)}
                        className={`cursor-pointer rounded-xl border p-3 text-right transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                            : "border-border bg-card hover:bg-secondary/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            {lang === "ar" ? f.label.ar : f.label.en}
                          </span>
                          {isSelected && <Check className="size-4 text-primary" />}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground font-mono">
                          group by `{f.key}`
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart Visualization Selector */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="border-b border-border/70 pb-3">
                  <h3 className="text-sm font-bold text-foreground">
                    {lang === "ar" ? "العرض والتمثيل البياني للتقرير" : "Report Visualization & BI Presentation"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {lang === "ar"
                      ? "اختر كيف ترغب في استعراض بيانات التقرير (جدول، أعمدة بيانية، دائري، أو بطاقات ذكية)"
                      : "Choose visual presentation format for executive briefing"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      id: "table",
                      icon: TableIcon,
                      title: { ar: "جدول بيانات فقط", en: "Data Table Only" },
                      desc: { ar: "جدول تفاعلي مع فرز وبحث", en: "Standard interactive table" },
                    },
                    {
                      id: "bar",
                      icon: BarChart2,
                      title: { ar: "مخطط أعمدة بيانية", en: "Bar Chart Analytics" },
                      desc: { ar: "مقارنة القيم والمبيعات بيانياً", en: "Compare metrics visually" },
                    },
                    {
                      id: "pie",
                      icon: PieChartIcon,
                      title: { ar: "توزيع نسبي ودائري", en: "Donut / Pie Breakdown" },
                      desc: { ar: "توزيع النسب المئوية للحصص", en: "Proportion and share of total" },
                    },
                    {
                      id: "kpi",
                      icon: Sparkles,
                      title: { ar: "بطاقات مؤشرات عليا + جدول", en: "KPI Scorecards + Table" },
                      desc: { ar: "تركيز على الأرقام التنفيذية", en: "High-impact summary totals" },
                    },
                  ].map((item) => {
                    const isSelected = chartType === item.id;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setChartType(item.id as any)}
                        className={`cursor-pointer rounded-xl border p-3.5 transition-all text-right ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30"
                            : "border-border bg-secondary/30 hover:bg-secondary/70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`size-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          {isSelected && <Check className="size-4 text-primary" />}
                        </div>
                        <div className="mt-2 text-xs font-black text-foreground">
                          {lang === "ar" ? item.title.ar : item.title.en}
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {lang === "ar" ? item.desc.ar : item.desc.en}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: FILTERS, TIME WINDOW & SORTING */}
          {/* ============================================================== */}
          {activeTab === "filters" && (
            <div className="space-y-6">
              {/* Section 4.1: Date Range Window */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-primary" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                        {lang === "ar" ? "النافذة الزمنية وتاريخ التقرير" : "Date Range & Time Window"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {lang === "ar"
                          ? "تصفية البيانات تلقائياً حسب التاريخ (اليوم، الشهر، الربع، أو فترة مخصصة)"
                          : "Filter records automatically by posting or transaction date"}
                      </p>
                    </div>
                  </div>

                  {dateFieldOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        {lang === "ar" ? "حقل التاريخ:" : "Date Field:"}
                      </span>
                      <select
                        value={dateField}
                        onChange={(e) => setDateField(e.target.value)}
                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground"
                      >
                        <option value="">{lang === "ar" ? "بدون تحديد حقل" : "None"}</option>
                        {dateFieldOptions.map((df) => (
                          <option key={df.key} value={df.key}>
                            {lang === "ar" ? df.label.ar : df.label.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Preset Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "all", label: { ar: "كل الفترات", en: "All Time" } },
                    { id: "today", label: { ar: "اليوم", en: "Today" } },
                    { id: "yesterday", label: { ar: "أمس", en: "Yesterday" } },
                    { id: "last_7_days", label: { ar: "آخر 7 أيام", en: "Last 7 Days" } },
                    { id: "this_month", label: { ar: "الشهر الحالي", en: "This Month" } },
                    { id: "last_month", label: { ar: "الشهر السابق", en: "Last Month" } },
                    { id: "this_quarter", label: { ar: "الربع الحالي", en: "This Quarter" } },
                    { id: "this_year", label: { ar: "السنة الحالية", en: "This Year" } },
                    { id: "custom", label: { ar: "فترة مخصصة", en: "Custom Range" } },
                  ].map((preset) => {
                    const isSelected = dateRangePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setDateRangePreset(preset.id as any)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                        }`}
                      >
                        {lang === "ar" ? preset.label.ar : preset.label.en}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Pickers */}
                {dateRangePreset === "custom" && (
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        {lang === "ar" ? "من تاريخ:" : "From:"}
                      </span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        {lang === "ar" ? "إلى تاريخ:" : "To:"}
                      </span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4.2: Query Conditions & Match Mode */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {lang === "ar" ? "شروط وقواعد الفلترة (Query Engine)" : "Query Filters & Rules"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar"
                        ? "أضف شروط لتصفية السجلات (مثال: القيمة أكبر من 10,000 ج.م أو الحالة = مدفوع)"
                        : "Define rules to filter rows (e.g. Amount > 10,000 or Status = paid)"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Match Mode Toggle */}
                    <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setFilterMatchMode("all")}
                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                          filterMatchMode === "all"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {lang === "ar" ? "مطابقة الكل (AND)" : "Match ALL (AND)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMatchMode("any")}
                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                          filterMatchMode === "any"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {lang === "ar" ? "مطابقة أي شرط (OR)" : "Match ANY (OR)"}
                      </button>
                    </div>

                    <Btn variant="solid" size="sm" onClick={addFilter} className="gap-1.5 text-xs font-bold">
                      <Plus className="size-3.5" />
                      {lang === "ar" ? "إضافة شرط" : "Add Condition"}
                    </Btn>
                  </div>
                </div>

                {filters.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-6 text-center text-muted-foreground">
                    <SlidersHorizontal className="mx-auto size-7 opacity-40 mb-1.5" />
                    <p className="text-xs font-bold text-foreground">
                      {lang === "ar" ? "لا توجد شروط فلترة حالياً" : "No filters currently applied"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {lang === "ar"
                        ? "سيتم استخراج وعرض جميع السجلات المتاحة لمصدر البيانات"
                        : "All records from the selected data source will be included"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filters.map((flt, index) => {
                      const currentField = availableFields.find((f) => f.key === flt.field);

                      return (
                        <div
                          key={flt.id}
                          className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-xs"
                        >
                          <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-muted-foreground">
                            {index + 1}
                          </span>

                          {/* Field Selector */}
                          <div className="min-w-[140px] flex-1">
                            <select
                              value={flt.field}
                              onChange={(e) => updateFilter(flt.id, { field: e.target.value, value: "" })}
                              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none"
                            >
                              {availableFields.map((f) => (
                                <option key={f.key} value={f.key}>
                                  {lang === "ar" ? f.label.ar : f.label.en}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Operator Selector */}
                          <div className="min-w-[140px]">
                            <select
                              value={flt.operator}
                              onChange={(e) =>
                                updateFilter(flt.id, { operator: e.target.value as FilterOperator })
                              }
                              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none"
                            >
                              <option value="equals">{lang === "ar" ? "يساوي (=)" : "Equals (=)"}</option>
                              <option value="not_equals">{lang === "ar" ? "لا يساوي (≠)" : "Not equals (≠)"}</option>
                              <option value="contains">{lang === "ar" ? "يحتوي على" : "Contains"}</option>
                              <option value="starts_with">{lang === "ar" ? "يبدأ بـ" : "Starts with"}</option>
                              <option value="ends_with">{lang === "ar" ? "ينتهي بـ" : "Ends with"}</option>
                              <option value="greater_than">{lang === "ar" ? "أكبر من (>)" : "Greater than (>)"}</option>
                              <option value="less_than">{lang === "ar" ? "أقل من (<)" : "Less than (<)"}</option>
                              <option value="between">{lang === "ar" ? "بين قيمتين" : "Between"}</option>
                              <option value="is_empty">{lang === "ar" ? "فارغ / ليس له قيمة" : "Is Empty"}</option>
                              <option value="is_not_empty">{lang === "ar" ? "له قيمة / غير فارغ" : "Is Not Empty"}</option>
                            </select>
                          </div>

                          {/* Value Input */}
                          {flt.operator !== "is_empty" && flt.operator !== "is_not_empty" && (
                            <div className="min-w-[140px] flex-1">
                              {currentField?.options ? (
                                <select
                                  value={flt.value}
                                  onChange={(e) => updateFilter(flt.id, { value: e.target.value })}
                                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none"
                                >
                                  <option value="">{lang === "ar" ? "اختر القيمة..." : "Select..."}</option>
                                  {currentField.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {lang === "ar" ? opt.label.ar : opt.label.en}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={
                                    currentField?.type === "number" || currentField?.type === "currency"
                                      ? "number"
                                      : "text"
                                  }
                                  value={flt.value}
                                  onChange={(e) => updateFilter(flt.id, { value: e.target.value })}
                                  placeholder={lang === "ar" ? "قيمة الشرط..." : "Filter value..."}
                                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              )}
                            </div>
                          )}

                          {/* Extra Value for 'between' */}
                          {flt.operator === "between" && (
                            <div className="min-w-[100px] flex-1">
                              <input
                                type="number"
                                value={flt.value2 || ""}
                                onChange={(e) => updateFilter(flt.id, { value2: e.target.value })}
                                placeholder={lang === "ar" ? "إلى..." : "To..."}
                                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                              />
                            </div>
                          )}

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeFilter(flt.id)}
                            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 4.3: Dual Sorting Rule */}
              <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3">
                <div className="text-xs font-bold text-foreground">
                  {lang === "ar" ? "ترتيب النتائج (مستوى أول ومستوى ثانوي)" : "Sorting Order (Primary & Secondary)"}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Primary Sort */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                      {lang === "ar" ? "الترتيب الأساسي:" : "Primary:"}
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                    >
                      <option value="">{lang === "ar" ? "بدون تحديد" : "None"}</option>
                      {availableFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {lang === "ar" ? f.label.ar : f.label.en}
                        </option>
                      ))}
                    </select>
                    <select
                      value={sortDirection}
                      onChange={(e) => setSortDirection(e.target.value as any)}
                      className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                    >
                      <option value="desc">{lang === "ar" ? "تنازلي (الأكبر)" : "Desc"}</option>
                      <option value="asc">{lang === "ar" ? "تصاعدي (الأصغر)" : "Asc"}</option>
                    </select>
                  </div>

                  {/* Secondary Sort */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                      {lang === "ar" ? "الترتيب الثانوي:" : "Secondary:"}
                    </span>
                    <select
                      value={secondarySortBy}
                      onChange={(e) => setSecondarySortBy(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                    >
                      <option value="">{lang === "ar" ? "بدون ترتيب إضافي" : "None"}</option>
                      {availableFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {lang === "ar" ? f.label.ar : f.label.en}
                        </option>
                      ))}
                    </select>
                    <select
                      value={secondarySortDirection}
                      onChange={(e) => setSecondarySortDirection(e.target.value as any)}
                      className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                    >
                      <option value="desc">{lang === "ar" ? "تنازلي" : "Desc"}</option>
                      <option value="asc">{lang === "ar" ? "تصاعدي" : "Asc"}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: LIVE PREVIEW & EXPORT */}
          {/* ============================================================== */}
          {activeTab === "preview" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {lang === "ar"
                      ? `معاينة حية للمخرجات: ${nameAr || nameEn || "تقرير مخصص"}`
                      : `Live Output Preview: ${nameEn || nameAr || "Custom Report"}`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {lang === "ar"
                      ? `تمت معالجة ${previewExecution.totalCount} سجل في قاعدة البيانات وفق الشروط المحددة`
                      : `Processed ${previewExecution.totalCount} live records in database`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Btn
                    variant="outline"
                    size="sm"
                    onClick={handleQuickExportExcel}
                    className="gap-1.5 text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-300 font-bold"
                  >
                    <FileSpreadsheet className="size-4 text-emerald-600" />
                    {lang === "ar" ? "تصدير إلى Excel (.xlsx)" : "Export Excel (.xlsx)"}
                  </Btn>

                  <Btn
                    variant="outline"
                    size="sm"
                    onClick={handleQuickExportCsv}
                    className="gap-1.5 text-xs font-bold text-foreground"
                  >
                    <Download className="size-3.5" />
                    {lang === "ar" ? "تصدير CSV" : "Export CSV"}
                  </Btn>
                </div>
              </div>

              {/* KPI Summary Strip */}
              {previewExecution.summaryCards.length > 0 && (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                  {previewExecution.summaryCards.map((c) => (
                    <div key={c.id} className="rounded-xl border border-border bg-card p-3 shadow-xs">
                      <div className="text-[11px] font-bold text-muted-foreground">
                        {lang === "ar" ? c.label.ar : c.label.en}
                      </div>
                      <div className="mt-1 text-lg font-black text-foreground">
                        {typeof c.value === "number" ? money(c.value) : c.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Visual Chart Preview if enabled */}
              {chartType === "bar" && previewExecution.rows.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <div className="text-xs font-black uppercase text-foreground tracking-wider">
                    {lang === "ar" ? "مخطط الأعمدة البيانية التفاعلي" : "Interactive Bar Chart Analytics"}
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={previewExecution.rows.slice(0, 10).map((r) => {
                          const xKey = groupBy || activeReportColumns[0]?.key || "id";
                          const yKey =
                            activeReportColumns.find((c) => c.type === "currency" || c.type === "number")?.key ||
                            "_recordCount";
                          return {
                            name: String(r[xKey] ?? "—").slice(0, 16),
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

              {chartType === "pie" && previewExecution.rows.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <div className="text-xs font-black uppercase text-foreground tracking-wider">
                    {lang === "ar" ? "مخطط التوزيع الدائري والنسبي" : "Donut / Pie Share Distribution"}
                  </div>
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={previewExecution.rows.slice(0, 8).map((r, i) => {
                            const labelKey = groupBy || activeReportColumns[0]?.key || "id";
                            const numKey =
                              activeReportColumns.find((c) => c.type === "currency" || c.type === "number")?.key ||
                              "_recordCount";
                            return {
                              name: String(r[labelKey] ?? "—"),
                              value: Number(r[numKey]) || 1,
                            };
                          })}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {previewExecution.rows.slice(0, 8).map((_, index) => (
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

              {/* Data Table Preview */}
              <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="sticky top-0 border-b border-border bg-secondary/90 text-muted-foreground font-bold backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      {activeReportColumns.map((col) => (
                        <th
                          key={col.key}
                          className={`py-2.5 px-3 ${col.align === "center" ? "text-center" : col.align === "left" ? "text-left" : "text-right"}`}
                        >
                          {lang === "ar" ? col.label.ar : col.label.en}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {previewExecution.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeReportColumns.length + 1}
                          className="py-8 text-center text-muted-foreground"
                        >
                          {lang === "ar"
                            ? "لا توجد نتائج مطابقة للشروط والنافذة الزمنية المحددة"
                            : "No records match current filter rules"}
                        </td>
                      </tr>
                    ) : (
                      previewExecution.rows.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-secondary/40 font-medium">
                          <td className="py-2 px-3 text-center text-muted-foreground/60">{idx + 1}</td>
                          {activeReportColumns.map((col) => {
                            const val = row[col.key];
                            return (
                              <td
                                key={col.key}
                                className={`py-2 px-3 text-foreground ${
                                  col.align === "center"
                                    ? "text-center"
                                    : col.align === "left"
                                      ? "text-left"
                                      : "text-right"
                                }`}
                              >
                                {col.type === "currency"
                                  ? money(Number(val) || 0)
                                  : String(val ?? "—")}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>

                  {/* Optional Footer Totals Strip */}
                  {previewExecution.rows.length > 0 && (
                    <tfoot className="border-t-2 border-border bg-secondary/80 font-black text-foreground">
                      <tr>
                        <td className="py-2.5 px-3 text-center">Σ</td>
                        {activeReportColumns.map((col) => {
                          const isNumeric = col.type === "currency" || col.type === "number";
                          const total = isNumeric
                            ? previewExecution.rows.reduce((acc, r) => acc + (Number(r[col.key]) || 0), 0)
                            : null;
                          return (
                            <td
                              key={col.key}
                              className={`py-2.5 px-3 ${
                                col.align === "center"
                                  ? "text-center"
                                  : col.align === "left"
                                    ? "text-left"
                                    : "text-right"
                              }`}
                            >
                              {total !== null
                                ? col.type === "currency"
                                  ? money(total)
                                  : total
                                : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {previewExecution.rows.length > 15 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {lang === "ar"
                    ? `... ويوجد ${previewExecution.rows.length - 15} سجل إضافي سيظهر في جدول التقرير الكامل والتصدير`
                    : `... and ${previewExecution.rows.length - 15} more records in full report output`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 4. Modal Footer Controls */}
        <footer className="flex items-center justify-between border-t border-border bg-secondary/50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            {activeTab !== "info" && (
              <Btn
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === "columns") setActiveTab("info");
                  if (activeTab === "grouping") setActiveTab("columns");
                  if (activeTab === "filters") setActiveTab("grouping");
                  if (activeTab === "preview") setActiveTab("filters");
                }}
                className="text-xs"
              >
                {lang === "ar" ? "السابق" : "Back"}
              </Btn>
            )}

            {activeTab !== "preview" && (
              <Btn
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === "info") setActiveTab("columns");
                  if (activeTab === "columns") setActiveTab("grouping");
                  if (activeTab === "grouping") setActiveTab("filters");
                  if (activeTab === "filters") setActiveTab("preview");
                }}
                className="text-xs"
              >
                {lang === "ar" ? "التالي" : "Next"}
              </Btn>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={onClose} className="text-xs">
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </Btn>

            <Btn variant="solid" size="sm" onClick={handleSave} className="gap-1.5 text-xs font-bold shadow-md">
              <Save className="size-4" />
              {lang === "ar" ? "حفظ التقرير ومنطقه" : "Save Report Logic"}
            </Btn>
          </div>
        </footer>
      </div>
    </div>
  );
}
