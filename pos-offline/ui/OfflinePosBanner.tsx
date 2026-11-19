/**
 * Hafez ERP — Offline POS Status Alert Banner
 * Real-time detection of connectivity states (Online vs Offline)
 * Seamlessly integrates with the clean Wazeer El-Helw design system.
 */

import React, { useState, useEffect } from "react";
import { networkMonitor, type NetworkHealth } from "../engine/network-monitor";
import { offlinePosEngine } from "../engine/offline-pos-engine";
import { Wifi, WifiOff, RefreshCw, Database } from "lucide-react";

interface OfflinePosBannerProps {
  onOpenSyncModal?: () => void;
  className?: string;
}

export const OfflinePosBanner: React.FC<OfflinePosBannerProps> = ({ onOpenSyncModal, className = "" }) => {
  const [network, setNetwork] = useState<NetworkHealth>(networkMonitor.getHealth());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // 1. Proactively probe connection immediately on mount
    networkMonitor.probeConnection();

    // 2. Subscribe to real-time network changes
    const unsubNet = networkMonitor.subscribe((health) => {
      setNetwork(health);
    });

    // 3. Subscribe to local engine pending orders count
    const updatePending = async () => {
      const count = await offlinePosEngine.getPendingOrdersCount();
      setPendingCount(count);
    };

    updatePending();
    const unsubEngine = offlinePosEngine.subscribe(updatePending);

    return () => {
      unsubNet();
      unsubEngine();
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await networkMonitor.probeConnection();
      await offlinePosEngine.syncOutboxOrders();
    } finally {
      setIsSyncing(false);
    }
  };

  // State A: Online & Fully Synchronized (No Pending Orders)
  if (network.isOnline && pendingCount === 0) {
    return (
      <div
        dir="rtl"
        className={`bg-emerald-500/10 border-b border-emerald-500/25 px-4 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 select-none text-emerald-950 transition-colors ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-emerald-500"></span>
          <div className="flex items-center gap-2">
            <span className="font-black text-emerald-800 text-xs">
              متصل بالإنترنت (Online) — المزامنة السحابية فورية
            </span>
            <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full shadow-2xs">
              سيرفر وزير الحلو نشط
            </span>
            <span className="text-[11px] text-slate-600 hidden md:inline">
              البيع متصل سحابياً مع حفظ محلي احتياطي فوري
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <span>الاستجابة: {network.latencyMs > 0 ? `${network.latencyMs}ms` : "مباشر"}</span>
          <span>•</span>
          <span className="text-emerald-700 font-bold">كافة الفواتير متزامنة (0 معلق)</span>
        </div>
      </div>
    );
  }

  // State B: Online but has pending local orders waiting for transmission
  if (network.isOnline && pendingCount > 0) {
    return (
      <div
        dir="rtl"
        className={`bg-emerald-500/15 border-b border-emerald-500/35 px-4 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 select-none text-emerald-950 transition-colors ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <div className="flex items-center gap-2">
            <span className="font-black text-emerald-800 text-xs">
              متصل بالإنترنت — تتوفر فواتير محلية بانتظار الرفع
            </span>
            <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full shadow-2xs">
              مزامنة متاحة
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/90 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 text-[11px] font-mono">
            <span className="text-slate-600">فواتير معلقة:</span>
            <strong className="text-emerald-800 font-bold">{pendingCount} فواتير</strong>
          </div>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "جاري الرفع..." : "رفع للسيرفر الآن"}</span>
          </button>
        </div>
      </div>
    );
  }

  // State C: Offline (Real disconnect detected)
  return (
    <div
      dir="rtl"
      className={`bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 select-none text-amber-950 transition-colors ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="size-2 rounded-full bg-rose-500 animate-ping"></span>
        <div className="flex items-center gap-2">
          <span className="font-black text-rose-700 text-xs">
            وضع غير متصل بالإنترنت (Offline Mode نشط) — انقطع الاتصال
          </span>
          <span className="text-[10px] bg-amber-600 text-white font-black px-2 py-0.5 rounded-full shadow-2xs">
            حفظ محلي آمن (IndexedDB)
          </span>
          <span className="text-[11px] text-slate-600 hidden md:inline">
            البيع والطباعة مستمرة 100% بدون أي توقف
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-0.5 rounded-lg border border-amber-500/30 text-[11px] font-mono">
          <span className="text-slate-600">فواتير معلقة محلياً:</span>
          <strong className="text-amber-800 font-bold">{pendingCount} فواتير</strong>
        </div>
        {onOpenSyncModal && (
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="px-2.5 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition shadow-2xs cursor-pointer flex items-center gap-1"
          >
            <span>لوحة المزامنة</span>
          </button>
        )}
      </div>
    </div>
  );
};
