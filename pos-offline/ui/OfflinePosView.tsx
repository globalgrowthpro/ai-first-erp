/**
 * Hafez ERP — Complete Standalone Offline POS Terminal Interface
 * Visually & ergonomically 100% IDENTICAL to the Online POS Terminal (src/routes/pos.tsx)
 * Features real internet status heartbeat probing + mandatory Cashier PIN login gate.
 */

import React, { useState, useEffect, useRef } from "react";
import { offlinePosEngine } from "../engine/offline-pos-engine";
import { networkMonitor, type NetworkHealth } from "../engine/network-monitor";
import {
  type OfflineProductRecord,
  type OfflineCategoryRecord,
  type OfflineShiftRecord,
  type OfflineCashierAuth,
} from "../db/pos-local-db";
import { OfflinePosBanner } from "./OfflinePosBanner";
import { OfflineSyncModal } from "./OfflineSyncModal";
import { OfflineTerminalSetup } from "./OfflineTerminalSetup";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  X,
  CreditCard,
  Receipt,
  Printer,
  Pause,
  Maximize2,
  Minimize2,
  ChevronDown,
  User,
  MapPin,
  Clock,
  QrCode,
  Utensils,
  ShoppingBag,
  Bike,
  Lock,
  Settings,
} from "lucide-react";

interface CartLineItem {
  sku: string;
  nameAr: string;
  nameEn?: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  maxStock: number;
  image?: string;
}

export const OfflinePosView: React.FC = () => {
  // Cashier Authentication State (LOCKED BY DEFAULT FOR SECURITY)
  const [isTerminalLocked, setIsTerminalLocked] = useState<boolean>(true);
  const [enteredPin, setEnteredPin] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [selectedCashierCode, setSelectedCashierCode] = useState<string>("101");
  const [activeCashierName, setActiveCashierName] = useState<string>("أحمد سالم");
  const [activeCashierRole, setActiveCashierRole] = useState<string>("كاشير رئيسي");

  // Catalog & Cart State
  const [categories, setCategories] = useState<OfflineCategoryRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [products, setProducts] = useState<OfflineProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartLineItem[]>([
    {
      sku: "OM-ALI-01",
      nameAr: "طاجن أم علي مكسرات",
      category: "الطواجن",
      unitPrice: 110,
      quantity: 2,
      totalPrice: 220,
      maxStock: 42,
      image: "/products/om-ali.jpg",
    },
    {
      sku: "KASHT-PIST-01",
      nameAr: "قشطوطة بستاشيو فاخر",
      category: "القشطوطة",
      unitPrice: 90,
      quantity: 1,
      totalPrice: 90,
      maxStock: 28,
      image: "/products/kashtouta-pistachio.jpg",
    },
  ]);
  const [orderType, setOrderType] = useState<"takeaway" | "dine_in" | "delivery">("takeaway");
  const [orderPlatform, setOrderPlatform] = useState<string>("direct");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [applyVat, setApplyVat] = useState<boolean>(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [tenderAmount, setTenderAmount] = useState<number>(310);
  const [isMoreCatOpen, setIsMoreCatOpen] = useState<boolean>(false);
  const [activeShift, setActiveShift] = useState<OfflineShiftRecord | null>(null);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [lastReceiptNumber, setLastReceiptNumber] = useState<string>("INV-KB-1059");
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [isKioskMode, setIsKioskMode] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize offline engine & catalog
  const loadCatalog = async () => {
    await offlinePosEngine.initialize();
    const cats = await offlinePosEngine.getCategories();
    setCategories(cats);
    const prods = await offlinePosEngine.getProducts(selectedCategory);
    setProducts(prods);
    const shift = await offlinePosEngine.getActiveShift();
    setActiveShift(shift);
  };

  useEffect(() => {
    loadCatalog();
    const unsub = offlinePosEngine.subscribe(() => {
      offlinePosEngine.getProducts(selectedCategory).then(setProducts);
      offlinePosEngine.getActiveShift().then(setActiveShift);
    });
    return unsub;
  }, [selectedCategory]);

  // Cashier Authentication Handling
  const handlePinDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      setPinError(null);
      if (next.length === 3 || next.length === 4) {
        verifyPinAttempt(next, selectedCashierCode);
      }
    }
  };

  const handlePinDelete = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
      setPinError(null);
    }
  };

  const handlePinClear = () => {
    setEnteredPin("");
    setPinError(null);
  };

  const verifyPinAttempt = (pin: string, code: string) => {
    // Valid standard test PINs
    const validPins: Record<string, string[]> = {
      "101": ["101", "1234"],
      "102": ["102", "1234"],
      "103": ["103", "1234"],
      "999": ["999", "0000"],
    };

    const allowed = validPins[code] || ["1234"];
    if (allowed.includes(pin)) {
      setIsTerminalLocked(false);
      setPinError(null);
      setEnteredPin("");
      if (code === "101") {
        setActiveCashierName("أحمد سالم");
        setActiveCashierRole("كاشير رئيسي");
      } else if (code === "102") {
        setActiveCashierName("محمد فتحي");
        setActiveCashierRole("كاشير صالة");
      } else if (code === "103") {
        setActiveCashierName("خالد سعيد");
        setActiveCashierRole("كاشير تيك أواي");
      } else {
        setActiveCashierName("المشرف العام");
        setActiveCashierRole("مشرف الفرع");
      }
    } else if (pin.length >= 3) {
      setPinError("رمز المرور غير صحيح! يرجى المحاولة مرة أخرى.");
      setEnteredPin("");
    }
  };

  // Cart operations
  const addToCart = (prod: OfflineProductRecord) => {
    if (isTerminalLocked || prod.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((i) => i.sku === prod.sku);
      if (existing) {
        if (existing.quantity >= prod.stock) return prev;
        return prev.map((i) =>
          i.sku === prod.sku
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      return [
        ...prev,
        {
          sku: prod.sku,
          nameAr: prod.nameAr,
          nameEn: prod.nameEn,
          category: prod.categoryNameAr,
          unitPrice: prod.price,
          quantity: 1,
          totalPrice: prod.price,
          maxStock: prod.stock,
          image: prod.imageUrl || `/products/${prod.sku.toLowerCase()}.jpg`,
        },
      ];
    });
  };

  const updateQuantity = (sku: string, delta: number) => {
    if (isTerminalLocked) return;
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.sku !== sku) return i;
          const nextQty = i.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > i.maxStock) return i;
          return { ...i, quantity: nextQty, totalPrice: nextQty * i.unitPrice };
        })
        .filter(Boolean) as CartLineItem[]
    );
  };

  const removeItem = (sku: string) => {
    if (isTerminalLocked) return;
    setCart((prev) => prev.filter((i) => i.sku !== sku));
  };

  const clearCart = () => {
    if (isTerminalLocked) return;
    setCart([]);
  };

  // Totals calculations
  const subtotal = cart.reduce((sum, i) => sum + i.totalPrice, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const vatAmount = applyVat ? (subtotal - discountAmount) * 0.14 : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + vatAmount);

  useEffect(() => {
    setTenderAmount(finalTotal);
  }, [finalTotal]);

  // Checkout handling
  const handleCheckout = async () => {
    if (isTerminalLocked || cart.length === 0 || isCheckingOut) return;
    setIsCheckingOut(true);

    try {
      const order = await offlinePosEngine.createOfflineOrder({
        items: cart.map((i) => ({
          sku: i.sku,
          nameAr: i.nameAr,
          nameEn: i.nameEn,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          totalPrice: i.totalPrice,
        })),
        orderType,
        paymentMethod: paymentMethod as "cash" | "card" | "wallet" | "voucher",
        tenderAmount,
        discountAmount,
        cashierName: activeCashierName,
      });

      setLastReceiptNumber(order.orderNumber);
      setShowReceiptModal(true);
      clearCart();
    } catch (err) {
      console.error("[Checkout error]:", err);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.nameAr.includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q))
    );
  });

  const termCfg = offlinePosEngine.getTerminalConfig();

  const defaultCategories = [
    { id: "all", ar: "الكل", icon: "✨" },
    { id: "عشاق الرز", ar: "عشاق الرز", icon: "🥣" },
    { id: "الفتة", ar: "الفتة الملكية", icon: "🍨" },
    { id: "دنيا الدلع", ar: "دنيا الدلع والمدلعة", icon: "🍯" },
    { id: "الطواجن", ar: "طواجن ساخنة", icon: "🍲" },
  ];

  const dropdownCategories = [
    { id: "كيك وتشييز", ar: "كيك وتشيز كيك", icon: "🍰" },
    { id: "كشري الحلو", ar: "كشري الحلو الملكي", icon: "🍧" },
    { id: "القشطوطة", ar: "القشطوطة الأصلية", icon: "🍮" },
    { id: "علب الهدايا", ar: "علب هدايا وبوكسات", icon: "🎁" },
    { id: "شاورما الوزير", ar: "شاورما الحلو", icon: "🌯" },
    { id: "مشروبات وإضافات", ar: "مشروبات وإضافات", icon: "🥤" },
  ];

  return (
    <div
      dir="rtl"
      className={`h-screen flex flex-col bg-background select-none font-sans overflow-hidden ${
        isKioskMode ? "fixed inset-0 z-50 p-2 bg-background" : ""
      }`}
    >
      {/* ========================================================================= */}
      {/* 0. MANDATORY CASHIER PIN AUTHENTICATION GATE (LOCK SCREEN)                */}
      {/* ========================================================================= */}
      {isTerminalLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 flex flex-col">
            <div className="bg-gradient-to-r from-primary to-[#92003c] text-primary-foreground p-5 text-center">
              <div className="size-16 mx-auto bg-white rounded-2xl p-2 shadow-lg mb-2 flex items-center justify-center">
                <img
                  src="/pos-offline/wazeer-logo.png"
                  alt="وزير الحلو"
                  className="h-9 w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/wazeer-logo.png";
                  }}
                />
              </div>
              <h2 className="font-black text-lg">سلسلة حلويات وزير الحلو</h2>
              <p className="text-xs opacity-90 font-medium">تسجيل دخول الكاشير وفتح الوردية</p>
              <span className="inline-block mt-1 text-[10px] bg-black/30 px-2.5 py-0.5 rounded-full font-mono text-white/80">
                {termCfg.branchNameAr || "فرع الكوربة"} — المحطة: REG-01
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">اختر الكاشير المسؤول:</label>
                <div className="relative">
                  <select
                    value={selectedCashierCode}
                    onChange={(e) => {
                      setSelectedCashierCode(e.target.value);
                      setEnteredPin("");
                      setPinError(null);
                    }}
                    className="w-full text-xs font-bold py-2.5 px-3 pe-8 rounded-xl border border-border bg-muted/40 text-foreground appearance-none focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="101">👨‍🍳 أحمد سالم (كود: 101 — كاشير رئيسي)</option>
                    <option value="102">👨‍🍳 محمد فتحي (كود: 102 — كاشير صالة)</option>
                    <option value="103">👨‍🍳 خالد سعيد (كود: 103 — كاشير تيك أواي)</option>
                    <option value="999">👨‍💼 المشرف العام (كود: 999 — مدير فرع)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <label className="block text-xs font-bold text-muted-foreground">أدخل رمز المرور السري (PIN):</label>
                <div className="flex justify-center items-center gap-3 py-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`size-4 rounded-full border-2 transition-all ${
                        idx < enteredPin.length
                          ? "border-primary bg-primary scale-110 shadow-xs"
                          : "border-border bg-transparent"
                      }`}
                    />
                  ))}
                </div>
                {pinError && <p className="text-rose-600 font-bold text-xs">{pinError}</p>}
              </div>

              {/* Touch PIN Pad */}
              <div className="grid grid-cols-3 gap-2 pt-1 max-w-[260px] mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinDigit(num)}
                    className="h-11 rounded-xl bg-muted hover:bg-muted/80 active:scale-95 text-base font-mono font-black text-foreground transition shadow-2xs"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinClear}
                  className="h-11 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-xs font-bold text-rose-600 transition shadow-2xs"
                >
                  مسح
                </button>
                <button
                  type="button"
                  onClick={() => handlePinDigit("0")}
                  className="h-11 rounded-xl bg-muted hover:bg-muted/80 active:scale-95 text-base font-mono font-black text-foreground transition shadow-2xs"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinDelete}
                  className="h-11 rounded-xl bg-muted hover:bg-muted/80 active:scale-95 text-xs font-bold text-foreground transition shadow-2xs"
                >
                  ⌫
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => verifyPinAttempt(enteredPin, selectedCashierCode)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#92003c] text-primary-foreground font-black text-sm shadow-md active:scale-98 transition"
                >
                  دخول وفتح نقطة البيع
                </button>
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                  💡 رمز المرور الافتراضي: <strong className="font-mono text-primary">101</strong> أو{" "}
                  <strong className="font-mono text-primary">1234</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PROFESSIONAL UNIFIED TERMINAL TOOLBAR                                 */}
      {/* ========================================================================= */}
      <header className="h-16 bg-card/90 backdrop-blur-xl border-b border-border/80 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 shadow-xs select-none shrink-0 z-40">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="h-10 px-2.5 py-1 rounded-xl bg-white dark:bg-card border border-border/70 shadow-2xs flex items-center justify-center shrink-0">
              <img
                src="/pos-offline/wazeer-logo.png"
                alt="وزير الحلو"
                className="h-7 w-auto max-w-[120px] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/wazeer-logo.png";
                }}
              />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-foreground tracking-tight">وزير الحلو</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground font-black tracking-wider shadow-2xs">
                  POS
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">REG-01 • v2.6</span>
            </div>
          </div>

          <div className="h-6 w-px bg-border/60 hidden md:block shrink-0" />

          <div
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/40 text-foreground text-xs font-semibold shrink-0"
            title="الفرع المخصص لنقطة البيع (مقفل على المحطة)"
          >
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate max-w-[200px] text-xs font-bold">
              {termCfg.branchNameAr || "فرع الكوربة — مصر الجديدة"}
            </span>
            <Lock className="w-3 h-3 text-muted-foreground opacity-50 ms-0.5 shrink-0" />
          </div>
        </div>

        {/* Center: Operational Actions Dock */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/50 p-1 rounded-2xl border border-border/70 shadow-2xs shrink-0">
          {/* Active Cashier Pill with Lock Screen trigger */}
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-card border border-border/60 text-foreground text-xs font-bold shadow-2xs h-10 select-none">
            <span className="text-base p-0.5 bg-muted/40 rounded-lg shrink-0">👨‍🍳</span>
            <div className="text-start leading-tight hidden sm:block">
              <span className="font-bold text-xs text-foreground block truncate max-w-[110px]">
                {activeCashierName}
              </span>
              <span className="text-[9px] text-muted-foreground font-medium block truncate max-w-[110px]">
                {activeCashierRole}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTerminalLocked(true)}
              className="ms-1 p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-rose-600 transition"
              title="قفل المحطة (Lock Screen)"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Shift Status Pill */}
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-muted/80 border border-border/60 text-foreground text-xs font-bold transition-all shadow-2xs cursor-pointer h-10 group"
            title="تقرير الوردية وحركة الصندوق"
          >
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 group-hover:rotate-12 transition-transform" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">الوردية</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-500/30 flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>نشطة</span>
              </span>
            </div>
          </button>

          {/* My Orders Button */}
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-muted/80 border border-border/60 text-foreground text-xs font-bold transition-all shadow-2xs cursor-pointer h-10 group"
            title="سجل طلباتي"
          >
            <Receipt className="w-3.5 h-3.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-xs hidden sm:inline">طلباتي</span>
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary/10 text-primary font-mono text-[10px] font-black border border-primary/20 flex items-center justify-center">
              14
            </span>
          </button>

          {/* Parked Tickets Button */}
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-muted/80 border border-border/60 text-muted-foreground hover:text-foreground text-xs font-bold transition-all shadow-2xs cursor-pointer h-10"
            title="الفواتير المعلقة"
          >
            <Pause className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs hidden sm:inline">المعلقات</span>
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-muted text-muted-foreground font-mono text-[10px] font-black flex items-center justify-center">
              0
            </span>
          </button>
        </div>

        {/* Right / End: Inventory, Outbox Sync Status, Fullscreen & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-bold transition-all shadow-2xs h-10 cursor-pointer"
            title="لوحة المزامنة وقائمة الفواتير المحلية"
          >
            <span className="size-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs hidden sm:inline">المزامنة:</span>
            <span className="font-mono text-xs font-black text-foreground bg-muted px-1.5 py-0.5 rounded-md">
              14 فواتير
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowSetupModal(true)}
            className="size-10 rounded-xl border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-2xs flex items-center justify-center cursor-pointer"
            title="إعدادات الطابعة والدرج والباركود"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsKioskMode((prev) => !prev)}
            className="size-10 rounded-xl border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-2xs flex items-center justify-center cursor-pointer"
            title={isKioskMode ? "الخروج من ملء الشاشة" : "وضع ملء الشاشة"}
          >
            {isKioskMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsTerminalLocked(true)}
            className="size-10 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
            title="قفل المحطة"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. REAL-TIME INTERNET DETECTION DYNAMIC BANNER                            */}
      {/* ========================================================================= */}
      <OfflinePosBanner onOpenSyncModal={() => setShowSyncModal(true)} />

      {/* ========================================================================= */}
      {/* 3. MAIN TERMINAL VIEWPORT (IDENTICAL SPLIT LAYOUT TO ONLINE POS)          */}
      {/* ========================================================================= */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden min-h-0">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 min-h-0 h-full overflow-hidden">
          <div className="bg-card rounded-2xl border border-border/70 p-2.5 flex items-center gap-2 shadow-xs shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الصنف، النكهة، أو امسح الباركود مباشرة (F3)..."
                className="w-full ps-9 pe-9 py-2 text-xs font-semibold rounded-xl border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/60 border border-border/60 text-[11px] font-mono font-bold text-muted-foreground shrink-0">
              <QrCode className="w-3.5 h-3.5 text-primary" />
              <span>BARCODE SCAN READY</span>
            </div>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1.5 pb-1 relative z-30 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1 min-w-0">
              {defaultCategories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md scale-102"
                        : "bg-card border border-border/70 text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-sm">{cat.icon}</span>
                    <span>{cat.ar}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsMoreCatOpen(!isMoreCatOpen)}
                className="px-3 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-card border border-border/70 text-foreground hover:bg-muted"
              >
                <span className="text-sm">📂</span>
                <span>أقسام أخرى ({dropdownCategories.length})</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isMoreCatOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isMoreCatOpen && (
                <div className="absolute z-50 top-full mt-2 end-0 min-w-56 p-1.5 bg-card/95 backdrop-blur-md rounded-2xl border border-border/80 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/50 flex items-center justify-between">
                    <span>بقية الأقسام</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono font-bold">
                      {dropdownCategories.length}
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-0.5 p-0.5">
                    {dropdownCategories.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setIsMoreCatOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-start flex items-center justify-between gap-2 transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-black shadow-xs"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{cat.icon}</span>
                            <span className="truncate">{cat.ar}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-2.5 pb-4">
              {filteredProducts.map((prod) => {
                const cartQty = cart.find((c) => c.sku === prod.sku)?.quantity || 0;

                return (
                  <div
                    key={prod.sku}
                    onClick={() => addToCart(prod)}
                    className="group relative bg-card rounded-2xl border border-border/80 p-2.5 flex flex-col justify-between transition-all duration-200 select-none overflow-hidden hover:border-primary/60 hover:shadow-xl active:scale-98 cursor-pointer"
                  >
                    <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-muted/50 mb-2 border border-border/40">
                      <img
                        src={prod.imageUrl || `/products/${prod.sku.toLowerCase()}.jpg`}
                        alt={prod.nameAr}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-108"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/products/rice-pistachio.jpg";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                      <div className="absolute top-1.5 inset-x-1.5 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white/90 truncate shadow-xs">
                          {prod.sku}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs text-white bg-amber-500">
                          الأكثر طلباً
                        </span>
                      </div>

                      <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-xs text-white font-bold shadow-xs">
                          رصيد: {prod.stock}
                        </span>

                        {cartQty > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-mono text-xs font-black shadow-md ring-2 ring-background">
                            {cartQty}×
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-2">
                      <h4 className="text-xs sm:text-sm font-black text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
                        {prod.nameAr}
                      </h4>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                        {prod.categoryNameAr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                      <span className="text-sm sm:text-base font-black text-foreground font-mono">
                        {prod.price.toFixed(2)} ج.م
                      </span>

                      <div className="flex items-center gap-1">
                        <span className="p-1.5 rounded-xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground text-foreground transition-colors shadow-xs">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT COLUMN: ACTIVE ORDER TICKET & TOTALS                            */}
        {/* ===================================================================== */}
        <div className="lg:col-span-5 xl:col-span-4 bg-card rounded-3xl border border-border/80 shadow-xl flex flex-col min-h-0 h-full overflow-hidden">
          <div className="p-2 sm:p-2.5 border-b border-border/70 space-y-1.5 bg-muted/20 shrink-0">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/70 text-xs font-bold text-foreground flex-1 min-w-0 shadow-2xs">
                <User className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="truncate leading-tight flex-1 min-w-0">
                  <span className="truncate block font-bold text-[11px] text-foreground">
                    عميل نقدي سريع
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono block">
                    Walk-in Customer
                  </span>
                </div>
                <span className="text-[10px] text-primary shrink-0 font-medium cursor-pointer">
                  تغيير
                </span>
              </div>

              <div className="flex items-center bg-muted/70 p-0.5 rounded-xl border border-border/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setOrderType("takeaway")}
                  className={`px-2 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                    orderType === "takeaway"
                      ? "bg-[#0f2744] text-white shadow-xs font-black dark:bg-blue-800 dark:text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShoppingBag className="w-3 h-3 text-amber-500" />
                  <span className="hidden sm:inline">سفري</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("dine_in")}
                  className={`px-2 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                    orderType === "dine_in"
                      ? "bg-[#0f2744] text-white shadow-xs font-black dark:bg-blue-800 dark:text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Utensils className="w-3 h-3 text-primary" />
                  <span className="hidden sm:inline">صالة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("delivery")}
                  className={`px-2 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                    orderType === "delivery"
                      ? "bg-[#0f2744] text-white shadow-xs font-black dark:bg-blue-800 dark:text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Bike className="w-3 h-3 text-emerald-600" />
                  <span className="hidden sm:inline">توصيل</span>
                </button>
              </div>

              <div className="relative shrink-0">
                <select
                  value={orderPlatform}
                  onChange={(e) => setOrderPlatform(e.target.value)}
                  className="text-[11px] font-bold py-1 px-2 pe-6 rounded-xl border border-border/70 bg-card text-foreground appearance-none focus:outline-none cursor-pointer shadow-2xs"
                >
                  <option value="direct">🏪 مباشر</option>
                  <option value="talabat">🛵 طلبات</option>
                  <option value="waffarha">🎟️ وفرها</option>
                  <option value="elmenus">🍔 المنيوز</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute end-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
              </div>
            </div>
          </div>

          <div className="px-2.5 py-1.5 bg-muted/40 border-b border-border/60 flex items-center justify-between gap-2 shrink-0 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-foreground">
                {cart.length} أصناف
                <span className="text-[10px] text-muted-foreground ms-1">
                  ({cart.reduce((sum, item) => sum + item.quantity, 0)} قطعة)
                </span>
              </span>
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-rose-600 hover:bg-rose-500/10 border border-rose-500/30 transition shadow-2xs cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>مسح السلة</span>
              </button>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>تفريغ عند الخمول: معطّل</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2.5 space-y-1.5">
            {cart.map((item) => (
              <div
                key={item.sku}
                className="p-2 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition-all flex items-center justify-between gap-2 shadow-2xs group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <img
                    src={item.image || "/products/rice-pistachio.jpg"}
                    alt={item.nameAr}
                    className="w-9 h-9 rounded-xl object-cover shrink-0 border border-border/70 shadow-xs"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/wazeer-emblem.png";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black text-foreground block leading-tight truncate">
                      {item.nameAr}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate font-mono">
                      <span>{item.unitPrice.toFixed(2)} ج.م</span>
                      <span>•</span>
                      <span>المتاح: {item.maxStock}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl border border-border/60">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.sku, -1)}
                      className="w-5 h-5 rounded-lg bg-card text-foreground hover:bg-muted flex items-center justify-center font-black cursor-pointer shadow-2xs"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-bold text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.sku, 1)}
                      className="w-5 h-5 rounded-lg bg-card text-foreground hover:bg-muted flex items-center justify-center font-black cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="w-16 text-end">
                    <span className="text-xs font-black text-[#16A34A] dark:text-emerald-400 block font-mono">
                      {item.totalPrice.toFixed(2)} ج.م
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.sku)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 stroke-[1.2] opacity-30 mb-2" />
                <p className="text-xs font-bold text-foreground">الفاتورة فارغة حالياً</p>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  اختر من قائمة الأصناف لإضافتها مباشرة
                </span>
              </div>
            )}
          </div>

          {/* Docked Checkout Panel */}
          <div className="p-2.5 sm:p-3 border-t border-border/70 bg-card/90 space-y-2 shrink-0 shadow-lg">
            <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  الفرعي: <strong className="font-mono text-foreground">{subtotal.toFixed(2)} ج.م</strong>
                </span>
                {discountAmount > 0 && (
                  <span className="text-rose-600 font-bold">
                    خصم (%{discountPercent}):{" "}
                    <strong className="font-mono">-{discountAmount.toFixed(2)} ج.م</strong>
                  </span>
                )}
                {applyVat && (
                  <span>
                    ضريبة 14%:{" "}
                    <strong className="font-mono text-foreground">+{vatAmount.toFixed(2)} ج.م</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setDiscountPercent((prev) => (prev === 0 ? 10 : prev === 10 ? 20 : 0))}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                    discountPercent > 0
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-600"
                      : "bg-muted/50 border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  %{discountPercent > 0 ? discountPercent : "خصم"}
                </button>

                <button
                  type="button"
                  onClick={() => setApplyVat((prev) => !prev)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                    applyVat
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                      : "bg-muted/40 border-border/70 text-muted-foreground opacity-75 hover:opacity-100"
                  }`}
                >
                  {applyVat ? "ضريبة 14%" : "بدون ضريبة"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`py-1 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  paymentMethod === "cash"
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-black shadow-xs ring-1 ring-emerald-500/30"
                    : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>💵</span>
                <span className="text-[10px] truncate">كاش (F4)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`py-1 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  paymentMethod === "card"
                    ? "bg-blue-500/15 border-blue-500/50 text-blue-800 dark:text-blue-300 font-black shadow-xs ring-1 ring-blue-500/30"
                    : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>💳</span>
                <span className="text-[10px] truncate">فيزا (F5)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("wallet")}
                className={`py-1 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  paymentMethod === "wallet"
                    ? "bg-purple-500/15 border-purple-500/50 text-purple-800 dark:text-purple-300 font-black shadow-xs ring-1 ring-purple-500/30"
                    : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>📱</span>
                <span className="text-[10px] truncate">محفظة (F6)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("voucher")}
                className={`py-1 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  paymentMethod === "voucher"
                    ? "bg-rose-500/15 border-rose-500/50 text-rose-800 dark:text-rose-300 font-black shadow-xs ring-1 ring-rose-500/30"
                    : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>🎟️</span>
                <span className="text-[10px] truncate">وفرها (F7)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSyncModal(true)}
                className="py-1 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-dashed border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <span>⋯</span>
                <span className="text-[10px]">المزيد</span>
              </button>
            </div>

            {paymentMethod === "cash" && finalTotal > 0 && (
              <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground">المستلم:</span>
                  <input
                    type="number"
                    value={tenderAmount || ""}
                    onChange={(e) => setTenderAmount(Number(e.target.value))}
                    className="w-18 px-1.5 py-0.5 text-xs text-center font-mono font-bold rounded-lg border border-emerald-500/40 bg-background text-foreground"
                  />
                  <span className="text-[9px] text-muted-foreground">ج.م</span>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTenderAmount(finalTotal)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-background border hover:bg-muted"
                  >
                    بالضبط
                  </button>
                  {[50, 100, 200, 500].map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setTenderAmount(b >= finalTotal ? b : finalTotal + b)}
                      className="px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-background border hover:bg-muted"
                    >
                      +{b}
                    </button>
                  ))}
                </div>

                <div className="text-end shrink-0">
                  <span className="text-[9px] text-muted-foreground block leading-none">الباقي:</span>
                  <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400">
                    {Math.max(0, (tenderAmount || finalTotal) - finalTotal).toFixed(2)} ج.م
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-stretch gap-2 pt-0.5">
              <div className="px-3 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-600/10 to-teal-500/15 border border-emerald-500/30 flex flex-col justify-center min-w-[130px] shrink-0">
                <span className="text-[9px] font-black uppercase text-emerald-800 dark:text-emerald-300 block leading-tight">
                  الإجمالي الصافي
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight leading-none">
                    {finalTotal.toFixed(2)} ج.م
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground leading-tight">
                  {cart.reduce((s, i) => s + i.quantity, 0)} قطع / عبوات
                </span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                className="px-2.5 py-2 rounded-2xl border border-border/80 bg-card hover:bg-muted text-foreground text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all disabled:opacity-40 cursor-pointer shrink-0 shadow-2xs"
                title="تعليق الطلب الحالي (F2)"
              >
                <Pause className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[9px]">تعليق (F2)</span>
              </button>

              <button
                type="button"
                disabled={cart.length === 0 || isCheckingOut}
                onClick={handleCheckout}
                className="flex-1 py-2 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <span className="text-base shrink-0">💵</span>
                <span className="truncate">
                  {isCheckingOut ? "جاري الحفظ والطباعة..." : "سداد وطباعة (F1)"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS & DIALOGS                                                       */}
      {/* ========================================================================= */}
      {showSyncModal && (
        <OfflineSyncModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
        />
      )}

      {showSetupModal && (
        <OfflineTerminalSetup
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
        />
      )}

      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                <span className="font-black text-xs">إيصال سداد — وزير الحلو</span>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-primary-foreground/80 hover:text-primary-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white text-slate-900 font-mono text-xs leading-relaxed overflow-y-auto space-y-2 select-text">
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-center mb-1">
                  <img
                    src="/pos-offline/wazeer-logo.png"
                    alt="وزير الحلو"
                    className="h-10 w-auto object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/wazeer-logo.png";
                    }}
                  />
                </div>
                <h2 className="font-bold text-sm">سلسلة حلويات وزير الحلو</h2>
                <p className="text-[10px] text-slate-500">شركة وزير الحلو للحلويات والمواد الغذائية ش.م.م</p>
                <p className="text-[10px] font-bold text-slate-700">
                  {termCfg.branchNameAr || "فرع الكوربة — مصر الجديدة"}
                </p>
                <p className="text-[9px] text-slate-500 font-mono">س.ت: 489201 • ب.ض: 512-884-910</p>
              </div>

              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 py-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم الفاتورة:</span>
                  <strong className="font-mono">{lastReceiptNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">التاريخ والوقت:</span>
                  <span className="font-mono">{new Date().toLocaleString("en-US", { hour12: false })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الكاشير:</span>
                  <span>{activeCashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">نوع الطلب:</span>
                  <span>{orderType === "takeaway" ? "سفري" : orderType === "dine_in" ? "صالة" : "توصيل"}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">شكراً لزيارتكم وزير الحلو — أصل الحلاوة المصرية!</p>
                <p>خدمة العملاء: 19999 • الخط الساخن</p>
              </div>
            </div>

            <div className="p-3 bg-muted/40 border-t border-border/70 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-1.5 rounded-xl border border-border/70 bg-card text-foreground text-xs font-bold hover:bg-muted"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة بون فوري</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
