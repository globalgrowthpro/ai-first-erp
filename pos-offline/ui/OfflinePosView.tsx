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
import { OFFLINE_SEED_PRODUCTS } from "../db/seed-offline-data";
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
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
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
  const [loginUsername, setLoginUsername] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeCashierName, setActiveCashierName] = useState<string>("كاشير نقطة البيع (أحمد سالم)");
  const [activeCashierRole, setActiveCashierRole] = useState<string>("كاشير رئيسي");

  // Catalog & Cart State
  const [categories, setCategories] = useState<OfflineCategoryRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [products, setProducts] = useState<OfflineProductRecord[]>(OFFLINE_SEED_PRODUCTS);
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

  // Cashier Authentication Handling (EXACT CREDENTIALS FROM ONLINE POS & ERP: src/lib/auth-store.ts)
  const registeredAccounts = [
    // 1. Primary Online POS Cashier (POS_CASHIER_CREDENTIALS)
    {
      username: "cashier",
      code: "100",
      aliases: ["cashier@wazeer-elhelw.com", "pos_cashier", "كاشير", "100"],
      passwords: ["Pos@123456", "123456", "Pos@2026"],
      name: "كاشير نقطة البيع (أحمد سالم)",
      role: "كاشير رئيسي",
    },
    // 2. Online Administrator (ADMIN_ACCOUNT_CREDENTIALS)
    {
      username: "wazeerAdmin",
      code: "999",
      aliases: ["wazeeradmin", "admin", "wazeeradmin@erp.org", "hafez@wazeer-elhelw.com", "مدير", "999"],
      passwords: ["#786$Wazeri", "Admin@2026", "123456", "0000"],
      name: "أدمين وزير الحلو (مسؤول النظام)",
      role: "مسؤول النظام",
    },
    // 3. Official Branch Cashiers Registry (All 15 Branches from BRANCH_CASHIERS_REGISTRY)
    {
      username: "cashier_korba",
      code: "101",
      aliases: ["cashier.korba@wazeer-elhelw.com", "korba", "101", "أحمد سالم"],
      passwords: ["Korba@2026", "Pos@123456", "101", "123456"],
      name: "أحمد سالم (الكوربة)",
      role: "كاشير رئيسي",
    },
    {
      username: "cashier_abbas",
      code: "102",
      aliases: ["cashier.abbas@wazeer-elhelw.com", "abbas", "102", "محمد فتحي"],
      passwords: ["Abbas@2026", "Pos@123456", "102", "123456"],
      name: "محمد فتحي (عباس العقاد)",
      role: "كاشير صالة",
    },
    {
      username: "cashier_helmeya",
      code: "103",
      aliases: ["cashier.helmeya@wazeer-elhelw.com", "helmeya", "103"],
      passwords: ["Helmeya@2026", "Pos@123456", "103"],
      name: "خالد سعيد (الحلمية)",
      role: "كاشير تيك أواي",
    },
    {
      username: "cashier_khosoos",
      code: "104",
      aliases: ["cashier.khosoos@wazeer-elhelw.com", "khosoos", "104"],
      passwords: ["Khosoos@2026", "Pos@123456", "104"],
      name: "محمود بدوي (الخصوص)",
      role: "كاشير",
    },
    {
      username: "cashier_downtown",
      code: "105",
      aliases: ["cashier.downtown@wazeer-elhelw.com", "downtown", "105"],
      passwords: ["Balad@2026", "Pos@123456", "105"],
      name: "أشرف عثمان (وسط البلد)",
      role: "كاشير",
    },
    {
      username: "cashier_giza",
      code: "106",
      aliases: ["cashier.giza@wazeer-elhelw.com", "giza", "106"],
      passwords: ["Giza@2026", "Pos@123456", "106"],
      name: "حسام حسن (الجيزة)",
      role: "كاشير",
    },
    {
      username: "cashier_faisal",
      code: "107",
      aliases: ["cashier.faisal@wazeer-elhelw.com", "faisal", "107"],
      passwords: ["Faisal@2026", "Pos@123456", "107"],
      name: "عادل رمزي (فيصل)",
      role: "كاشير",
    },
    {
      username: "cashier_darsalam",
      code: "108",
      aliases: ["cashier.darsalam@wazeer-elhelw.com", "darsalam", "108"],
      passwords: ["Salam@2026", "Pos@123456", "108"],
      name: "كرم عبد العظيم (دار السلام)",
      role: "كاشير",
    },
    {
      username: "cashier_october",
      code: "109",
      aliases: ["cashier.october@wazeer-elhelw.com", "october", "109"],
      passwords: ["October@2026", "Pos@123456", "109"],
      name: "أيمن الشاذلي (حدائق أكتوبر)",
      role: "كاشير",
    },
    {
      username: "cashier_ahram",
      code: "110",
      aliases: ["cashier.ahram@wazeer-elhelw.com", "ahram", "110"],
      passwords: ["Ahram@2026", "Pos@123456", "110"],
      name: "ياسر مصطفى (حدائق الأهرام)",
      role: "كاشير",
    },
    {
      username: "cashier_hosary",
      code: "111",
      aliases: ["cashier.hosary@wazeer-elhelw.com", "hosary", "111"],
      passwords: ["Hosary@2026", "Pos@123456", "111"],
      name: "عمرو شريف (الحصري)",
      role: "كاشير",
    },
    {
      username: "cashier_zayed",
      code: "112",
      aliases: ["cashier.zayed@wazeer-elhelw.com", "sheikh_zayed", "112"],
      passwords: ["Zayed@2026", "Pos@123456", "112"],
      name: "عمر الدسوقي (الشيخ زايد)",
      role: "كاشير",
    },
    {
      username: "cashier_mansoura",
      code: "113",
      aliases: ["cashier.mansoura@wazeer-elhelw.com", "mansoura", "113"],
      passwords: ["Mansoura@2026", "Pos@123456", "113"],
      name: "سامح التابعي (المنصورة)",
      role: "كاشير",
    },
    {
      username: "cashier_banha",
      code: "114",
      aliases: ["cashier.banha@wazeer-elhelw.com", "banha", "114"],
      passwords: ["Banha@2026", "Pos@123456", "114"],
      name: "نبيل شكري (بنها)",
      role: "كاشير",
    },
    {
      username: "cashier_tenth",
      code: "115",
      aliases: ["cashier.tenth@wazeer-elhelw.com", "tenth", "115"],
      passwords: ["Tenth@2026", "Pos@123456", "115"],
      name: "طارق سليم (العاشر من رمضان)",
      role: "كاشير",
    },
  ];

  const handleCashierLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const u = loginUsername.trim().toLowerCase();
    const p = loginPassword.trim();

    if (!u) {
      setLoginError("يرجى إدخال اسم المستخدم أو كود الكاشير");
      return;
    }
    if (!p) {
      setLoginError("يرجى إدخال كلمة المرور");
      return;
    }

    const matched = registeredAccounts.find(
      (acc) =>
        acc.username.toLowerCase() === u ||
        acc.code === u ||
        acc.aliases.some((al) => al.toLowerCase() === u)
    );

    if (!matched) {
      setLoginError("اسم المستخدم أو كود الكاشير غير مسجل في النظام!");
      return;
    }

    if (matched.passwords.includes(p)) {
      setActiveCashierName(matched.name);
      setActiveCashierRole(matched.role);
      setIsTerminalLocked(false);
      setLoginError(null);
      setLoginPassword("");
    } else {
      setLoginError("كلمة المرور غير صحيحة! يرجى التأكد وإعادة المحاولة.");
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
    { id: "عشاق الرز", ar: "عشاق الرز", icon: "🍲" },
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
            </div>

            <form onSubmit={handleCashierLogin} className="p-6 space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center justify-between">
                  <span>اسم المستخدم أو البريد الإلكتروني:</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Username / Email</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => {
                      setLoginUsername(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder="أدخل اسم المستخدم أو البريد..."
                    className="w-full text-xs font-bold py-2.5 px-3 ps-9 rounded-xl border border-border bg-muted/40 text-foreground focus:outline-none focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 transition"
                  />
                  <User className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center justify-between">
                  <span>كلمة المرور:</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder="••••••••"
                    className="w-full text-xs font-bold py-2.5 px-3 ps-9 pe-9 rounded-xl border border-border bg-muted/40 text-foreground focus:outline-none focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 transition font-mono"
                  />
                  <Lock className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="إظهار / إخفاء كلمة المرور"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#92003c] text-primary-foreground font-black text-sm shadow-md active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>تسجيل الدخول وفتح نقطة البيع</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </form>
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
          <div className="flex items-center justify-between gap-2 pb-2 relative z-30 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none flex-1 min-w-0">
              {defaultCategories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm font-black"
                        : "bg-card border border-border/80 text-foreground hover:bg-muted font-bold"
                    }`}
                  >
                    <span>{cat.ar}</span>
                    <span className="text-xs">{cat.icon}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsMoreCatOpen(!isMoreCatOpen)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-card border border-border/80 text-foreground hover:bg-muted cursor-pointer"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isMoreCatOpen ? "rotate-180" : ""
                  }`}
                />
                <span>أقسام أخرى ({dropdownCategories.length})</span>
                <span className="text-xs">📁</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
              {filteredProducts.map((prod) => {
                const cartQty = cart.find((c) => c.sku === prod.sku)?.quantity || 0;
                const isSelected = cartQty > 0;

                return (
                  <div
                    key={prod.sku}
                    onClick={() => addToCart(prod)}
                    className={`group relative bg-card rounded-3xl border transition-all duration-200 select-none overflow-hidden cursor-pointer active:scale-98 p-3 flex flex-col justify-between ${
                      isSelected
                        ? "border-primary ring-1 ring-primary/30 shadow-md"
                        : "border-border/80 hover:border-border shadow-2xs"
                    }`}
                  >
                    {/* Photo Container */}
                    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-muted/50 mb-3 border border-border/40">
                      <img
                        src={prod.imageUrl || `/products/${prod.sku.toLowerCase()}.jpg`}
                        alt={prod.nameAr}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/products/rice-pistachio.jpg";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10 pointer-events-none" />

                      {/* Top Right: SKU */}
                      <span className="absolute top-2.5 start-2.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/60 text-white shadow-xs pointer-events-none">
                        {prod.sku}
                      </span>

                      {/* Bottom Right: Stock */}
                      <span className="absolute bottom-2.5 start-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs pointer-events-none">
                        رصيد: {prod.stock}
                      </span>

                      {/* Top Left: Quantity in Cart */}
                      {cartQty > 0 && (
                        <span className="absolute top-2.5 end-2.5 size-6 rounded-full bg-primary text-primary-foreground font-mono text-xs font-black shadow-md ring-2 ring-background flex items-center justify-center">
                          {cartQty}
                        </span>
                      )}
                    </div>

                    {/* Product Name & Category */}
                    <div className="mb-2 text-start">
                      <h4
                        className={`text-sm font-black transition-colors leading-tight line-clamp-1 ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {prod.nameAr}
                      </h4>
                      <span className="text-xs text-muted-foreground mt-1 block truncate">
                        {prod.categoryNameAr}
                      </span>
                    </div>

                    {/* Bottom Row: Price on Right, Circular Plus Button on Left */}
                    <div className="flex items-center justify-between pt-2.5 mt-auto">
                      <span className="text-base font-black text-foreground font-mono">
                        {prod.price.toFixed(2)} ج.م
                      </span>

                      <div
                        className={`size-7 rounded-full flex items-center justify-center font-bold text-sm shadow-2xs transition-all active:scale-90 ${
                          isSelected
                            ? "bg-primary text-primary-foreground hover:opacity-95"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        +
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
