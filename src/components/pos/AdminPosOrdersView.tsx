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
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { DataTable, KpiCard, Panel, Td } from "@/components/kit";
import {
  usePosOrdersStore,
  type AdminPosOrder,
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

  // Selected order for thermal receipt preview modal
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<AdminPosOrder | null>(null);
  // Selected order for detailed itemized modal
  const [activeDetailsOrder, setActiveDetailsOrder] = useState<AdminPosOrder | null>(null);

  // Filtered orders list with safe fallbacks
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

      return true;
    });
  }, [orders, searchQuery, selectedBranch, selectedPlatform, selectedPayment]);

  return (
    <div className="space-y-4">
      {/* 1. POS Retail Performance KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={pick("إجمالي مبيعات نقاط البيع", "Total POS Revenue")}
          value={money(metrics?.totalSales || 0)}
          accent="brand"
        />
        <KpiCard
          label={pick("عدد الطلبات المنفذة", "Completed POS Orders")}
          value={`${metrics?.totalCount || 0} ${pick("طلب", "Orders")}`}
          accent="primary"
        />
        <KpiCard
          label={pick("متوسط الفاتورة (Average Ticket)", "Average Ticket")}
          value={money(metrics?.avgTicket || 0)}
          accent="gold"
        />
        <KpiCard
          label={pick("طلبات تطبيقات التوصيل", "Aggregator Orders")}
          value={`${metrics?.aggregatorOrders || 0} ${pick("طلب", "Orders")}`}
          accent="ink"
        />
      </div>

      {/* 2. Filter & Controls Bar */}
      <div className="p-3 bg-card rounded-2xl border border-border/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={pick(
                "ابحث برقم الطلب، الكاشير، العميل أو الصنف...",
                "Search order #, cashier, customer or sweet item..."
              )}
              className="w-full ps-9 pe-8 py-2 text-xs font-semibold rounded-xl border border-border/70 bg-background text-foreground focus:outline-none focus:border-primary"
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
              className="text-xs font-bold py-2 px-3 pe-7 rounded-xl border border-border/70 bg-background text-foreground focus:outline-none cursor-pointer appearance-none"
            >
              <option value="all">📍 {pick("كل الفروع", "All Branches")}</option>
              {Object.entries(BRANCH_NAMES_MAP)
                .filter(([k]) => !k.includes("-")) // Filter to primary codes for cleaner dropdown
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
              className="text-xs font-bold py-2 px-3 pe-7 rounded-xl border border-border/70 bg-background text-foreground focus:outline-none cursor-pointer appearance-none"
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
              className="text-xs font-bold py-2 px-3 pe-7 rounded-xl border border-border/70 bg-background text-foreground focus:outline-none cursor-pointer appearance-none"
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
        </div>

        {/* Right / End: Live Status & Refresh Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{pick("مزامنة حية للدرج (Realtime)", "Live DB Sync")}</span>
          </div>

          <button
            type="button"
            onClick={refresh}
            className="p-2 rounded-xl border border-border/70 hover:bg-muted text-foreground transition-colors cursor-pointer"
            title={pick("تحديث البيانات", "Refresh data")}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 3. Orders Table */}
      <Panel title={pick("سجل فواتير وطلبات نقاط البيع", "POS Terminal Orders Ledger")}>
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
          {filteredOrders.map((ord) => {
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
                <Td className="num text-muted-foreground text-[11px]">
                  {ord.formattedDate}
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
                <div className="flex justify-between">
                  <span>التاريخ والوقت:</span>
                  <span>{activeReceiptOrder.formattedDate}</span>
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
                      value={`مصلحة الضرائب المصرية | الفاتورة الإلكترونية\nالمورد: ${settings.nameAr || "شركة وزير الحلو للحلويات والمواد الغذائية"}\nرقم التسجيل: 492-810-332\nفاتورة: ${activeReceiptOrder.orderNumber}\nالتاريخ: ${activeReceiptOrder.formattedDate}\nالإجمالي: ${(Number(activeReceiptOrder.total) || 0).toFixed(2)} ج.م\nالضريبة: ${(Number(activeReceiptOrder.vatAmount) || 0).toFixed(2)} ج.م\nالفرع: ${safePickBranchName(activeReceiptOrder.branchName, lang)}`}
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
