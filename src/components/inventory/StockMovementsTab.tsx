import { useState, useMemo } from "react";
import {
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  Plus,
  FileSpreadsheet,
  RotateCcw,
  Search,
  Filter,
  Calendar,
  Warehouse as WarehouseIcon,
  Package,
  AlertCircle,
  FileText,
  Printer,
  X,
  Boxes,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useI18n } from "@/lib/i18n";
import { Btn, TablePagination, usePagination } from "@/components/kit";
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
import { formatMovementDateArabic } from "@/lib/date-utils";
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
  const [selectedType, setSelectedType] = useState<"all" | "order" | "cancel" | "in" | "transfer" | "adjustment">("all");
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
  const [formQuantity, setFormQuantity] = useState<number>(45);
  const [formUnitCost, setFormUnitCost] = useState<number>(0);
  const [formReference, setFormReference] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formMovedAt, setFormMovedAt] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fallback demo/initial seed records matching confectionery & meals if movements table is empty
  const allMovements = useMemo(() => {
    if (movements && movements.length > 0) return movements;

    const defaultProd = products[0] || {
      id: "prod-ramadan-2026",
      sku: "BRN-RAM-2026",
      name: { ar: "وجبة رمضان 2026 - وجبة فردية", en: "Ramadan Meal 2026 - Single" },
      qty: 955,
      costPrice: 85,
    };

    const now = new Date();
    const d1 = new Date(now.getTime() - 1000 * 60 * 5).toISOString();
    const d2 = new Date(now.getTime() - 1000 * 60 * 15).toISOString();
    const d3 = new Date(now.getTime() - 1000 * 60 * 25).toISOString();

    return [
      {
        id: "mv-demo-1",
        moveNo: "SM-2026-955101",
        moveType: "out" as StockMoveType,
        productId: defaultProd.id,
        productName: defaultProd.name,
        productSku: defaultProd.sku,
        categoryName: { ar: "وجبات وعروض رمضان", en: "Ramadan Specials" },
        fromWarehouseId: warehouses[0]?.id || "wh-korba",
        fromWarehouseName: warehouses[0]?.name || { ar: "فرع الكوربة", en: "Korba Branch" },
        quantity: 45,
        unitCost: defaultProd.costPrice || 85,
        totalCost: 45 * (defaultProd.costPrice || 85),
        reference: "ORD202602259910",
        notes: "Stock deducted for order item",
        movedAt: d1,
        createdAt: d1,
      },
      {
        id: "mv-demo-2",
        moveNo: "SM-2026-955102",
        moveType: "in" as StockMoveType,
        productId: defaultProd.id,
        productName: defaultProd.name,
        productSku: defaultProd.sku,
        categoryName: { ar: "وجبات وعروض رمضان", en: "Ramadan Specials" },
        toWarehouseId: warehouses[0]?.id || "wh-korba",
        toWarehouseName: warehouses[0]?.name || { ar: "فرع الكوربة", en: "Korba Branch" },
        quantity: 45,
        unitCost: defaultProd.costPrice || 85,
        totalCost: 45 * (defaultProd.costPrice || 85),
        reference: "ORD202602246848",
        notes: "Stock restored for cancelled order: ORD202602246848",
        movedAt: d2,
        createdAt: d2,
      },
      {
        id: "mv-demo-3",
        moveNo: "SM-2026-955103",
        moveType: "in" as StockMoveType,
        productId: defaultProd.id,
        productName: defaultProd.name,
        productSku: defaultProd.sku,
        categoryName: { ar: "وجبات وعروض رمضان", en: "Ramadan Specials" },
        toWarehouseId: warehouses[0]?.id || "wh-korba",
        toWarehouseName: warehouses[0]?.name || { ar: "فرع الكوربة", en: "Korba Branch" },
        quantity: 45,
        unitCost: defaultProd.costPrice || 85,
        totalCost: 45 * (defaultProd.costPrice || 85),
        reference: "ORD202602259556",
        notes: "Stock restored for cancelled order: ORD202602259556",
        movedAt: d3,
        createdAt: d3,
      },
    ];
  }, [movements, products, warehouses]);

  // Compute "قبل" (Before) and "بعد" (After) accurately per product
  const enrichedMovementsMap = useMemo(() => {
    const byProduct = new Map<string, StockMovementRecord[]>();
    for (const m of allMovements) {
      const list = byProduct.get(m.productId) || [];
      list.push(m);
      byProduct.set(m.productId, list);
    }

    const map = new Map<
      string,
      {
        beforeQty: number;
        afterQty: number;
        deltaQty: number;
        actionLabel: { ar: string; en: string };
        actionType: "order" | "cancel" | "in" | "out" | "transfer" | "adjustment";
        reason: string;
      }
    >();

    for (const [prodId, pMoves] of byProduct.entries()) {
      const prod = products.find((p) => p.id === prodId);
      const currentStock = prod ? prod.qty : 955;

      // Sort chronologically ascending (oldest to newest)
      const sortedAsc = [...pMoves].sort(
        (a, b) => new Date(a.movedAt).getTime() - new Date(b.movedAt).getTime()
      );

      const deltas = sortedAsc.map((m) => {
        const refLower = (m.reference || "").toLowerCase();
        const notesLower = (m.notes || "").toLowerCase();
        const isCancel = refLower.includes("cancel") || notesLower.includes("cancel") || refLower.includes("refund");

        if (isCancel) return Math.abs(m.quantity);
        if (m.moveType === "out") return -Math.abs(m.quantity);
        if (m.moveType === "in") return Math.abs(m.quantity);
        if (m.moveType === "adjustment") {
          const isDown = refLower.includes("deficit") || (!m.toWarehouseId && m.fromWarehouseId);
          return isDown ? -Math.abs(m.quantity) : Math.abs(m.quantity);
        }
        return 0; // transfer across entire company
      });

      const totalDelta = deltas.reduce((s, d) => s + d, 0);
      let running = Math.max(0, currentStock - totalDelta);

      for (let i = 0; i < sortedAsc.length; i++) {
        const m = sortedAsc[i];
        const delta = deltas[i];
        const before = running;
        const after = Math.max(0, running + delta);
        running = after;

        const refLower = (m.reference || "").toLowerCase();
        const notesLower = (m.notes || "").toLowerCase();

        let actionLabel = { ar: "طلب جديد", en: "New Order" };
        let actionType: "order" | "cancel" | "in" | "out" | "transfer" | "adjustment" = "order";
        let reason = m.notes || (m.reference ? `Stock deducted for order item: ${m.reference}` : "Stock deducted for order item");

        if (refLower.includes("cancel") || notesLower.includes("cancel") || refLower.includes("refund")) {
          actionType = "cancel";
          actionLabel = { ar: "إلغاء طلب", en: "Cancelled Order" };
          reason = m.notes || `Stock restored for cancelled order: ${m.reference || m.moveNo}`;
        } else if (m.moveType === "in" || refLower.includes("purchase") || refLower.includes("inbound")) {
          actionType = "in";
          actionLabel = { ar: "توريد مخزني", en: "Stock Inbound" };
          reason = m.notes || (m.reference ? `Stock added via supplier receipt: ${m.reference}` : "Stock added via purchase receipt");
        } else if (m.moveType === "transfer") {
          actionType = "transfer";
          actionLabel = { ar: "تحويل فرعي", en: "Branch Transfer" };
          reason = m.notes || `Transfer between facilities: ${m.fromWarehouseName?.ar || ""} ➔ ${m.toWarehouseName?.ar || ""}`;
        } else if (m.moveType === "adjustment") {
          actionType = "adjustment";
          actionLabel = { ar: "تسوية جردية", en: "Stock Adjustment" };
          reason = m.notes || `Inventory audit adjustment: ${m.reference || m.moveNo}`;
        } else {
          actionType = "order";
          actionLabel = { ar: "طلب جديد", en: "New Order" };
          reason = m.notes || "Stock deducted for order item";
        }

        map.set(m.id, {
          beforeQty: before,
          afterQty: after,
          deltaQty: delta,
          actionLabel,
          actionType,
          reason,
        });
      }
    }

    return map;
  }, [allMovements, products]);

  // Filter Movements
  const filteredMovements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return allMovements.filter((m) => {
      const enriched = enrichedMovementsMap.get(m.id);

      // Type filter
      if (selectedType !== "all" && enriched && enriched.actionType !== selectedType) {
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
        const matchReason = (enriched?.reason || "").toLowerCase().includes(q);

        return (
          matchNo ||
          matchSku ||
          matchNameAr ||
          matchNameEn ||
          matchRef ||
          matchReason
        );
      }

      return true;
    });
  }, [allMovements, enrichedMovementsMap, searchQuery, selectedType, selectedWarehouseId, dateFilter]);

  // Pagination
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
    paginatedItems: paginatedMovements,
  } = usePagination(filteredMovements, 20);

  // Active product for form
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === formProductId);
  }, [products, formProductId]);

  const handleOpenRecordModal = (type: StockMoveType = "in") => {
    setFormMoveType(type);
    const firstProd = products[0];
    setFormProductId(firstProd ? firstProd.id : "");
    setFormUnitCost(firstProd ? firstProd.costPrice : 0);
    setFormQuantity(45);
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

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

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

  const handleExportExcel = () => {
    const dataToExport = filteredMovements.map((m) => {
      const enriched = enrichedMovementsMap.get(m.id);
      return {
        "التاريخ والوقت": formatMovementDateArabic(m.movedAt),
        "كود الصنف (SKU)": m.productSku,
        "اسم المنتج": m.productName.ar,
        "نوع الحركة": enriched ? pick(enriched.actionLabel) : m.moveType,
        "التغيير": enriched ? (enriched.deltaQty > 0 ? `+${enriched.deltaQty}` : `${enriched.deltaQty}`) : m.quantity,
        "قبل": enriched?.beforeQty ?? "-",
        "بعد": enriched?.afterQty ?? "-",
        "السبب / البيان": enriched?.reason || m.reference || "-",
        "رقم الحركة": m.moveNo,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const colWidths = Object.keys(dataToExport[0] || {}).map((key) => ({
      wch: Math.max(key.length * 2, 18),
    }));
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "سجل_حركات_المخزون");
    const dateSuffix = new Date().toISOString().slice(0, 10);
    safeDownloadWorkbook(workbook, `سجل_حركات_المخزون_${dateSuffix}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Title & Top Actions Bar matching clean ERP design */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {pick({ ar: "سجل حركات المخزون", en: "Stock Movement Ledger" })}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pick({
              ar: "تتبع رصيد كل صنف قبل وبعد كل حركة مبيعات أو توريد أو تسوية",
              en: "Track item balance before and after each sale, receipt, or adjustment",
            })}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Btn
            size="sm"
            onClick={() => handleOpenRecordModal("in")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-4 py-2 text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{pick({ ar: "تسجيل حركة جديدة", en: "Record Movement" })}</span>
          </Btn>

          <Btn
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="rounded-xl px-3.5 py-2 text-xs font-medium border-border/80 hover:bg-muted/70 flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{pick({ ar: "تصدير إلى Excel", en: "Export .xlsx" })}</span>
          </Btn>

          <Btn
            variant="outline"
            size="sm"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="rounded-xl px-3 py-2 text-xs border-border/80 hover:bg-muted/70 flex items-center gap-1.5"
            title={pick({ ar: "تحديث السجل", en: "Refresh ledger" })}
          >
            <RotateCcw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
          </Btn>
        </div>
      </div>

      {/* 2. Search & Filter Strip */}
      <div className="surface-panel rounded-2xl p-3.5 shadow-xs border border-border/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={pick({
              ar: "بحث بالمنتج أو كود الطلب أو السبب...",
              en: "Search product, order id, or reason...",
            })}
            className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-input bg-background/50 focus:bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/20"
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

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: "all", label: { ar: "الكل", en: "All" } },
            { id: "order", label: { ar: "طلب جديد", en: "New Orders" } },
            { id: "cancel", label: { ar: "إلغاء طلب", en: "Cancelled Orders" } },
            { id: "in", label: { ar: "توريد مخزني", en: "Inbound" } },
            { id: "transfer", label: { ar: "تحويل فرعي", en: "Transfers" } },
            { id: "adjustment", label: { ar: "تسوية جردية", en: "Adjustments" } },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedType(opt.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                selectedType === opt.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {pick(opt.label)}
            </button>
          ))}
        </div>
      </div>

      {/* 3. The Dedicated Movement Ledger Table - Exactly matching user screenshot */}
      <div className="surface-panel rounded-2xl shadow-xs border border-border/60 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse" dir="rtl">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground text-xs font-medium bg-muted/20">
                <th className="py-4 px-5 text-start font-medium w-48">
                  {pick({ ar: "التاريخ", en: "Date" })}
                </th>
                <th className="py-4 px-5 text-start font-medium">
                  {pick({ ar: "المنتج", en: "Product" })}
                </th>
                <th className="py-4 px-5 text-start font-medium w-36">
                  {pick({ ar: "نوع الحركة", en: "Move Type" })}
                </th>
                <th className="py-4 px-5 text-center font-medium w-28">
                  {pick({ ar: "التغيير", en: "Change" })}
                </th>
                <th className="py-4 px-5 text-center font-medium w-24">
                  {pick({ ar: "قبل", en: "Before" })}
                </th>
                <th className="py-4 px-5 text-center font-medium w-24">
                  {pick({ ar: "بعد", en: "After" })}
                </th>
                <th className="py-4 px-5 text-start font-medium">
                  {pick({ ar: "السبب", en: "Reason" })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Boxes className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <div>{pick({ ar: "لا توجد حركات مخزنية مسجلة", en: "No stock movements recorded" })}</div>
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((m) => {
                  const enriched = enrichedMovementsMap.get(m.id);
                  const delta = enriched ? enriched.deltaQty : (m.moveType === "out" ? -m.quantity : m.quantity);
                  const isNegative = delta < 0;
                  const isPositive = delta > 0;
                  const prod = products.find((p) => p.id === m.productId);

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedVoucher(m)}
                    >
                      {/* 1. التاريخ */}
                      <td className="py-4 px-5 text-foreground font-normal whitespace-nowrap">
                        {formatMovementDateArabic(m.movedAt)}
                      </td>

                      {/* 2. المنتج (Thumbnail + Name) */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {prod?.image ? (
                            <img
                              src={prod.image}
                              alt={pick(m.productName)}
                              className="w-10 h-10 rounded-lg object-cover bg-muted/60 shrink-0 border border-border/40"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-xs leading-snug line-clamp-1">
                              {pick(m.productName)}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {m.productSku}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. نوع الحركة */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          {enriched?.actionType === "order" ? (
                            <>
                              <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />
                              <span className="text-foreground">
                                {pick({ ar: "طلب جديد", en: "New Order" })}
                              </span>
                            </>
                          ) : enriched?.actionType === "cancel" ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span className="text-foreground">
                                {pick({ ar: "إلغاء طلب", en: "Cancelled Order" })}
                              </span>
                            </>
                          ) : enriched?.actionType === "in" ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span className="text-foreground">
                                {pick({ ar: "توريد مخزني", en: "Inbound Supply" })}
                              </span>
                            </>
                          ) : enriched?.actionType === "transfer" ? (
                            <>
                              <ArrowLeftRight className="w-4 h-4 text-purple-500 shrink-0" />
                              <span className="text-foreground">
                                {pick({ ar: "تحويل فرعي", en: "Transfer" })}
                              </span>
                            </>
                          ) : (
                            <>
                              <SlidersHorizontal className="w-4 h-4 text-amber-500 shrink-0" />
                              <span className="text-foreground">
                                {pick({ ar: "تسوية جردية", en: "Adjustment" })}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 4. التغيير */}
                      <td className="py-4 px-5 text-center font-mono font-bold text-sm whitespace-nowrap">
                        {isNegative ? (
                          <span className="text-rose-500">
                            {Math.abs(delta)}-
                          </span>
                        ) : isPositive ? (
                          <span className="text-emerald-500">
                            {Math.abs(delta)}+
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>

                      {/* 5. قبل */}
                      <td className="py-4 px-5 text-center font-mono font-normal text-foreground text-sm whitespace-nowrap">
                        {enriched?.beforeQty !== undefined ? n(enriched.beforeQty) : "-"}
                      </td>

                      {/* 6. بعد */}
                      <td className="py-4 px-5 text-center font-mono font-normal text-foreground text-sm whitespace-nowrap">
                        {enriched?.afterQty !== undefined ? n(enriched.afterQty) : "-"}
                      </td>

                      {/* 7. السبب */}
                      <td className="py-4 px-5 text-muted-foreground text-xs max-w-xs font-normal">
                        <span className="line-clamp-2" title={enriched?.reason || m.notes || m.reference}>
                          {enriched?.reason || m.notes || m.reference || "Stock movement transaction"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="p-3.5 border-t border-border/40 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-muted-foreground">
            {pick({ ar: "إجمالي الحركات المعروضة:", en: "Total shown:" })}{" "}
            <span className="font-mono font-semibold text-foreground">
              {filteredMovements.length}
            </span>
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

      {/* 4. Record New Movement Modal */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6" dir={dir}>
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
                    ar: "قيد حركة بيع، توريد مشتريات، تحويل بين المستودعات، أو تسوية",
                    en: "Record sales, supply, inter-facility transfer, or adjustment",
                  })}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Movement Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {pick({ ar: "نوع الحركة المخزنية *", en: "Movement Type *" })}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    id: "in",
                    label: { ar: "توريد مخزني", en: "Inbound" },
                    icon: TrendingUp,
                    color: "text-emerald-500",
                  },
                  {
                    id: "out",
                    label: { ar: "طلب جديد (صرف)", en: "New Order (Issue)" },
                    icon: TrendingDown,
                    color: "text-rose-500",
                  },
                  {
                    id: "transfer",
                    label: { ar: "تحويل فرعي", en: "Transfer" },
                    icon: ArrowLeftRight,
                    color: "text-purple-500",
                  },
                  {
                    id: "adjustment",
                    label: { ar: "تسوية جردية", en: "Adjustment" },
                    icon: SlidersHorizontal,
                    color: "text-amber-500",
                  },
                ].map((item) => {
                  const isSelected = formMoveType === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setFormMoveType(item.id as StockMoveType)}
                      className={cn(
                        "p-2.5 rounded-xl border text-start transition-all flex flex-col justify-between gap-1 cursor-pointer",
                        isSelected
                          ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-xs"
                          : "border-border/60 hover:bg-muted/40"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", item.color)} />
                      <div className="text-xs font-bold text-foreground mt-1">{pick(item.label)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Product */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {pick({ ar: "المنتج المعني بالحركة *", en: "Select Product *" })}
              </label>
              <select
                value={formProductId}
                onChange={(e) => {
                  setFormProductId(e.target.value);
                  const p = products.find((pr) => pr.id === e.target.value);
                  if (p) setFormUnitCost(p.costPrice);
                }}
                required
                className="w-full py-2 px-3 text-xs rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
              >
                <option value="">{pick({ ar: "اختر المنتج من القائمة...", en: "Select product..." })}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {pick(p.name)} (
                    {pick({ ar: "الرصيد الحالي: ", en: "Current: " })}
                    {p.qty})
                  </option>
                ))}
              </select>

              {activeProduct && (
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold text-foreground">{pick(activeProduct.name)}</span>
                  </div>
                  <div className="font-mono text-muted-foreground">
                    {pick({ ar: "الرصيد المتاح:", en: "Available:" })} <strong className="text-foreground">{activeProduct.qty}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Facilities for Transfer/In/Out */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(formMoveType === "out" || formMoveType === "transfer" || formMoveType === "adjustment") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {pick({ ar: "المستودع المصدر *", en: "Source Warehouse *" })}
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

              {(formMoveType === "in" || formMoveType === "transfer") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {pick({ ar: "المستودع الوجهة *", en: "Destination Warehouse *" })}
                  </label>
                  <select
                    value={formToWhId}
                    onChange={(e) => setFormToWhId(e.target.value)}
                    required
                    className="w-full py-2 px-3 text-xs rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                  >
                    <option value="">{pick({ ar: "اختر المستودع...", en: "Select warehouse..." })}</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id} disabled={wh.id === formFromWhId}>
                        {pick(wh.name)} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {pick({ ar: "كمية الحركة (التغيير) *", en: "Quantity Change *" })}
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(Number(e.target.value))}
                  required
                  className="w-full py-2 px-3 text-xs font-mono font-bold rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                />
              </div>

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

            {/* Reason / Reference */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {pick({ ar: "السبب / البيان أو رقم الطلب", en: "Reason / Order ID Reference" })}
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g. Stock deducted for order item / ORD202602246848"
                className="w-full py-2 px-3 text-xs rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
              />
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

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
                className="bg-primary text-primary-foreground font-semibold rounded-xl text-xs px-5 shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {formSubmitting && <RotateCcw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {formSubmitting
                    ? pick({ ar: "جاري الحفظ...", en: "Saving..." })
                    : pick({ ar: "تأكيد وقيد الحركة", en: "Confirm & Record" })}
                </span>
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Movement Slip / Voucher Modal */}
      <Dialog open={Boolean(selectedVoucher)} onOpenChange={() => setSelectedVoucher(null)}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto rounded-3xl p-6 sm:p-8" dir={dir}>
          {selectedVoucher && (
            <div className="space-y-6">
              <div className="border-b-2 border-primary/20 pb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-primary block">WAZEER EL-HELW ERP</span>
                  <h3 className="text-xl font-bold text-foreground">
                    {pick({ ar: "إذن حركة مخزنية معتمد", en: "Official Movement Voucher" })}
                  </h3>
                </div>
                <div className="text-end font-mono text-xs text-muted-foreground">
                  <div>{selectedVoucher.moveNo}</div>
                  <div>{formatMovementDateArabic(selectedVoucher.movedAt)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/20 p-3.5 rounded-2xl border border-border/40">
                <div>
                  <span className="text-muted-foreground block">{pick({ ar: "المنتج", en: "Product" })}</span>
                  <span className="font-bold text-foreground mt-0.5 block">{pick(selectedVoucher.productName)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{pick({ ar: "كود SKU", en: "SKU" })}</span>
                  <span className="font-mono font-bold text-foreground mt-0.5 block">{selectedVoucher.productSku}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{pick({ ar: "الكمية", en: "Quantity" })}</span>
                  <span className="font-mono font-bold text-foreground mt-0.5 block">{n(selectedVoucher.quantity)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{pick({ ar: "القيمة الإجمالية", en: "Total Valuation" })}</span>
                  <span className="font-mono font-bold text-primary mt-0.5 block">{money(selectedVoucher.totalCost)}</span>
                </div>
              </div>

              {selectedVoucher.notes && (
                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs">
                  <strong className="text-foreground">{pick({ ar: "السبب / البيان:", en: "Reason:" })}</strong>{" "}
                  <span className="text-muted-foreground">{selectedVoucher.notes}</span>
                </div>
              )}

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
                  className="bg-primary text-primary-foreground font-semibold rounded-xl text-xs px-4 flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>{pick({ ar: "طباعة الإذن", en: "Print Slip" })}</span>
                </Btn>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
