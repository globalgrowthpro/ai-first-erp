/**
 * Hafez ERP — POS Terminal Hardware & Branch Binding Wizard
 * Used by field engineers to configure the terminal, bind branch identity,
 * test thermal printers & cash drawers, and download initial offline snapshot.
 */

import React, { useState, useEffect } from "react";
import { offlinePosEngine } from "../engine/offline-pos-engine";
import { posHardware } from "../engine/hardware-bridge";
import { seedInitialOfflineData } from "../db/seed-offline-data";
import { posLocalDb } from "../db/pos-local-db";
import { Settings, Printer, DollarSign, Database, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";

export const BRANCH_OPTIONS = [
  { id: "korba", nameAr: "فرع الكوربة — مصر الجديدة", prefix: "INV-KB-" },
  { id: "abbas", nameAr: "فرع عباس العقاد — مدينة نصر", prefix: "INV-AB-" },
  { id: "helmeya", nameAr: "فرع الحلمية — حلمية الزيتون", prefix: "INV-HL-" },
  { id: "khosoos", nameAr: "فرع الخصوص — القليوبية", prefix: "INV-KH-" },
  { id: "wost_elbalad", nameAr: "فرع وسط البلد — طلعت حرب", prefix: "INV-WB-" },
  { id: "giza", nameAr: "فرع الجيزة — ميدان الجيزة", prefix: "INV-GZ-" },
  { id: "faisal", nameAr: "فرع فيصل — شارع فيصل الرئيسي", prefix: "INV-FS-" },
  { id: "dar_elsalam", nameAr: "فرع دار السلام — الكورنيش", prefix: "INV-DS-" },
  { id: "october_gardens", nameAr: "فرع حدائق أكتوبر — زويل", prefix: "INV-OG-" },
  { id: "ahram_gardens", nameAr: "فرع حدائق الأهرام — البوابة الثانية", prefix: "INV-AG-" },
  { id: "hosary", nameAr: "فرع الحصري — 6 أكتوبر", prefix: "INV-HS-" },
  { id: "sheikh_zayed", nameAr: "فرع الشيخ زايد — أمريكانا بلازا", prefix: "INV-SZ-" },
  { id: "mansoura", nameAr: "فرع المنصورة — المشاية", prefix: "INV-MN-" },
  { id: "banha", nameAr: "فرع بنها — الإشارة والفلل", prefix: "INV-BN-" },
  { id: "tenth_ramadan", nameAr: "فرع العاشر من رمضان والمصنع المركزي", prefix: "INV-TR-" },
];

interface OfflineTerminalSetupProps {
  onSaved?: () => void;
  className?: string;
}

export const OfflineTerminalSetup: React.FC<OfflineTerminalSetupProps> = ({ onSaved, className = "" }) => {
  const currentCfg = offlinePosEngine.getTerminalConfig();
  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentCfg.branchId);
  const [terminalId, setTerminalId] = useState<string>(currentCfg.terminalId);
  const [receiptPrefix, setReceiptPrefix] = useState<string>(currentCfg.receiptPrefix);
  const [isPersisted, setIsPersisted] = useState<boolean>(false);
  const [catalogStats, setCatalogStats] = useState<{ products: number; categories: number }>({
    products: 0,
    categories: 0,
  });
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      const persisted = await posLocalDb.ensurePersistentStorage();
      setIsPersisted(persisted);
      const prodCount = await posLocalDb.count("products_cache");
      const catCount = await posLocalDb.count("categories_cache");
      setCatalogStats({ products: prodCount, categories: catCount });
    };
    init();
  }, []);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    const found = BRANCH_OPTIONS.find((b) => b.id === branchId);
    if (found) {
      setReceiptPrefix(found.prefix);
    }
  };

  const handleTestPrint = () => {
    const testOrder: any = {
      orderNumber: `${receiptPrefix}TEST-01`,
      branchNameAr: BRANCH_OPTIONS.find((b) => b.id === selectedBranchId)?.nameAr || "فرع الكوربة",
      terminalId,
      cashierName: "مهندس الصيانة",
      createdAt: new Date().toISOString(),
      createdOffline: true,
      items: [
        { sku: "SKU-TEST-1", nameAr: "طاجن أم علي مكسرات (اختبار)", quantity: 1, totalPrice: 110 },
        { sku: "SKU-TEST-2", nameAr: "قشطوطة بستاشيو فاخر (اختبار)", quantity: 1, totalPrice: 90 },
      ],
      subtotal: 200,
      vatAmount: 24.56,
      discountAmount: 0,
      total: 200,
      paymentMethod: "cash",
      tenderAmount: 200,
      changeAmount: 0,
    };

    posHardware.printSilentReceipt(testOrder);
  };

  const handleTestDrawer = () => {
    posHardware.openCashDrawer().catch(() => {});
  };

  const handleReSeedCatalog = async () => {
    setIsSeeding(true);
    try {
      await posLocalDb.clearStore("products_cache");
      await posLocalDb.clearStore("categories_cache");
      const res = await seedInitialOfflineData();
      setCatalogStats({ products: res.productsCount, categories: res.categoriesCount });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSaveConfig = async () => {
    const selectedBranch = BRANCH_OPTIONS.find((b) => b.id === selectedBranchId);
    await offlinePosEngine.setTerminalConfig({
      branchId: selectedBranchId,
      branchNameAr: selectedBranch?.nameAr || "فرع الكوربة",
      terminalId,
      receiptPrefix,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    if (onSaved) onSaved();
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl max-w-3xl mx-auto ${className}`} dir="rtl">
      {/* Title */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
        <div className="size-11 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-xl font-bold border border-blue-500/30">
          <Settings className="size-6" />
        </div>
        <div>
          <h2 className="text-base font-black text-white">إعداد وربط نقطة البيع في الفرع (Terminal Setup)</h2>
          <p className="text-xs text-slate-400">تخصيص هوية الفرع، تعريف الطابعة الحرارية ودرج النقدية، وفحص الكتالوج المحلي</p>
        </div>
      </div>

      <div className="space-y-5 pt-5 text-xs">
        {/* 1. Branch and Terminal ID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-slate-300 font-bold mb-1.5">الفرع المخصص للجهاز:</label>
            <select
              value={selectedBranchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-amber-500"
            >
              {BRANCH_OPTIONS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAr}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">معرف الكاونتر (Terminal):</label>
            <input
              type="text"
              value={terminalId}
              onChange={(e) => setTerminalId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* 2. Hardware Test Box */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <Printer className="size-4 text-emerald-400" />
              <span>فحص طابعة الفواتير (ESC/POS 80mm) ودرج النقدية (RJ11)</span>
            </h4>
            <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
              POS-Receipt-Printer
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            تأكد من ضبط المتصفح على وضع Kiosk Printing بدون ظهور نوافذ معاينة للطباعة السريعة.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestPrint}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="size-3.5" />
              <span>طباعة بون تجريبي فوري</span>
            </button>
            <button
              type="button"
              onClick={handleTestDrawer}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <DollarSign className="size-3.5" />
              <span>اختبار فتح درج النقدية آلياً</span>
            </button>
          </div>
        </div>

        {/* 3. Catalog & Offline Persistence Status */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <Database className="size-4 text-amber-400" />
              <span>قاعدة البيانات والكتالوج المحلي (IndexedDB Snapshot)</span>
            </h4>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              <span>جاهز للعمل بلا إنترنت</span>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300 text-[11px]">
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">الأصناف المحفوظة:</span>
              <strong className="font-mono text-emerald-400 text-sm">{catalogStats.products} صنف</strong>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">التصنيفات:</span>
              <strong className="font-mono text-amber-400 text-sm">{catalogStats.categories} تصنيف</strong>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-500 block">التخزين الدائم (Storage):</span>
              <strong className={isPersisted ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                {isPersisted ? "ممنوح (Persistent)" : "قياسي"}
              </strong>
            </div>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleReSeedCatalog}
              disabled={isSeeding}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isSeeding ? "animate-spin" : ""}`} />
              <span>{isSeeding ? "جارٍ التحديث..." : "إعادة تحديث الكتالوج المحلي"}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="size-4" />
                <span>تم حفظ إعدادات الجهاز بنجاح!</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-900/40 transition cursor-pointer"
          >
            حفظ وتأكيد تشغيل نقطة البيع ✅
          </button>
        </div>
      </div>
    </div>
  );
};
