# 🏪 مجلد توثيق وهندسة نظام نقاط البيع بدون إنترنت (POS Offline System)
## Hafez ERP · سلسلة حلويات وزير الحلو

يحتوي هذا المجلد على كافة المخططات الهندسية، الأدلة الميدانية، ومواصفات واجهات المستخدم لنظام نقاط البيع القادر على العمل بنسبة 100% بدون اتصال بالإنترنت والمزامنة الذكية مع خوادم السحاب فور عودة الاتصال.

---

## 📁 محتويات المجلد

1. **[POS_OFFLINE_ONLINE_ARCHITECTURE_PLAN.md](./POS_OFFLINE_ONLINE_ARCHITECTURE_PLAN.md)**:
   * فلسفة معمارية Offline-First.
   * طبقات التخزين المحلي (IndexedDB + Dexie.js Schema).
   * محرك المزامنة الذكي (Sync Engine & Service Worker).
   * إدارة الورديات والأمان في غياب الإنترنت.
   * سياسات حل تعارض البيانات (Conflict Resolution Policy).
   * مواصفات API المزامنة الدفعية `POST /api/pos/sync/batch`.

2. **[BRANCHES_SETUP_AND_TOOLS_GUIDE.md](./BRANCHES_SETUP_AND_TOOLS_GUIDE.md)**:
   * قائمة العتاد المعتمدة لكل فرع (Hardware Checklist): شاشات اللمس، طابعات 80mm، درج النقدية RJ11، أجهزة UPS، ومودم 4G Failover.
   * حزمة البرمجيات والأدوات الواجب تثبيتها في كل كاشير: متصفح Kiosk Mode، تطبيق PWA، محرك الطباعة الصامتة QZ Tray، وأداة الدعم الفني عن بُعد RustDesk.
   * خطوات الإعداد الميداني خطوة بخطوة (Step-by-step Setup Playbook).
   * جدول أكواد الفروع وربط الأجهزة (Terminal IDs & Receipt Prefixes).
   * جدول موجات النشر على 15 فرعاً ومصنع العاشر المركزي.

---

**إدارة المشروع التقني:** المهندس حافظ رحيم  
**التاريخ:** نوفمبر 2026
