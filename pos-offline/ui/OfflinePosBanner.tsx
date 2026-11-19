/**
 * Hafez ERP — Offline POS Status Alert Banner
 * Floats at the top of POS terminal to inform cashier of offline mode,
 * local storage preservation, and count of unsynchronized transactions.
 */

import React, { useState, useEffect } from "react";
import { networkMonitor, type NetworkHealth } from "../engine/network-monitor";
import { offlinePosEngine } from "../engine/offline-pos-engine";
import { Wifi, WifiOff, RefreshCw, Database, Layers } from "lucide-react";

interface OfflinePosBannerProps {
  onOpenSyncModal?: () => void;
  className?: string;
}

export const OfflinePosBanner: React.FC<OfflinePosBannerProps> = ({ onOpenSyncModal, className = "" }) => {
  const [network, setNetwork] = useState<NetworkHealth>(networkMonitor.getHealth());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe to network changes
    const unsubNet = networkMonitor.subscribe((health) => {
      setNetwork(health);
    });

    // Subscribe to engine changes
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

  // If online and no pending orders, show compact minimalist status pill
  if (network.isOnline && pendingCount === 0) {
    return (
      <div className={`flex items-center justify-between bg-slate-900/90 border border-slate-800 text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-bold ${className}`}>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-emerald-400">متصل بالسيرفر المركزي (Online)</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 font-mono text-[11px]">زمن الاستجابة: {network.latencyMs}ms</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Database className="size-3 text-emerald-400" />
          <span>الذاكرة المحلية نشطة (IndexedDB)</span>
        </div>
      </div>
    );
  }

  // Warning Banner (Offline or Pending Orders in Queue)
  return (
    <div
      className={`bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 border border-red-500/50 rounded-2xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${className}`}
      dir="rtl"
    >
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
          {network.isOnline ? <Wifi className="size-5" /> : <WifiOff className="size-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-red-200 text-sm">
              {network.isOnline ? "تنبيه: توجد فواتير معلقة بانتظار المزامنة" : "وضع غير متصل بالإنترنت (Offline Mode نشط)"}
            </span>
            <span className="bg-red-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">
              حفظ محلي فوري
            </span>
          </div>
          <p className="text-slate-300 text-[11px] mt-0.5">
            {network.isOnline
              ? "الإنترنت متاح حالياً. سيتم إرسال الفواتير إلى السيرفر المركزي تلقائياً."
              : "البيع مستمر بشكل طبيعي 100%. الفواتير تُحفظ في الذاكرة المحلية وتُطبع فوراً دون توقف."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center gap-2">
          <Layers className="size-3.5 text-amber-400" />
          <span className="text-slate-400">الفواتير المعلقة:</span>
          <span className="font-mono font-black text-amber-400 text-sm">{pendingCount} فاتورة</span>
        </div>

        {onOpenSyncModal && (
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition"
          >
            سجل المزامنة
          </button>
        )}

        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition flex items-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "جارٍ الإرسال..." : "مزامنة الآن"}</span>
        </button>
      </div>
    </div>
  );
};
