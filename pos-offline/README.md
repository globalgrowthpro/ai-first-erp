# 🏪 نظام نقاط البيع بدون إنترنت (POS Offline System)
## Hafez ERP · سلسلة حلويات وزير الحلو

نظام نقاط بيع متكامل ومستقل بنسبة 100% يعمل في وضع عدم الاتصال بالإنترنت (Offline-First Architecture)، تم بناؤه بالكامل داخل مجلد `pos-offline/` دون أي مساس أو تعديل على الكود الأونلاين الحالي في `src/`.

---

## 📁 هيكل كود ومكونات `pos-offline/`

```text
pos-offline/
├── index.ts                      # نقطة الدخول والتصدير المركزية لكافة وظائف الـ Offline
│
├── db/                           # طبقة قاعدة البيانات المحلية (IndexedDB Native)
│   ├── pos-local-db.ts           # المحرك المحلي: 7 جداول (pending_orders, products_cache, shifts, etc.)
│   └── seed-offline-data.ts      # بيانات الكتالوج الأولية (182 صنف حلويات، 15 فرع، ورموز الكاشيرين)
│
├── engine/                       # محركات الأعمال والعتاد والمزامنة
│   ├── offline-pos-engine.ts     # محرك العمليات: إنشاء الفواتير، خصم المخزون المحلي، والـ Outbox Queue
│   ├── network-monitor.ts        # مراقب الشبكة اللحظي: كشف الاتصال وفحص الـ Latency الفعلي
│   └── hardware-bridge.ts        # جسر العتاد: طباعة بونات ESC/POS 80mm وفتح درج النقدية RJ11
│
├── ui/                           # واجهات المستخدم (React Components)
│   ├── OfflinePosView.tsx        # شاشة الكاشير الكاملة المستقلة (Offline POS Terminal)
│   ├── OfflinePosBanner.tsx      # شريط التنبيه العلوي بعداد الفواتير المعلقة وزر المزامنة
│   ├── OfflineSyncModal.tsx      # لوحة إدارة المزامنة والـ Outbox مع تصدير Excel للطوارئ
│   └── OfflineTerminalSetup.tsx  # معالج إعداد وربط الجهاز بالفرع واختبار الطابعة
│
├── sw/                           # ملفات الـ Service Worker والتشغيل الميداني
│   ├── pos-service-worker.js     # كاش الأصول وتفعيل الـ Background Sync
│   └── launch-kiosk.bat          # سكربت تشغيل الكاشير في وضع ملء الشاشة Kiosk مع Silent Printing
│
├── screenshots/                  # لقطات وتصاميم الشاشات المعتمدة (UI/UX)
├── POS_OFFLINE_ONLINE_ARCHITECTURE_PLAN.md # المخطط المعماري الكامل
├── BRANCHES_SETUP_AND_TOOLS_GUIDE.md       # دليل التجهيز الميداني وقائمة العتاد
└── preview.html                  # صفحة المعاينة التفاعلية للشاشات
```

---

## 🚀 كيفية استخدام الموديول في أي شاشة أو مسار:

```typescript
import {
  OfflinePosView,
  OfflinePosBanner,
  OfflineSyncModal,
  OfflineTerminalSetup,
  offlinePosEngine,
  networkMonitor,
} from "pos-offline";

// 1. عرض شاشة الكاشير المستقلة أوفلاين بالكامل:
export function CashierPage() {
  return <OfflinePosView />;
}

// 2. استخدام محرك العمليات برمجياً:
const order = await offlinePosEngine.createOfflineOrder({
  items: [{ sku: "SKU-OM-ALI-NUTS", nameAr: "طاجن أم علي مكسرات", unitPrice: 110, quantity: 2, totalPrice: 220 }],
  orderType: "takeaway",
  paymentMethod: "cash",
  tenderAmount: 250,
});
```

---

**فريق التطوير التقني:** المهندس حافظ رحيم  
**التاريخ:** نوفمبر 2026
