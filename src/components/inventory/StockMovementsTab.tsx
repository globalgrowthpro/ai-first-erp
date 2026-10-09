import { useState, useMemo } from "react";
import {
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  Plus,
  FileSpreadsheet,
  RotateCcw,
  Search,
  Filter,
  Calendar,
  Clock,
  Warehouse as WarehouseIcon,
  Package,
  Hash,
  Check,
  AlertCircle,
  FileText,
  Printer,
  CheckCircle2,
  X,
  TrendingDown,
  TrendingUp,
  Receipt,
  Layers,
  Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useI18n } from "@/lib/i18n";
import { DataTable, Td, Btn, TablePagination, usePagination } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  StockMovementRecord,
  StockMoveType,
  NewStockMovePayload,
  InventoryProduct,
  InventoryWarehouse,
} from "@/lib/inventory-store";
import { formatDateTime } from "@/lib/date-utils";
import { safeDownloadWorkbook } from "@/lib/excel-utils";

interface StockMovementsTabProps {
  movements: StockMovementRecord[];
  products: InventoryProduct[];
  warehouses: InventoryWarehouse[];
  onRecordMove: (payload: NewStockMovePayload) => Promise<any>;
  onRefresh: () => Promise<any> | void;
}

export function StockMovementsTab({
  movements,
  products,
  warehouses,
  onRecordMove,
  onRefresh,
}: StockMovementsTabProps) {
  const { pick, money, n, dir } = useI18n();

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | StockMoveType>("all");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<StockMovementRecord | null>(null);

  // Form States for New Movement
  const [formMoveType, setFormMoveType] = useState<StockMoveType>("in");
  const [formProductId, setFormProductId] = useState<string>("");
  const [formFromWhId, setFormFromWhId] = useState<string>("");
  const [formToWhId, setFormToWhId] = useState<string>("");
  const [formQuantity, setFormQuantity] = useState<number>(10);
  const [formUnitCost, setFormUnitCost] = useState<number>(0);
  const [formReference, setFormReference] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formMovedAt, setFormMovedAt] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Selected product details for new movement form
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === formProductId);
  }, [products, formProductId]);

  // Open Record Modal helper
  const handleOpenRecordModal = (type: StockMoveType = "in") => {
    setFormMoveType(type);
    const firstProd = products[0];
    setFormProductId(firstProd ? firstProd.id : "");
    setFormUnitCost(firstProd ? firstProd.costPrice : 0);
    setFormQuantity(10);
    setFormReference("");
    setFormNotes("");
    setFormMovedAt(new Date().toISOString().slice(0, 16));
    setFormError(null);

    const defaultSourceWh = warehouses[0]?.id || "";
    const defaultDestWh = warehouses[1]?.id || warehouses[0]?.id || "";

    if (type === "transfer") {
      setFormFromWhId(defaultSourceWh);
      setFormToWhId(defaultDestWh !== defaultSourceWh ? defaultDestWh : "");
    } else if (type === "in") {
      setFormFromWhId("");
      setFormToWhId(defaultSourceWh);
    } else {
      setFormFromWhId(defaultSourceWh);
      setFormToWhId("");
    }

    setIsRecordModalOpen(true);
  };

  // Sync Unit Cost when product changes
  const handleProductChange = (prodId: string) => {
    setFormProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setFormUnitCost(prod.costPrice);
    }
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    let totalInQty = 0;
    let totalInVal = 0;
    let totalOutQty = 0;
    let totalOutVal = 0;
    let transferCount = 0;
    let adjustmentCount = 0;

    for (const m of movements) {
      if (m.moveType === "in") {
        totalInQty += m.quantity;
        totalInVal += m.totalCost;
      } else if (m.moveType === "out") {
        totalOutQty += m.quantity;
        totalOutVal += m.totalCost;
      } else if (m.moveType === "transfer") {
        transferCount++;
      } else if (m.moveType === "adjustment") {
        adjustmentCount++;
      }
    }

    return {
      totalCount: movements.length,
      totalInQty,
      totalInVal,
      totalOutQty,
      totalOutVal,
      transferCount,
      adjustmentCount,
    };
  }, [movements]);

  // Filter Movements
  const filteredMovements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return movements.filter((m) => {
      // Type filter
      if (selectedType !== "all" && m.moveType !== selectedType) {
        return false;
      }

      // Warehouse filter
      if (selectedWarehouseId !== "all") {
        if (m.fromWarehouseId !== selectedWarehouseId && m.toWarehouseId !== selectedWarehouseId) {
          return false;
        }
      }

      // Date filter
      if (dateFilter !== "all") {
        const mDate = new Date(m.movedAt);
        if (dateFilter === "today") {
          const mDateStr = mDate.toISOString().slice(0, 10);
          if (mDateStr !== todayStr) return false;
        } else if (dateFilter === "week") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (mDate < sevenDaysAgo) return false;
        } else if (dateFilter === "month") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (mDate < thirtyDaysAgo) return false;
        }
      }

      // Search Query
      if (q) {
        const matchNo = m.moveNo.toLowerCase().includes(q);
        const matchSku = m.productSku.toLowerCase().includes(q);
        const matchNameAr = m.productName.ar.toLowerCase().includes(q);
        const matchNameEn = m.productName.en.toLowerCase().includes(q);
        const matchRef = (m.reference || "").toLowerCase().includes(q);
        const matchFromWh = (m.fromWarehouseName?.ar || "").toLowerCase().includes(q);
        const matchToWh = (m.toWarehouseName?.ar || "").toLowerCase().includes(q);

        return (
          matchNo ||
          matchSku ||
          matchNameAr ||
          matchNameEn ||
          matchRef ||
          matchFromWh ||
          matchToWh
        );
      }

      return true;
    });
  }, [movements, searchQuery, selectedType, selectedWarehouseId, dateFilter]);

  // Pagination
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
    paginatedItems: paginatedMovements,
  } = usePagination(filteredMovements, 15);

  // Handle Refresh
  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Submit New Movement Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formProductId) {
      setFormError(pick({ ar: "يرجى تحديد الصنف أولاً", en: "Please select a product first" }));
      return;
    }

    if (formQuantity <= 0) {
      setFormError(pick({ ar: "الكمية يجب أن تكون أكبر من صفر", en: "Quantity must be greater than zero" }));
      return;
    }

    if (formMoveType === "transfer") {
      if (!formFromWhId || !formToWhId) {
        setFormError(pick({ ar: "يرجى تحديد مستودع المصدر ومستودع الوجهة", en: "Please select both source and destination warehouses" }));
        return;
      }
      if (formFromWhId === formToWhId) {
        setFormError(pick({ ar: "لا يمكن التحويل لنفس المستودع", en: "Source and destination cannot be the same" }));
        return;
      }
    } else if (formMoveType === "in") {
      if (!formToWhId) {
        setFormError(pick({ ar: "يرجى تحديد مستودع الوجهة المستلم", en: "Please select the destination warehouse" }));
        return;
      }
    } else if (formMoveType === "out") {
      if (!formFromWhId) {
        setFormError(pick({ ar: "يرجى تحديد مستودع المصدر المنصرف منه", en: "Please select the source warehouse" }));
        return;
      }
    }

    try {
      setFormSubmitting(true);
      await onRecordMove({
        moveType: formMoveType,
        productId: formProductId,
        quantity: formQuantity,
        fromWarehouseId: formFromWhId || null,
        toWarehouseId: formToWhId || null,
        unitCost: formUnitCost,
        reference: formReference.trim() || undefined,
        notes: formNotes.trim() || undefined,
        movedAt: new Date(formMovedAt).toISOString(),
      });
      setIsRecordModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || pick({ ar: "حدث خطأ أثناء حفظ الحركة", en: "Failed to record movement" }));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    const dataToExport = filteredMovements.map((m) => {
      const dt = formatDateTime(m.movedAt, "ar");
      const typeLabel =
        m.moveType === "in"
          ? "وارد مخزني (توريد)"
          : m.moveType === "out"
          ? "صادر مخزني (صرف/مبيعات)"
          : m.moveType === "transfer"
          ? "تحويل داخلي بين الفروع"
          : "تسوية جردية";

      return {
        "رقم الحركة": m.moveNo,
        "نوع الحركة": typeLabel,
        "التاريخ": dt.date,
        "الوقت": dt.time,
        "كود الصنف (SKU)": m.productSku,
        "اسم الصنف بالعربية": m.productName.ar,
        "اسم الصنف بالإنجليزية": m.productName.en,
        "التصنيف": m.categoryName?.ar || "-",
        "من مستودع": m.fromWarehouseName?.ar || "-",
        "إلى مستودع": m.toWarehouseName?.ar || "-",
        "الكمية": m.quantity,
        "وحدة القياس": m.unitName?.ar || "قطعة",
        "سعر تكلفة الوحدة": m.unitCost,
        "القيمة الإجمالية (ج.م)": m.totalCost,
        "المرجع / السند": m.reference,
        "ملاحظات": m.notes || "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Auto fit column widths
    const colWidths = Object.keys(dataToExport[0] || {}).map((key) => ({
      wch: Math.max(key.length * 2, 16),
    }));
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock_Movements");

    const dateSuffix = new Date().toISOString().slice(0, 10);
    safeDownloadWorkbook(workbook, `سجل_حركات_المخزون_${dateSuffix}.xlsx`);
  };

  // Move Type Badge Renderer
  const renderMoveTypeBadge = (type: StockMoveType) => {
    switch (type) {
      case "in":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>{pick({ ar: "وارد مخزني", en: "Inbound" })}</span>
          </span>
        );
      case "out":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{pick({ ar: "صادر / مبيعات", en: "Outbound" })}</span>
          </span>
        );
      case "transfer":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/25">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{pick({ ar: "تحويل بين فروع", en: "Transfer" })}</span>
          </span>
        );
      case "adjustment":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{pick({ ar: "تسوية جردية", en: "Adjustment" })}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Stats Bar (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Ledger Operations */}
        <div className="surface-panel rounded-2xl p-4 shadow-sm border border-border/60 hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">
              {pick({ ar: "إجمالي الحركات", en: "Total Movements" })}
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Hash className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-foreground">
              {n(metrics.totalCount)}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {pick({ ar: "حركة مقيدة بالسجل", en: "recorded entries" })}
            </span>
          </div>
        </div>

        {/* Inbound Receipts */}
        <div className="surface-panel rounded-2xl p-4 shadow-sm border border-border/60 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {pick({ ar: "الوارد المخزني", en: "Inbound Supply" })}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {n(metrics.totalInQty)}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {pick({ ar: "بقيمة ", en: "Valued at " })}
              <strong className="text-foreground font-mono">{money(metrics.totalInVal)}</strong>
            </span>
          </div>
        </div>

        {/* Outbound Dispatches */}
        <div className="surface-panel rounded-2xl p-4 shadow-sm border border-border/60 hover:border-blue-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {pick({ ar: "المنصرف والمبيعات", en: "Outbound / Sales" })}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {n(metrics.totalOutQty)}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {pick({ ar: "بقيمة ", en: "Valued at " })}
              <strong className="text-foreground font-mono">{money(metrics.totalOutVal)}</strong>
            </span>
          </div>
        </div>

        {/* Inter-warehouse Transfers */}
        <div className="surface-panel rounded-2xl p-4 shadow-sm border border-border/60 hover:border-purple-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
              {pick({ ar: "التحويلات بين الفروع", en: "Transfers" })}
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {n(metrics.transferCount)}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {pick({ ar: "إذن تحويل منفذ", en: "completed orders" })}
            </span>
          </div>
        </div>

        {/* Adjustments */}
        <div className="surface-panel rounded-2xl p-4 shadow-sm border border-border/60 hover:border-amber-500/40 transition-all flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {pick({ ar: "التسويات الجردية", en: "Adjustments" })}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {n(metrics.adjustmentCount)}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {pick({ ar: "تسوية عجز/زيادة", en: "corrections" })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Controls Strip */}
      <div className="surface-panel rounded-2xl p-4 shadow-sm border border-border/60 space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={pick({
                ar: "ابحث برقم الإذن SM-... أو الصنف أو كود SKU أو المرجع...",
                en: "Search move #, SKU, product name, or reference...",
              })}
              className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-input bg-background/50 focus:bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Record New Movement Button */}
            <Btn
              size="sm"
              onClick={() => handleOpenRecordModal("in")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-4 py-2 text-xs shadow-sm hover:shadow flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{pick({ ar: "تسجيل حركة جديدة", en: "Record Movement" })}</span>
            </Btn>

            {/* Export to Excel */}
            <Btn
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="rounded-xl px-3.5 py-2 text-xs font-medium border-border/80 hover:bg-muted/70 flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{pick({ ar: "تصدير إلى Excel", en: "Export .xlsx" })}</span>
            </Btn>

            {/* Refresh Button */}
            <Btn
              variant="outline"
              size="sm"
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="rounded-xl px-3 py-2 text-xs border-border/80 hover:bg-muted/70 flex items-center gap-1.5"
              title={pick({ ar: "تحديث البيانات من السحابة", en: "Refresh ledger" })}
            >
              <RotateCcw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
              <span className="hidden sm:inline">{pick({ ar: "تحديث", en: "Refresh" })}</span>
            </Btn>
          </div>
        </div>

        {/* Secondary Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs">
          {/* Move Type Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-muted-foreground text-[11px] font-medium me-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>{pick({ ar: "النوع:", en: "Type:" })}</span>
            </span>
            {(
              [
                { id: "all", label: { ar: "الكل", en: "All" } },
                { id: "in", label: { ar: "وارد مخزني", en: "Inbound" } },
                { id: "out", label: { ar: "صادر / مبيعات", en: "Outbound" } },
                { id: "transfer", label: { ar: "تحويل داخلي", en: "Transfer" } },
                { id: "adjustment", label: { ar: "تسوية جردية", en: "Adjustment" } },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedType(opt.id)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                  selectedType === opt.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {pick(opt.label)}
              </button>
            ))}
          </div>

          {/* Warehouse and Date Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Warehouse Filter */}
            <div className="flex items-center gap-1.5">
              <WarehouseIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="py-1 px-2.5 text-xs rounded-lg border border-input bg-background/50 focus:bg-background focus:outline-hidden text-foreground"
              >
                <option value="all">
                  {pick({ ar: "جميع المستودعات والفروع", en: "All Warehouses & Branches" })}
                </option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {pick(wh.name)} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="py-1 px-2.5 text-xs rounded-lg border border-input bg-background/50 focus:bg-background focus:outline-hidden text-foreground"
              >
                <option value="all">{pick({ ar: "جميع الفترات", en: "All Time" })}</option>
                <option value="today">{pick({ ar: "اليوم فقط", en: "Today Only" })}</option>
                <option value="week">{pick({ ar: "آخر 7 أيام", en: "Last 7 Days" })}</option>
                <option value="month">{pick({ ar: "آخر 30 يوماً", en: "Last 30 Days" })}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Movements Ledger Table */}
      <div className="surface-panel rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        <DataTable
          items={paginatedMovements}
          empty={
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <div className="text-base font-semibold text-foreground">
                {pick({ ar: "لا توجد حركات مخزنية مطابقة", en: "No stock movements found" })}
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {pick({
                  ar: "لم يتم العثور على أي حركات مسجلة بناءً على معايير البحث والفلترة المحددة.",
                  en: "Try clearing filters or search query, or record a new movement.",
                })}
              </p>
              <Btn
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedType("all");
                  setSelectedWarehouseId("all");
                  setDateFilter("all");
                }}
                className="rounded-xl text-xs mt-2"
              >
                {pick({ ar: "إعادة ضبط الفلاتر", en: "Reset Filters" })}
              </Btn>
            </div>
          }
          columns={[
            {
              header: pick({ ar: "رقم الحركة", en: "Move No." }),
              className: "w-36",
              render: (m) => (
                <div className="space-y-1">
                  <div className="font-mono text-xs font-bold text-foreground">
                    {m.moveNo}
                  </div>
                  {renderMoveTypeBadge(m.moveType)}
                </div>
              ),
            },
            {
              header: pick({ ar: "التاريخ والوقت", en: "Date & Time" }),
              className: "w-36",
              render: (m) => {
                const dt = formatDateTime(m.movedAt, dir === "rtl" ? "ar" : "en");
                return (
                  <div className="space-y-0.5 text-xs">
                    <div className="font-mono font-medium text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span>{dt.date}</span>
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span>{dt.time}</span>
                    </div>
                  </div>
                );
              },
            },
            {
              header: pick({ ar: "الصنف والكود", en: "Product & SKU" }),
              render: (m) => (
                <div className="space-y-1">
                  <div className="font-medium text-xs text-foreground line-clamp-1">
                    {pick(m.productName)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                      {m.productSku}
                    </span>
                    {m.categoryName && (
                      <span className="text-[10px] text-muted-foreground">
                        {pick(m.categoryName)}
                      </span>
                    )}
                  </div>
                </div>
              ),
            },
            {
              header: pick({ ar: "مسار المستودعات", en: "Facility Route" }),
              className: "w-48",
              render: (m) => {
                if (m.moveType === "transfer") {
                  return (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {pick({ ar: "من:", en: "From:" })}
                        </span>
                        <span className="font-medium">{m.fromWarehouseName ? pick(m.fromWarehouseName) : "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {pick({ ar: "إلى:", en: "To:" })}
                        </span>
                        <span className="font-medium">{m.toWarehouseName ? pick(m.toWarehouseName) : "-"}</span>
                      </div>
                    </div>
                  );
                }

                if (m.moveType === "in") {
                  return (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <WarehouseIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{m.toWarehouseName ? pick(m.toWarehouseName) : pick({ ar: "المستودع الرئيسي", en: "Main Facility" })}</span>
                    </div>
                  );
                }

                if (m.moveType === "out") {
                  return (
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1.5">
                      <WarehouseIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{m.fromWarehouseName ? pick(m.fromWarehouseName) : pick({ ar: "المستودع الرئيسي", en: "Main Facility" })}</span>
                    </div>
                  );
                }

                return (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <WarehouseIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {m.toWarehouseName
                        ? pick(m.toWarehouseName)
                        : m.fromWarehouseName
                        ? pick(m.fromWarehouseName)
                        : "-"}
                    </span>
                  </div>
                );
              },
            },
            {
              header: pick({ ar: "الكمية", en: "Quantity" }),
              className: "w-28 text-end",
              render: (m) => {
                const isPositive = m.moveType === "in";
                const isNegative = m.moveType === "out";
                return (
                  <div className="text-end space-y-0.5">
                    <div
                      className={cn(
                        "font-mono font-bold text-xs",
                        isPositive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isNegative
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground"
                      )}
                    >
                      {isPositive ? "+" : isNegative ? "-" : ""}
                      {n(m.quantity)}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      {m.unitName ? pick(m.unitName) : pick({ ar: "وحدة", en: "units" })}
                    </span>
                  </div>
                );
              },
            },
            {
              header: pick({ ar: "التكلفة والإجمالي", en: "Cost & Valuation" }),
              className: "w-36 text-end",
              render: (m) => (
                <div className="text-end space-y-0.5">
                  <div className="font-mono font-bold text-xs text-foreground">
                    {money(m.totalCost)}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    @ {money(m.unitCost)}
                  </div>
                </div>
              ),
            },
            {
              header: pick({ ar: "المرجع / البيان", en: "Reference" }),
              className: "w-32",
              render: (m) => (
                <div className="text-xs">
                  <div className="font-medium text-foreground truncate max-w-[130px]" title={m.reference}>
                    {m.reference}
                  </div>
                  {m.notes && (
                    <div className="text-[10px] text-muted-foreground truncate max-w-[130px]" title={m.notes}>
                      {m.notes}
                    </div>
                  )}
                </div>
              ),
            },
            {
              header: pick({ ar: "الإجراءات", en: "Actions" }),
              className: "w-24 text-center",
              render: (m) => (
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => setSelectedVoucher(m)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title={pick({ ar: "عرض وطباعة إذن الحركة المخزنية", en: "View & print voucher slip" })}
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />

        {/* Table Footer / Pagination */}
        <div className="p-3 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-muted-foreground">
            {pick({ ar: "عرض", en: "Showing" })}{" "}
            <span className="font-mono font-semibold text-foreground">
              {paginatedMovements.length}
            </span>{" "}
            {pick({ ar: "من أصل", en: "of" })}{" "}
            <span className="font-mono font-semibold text-foreground">
              {filteredMovements.length}
            </span>{" "}
            {pick({ ar: "حركة مخزنية", en: "movements" })}
          </div>

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* 4. Modal: Record New Stock Movement */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <span className="block">
                  {pick({ ar: "تسجيل حركة مخزنية جديدة", en: "Record New Stock Movement" })}
                </span>
                <span className="text-xs font-normal text-muted-foreground block">
                  {pick({
                    ar: "إثبات توريد، صرف، تحويل بين المستودعات، أو تسوية جردية معتمدة",
                    en: "Record receipt, issue, inter-facility transfer, or stock adjustment",
                  })}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Movement Type Selector Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {pick({ ar: "نوع الحركة المخزنية *", en: "Movement Type *" })}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    id: "in",
                    label: { ar: "وارد مخزني", en: "Inbound" },
                    sub: { ar: "توريد / شراء", en: "Receipt" },
                    icon: ArrowDownRight,
                    color: "text-emerald-600 dark:text-emerald-400",
                    border: "border-emerald-500/30",
                    bg: "bg-emerald-500/10",
                  },
                  {
                    id: "out",
                    label: { ar: "صادر مخزني", en: "Outbound" },
                    sub: { ar: "صرف / مبيعات", en: "Issue" },
                    icon: ArrowUpRight,
                    color: "text-blue-600 dark:text-blue-400",
                    border: "border-blue-500/30",
                    bg: "bg-blue-500/10",
                  },
                  {
                    id: "transfer",
                    label: { ar: "تحويل داخلي", en: "Transfer" },
                    sub: { ar: "بين فرعين", en: "Branch Transfer" },
                    icon: ArrowLeftRight,
                    color: "text-purple-600 dark:text-purple-400",
                    border: "border-purple-500/30",
                    bg: "bg-purple-500/10",
                  },
                  {
                    id: "adjustment",
                    label: { ar: "تسوية جردية", en: "Adjustment" },
                    sub: { ar: "عجز أو زيادة", en: "Correction" },
                    icon: SlidersHorizontal,
                    color: "text-amber-600 dark:text-amber-400",
                    border: "border-amber-500/30",
                    bg: "bg-amber-500/10",
                  },
                ].map((item) => {
                  const isSelected = formMoveType === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setFormMoveType(item.id as StockMoveType);
                        if (item.id === "in") {
                          setFormFromWhId("");
                          if (!formToWhId) setFormToWhId(warehouses[0]?.id || "");
                        } else if (item.id === "out") {
                          setFormToWhId("");
                          if (!formFromWhId) setFormFromWhId(warehouses[0]?.id || "");
                        } else if (item.id === "transfer") {
                          if (!formFromWhId) setFormFromWhId(warehouses[0]?.id || "");
                          if (!formToWhId || formToWhId === warehouses[0]?.id) {
                            setFormToWhId(warehouses[1]?.id || "");
                          }
                        }
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border text-start transition-all flex flex-col justify-between gap-1",
                        isSelected
                          ? `${item.bg} ${item.border} ring-2 ring-primary/20 shadow-xs`
                          : "border-border/60 hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={cn("w-4 h-4", item.color)} />
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{pick(item.label)}</div>
                        <div className="text-[10px] text-muted-foreground">{pick(item.sub)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Product Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {pick({ ar: "الصنف المراد تحريكه *", en: "Select Product *" })}
              </label>
              <select
                value={formProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                required
                className="w-full py-2 px-3 text-xs rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
              >
                <option value="">{pick({ ar: "اختر الصنف من القائمة...", en: "Select product..." })}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {pick(p.name)} — (
                    {pick({ ar: "الرصيد الحالي: ", en: "Current Stock: " })}
                    {p.qty})
                  </option>
                ))}
              </select>

              {activeProduct && (
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground">{pick(activeProduct.name)}</span>
                      <span className="text-[11px] text-muted-foreground ms-2">
                        ({activeProduct.sku})
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="text-muted-foreground text-[11px]">
                      {pick({ ar: "الرصيد المتاح:", en: "Available:" })}{" "}
                    </span>
                    <strong className="font-mono text-foreground">{activeProduct.qty}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Warehouse Facilities Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Source Warehouse (for Out, Transfer, and Adjustment) */}
              {(formMoveType === "out" || formMoveType === "transfer" || formMoveType === "adjustment") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <WarehouseIcon className="w-3.5 h-3.5 text-rose-500" />
                    <span>
                      {formMoveType === "transfer"
                        ? pick({ ar: "من مستودع المصدر *", en: "Source Warehouse *" })
                        : pick({ ar: "المستودع المصدر *", en: "Facility Warehouse *" })}
                    </span>
                  </label>
                  <select
                    value={formFromWhId}
                    onChange={(e) => setFormFromWhId(e.target.value)}
                    required
                    className="w-full py-2 px-3 text-xs rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                  >
                    <option value="">{pick({ ar: "اختر المستودع...", en: "Select warehouse..." })}</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {pick(wh.name)} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Destination Warehouse (for In and Transfer) */}
              {(formMoveType === "in" || formMoveType === "transfer") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <WarehouseIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {formMoveType === "transfer"
                        ? pick({ ar: "إلى مستودع الوجهة *", en: "Destination Warehouse *" })
                        : pick({ ar: "مستودع الوجهة المستلم *", en: "Destination Warehouse *" })}
                    </span>
                  </label>
                  <select
                    value={formToWhId}
                    onChange={(e) => setFormToWhId(e.target.value)}
                    required
                    className="w-full py-2 px-3 text-xs rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                  >
                    <option value="">{pick({ ar: "اختر المستودع...", en: "Select warehouse..." })}</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id} disabled={formMoveType === "transfer" && wh.id === formFromWhId}>
                        {pick(wh.name)} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Quantity and Unit Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {pick({ ar: "الكمية المطلوبة *", en: "Quantity *" })}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(Number(e.target.value))}
                  required
                  className="w-full py-2 px-3 text-xs font-mono font-bold rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                />
              </div>

              {/* Unit Cost */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {pick({ ar: "سعر التكلفة للوحدة (ج.م)", en: "Unit Cost (EGP)" })}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formUnitCost}
                  onChange={(e) => setFormUnitCost(Number(e.target.value))}
                  className="w-full py-2 px-3 text-xs font-mono rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Realtime Valuation Preview */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {pick({ ar: "إجمالي قيمة الحركة:", en: "Estimated Total Valuation:" })}
              </span>
              <span className="font-mono font-bold text-primary text-sm">
                {money(formQuantity * formUnitCost)}
              </span>
            </div>

            {/* Reference & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {pick({ ar: "المرجع / رقم الإذن أو السند", en: "Reference / Document #" })}
                </label>
                <input
                  type="text"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  placeholder="e.g. PO-2026-101, REC-9920"
                  className="w-full py-2 px-3 text-xs rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {pick({ ar: "تاريخ ووقت الحركة", en: "Date & Time" })}
                </label>
                <input
                  type="datetime-local"
                  value={formMovedAt}
                  onChange={(e) => setFormMovedAt(e.target.value)}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {pick({ ar: "ملاحظات إضافية", en: "Notes & Remarks" })}
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                placeholder={pick({
                  ar: "أي تفاصيل تخص عملية النقل، سبب التسوية الجردية، أو فحص الجودة...",
                  en: "Add any additional context or inspection notes...",
                })}
                className="w-full py-2 px-3 text-xs rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden resize-none"
              />
            </div>

            {/* Form Error Notice */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
              <Btn
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRecordModalOpen(false)}
                className="rounded-xl text-xs px-4"
              >
                {pick({ ar: "إلغاء", en: "Cancel" })}
              </Btn>
              <Btn
                type="submit"
                size="sm"
                disabled={formSubmitting}
                className="bg-primary text-primary-foreground font-semibold rounded-xl text-xs px-5 shadow-sm flex items-center gap-2"
              >
                {formSubmitting && <RotateCcw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {formSubmitting
                    ? pick({ ar: "جاري القيد...", en: "Saving..." })
                    : pick({ ar: "تأكيد وقيد الحركة", en: "Confirm & Record" })}
                </span>
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Modal: Printable Movement Slip / Voucher */}
      <Dialog open={Boolean(selectedVoucher)} onOpenChange={() => setSelectedVoucher(null)}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          {selectedVoucher && (
            <div className="space-y-6">
              {/* Printable Header */}
              <div className="border-b-2 border-primary/20 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                      WAZEER EL-HELW ERP
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {pick({ ar: "إدارة المخازن والمستودعات المركزية", en: "Central Warehousing Division" })}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-foreground">
                    {selectedVoucher.moveType === "in"
                      ? pick({ ar: "إذن استلام وتوريد مخزني", en: "Inbound Receipt Voucher" })
                      : selectedVoucher.moveType === "out"
                      ? pick({ ar: "إذن صرف مواد وبضاعة", en: "Stock Issue Voucher" })
                      : selectedVoucher.moveType === "transfer"
                      ? pick({ ar: "إذن تحويل بين الفروع والمصانع", en: "Inter-Facility Transfer Note" })
                      : pick({ ar: "إذن تسوية جردية معتمدة", en: "Stock Adjustment Certificate" })}
                  </h3>
                </div>

                <div className="text-start sm:text-end space-y-1">
                  <div className="text-xs font-mono font-bold text-foreground">
                    {selectedVoucher.moveNo}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {formatDateTime(selectedVoucher.movedAt, dir === "rtl" ? "ar" : "en").full}
                  </div>
                </div>
              </div>

              {/* Movement Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-3.5 rounded-2xl border border-border/60">
                <div>
                  <span className="text-muted-foreground text-[10px] block">
                    {pick({ ar: "نوع الإذن", en: "Voucher Type" })}
                  </span>
                  <div className="mt-1">{renderMoveTypeBadge(selectedVoucher.moveType)}</div>
                </div>

                <div>
                  <span className="text-muted-foreground text-[10px] block">
                    {pick({ ar: "رقم المرجع / السند", en: "Reference No." })}
                  </span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {selectedVoucher.reference || "N/A"}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground text-[10px] block">
                    {pick({ ar: "من منشأة", en: "Origin" })}
                  </span>
                  <div className="font-medium text-foreground mt-1">
                    {selectedVoucher.fromWarehouseName
                      ? pick(selectedVoucher.fromWarehouseName)
                      : pick({ ar: "المورد الخارجي", en: "External Vendor" })}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground text-[10px] block">
                    {pick({ ar: "إلى منشأة", en: "Destination" })}
                  </span>
                  <div className="font-medium text-foreground mt-1">
                    {selectedVoucher.toWarehouseName
                      ? pick(selectedVoucher.toWarehouseName)
                      : pick({ ar: "منصرف خارجي / مبيعات", en: "Dispatched Out" })}
                  </div>
                </div>
              </div>

              {/* Product Ledger Line Table */}
              <div className="border border-border/60 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3 text-start font-semibold">
                        {pick({ ar: "كود الصنف", en: "SKU" })}
                      </th>
                      <th className="py-2.5 px-3 text-start font-semibold">
                        {pick({ ar: "الصنف والوصف", en: "Description" })}
                      </th>
                      <th className="py-2.5 px-3 text-end font-semibold">
                        {pick({ ar: "الكمية", en: "Qty" })}
                      </th>
                      <th className="py-2.5 px-3 text-end font-semibold">
                        {pick({ ar: "تكلفة الوحدة", en: "Unit Cost" })}
                      </th>
                      <th className="py-2.5 px-3 text-end font-semibold">
                        {pick({ ar: "الإجمالي", en: "Total" })}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr>
                      <td className="py-3 px-3 font-mono font-medium text-foreground">
                        {selectedVoucher.productSku}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">
                          {pick(selectedVoucher.productName)}
                        </div>
                        {selectedVoucher.categoryName && (
                          <div className="text-[10px] text-muted-foreground">
                            {pick(selectedVoucher.categoryName)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-end font-mono font-bold text-foreground">
                        {n(selectedVoucher.quantity)}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {selectedVoucher.unitName ? pick(selectedVoucher.unitName) : ""}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-end font-mono text-foreground">
                        {money(selectedVoucher.unitCost)}
                      </td>
                      <td className="py-3 px-3 text-end font-mono font-bold text-primary">
                        {money(selectedVoucher.totalCost)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-muted/30 font-bold border-t border-border/60">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-end text-muted-foreground">
                        {pick({ ar: "القيمة الإجمالية للإذن:", en: "Total Voucher Valuation:" })}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono text-primary text-sm">
                        {money(selectedVoucher.totalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Remarks */}
              {selectedVoucher.notes && (
                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground me-1">
                    {pick({ ar: "ملاحظات:", en: "Notes:" })}
                  </span>
                  {selectedVoucher.notes}
                </div>
              )}

              {/* Signature Blocks */}
              <div className="pt-6 border-t border-border/60 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="space-y-8">
                  <div className="text-muted-foreground font-medium">
                    {pick({ ar: "أمين المستودع المُسلّم", en: "Issued By" })}
                  </div>
                  <div className="border-b border-dashed border-border/80 w-3/4 mx-auto pb-1 text-[11px] text-muted-foreground">
                    ..........................
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="text-muted-foreground font-medium">
                    {pick({ ar: "المستلم المعتمد", en: "Received By" })}
                  </div>
                  <div className="border-b border-dashed border-border/80 w-3/4 mx-auto pb-1 text-[11px] text-muted-foreground">
                    ..........................
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="text-muted-foreground font-medium">
                    {pick({ ar: "مراقبة المخزون والتدقيق", en: "Auditor / Quality" })}
                  </div>
                  <div className="border-b border-dashed border-border/80 w-3/4 mx-auto pb-1 text-[11px] text-muted-foreground">
                    ..........................
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedVoucher(null)}
                  className="rounded-xl text-xs px-4"
                >
                  {pick({ ar: "إغلاق", en: "Close" })}
                </Btn>
                <Btn
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-primary text-primary-foreground font-semibold rounded-xl text-xs px-4 flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>{pick({ ar: "طباعة الإذن الرسمي", en: "Print Voucher Slip" })}</span>
                </Btn>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
