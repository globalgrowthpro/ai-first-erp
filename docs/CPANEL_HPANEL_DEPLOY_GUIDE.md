# دليل النشر على cPanel و Hostinger (hPanel)
# Deployment Guide for cPanel & Hostinger (hPanel)

تم إعداد وتجهيز مشروع **AI-First ERP** ليعمل بشكل فوري وشامل على كل من **cPanel** و **Hostinger (hPanel)** بطريقتين مرنتين:

---

## الخيار الأول: النشر المباشر كـ Static SPA عبر مدير الملفات (الأسهل والأسرع)
## Option 1: Direct Static SPA Upload via File Manager (Recommended & Simplest)

هذا الخيار يعمل على **جميع** خطط الاستضافة المشتركة (Shared Hosting) دون الحاجة لضبط Node.js:

1. قم بتنفيذ أمر البناء في جهازك:
   ```bash
   npm run build
   ```
2. ادخل إلى المجلد الناتج:
   ```
   dist/client/
   ```
   ستجد بداخله:
   - `index.html` (تم توليده وتجهيزه تلقائياً)
   - `.htaccess` (مضبوط بروابط التوجيه والأمان وضغط Gzip)
   - مجلد `assets/`
   - الصور والملفات الثابتة
3. قم بضغط محتويات `dist/client/` في ملف `.zip`.
4. افتح **cPanel File Manager** أو **hPanel File Manager**.
5. توجه إلى مجلد موقعك (عادة `public_html`).
6. قم برفع وفك ضغط الملفات مباشرة داخل `public_html`.
7. **مبروك!** سيعمل الموقع وجميع مساراته (`/ai`, `/sales`, `/accounting`, إلخ) مع حماية كاملة للمسارات ورؤوس الأمان.

---

## الخيار الثاني: النشر كتطبيق Node.js مع SSR
## Option 2: Full Node.js App Deployment (cPanel Passenger / hPanel Node.js)

إذا كنت تفضل تشغيل خادم Node.js مع التصيير من جانب الخادم (SSR):

### خطوات cPanel (Setup Node.js App):
1. في لوحة تحكم cPanel، افتح **Setup Node.js App**.
2. اضغط **Create Application**:
   - **Node.js version**: اختر `18.x` أو `20.x` أو `22.x`.
   - **Application mode**: `Production`.
   - **Application root**: اكتب مسار المجلد (مثلاً `erp` أو `public_html`).
   - **Application URL**: اختر نطاقك (مثلاً `erp.yourdomain.com`).
   - **Application startup file**: اكتب `app.js`.
3. اضغط **Create**.
4. قم برفع الملفات التالية إلى مجلد التطبيق:
   - `app.js`
   - `package.json`
   - `.htaccess`
   - مجلد `dist/` كاملاً (يحتوي على `client/` و `server/`)
   - مجلد `node_modules/` (أو اضغط **Run NPM Install** من لوحة cPanel).
5. اضغط **Restart** لتشغيل التطبيق.

### خطوات Hostinger (hPanel):
1. في لوحة **hPanel**، توجه إلى قسم **Websites** ثم **Node.js** (أو VPS).
2. حدد إصدار Node.js (`18+` أو `20+`).
3. اضبط ملف البدء (Startup File) على:
   ```
   app.js
   ```
4. ارفع ملفات المشروع (`app.js`, `dist/`, `package.json`).
5. شغل الأمر:
   ```bash
   npm start
   ```

---

## ميزات الأمان المضمنة تلقائياً في هذا الإصدار:
- **HTTP Security Headers**:
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000`
  - `Content-Security-Policy`
  - `Permissions-Policy`
- **Route Protection**: شاشة حظر 403 لمنع تسريب بيانات الصفحات غير المصرح بها للأدوار المختلفة.
- **Gzip & Deflate Compression**: تسريع فائق لتحميل ملفات CSS و JS والصور.
- **Cache-Control**: تخزين مؤقت لسنة كاملة لملفات `assets/` المرمزة لتوفير استهلاك الباندويث.
