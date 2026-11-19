/**
 * Hafez ERP — Complete Standalone Offline POS Terminal Interface
 * Self-contained POS Cashier workstation that operates 100% locally
 * without requiring any connection to remote servers.
 */

import React, { useState, useEffect } from "react";
import { offlinePosEngine } from "../engine/offline-pos-engine";
import {
  type OfflineProductRecord,
  type OfflineCategoryRecord,
  type OfflineShiftRecord,
} from "../db/pos-local-db";
import { OfflinePosBanner } from "./OfflinePosBanner";
import { OfflineSyncModal } from "./OfflineSyncModal";
import { OfflineTerminalSetup } from "./OfflineTerminalSetup";
import {
  Search,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Layers,
  Settings,
  Clock,
  Printer,
  Sparkles,
  Barcode,
} from "lucide-react";

interface CartItem {
  sku: string;
  nameAr: string;
  nameEn?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  maxStock: number;
}

export const OfflinePosView: React.FC = () => {
  const [categories, setCategories] = useState<OfflineCategoryRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [products, setProducts] = useState<OfflineProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeShift, setActiveShift] = useState<OfflineShiftRecord | null>(null);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  // Initialize engine and load local catalog
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

  // Cart operations
  const addToCart = (prod: OfflineProductRecord) => {
    if (prod.stock <= 0) return;

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
          unitPrice: prod.price,
          quantity: 1,
          totalPrice: prod.price,
          maxStock: prod.stock,
        },
      ];
    });
  };

  const updateQuantity = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.sku !== sku) return i;
          const nextQty = i.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > i.maxStock) return i;
          return { ...i, quantity: nextQty, totalPrice: nextQty * i.unitPrice };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, i) => sum + i.totalPrice, 0);
  const vatAmount = Math.round((subtotal - subtotal / 1.14) * 100) / 100;
  const total = subtotal;

  const handleCheckout = async (paymentMethod: "cash" | "card") => {
    if (cart.length === 0 || isCheckingOut) return;
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
        orderType: "takeaway",
        paymentMethod,
        tenderAmount: total,
      });

      setLastOrderNumber(order.orderNumber);
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 select-none font-sans" dir="rtl">
      {/* 1. Offline & Sync Status Banner */}
      <div className="p-3 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <OfflinePosBanner onOpenSyncModal={() => setShowSyncModal(true)} />
        </div>
      </div>

      {/* 2. Terminal Info Strip */}
      <div className="bg-slate-950 border-b border-slate-800/80 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-slate-400">
          <div className="flex items-center gap-3">
            <span className="font-bold text-amber-400">{termCfg.branchNameAr}</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono">{termCfg.terminalId}</span>
            <span className="text-slate-600">•</span>
            <span>الكاشير: <strong className="text-white">{activeShift?.cashierName || "أحمد سالم"}</strong></span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-emerald-400" />
              <span>مبيعات الوردية: <strong className="font-mono text-emerald-400">{activeShift?.totalSales || 0} ج.م</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Printer className="size-3.5 text-emerald-400" />
              <span>طباعة بونات صامتة (نشطة)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Cashier Viewport: Catalog (Right) + Cart (Left) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Right Section: Catalog & Search (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو الباركود أو الصنف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pr-9 pl-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowSetupModal(true)}
              className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="إعدادات العتاد والفرع"
            >
              <Settings className="size-4" />
            </button>
          </div>

          {/* Categories Horizontal Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-xl shrink-0 transition cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-850"
              }`}
            >
              كافة الأصناف ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-4 py-2 rounded-xl shrink-0 transition cursor-pointer ${
                  selectedCategory === c.id
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-850"
                }`}
              >
                {c.nameAr}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 overflow-y-auto max-h-[calc(100vh-270px)] pr-0.5">
            {filteredProducts.map((p) => {
              const inCart = cart.find((i) => i.sku === p.sku);
              return (
                <div
                  key={p.sku}
                  onClick={() => addToCart(p)}
                  className={`bg-slate-900 border p-3 rounded-2xl cursor-pointer transition flex flex-col justify-between group ${
                    inCart ? "border-amber-500/80 ring-1 ring-amber-500/30" : "border-slate-800 hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                        p.stock > 10
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      مخزون: {p.stock}
                    </span>
                    <span className="font-mono font-bold text-amber-400 text-xs">{p.price} ج.م</span>
                  </div>

                  <div className="my-2.5">
                    <h3 className="font-bold text-xs text-white group-hover:text-amber-400 transition line-clamp-2">
                      {p.nameAr}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{p.sku}</span>
                  </div>

                  <button
                    type="button"
                    className="w-full py-1.5 rounded-xl bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>+ إضافة للسلة</span>
                    {inCart && (
                      <span className="size-4 rounded-full bg-amber-500 text-slate-950 text-[10px] flex items-center justify-center font-bold">
                        {inCart.quantity}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Left Section: Cart & Instant Checkout (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-amber-400" />
                <h2 className="font-black text-white text-sm">سلة الطلب الحالي</h2>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                >
                  <Trash2 className="size-3" />
                  <span>تفريغ السلة</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="my-3 divide-y divide-slate-800/60 max-h-72 overflow-y-auto space-y-2 pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <ShoppingBag className="size-8 mx-auto stroke-1" />
                  <p className="text-xs">السلة فارغة. انقر على أي صنف لإضافته.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.sku} className="pt-2 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-white truncate">{item.nameAr}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.unitPrice} ج.م × {item.quantity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.sku, 1)}
                          className="px-2 py-0.5 text-slate-300 hover:text-white font-bold"
                        >
                          +
                        </button>
                        <span className="px-1.5 text-xs font-mono font-bold text-white">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.sku, -1)}
                          className="px-2 py-0.5 text-slate-300 hover:text-white font-bold"
                        >
                          -
                        </button>
                      </div>

                      <span className="font-mono font-bold text-amber-400 text-xs w-16 text-left">
                        {item.totalPrice} ج.م
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Totals & Checkout Actions */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-mono text-slate-200">{subtotal.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span>ضريبة القيمة المضافة (14%):</span>
                <span className="font-mono text-slate-200">مشمولة بالسعر</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-1 border-t border-slate-800">
                <span>الإجمالي المستحق:</span>
                <span className="font-mono text-emerald-400 text-lg">{total.toFixed(2)} ج.م</span>
              </div>
            </div>

            {/* Direct Checkout Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={cart.length === 0 || isCheckingOut}
                onClick={() => handleCheckout("cash")}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-3 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <DollarSign className="size-4" />
                  <span>دفع كاش (نقداً)</span>
                </div>
                <span className="text-[10px] font-normal text-emerald-200">+ طباعة وفتح الدرج</span>
              </button>

              <button
                type="button"
                disabled={cart.length === 0 || isCheckingOut}
                onClick={() => handleCheckout("card")}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-3 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-1 shadow-lg shadow-blue-950/40 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <CreditCard className="size-4" />
                  <span>دفع فيزا / محفظة</span>
                </div>
                <span className="text-[10px] font-normal text-blue-200">+ طباعة بون فوري</span>
              </button>
            </div>

            {/* Order Confirmation Badge */}
            {lastOrderNumber && (
              <div className="bg-emerald-950/90 border border-emerald-500/40 p-2.5 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>تم حفظ وطباعة الفاتورة <strong>{lastOrderNumber}</strong> بنجاح!</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLastOrderNumber(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Modals */}
      <OfflineSyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />

      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl">
            <button
              onClick={() => setShowSetupModal(false)}
              className="absolute left-4 top-4 z-10 size-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
            >
              ✕
            </button>
            <OfflineTerminalSetup onSaved={() => setShowSetupModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
