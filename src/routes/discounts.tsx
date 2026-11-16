import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BadgePercent,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  PauseCircle,
  Tag,
  Layers,
  ShoppingBag,
  FileSpreadsheet,
  RotateCcw,
  Edit2,
  Trash2,
  Filter,
  Percent,
  Sparkles,
  ArrowRight,
  Boxes,
  Store,
  ChevronDown,
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
import {
  useDiscountsStore,
  computeDiscountStatus,
  type DiscountRule,
  type DiscountType,
  type DiscountScope,
  type DiscountStatus,
} from "@/lib/discounts-store";
import { useInventoryStore } from "@/lib/inventory-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/discounts")({
  head: () => ({
    meta: [
      { title: "Discounts & Promotional Offers — Wazeer El-Helw ERP" },
      {
        name: "description",
        content:
          "Comprehensive discounts and promotions management with product, category, and date-range rules.",
      },
      { property: "og:title", content: "Discounts & Offers — Wazeer El-Helw ERP" },
      {
        property: "og:description",
        content: "Manage storewide and category discounts with start and end dates.",
      },
    ],
  }),
  component: DiscountsPage,
});

function DiscountsPage() {
  const { t, pick, money, n, dir } = useI18n();
  const {
    discounts,
    addDiscount,
    updateDiscount,
    deleteDiscount,
    toggleDiscountStatus,
    resetToSeedDiscounts,
  } = useDiscountsStore();
  const { categories, products } = useInventoryStore();

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DiscountStatus>("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | DiscountScope>("all");

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountRule | null>(null);
  const [deleteConfirmDiscount, setDeleteConfirmDiscount] = useState<DiscountRule | null>(null);

  // Form State
  const [formNameAr, setFormNameAr] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formDescAr, setFormDescAr] = useState("");
  const [formDescEn, setFormDescEn] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCoupon, setFormCoupon] = useState("");
  const [formType, setFormType] = useState<DiscountType>("percentage");
  const [formValue, setFormValue] = useState<number>(10);
  const [formScope, setFormScope] = useState<DiscountScope>("all_products");
  const [formCategoryIds, setFormCategoryIds] = useState<string[]>([]);
  const [formProductIds, setFormProductIds] = useState<string[]>([]);
  const [formStartDate, setFormStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formEndDate, setFormEndDate] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().slice(0, 10);
  });
  const [formMinOrder, setFormMinOrder] = useState<number>(0);
  const [formMaxDiscount, setFormMaxDiscount] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState(true);

  // Open Form for Create
  const handleOpenCreateModal = () => {
    setEditingDiscount(null);
    const codeSuffix = Math.floor(1000 + Math.random() * 9000);
    setFormCode(`PROMO-${codeSuffix}`);
    setFormCoupon(`SALE${codeSuffix}`);
    setFormNameAr("");
    setFormNameEn("");
    setFormDescAr("");
    setFormDescEn("");
    setFormType("percentage");
    setFormValue(15);
    setFormScope("all_products");
    setFormCategoryIds([]);
    setFormProductIds([]);
    setFormStartDate(new Date().toISOString().slice(0, 10));
    const nextM = new Date();
    nextM.setMonth(nextM.getMonth() + 1);
    setFormEndDate(nextM.toISOString().slice(0, 10));
    setFormMinOrder(0);
    setFormMaxDiscount(0);
    setFormIsActive(true);
    setIsFormModalOpen(true);
  };

  // Open Form for Edit
  const handleOpenEditModal = (rule: DiscountRule) => {
    setEditingDiscount(rule);
    setFormCode(rule.code);
    setFormCoupon(rule.couponCode || "");
    setFormNameAr(rule.name.ar);
    setFormNameEn(rule.name.en);
    setFormDescAr(rule.description?.ar || "");
    setFormDescEn(rule.description?.en || "");
    setFormType(rule.type);
    setFormValue(rule.value);
    setFormScope(rule.scope);
    setFormCategoryIds(rule.categoryIds || []);
    setFormProductIds(rule.productIds || []);
    setFormStartDate(rule.startDate);
    setFormEndDate(rule.endDate);
    setFormMinOrder(rule.minOrderAmount || 0);
    setFormMaxDiscount(rule.maxDiscountAmount || 0);
    setFormIsActive(rule.isActive);
    setIsFormModalOpen(true);
  };

  // Handle Save Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameAr.trim() && !formNameEn.trim()) {
      toast.error(pick("يرجى كتابة اسم العرض الترويجي", "Please enter promotion name"));
      return;
    }
    if (formValue <= 0) {
      toast.error(pick("يرجى إدخال قيمة خصم صحيحة أكبر من صفر", "Discount value must be greater than zero"));
      return;
    }
    if (formScope === "categories" && formCategoryIds.length === 0) {
      toast.error(pick("يرجى اختيار فئة واحدة على الأقل", "Please select at least one category"));
      return;
    }
    if (formScope === "products" && formProductIds.length === 0) {
      toast.error(pick("يرجى اختيار صنف واحد على الأقل", "Please select at least one product"));
      return;
    }
    if (formEndDate < formStartDate) {
      toast.error(pick("تاريخ نهاية العرض يجب أن يكون بعد تاريخ البداية", "End date must be after start date"));
      return;
    }

    // Resolve Category Names
    const matchedCategoryNames = formCategoryIds.map((catId) => {
      const found = categories.find((c) => c.id === catId || c.code === catId);
      return found ? { ar: found.name.ar, en: found.name.en } : { ar: catId, en: catId };
    });

    // Resolve Product Names
    const matchedProductNames = formProductIds.map((prodId) => {
      const found = products.find((p) => p.id === prodId || p.sku === prodId);
      return found ? { ar: found.name.ar, en: found.name.en } : { ar: prodId, en: prodId };
    });

    if (editingDiscount) {
      updateDiscount(editingDiscount.id, {
        code: formCode.trim() || editingDiscount.code,
        name: {
          ar: formNameAr.trim() || formNameEn.trim(),
          en: formNameEn.trim() || formNameAr.trim(),
        },
        description: {
          ar: formDescAr.trim(),
          en: formDescEn.trim(),
        },
        couponCode: formCoupon.trim().toUpperCase() || undefined,
        type: formType,
        value: Number(formValue),
        scope: formScope,
        categoryIds: formScope === "categories" ? formCategoryIds : undefined,
        categoryNames: formScope === "categories" ? matchedCategoryNames : undefined,
        productIds: formScope === "products" ? formProductIds : undefined,
        productNames: formScope === "products" ? matchedProductNames : undefined,
        startDate: formStartDate,
        endDate: formEndDate,
        minOrderAmount: formMinOrder > 0 ? Number(formMinOrder) : undefined,
        maxDiscountAmount: formMaxDiscount > 0 ? Number(formMaxDiscount) : undefined,
        isActive: formIsActive,
      });
      toast.success(pick("تم تعديل العرض الترويجي بنجاح", "Promotion updated successfully"));
    } else {
      addDiscount({
        code: formCode.trim() || `PROMO-${Date.now().toString().slice(-4)}`,
        name: {
          ar: formNameAr.trim() || formNameEn.trim(),
          en: formNameEn.trim() || formNameAr.trim(),
        },
        description: {
          ar: formDescAr.trim(),
          en: formDescEn.trim(),
        },
        couponCode: formCoupon.trim().toUpperCase() || undefined,
        type: formType,
        value: Number(formValue),
        scope: formScope,
        categoryIds: formScope === "categories" ? formCategoryIds : undefined,
        categoryNames: formScope === "categories" ? matchedCategoryNames : undefined,
        productIds: formScope === "products" ? formProductIds : undefined,
        productNames: formScope === "products" ? matchedProductNames : undefined,
        branchIds: ["all"],
        startDate: formStartDate,
        endDate: formEndDate,
        minOrderAmount: formMinOrder > 0 ? Number(formMinOrder) : undefined,
        maxDiscountAmount: formMaxDiscount > 0 ? Number(formMaxDiscount) : undefined,
        isActive: formIsActive,
        priority: discounts.length + 1,
      });
      toast.success(pick("تم إنشاء العرض الترويجي بنجاح", "Promotion created successfully"));
    }

    setIsFormModalOpen(false);
  };

  // KPI Metrics Calculations
  const metrics = useMemo(() => {
    let total = discounts.length;
    let active = 0;
    let scheduled = 0;
    let expired = 0;
    let paused = 0;
    let totalUsage = 0;

    for (const d of discounts) {
      totalUsage += d.usageCount || 0;
      const status = computeDiscountStatus(d);
      if (status === "active") active++;
      else if (status === "scheduled") scheduled++;
      else if (status === "expired") expired++;
      else if (status === "paused") paused++;
    }

    return { total, active, scheduled, expired, paused, totalUsage };
  }, [discounts]);

  // Filtered Discount Rules
  const filteredDiscounts = useMemo(() => {
    return discounts.filter((d) => {
      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = d.code.toLowerCase().includes(q);
        const matchCoupon = d.couponCode?.toLowerCase().includes(q);
        const matchNameAr = d.name.ar.toLowerCase().includes(q);
        const matchNameEn = d.name.en.toLowerCase().includes(q);
        const matchDescAr = d.description?.ar.toLowerCase().includes(q);
        const matchDescEn = d.description?.en.toLowerCase().includes(q);
        if (!matchCode && !matchCoupon && !matchNameAr && !matchNameEn && !matchDescAr && !matchDescEn) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter !== "all") {
        const curStatus = computeDiscountStatus(d);
        if (curStatus !== statusFilter) return false;
      }

      // Scope Filter
      if (scopeFilter !== "all" && d.scope !== scopeFilter) {
        return false;
      }

      return true;
    });
  }, [discounts, searchQuery, statusFilter, scopeFilter]);

  // Pagination
  const {
    page,
    setPage,
    paginatedItems: paginatedDiscounts,
  } = usePagination(filteredDiscounts, 20);

  // Status Badge Component
  const renderStatusBadge = (status: DiscountStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="size-3" />
            <span>{pick("ساري ونشط", "Active Now")}</span>
          </span>
        );
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30">
            <Clock className="size-3" />
            <span>{pick("مجدول قادماً", "Scheduled")}</span>
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
            <AlertCircle className="size-3" />
            <span>{pick("منتهي الصلاحية", "Expired")}</span>
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <PauseCircle className="size-3" />
            <span>{pick("متوقف مؤقتاً", "Paused")}</span>
          </span>
        );
    }
  };

  // Scope Badge Component
  const renderScopeBadge = (d: DiscountRule) => {
    if (d.scope === "all_products") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
          <Store className="size-3" />
          <span>{pick("كافة منتجات المحل", "All Products")}</span>
        </span>
      );
    }
    if (d.scope === "categories") {
      const names = d.categoryNames?.map((c) => pick(c.ar, c.en)).join("، ") || pick("فئات مختارة", "Selected Categories");
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30" title={names}>
          <Layers className="size-3 shrink-0" />
          <span className="truncate max-w-[200px]">{names}</span>
        </span>
      );
    }
    const prodNames = d.productNames?.map((p) => pick(p.ar, p.en)).join("، ") || pick("أصناف محددة", "Specific Products");
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30" title={prodNames}>
        <ShoppingBag className="size-3 shrink-0" />
        <span className="truncate max-w-[200px]">{prodNames}</span>
      </span>
    );
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredDiscounts.map((d) => {
      const status = computeDiscountStatus(d);
      return {
        [pick("كود العرض", "Promo Code")]: d.code,
        [pick("اسم العرض (عربي)", "Name (AR)")]: d.name.ar,
        [pick("اسم العرض (إنجليزي)", "Name (EN)")]: d.name.en,
        [pick("كود الكوبون", "Coupon Code")]: d.couponCode || "—",
        [pick("نوع الخصم", "Discount Type")]:
          d.type === "percentage" ? pick("نسبة مئوية", "Percentage") : pick("مبلغ نقدي ثابت", "Fixed Cash"),
        [pick("القيمة", "Value")]: d.type === "percentage" ? `${d.value}%` : `${d.value} EGP`,
        [pick("نطاق التطبيق", "Scope")]:
          d.scope === "all_products"
            ? pick("جميع المنتجات", "All Products")
            : d.scope === "categories"
            ? pick("فئات محددة", "Categories")
            : pick("أصناف محددة", "Products"),
        [pick("تاريخ البداية", "Start Date")]: d.startDate,
        [pick("تاريخ النهاية", "End Date")]: d.endDate,
        [pick("الحد الأدنى للطلب", "Min Order Amount")]: d.minOrderAmount || 0,
        [pick("الحد الأقصى للخصم", "Max Discount Cap")]: d.maxDiscountAmount || 0,
        [pick("الحالة", "Status")]:
          status === "active"
            ? pick("نشط", "Active")
            : status === "scheduled"
            ? pick("مجدول", "Scheduled")
            : status === "expired"
            ? pick("منتهي", "Expired")
            : pick("متوقف", "Paused"),
        [pick("مرات الاستخدام", "Usage Count")]: d.usageCount || 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Discounts_Promotions");
    safeDownloadWorkbook(workbook, `Wazeer_Discounts_Promotions_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(pick("تم تصدير ملف إكسيل بنجاح", "Excel exported successfully"));
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4 py-4 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        title={pick("الخصومات والعروض الترويجية", "Discounts & Promotional Offers")}
        subtitle={pick(
          "إدارة وتطبيق الخصومات التلقائية على كافة المنتجات أو فئات محددة مع تحديد تواريخ البداية والنهاية بدقة",
          "Create and schedule storewide and category-based discounts with precise start and end dates"
        )}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Btn
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <FileSpreadsheet className="size-3.5" />
              <span>{pick("تصدير إكسيل", "Export Excel")}</span>
            </Btn>
            <Btn
              variant="solid"
              size="sm"
              onClick={handleOpenCreateModal}
              className="gap-1.5 text-xs shadow-md"
            >
              <Plus className="size-3.5" />
              <span>{pick("عرض ترويجي جديد", "New Promotion")}</span>
            </Btn>
          </div>
        }
      />

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label={pick("إجمالي العروض الترويجية", "Total Promotions")}
          value={n(metrics.total)}
          sub={pick("مسجلة بالنظام", "Configured campaigns")}
          tone="ink"
        />
        <KpiCard
          label={pick("عروض سارية ونشطة اليوم", "Active Right Now")}
          value={n(metrics.active)}
          sub={pick("تُطبق تلقائياً على المنتجات", "Auto-applied at POS")}
          tone="brand"
        />
        <KpiCard
          label={pick("عروض مجدولة قادمة", "Scheduled Future")}
          value={n(metrics.scheduled)}
          sub={pick("تبدأ في تواريخ لاحقة", "Upcoming start date")}
          tone="plain"
        />
        <KpiCard
          label={pick("مرات تطبيق الخصومات", "Promotion Usage")}
          value={n(metrics.totalUsage)}
          sub={pick("عملية بيع تضمنت خصومات", "Transactions with savings")}
          tone="plain"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <Panel tone="plain">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground",
                  dir === "rtl" ? "right-3" : "left-3"
                )}
              />
              <input
                type="text"
                placeholder={pick(
                  "بحث باسم العرض، كود الحملة، أو كود الكوبون...",
                  "Search by campaign name, code, or coupon..."
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full h-9 rounded-lg border border-input bg-background text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-primary",
                  dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
                )}
              />
            </div>

            {/* Scope Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                {pick("النطاق:", "Scope:")}
              </span>
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value as any)}
                aria-label={pick("تصفية نطاق الخصم", "Filter discount scope")}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">{pick("كافة النطاقات", "All Scopes")}</option>
                <option value="all_products">{pick("جميع المنتجات", "All Products")}</option>
                <option value="categories">{pick("فئات محددة", "Specific Categories")}</option>
                <option value="products">{pick("منتجات محددة", "Specific Products")}</option>
              </select>

              {(searchQuery || statusFilter !== "all" || scopeFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setScopeFilter("all");
                  }}
                  className="h-9 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  title={pick("إعادة تعيين الفلاتر", "Reset filters")}
                >
                  <RotateCcw className="size-3" />
                  <span className="hidden sm:inline">{pick("مسح الفلاتر", "Clear")}</span>
                </button>
              )}
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: "all", label: { ar: "الكل", en: "All" }, count: metrics.total },
              { id: "active", label: { ar: "النشطة حالياً", en: "Active Now" }, count: metrics.active },
              { id: "scheduled", label: { ar: "المجدولة", en: "Scheduled" }, count: metrics.scheduled },
              { id: "expired", label: { ar: "المنتهية", en: "Expired" }, count: metrics.expired },
              { id: "paused", label: { ar: "المتوقفة", en: "Paused" }, count: metrics.paused },
            ].map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer text-xs",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <span>{pick(tab.label.ar, tab.label.en)}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                      isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Main Listing Panel */}
      <Panel tone="plain">
        {/* Mobile Cards View (< md) */}
        <div className="md:hidden space-y-3">
          {filteredDiscounts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BadgePercent className="mx-auto size-10 opacity-30 mb-2" />
              <p className="font-semibold text-xs">
                {pick("لا توجد عروض ترويجية مطابقة للبحث", "No promotions match your search")}
              </p>
            </div>
          ) : (
            paginatedDiscounts.map((d) => {
              const status = computeDiscountStatus(d);
              return (
                <div
                  key={d.id}
                  className="surface-panel rounded-xl p-3 border border-border/80 shadow-xs space-y-2.5 transition-all"
                >
                  {/* Top Row: Title, Code & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold bg-secondary border border-border px-1.5 py-0.2 rounded">
                          {d.code}
                        </span>
                        {renderStatusBadge(status)}
                        {d.couponCode && (
                          <span className="font-mono text-[9px] font-black bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-500/20 px-1.5 py-0.2 rounded">
                            🎟️ {d.couponCode}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-foreground text-xs mt-1 leading-snug">
                        {pick(d.name.ar, d.name.en)}
                      </h3>
                      {d.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {pick(d.description.ar, d.description.en)}
                        </p>
                      )}
                    </div>

                    {/* Value Badge */}
                    <div className="shrink-0 text-end">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg font-mono font-black text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                        {d.type === "percentage" ? `-%${d.value}` : `-${d.value} ج.م`}
                      </span>
                    </div>
                  </div>

                  {/* Scope & Date Range Row */}
                  <div className="bg-muted/40 rounded-lg p-2 text-xs border border-border/40 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">{pick("نطاق الخصم:", "Scope:")}</span>
                      {renderScopeBadge(d)}
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">{pick("فترة الصلاحية:", "Validity:")}</span>
                      <span className="font-mono text-[10px] text-foreground font-semibold flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground" />
                        <span>{d.startDate}</span>
                        <span>←</span>
                        <span>{d.endDate}</span>
                      </span>
                    </div>

                    {(d.minOrderAmount || d.maxDiscountAmount) && (
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                        {d.minOrderAmount ? (
                          <span>{pick(`الحد الأدنى: ${money(d.minOrderAmount)}`, `Min order: ${money(d.minOrderAmount)}`)}</span>
                        ) : <span />}
                        {d.maxDiscountAmount ? (
                          <span>{pick(`أقصى خصم: ${money(d.maxDiscountAmount)}`, `Max cap: ${money(d.maxDiscountAmount)}`)}</span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Active Switch & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={d.isActive}
                        onCheckedChange={() => toggleDiscountStatus(d.id)}
                        aria-label={pick("تفعيل أو تعطيل العرض", "Toggle promotion status")}
                      />
                      <span className={cn("text-[10px] font-bold", d.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                        {d.isActive ? pick("مفعّل", "Active") : pick("متوقف", "Paused")}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({d.usageCount || 0} {pick("استخدام", "uses")})
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(d)}
                        className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
                        title={t("edit")}
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmDiscount(d)}
                        className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-destructive cursor-pointer"
                        title={pick("حذف", "Delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <DataTable
            head={[
              pick("كود العرض", "Promo Code"),
              pick("اسم وتفاصيل العرض", "Promotion Name & Description"),
              pick("قيمة الخصم", "Discount Value"),
              pick("نطاق التطبيق", "Scope & Target"),
              pick("فترة الصلاحية (من — إلى)", "Validity Period (Dates)"),
              pick("مرات الاستخدام", "Usage"),
              pick("الحالة", "Status"),
              pick("تفعيل", "Active"),
              pick("الإجراءات", "Actions"),
            ]}
          >
            {filteredDiscounts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-muted-foreground text-xs">
                  {pick("لا توجد عروض ترويجية مطابقة للبحث", "No promotions match your search")}
                </td>
              </tr>
            ) : (
              paginatedDiscounts.map((d) => {
                const status = computeDiscountStatus(d);
                return (
                  <tr key={d.id} className="hover:bg-secondary/40 transition-colors">
                    {/* Code */}
                    <Td className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                      <div>{d.code}</div>
                      {d.couponCode && (
                        <div className="text-[10px] font-black text-pink-600 dark:text-pink-400">
                          🎟️ {d.couponCode}
                        </div>
                      )}
                    </Td>

                    {/* Name & Desc */}
                    <Td className="max-w-xs">
                      <div className="font-bold text-xs text-foreground">
                        {pick(d.name.ar, d.name.en)}
                      </div>
                      {d.description && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[280px]">
                          {pick(d.description.ar, d.description.en)}
                        </div>
                      )}
                    </Td>

                    {/* Discount Value */}
                    <Td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        {d.type === "percentage" ? `-%${d.value}` : `-${d.value} ج.م`}
                      </span>
                    </Td>

                    {/* Scope */}
                    <Td className="max-w-[220px]">
                      {renderScopeBadge(d)}
                    </Td>

                    {/* Validity Period */}
                    <Td className="whitespace-nowrap font-mono text-xs">
                      <div className="flex items-center gap-1 text-[11px] text-foreground font-semibold">
                        <span>{d.startDate}</span>
                        <ArrowRight className="size-3 text-muted-foreground rtl:rotate-180" />
                        <span>{d.endDate}</span>
                      </div>
                      {(d.minOrderAmount || d.maxDiscountAmount) && (
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          {d.minOrderAmount ? pick(`حد أدنى: ${money(d.minOrderAmount)}`, `Min: ${money(d.minOrderAmount)}`) : ""}
                          {d.minOrderAmount && d.maxDiscountAmount ? " | " : ""}
                          {d.maxDiscountAmount ? pick(`أقصى خصم: ${money(d.maxDiscountAmount)}`, `Cap: ${money(d.maxDiscountAmount)}`) : ""}
                        </div>
                      )}
                    </Td>

                    {/* Usage Count */}
                    <Td className="font-mono text-xs text-muted-foreground font-bold text-center">
                      {n(d.usageCount || 0)}
                    </Td>

                    {/* Status Badge */}
                    <Td className="whitespace-nowrap">
                      {renderStatusBadge(status)}
                    </Td>

                    {/* Active Switch Toggle */}
                    <Td className="whitespace-nowrap">
                      <Switch
                        checked={d.isActive}
                        onCheckedChange={() => toggleDiscountStatus(d.id)}
                        aria-label={pick("تفعيل أو تعطيل العرض", "Toggle promotion status")}
                      />
                    </Td>

                    {/* Actions */}
                    <Td className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(d)}
                          className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
                          title={t("edit")}
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmDiscount(d)}
                          className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-destructive cursor-pointer"
                          title={pick("حذف", "Delete")}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </DataTable>
        </div>

        {/* Pagination Bar */}
        <TablePagination
          currentPage={page}
          totalItems={filteredDiscounts.length}
          pageSize={20}
          onPageChange={setPage}
          itemLabel={{ ar: "عرض ترويجي", en: "promotions" }}
        />
      </Panel>

      {/* CREATE / EDIT DISCOUNT PROMOTION MODAL */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <BadgePercent className="size-5 text-primary" />
              <span>
                {editingDiscount
                  ? pick("تعديل العرض الترويجي والخصم", "Edit Promotion & Discount Rule")
                  : pick("إنشاء عرض ترويجي وخصم جديد", "Create New Discount Promotion")}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveForm} className="space-y-4 pt-2 text-xs">
            {/* Promotion Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {pick("اسم العرض (بالعربي) *", "Promotion Name (Arabic) *")}
                </label>
                <input
                  type="text"
                  required
                  placeholder={pick("مثال: خصم الصيف على الجيلاتو", "e.g. Summer Gelato Festival")}
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {pick("اسم العرض (بالإنجليزي)", "Promotion Name (English)")}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Summer Gelato Festival"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Campaign Code & Optional Coupon Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {pick("كود الحملة الترويجية *", "Campaign Code *")}
                </label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full h-9 font-mono font-bold rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {pick("كود الكوبون (اختياري للكاشير)", "Coupon Code (Optional)")}
                </label>
                <input
                  type="text"
                  placeholder="e.g. SUMMER20"
                  value={formCoupon}
                  onChange={(e) => setFormCoupon(e.target.value)}
                  className="w-full h-9 font-mono font-bold rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                />
              </div>
            </div>

            {/* Discount Type & Value */}
            <div className="p-3 rounded-xl border border-border bg-secondary/30 space-y-3">
              <label className="block text-xs font-bold text-foreground">
                {pick("نوع وقيمة الخصم *", "Discount Type & Value *")}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Type Radio/Buttons */}
                <div className="flex rounded-lg border border-border p-1 bg-background">
                  <button
                    type="button"
                    onClick={() => setFormType("percentage")}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      formType === "percentage"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Percent className="size-3.5" />
                    <span>{pick("نسبة مئوية (%)", "Percentage (%)")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType("fixed_amount")}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      formType === "fixed_amount"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Tag className="size-3.5" />
                    <span>{pick("مبلغ ثابت (ج.م)", "Fixed (EGP)")}</span>
                  </button>
                </div>

                {/* Value Input */}
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={formValue || ""}
                    onChange={(e) => setFormValue(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 font-mono font-black text-sm rounded-lg border border-input bg-background px-3 text-start focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none",
                      dir === "rtl" ? "left-3" : "right-3"
                    )}
                  >
                    {formType === "percentage" ? "%" : "ج.م"}
                  </span>
                </div>
              </div>
            </div>

            {/* Scope Selection: All Products, Categories, or Products */}
            <div className="p-3 rounded-xl border border-border bg-secondary/30 space-y-3">
              <label className="block text-xs font-bold text-foreground">
                {pick("نطاق تطبيق الخصم *", "Discount Scope Application *")}
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "all_products", label: { ar: "كل المنتجات", en: "All Products" }, icon: Store },
                  { id: "categories", label: { ar: "فئات محددة", en: "Categories" }, icon: Layers },
                  { id: "products", label: { ar: "منتجات محددة", en: "Products" }, icon: ShoppingBag },
                ].map((s) => {
                  const isSelected = formScope === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormScope(s.id as any)}
                      className={cn(
                        "p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <s.icon className="size-4" />
                      <span className="text-[11px]">{pick(s.label.ar, s.label.en)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category Multi-Select Checkboxes */}
              {formScope === "categories" && (
                <div className="mt-3 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-foreground">
                      {pick("حدد الفئات المشمولة بالخصم:", "Select Discounted Categories:")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (formCategoryIds.length === categories.length) {
                          setFormCategoryIds([]);
                        } else {
                          setFormCategoryIds(categories.map((c) => c.id));
                        }
                      }}
                      className="text-primary hover:underline text-[10px] font-semibold cursor-pointer"
                    >
                      {formCategoryIds.length === categories.length
                        ? pick("إلغاء تحديد الكل", "Deselect All")
                        : pick("تحديد كل الفئات", "Select All")}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-2 rounded-lg border border-border bg-background">
                    {categories.map((cat) => {
                      const isChecked = formCategoryIds.includes(cat.id) || formCategoryIds.includes(cat.code);
                      return (
                        <label
                          key={cat.id}
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer hover:bg-secondary/60 transition-colors",
                            isChecked && "bg-primary/5 font-semibold text-primary"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormCategoryIds([...formCategoryIds, cat.id]);
                              } else {
                                setFormCategoryIds(
                                  formCategoryIds.filter((id) => id !== cat.id && id !== cat.code)
                                );
                              }
                            }}
                            className="rounded border-input text-primary focus:ring-primary size-4"
                          />
                          <span className="truncate">{pick(cat.name.ar, cat.name.en)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product Multi-Select Checkboxes */}
              {formScope === "products" && (
                <div className="mt-3 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-foreground">
                      {pick("حدد المنتجات المشمولة بالخصم:", "Select Discounted Products:")}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      ({formProductIds.length} {pick("صنف محدد", "selected")})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 rounded-lg border border-border bg-background">
                    {products.map((p) => {
                      const isChecked = formProductIds.includes(p.id) || formProductIds.includes(p.sku);
                      return (
                        <label
                          key={p.id}
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer hover:bg-secondary/60 transition-colors",
                            isChecked && "bg-primary/5 font-semibold text-primary"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormProductIds([...formProductIds, p.id]);
                              } else {
                                setFormProductIds(
                                  formProductIds.filter((id) => id !== p.id && id !== p.sku)
                                );
                              }
                            }}
                            className="rounded border-input text-primary focus:ring-primary size-4"
                          />
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-mono text-[10px] text-muted-foreground me-1">[{p.sku}]</span>
                            <span>{pick(p.name.ar, p.name.en)}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Date Range: Start Date & End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {pick("تاريخ البداية (ساري من) *", "Start Date (Valid From) *")}
                </label>
                <input
                  type="date"
                  required
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full h-9 font-mono rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {pick("تاريخ النهاية (ينتهي في) *", "End Date (Valid To) *")}
                </label>
                <input
                  type="date"
                  required
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full h-9 font-mono rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-muted-foreground font-medium text-[10px] whitespace-nowrap">
                {pick("فترات سريعة:", "Presets:")}
              </span>
              {[
                { label: { ar: "أسبوع", en: "1 Week" }, days: 7 },
                { label: { ar: "أسبوعين", en: "2 Weeks" }, days: 14 },
                { label: { ar: "شهر", en: "1 Month" }, days: 30 },
                { label: { ar: "3 أشهر", en: "3 Months" }, days: 90 },
                { label: { ar: "نهاية العام", en: "End of Year" }, days: "eoy" },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const s = new Date(formStartDate || new Date());
                    const format = (dt: Date) => dt.toISOString().slice(0, 10);
                    if (p.days === "eoy") {
                      setFormEndDate(`${s.getFullYear()}-12-31`);
                    } else {
                      const e = new Date(s);
                      e.setDate(e.getDate() + Number(p.days));
                      setFormEndDate(format(e));
                    }
                  }}
                  className="px-2 py-1 rounded bg-secondary/80 text-muted-foreground hover:text-foreground text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  {pick(p.label.ar, p.label.en)}
                </button>
              ))}
            </div>

            {/* Optional Constraints: Min Order & Max Discount Cap */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {pick("الحد الأدنى لقيمة الطلب (ج.م)", "Min Order Amount (EGP)")}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={formMinOrder || ""}
                  onChange={(e) => setFormMinOrder(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 font-mono rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {pick("الحد الأقصى لمبلغ الخصم (ج.م)", "Max Discount Amount Cap (EGP)")}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={pick("اختياري (سقف للخصم)", "Optional (Cap)")}
                  value={formMaxDiscount || ""}
                  onChange={(e) => setFormMaxDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 font-mono rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Active Toggle Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/20">
              <div>
                <span className="block font-bold text-xs text-foreground">
                  {pick("تفعيل العرض الترويجي فوراً", "Activate Promotion Immediately")}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {pick(
                    "عند التفعيل سيُطبق الخصم تلقائياً بالكاشير خلال فترة التواريخ المحددة",
                    "Active promotion applies automatically during the valid date window"
                  )}
                </span>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Btn
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormModalOpen(false)}
              >
                {t("cancel")}
              </Btn>
              <Btn type="submit" variant="solid" size="sm">
                {editingDiscount
                  ? pick("حفظ التعديلات", "Save Changes")
                  : pick("تأكيد وإنشاء العرض", "Create Promotion")}
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <Dialog
        open={Boolean(deleteConfirmDiscount)}
        onOpenChange={(open) => !open && setDeleteConfirmDiscount(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-base font-bold">
              <Trash2 className="size-5" />
              <span>{pick("تأكيد حذف العرض الترويجي", "Confirm Promotion Deletion")}</span>
            </DialogTitle>
          </DialogHeader>

          {deleteConfirmDiscount && (
            <div className="space-y-4 pt-2 text-xs">
              <p className="text-foreground leading-relaxed">
                {pick(
                  `هل أنت متأكد من رغبتك في حذف العرض الترويجي "${pick(deleteConfirmDiscount.name.ar, deleteConfirmDiscount.name.en)}"؟ لن يتم تطبيق هذا الخصم بعد الآن في نقاط البيع.`,
                  `Are you sure you want to delete the promotion "${pick(deleteConfirmDiscount.name.ar, deleteConfirmDiscount.name.en)}"? It will no longer be applied at POS checkout.`
                )}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmDiscount(null)}
                >
                  {t("cancel")}
                </Btn>
                <Btn
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    deleteDiscount(deleteConfirmDiscount.id);
                    toast.success(pick("تم حذف العرض الترويجي", "Promotion deleted"));
                    setDeleteConfirmDiscount(null);
                  }}
                >
                  {pick("حذف نهائي", "Delete Forever")}
                </Btn>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
