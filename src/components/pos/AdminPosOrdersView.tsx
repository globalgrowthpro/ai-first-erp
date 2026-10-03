import { useState, useMemo, Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Store,
  Search,
  RefreshCw,
  Printer,
  Eye,
  ChevronDown,
  Layers,
  Receipt,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  RotateCcw,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import { DataTable, KpiCard, Panel, Td, TablePagination, usePagination } from "@/components/kit";
import {
  usePosOrdersStore,
  type AdminPosOrder,
  formatOrderDateTimeEnglish,
  BRANCH_NAMES_MAP,
  PLATFORM_NAMES_MAP,
  PAYMENT_METHOD_NAMES_MAP,
} from "@/lib/pos-orders-store";
import { useCompanySettings } from "@/lib/settings-store";
import { RealQrCode } from "@/components/ui/qr-code";

function safePickItemName(name: any, lang: "ar" | "en" = "ar"): string {
  if (!name) return lang === "ar" ? "صنف حلوى" : "Sweet Item";
  if (typeof name === "string") return name;
  if (typeof name === "object") {
    return (lang === "ar" ? name.ar : name.en) || name.ar || name.en || "صنف حلوى";
  }
  return String(name);
}

function safePickBranchName(branch: any, lang: "ar" | "en" = "ar"): string {
  if (!branch) return lang === "ar" ? "الفرع الرئيسي" : "Main Branch";
  if (typeof branch === "string") return branch;
  if (typeof branch === "object") {
    return (lang === "ar" ? branch.ar : branch.en) || branch.ar || branch.en || "الفرع الرئيسي";
  }
  return String(branch);
}

// Date helper functions for POS orders
function getOrderDateOnly(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function extractOrderDate(order: AdminPosOrder): string {
  if (order.createdAt) {
    const parsed = getOrderDateOnly(order.createdAt);
    if (parsed) return parsed;
  }
  const dateStr = formatOrderDateTimeEnglish(order.createdAt || order.formattedDate);
  if (dateStr) {
    const match = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (match && match[1] && match[2] && match[3]) {
      return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
    }
  }
  return "";
}

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDaysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getStartOfMonthStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

// Internal Error Boundary to prevent any POS table render crash from taking down the page
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class PosErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PosOrdersView ErrorBoundary caught error]:", error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
          <h3 className="font-bold text-sm text-foreground">
            حدث خطأ أثناء تحميل جدول طلبات نقاط البيع
          </h3>
          <p className="text-xs text-muted-foreground font-mono">
            {this.state.error?.message || "An unexpected error occurred while rendering POS orders"}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminPosOrdersInner() {
  const { pick, money, lang } = useI18n();
  const { settings } = useCompanySettings();
  const { orders = [], loading, metrics, refresh } = usePosOrdersStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState("all");
  const [selectedOrderType, setSelectedOrderType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "week" | "month" | "custom">("all");

  // Selected order for thermal receipt preview modal
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<AdminPosOrder | null>(null);
  // Selected order for detailed itemized modal
  const [activeDetailsOrder, setActiveDetailsOrder] = useState<AdminPosOrder | null>(null);

  // Quick date presets applicator
  const handleApplyPreset = (preset: "all" | "today" | "yesterday" | "week" | "month") => {
    setDatePreset(preset);
    const today = getTodayStr();
    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (preset === "today") {
      setDateFrom(today);
      setDateTo(today);
    } else if (preset === "yesterday") {
      const yest = getYesterdayStr();
      setDateFrom(yest);
      setDateTo(yest);
    } else if (preset === "week") {
      setDateFrom(getDaysAgoStr(7));
      setDateTo(today);
    } else if (preset === "month") {
      setDateFrom(getStartOfMonthStr());
      setDateTo(today);
    }
  };

  const handleCustomDateChange = (fromVal: string, toVal: string) => {
    setDatePreset("custom");
    setDateFrom(fromVal);
    setDateTo(toVal);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedBranch("all");
    setSelectedPlatform("all");
    setSelectedPayment("all");
    setSelectedOrderType("all");
    setSelectedStatus("all");
    setDateFrom("");
    setDateTo("");
    setDatePreset("all");
  };

  const isFiltered = Boolean(
    searchQuery.trim() ||
    selectedBranch !== "all" ||
    selectedPlatform !== "all" ||
    selectedPayment !== "all" ||
    selectedOrderType !== "all" ||
    selectedStatus !== "all" ||
    dateFrom ||
    dateTo
  );

  const activeFiltersCount = [
    Boolean(searchQuery.trim()),
    selectedBranch !== "all",
    selectedPlatform !== "all",
    selectedPayment !== "all",
    selectedOrderType !== "all",
    selectedStatus !== "all",
    Boolean(dateFrom || dateTo),
  ].filter(Boolean).length;

  // Filtered orders list with safe fallbacks and date from/to matching
  const filteredOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      if (!o) return false;

      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = String(o.orderNumber || "").toLowerCase().includes(q);
        const matchCashier = String(o.cashierName || "").toLowerCase().includes(q);
        const matchCustomer = String(o.customerName || "").toLowerCase().includes(q);
        const matchRef = String(o.orderRefNumber || "").toLowerCase().includes(q);
        const matchItems = (o.items || []).some((it) => {
          const ar = safePickItemName(it?.name, "ar").toLowerCase();
          const en = safePickItemName(it?.name, "en").toLowerCase();
          return ar.includes(q) || en.includes(q);
        });
        if (!matchId && !matchCashier && !matchCustomer && !matchRef && !matchItems) return false;
      }

      // 2. Branch filter
      if (selectedBranch !== "all" && o.branchId !== selectedBranch) return false;

      // 3. Platform filter
      if (selectedPlatform !== "all" && o.orderPlatform !== selectedPlatform) return false;

      // 4. Payment method filter
      if (selectedPayment !== "all" && o.paymentMethod !== selectedPayment) return false;

      // 5. Order Type filter (takeaway, dine_in, delivery)
      if (selectedOrderType !== "all" && o.orderType !== selectedOrderType) return false;

      // 6. Status filter (completed, paid, parked, cancelled)
      if (selectedStatus !== "all" && o.status !== selectedStatus) return false;

      // 7. Date range filter (from / to)
      if (dateFrom || dateTo) {
        const orderDate = extractOrderDate(o);
        if (orderDate) {
          if (dateFrom && orderDate < dateFrom) return false;
          if (dateTo && orderDate > dateTo) return false;
        }
      }

      return true;
    });
  }, [
    orders,
    searchQuery,
    selectedBranch,
    selectedPlatform,
    selectedPayment,
    selectedOrderType,
    selectedStatus,
    dateFrom,
    dateTo,
  ]);

  const {
    currentPage: posPage,
    setCurrentPage: setPosPage,
    paginatedItems: paginatedOrders,
  } = usePagination(filteredOrders, 30);

  // Recalculate KPIs dynamically for filtered result set
  const filteredMetrics = useMemo(() => {
    const totalCount = filteredOrders.length;
    const totalSales = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const avgTicket = totalCount > 0 ? Math.round(totalSales / totalCount) : 0;
    const aggregatorOrders = filteredOrders.filter(
      (o) => o.orderPlatform && o.orderPlatform !== "direct"
    ).length;
    const cashSales = filteredOrders
      .filter((o) => o.paymentMethod === "cash")
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
    const cardSales = filteredOrders
      .filter((o) => o.paymentMethod === "card" || o.paymentMethod === "wallet")
      .reduce((s, o) => s + (Number(o.total) || 0), 0);

    return {
      totalCount,
      totalSales,
      avgTicket,
      aggregatorOrders,
      cashSales,
      cardSales,
    };
  }, [filteredOrders]);

  const activeKpis = isFiltered ? filteredMetrics : (metrics || filteredMetrics);

  // Full Export to Excel with 2 detailed worksheets
  const handleExportToExcel = () => {
    if (!filteredOrders.length) {
      alert(pick("لا توجد طلبات لتصديرها وفق الفلاتر المحددة", "No orders to export matching current filters"));
      return;
    }

    // Sheet 1: Orders summary ledger
    const ordersData = filteredOrders.map((ord, idx) => {
      const branchLabel = safePickBranchName(ord.branchName, lang);
      const plat = PLATFORM_NAMES_MAP[ord.orderPlatform]?.ar || ord.orderPlatform;
      const pay = PAYMENT_METHOD_NAMES_MAP[ord.paymentMethod]?.ar || ord.paymentMethod;
      const itemsCount = (ord.items || []).reduce((s, it) => s + (Number(it.quantity) || 1), 0);
      const itemsSummary = (ord.items || [])
        .map((it) => `${safePickItemName(it.name, lang)} (${it.quantity})`)
        .join("، ");
      const orderTypeLabel =
        ord.orderType === "takeaway"
          ? "تيك أواي / سفري"
          : ord.orderType === "dine_in"
          ? `صالة محلي ${ord.tableNumber ? `(طاولة ${ord.tableNumber})` : ""}`
          : ord.orderType === "delivery"
          ? "توصيل منزلي"
          : ord.orderType;

      const orderDate = extractOrderDate(ord);
      const formatted = formatOrderDateTimeEnglish(ord.createdAt || ord.formattedDate);
      const timeStr = formatted.includes(",") ? formatted.split(",")[1]?.trim() || "" : "";

      return {
        "م": idx + 1,
        "رقم الفاتورة": ord.orderNumber,
        "رقم المرجع": ord.orderRefNumber || "-",
        "التاريخ": orderDate || new Date().toISOString().slice(0, 10),
        "الوقت": timeStr,
        "الفرع": branchLabel,
        "الكاشير": ord.cashierName || "كاشير مناوب",
        "اسم العميل": ord.customerName || "عميل نقدي",
        "هاتف العميل": ord.customerPhone || "-",
        "المنصة / القناة": plat,
        "نوع الطلب": orderTypeLabel,
        "طريقة السداد": pay,
        "عدد الأصناف": itemsCount,
        "بيان الأصناف": itemsSummary,
        "المجموع الفرعي (ج.م)": Number(ord.subtotal) || 0,
        "قيمة الخصم (ج.م)": Number(ord.discountAmount) || 0,
        "ضريبة القيمة المضافة (ج.م)": Number(ord.vatAmount) || 0,
        "رسوم التوصيل (ج.م)": Number(ord.deliveryFee) || 0,
        "الإجمالي النهائي (ج.م)": Number(ord.total) || 0,
        "المبلغ المستلم (ج.م)": Number(ord.tenderAmount || ord.total || 0),
        "المتبقي (ج.م)": Number(ord.changeAmount || 0),
        "حالة الطلب":
          ord.status === "completed"
            ? "مكتمل"
            : ord.status === "paid"
            ? "مسدد"
            : ord.status === "cancelled"
            ? "ملغي"
            : ord.status === "parked"
            ? "معلق"
            : ord.status,
      };
    });

    // Sheet 2: Itemized breakdown for deep audit & analytics
    const itemsData: any[] = [];
    filteredOrders.forEach((ord) => {
      const branchLabel = safePickBranchName(ord.branchName, lang);
      const orderDate = extractOrderDate(ord) || new Date().toISOString().slice(0, 10);

      (ord.items || []).forEach((it) => {
        itemsData.push({
          "رقم الفاتورة": ord.orderNumber,
          "التاريخ": orderDate,
          "الفرع": branchLabel,
          "كود الصنف (SKU)": it.sku || "-",
          "اسم الصنف": safePickItemName(it.name, lang),
          "الكمية": it.quantity,
          "سعر الوحدة (ج.م)": it.unitPrice,
          "إجمالي الصنف (ج.م)": it.totalPrice,
          "ملاحظات": it.notes || "-",
        });
      });
    });

    const wb = XLSX.utils.book_new();

    const wsOrders = XLSX.utils.json_to_sheet(ordersData);
    wsOrders["!cols"] = [
      { wch: 5 },  // م
      { wch: 14 }, // رقم الفاتورة
      { wch: 12 }, // رقم المرجع
      { wch: 12 }, // التاريخ
      { wch: 10 }, // الوقت
      { wch: 22 }, // الفرع
      { wch: 16 }, // الكاشير
      { wch: 18 }, // العميل
      { wch: 14 }, // الهاتف
      { wch: 18 }, // المنصة
      { wch: 18 }, // نوع الطلب
      { wch: 16 }, // طريقة السداد
      { wch: 12 }, // عدد الأصناف
      { wch: 38 }, // بيان الأصناف
      { wch: 14 }, // المجموع الفرعي
      { wch: 12 }, // الخصم
      { wch: 16 }, // الضريبة
      { wch: 14 }, // التوصيل
      { wch: 18 }, // الإجمالي
      { wch: 14 }, // المستلم
      { wch: 12 }, // المتبقي
      { wch: 12 }, // الحالة
    ];
    XLSX.utils.book_append_sheet(wb, wsOrders, "فواتير_نقاط_البيع");

    if (itemsData.length > 0) {
      const wsItems = XLSX.utils.json_to_sheet(itemsData);
      wsItems["!cols"] = [
        { wch: 14 }, // رقم الفاتورة
        { wch: 12 }, // التاريخ
        { wch: 22 }, // الفرع
        { wch: 14 }, // SKU
        { wch: 28 }, // اسم الصنف
        { wch: 10 }, // الكمية
        { wch: 14 }, // سعر الوحدة
        { wch: 16 }, // إجمالي الصنف
        { wch: 20 }, // ملاحظات
      ];
      XLSX.utils.book_append_sheet(wb, wsItems, "تفاصيل_الأصناف_المباعة");
    }

    const dateSuffix =
      dateFrom || dateTo
        ? `_من_${dateFrom || "البداية"}_إلى_${dateTo || "اليوم"}`
        : `_${new Date().toISOString().slice(0, 10)}`;

    const filename = `مبيعات_نقاط_البيع_POS${dateSuffix}.xlsx`;
    safeDownloadWorkbook(wb, filename);
  };

  return (
    <div className="space-y-4">
      {/* 1. POS Retail Performance KPIs (Updates dynamically with active date range & filters) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={
            isFiltered
              ? pick("إجمالي مبيعات الفترة المحددة", "Filtered POS Revenue")
              : pick("إجمالي مبيعات نقاط البيع", "Total POS Revenue")
          }
          value={money(activeKpis?.totalSales || 0)}
          accent="brand"
        />
        <KpiCard
          label={
            isFiltered
              ? pick("الطلبات المنفذة في الفترة", "Filtered Completed Orders")
              : pick("عدد الطلبات المنفذة", "Completed POS Orders")
          }
          value={`${activeKpis?.totalCount || 0} ${pick("طلب", "Orders")}`}
          accent="primary"
        />
        <KpiCard
          label={pick("متوسط الفاتورة (Average Ticket)", "Average Ticket")}
          value={money(activeKpis?.avgTicket || 0)}
          accent="gold"
        />
        <KpiCard
          label={pick("طلبات تطبيقات التوصيل", "Aggregator Orders")}
          value={`${activeKpis?.aggregatorOrders || 0} ${pick("طلب", "Orders")}`}
          accent="ink"
        />
      </div>

      {/* 2. Comprehensive Filter & Controls Bar */}
      <div className="p-3.5 bg-card rounded-2xl border border-border/80 shadow-xs space-y-3">
        {/* Row 1: Search & Categorical Dropdowns */}
        <div className="flex items-center gap-2 w-full flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={pick(
                "ابحث برقم الطلب، الكاشير، العميل أو الصنف...",
                "Search order #, cashier, customer or sweet item..."
              )}
              className="w-full ps-9 pe-8 py-2 text-xs font-semibold rounded-xl border border-border/70 bg-background text-foreground focus:outline-none focus:border-primary shadow-xs"
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
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="text-xs font-bold py-2 px-3 pe-7 rounded-xl border border-border/70 bg-background text-foreground focus:outline-none cursor-pointer appearance-none shadow-xs"
            >
              <option value="all">📍 {pick("كل الفروع", "All Branches")}</option>
              {Object.entries(BRANCH_NAMES_MAP)
                .filter(([k]) => !k.includes("-"))
                .map(([id, info]) => (
                  <option key={id} value={id}>
                    {pick(info.ar, info.en)}
                  </option>
                ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>

          {/* Platform Filter */}
          <div className="relative">
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="text-xs font-bold py-2 px-3 pe-7 rounded-xl border border-border/70 bg-background text-foreground focus:outline-none cursor-pointer appearance-none shadow-xs"
            >
              <option value="all">🛵 {pick("كل القنوات والمنصات", "All Platforms")}</option>
              {Object.entries(PLATFORM_NAMES_MAP).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.icon} {pick(info.ar, info.en)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>

          {/* Payment Method Filter */}
          <div className="relative">
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="text-xs font-bold py-2 px-3 pe-7 rounded-xl border border-border/70 bg-background text-foreground focus:outline-none cursor-pointer appearance-none shadow-xs"
            >
              <option value="all">💳 {pick("كل طرق السداد", "All Payment Methods")}</option>
              {Object.entries(PAYMENT_METHOD_NAMES_MAP).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.icon} {pick(info.ar, info.en)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>

          {/* Order Type Filter (Takeaway / Dine-in / Delivery) */}
          <div className="relative">
            <select
              value={selectedOrderType}
              onChange={(e) => setSelectedOrderType(e.target.value)}
              className="text-xs font-bold py-2 px-3 pe-7 rounded-xl border border-border/70 bg-background text-foreground focus:outline-none cursor-pointer appearance-none shadow-xs"
            >
              <option value="all">🛍️ {pick("كل أنواع الطلبات", "All Order Types")}</option>
              <option value="takeaway">🛍️ {pick("سفري وتيك أواي", "Takeaway")}</option>
              <option value="dine_in">🍽️ {pick("صالة ومحلي", "Dine-in")}</option>
              <option value="delivery">🛵 {pick("توصيل منزلي", "Delivery")}</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-bold py-2 px-3 pe-7 rounded-xl border border-border/70 bg-background text-foreground focus:outline-none cursor-pointer appearance-none shadow-xs"
            >
              <option value="all">⚡ {pick("كل الحالات", "All Statuses")}</option>
              <option value="completed">✅ {pick("مكتمل ومسدد", "Completed / Paid")}</option>
              <option value="parked">⏳ {pick("معلق بالدرج", "Parked")}</option>
              <option value="cancelled">❌ {pick("ملغي", "Cancelled")}</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>
        </div>

        {/* Row 2: Date Filters (From / To + Quick Presets) & Export to Excel */}
        <div className="pt-2.5 border-t border-border/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Date Range Inputs & Presets */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 font-bold text-muted-foreground shrink-0">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>{pick("الفترة:", "Date:")}</span>
            </div>

            {/* Quick Presets Pills */}
            <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => handleApplyPreset("all")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  datePreset === "all" && !dateFrom && !dateTo
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pick("الكل", "All")}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("today")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  datePreset === "today"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pick("اليوم", "Today")}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("yesterday")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  datePreset === "yesterday"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pick("أمس", "Yesterday")}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("week")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  datePreset === "week"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pick("آخر 7 أيام", "Last 7 Days")}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("month")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  datePreset === "month"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pick("هذا الشهر", "This Month")}
              </button>
            </div>

            {/* Custom From & To Pickers */}
            <div className="flex items-center gap-1.5 bg-background border border-border/70 rounded-xl px-2.5 py-1 shadow-xs">
              <span className="text-[11px] font-bold text-muted-foreground">{pick("من", "From")}:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleCustomDateChange(e.target.value, dateTo)}
                className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none cursor-pointer"
              />
              <span className="text-muted-foreground/40 font-bold">|</span>
              <span className="text-[11px] font-bold text-muted-foreground">{pick("إلى", "To")}:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleCustomDateChange(dateFrom, e.target.value)}
                className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none cursor-pointer"
              />
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setDatePreset("all");
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs px-1"
                  title={pick("إلغاء تحديد التاريخ", "Clear date")}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Reset Filters Button */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold transition-colors cursor-pointer"
                title={pick("إعادة ضبط جميع الفلاتر", "Reset all filters")}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{pick("إعادة ضبط", "Reset")}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-destructive/20 text-[10px] font-mono">
                  {activeFiltersCount}
                </span>
              </button>
            )}
          </div>

          {/* Prominent Export to Excel & Refresh Buttons */}
          <div className="flex items-center gap-2 shrink-0 ms-auto">
            <button
              type="button"
              onClick={refresh}
              className="p-2 rounded-xl border border-border/70 hover:bg-muted text-foreground transition-colors cursor-pointer shadow-xs bg-background"
              title={pick("تحديث البيانات", "Refresh data")}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={handleExportToExcel}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer active:scale-98"
              title={pick(
                "تصدير جميع الفواتير المطابقة للبحث والفلاتر إلى ملف إكسيل شامل",
                "Export all filtered orders to a multi-sheet Excel file"
              )}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{pick("تصدير إلى Excel", "Export to Excel")}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono font-black">
                {filteredOrders.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Orders Table */}
      <Panel
        title={pick("سجل فواتير وطلبات نقاط البيع", "POS Terminal Orders Ledger")}
        aside={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold hidden sm:inline">
              {pick(
                `المعروض: ${filteredOrders.length} طلب (${money(activeKpis?.totalSales || 0)})`,
                `Showing: ${filteredOrders.length} orders (${money(activeKpis?.totalSales || 0)})`
              )}
            </span>
            <button
              type="button"
              onClick={refresh}
              className="p-1 rounded-lg border border-border/70 hover:bg-muted text-foreground transition-colors cursor-pointer"
              title={pick("تحديث البيانات", "Refresh data")}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleExportToExcel}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs transition-colors cursor-pointer"
              title={pick("تصدير إلى ملف إكسيل", "Export to Excel")}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
          </div>
        }
      >
        <DataTable
          head={[
            pick("رقم الفاتورة", "Order #"),
            pick("الفرع والكاشير", "Branch & Cashier"),
            pick("العميل", "Customer"),
            pick("القناة والنوع", "Platform & Type"),
            pick("الأصناف", "Items"),
            pick("طريقة السداد", "Payment"),
            pick("الإجمالي", "Total Amount"),
            pick("التاريخ والوقت", "Date & Time"),
            pick("إجراءات", "Actions"),
          ]}
        >
          {paginatedOrders.map((ord) => {
            const plat = PLATFORM_NAMES_MAP[ord.orderPlatform] || { ar: ord.orderPlatform, en: ord.orderPlatform, icon: "📱" };
            const pay = PAYMENT_METHOD_NAMES_MAP[ord.paymentMethod] || { ar: ord.paymentMethod, en: ord.paymentMethod, icon: "💳" };
            const itemsList = ord.items || [];
            const totalQty = itemsList.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
            const branchLabel = safePickBranchName(ord.branchName, lang);

            return (
              <tr key={ord.id} className="hover:bg-secondary/70 transition-colors">
                {/* Order ID with POS Badge */}
                <Td className="num font-bold">
                  <div className="space-y-0.5">
                    <span className="font-mono text-primary font-black text-xs block">
                      {ord.orderNumber}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-[9px] border border-amber-500/30">
                      POS RETAIL
                    </span>
                  </div>
                </Td>

                {/* Branch & Cashier */}
                <Td>
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground text-xs block truncate max-w-[150px]">
                      📍 {branchLabel}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      👨‍🍳 {ord.cashierName || "كاشير"}
                    </span>
                  </div>
                </Td>

                {/* Customer */}
                <Td>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground text-xs block truncate max-w-[130px]">
                      👤 {ord.customerName || "عميل نقدي"}
                    </span>
                    {ord.customerPhone && (
                      <span className="text-[10px] font-mono text-muted-foreground block">
                        {ord.customerPhone}
                      </span>
                    )}
                  </div>
                </Td>

                {/* Platform & Order Type */}
                <Td>
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-card border border-border/80 text-[10px] font-bold text-foreground">
                      <span>{plat.icon}</span>
                      <span>{pick(plat.ar, plat.en)}</span>
                    </span>
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {ord.orderType === "dine_in" && (
                        <span>🍽️ {pick(`صالة ${ord.tableNumber ? `(${ord.tableNumber})` : ""}`, `Dine-in ${ord.tableNumber || ""}`)}</span>
                      )}
                      {ord.orderType === "takeaway" && (
                        <span>🛍️ {pick("سفري / تيك أواي", "Takeaway")}</span>
                      )}
                      {ord.orderType === "delivery" && (
                        <span>🛵 {pick("توصيل / دليفري", "Delivery")}</span>
                      )}
                    </div>
                  </div>
                </Td>

                {/* Items */}
                <Td>
                  <button
                    type="button"
                    onClick={() => setActiveDetailsOrder(ord)}
                    className="text-start hover:opacity-80 transition-opacity cursor-pointer group block"
                    title={pick("انقر لعرض تفاصيل الأصناف", "Click to view full items list")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/15 text-primary font-black text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors border border-primary/20">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{totalQty} {pick("قطع", "items")}</span>
                      </span>
                    </div>
                    <span
                      className="text-[11px] font-semibold text-foreground/90 block truncate max-w-[180px] mt-1"
                      title={itemsList.map((i) => `${safePickItemName(i.name, lang)} × ${i.quantity || 1}`).join(", ")}
                    >
                      {itemsList.map((i) => `${safePickItemName(i.name, lang)} (${i.quantity || 1})`).join("، ") || pick("لا توجد بنود", "No items")}
                    </span>
                  </button>
                </Td>

                {/* Payment Method */}
                <Td>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-[11px] font-bold text-foreground">
                    <span>{pay.icon}</span>
                    <span>{pick(pay.ar, pay.en)}</span>
                  </span>
                </Td>

                {/* Total Net */}
                <Td className="num">
                  <span className="font-black text-sm text-[#16A34A] dark:text-emerald-400 font-mono">
                    {money(Number(ord.total) || 0)}
                  </span>
                </Td>

                {/* Date & Time */}
                <Td>
                  {(() => {
                    const dtStr = formatOrderDateTimeEnglish(ord.createdAt || ord.formattedDate);
                    const [dPart, tPart] = dtStr.includes(",")
                      ? dtStr.split(",").map((s) => s.trim())
                      : [dtStr, ""];
                    return (
                      <div className="flex flex-col font-mono text-start leading-tight" dir="ltr">
                        <span className="font-semibold text-foreground text-[11px] whitespace-nowrap">
                          {dPart}
                        </span>
                        {tPart && (
                          <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap mt-0.5">
                            {tPart}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </Td>

                {/* Actions: Thermal Receipt & Details */}
                <Td>
                  <div className="flex items-center gap-1.5">
                    {/* Thermal Receipt Preview */}
                    <button
                      type="button"
                      onClick={() => setActiveReceiptOrder(ord)}
                      className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                      title={pick("معاينة وطباعة الإيصال الحراري 80mm", "Preview & Print Thermal Receipt")}
                    >
                      <Receipt className="w-4 h-4" />
                    </button>

                    {/* Details modal */}
                    <button
                      type="button"
                      onClick={() => setActiveDetailsOrder(ord)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title={pick("عرض تفاصيل الفاتورة وبنودها", "View invoice breakdown")}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </DataTable>

        <TablePagination
          currentPage={posPage}
          totalItems={filteredOrders.length}
          pageSize={30}
          onPageChange={setPosPage}
          itemLabel={{ ar: "طلب نقاط بيع", en: "POS Orders" }}
        />

        {filteredOrders.length === 0 && (
          <div className="p-8 text-center text-muted-foreground space-y-2">
            <Store className="w-12 h-12 mx-auto stroke-[1.2] opacity-40 mb-1" />
            <h4 className="font-bold text-sm text-foreground">
              {pick("لا توجد طلبات نقاط بيع مطابقة للبحث", "No POS orders matching filters")}
            </h4>
            <p className="text-xs">
              {pick(
                "أي طلب يتم إتمامه من شاشة الكاشير سيظهر هنا فوراً وبشكل لحظي.",
                "Orders processed on the POS terminal will appear here in real-time."
              )}
            </p>
          </div>
        )}
      </Panel>

      {/* ========================================================================= */}
      {/* 4. MODAL: THERMAL RECEIPT 80MM (WITH OFFICIAL LOGO & REAL QR CODE) */}
      {/* ========================================================================= */}
      {activeReceiptOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-primary text-primary-foreground p-3.5 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                <h3 className="font-bold text-xs">
                  {pick("معاينة الفاتورة الحرارية (80mm)", "Thermal Receipt Preview")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveReceiptOrder(null)}
                className="hover:opacity-80 p-1"
              >
                ✕
              </button>
            </div>

            {/* Authentic 80mm Receipt Content */}
            <div className="flex-1 overflow-y-auto p-5 font-mono text-black bg-white select-text space-y-3 text-xs leading-relaxed">
              {/* Receipt Header with Official Logo */}
              <div className="text-center space-y-1.5 border-b border-dashed border-zinc-400 pb-3">
                <div className="flex justify-center mb-1">
                  <img
                    src={settings.logoUrl || "/wazeer-logo.png"}
                    alt="وزير الحلو"
                    className="h-12 w-auto max-w-[160px] object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/wazeer-emblem.png";
                    }}
                  />
                </div>
                <h2 className="text-base font-black tracking-tight font-sans">
                  {settings.nameAr || "شركة وزير الحلو للحلويات والمواد الغذائية"}
                </h2>
                <p className="text-[11px] font-sans font-bold">Wazeer El-Helw Pastry & Desserts</p>
                <p className="text-[10px]">{safePickBranchName(activeReceiptOrder.branchName, lang)}</p>
                <p className="text-[10px] font-mono">
                  Tel: {BRANCH_NAMES_MAP[activeReceiptOrder.branchId]?.phone || "+20 100 112 0000"}
                </p>
                <p className="text-[9px] text-zinc-600">ب.ض: 492-810-332 • س.ت: 89412</p>
              </div>

              {/* Order Meta */}
              <div className="text-[10px] space-y-0.5 border-b border-dashed border-zinc-400 pb-2">
                <div className="flex justify-between">
                  <span>رقم الفاتورة:</span>
                  <span className="font-bold">{activeReceiptOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span>التاريخ والوقت:</span>
                  {(() => {
                    const dtStr = formatOrderDateTimeEnglish(activeReceiptOrder.createdAt || activeReceiptOrder.formattedDate);
                    const [dPart, tPart] = dtStr.includes(",")
                      ? dtStr.split(",").map((s) => s.trim())
                      : [dtStr, ""];
                    return (
                      <div className="font-mono text-end" dir="ltr">
                        <span className="font-semibold block">{dPart}</span>
                        {tPart && <span className="text-zinc-600 text-[9px] block">{tPart}</span>}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex justify-between">
                  <span>الكاشير:</span>
                  <span>{activeReceiptOrder.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>العميل:</span>
                  <span>{activeReceiptOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>نوع الطلب:</span>
                  <span className="font-bold uppercase">{activeReceiptOrder.orderType}</span>
                </div>
                {activeReceiptOrder.orderPlatform !== "direct" && (
                  <div className="border-t border-dashed border-zinc-400 pt-1 mt-1 space-y-0.5">
                    <div className="flex justify-between font-bold">
                      <span>منصة الطلب:</span>
                      <span className="text-black">{activeReceiptOrder.orderPlatformName || activeReceiptOrder.orderPlatform}</span>
                    </div>
                    {activeReceiptOrder.orderRefNumber && (
                      <div className="flex justify-between font-black bg-zinc-200 px-1.5 py-0.5 rounded text-black text-xs">
                        <span>مرجع الطلب (Ref #):</span>
                        <span className="font-mono">{activeReceiptOrder.orderRefNumber}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items Table with exact aligned columns */}
              <div className="space-y-1.5 border-b border-dashed border-zinc-400 pb-3">
                <div className="flex items-center justify-between text-[10px] font-bold border-b border-zinc-300 pb-1">
                  <span className="flex-1 text-start">الصنف</span>
                  <span className="w-14 text-center shrink-0">الكمية</span>
                  <span className="w-20 text-end shrink-0">الإجمالي</span>
                </div>

                {(activeReceiptOrder.items || []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[10px]">
                    <span className="flex-1 text-start truncate pe-2 font-sans font-bold">
                      {safePickItemName(item.name, lang)}
                    </span>
                    <span className="w-14 text-center font-mono shrink-0">
                      {item.quantity}
                    </span>
                    <span className="w-20 text-end font-bold font-mono shrink-0">
                      {(Number(item.totalPrice) || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-zinc-400 pb-3">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span>{(Number(activeReceiptOrder.subtotal) || 0).toFixed(2)} ج.م</span>
                </div>
                {activeReceiptOrder.discountAmount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>الخصم:</span>
                    <span>-{(Number(activeReceiptOrder.discountAmount) || 0).toFixed(2)} ج.م</span>
                  </div>
                )}
                {activeReceiptOrder.vatAmount > 0 && (
                  <div className="flex justify-between">
                    <span>ضريبة القيمة المضافة (14%):</span>
                    <span>+{(Number(activeReceiptOrder.vatAmount) || 0).toFixed(2)} ج.م</span>
                  </div>
                )}
                {activeReceiptOrder.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>خدمة التوصيل:</span>
                    <span>+{(Number(activeReceiptOrder.deliveryFee) || 0).toFixed(2)} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1 border-t border-zinc-400">
                  <span>الصافي الإجمالي:</span>
                  <span>{(Number(activeReceiptOrder.total) || 0).toFixed(2)} ج.م</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="text-[10px] space-y-0.5 border-b border-dashed border-zinc-400 pb-2">
                <div className="flex justify-between">
                  <span>طريقة الدفع:</span>
                  <span className="font-bold uppercase">
                    {activeReceiptOrder.paymentMethodLabel || activeReceiptOrder.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>المدفوع:</span>
                  <span>{(Number(activeReceiptOrder.tenderAmount) || 0).toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>المتبقي:</span>
                  <span>{(Number(activeReceiptOrder.changeAmount) || 0).toFixed(2)} ج.م</span>
                </div>
              </div>

              {/* ZATCA / ETA Real Scannable QR Code & Footer */}
              <div className="text-center pt-2 space-y-2">
                <div className="flex justify-center">
                  <div className="p-2 border border-zinc-400 rounded-xl inline-block bg-white shadow-2xs">
                    <RealQrCode
                      value={`مصلحة الضرائب المصرية | الفاتورة الإلكترونية\nالمورد: ${settings.nameAr || "شركة وزير الحلو للحلويات والمواد الغذائية"}\nرقم التسجيل: 492-810-332\nفاتورة: ${activeReceiptOrder.orderNumber}\nالتاريخ: ${formatOrderDateTimeEnglish(activeReceiptOrder.createdAt || activeReceiptOrder.formattedDate)}\nالإجمالي: ${(Number(activeReceiptOrder.total) || 0).toFixed(2)} ج.م\nالضريبة: ${(Number(activeReceiptOrder.vatAmount) || 0).toFixed(2)} ج.م\nالفرع: ${safePickBranchName(activeReceiptOrder.branchName, lang)}`}
                      size={110}
                      level="M"
                      bordered={false}
                      title={`فاتورة ضريبية إلكترونية معتمدة ${activeReceiptOrder.orderNumber}`}
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-sans font-black">
                    شكراً لزيارتكم — وزير الحلو أصل الطعم الملكي!
                  </p>
                  <p className="text-[9px] text-zinc-600 font-mono">
                    *** فاتورة ضريبية إلكترونية معتمدة (ETA E-Receipt) ***
                  </p>
                  <p className="text-[8px] text-zinc-400 font-mono">
                    امسح الرمز للتحقق من صحة الفاتورة الضريبية
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 bg-muted/30 border-t border-border/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{pick("طباعة الإيصال", "Print Receipt")}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReceiptOrder(null)}
                className="py-2 px-4 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-bold cursor-pointer"
              >
                {pick("إغلاق", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: ITEMIZED ORDER DETAILS */}
      {/* ========================================================================= */}
      {activeDetailsOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                <h3 className="font-bold text-sm">
                  {pick("تفاصيل طلب نقطة البيع", "POS Order Details")} — {activeDetailsOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailsOrder(null)}
                className="hover:opacity-80 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30 border border-border/60 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold block">{pick("الفرع", "Branch")}:</span>
                  <span className="font-bold text-foreground">📍 {safePickBranchName(activeDetailsOrder.branchName, lang)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold block">{pick("الكاشير", "Cashier")}:</span>
                  <span className="font-bold text-foreground">👨‍🍳 {activeDetailsOrder.cashierName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold block">{pick("العميل", "Customer")}:</span>
                  <span className="font-bold text-foreground">👤 {activeDetailsOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold block">{pick("طريقة السداد", "Payment")}:</span>
                  <span className="font-bold text-foreground">{activeDetailsOrder.paymentMethodLabel}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-foreground">
                  {pick("قائمة أصناف الفاتورة", "Ordered Items")} ({(activeDetailsOrder.items || []).length})
                </h4>
                <div className="space-y-1.5">
                  {(activeDetailsOrder.items || []).map((it) => (
                    <div
                      key={it.id}
                      className="p-2.5 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-black text-foreground block">
                          {safePickItemName(it.name, lang)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {money(Number(it.unitPrice) || 0)} × {it.quantity || 1}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {money(Number(it.totalPrice) || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="p-3 rounded-2xl bg-muted/40 space-y-1 text-xs border border-border/60">
                <div className="flex justify-between text-muted-foreground">
                  <span>{pick("المجموع الفرعي", "Subtotal")}:</span>
                  <span className="font-mono">{money(Number(activeDetailsOrder.subtotal) || 0)}</span>
                </div>
                {(activeDetailsOrder.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>{pick("الخصم", "Discount")}:</span>
                    <span className="font-mono">-{money(Number(activeDetailsOrder.discountAmount) || 0)}</span>
                  </div>
                )}
                {(activeDetailsOrder.vatAmount || 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{pick("ضريبة القيمة المضافة (14%)", "VAT (14%)")}:</span>
                    <span className="font-mono">+{money(Number(activeDetailsOrder.vatAmount) || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-foreground pt-1 border-t border-border">
                  <span>{pick("الإجمالي الصافي", "Total Net")}:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {money(Number(activeDetailsOrder.total) || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted/30 border-t border-border/70 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveReceiptOrder(activeDetailsOrder);
                  setActiveDetailsOrder(null);
                }}
                className="py-2 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{pick("معاينة الإيصال الحراري", "Thermal Receipt")}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailsOrder(null)}
                className="py-2 px-4 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-bold cursor-pointer"
              >
                {pick("إغلاق", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminPosOrdersView() {
  return (
    <PosErrorBoundary>
      <AdminPosOrdersInner />
    </PosErrorBoundary>
  );
}
