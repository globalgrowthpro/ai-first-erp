import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Store,
  Users,
  Search,
  Filter,
  RotateCcw,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Calendar,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Banknote,
  Coins,
  History,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown,
  X,
  RefreshCw,
  Bell,
  Eye,
  ShoppingBag,
  Award,
  Flame,
  Zap,
  Sparkles,
  BarChart3,
  Receipt,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import { useCompanySettings } from "@/lib/settings-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { POS_BRANCHES, POS_BRANCH_CASHIERS, type PosCashierUser } from "@/routes/pos";
import { formatShortShiftId } from "@/lib/utils";
import { BRANCH_NAMES_MAP } from "@/lib/pos-orders-store";

export function resolveBranchName(
  rawIdOrName?: string | null,
  customMap?: Map<string, { ar: string; en: string }>
): { ar: string; en: string } {
  if (!rawIdOrName) {
    return { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis Branch" };
  }
  const clean = String(rawIdOrName).trim();

  // 1. Direct match in dynamic DB map
  if (customMap && customMap.has(clean)) {
    return customMap.get(clean)!;
  }

  // 2. Direct match in static BRANCH_NAMES_MAP
  if (BRANCH_NAMES_MAP[clean]) {
    const b = BRANCH_NAMES_MAP[clean];
    return { ar: b.ar, en: b.en };
  }

  // 3. Direct match in POS_BRANCHES
  const posB = POS_BRANCHES.find((b) => b.id.toLowerCase() === clean.toLowerCase());
  if (posB) {
    return { ar: posB.ar, en: posB.en };
  }

  // 4. Well-known UUIDs & aliases
  if (
    clean.includes("27e6e065") ||
    clean.toLowerCase().includes("kitchen") ||
    clean.toLowerCase().includes("delivery")
  ) {
    return { ar: "المطبخ المركزي — طلبات التوصيل", en: "Central Kitchen Delivery Hub" };
  }
  if (
    clean.includes("30000000-0000-0000-0000-000000000001") ||
    clean.toLowerCase().includes("korba") ||
    clean.endsWith("01")
  ) {
    return { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis Branch" };
  }
  if (
    clean.includes("30000000-0000-0000-0000-000000000002") ||
    clean.toLowerCase().includes("maadi") ||
    clean.endsWith("02")
  ) {
    return { ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St. Branch" };
  }
  if (
    clean.includes("30000000-0000-0000-0000-000000000003") ||
    clean.toLowerCase().includes("tagamoa") ||
    clean.endsWith("03")
  ) {
    return { ar: "فرع التجمع الخامس — التسعين", en: "New Cairo — 90th St. Branch" };
  }
  if (
    clean.includes("30000000-0000-0000-0000-000000000004") ||
    clean.toLowerCase().includes("factory")
  ) {
    return { ar: "مصنع العاشر والمطبخ المركزي", en: "Central Factory & Kitchen Hub" };
  }
  if (clean.toLowerCase().includes("coast") || clean.toLowerCase().includes("marina")) {
    return { ar: "فرع الساحل الشمالي — مارينا", en: "North Coast — Marina Hub" };
  }
  if (clean.toLowerCase().includes("alex") || clean.toLowerCase().includes("smouha")) {
    return { ar: "فرع الإسكندرية — سموحة", en: "Alexandria — Smouha Branch" };
  }
  if (clean.toLowerCase().includes("october")) {
    return { ar: "فرع حدائق أكتوبر — سياحية", en: "October Gardens Branch" };
  }
  if (clean.toLowerCase().includes("faisal")) {
    return { ar: "فرع فيصل — العشرين", en: "Faisal — Al-Eshreen Branch" };
  }

  // 5. If it's already an Arabic/English label and not a UUID
  if (!clean.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return { ar: clean, en: clean };
  }

  return { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis Branch" };
}

export function normalizeDateOnly(rawDate?: string | Date | number | null): string {
  if (!rawDate) return "";
  try {
    if (typeof rawDate === "string") {
      const trimmed = rawDate.trim();
      const match = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
      if (match && match[1] && match[2] && match[3]) {
        return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
      }
    }
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch {}
  return String(rawDate).slice(0, 10).replace(/\//g, "-");
}

export function formatShiftDate(
  rawDateTime?: string | null,
  lang: "ar" | "en" = "ar"
): string {
  if (!rawDateTime) return "";
  const normalized = normalizeDateOnly(rawDateTime);
  if (normalized) {
    return normalized.replace(/-/g, "/");
  }
  return String(rawDateTime).slice(0, 10).replace(/-/g, "/");
}

export function formatShiftTime(
  rawDateTime?: string | null,
  lang: "ar" | "en" = "ar"
): string {
  if (!rawDateTime) return "--:--";
  const str = String(rawDateTime).trim();
  if (
    str.includes("ص") ||
    str.includes("م") ||
    str.includes("AM") ||
    str.includes("PM")
  ) {
    return str;
  }
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const isAr = lang === "ar";
    const ampm = hours >= 12 ? (isAr ? "م" : "PM") : (isAr ? "ص" : "AM");
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");
    return `${strHours}:${minutes} ${ampm}`;
  } catch {
    return str;
  }
}

export function formatHourSlot(hour24: number, lang: "ar" | "en" = "ar"): string {
  const isAr = lang === "ar";
  const startHour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const startAmPm = hour24 >= 12 ? (isAr ? "م" : "PM") : (isAr ? "ص" : "AM");

  const nextHour24 = (hour24 + 1) % 24;
  const endHour12 = nextHour24 % 12 === 0 ? 12 : nextHour24 % 12;
  const endAmPm = nextHour24 >= 12 ? (isAr ? "م" : "PM") : (isAr ? "ص" : "AM");

  const sH = String(startHour12).padStart(2, "0");
  const eH = String(endHour12).padStart(2, "0");

  return `${sH}:00 ${startAmPm} - ${eH}:00 ${endAmPm}`;
}

export interface PosShiftAdminRecord {
  id: string;
  shiftNumber: string;
  branchId: string;
  branchName: { ar: string; en: string };
  cashierId: string;
  cashierName: string;
  cashierCode: string;
  openedAt: string;
  closedAt: string | null;
  status: "open" | "closed";
  totalEntries: number; // orders count
  startingAmount: number; // opening cash float
  cashSales: number;
  cardSales: number;
  walletSales: number;
  totalSales: number;
  closingActualAmount: number; // expected system cash = startingAmount + cashSales
  closingCashierAddAmount: number | null; // actual counted cash entered by cashier/admin
  variance: number | null; // closingCashierAddAmount - closingActualAmount
  varianceStatus: "balanced" | "surplus" | "shortage" | "in_progress";
  notes?: string | undefined;
  dateStr: string;
}

export interface PosOrderAdminRecord {
  id: string;
  orderNumber: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  orderType: string;
  paymentMethod: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  tenderAmount: number;
  changeAmount: number;
  status: string;
  createdAt: string;
}

export interface PosOrderItemAdminRecord {
  id: string;
  orderId: string;
  productId: string | null;
  sku: string;
  nameAr: string;
  nameEn: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

type PosViewTab = "shifts" | "hourly" | "products" | "branches";

export function AdminPosShiftsView() {
  const { pick, money, lang, dir } = useI18n();
  const { settings } = useCompanySettings();
  const currencySymbol = lang === "ar" ? "ج.م" : "EGP";

  // Active View Tab (Shifts, Hourly Report, Product Report, Branch Report)
  const [activeTab, setActiveTab] = useState<PosViewTab>("shifts");

  // Real Database Entities
  const [shifts, setShifts] = useState<PosShiftAdminRecord[]>([]);
  const [orders, setOrders] = useState<PosOrderAdminRecord[]>([]);
  const [orderItems, setOrderItems] = useState<PosOrderItemAdminRecord[]>([]);
  const [dynamicBranchMap, setDynamicBranchMap] = useState<Map<string, { ar: string; en: string }>>(new Map());
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedCashier, setSelectedCashier] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  // Default to "all" so all real data is immediately visible on first load
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "week" | "month" | "custom">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [shiftToClose, setShiftToClose] = useState<PosShiftAdminRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<PosShiftAdminRecord | null>(null);

  // Form states for Starting a new shift
  const [newShiftForm, setNewShiftForm] = useState({
    branchId: POS_BRANCHES[0]?.id || "korba",
    cashierId: POS_BRANCH_CASHIERS[0]?.id || "usr_korba_1",
    cashierName: POS_BRANCH_CASHIERS[0]?.name.ar || "أحمد سالم",
    cashierCode: POS_BRANCH_CASHIERS[0]?.code || "101",
    startingAmount: "1000",
  });

  // Form states for Closing an open shift
  const [closeFormCountedCash, setCloseFormCountedCash] = useState("");
  const [closeFormNotes, setCloseFormNotes] = useState("");
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  // Helper date generators
  const getTodayStr = () => new Date().toISOString().slice(0, 10);
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const getDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };
  const getStartOfMonthStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  };

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

  // Fetch 100% real data from Supabase (pos_shifts, pos_orders, pos_order_items, audit_log, branches)
  const fetchShiftsData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch in parallel from Supabase
      const [
        { data: dbShifts, error: shiftsErr },
        { data: dbOrders, error: ordersErr },
        { data: dbItems, error: itemsErr },
        { data: auditLogs },
        { data: bData },
        { data: wData },
      ] = await Promise.all([
        supabase.from("pos_shifts").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("pos_orders").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("pos_order_items").select("*").order("created_at", { ascending: false }).limit(3000),
        supabase.from("audit_log").select("*").eq("entity", "pos_shifts").order("created_at", { ascending: false }).limit(200),
        supabase.from("branches").select("id, code, name_ar, name_en"),
        supabase.from("warehouses").select("id, code, name_ar, name_en"),
      ]);

      // 2. Build dynamic branch & warehouse name resolution map
      const bMap = new Map<string, { ar: string; en: string }>();
      if (bData) {
        for (const b of bData) {
          if (b.id) bMap.set(b.id, { ar: b.name_ar, en: b.name_en });
          if (b.code) bMap.set(b.code, { ar: b.name_ar, en: b.name_en });
        }
      }
      if (wData) {
        for (const w of wData) {
          if (w.id) bMap.set(w.id, { ar: w.name_ar, en: w.name_en });
          if (w.code) bMap.set(w.code, { ar: w.name_ar, en: w.name_en });
        }
      }
      setDynamicBranchMap(bMap);

      // 3. Process Orders
      if (dbOrders) {
        const mappedOrders: PosOrderAdminRecord[] = dbOrders.map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          cashierId: o.cashier_id || "",
          cashierName: o.cashier_name || "كاشير",
          branchId: o.branch_id || "korba",
          orderType: o.order_type || "takeaway",
          paymentMethod: o.payment_method || "cash",
          subtotal: Number(o.subtotal || 0),
          taxAmount: Number(o.tax_amount || 0),
          discountAmount: Number(o.discount_amount || 0),
          total: Number(o.total || 0),
          tenderAmount: Number(o.tender_amount || 0),
          changeAmount: Number(o.change_amount || 0),
          status: o.status || "completed",
          createdAt: o.created_at || new Date().toISOString(),
        }));
        setOrders(mappedOrders);
      }

      // 4. Process Order Items
      if (dbItems) {
        const mappedItems: PosOrderItemAdminRecord[] = dbItems.map((it: any) => ({
          id: it.id,
          orderId: it.order_id,
          productId: it.product_id,
          sku: it.sku || "SKU-AUTO",
          nameAr: it.name_ar || "صنف بدون اسم",
          nameEn: it.name_en || "Item",
          quantity: Number(it.quantity || 1),
          unitPrice: Number(it.unit_price || 0),
          totalPrice: Number(it.total_price || 0),
          createdAt: it.created_at || new Date().toISOString(),
        }));
        setOrderItems(mappedItems);
      }

      // 5. Build Audit Log map for shift reconciliation
      const auditMap = new Map<string, any>();
      if (auditLogs) {
        for (const log of auditLogs) {
          const shiftNum = log.entity_id;
          if (shiftNum && !auditMap.has(shiftNum)) {
            auditMap.set(shiftNum, log.payload);
          }
        }
      }

      // 6. Process Real DB Shifts
      const combinedRecords: PosShiftAdminRecord[] = [];
      if (dbShifts && dbShifts.length > 0) {
        for (const s of dbShifts) {
          const shortShiftNum = formatShortShiftId(s.shift_number);
          const branchName = resolveBranchName(s.branch_id, bMap);
          const auditPayload =
            auditMap.get(s.shift_number) || (shortShiftNum ? auditMap.get(shortShiftNum) : undefined);

          const startingAmount = Number(s.opening_cash || 0);
          const cashSales = Number(s.cash_sales || 0);
          const cardSales = Number(s.card_sales || 0);
          const walletSales = Number(s.wallet_sales || 0);
          const totalSales = Number(s.total_sales || 0);
          const totalEntries = Number(s.orders_count || 0);

          const closingActualAmount = startingAmount + cashSales;

          let closingCashierAddAmount: number | null = null;
          let variance: number | null = null;
          let notes: string | undefined = undefined;
          let varianceStatus: "balanced" | "surplus" | "shortage" | "in_progress" = "in_progress";
          let shiftClosed = s.status === "closed";
          let closedAtTime = s.closed_at;

          if (auditPayload) {
            closingCashierAddAmount = Number(auditPayload.actual_cash ?? auditPayload.actualCash ?? 0);
            variance = Number(auditPayload.variance ?? 0);
            notes = auditPayload.notes || undefined;
            varianceStatus =
              variance === 0 ? "balanced" : variance > 0 ? "surplus" : "shortage";
            shiftClosed = true;
          } else if (shiftClosed) {
            // Closed in DB without separate audit row
            closingCashierAddAmount = closingActualAmount;
            variance = 0;
            varianceStatus = "balanced";
          }

          const rawDate = s.opened_at || s.created_at || new Date().toISOString();
          const dateStr = normalizeDateOnly(rawDate);

          combinedRecords.push({
            id: s.id,
            shiftNumber: s.shift_number,
            branchId: s.branch_id,
            branchName,
            cashierId: s.cashier_id,
            cashierName: s.cashier_name || "كاشير مناوب",
            cashierCode: s.cashier_id?.replace(/\D/g, "").slice(-3) || "101",
            openedAt: s.opened_at,
            closedAt: closedAtTime,
            status: shiftClosed ? "closed" : "open",
            totalEntries,
            startingAmount,
            cashSales,
            cardSales,
            walletSales,
            totalSales,
            closingActualAmount,
            closingCashierAddAmount,
            variance,
            varianceStatus,
            notes,
            dateStr,
          });
        }
      }

      setShifts(combinedRecords);
    } catch (err) {
      console.error("Error fetching real admin shifts & POS reports:", err);
      toast.error(lang === "ar" ? "فشل تحميل بيانات الورديات والتقارير" : "Failed to load shifts and reports");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchShiftsData();

    // Listen to cross-tab & local storage events
    const handleSync = () => {
      fetchShiftsData();
    };
    window.addEventListener("storage", handleSync);
    window.addEventListener("pos-shift-reconciled", handleSync);
    window.addEventListener("hafez-system-notification", handleSync);

    // Realtime listeners for DB changes
    const channel = supabase
      .channel("admin_pos_shifts_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pos_shifts" }, () => fetchShiftsData())
      .on("postgres_changes", { event: "*", schema: "public", table: "pos_orders" }, () => fetchShiftsData())
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_log" }, () => fetchShiftsData())
      .subscribe();

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("pos-shift-reconciled", handleSync);
      window.removeEventListener("hafez-system-notification", handleSync);
      supabase.removeChannel(channel);
    };
  }, [fetchShiftsData]);

  // Extract unique cashiers
  const cashierOptions = useMemo(() => {
    const map = new Map<string, string>();
    shifts.forEach((s) => {
      if (s.cashierName) {
        map.set(s.cashierId, s.cashierName);
      }
    });
    orders.forEach((o) => {
      if (o.cashierName && o.cashierId) {
        map.set(o.cashierId, o.cashierName);
      }
    });
    POS_BRANCH_CASHIERS.forEach((c) => {
      if (!map.has(c.id)) {
        map.set(c.id, c.name.ar);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [shifts, orders]);

  // Extract unique branches with clean names for the filter dropdown
  const branchFilterOptions = useMemo(() => {
    const map = new Map<string, { id: string; ar: string; en: string }>();
    for (const b of POS_BRANCHES) {
      map.set(b.id, { id: b.id, ar: b.ar, en: b.en });
    }
    for (const s of shifts) {
      if (s.branchId && !map.has(s.branchId)) {
        map.set(s.branchId, {
          id: s.branchId,
          ar: s.branchName.ar,
          en: s.branchName.en,
        });
      }
    }
    for (const o of orders) {
      if (o.branchId && !map.has(o.branchId)) {
        const bName = resolveBranchName(o.branchId, dynamicBranchMap);
        map.set(o.branchId, {
          id: o.branchId,
          ar: bName.ar,
          en: bName.en,
        });
      }
    }
    return Array.from(map.values());
  }, [shifts, orders, dynamicBranchMap]);

  // Filtered Shifts List
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = s.shiftNumber.toLowerCase().includes(q);
        const matchBranchAr = s.branchName.ar.toLowerCase().includes(q);
        const matchBranchEn = s.branchName.en.toLowerCase().includes(q);
        const matchCashier = s.cashierName.toLowerCase().includes(q);
        const matchCode = s.cashierCode.toLowerCase().includes(q);
        if (!matchNumber && !matchBranchAr && !matchBranchEn && !matchCashier && !matchCode) {
          return false;
        }
      }

      // 2. Branch Filter (ID, Name or Slug)
      if (selectedBranch !== "all") {
        const matchesId = s.branchId === selectedBranch;
        const matchesName =
          s.branchName.ar.toLowerCase().includes(selectedBranch.toLowerCase()) ||
          s.branchName.en.toLowerCase().includes(selectedBranch.toLowerCase());
        const matchesKnownSlug =
          (selectedBranch === "korba" && (s.branchName.ar.includes("الكوربة") || s.branchId.includes("korba") || s.branchId.endsWith("01"))) ||
          (selectedBranch === "maadi" && (s.branchName.ar.includes("المعادي") || s.branchId.includes("maadi") || s.branchId.endsWith("02"))) ||
          (selectedBranch === "tagamoa" && (s.branchName.ar.includes("التجمع") || s.branchId.includes("tagamoa") || s.branchId.endsWith("03"))) ||
          (selectedBranch === "kitchen" && (s.branchName.ar.includes("المطبخ") || s.branchId.includes("27e6e065") || s.branchId.endsWith("04")));
        if (!matchesId && !matchesName && !matchesKnownSlug) {
          return false;
        }
      }

      // 3. Cashier Filter
      if (selectedCashier !== "all" && s.cashierId !== selectedCashier && s.cashierName !== selectedCashier) {
        return false;
      }

      // 4. Status Filter
      if (selectedStatus === "open" && s.status !== "open") return false;
      if (selectedStatus === "closed" && s.status !== "closed") return false;
      if (selectedStatus === "shortage" && s.varianceStatus !== "shortage") return false;
      if (selectedStatus === "surplus" && s.varianceStatus !== "surplus") return false;
      if (selectedStatus === "balanced" && s.varianceStatus !== "balanced") return false;

      // 5. Date Filter (Normalized ISO Date Comparison including active/closed window)
      if (dateFrom || dateTo) {
        const normFrom = dateFrom ? normalizeDateOnly(dateFrom) : "";
        const normTo = dateTo ? normalizeDateOnly(dateTo) : "";

        const openD = normalizeDateOnly(s.openedAt || s.dateStr);
        const closeD = s.closedAt
          ? normalizeDateOnly(s.closedAt)
          : (s.status === "open" ? normalizeDateOnly(new Date()) : openD);

        // A shift is active/relevant in the range if it opened before/on the end date AND closed after/on the start date
        if (normFrom && closeD < normFrom) return false;
        if (normTo && openD > normTo) return false;
      }

      return true;
    });
  }, [shifts, searchQuery, selectedBranch, selectedCashier, selectedStatus, dateFrom, dateTo]);

  // Filtered Orders List (for Hourly, Product, Branch Reports)
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = o.orderNumber?.toLowerCase().includes(q);
        const matchCashier = o.cashierName?.toLowerCase().includes(q);
        if (!matchNum && !matchCashier) return false;
      }

      // 2. Branch Filter
      if (selectedBranch !== "all") {
        const branchMatch =
          o.branchId === selectedBranch ||
          (selectedBranch === "korba" && (o.branchId?.includes("korba") || o.branchId?.endsWith("01"))) ||
          (selectedBranch === "maadi" && (o.branchId?.includes("maadi") || o.branchId?.endsWith("02"))) ||
          (selectedBranch === "tagamoa" && (o.branchId?.includes("tagamoa") || o.branchId?.endsWith("03"))) ||
          (selectedBranch === "kitchen" && (o.branchId?.includes("kitchen") || o.branchId?.includes("27e6e065")));
        if (!branchMatch) return false;
      }

      // 3. Cashier Filter
      if (selectedCashier !== "all" && o.cashierId !== selectedCashier && o.cashierName !== selectedCashier) {
        return false;
      }

      // 4. Date Filter
      if (dateFrom || dateTo) {
        const orderD = normalizeDateOnly(o.createdAt);
        const normFrom = dateFrom ? normalizeDateOnly(dateFrom) : "";
        const normTo = dateTo ? normalizeDateOnly(dateTo) : "";
        if (normFrom && orderD < normFrom) return false;
        if (normTo && orderD > normTo) return false;
      }

      return true;
    });
  }, [orders, searchQuery, selectedBranch, selectedCashier, dateFrom, dateTo]);

  // Set of matching order IDs for filtering order items
  const filteredOrderIdSet = useMemo(() => {
    return new Set(filteredOrders.map((o) => o.id));
  }, [filteredOrders]);

  // Filtered Order Items
  const filteredOrderItems = useMemo(() => {
    return orderItems.filter((it) => filteredOrderIdSet.has(it.orderId));
  }, [orderItems, filteredOrderIdSet]);

  // =========================================================================
  // 1. HOURLY SALES REPORT AGGREGATION
  // =========================================================================
  const hourlyReport = useMemo(() => {
    const hourMap: Record<
      number,
      {
        hour: number;
        ordersCount: number;
        totalSales: number;
        cashSales: number;
        cardSales: number;
        walletSales: number;
      }
    > = {};

    for (const o of filteredOrders) {
      const d = new Date(o.createdAt);
      const h = isNaN(d.getHours()) ? 0 : d.getHours();
      if (!hourMap[h]) {
        hourMap[h] = {
          hour: h,
          ordersCount: 0,
          totalSales: 0,
          cashSales: 0,
          cardSales: 0,
          walletSales: 0,
        };
      }
      hourMap[h].ordersCount += 1;
      hourMap[h].totalSales += o.total;
      if (o.paymentMethod === "cash") {
        hourMap[h].cashSales += o.total;
      } else if (o.paymentMethod === "card") {
        hourMap[h].cardSales += o.total;
      } else {
        hourMap[h].walletSales += o.total;
      }
    }

    const grandHourlyRevenue = Object.values(hourMap).reduce((s, h) => s + h.totalSales, 0);
    const maxHourSales = Math.max(0, ...Object.values(hourMap).map((h) => h.totalSales));

    const list = Object.values(hourMap)
      .map((item) => {
        const sharePercent = grandHourlyRevenue > 0 ? (item.totalSales / grandHourlyRevenue) * 100 : 0;
        const avgTicket = item.ordersCount > 0 ? item.totalSales / item.ordersCount : 0;
        const isPeak = maxHourSales > 0 && item.totalSales >= maxHourSales * 0.7;

        return {
          ...item,
          label: formatHourSlot(item.hour, lang),
          sharePercent,
          avgTicket,
          isPeak,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales); // Sort by highest revenue hour

    const peakHour = list[0] || null;
    const totalHourlyOrders = list.reduce((s, h) => s + h.ordersCount, 0);
    const avgHourlyRevenue = list.length > 0 ? grandHourlyRevenue / list.length : 0;

    return {
      rows: list,
      grandHourlyRevenue,
      totalHourlyOrders,
      avgHourlyRevenue,
      peakHour,
    };
  }, [filteredOrders, lang]);

  // =========================================================================
  // 2. PRODUCT SALES REPORT AGGREGATION
  // =========================================================================
  const productReport = useMemo(() => {
    const itemMap: Record<
      string,
      {
        sku: string;
        nameAr: string;
        nameEn: string;
        quantity: number;
        totalRevenue: number;
        ordersCount: number;
      }
    > = {};

    for (const it of filteredOrderItems) {
      const key = it.sku || it.nameAr;
      if (!itemMap[key]) {
        itemMap[key] = {
          sku: it.sku || "PROD",
          nameAr: it.nameAr,
          nameEn: it.nameEn || it.nameAr,
          quantity: 0,
          totalRevenue: 0,
          ordersCount: 0,
        };
      }
      itemMap[key].quantity += it.quantity;
      itemMap[key].totalRevenue += it.totalPrice;
      itemMap[key].ordersCount += 1;
    }

    const grandProductRevenue = Object.values(itemMap).reduce((s, p) => s + p.totalRevenue, 0);
    const totalUnitsSold = Object.values(itemMap).reduce((s, p) => s + p.quantity, 0);

    const rows = Object.values(itemMap)
      .map((p) => {
        const sharePercent = grandProductRevenue > 0 ? (p.totalRevenue / grandProductRevenue) * 100 : 0;
        const avgPrice = p.quantity > 0 ? p.totalRevenue / p.quantity : 0;
        return {
          ...p,
          sharePercent,
          avgPrice,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue); // Top revenue products first

    const topProduct = rows[0] || null;
    const topByQuantity = [...rows].sort((a, b) => b.quantity - a.quantity)[0] || null;

    return {
      rows,
      grandProductRevenue,
      totalUnitsSold,
      topProduct,
      topByQuantity,
    };
  }, [filteredOrderItems]);

  // =========================================================================
  // 3. BRANCH PERFORMANCE REPORT AGGREGATION
  // =========================================================================
  const branchReport = useMemo(() => {
    const branchMap: Record<
      string,
      {
        branchId: string;
        branchName: { ar: string; en: string };
        shiftsCount: number;
        ordersCount: number;
        totalRevenue: number;
        cashSales: number;
        cardSales: number;
        walletSales: number;
        variance: number;
      }
    > = {};

    // 1. Ingest real orders
    for (const o of filteredOrders) {
      const bId = o.branchId || "unassigned";
      if (!branchMap[bId]) {
        branchMap[bId] = {
          branchId: bId,
          branchName: resolveBranchName(bId, dynamicBranchMap),
          shiftsCount: 0,
          ordersCount: 0,
          totalRevenue: 0,
          cashSales: 0,
          cardSales: 0,
          walletSales: 0,
          variance: 0,
        };
      }
      branchMap[bId].ordersCount += 1;
      branchMap[bId].totalRevenue += o.total;
      if (o.paymentMethod === "cash") {
        branchMap[bId].cashSales += o.total;
      } else if (o.paymentMethod === "card") {
        branchMap[bId].cardSales += o.total;
      } else {
        branchMap[bId].walletSales += o.total;
      }
    }

    // 2. Ingest real shifts
    for (const s of filteredShifts) {
      const bId = s.branchId || "unassigned";
      if (!branchMap[bId]) {
        branchMap[bId] = {
          branchId: bId,
          branchName: s.branchName,
          shiftsCount: 0,
          ordersCount: 0,
          totalRevenue: 0,
          cashSales: 0,
          cardSales: 0,
          walletSales: 0,
          variance: 0,
        };
      }
      branchMap[bId].shiftsCount += 1;
      if (s.variance !== null) {
        branchMap[bId].variance += s.variance;
      }
      // If no orders were mapped for this branch yet, add shift total
      if (branchMap[bId].ordersCount === 0 && s.totalSales > 0) {
        branchMap[bId].totalRevenue += s.totalSales;
        branchMap[bId].cashSales += s.cashSales;
        branchMap[bId].cardSales += s.cardSales;
        branchMap[bId].walletSales += s.walletSales;
        branchMap[bId].ordersCount += s.totalEntries;
      }
    }

    const grandBranchRevenue = Object.values(branchMap).reduce((s, b) => s + b.totalRevenue, 0);

    const rows = Object.values(branchMap)
      .map((b) => {
        const sharePercent = grandBranchRevenue > 0 ? (b.totalRevenue / grandBranchRevenue) * 100 : 0;
        const avgShiftRevenue = b.shiftsCount > 0 ? b.totalRevenue / b.shiftsCount : b.totalRevenue;
        return {
          ...b,
          sharePercent,
          avgShiftRevenue,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue); // Top performing branch first

    const topBranch = rows[0] || null;
    const avgBranchRevenue = rows.length > 0 ? grandBranchRevenue / rows.length : 0;

    return {
      rows,
      grandBranchRevenue,
      topBranch,
      avgBranchRevenue,
    };
  }, [filteredOrders, filteredShifts, dynamicBranchMap]);

  // Overall KPIs calculation for the filtered period
  const kpis = useMemo(() => {
    const totalShiftsCount = filteredShifts.length;
    const openShiftsCount = filteredShifts.filter((s) => s.status === "open").length;
    const closedShiftsCount = filteredShifts.filter((s) => s.status === "closed").length;

    const totalStartingAmount = filteredShifts.reduce((sum, s) => sum + s.startingAmount, 0);
    const totalCashSales = filteredShifts.reduce((sum, s) => sum + s.cashSales, 0);
    const totalExpectedClosing = filteredShifts.reduce((sum, s) => sum + s.closingActualAmount, 0);
    const totalCountedClosing = filteredShifts
      .filter((s) => s.closingCashierAddAmount !== null)
      .reduce((sum, s) => sum + (s.closingCashierAddAmount || 0), 0);

    const netVariance = filteredShifts
      .filter((s) => s.variance !== null)
      .reduce((sum, s) => sum + (s.variance || 0), 0);

    const totalEntries = filteredShifts.reduce((sum, s) => sum + s.totalEntries, 0);
    const totalRevenue = filteredShifts.reduce((sum, s) => sum + s.totalSales, 0);

    return {
      totalShiftsCount,
      openShiftsCount,
      closedShiftsCount,
      totalStartingAmount,
      totalCashSales,
      totalExpectedClosing,
      totalCountedClosing,
      netVariance,
      totalEntries,
      totalRevenue,
    };
  }, [filteredShifts]);

  // Export to Excel based on current active tab
  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const dateSuffix = dateFrom || dateTo ? `_${dateFrom}_إلى_${dateTo}` : `_${getTodayStr()}`;

    if (activeTab === "shifts") {
      if (filteredShifts.length === 0) {
        toast.warning(lang === "ar" ? "لا توجد بيانات ورديات لتصديرها" : "No shifts data to export");
        return;
      }
      const dataRows = filteredShifts.map((s, idx) => ({
        "م": idx + 1,
        "رقم الوردية": s.shiftNumber,
        "اسم الفرع": lang === "ar" ? s.branchName.ar : s.branchName.en,
        "اسم الكاشير": s.cashierName,
        "كود الكاشير": s.cashierCode,
        "تاريخ الوردية": formatShiftDate(s.openedAt || s.dateStr, lang),
        "وقت البداية": formatShiftTime(s.openedAt, lang),
        "وقت الإغلاق": s.closedAt ? formatShiftTime(s.closedAt, lang) : (lang === "ar" ? "مستمرة" : "Active"),
        "الحالة": s.status === "open" ? (lang === "ar" ? "مفتوحة" : "Open") : (lang === "ar" ? "مغلقة" : "Closed"),
        "إجمالي العمليات": s.totalEntries,
        "إجمالي المبيعات (ج.م)": s.totalSales,
        "مبيعات الكاش (ج.م)": s.cashSales,
        "المبلغ الافتتاحي (Starting Amount)": s.startingAmount,
        "المبلغ المحسوب سيستمياً (Expected Cash)": s.closingActualAmount,
        "المبلغ المضاف من الكاشير (Counted Cash)": s.closingCashierAddAmount !== null ? s.closingCashierAddAmount : "قيد التشغيل",
        "الفارق (Ups / Down)": s.variance !== null ? s.variance : "-",
        "الملاحظات": s.notes || "-",
      }));
      const ws = XLSX.utils.json_to_sheet(dataRows);
      XLSX.utils.book_append_sheet(wb, ws, "ورديات_الكاشير");
      safeDownloadWorkbook(wb, `تقرير_ورديات_الكاشير${dateSuffix}.xlsx`);
    } else if (activeTab === "hourly") {
      if (hourlyReport.rows.length === 0) {
        toast.warning(lang === "ar" ? "لا توجد بيانات مبيعات بالساعة لتصديرها" : "No hourly data to export");
        return;
      }
      const dataRows = hourlyReport.rows.map((h, idx) => ({
        "م": idx + 1,
        "نطاق الساعة": h.label,
        "عدد الفواتير": h.ordersCount,
        "إجمالي المبيعات (ج.م)": h.totalSales,
        "مبيعات الكاش": h.cashSales,
        "مبيعات إلكترونية وبطاقات": h.cardSales + h.walletSales,
        "متوسط قيمة الفاتورة": Math.round(h.avgTicket),
        "نسبة المساهمة (%)": `${h.sharePercent.toFixed(1)}%`,
        "حالة الذروة": h.isPeak ? "ذروة بيع قصوى 🔥" : "نشاط عادي",
      }));
      const ws = XLSX.utils.json_to_sheet(dataRows);
      XLSX.utils.book_append_sheet(wb, ws, "تقرير_المبيعات_بالساعة");
      safeDownloadWorkbook(wb, `تقرير_المبيعات_بالساعة${dateSuffix}.xlsx`);
    } else if (activeTab === "products") {
      if (productReport.rows.length === 0) {
        toast.warning(lang === "ar" ? "لا توجد بيانات أصناف لتصديرها" : "No product data to export");
        return;
      }
      const dataRows = productReport.rows.map((p, idx) => ({
        "الترتيب": idx + 1,
        "كود الصنف (SKU)": p.sku,
        "اسم المنتج (عربي)": p.nameAr,
        "اسم المنتج (إنجليزي)": p.nameEn,
        "إجمالي الكمية المباعة": p.quantity,
        "إجمالي الإيرادات (ج.م)": p.totalRevenue,
        "متوسط سعر البيع": Math.round(p.avgPrice),
        "عدد مرات الطلب": p.ordersCount,
        "نسبة المساهمة من المبيعات": `${p.sharePercent.toFixed(1)}%`,
      }));
      const ws = XLSX.utils.json_to_sheet(dataRows);
      XLSX.utils.book_append_sheet(wb, ws, "مبيعات_الأصناف_والمنتجات");
      safeDownloadWorkbook(wb, `تقرير_مبيعات_الأصناف${dateSuffix}.xlsx`);
    } else if (activeTab === "branches") {
      if (branchReport.rows.length === 0) {
        toast.warning(lang === "ar" ? "لا توجد بيانات فروع لتصديرها" : "No branch data to export");
        return;
      }
      const dataRows = branchReport.rows.map((b, idx) => ({
        "الترتيب": idx + 1,
        "اسم الفرع": lang === "ar" ? b.branchName.ar : b.branchName.en,
        "عدد الورديات": b.shiftsCount,
        "عدد العمليات": b.ordersCount,
        "إجمالي المبيعات (ج.م)": b.totalRevenue,
        "مبيعات الكاش": b.cashSales,
        "مبيعات البطاقات والمحافظ": b.cardSales + b.walletSales,
        "متوسط مبيعات الوردية": Math.round(b.avgShiftRevenue),
        "صافي الفروقات (عجز/زيادة)": b.variance,
        "الحصة من الإجمالي": `${b.sharePercent.toFixed(1)}%`,
      }));
      const ws = XLSX.utils.json_to_sheet(dataRows);
      XLSX.utils.book_append_sheet(wb, ws, "تقرير_أداء_الفروع");
      safeDownloadWorkbook(wb, `تقرير_أداء_الفروع${dateSuffix}.xlsx`);
    }

    toast.success(lang === "ar" ? "تم تصدير ملف الإكسيل بنجاح!" : "Exported to Excel successfully!");
  };

  // Handler: Start New Shift
  const handleStartShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const branch = POS_BRANCHES.find((b) => b.id === newShiftForm.branchId) || POS_BRANCHES[0]!;
    const cashier = POS_BRANCH_CASHIERS.find((c) => c.id === newShiftForm.cashierId) || {
      id: newShiftForm.cashierId,
      branchId: branch.id,
      name: { ar: newShiftForm.cashierName, en: newShiftForm.cashierName },
      code: newShiftForm.cashierCode,
      role: "cashier" as const,
      roleLabel: { ar: "كاشير", en: "Cashier" },
      avatar: "👨‍🍳",
    };

    const openingCash = Number(newShiftForm.startingAmount) || 1000;
    const branchCode = branch.id.slice(0, 4).toUpperCase();
    const shiftNumber = `SHIFT-${branchCode}-${cashier.code}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    try {
      // Insert to Supabase pos_shifts
      const { error: insErr } = await supabase.from("pos_shifts").insert({
        shift_number: shiftNumber,
        branch_id: branch.id,
        cashier_id: cashier.id,
        cashier_name: cashier.name.ar,
        status: "open",
        opening_cash: openingCash,
        opened_at: new Date().toISOString(),
        total_sales: 0,
        cash_sales: 0,
        card_sales: 0,
        wallet_sales: 0,
        orders_count: 0,
      });

      if (insErr) {
        console.error("DB insert error:", insErr);
        toast.error(insErr.message);
        return;
      }

      toast.success(
        lang === "ar"
          ? `تم فتح وردية جديدة بنجاح (${shiftNumber}) للكاشير ${cashier.name.ar}`
          : `Shift opened successfully (${shiftNumber}) for ${cashier.name.en}`
      );
      setShowStartShiftModal(false);
      fetchShiftsData();
    } catch (err) {
      console.error(err);
      toast.error(lang === "ar" ? "فشل فتح الوردية" : "Failed to open shift");
    }
  };

  // Handler: Open Close-Shift Modal
  const handleOpenCloseModal = (shift: PosShiftAdminRecord) => {
    setShiftToClose(shift);
    setCloseFormCountedCash("");
    setCloseFormNotes("");
    setShowCloseShiftModal(true);
  };

  // Handler: Confirm Close Shift
  const handleConfirmCloseShift = async () => {
    if (!shiftToClose) return;
    const rawVal = closeFormCountedCash.trim();
    if (!rawVal || isNaN(Number(rawVal)) || Number(rawVal) < 0) {
      toast.error(lang === "ar" ? "يرجى كتابة النقدية المحصية بالدرج (0 أو أكثر)" : "Please enter counted cash (0 or more)");
      return;
    }

    const actualCash = Number(rawVal);
    const expectedCash = shiftToClose.closingActualAmount;
    const variance = actualCash - expectedCash;
    const status: "balanced" | "surplus" | "shortage" =
      variance === 0 ? "balanced" : variance > 0 ? "surplus" : "shortage";

    setIsSubmittingClose(true);
    try {
      // 1. Audit Log in Supabase
      await supabase.from("audit_log").insert({
        action:
          status === "shortage"
            ? "SHIFT_CLOSE_SHORTAGE"
            : status === "surplus"
            ? "SHIFT_CLOSE_SURPLUS"
            : "SHIFT_CLOSE_BALANCED",
        actor_name: `Admin — Closing ${shiftToClose.cashierName}`,
        entity: "pos_shifts",
        entity_id: shiftToClose.shiftNumber,
        source: "human",
        payload: {
          cashier_id: shiftToClose.cashierId,
          cashier_code: shiftToClose.cashierCode,
          cashier_name: shiftToClose.cashierName,
          branch_id: shiftToClose.branchId,
          branch_name: shiftToClose.branchName.ar,
          opening_cash: shiftToClose.startingAmount,
          cash_sales: shiftToClose.cashSales,
          card_sales: shiftToClose.cardSales,
          wallet_sales: shiftToClose.walletSales,
          total_sales: shiftToClose.totalSales,
          orders_count: shiftToClose.totalEntries,
          expected_cash: expectedCash,
          actual_cash: actualCash,
          variance: variance,
          status: status,
          notes: closeFormNotes || "Admin closed",
          admin_notified: "System Admin",
          closed_at: new Date().toISOString(),
        },
      });

      // 2. Update pos_shifts in Supabase
      await supabase
        .from("pos_shifts")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("shift_number", shiftToClose.shiftNumber);

      toast.success(
        lang === "ar"
          ? `تم إغلاق وردية ${shiftToClose.cashierName} بنجاح واعتماد مطابقة الصندوق`
          : `Shift closed and audited successfully for ${shiftToClose.cashierName}`
      );
      setShowCloseShiftModal(false);
      fetchShiftsData();
    } catch (err) {
      console.error(err);
      toast.error(lang === "ar" ? "فشل إغلاق الوردية" : "Failed to close shift");
    } finally {
      setIsSubmittingClose(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-3xl bg-card border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                <span>{lang === "ar" ? "إدارة وتقارير ورديات الكاشير ونقاط البيع" : "POS Cashier Shifts & Sales Reports"}</span>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {lang === "ar" ? "بيانات حية مباشرة من قاعدة البيانات" : "Live Real DB Data"}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "ar"
                  ? "متابعة العهد الافتتاحية، حركات الصندوق، وتقارير تفصيلية بالساعة، بالمنتجات، وحسب أداء الفروع"
                  : "Audit cash drawers, and generate hourly breakdown, top products, and branch performance reports"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={fetchShiftsData}
            className="p-2.5 rounded-xl border border-border/80 hover:bg-muted text-foreground transition-all cursor-pointer shadow-2xs"
            title={lang === "ar" ? "تحديث البيانات المباشرة" : "Refresh"}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleExportToExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer active:scale-98"
            title={lang === "ar" ? "تصدير التقرير الحالي إلى Excel" : "Export current view to Excel"}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStartShiftModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:opacity-95 text-primary-foreground font-black text-xs transition-all shadow-md cursor-pointer active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === "ar" ? "+ فتح وردية جديدة لكاشير" : "+ Open New Shift"}</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs (Shifts, Hourly, Product, Branch Reports) */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card border border-border/80 shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("shifts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "shifts"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <History className="w-4 h-4" />
          <span>{lang === "ar" ? "جدول الورديات وحركة الصندوق" : "Cashier Shifts & Cash Ledger"}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === "shifts" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
            {filteredShifts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hourly")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "hourly"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{lang === "ar" ? "تقرير المبيعات بالساعة ومعدلات الذروة" : "Hourly Sales & Peak Trading"}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === "hourly" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
            {hourlyReport.rows.length} {lang === "ar" ? "ساعة" : "hrs"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "products"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{lang === "ar" ? "تقرير مبيعات الأصناف والمنتجات" : "Product & Category Sales"}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === "products" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
            {productReport.rows.length} {lang === "ar" ? "صنف" : "items"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("branches")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "branches"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Store className="w-4 h-4" />
          <span>{lang === "ar" ? "تقرير مبيعات وأداء الفروع" : "Branch Sales & Performance"}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === "branches" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
            {branchReport.rows.length} {lang === "ar" ? "فرع" : "branches"}
          </span>
        </button>
      </div>

      {/* 3. Dynamic Key Performance Indicators (KPIs) Tailored to the Selected View */}
      {activeTab === "shifts" && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* KPI 1: Active Open Shifts */}
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
              <span>{lang === "ar" ? "الورديات المفتوحة حالياً" : "Active Open Shifts"}</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {kpis.openShiftsCount}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {lang === "ar" ? `من إجمالي ${kpis.totalShiftsCount}` : `of ${kpis.totalShiftsCount}`}
              </span>
            </div>
          </div>

          {/* KPI 2: Total Starting Amount */}
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block truncate">
              {lang === "ar" ? "إجمالي العهد الافتتاحية" : "Total Starting Floats"}
            </span>
            <span className="text-lg font-black font-mono text-foreground block truncate">
              {money(kpis.totalStartingAmount)}
            </span>
          </div>

          {/* KPI 3: Expected System Cash */}
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block truncate">
              {lang === "ar" ? "النقدية المتوقعة سيستمياً" : "Expected System Cash"}
            </span>
            <span className="text-lg font-black font-mono text-blue-600 dark:text-blue-400 block truncate">
              {money(kpis.totalExpectedClosing)}
            </span>
          </div>

          {/* KPI 4: Cashier Counted Amount */}
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block truncate">
              {lang === "ar" ? "المبالغ المحصلة عند الإغلاق" : "Cashier Counted Amount"}
            </span>
            <span className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 block truncate">
              {money(kpis.totalCountedClosing)}
            </span>
          </div>

          {/* KPI 5: Net Variance */}
          <div
            className={`p-3.5 rounded-2xl border shadow-2xs space-y-1 col-span-2 md:col-span-4 lg:col-span-1 ${
              kpis.netVariance === 0
                ? "bg-card border-border/80"
                : kpis.netVariance > 0
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-rose-500/10 border-rose-500/30"
            }`}
          >
            <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
              <span>{lang === "ar" ? "صافي الفروقات (Ups/Down)" : "Net Variance"}</span>
              {kpis.netVariance > 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              ) : kpis.netVariance < 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </span>
            <span
              className={`text-lg font-black font-mono block truncate ${
                kpis.netVariance === 0
                  ? "text-foreground"
                  : kpis.netVariance > 0
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-rose-700 dark:text-rose-300"
              }`}
            >
              {kpis.netVariance > 0 ? `+${money(kpis.netVariance)}` : money(kpis.netVariance)}
            </span>
          </div>
        </div>
      )}

      {activeTab === "hourly" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block">
              {lang === "ar" ? "إجمالي مبيعات الساعات" : "Total Hourly Sales"}
            </span>
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 block truncate">
              {money(hourlyReport.grandHourlyRevenue)}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block">
              {lang === "ar" ? "إجمالي عدد الفواتير" : "Total Orders"}
            </span>
            <span className="text-xl font-black font-mono text-foreground block">
              {hourlyReport.totalHourlyOrders} {lang === "ar" ? "فاتورة" : "orders"}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === "ar" ? "ساعة الذروة الأولى" : "Peak Hour"}</span>
            </span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 block truncate">
              {hourlyReport.peakHour ? hourlyReport.peakHour.label : "--"}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {hourlyReport.peakHour ? `${money(hourlyReport.peakHour.totalSales)} (${hourlyReport.peakHour.ordersCount} طلب)` : ""}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block">
              {lang === "ar" ? "متوسط مبيعات الساعة" : "Average Hourly Sales"}
            </span>
            <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 block truncate">
              {money(hourlyReport.avgHourlyRevenue)}
            </span>
          </div>
        </div>
      )}

      {activeTab === "products" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block">
              {lang === "ar" ? "إجمالي إيرادات الأصناف" : "Product Revenue"}
            </span>
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 block truncate">
              {money(productReport.grandProductRevenue)}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block">
              {lang === "ar" ? "إجمالي القطع المباعة" : "Total Units Sold"}
            </span>
            <span className="text-xl font-black font-mono text-foreground block">
              {productReport.totalUnitsSold} {lang === "ar" ? "قطعة" : "units"}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === "ar" ? "الصنف الأعلى إيراداً" : "Top Revenue Item"}</span>
            </span>
            <span className="text-sm font-black text-foreground block truncate">
              {productReport.topProduct ? productReport.topProduct.nameAr : "--"}
            </span>
            <span className="text-[10px] text-emerald-600 font-mono font-bold">
              {productReport.topProduct ? `${money(productReport.topProduct.totalRevenue)} (${productReport.topProduct.sharePercent.toFixed(1)}%)` : ""}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block">
              {lang === "ar" ? "الصنف الأكثر طلباً بالكمية" : "Most Sold by Quantity"}
            </span>
            <span className="text-sm font-black text-foreground block truncate">
              {productReport.topByQuantity ? productReport.topByQuantity.nameAr : "--"}
            </span>
            <span className="text-[10px] text-blue-600 font-mono font-bold">
              {productReport.topByQuantity ? `${productReport.topByQuantity.quantity} قطعة مباعة` : ""}
            </span>
          </div>
        </div>
      )}

      {activeTab === "branches" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block">
              {lang === "ar" ? "إجمالي مبيعات الفروع" : "Branches Revenue"}
            </span>
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 block truncate">
              {money(branchReport.grandBranchRevenue)}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block">
              {lang === "ar" ? "عدد الفروع النشطة" : "Active Branches"}
            </span>
            <span className="text-xl font-black font-mono text-foreground block">
              {branchReport.rows.length} {lang === "ar" ? "فروع" : "branches"}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-primary" />
              <span>{lang === "ar" ? "الفرع المتصدر للمبيعات" : "Top Branch"}</span>
            </span>
            <span className="text-sm font-black text-foreground block truncate">
              {branchReport.topBranch ? branchReport.topBranch.branchName.ar : "--"}
            </span>
            <span className="text-[10px] text-emerald-600 font-mono font-bold">
              {branchReport.topBranch ? `${money(branchReport.topBranch.totalRevenue)} (${branchReport.topBranch.sharePercent.toFixed(1)}%)` : ""}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground block">
              {lang === "ar" ? "متوسط إيراد الفرع" : "Avg Branch Revenue"}
            </span>
            <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 block truncate">
              {money(branchReport.avgBranchRevenue)}
            </span>
          </div>
        </div>
      )}

      {/* 4. Filter Bar (Search, Branch, Cashier, Status, and Date Presets) */}
      <div className="p-3.5 rounded-3xl bg-card border border-border/80 shadow-xs space-y-3">
        {/* Row 1: Search & Entity Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "ar" ? "بحث برقم الوردية، الكاشير، الفرع، الفاتورة..." : "Search shift, cashier, order #..."}
              className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-border/80 bg-background font-bold focus:border-primary focus:outline-none"
            />
          </div>

          {/* Branch Filter */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full text-xs font-bold py-2 px-3 pe-8 rounded-xl border border-border/80 bg-background text-foreground focus:outline-none cursor-pointer appearance-none"
            >
              <option value="all">📍 {lang === "ar" ? "كل الفروع" : "All Branches"}</option>
              {branchFilterOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {pick(b.ar, b.en)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>

          {/* Cashier Filter */}
          <div className="relative">
            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="w-full text-xs font-bold py-2 px-3 pe-8 rounded-xl border border-border/80 bg-background text-foreground focus:outline-none cursor-pointer appearance-none"
            >
              <option value="all">👨‍🍳 {lang === "ar" ? "كل الكاشيرات" : "All Cashiers"}</option>
              {cashierOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  👤 {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-bold py-2 px-3 pe-8 rounded-xl border border-border/80 bg-background text-foreground focus:outline-none cursor-pointer appearance-none"
            >
              <option value="all">⚡ {lang === "ar" ? "كل حالات الورديات" : "All Shift Statuses"}</option>
              <option value="open">🟢 {lang === "ar" ? "مفتوحة ونشطة فقط" : "Active Open Shifts"}</option>
              <option value="closed">🔵 {lang === "ar" ? "مغلقة ومطابقة" : "Closed Shifts"}</option>
              <option value="shortage">🚨 {lang === "ar" ? "ورديات بها عجز (Down)" : "Deficit (Down)"}</option>
              <option value="surplus">⚠️ {lang === "ar" ? "ورديات بها زيادة (Up)" : "Surplus (Up)"}</option>
              <option value="balanced">✅ {lang === "ar" ? "ورديات متطابقة تماماً" : "Perfect Balanced"}</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>
        </div>

        {/* Row 2: Date Picker & Quick Presets */}
        <div className="pt-2 border-t border-border/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>{lang === "ar" ? "التاريخ:" : "Date:"}</span>
            </div>

            {/* Presets */}
            <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => handleApplyPreset("today")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  datePreset === "today" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "ar" ? "اليوم" : "Today"}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("yesterday")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  datePreset === "yesterday" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "ar" ? "أمس" : "Yesterday"}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("week")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  datePreset === "week" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "ar" ? "آخر 7 أيام" : "Last 7 Days"}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("month")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  datePreset === "month" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "ar" ? "هذا الشهر" : "This Month"}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("all")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  datePreset === "all" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "ar" ? "كل التواريخ" : "All Dates"}
              </button>
            </div>

            {/* Custom Dates */}
            <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-bold text-muted-foreground">{lang === "ar" ? "من:" : "From:"}</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDatePreset("custom");
                  setDateFrom(e.target.value);
                }}
                className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none"
              />
              <span className="text-[11px] font-bold text-muted-foreground">{lang === "ar" ? "إلى:" : "To:"}</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDatePreset("custom");
                  setDateTo(e.target.value);
                }}
                className="bg-transparent text-foreground text-xs font-mono font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedBranch !== "all" || selectedCashier !== "all" || selectedStatus !== "all" || datePreset !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedBranch("all");
                setSelectedCashier("all");
                setSelectedStatus("all");
                handleApplyPreset("all");
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "إعادة الضبط" : "Reset Filters"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. TAB 1: DAILY SHIFTS TABLE (REAL DATA FROM DB) */}
      {/* ========================================================================= */}
      {activeTab === "shifts" && (
        <div className="bg-card rounded-3xl border border-border/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-foreground">
                {lang === "ar" ? "جدول ورديات الكاشير اليومية وحركة الصندوق" : "Daily Cashier Shifts & Drawer Ledger"}
              </span>
              <span className="text-xs text-muted-foreground">
                ({filteredShifts.length} {lang === "ar" ? "وردية فعلية مسجلة" : "records"})
              </span>
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              {dateFrom ? `${dateFrom}` : ""} {dateTo && dateTo !== dateFrom ? ` ➔ ${dateTo}` : ""}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold">
                  <th className="py-3 px-3 text-start">#</th>
                  <th className="py-3 px-3 text-start">{lang === "ar" ? "الفرع" : "Branch name"}</th>
                  <th className="py-3 px-3 text-start">{lang === "ar" ? "الكاشير" : "Cashier name"}</th>
                  <th className="py-3 px-3 text-start">{lang === "ar" ? "الوردية والتوقيت" : "Shift ID & Time"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "إجمالي العمليات" : "Total entry"}</th>
                  <th className="py-3 px-3 text-end">{lang === "ar" ? "الافتتاحي" : "Starting amount"}</th>
                  <th className="py-3 px-3 text-end bg-blue-500/5 text-blue-800 dark:text-blue-300">
                    {lang === "ar" ? "المحسوب سيستمياً" : "Closing actual amount"}
                  </th>
                  <th className="py-3 px-3 text-end bg-purple-500/5 text-purple-800 dark:text-purple-300">
                    {lang === "ar" ? "المضاف من الكاشير" : "Closing cashier add"}
                  </th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "الفارق" : "Ups / Down"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "الحالة" : "Status"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredShifts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-muted-foreground space-y-2">
                      <History className="w-8 h-8 opacity-30 mx-auto" />
                      <p className="font-bold">{lang === "ar" ? "لا توجد ورديات مطابقة للتصفية" : "No matching shifts found"}</p>
                      <p className="text-[11px] opacity-70">
                        {lang === "ar" ? "يمكنك فتح وردية جديدة أو تغيير نطاق البحث والتاريخ" : "Open a new shift or adjust date filters"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredShifts.map((shift, idx) => {
                    const isClosed = shift.status === "closed";

                    return (
                      <tr key={shift.id} className="hover:bg-muted/30 transition-colors group">
                        {/* Index */}
                        <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">
                          {idx + 1}
                        </td>

                        {/* 1. Branch Name */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base p-1 bg-muted/60 rounded-lg shrink-0">📍</span>
                            <span className="font-black text-foreground text-xs leading-snug">
                              {pick(shift.branchName.ar, shift.branchName.en)}
                            </span>
                          </div>
                        </td>

                        {/* 2. Cashier Name */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base p-1 bg-muted/60 rounded-lg">👨‍🍳</span>
                            <div>
                              <span className="font-black text-foreground block">
                                {shift.cashierName}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                كود: {shift.cashierCode}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Shift ID & Timestamps */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-black text-xs text-foreground" title={shift.shiftNumber}>
                                {formatShortShiftId(shift.shiftNumber)}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded-md border border-border/40 shrink-0">
                                📅 {formatShiftDate(shift.openedAt || shift.dateStr, lang)}
                              </span>
                            </div>

                            <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 font-medium whitespace-nowrap">
                              <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                              <span>{formatShiftTime(shift.openedAt, lang)}</span>
                              <span className="text-muted-foreground/50">➔</span>
                              <span>
                                {shift.closedAt ? (
                                  formatShiftTime(shift.closedAt, lang)
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    {lang === "ar" ? "مستمرة" : "Active"}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Total Entry */}
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {shift.totalEntries} {lang === "ar" ? "طلب" : "orders"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                            {money(shift.totalSales)}
                          </span>
                        </td>

                        {/* 4. Starting Amount */}
                        <td className="py-3 px-3 text-end font-mono font-bold text-foreground">
                          {money(shift.startingAmount)}
                        </td>

                        {/* 5. Closing Actual Amount (System Expected Cash) */}
                        <td className="py-3 px-3 text-end font-mono font-black text-blue-700 dark:text-blue-300 bg-blue-500/5">
                          {money(shift.closingActualAmount)}
                          <span className="text-[9px] text-muted-foreground block font-normal">
                            (+{money(shift.cashSales)} كاش)
                          </span>
                        </td>

                        {/* 6. Closing Cashier Add Amount */}
                        <td className="py-3 px-3 text-end font-mono font-black bg-purple-500/5">
                          {shift.closingCashierAddAmount !== null ? (
                            <span className="text-purple-700 dark:text-purple-300 text-xs">
                              {money(shift.closingCashierAddAmount)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-normal italic">
                              {lang === "ar" ? "قيد العمل..." : "In Progress..."}
                            </span>
                          )}
                        </td>

                        {/* 7. Ups / Down (Variance) */}
                        <td className="py-3 px-3 text-center">
                          {shift.variance !== null ? (
                            shift.variance === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-black border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>0.00</span>
                              </span>
                            ) : shift.variance > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[11px] font-black border border-amber-500/40">
                                <ArrowUpRight className="w-3 h-3 text-amber-600" />
                                <span>+{money(shift.variance)}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 font-mono text-[11px] font-black border border-rose-500/40">
                                <ArrowDownRight className="w-3 h-3 text-rose-600" />
                                <span>{money(shift.variance)}</span>
                              </span>
                            )
                          ) : (
                            <span className="text-muted-foreground text-xs font-mono font-normal">
                              --
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          {isClosed ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px] font-black border border-blue-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{lang === "ar" ? "مغلقة" : "Closed"}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-500/30 inline-flex items-center gap-1.5">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              <span>{lang === "ar" ? "نشطة" : "Active"}</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isClosed ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCloseModal(shift)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                title={lang === "ar" ? "إغلاق الوردية واعتماد الجرد" : "Close shift & audit"}
                              >
                                <Lock className="w-3 h-3" />
                                <span>{lang === "ar" ? "إغلاق" : "Close"}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedShiftForDetails(shift);
                                  setShowDetailsModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                title={lang === "ar" ? "معاينة تقرير الإغلاق Z-Report" : "View Z-Report"}
                              >
                                <Eye className="w-3 h-3" />
                                <span>{lang === "ar" ? "Z-Report" : "Report"}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB 2: HOURLY SALES & PEAK REPORT */}
      {/* ========================================================================= */}
      {activeTab === "hourly" && (
        <div className="bg-card rounded-3xl border border-border/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-foreground">
                {lang === "ar" ? "تقرير المبيعات بالساعة ومعدلات الذروة (Hourly Sales Report)" : "Hourly Sales & Peak Analysis"}
              </span>
              <span className="text-xs text-muted-foreground">
                ({hourlyReport.rows.length} {lang === "ar" ? "ساعة نشطة" : "hours"})
              </span>
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {lang === "ar" ? "مرتبة حسب أعلى ساعات تحقيقاً للإيراد" : "Ranked by highest revenue hours"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold">
                  <th className="py-3 px-3 text-start">#</th>
                  <th className="py-3 px-3 text-start">{lang === "ar" ? "نطاق الساعة" : "Hour Slot"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "عدد الفواتير" : "Orders Count"}</th>
                  <th className="py-3 px-3 text-end">{lang === "ar" ? "إجمالي المبيعات" : "Total Revenue"}</th>
                  <th className="py-3 px-3 text-end">{lang === "ar" ? "مبيعات الكاش" : "Cash Sales"}</th>
                  <th className="py-3 px-3 text-end">{lang === "ar" ? "فيزا ومحافظ" : "Card & Wallet"}</th>
                  <th className="py-3 px-3 text-end">{lang === "ar" ? "متوسط الفاتورة" : "Avg Ticket"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "نسبة المساهمة" : "% Share"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "حالة النشاط" : "Activity Level"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {hourlyReport.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground space-y-2">
                      <Clock className="w-8 h-8 opacity-30 mx-auto" />
                      <p className="font-bold">{lang === "ar" ? "لا توجد فواتير ومبيعات في النطاق المحدد" : "No hourly sales in selected filter"}</p>
                    </td>
                  </tr>
                ) : (
                  hourlyReport.rows.map((row, idx) => (
                    <tr key={row.hour} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-black text-foreground font-mono">{row.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-foreground">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {row.ordersCount} {lang === "ar" ? "طلب" : "orders"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-end font-mono font-black text-emerald-700 dark:text-emerald-300">
                        {money(row.totalSales)}
                      </td>
                      <td className="py-3 px-3 text-end font-mono text-foreground font-bold">
                        {money(row.cashSales)}
                      </td>
                      <td className="py-3 px-3 text-end font-mono text-blue-600 font-bold">
                        {money(row.cardSales + row.walletSales)}
                      </td>
                      <td className="py-3 px-3 text-end font-mono text-muted-foreground">
                        {money(Math.round(row.avgTicket))}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-foreground">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-primary" style={{ width: `${Math.min(100, row.sharePercent)}%` }}></div>
                          </div>
                          <span className="text-[11px]">{row.sharePercent.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {row.isPeak ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-[10px] border border-amber-500/30">
                            <Flame className="w-3 h-3 text-amber-500" />
                            <span>{lang === "ar" ? "ذروة قصوى 🔥" : "Peak Hour 🔥"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold text-[10px]">
                            <span>{lang === "ar" ? "نشط" : "Active"}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB 3: PRODUCT SALES REPORT */}
      {/* ========================================================================= */}
      {activeTab === "products" && (
        <div className="bg-card rounded-3xl border border-border/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-foreground">
                {lang === "ar" ? "تقرير مبيعات الأصناف والمنتجات الأكثر طلباً" : "Product Sales & Best Sellers"}
              </span>
              <span className="text-xs text-muted-foreground">
                ({productReport.rows.length} {lang === "ar" ? "صنف مسجل" : "items"})
              </span>
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {lang === "ar" ? "مرتبة تنازلياً حسب إجمالي الإيرادات" : "Ranked by revenue"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold">
                  <th className="py-3 px-3 text-start">{lang === "ar" ? "الترتيب" : "Rank"}</th>
                  <th className="py-3 px-3 text-start">{lang === "ar" ? "اسم الصنف والمنتج" : "Product Name"}</th>
                  <th className="py-3 px-3 text-start">{lang === "ar" ? "كود الصنف (SKU)" : "SKU"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "الكمية المباعة" : "Qty Sold"}</th>
                  <th className="py-3 px-3 text-end">{lang === "ar" ? "متوسط السعر" : "Avg Unit Price"}</th>
                  <th className="py-3 px-3 text-end">{lang === "ar" ? "إجمالي الإيرادات" : "Total Revenue"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "تكرار الطلب" : "Orders Count"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "نسبة المساهمة" : "% Share"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {productReport.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground space-y-2">
                      <ShoppingBag className="w-8 h-8 opacity-30 mx-auto" />
                      <p className="font-bold">{lang === "ar" ? "لا توجد مبيعات أصناف في النطاق المحدد" : "No product sales in selected filter"}</p>
                    </td>
                  </tr>
                ) : (
                  productReport.rows.map((prod, idx) => {
                    const isTop3 = idx < 3;
                    return (
                      <tr key={prod.sku + idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 font-mono font-black text-[11px]">
                          {idx === 0 ? (
                            <span className="p-1 px-2 rounded-lg bg-amber-500/15 text-amber-600 border border-amber-500/30">🥇 1</span>
                          ) : idx === 1 ? (
                            <span className="p-1 px-2 rounded-lg bg-slate-400/15 text-slate-600 border border-slate-400/30">🥈 2</span>
                          ) : idx === 2 ? (
                            <span className="p-1 px-2 rounded-lg bg-orange-500/15 text-orange-600 border border-orange-500/30">🥉 3</span>
                          ) : (
                            <span className="text-muted-foreground">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base p-1 bg-muted/60 rounded-lg">🍰</span>
                            <div>
                              <span className="font-black text-foreground block text-xs">{prod.nameAr}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{prod.nameEn}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground font-bold">
                          {prod.sku}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                            {prod.quantity} {lang === "ar" ? "قطعة" : "units"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-end font-mono font-bold text-foreground">
                          {money(Math.round(prod.avgPrice))}
                        </td>
                        <td className="py-3 px-3 text-end font-mono font-black text-emerald-700 dark:text-emerald-300">
                          {money(prod.totalRevenue)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-muted-foreground">
                          {prod.ordersCount} {lang === "ar" ? "مرة" : "times"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-14 h-2 bg-muted rounded-full overflow-hidden shrink-0">
                              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, prod.sharePercent)}%` }}></div>
                            </div>
                            <span className="font-mono font-bold text-[11px] text-foreground">{prod.sharePercent.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TAB 4: BRANCH SALES & PERFORMANCE REPORT */}
      {/* ========================================================================= */}
      {activeTab === "branches" && (
        <div className="bg-card rounded-3xl border border-border/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-foreground">
                {lang === "ar" ? "تقرير مبيعات وأداء الفروع (Branch Performance Report)" : "Branch Performance & Sales Report"}
              </span>
              <span className="text-xs text-muted-foreground">
                ({branchReport.rows.length} {lang === "ar" ? "فرع مسجل" : "branches"})
              </span>
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {lang === "ar" ? "مقارنة المبيعات وحركات الورديات لكل فرع" : "Revenue and drawer breakdown per branch"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold">
                  <th className="py-3 px-3 text-start">{lang === "ar" ? "الترتيب" : "Rank"}</th>
                  <th className="py-3 px-3 text-start">{lang === "ar" ? "اسم الفرع" : "Branch Name"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "الورديات" : "Shifts"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "العمليات" : "Orders"}</th>
                  <th className="py-3 px-3 text-end">{lang === "ar" ? "إجمالي المبيعات" : "Total Sales"}</th>
                  <th className="py-3 px-3 text-end">{lang === "ar" ? "مبيعات الكاش" : "Cash Sales"}</th>
                  <th className="py-3 px-3 text-end">{lang === "ar" ? "بطاقات ومحافظ" : "Card & Wallet"}</th>
                  <th className="py-3 px-3 text-end">{lang === "ar" ? "متوسط الوردية" : "Avg Shift"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "فروقات الصندوق" : "Variance (Ups/Down)"}</th>
                  <th className="py-3 px-3 text-center">{lang === "ar" ? "الحصة السوقية" : "Share"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {branchReport.rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground space-y-2">
                      <Store className="w-8 h-8 opacity-30 mx-auto" />
                      <p className="font-bold">{lang === "ar" ? "لا توجد مبيعات فروع في النطاق المحدد" : "No branch sales in selected filter"}</p>
                    </td>
                  </tr>
                ) : (
                  branchReport.rows.map((b, idx) => (
                    <tr key={b.branchId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-black text-[11px]">
                        {idx === 0 ? (
                          <span className="p-1 px-2 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">🏆 1</span>
                        ) : (
                          <span className="text-muted-foreground">{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base p-1 bg-muted/60 rounded-lg">📍</span>
                          <span className="font-black text-foreground text-xs">
                            {pick(b.branchName.ar, b.branchName.en)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-foreground">
                        {b.shiftsCount} {lang === "ar" ? "وردية" : "shifts"}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-primary">
                        {b.ordersCount} {lang === "ar" ? "طلب" : "orders"}
                      </td>
                      <td className="py-3 px-3 text-end font-mono font-black text-emerald-700 dark:text-emerald-300">
                        {money(b.totalRevenue)}
                      </td>
                      <td className="py-3 px-3 text-end font-mono font-bold text-foreground">
                        {money(b.cashSales)}
                      </td>
                      <td className="py-3 px-3 text-end font-mono font-bold text-blue-600">
                        {money(b.cardSales + b.walletSales)}
                      </td>
                      <td className="py-3 px-3 text-end font-mono text-muted-foreground">
                        {money(Math.round(b.avgShiftRevenue))}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {b.variance === 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold">
                            0.00
                          </span>
                        ) : b.variance > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[11px] font-bold">
                            +{money(b.variance)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 font-mono text-[11px] font-bold">
                            {money(b.variance)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-14 h-2 bg-muted rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-primary" style={{ width: `${Math.min(100, b.sharePercent)}%` }}></div>
                          </div>
                          <span className="font-mono font-bold text-[11px] text-foreground">{b.sharePercent.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: START NEW SHIFT */}
      {/* ========================================================================= */}
      {showStartShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm">
                  {lang === "ar" ? "بدء وردية جديدة لكاشير" : "Start New Shift for Cashier"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStartShiftModal(false)}
                className="hover:opacity-80 p-1 text-primary-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartShiftSubmit} className="p-4 space-y-3.5 text-xs">
              {/* Select Branch */}
              <div>
                <label className="font-bold text-foreground block mb-1">
                  {lang === "ar" ? "فرع نقطة البيع:" : "Terminal Branch:"}
                </label>
                <select
                  value={newShiftForm.branchId}
                  onChange={(e) => {
                    const brId = e.target.value;
                    const matchedCashier = POS_BRANCH_CASHIERS.find((c) => c.branchId === brId) || POS_BRANCH_CASHIERS[0]!;
                    setNewShiftForm({
                      ...newShiftForm,
                      branchId: brId,
                      cashierId: matchedCashier.id,
                      cashierName: matchedCashier.name.ar,
                      cashierCode: matchedCashier.code,
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-border/80 bg-background font-bold text-xs"
                >
                  {POS_BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {pick(b.ar, b.en)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Cashier */}
              <div>
                <label className="font-bold text-foreground block mb-1">
                  {lang === "ar" ? "الكاشير المسؤول:" : "Assigned Cashier:"}
                </label>
                <select
                  value={newShiftForm.cashierId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const found = POS_BRANCH_CASHIERS.find((c) => c.id === cid);
                    if (found) {
                      setNewShiftForm({
                        ...newShiftForm,
                        cashierId: found.id,
                        cashierName: found.name.ar,
                        cashierCode: found.code,
                      });
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-border/80 bg-background font-bold text-xs"
                >
                  {POS_BRANCH_CASHIERS.filter((c) => c.branchId === newShiftForm.branchId).map((c) => (
                    <option key={c.id} value={c.id}>
                      👨‍🍳 {c.name.ar} (كود {c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Starting Amount (Float) */}
              <div>
                <label className="font-bold text-foreground block mb-1 flex items-center justify-between">
                  <span>{lang === "ar" ? "العهدة النقدية الافتتاحية (Starting Amount):" : "Starting Cash Float:"}</span>
                  <span className="text-[10px] text-muted-foreground font-mono font-normal">
                    {currencySymbol}
                  </span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={newShiftForm.startingAmount}
                  onChange={(e) => setNewShiftForm({ ...newShiftForm, startingAmount: e.target.value })}
                  placeholder="1000"
                  className="w-full p-2.5 rounded-xl border border-border/80 bg-background font-mono font-black text-sm"
                />
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
                {lang === "ar"
                  ? "💡 سيتم تسجيل الوردية مباشرة في قاعدة البيانات وربطها بالفرع والكاشير المختارين."
                  : "💡 Shift record will be inserted directly into database and linked to terminal."}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStartShiftModal(false)}
                  className="flex-1 py-2 rounded-xl border border-border/80 text-foreground font-bold hover:bg-muted"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-black shadow-sm hover:opacity-95 cursor-pointer"
                >
                  {lang === "ar" ? "تأكيد وبدء الوردية" : "Start Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL: CLOSE SHIFT & RECONCILE (ADMIN AUDIT) */}
      {/* ========================================================================= */}
      {showCloseShiftModal && shiftToClose && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm">
                    {lang === "ar" ? "إغلاق الوردية واعتماد الجرد" : "Close Shift & Audit Cash"}
                  </h3>
                  <p className="text-[10px] opacity-80 font-mono">
                    {shiftToClose.shiftNumber} • {shiftToClose.cashierName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseShiftModal(false)}
                className="hover:opacity-80 p-1 text-primary-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/70 text-center">
                  <span className="text-[10px] text-muted-foreground block">{lang === "ar" ? "الافتتاحي" : "Starting"}</span>
                  <span className="font-mono font-bold text-foreground">{money(shiftToClose.startingAmount)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/70 text-center">
                  <span className="text-[10px] text-muted-foreground block">{lang === "ar" ? "مبيعات الكاش" : "Cash Sales"}</span>
                  <span className="font-mono font-bold text-emerald-600">+{money(shiftToClose.cashSales)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold block">{lang === "ar" ? "الفعلي سيستمياً" : "Expected Cash"}</span>
                  <span className="font-mono font-black text-blue-700 dark:text-blue-300">{money(shiftToClose.closingActualAmount)}</span>
                </div>
              </div>

              {/* Input: Counted Cash */}
              <div>
                <label className="font-black text-foreground block mb-1">
                  {lang === "ar" ? "المبلغ المضاف من الكاشير / النقدية المحصية بالدرج *" : "Closing Counted Cash on Hand *"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    value={closeFormCountedCash}
                    onChange={(e) => setCloseFormCountedCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xl font-mono font-black py-2.5 ps-3 pe-16 rounded-xl bg-muted/20 border-2 border-primary/40 focus:border-primary focus:outline-none"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground font-mono">
                    {currencySymbol}
                  </span>
                </div>
              </div>

              {/* Live Variance Calculation (Ups / Down Preview) */}
              {closeFormCountedCash.trim() !== "" && !isNaN(Number(closeFormCountedCash)) && (
                (() => {
                  const actual = Number(closeFormCountedCash);
                  const expected = shiftToClose.closingActualAmount;
                  const diff = actual - expected;

                  return (
                    <div
                      className={`p-3 rounded-2xl border flex items-center justify-between font-bold ${
                        diff === 0
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200"
                          : diff > 0
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200"
                          : "bg-rose-500/15 border-rose-500/40 text-rose-800 dark:text-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {diff === 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : diff > 0 ? (
                          <ArrowUpRight className="w-4 h-4 text-amber-600" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-rose-600" />
                        )}
                        <span>
                          {diff === 0
                            ? lang === "ar" ? "الصندوق متطابق تماماً بدون أي فارق" : "Drawer Balanced (0.00)"
                            : diff > 0
                            ? lang === "ar" ? "يوجد زيادة بالصندوق (Surplus / Up):" : "Cash Surplus (Up):"
                            : lang === "ar" ? "يوجد عجز بالصندوق (Deficit / Down):" : "Cash Deficit (Down):"}
                        </span>
                      </div>
                      <span className="font-mono text-base font-black">
                        {diff > 0 ? `+${money(diff)}` : money(diff)}
                      </span>
                    </div>
                  );
                })()
              )}

              {/* Notes */}
              <div>
                <label className="font-bold text-muted-foreground block mb-1">
                  {lang === "ar" ? "ملاحظات وتفاصيل المطابقة:" : "Audit Notes:"}
                </label>
                <textarea
                  rows={2}
                  value={closeFormNotes}
                  onChange={(e) => setCloseFormNotes(e.target.value)}
                  placeholder={lang === "ar" ? "أي ملاحظات تخص الجرد أو أسباب الفارق..." : "Optional audit notes..."}
                  className="w-full p-2 rounded-xl border border-border/80 bg-background text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="flex-1 py-2 rounded-xl border border-border/80 text-foreground font-bold hover:bg-muted"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingClose}
                  onClick={handleConfirmCloseShift}
                  className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-black shadow-sm hover:opacity-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingClose
                    ? lang === "ar" ? "جاري الإغلاق..." : "Closing..."
                    : lang === "ar" ? "تأكيد إغلاق الوردية" : "Confirm Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. MODAL: VIEW SHIFT DETAILS / Z-REPORT */}
      {/* ========================================================================= */}
      {showDetailsModal && selectedShiftForDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                <h3 className="font-bold text-sm">
                  {lang === "ar" ? "تقرير الوردية النهائي (Z-Report)" : "Shift Z-Report Summary"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="hover:opacity-80 p-1 text-primary-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-muted/20 border border-dashed border-border/80 space-y-2.5 font-mono">
                <div className="text-center pb-2 border-b border-border/60">
                  <h4 className="font-black text-sm text-foreground">
                    {pick(selectedShiftForDetails.branchName.ar, selectedShiftForDetails.branchName.en)}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">{selectedShiftForDetails.shiftNumber}</p>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "الكاشير:" : "Cashier:"}</span>
                  <span className="font-bold text-foreground">{selectedShiftForDetails.cashierName} ({selectedShiftForDetails.cashierCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "التاريخ:" : "Date:"}</span>
                  <span className="font-bold">{formatShiftDate(selectedShiftForDetails.openedAt || selectedShiftForDetails.dateStr, lang)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "التوقيت:" : "Time:"}</span>
                  <span>
                    {formatShiftTime(selectedShiftForDetails.openedAt, lang)} ➔{" "}
                    {selectedShiftForDetails.closedAt
                      ? formatShiftTime(selectedShiftForDetails.closedAt, lang)
                      : (lang === "ar" ? "مستمرة" : "Active")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "عدد الفواتير:" : "Total Orders:"}</span>
                  <span className="font-bold">{selectedShiftForDetails.totalEntries}</span>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-1">
                  <div className="flex justify-between">
                    <span>{lang === "ar" ? "العهدة الافتتاحية:" : "Opening Float:"}</span>
                    <span>{money(selectedShiftForDetails.startingAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>{lang === "ar" ? "مبيعات الكاش:" : "Cash Sales:"}</span>
                    <span>+{money(selectedShiftForDetails.cashSales)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>{lang === "ar" ? "مبيعات الفيزا:" : "Card POS:"}</span>
                    <span>{money(selectedShiftForDetails.cardSales)}</span>
                  </div>
                  <div className="flex justify-between font-black text-foreground pt-1 border-t border-border/40">
                    <span>{lang === "ar" ? "المتوقع بالدرج سيستمياً:" : "Expected Cash in Drawer:"}</span>
                    <span>{money(selectedShiftForDetails.closingActualAmount)}</span>
                  </div>
                  <div className="flex justify-between font-black text-purple-600">
                    <span>{lang === "ar" ? "المحصي فعلياً من الكاشير:" : "Cashier Counted Amount:"}</span>
                    <span>
                      {selectedShiftForDetails.closingCashierAddAmount !== null
                        ? money(selectedShiftForDetails.closingCashierAddAmount)
                        : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between font-black pt-1 border-t border-border/40">
                    <span>{lang === "ar" ? "الفارق (Ups/Down):" : "Variance:"}</span>
                    <span
                      className={
                        selectedShiftForDetails.variance === 0
                          ? "text-emerald-600"
                          : (selectedShiftForDetails.variance || 0) > 0
                          ? "text-amber-600"
                          : "text-rose-600"
                      }
                    >
                      {selectedShiftForDetails.variance !== null
                        ? selectedShiftForDetails.variance > 0
                          ? `+${money(selectedShiftForDetails.variance)}`
                          : money(selectedShiftForDetails.variance)
                        : "--"}
                    </span>
                  </div>
                </div>

                {selectedShiftForDetails.notes && (
                  <div className="pt-2 border-t border-border/60 text-[10px] text-muted-foreground">
                    <span className="font-bold text-foreground me-1">{lang === "ar" ? "ملاحظات:" : "Notes:"}</span>
                    {selectedShiftForDetails.notes}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 py-2 rounded-xl border border-border/80 text-foreground font-bold hover:bg-muted"
                >
                  {lang === "ar" ? "إغلاق" : "Close"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.success(
                      lang === "ar"
                        ? `تمت طباعة تقرير الوردية (${selectedShiftForDetails.shiftNumber}) بنجاح`
                        : `Shift report printed (${selectedShiftForDetails.shiftNumber})`
                    );
                    setShowDetailsModal(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-black shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{lang === "ar" ? "طباعة Z-Report" : "Print"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
