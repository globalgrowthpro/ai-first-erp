/**
 * Hafez ERP — POS Offline Outbox Queue & Sync Monitor Modal
 * Allows cashiers and supervisors to audit locally stored offline orders,
 * trigger manual sync, and export emergency Excel backup.
 */

import React, { useState, useEffect } from "react";
import { offlinePosEngine, type SyncBatchResult } from "../engine/offline-pos-engine";
import { networkMonitor, type NetworkHealth } from "../engine/network-monitor";
import { posLocalDb, type OfflineOrderRecord } from "../db/pos-local-db";
import * as XLSX from "xlsx";
import {
  X,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Wifi,
  WifiOff,
  Layers,
  ArrowUpRight,
} from "lucide-react";

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({ isOpen, onClose }) => {
  const [orders, setOrders] = useState<OfflineOrderRecord[]>([]);
  const [network, setNetwork] = useState<NetworkHealth>(networkMonitor.getHealth());
  const [storage, setStorage] = useState<{ usageMb: number; quotaMb: number; percent: number }>({
    usageMb: 0,
    quotaMb: 0,
    percent: 0,
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncBatchResult | null>(null);

  const loadData = async () => {
    const list = await offlinePosEngine.getOutboxOrders();
    setOrders(list);
    const est = await posLocalDb.getStorageEstimate();
    setStorage(est);
  };

  useEffect(() => {
    if (!isOpen) return;
    loadData();

    const unsubNet = networkMonitor.subscribe(setNetwork);
    const unsubEngine = offlinePosEngine.subscribe(loadData);

    return () => {
      unsubNet();
      unsubEngine();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingOrders = orders.filter((o) => o.syncStatus === "pending" || o.syncStatus === "syncing");
  const syncedOrders = orders.filter((o) => o.syncStatus === "synced");
  const totalPendingValue = pendingOrders.reduce((sum, o) => sum + o.total, 0);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await networkMonitor.probeConnection();
      const res = await offlinePosEngine.syncOutboxOrders();
      setLastSyncResult(res);
      await loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const exportRows = orders.map((o) => ({
        "رقم الفاتورة": o.orderNumber,
        "معرف الطلب المحلي": o.id,
        "الفرع": o.branchNameAr,
        "الكاشير": o.cashierName,
        "تاريخ الإنشاء": o.createdAt,
        "نوع الطلب": o.orderType === "takeaway" ? "تيك أواي" : o.orderType === "dine_in" ? "صالة" : "توصيل",
        "طريقة الدفع": o.paymentMethod === "cash" ? "نقداً" : "بطاقة / فيزا",
        "المجموع الفرعي": o.subtotal,
        "الضريبة (14%)": o.vatAmount,
        "الخصم": o.discountAmount,
        "الإجمالي (ج.م)": o.total,
        "حالة المزامنة": o.syncStatus === "synced" ? "تمت المزامنة" : "معلق محلياً",
        "رقم السيرفر": o.serverId || "لم يرسل بعد",
        "الأصناف": o.items.map((it) => `${it.nameAr} (${it.quantity})`).join(" + "),
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(wb, ws, "فواتير الذاكرة المحلية");

      const fileName = `سجل_فواتير_الفرع_المحلي_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("[Export Excel error]:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold border border-amber-500/30">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">مركز مزامنة نقاط البيع والطلبات المعلقة (POS Outbox)</h2>
              <p className="text-xs text-slate-400">إدارة ومراقبة الفواتير المحفوظة في قاعدة بيانات المتصفح المحلية (IndexedDB)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* 4 Diagnostic KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 font-bold mb-1">الفواتير المعلقة في الطابور</div>
              <div className="text-2xl font-black font-mono text-amber-400">{pendingOrders.length} فاتورة</div>
              <div className="text-[11px] text-slate-500 mt-1">القيمة: {totalPendingValue.toLocaleString("en-US")} ج.م</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 font-bold mb-1">حالة اتصال الخادم المركزي</div>
              <div className="flex items-center gap-2 font-black text-sm">
                {network.isOnline ? (
                  <>
                    <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-emerald-400">متصل بالسحاب ({network.latencyMs}ms)</span>
                  </>
                ) : (
                  <>
                    <span className="size-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-red-400">غير متصل (الوضع المحلي)</span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">فحص دوري كل 20 ثانية</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 font-bold mb-1">استهلاك التخزين الدائم</div>
              <div className="text-lg font-black font-mono text-emerald-400">
                {storage.usageMb} MB <span className="text-xs text-slate-400 font-normal">من {storage.quotaMb || 5000} MB</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">IndexedDB Persistence: نشط ✅</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 font-bold mb-1">إجمالي الفواتير المزمنة</div>
              <div className="text-lg font-black font-mono text-slate-200">{syncedOrders.length} فاتورة</div>
              <div className="text-[11px] text-slate-500 mt-1">تم تأكيد وصولها للخادم المركزي</div>
            </div>
          </div>

          {/* Sync Result Banner */}
          {lastSyncResult && (
            <div className="bg-emerald-950/80 border border-emerald-500/40 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                <span>
                  اكتملت المزامنة بنجاح! تم نقل <strong>{lastSyncResult.synced.length}</strong> فاتورة للخادم المركزي.
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-300">
                {new Date(lastSyncResult.completedAt).toLocaleTimeString("ar-EG")}
              </span>
            </div>
          )}

          {/* Orders Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
              <h3 className="font-bold text-white">جدول فواتير الذاكرة المحلية (Outbox Queue)</h3>
              <span className="text-slate-400 font-mono">إجمالي السجلات: {orders.length}</span>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/90 text-slate-400 font-bold sticky top-0">
                  <tr>
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">التوقيت</th>
                    <th className="p-3">الكاشير</th>
                    <th className="p-3">الأصناف</th>
                    <th className="p-3">القيمة</th>
                    <th className="p-3">طريقة الدفع</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">المعرف السحابي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                        لا توجد فواتير محلية مخزنة حالياً
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-900/50 transition">
                        <td className="p-3 font-mono font-bold text-amber-400">{ord.orderNumber}</td>
                        <td className="p-3 font-mono text-slate-400">{new Date(ord.createdAt).toLocaleTimeString("ar-EG")}</td>
                        <td className="p-3 text-slate-200">{ord.cashierName}</td>
                        <td className="p-3 text-slate-300 max-w-xs truncate" title={ord.items.map((i) => i.nameAr).join(", ")}>
                          {ord.items.map((i) => `${i.nameAr} (${i.quantity})`).join(" + ")}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-400">{ord.total.toFixed(2)} ج.م</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              ord.paymentMethod === "cash"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            {ord.paymentMethod === "cash" ? "نقداً" : "بطاقة"}
                          </span>
                        </td>
                        <td className="p-3">
                          {ord.syncStatus === "synced" ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 w-max">
                              <CheckCircle2 className="size-3" />
                              <span>مُزامن</span>
                            </span>
                          ) : (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 w-max">
                              <Clock className="size-3" />
                              <span>معلق</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">{ord.serverId || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-400" />
              <span>تصدير نسخة Excel للطوارئ</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg shadow-emerald-900/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "جارٍ المزامنة الدفعية..." : "بدء المزامنة الفورية الآن"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
