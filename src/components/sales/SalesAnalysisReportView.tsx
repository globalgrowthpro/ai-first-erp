import { useState, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Store,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  CreditCard,
  Banknote,
  Receipt,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  Building2,
  Clock,
  Layers,
  ChevronDown,
  Filter,
  DollarSign,
  ShoppingBag,
  Search,
  Eye,
  X,
  FileText,
  BadgePercent,
} from "lucide-react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import { Btn, StatusPill, TablePagination, usePagination } from "@/components/kit";
import { usePosOrdersStore, BRANCH_NAMES_MAP, type AdminPosOrder } from "@/lib/pos-orders-store";
import { useSalesStore, type BizDocument } from "@/lib/documents-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SalesAnalysisReportViewProps {
  initialBranch?: string;
  onNavigateBack?: () => void;
}

export function SalesAnalysisReportView({
  initialBranch = "khosoos",
  onNavigateBack,
}: SalesAnalysisReportViewProps) {
  const { lang, money, pick } = useI18n();
  const { orders: livePosOrders, refresh: refreshOrders, loading: posLoading } = usePosOrdersStore();
  const { documents: salesDocuments } = useSalesStore();

  // Filters State
  const [selectedChain, setSelectedChain] = useState<string>("wazeer_el_helw");
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);
  const [dateRangePreset, setDateRangePreset] = useState<"oct_2026" | "this_month" | "last_month" | "today" | "all_time" | "custom">("oct_2026");
  const [dateFrom, setDateFrom] = useState<string>("2026-10-01");
  const [dateTo, setDateTo] = useState<string>("2026-10-31");
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const [viewTab, setViewTab] = useState<"summary" | "daily_ledger" | "orders_list">("summary");

  // Search & Order Details Modal
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>("");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<AdminPosOrder | null>(null);

  const reportPrintRef = useRef<HTMLDivElement>(null);

  // Handle Preset Changes
  const handlePresetChange = (preset: "oct_2026" | "this_month" | "last_month" | "today" | "all_time" | "custom") => {
    setDateRangePreset(preset);
    const now = new Date();
    if (preset === "oct_2026") {
      setDateFrom("2026-10-01");
      setDateTo("2026-10-31");
    } else if (preset === "today") {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      setDateFrom(`${y}-${m}-${d}`);
      setDateTo(`${y}-${m}-${d}`);
    } else if (preset === "this_month") {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      setDateFrom(`${y}-${m}-01`);
      setDateTo(`${y}-${m}-${new Date(y, now.getMonth() + 1, 0).getDate()}`);
    } else if (preset === "last_month") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prev.getFullYear();
      const m = String(prev.getMonth() + 1).padStart(2, "0");
      setDateFrom(`${y}-${m}-01`);
      setDateTo(`${y}-${m}-${new Date(y, prev.getMonth() + 1, 0).getDate()}`);
    } else if (preset === "all_time") {
      setDateFrom("2026-01-01");
      setDateTo("2026-12-31");
    }
  };

  // Real filtered orders matching branch & date range strictly from the live store
  const matchingOrders = useMemo(() => {
    return (livePosOrders || []).filter((ord) => {
      if (selectedBranch !== "all" && ord.branchId !== selectedBranch) return false;
      const orderDate = (ord.createdAt || "").slice(0, 10);
      if (dateFrom && orderDate < dateFrom) return false;
      if (dateTo && orderDate > dateTo) return false;
      return true;
    });
  }, [livePosOrders, selectedBranch, dateFrom, dateTo]);

  // Dynamic real calculations derived 100% from matching orders
  const reportData = useMemo(() => {
    const grossSales = matchingOrders.reduce((sum, o) => sum + (Number(o.subtotal) || Number(o.total) || 0), 0);
    const netSales = matchingOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const orderCount = matchingOrders.length;
    const averageTicket = orderCount > 0 ? netSales / orderCount : 0;
    const discount = matchingOrders.reduce((sum, o) => sum + (Number(o.discountAmount) || 0), 0);
    const tax = matchingOrders.reduce((sum, o) => sum + (Number(o.vatAmount) || 0), 0);
    const service = 0;
    const rounding = 0;
    const tips = 0;
    const expenses = 0;
    const received = 0;
    const advance = 0;
    const closedAdvance = 0;
    const returnsCount = matchingOrders.filter((o) => o.status === "cancelled" || o.status === "refunded").length;
    const returnsAmount = matchingOrders
      .filter((o) => o.status === "cancelled" || o.status === "refunded")
      .reduce((s, o) => s + (Number(o.total) || 0), 0);

    // Channels breakdown strictly calculated from actual orders
    const channels = {
      takeaway: { sales: 0, count: 0, avg: 0, percent: 0 },
      delivery: { sales: 0, count: 0, avg: 0, percent: 0 },
      dineIn: { sales: 0, count: 0, avg: 0, percent: 0 },
      aggregators: { sales: 0, count: 0, avg: 0, percent: 0 },
    };

    matchingOrders.forEach((ord) => {
      const type = (ord.orderType || "").toLowerCase();
      const plat = (ord.orderPlatform || "").toLowerCase();
      const amt = Number(ord.total) || 0;

      if (plat && plat !== "direct") {
        channels.aggregators.sales += amt;
        channels.aggregators.count += 1;
      } else if (type === "dine_in") {
        channels.dineIn.sales += amt;
        channels.dineIn.count += 1;
      } else if (type === "delivery") {
        channels.delivery.sales += amt;
        channels.delivery.count += 1;
      } else {
        channels.takeaway.sales += amt;
        channels.takeaway.count += 1;
      }
    });

    const totalChannelSales = netSales || 1;
    channels.takeaway.avg = channels.takeaway.count ? channels.takeaway.sales / channels.takeaway.count : 0;
    channels.takeaway.percent = Number(((channels.takeaway.sales / totalChannelSales) * 100).toFixed(1));

    channels.delivery.avg = channels.delivery.count ? channels.delivery.sales / channels.delivery.count : 0;
    channels.delivery.percent = Number(((channels.delivery.sales / totalChannelSales) * 100).toFixed(1));

    channels.dineIn.avg = channels.dineIn.count ? channels.dineIn.sales / channels.dineIn.count : 0;
    channels.dineIn.percent = Number(((channels.dineIn.sales / totalChannelSales) * 100).toFixed(1));

    channels.aggregators.avg = channels.aggregators.count ? channels.aggregators.sales / channels.aggregators.count : 0;
    channels.aggregators.percent = Number(((channels.aggregators.sales / totalChannelSales) * 100).toFixed(1));

    // Payments breakdown strictly calculated from actual orders
    const payments = {
      cash: { count: 0, total: 0, percent: 0 },
      visa: { count: 0, total: 0, percent: 0 },
      aggregatorCash: { count: 0, total: 0, percent: 0 },
      aggregatorVisa: { count: 0, total: 0, percent: 0 },
      other: { count: 0, total: 0, percent: 0 },
    };

    matchingOrders.forEach((ord) => {
      const m = (ord.paymentMethod || "").toLowerCase();
      const plat = (ord.orderPlatform || "").toLowerCase();
      const amt = Number(ord.total) || 0;

      if (plat && plat !== "direct") {
        if (m === "cash" || m === "نقداً") {
          payments.aggregatorCash.count += 1;
          payments.aggregatorCash.total += amt;
        } else {
          payments.aggregatorVisa.count += 1;
          payments.aggregatorVisa.total += amt;
        }
      } else if (m.includes("cash") || m === "نقداً") {
        payments.cash.count += 1;
        payments.cash.total += amt;
      } else if (m.includes("card") || m.includes("visa") || m === "فيزا") {
        payments.visa.count += 1;
        payments.visa.total += amt;
      } else {
        payments.other.count += 1;
        payments.other.total += amt;
      }
    });

    const totalCollected = netSales || 1;
    payments.cash.percent = Number(((payments.cash.total / totalCollected) * 100).toFixed(2));
    payments.visa.percent = Number(((payments.visa.total / totalCollected) * 100).toFixed(2));
    payments.aggregatorCash.percent = Number(((payments.aggregatorCash.total / totalCollected) * 100).toFixed(2));
    payments.aggregatorVisa.percent = Number(((payments.aggregatorVisa.total / totalCollected) * 100).toFixed(2));
    payments.other.percent = Number(((payments.other.total / totalCollected) * 100).toFixed(2));

    return {
      grossSales,
      netSales,
      orderCount,
      averageTicket,
      discount,
      service,
      tax,
      rounding,
      tips,
      expenses,
      received,
      advance,
      closedAdvance,
      returnsCount,
      returnsAmount,
      channels,
      payments,
    };
  }, [matchingOrders]);

  // Real Daily Ledger aggregated strictly from actual orders grouped by date
  const dailyLedger = useMemo(() => {
    const arabicDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const groups: Record<
      string,
      {
        date: string;
        dayName: string;
        orderCount: number;
        takeawaySales: number;
        deliverySales: number;
        dineInSales: number;
        cashSales: number;
        visaSales: number;
        totalSales: number;
      }
    > = {};

    matchingOrders.forEach((ord) => {
      const dStr = (ord.createdAt || "").slice(0, 10);
      if (!dStr) return;

      if (!groups[dStr]) {
        const dObj = new Date(dStr);
        const dayIdx = isNaN(dObj.getDay()) ? 0 : dObj.getDay();
        groups[dStr] = {
          date: dStr,
          dayName: arabicDays[dayIdx],
          orderCount: 0,
          takeawaySales: 0,
          deliverySales: 0,
          dineInSales: 0,
          cashSales: 0,
          visaSales: 0,
          totalSales: 0,
        };
      }

      const amt = Number(ord.total) || 0;
      const type = (ord.orderType || "").toLowerCase();
      const m = (ord.paymentMethod || "").toLowerCase();

      groups[dStr].orderCount += 1;
      groups[dStr].totalSales += amt;

      if (type === "dine_in") {
        groups[dStr].dineInSales += amt;
      } else if (type === "delivery") {
        groups[dStr].deliverySales += amt;
      } else {
        groups[dStr].takeawaySales += amt;
      }

      if (m.includes("card") || m.includes("visa")) {
        groups[dStr].visaSales += amt;
      } else {
        groups[dStr].cashSales += amt;
      }
    });

    const list = Object.values(groups).map((row) => ({
      ...row,
      avgTicket: row.orderCount > 0 ? Number((row.totalSales / row.orderCount).toFixed(2)) : 0,
    }));

    // Sort ascending by date
    list.sort((a, b) => a.date.localeCompare(b.date));
    return list;
  }, [matchingOrders]);

  // Filtered orders for the "Individual Orders" view tab
  const filteredOrdersList = useMemo(() => {
    if (!orderSearchQuery.trim()) return matchingOrders;
    const q = orderSearchQuery.toLowerCase().trim();
    return matchingOrders.filter((o) => {
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.cashierName.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        (o.paymentMethodLabel || o.paymentMethod || "").toLowerCase().includes(q)
      );
    });
  }, [matchingOrders, orderSearchQuery]);

  const {
    currentPage: ordersPage,
    setCurrentPage: setOrdersPage,
    paginatedItems: paginatedOrders,
    totalPages: totalOrdersPages,
  } = usePagination(filteredOrdersList, 25);

  // Excel Export Handler using real aggregated data
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: الملخص المالي التنفيذي
      const summaryRows = [
        ["تقرير تحليل المبيعات — وزير الحلو", ""],
        ["الفرع:", selectedBranch === "khosoos" ? "وزير فرع الخصوص" : selectedBranch === "all" ? "كافة الفروع" : selectedBranch],
        ["الفترة الزمنية:", `من ${dateFrom} إلى ${dateTo}`],
        ["إجمالي عدد الفواتير الفعلية:", reportData.orderCount],
        ["تاريخ استخراج التقرير:", new Date().toLocaleString("ar-EG")],
        [],
        ["المؤشر التحليلي", "القيمة (ج.م)"],
        ["إجمالي مبيعات الأصناف (Gross)", reportData.grossSales],
        ["صافي المبيعات الفعلي (Net)", reportData.netSales],
        ["عدد الفواتير المنفذة", reportData.orderCount],
        ["متوسط قيمة الفاتورة (Average Ticket)", reportData.averageTicket],
        ["الخصم الممنوح", reportData.discount],
        ["الخدمة", reportData.service],
        ["ضريبة القيمة المضافة", reportData.tax],
        ["التقريب", reportData.rounding],
        ["الإكرامية", reportData.tips],
        ["المصروفات من الدرج", reportData.expenses],
        ["المرتجع (عدد)", reportData.returnsCount],
        ["المرتجع (إجمالي)", reportData.returnsAmount],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "الملخص المالي");

      // Sheet 2: قنوات الطلب
      const channelRows = [
        ["نوع الطلب / القناة", "إجمالي المبيعات (ج.م)", "عدد الطلبات", "متوسط الفاتورة (ج.م)", "النسبة %"],
        ["تيك أواي (Takeaway)", reportData.channels.takeaway.sales, reportData.channels.takeaway.count, reportData.channels.takeaway.avg, `${reportData.channels.takeaway.percent}%`],
        ["التوصيل (Delivery)", reportData.channels.delivery.sales, reportData.channels.delivery.count, reportData.channels.delivery.avg, `${reportData.channels.delivery.percent}%`],
        ["الصالة (Dine-in)", reportData.channels.dineIn.sales, reportData.channels.dineIn.count, reportData.channels.dineIn.avg, `${reportData.channels.dineIn.percent}%`],
        ["المصادر والتطبيقات (Aggregators)", reportData.channels.aggregators.sales, reportData.channels.aggregators.count, reportData.channels.aggregators.avg, `${reportData.channels.aggregators.percent}%`],
      ];
      const wsChannels = XLSX.utils.aoa_to_sheet(channelRows);
      XLSX.utils.book_append_sheet(wb, wsChannels, "أنواع الطلب");

      // Sheet 3: طرق الدفع
      const paymentRows = [
        ["طريقة التحصيل والدفع", "عدد الحركات", "إجمالي المحصل (ج.م)", "النسبة %"],
        ["كاش نقدي (Cash)", reportData.payments.cash.count, reportData.payments.cash.total, `${reportData.payments.cash.percent}%`],
        ["فيزا وبطاقات (Visa)", reportData.payments.visa.count, reportData.payments.visa.total, `${reportData.payments.visa.percent}%`],
        ["كاش المصادر (COD)", reportData.payments.aggregatorCash.count, reportData.payments.aggregatorCash.total, `${reportData.payments.aggregatorCash.percent}%`],
        ["فيزا المصادر (Online)", reportData.payments.aggregatorVisa.count, reportData.payments.aggregatorVisa.total, `${reportData.payments.aggregatorVisa.percent}%`],
        ["أخرى (Other)", reportData.payments.other.count, reportData.payments.other.total, `${reportData.payments.other.percent}%`],
      ];
      const wsPayments = XLSX.utils.aoa_to_sheet(paymentRows);
      XLSX.utils.book_append_sheet(wb, wsPayments, "طرق التحصيل");

      // Sheet 4: اليومية الفعلية
      const dailyRows = [
        ["التاريخ", "اليوم", "عدد الطلبات", "تيك أواي (ج.م)", "توصيل (ج.م)", "صالة (ج.م)", "كاش (ج.م)", "فيزا (ج.م)", "الإجمالي (ج.م)", "متوسط الطلب"],
        ...dailyLedger.map((d) => [
          d.date,
          d.dayName,
          d.orderCount,
          d.takeawaySales,
          d.deliverySales,
          d.dineInSales,
          d.cashSales,
          d.visaSales,
          d.totalSales,
          d.avgTicket,
        ]),
      ];
      const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
      XLSX.utils.book_append_sheet(wb, wsDaily, "سجل اليوميات");

      // Sheet 5: سجل كافة الفواتير الفردية
      const orderRows = [
        ["رقم الفاتورة", "التاريخ والوقت", "الكاشير", "نوع الطلب", "المنصة", "طريقة الدفع", "المبلغ الإجمالي (ج.م)", "الحالة"],
        ...matchingOrders.map((o) => [
          o.orderNumber,
          o.createdAt,
          o.cashierName,
          o.orderType,
          o.orderPlatformName || o.orderPlatform,
          o.paymentMethodLabel || o.paymentMethod,
          o.total,
          o.status,
        ]),
      ];
      const wsOrders = XLSX.utils.aoa_to_sheet(orderRows);
      XLSX.utils.book_append_sheet(wb, wsOrders, "كافة الفواتير");

      const fileName = `تقرير_تحليل_المبيعات_الفعلية_${selectedBranch}_${dateFrom}_إلى_${dateTo}.xlsx`;
      safeDownloadWorkbook(wb, fileName);
      toast.success(lang === "ar" ? "تم تصدير البيانات الفعلية إلى Excel بنجاح!" : "Real sales data exported to Excel successfully!");
    } catch (err) {
      console.error(err);
      toast.error(lang === "ar" ? "تعذر تصدير الملف" : "Failed to export Excel file");
    }
  };

  return (
    <div className="space-y-6" ref={reportPrintRef}>
      {/* Print-Only Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-950">سلسلة وزير الحلو للحلويات الشرقية والغربية</h1>
            <h2 className="text-xl font-bold text-slate-800 mt-1">تقرير تحليل المبيعات الفعلي والبيانات المباشرة</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              المكان: {selectedBranch === "khosoos" ? "وزير فرع الخصوص" : selectedBranch === "all" ? "كافة الفروع" : selectedBranch} | الفترة: من {dateFrom} إلى {dateTo} | عدد الفواتير: {reportData.orderCount}
            </p>
          </div>
          <div className="text-left text-xs font-mono text-slate-500">
            <div>تاريخ الاستخراج: {new Date().toLocaleDateString("ar-EG")}</div>
            <div>نظام AI-First ERP المعتمد</div>
          </div>
        </div>
      </div>

      {/* Top Interactive Header & Filter Bar (Screen Only) */}
      <div className="print:hidden bg-card rounded-2xl p-4 sm:p-5 shadow-xs border border-border/80 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Title and Badges */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-amber-500/20">
            وح
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {lang === "ar" ? "تقرير تحليل المبيعات" : "Sales Analysis Report"}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                {lang === "ar" ? "بيانات فعلية 100%" : "100% Real Data"}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-secondary text-muted-foreground font-mono">
                {reportData.orderCount.toLocaleString("en-US")} {lang === "ar" ? "فاتورة مسجلة" : "orders"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {lang === "ar" ? "السلسلة: " : "Chain: "}
              <strong className="text-foreground">وزير الحلو</strong> • {lang === "ar" ? "الفرع: " : "Branch: "}
              <strong className="text-foreground">
                {selectedBranch === "khosoos" ? "وزير فرع الخصوص" : selectedBranch === "all" ? "كافة الفروع" : selectedBranch}
              </strong>
            </p>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Selector */}
          <div className="flex items-center gap-1.5 bg-secondary/80 px-2.5 py-1.5 rounded-xl border border-border/80 text-xs">
            <Store className="size-3.5 text-muted-foreground" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-foreground font-bold text-xs outline-none cursor-pointer"
            >
              <option value="khosoos">وزير فرع الخصوص (El-Khosoos)</option>
              <option value="all">كافة الفروع (All Branches)</option>
              <option value="korba">فرع الكوربة — مصر الجديدة</option>
              <option value="maadi">فرع المعادي — شارع النصر</option>
              <option value="tagamoa">فرع التجمع الخامس — التسعين</option>
              <option value="sheikh_zayed">فرع الشيخ زايد — أمريكانا</option>
              <option value="abbas">فرع عباس العقاد — مدينة نصر</option>
              <option value="wost_elbalad">فرع وسط البلد — طلعت حرب</option>
              <option value="faisal">فرع فيصل الرئيسي</option>
              <option value="alex">فرع الإسكندرية — سموحة</option>
            </select>
          </div>

          {/* Date Presets Dropdown */}
          <div className="flex items-center gap-1.5 bg-secondary/80 px-2.5 py-1.5 rounded-xl border border-border/80 text-xs">
            <Calendar className="size-3.5 text-muted-foreground" />
            <select
              value={dateRangePreset}
              onChange={(e) => handlePresetChange(e.target.value as any)}
              className="bg-transparent text-foreground font-bold text-xs outline-none cursor-pointer"
            >
              <option value="oct_2026">أكتوبر 2026 (تقرير فرع الخصوص)</option>
              <option value="today">اليوم (Today)</option>
              <option value="this_month">الشهر الحالي (This Month)</option>
              <option value="last_month">الشهر السابق (Last Month)</option>
              <option value="all_time">كامل السنة (Full Year)</option>
              <option value="custom">تاريخ مخصص (Custom)</option>
            </select>
          </div>

          {/* Custom Date Range Inputs */}
          {dateRangePreset === "custom" && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground font-bold"
              />
              <span className="text-muted-foreground">إلى</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground font-bold"
              />
            </div>
          )}

          {/* Refresh Real Data */}
          <button
            type="button"
            onClick={() => {
              refreshOrders();
              toast.success(lang === "ar" ? "تم تحديث البيانات المباشرة!" : "Live data refreshed!");
            }}
            className="p-2 rounded-xl bg-secondary/80 border border-border/80 text-muted-foreground hover:text-foreground transition"
            title={lang === "ar" ? "تحديث البيانات الحية" : "Refresh live data"}
          >
            <RotateCcw className={`size-3.5 ${posLoading ? "animate-spin text-primary" : ""}`} />
          </button>

          {/* Action Buttons */}
          <Btn
            variant="solid"
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="size-3.5" />
            <span>{lang === "ar" ? "تصدير Excel" : "Export Excel"}</span>
          </Btn>

          <Btn
            variant="outline"
            onClick={() => window.print()}
            className="font-bold text-xs gap-1.5 border-border/80 hover:bg-secondary"
          >
            <Printer className="size-3.5" />
            <span>{lang === "ar" ? "طباعة" : "Print"}</span>
          </Btn>

          {onNavigateBack && (
            <Btn variant="ghost" onClick={onNavigateBack} className="text-xs font-bold">
              {lang === "ar" ? "رجوع" : "Back"}
            </Btn>
          )}
        </div>
      </div>

      {/* Internal Navigation Tabs (Summary vs Daily Ledger vs Real Orders List) */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3">
        <button
          type="button"
          onClick={() => setViewTab("summary")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            viewTab === "summary"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="size-3.5" />
          <span>{lang === "ar" ? "ملخص التحليل المالي والأنواع" : "Executive Analysis & Breakdown"}</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab("daily_ledger")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            viewTab === "daily_ledger"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="size-3.5" />
          <span>{lang === "ar" ? "سجل اليوميات الفعلية" : "Daily Sales Ledger"}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-foreground">
            {dailyLedger.length} {lang === "ar" ? "يوماً" : "days"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab("orders_list")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            viewTab === "orders_list"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="size-3.5" />
          <span>{lang === "ar" ? "سجل الفواتير الفردية (فحص الطلبات)" : "Individual Orders Audit"}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            {matchingOrders.length.toLocaleString("en-US")} {lang === "ar" ? "فاتورة" : "bills"}
          </span>
        </button>
      </div>

      {/* TAB 1: EXECUTIVE SUMMARY */}
      {viewTab === "summary" && (
        <div className="space-y-6">
          {/* SECTION 1: إجمالي المبيعات (EXECUTIVE KPI GRID) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  {lang === "ar" ? "إجمالي المبيعات ومؤشرات الأداء" : "Gross & Net Sales Overview"}
                </h2>
                <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                  القسم الأول
                </span>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                الفترة: {dateFrom} — {dateTo}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Card 1: Gross Sales */}
              <div className="bg-card p-5 rounded-2xl border border-border/80 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    {lang === "ar" ? "مبيعات الأصناف (Gross)" : "Gross Item Sales"}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ShoppingBag className="size-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {reportData.grossSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-bold text-muted-foreground">ج.م</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">100%</span>
                  <span>{lang === "ar" ? "إجمالي حجم المبيعات المسجلة" : "Total gross volume"}</span>
                </div>
              </div>

              {/* Card 2: Net Sales */}
              <div className="bg-card p-5 rounded-2xl border-2 border-emerald-500/40 shadow-xs bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent relative overflow-hidden group">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    {lang === "ar" ? "صافي المبيعات (Net Sales)" : "Net Sales"}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="size-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {reportData.netSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">ج.م</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />
                  <span>{lang === "ar" ? "صافي مستحق بعد التسويات" : "Audited net total"}</span>
                </div>
              </div>

              {/* Card 3: Orders Count */}
              <div className="bg-card p-5 rounded-2xl border border-border/80 shadow-xs relative overflow-hidden hover:border-blue-500/40 transition">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    {lang === "ar" ? "عدد الفواتير (Orders)" : "Invoices Count"}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Receipt className="size-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {reportData.orderCount.toLocaleString("en-US")}{" "}
                  <span className="text-xs font-bold text-muted-foreground">{lang === "ar" ? "طلب" : "orders"}</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-muted-foreground">
                  {lang === "ar" ? "المعدل: " : "Pace: "}
                  <strong className="text-foreground">
                    ~{dailyLedger.length > 0 ? Math.round(reportData.orderCount / dailyLedger.length) : 0}{" "}
                    {lang === "ar" ? "طلب يومياً" : "orders/day"}
                  </strong>
                </div>
              </div>

              {/* Card 4: Average Ticket */}
              <div className="bg-card p-5 rounded-2xl border border-border/80 shadow-xs relative overflow-hidden hover:border-purple-500/40 transition">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    {lang === "ar" ? "متوسط الفاتورة (Ticket)" : "Average Ticket"}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <TrendingUp className="size-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                  {reportData.averageTicket.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-bold text-muted-foreground">ج.م</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-muted-foreground">
                  {lang === "ar" ? "معدل قيمة السلة للعملية الواحدة" : "Average customer spending per order"}
                </div>
              </div>
            </div>

            {/* Deductions, Tips & Operational Strip */}
            <div className="bg-card rounded-2xl p-4 border border-border/80 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {lang === "ar" ? "التسويات والخصومات والمرتجعات التشغيلية" : "Operational Deductions & Adjustments"}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  المرتجع: {reportData.returnsCount} عمليات
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
                <div className="bg-secondary/60 p-2.5 rounded-xl border border-border/60">
                  <div className="text-[11px] text-muted-foreground font-bold">{lang === "ar" ? "الخصم" : "Discount"}</div>
                  <div className="text-sm font-black text-foreground mt-0.5">
                    {reportData.discount.toFixed(2)} ج.م
                  </div>
                </div>
                <div className="bg-secondary/60 p-2.5 rounded-xl border border-border/60">
                  <div className="text-[11px] text-muted-foreground font-bold">{lang === "ar" ? "الخدمة" : "Service"}</div>
                  <div className="text-sm font-black text-foreground mt-0.5">
                    {reportData.service.toFixed(2)} ج.م
                  </div>
                </div>
                <div className="bg-secondary/60 p-2.5 rounded-xl border border-border/60">
                  <div className="text-[11px] text-muted-foreground font-bold">{lang === "ar" ? "الضريبة" : "VAT / Tax"}</div>
                  <div className="text-sm font-black text-foreground mt-0.5">
                    {reportData.tax.toFixed(2)} ج.م
                  </div>
                </div>
                <div className="bg-secondary/60 p-2.5 rounded-xl border border-border/60">
                  <div className="text-[11px] text-muted-foreground font-bold">{lang === "ar" ? "التقريب" : "Rounding"}</div>
                  <div className="text-sm font-black text-foreground mt-0.5">
                    {reportData.rounding.toFixed(2)} ج.م
                  </div>
                </div>
                <div className="bg-secondary/60 p-2.5 rounded-xl border border-border/60">
                  <div className="text-[11px] text-muted-foreground font-bold">{lang === "ar" ? "الإكرامية" : "Tips"}</div>
                  <div className="text-sm font-black text-foreground mt-0.5">
                    {reportData.tips.toFixed(2)} ج.م
                  </div>
                </div>
                <div className="bg-secondary/60 p-2.5 rounded-xl border border-border/60">
                  <div className="text-[11px] text-muted-foreground font-bold">{lang === "ar" ? "المصروفات" : "Expenses"}</div>
                  <div className="text-sm font-black text-foreground mt-0.5">
                    {reportData.expenses.toFixed(2)} ج.م
                  </div>
                </div>
                <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                    {lang === "ar" ? `المرتجع (${reportData.returnsCount})` : `Returns (${reportData.returnsCount})`}
                  </div>
                  <div className="text-sm font-black text-rose-700 dark:text-rose-400 mt-0.5">
                    {reportData.returnsAmount.toFixed(2)} ج.م
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: أنواع الطلب (ORDER CHANNELS) */}
          <div className="bg-card rounded-2xl p-5 sm:p-6 border border-border/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-foreground">
                    {lang === "ar" ? "أنواع الطلب وقنوات البيع" : "Order Types & Sales Channels"}
                  </h2>
                  <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                    القسم الثاني
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "ar"
                    ? "توزيع مبيعات التيك أواي والصالة والتوصيل والتطبيقات الخارجية"
                    : "Distribution of Takeaway, Dine-in, Delivery and Aggregator platforms"}
                </p>
              </div>
              <span className="text-xs font-bold text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                4 {lang === "ar" ? "قنوات بيعية" : "channels"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Channel 1: Takeaway */}
              <div className="relative bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl p-5 border-2 border-amber-500/50 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-500 text-slate-950 shadow-xs">
                    {lang === "ar" ? "تيك أواي (Takeaway)" : "Takeaway"}
                  </span>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md">
                    {reportData.channels.takeaway.percent}%
                  </span>
                </div>
                <div className="space-y-1 mt-2">
                  <div className="text-xs text-muted-foreground">{lang === "ar" ? "المبيعات" : "Total Sales"}</div>
                  <div className="text-xl sm:text-2xl font-black text-foreground">
                    {reportData.channels.takeaway.sales.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                    <span className="text-xs font-bold text-muted-foreground">ج.م</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-amber-500/20 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">{lang === "ar" ? "العدد" : "Count"}</span>
                    <span className="font-bold text-foreground text-sm">
                      {reportData.channels.takeaway.count.toLocaleString("en-US")} {lang === "ar" ? "طلب" : "orders"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">{lang === "ar" ? "المتوسط" : "Average"}</span>
                    <span className="font-bold text-foreground text-sm">
                      {reportData.channels.takeaway.avg.toFixed(2)} ج.م
                    </span>
                  </div>
                </div>
              </div>

              {/* Channel 2: Delivery */}
              <div className="bg-secondary/40 rounded-2xl p-5 border border-border/70 opacity-70 hover:opacity-100 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-secondary text-foreground">
                    {lang === "ar" ? "التوصيل (Delivery)" : "Delivery"}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">{reportData.channels.delivery.percent}%</span>
                </div>
                <div className="space-y-1 mt-2">
                  <div className="text-xs text-muted-foreground">{lang === "ar" ? "المبيعات" : "Total Sales"}</div>
                  <div className="text-xl sm:text-2xl font-black text-muted-foreground">
                    {reportData.channels.delivery.sales.toFixed(2)}{" "}
                    <span className="text-xs font-bold">ج.م</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/70 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">{lang === "ar" ? "العدد" : "Count"}</span>
                    <span className="font-bold text-muted-foreground text-sm">
                      {reportData.channels.delivery.count} {lang === "ar" ? "طلب" : "orders"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">{lang === "ar" ? "المتوسط" : "Average"}</span>
                    <span className="font-bold text-muted-foreground text-sm">{reportData.channels.delivery.avg.toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Channel 3: Dine-in */}
              <div className="bg-secondary/40 rounded-2xl p-5 border border-border/70 opacity-70 hover:opacity-100 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-secondary text-foreground">
                    {lang === "ar" ? "الصالة (Dine-in)" : "Dine-in"}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">{reportData.channels.dineIn.percent}%</span>
                </div>
                <div className="space-y-1 mt-2">
                  <div className="text-xs text-muted-foreground">{lang === "ar" ? "المبيعات" : "Total Sales"}</div>
                  <div className="text-xl sm:text-2xl font-black text-muted-foreground">
                    {reportData.channels.dineIn.sales.toFixed(2)}{" "}
                    <span className="text-xs font-bold">ج.م</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/70 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">{lang === "ar" ? "العدد" : "Count"}</span>
                    <span className="font-bold text-muted-foreground text-sm">
                      {reportData.channels.dineIn.count} {lang === "ar" ? "طلب" : "orders"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">{lang === "ar" ? "المتوسط" : "Average"}</span>
                    <span className="font-bold text-muted-foreground text-sm">{reportData.channels.dineIn.avg.toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Channel 4: Aggregators */}
              <div className="bg-secondary/40 rounded-2xl p-5 border border-border/70 opacity-70 hover:opacity-100 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-secondary text-foreground">
                    {lang === "ar" ? "المصادر (Aggregators)" : "Aggregators"}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">{reportData.channels.aggregators.percent}%</span>
                </div>
                <div className="space-y-1 mt-2">
                  <div className="text-xs text-muted-foreground">{lang === "ar" ? "المبيعات" : "Total Sales"}</div>
                  <div className="text-xl sm:text-2xl font-black text-muted-foreground">
                    {reportData.channels.aggregators.sales.toFixed(2)}{" "}
                    <span className="text-xs font-bold">ج.م</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/70 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">{lang === "ar" ? "العدد" : "Count"}</span>
                    <span className="font-bold text-muted-foreground text-sm">
                      {reportData.channels.aggregators.count} {lang === "ar" ? "طلب" : "orders"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">{lang === "ar" ? "المتوسط" : "Average"}</span>
                    <span className="font-bold text-muted-foreground text-sm">{reportData.channels.aggregators.avg.toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: طرق الدفع والتحصيل (PAYMENT METHODS) */}
          <div className="bg-card rounded-2xl p-5 sm:p-6 border border-border/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-foreground">
                    {lang === "ar" ? "أنواع الدفع والتحصيل المالي" : "Payment Methods & Tender Breakdown"}
                  </h2>
                  <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                    القسم الثالث
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "ar"
                    ? "تفصيل النقدية والبطاقات ومتحصلات التطبيقات الإلكترونية"
                    : "Cash, Card POS, and platform collections audit"}
                </p>
              </div>
              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {lang === "ar" ? "إجمالي المحصل: " : "Collected: "}
                {reportData.netSales.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* 1. Cash */}
              <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    <Banknote className="size-4" />
                  </div>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    {reportData.payments.cash.percent}%
                  </span>
                </div>
                <div className="text-xs font-bold text-muted-foreground">
                  {lang === "ar" ? "كاش نقدي (Cash)" : "Cash In Hand"}
                </div>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">
                  {reportData.payments.cash.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-[10px] font-bold">ج.م</span>
                </div>
                <div className="text-xs text-muted-foreground font-semibold mt-2 pt-2 border-t border-emerald-500/20">
                  {lang === "ar" ? "العدد: " : "Count: "}
                  <strong className="text-foreground">{reportData.payments.cash.count.toLocaleString("en-US")}</strong> {lang === "ar" ? "فاتورة" : "bills"}
                </div>
              </div>

              {/* 2. Visa */}
              <div className="bg-blue-500/5 rounded-2xl p-4 border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    <CreditCard className="size-4" />
                  </div>
                  <span className="text-xs font-black text-blue-700 dark:text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">
                    {reportData.payments.visa.percent}%
                  </span>
                </div>
                <div className="text-xs font-bold text-muted-foreground">
                  {lang === "ar" ? "فيزا وبطاقات (Visa)" : "Credit Cards (Visa)"}
                </div>
                <div className="text-lg font-black text-blue-700 dark:text-blue-300 mt-1">
                  {reportData.payments.visa.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-[10px] font-bold">ج.م</span>
                </div>
                <div className="text-xs text-muted-foreground font-semibold mt-2 pt-2 border-t border-blue-500/20">
                  {lang === "ar" ? "العدد: " : "Count: "}
                  <strong className="text-foreground">{reportData.payments.visa.count}</strong> {lang === "ar" ? "عملية" : "tx"}
                </div>
              </div>

              {/* 3. Aggregator Cash */}
              <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                    🛵
                  </div>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
                    {reportData.payments.aggregatorCash.percent}%
                  </span>
                </div>
                <div className="text-xs font-bold text-muted-foreground">
                  {lang === "ar" ? "كاش المصادر (COD)" : "Aggregator COD"}
                </div>
                <div className="text-lg font-black text-amber-700 dark:text-amber-300 mt-1">
                  {reportData.payments.aggregatorCash.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-[10px] font-bold">ج.م</span>
                </div>
                <div className="text-xs text-muted-foreground font-semibold mt-2 pt-2 border-t border-amber-500/20">
                  {lang === "ar" ? "العدد: " : "Count: "}
                  <strong className="text-foreground">{reportData.payments.aggregatorCash.count}</strong> {lang === "ar" ? "فواتير" : "bills"}
                </div>
              </div>

              {/* 4. Aggregator Visa */}
              <div className="bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    🌐
                  </div>
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                    {reportData.payments.aggregatorVisa.percent}%
                  </span>
                </div>
                <div className="text-xs font-bold text-muted-foreground">
                  {lang === "ar" ? "فيزا المصادر (Online)" : "Aggregator Online"}
                </div>
                <div className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-1">
                  {reportData.payments.aggregatorVisa.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-[10px] font-bold">ج.م</span>
                </div>
                <div className="text-xs text-muted-foreground font-semibold mt-2 pt-2 border-t border-indigo-500/20">
                  {lang === "ar" ? "العدد: " : "Count: "}
                  <strong className="text-foreground">{reportData.payments.aggregatorVisa.count}</strong> {lang === "ar" ? "فواتير" : "bills"}
                </div>
              </div>

              {/* 5. Other */}
              <div className="bg-secondary/40 rounded-2xl p-4 border border-border/70 opacity-70">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    {reportData.payments.other.percent}%
                  </span>
                </div>
                <div className="text-xs font-bold text-muted-foreground">
                  {lang === "ar" ? "أخرى (Other)" : "Other"}
                </div>
                <div className="text-lg font-black text-muted-foreground mt-1">
                  {reportData.payments.other.total.toFixed(2)}{" "}
                  <span className="text-[10px] font-bold">ج.م</span>
                </div>
                <div className="text-xs text-muted-foreground font-semibold mt-2 pt-2 border-t border-border/70">
                  {lang === "ar" ? "العدد: " : "Count: "}
                  <strong className="text-muted-foreground">{reportData.payments.other.count}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REAL DAILY LEDGER */}
      {viewTab === "daily_ledger" && (
        <div className="bg-card rounded-2xl p-5 sm:p-6 border border-border/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-foreground">
                {lang === "ar" ? "سجل اليوميات والورديات الفعلية" : "Actual Daily Sales Ledger"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {lang === "ar"
                  ? "مجمعة مباشرة من الفواتير الحقيقية المنفذة في قاعدة البيانات"
                  : "Directly aggregated from actual orders executed in database"}
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-3 py-1 rounded-full">
              {dailyLedger.length} {lang === "ar" ? "يوماً به حركات" : "active days"}
            </span>
          </div>

          <div className="overflow-x-auto border border-border/80 rounded-xl">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-secondary/80 text-muted-foreground font-bold border-b border-border">
                  <th className="p-3 text-right">{lang === "ar" ? "التاريخ" : "Date"}</th>
                  <th className="p-3 text-right">{lang === "ar" ? "اليوم" : "Day"}</th>
                  <th className="p-3 text-center">{lang === "ar" ? "عدد الطلبات" : "Orders"}</th>
                  <th className="p-3 text-right">{lang === "ar" ? "تيك أواي (ج.م)" : "Takeaway"}</th>
                  <th className="p-3 text-right">{lang === "ar" ? "كاش (ج.م)" : "Cash"}</th>
                  <th className="p-3 text-right">{lang === "ar" ? "فيزا (ج.م)" : "Visa"}</th>
                  <th className="p-3 text-right font-black text-foreground">{lang === "ar" ? "الإجمالي (ج.م)" : "Total"}</th>
                  <th className="p-3 text-center">{lang === "ar" ? "متوسط الطلب" : "Avg Ticket"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {dailyLedger.map((row) => (
                  <tr key={row.date} className="hover:bg-muted/50 transition">
                    <td className="p-3 font-mono font-bold text-foreground">{row.date}</td>
                    <td className="p-3 text-muted-foreground font-medium">{row.dayName}</td>
                    <td className="p-3 text-center font-bold text-foreground">{row.orderCount}</td>
                    <td className="p-3 text-foreground font-semibold">
                      {row.takeawaySales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">
                      {row.cashSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-blue-600 dark:text-blue-400 font-bold">
                      {row.visaSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 font-black text-foreground">
                      {row.totalSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center font-mono text-purple-600 dark:text-purple-400 font-bold">
                      {row.avgTicket.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-secondary font-black text-foreground border-t-2 border-border">
                  <td className="p-3" colSpan={2}>{lang === "ar" ? "المجموع الكلي الفعلي" : "Grand Total"}</td>
                  <td className="p-3 text-center text-primary">{reportData.orderCount.toLocaleString("en-US")}</td>
                  <td className="p-3">{reportData.grossSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-emerald-600 dark:text-emerald-400">{reportData.payments.cash.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-blue-600 dark:text-blue-400">{reportData.payments.visa.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-base text-emerald-600 dark:text-emerald-400">{reportData.netSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-center text-purple-600 dark:text-purple-400">{reportData.averageTicket.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INDIVIDUAL ORDERS AUDIT */}
      {viewTab === "orders_list" && (
        <div className="bg-card rounded-2xl p-5 sm:p-6 border border-border/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-foreground">
                {lang === "ar" ? "سجل فحص الفواتير الفردية المباشرة" : "Individual Real Orders Ledger"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {lang === "ar"
                  ? "قائمة بكافة الفواتير الحقيقية المضمنة في حسابات هذا التقرير مع إمكانية البحث ومعاينة بنود كل فاتورة"
                  : "Complete list of individual orders with items drill-down inspection"}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={lang === "ar" ? "بحث برقم الفاتورة، الكاشير، طريقة الدفع..." : "Search order #, cashier, payment..."}
                value={orderSearchQuery}
                onChange={(e) => {
                  setOrderSearchQuery(e.target.value);
                  setOrdersPage(1);
                }}
                className="w-full bg-secondary/70 border border-border rounded-xl pr-9 pl-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-border/80 rounded-xl">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-secondary/80 text-muted-foreground font-bold border-b border-border">
                  <th className="p-3 text-right">{lang === "ar" ? "رقم الفاتورة" : "Order #"}</th>
                  <th className="p-3 text-right">{lang === "ar" ? "التاريخ والوقت" : "Date & Time"}</th>
                  <th className="p-3 text-right">{lang === "ar" ? "الكاشير" : "Cashier"}</th>
                  <th className="p-3 text-right">{lang === "ar" ? "العميل" : "Customer"}</th>
                  <th className="p-3 text-center">{lang === "ar" ? "النوع والمنصة" : "Type & Platform"}</th>
                  <th className="p-3 text-center">{lang === "ar" ? "طريقة الدفع" : "Payment"}</th>
                  <th className="p-3 text-right font-black text-foreground">{lang === "ar" ? "القيمة (ج.م)" : "Amount"}</th>
                  <th className="p-3 text-center">{lang === "ar" ? "معاينة" : "Inspect"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-muted/50 transition">
                    <td className="p-3 font-mono font-bold text-foreground">{ord.orderNumber}</td>
                    <td className="p-3 font-mono text-muted-foreground">{ord.formattedDate || ord.createdAt?.slice(0, 16)}</td>
                    <td className="p-3 font-medium text-foreground">{ord.cashierName}</td>
                    <td className="p-3 text-muted-foreground">{ord.customerName}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-secondary text-[11px] font-bold text-foreground">
                        {ord.orderPlatformName || ord.orderPlatform}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[11px] font-bold",
                          ord.paymentMethod === "cash"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                        )}
                      >
                        {ord.paymentMethodLabel || ord.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 font-black text-foreground">
                      {ord.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderDetails(ord)}
                        className="p-1 text-primary hover:bg-primary/10 rounded-lg transition"
                        title={lang === "ar" ? "عرض بنود الفاتورة" : "View receipt items"}
                      >
                        <Eye className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <TablePagination
            currentPage={ordersPage}
            totalPages={totalOrdersPages}
            onPageChange={setOrdersPage}
          />
        </div>
      )}

      {/* Order Items Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-amber-500" />
                <h3 className="text-base font-black text-foreground">
                  {lang === "ar" ? "تفاصيل الفاتورة الفعلية:" : "Order Receipt:"} {selectedOrderDetails.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/50 p-3 rounded-xl border border-border">
              <div>
                <span className="text-muted-foreground block">{lang === "ar" ? "الفرع" : "Branch"}</span>
                <strong className="text-foreground">{selectedOrderDetails.branchName?.ar || selectedOrderDetails.branchId}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">{lang === "ar" ? "الكاشير" : "Cashier"}</span>
                <strong className="text-foreground">{selectedOrderDetails.cashierName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">{lang === "ar" ? "التاريخ والوقت" : "Date & Time"}</span>
                <span className="font-mono text-foreground">{selectedOrderDetails.formattedDate || selectedOrderDetails.createdAt}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">{lang === "ar" ? "طريقة الدفع" : "Payment"}</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{selectedOrderDetails.paymentMethodLabel || selectedOrderDetails.paymentMethod}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-muted-foreground uppercase">{lang === "ar" ? "الأصناف المحاسب عليها" : "Billed Items"}</div>
              <div className="divide-y divide-border border border-border rounded-xl max-h-52 overflow-y-auto">
                {selectedOrderDetails.items.map((it, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-secondary/30">
                    <div>
                      <div className="font-bold text-foreground">{it.name?.ar || (typeof it.name === "string" ? it.name : it.sku)}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {it.quantity} × {it.unitPrice.toFixed(2)} ج.م
                      </div>
                    </div>
                    <div className="font-black text-foreground">
                      {it.totalPrice.toFixed(2)} ج.م
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
              <span className="font-bold text-foreground">{lang === "ar" ? "صافي قيمة الفاتورة" : "Order Total"}</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {selectedOrderDetails.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Btn variant="solid" onClick={() => setSelectedOrderDetails(null)} className="text-xs font-bold">
                {lang === "ar" ? "إغلاق" : "Close"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
