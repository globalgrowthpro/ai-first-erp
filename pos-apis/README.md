# POS REST APIs - Hafez ERP

مجموعة واجهات برمجة التطبيقات المتكاملة لنقاط البيع (Point of Sale REST APIs) الموجهة لسلسلة حلويات وزير الحلو وفروعها ومطابخها المركزية.

## 📌 الهيكل العام للمجلد `pos-apis/`

```
pos-apis/
├── types.ts                     # تعريفات TypeScript الشاملة لكل النماذج والطلبات
├── database.ts                  # طبقة الاتصال بقاعدة بيانات Supabase مع مخزن محلي احتياطي
├── server.ts                    # خادم HTTP REST API المستقل (منفذ 3001)
├── client.ts                    # حزمة SDK للاتصال بالـ API من الواجهات أو التطبيقات
├── test-runner.mjs              # مجموعة الاختبارات التلقائية لجميع الدوال والأساليب
├── index.ts                     # نقطة التصدير المركزية للمشروع
├── controllers/
│   ├── orders.controller.ts     # إدارة العمليات على الطلبات (إنشاء، تعديل، إلغاء، تعليق، استرجاع)
│   ├── shifts.controller.ts     # إدارة الورديات (فتح، إغلاق، جرد، تقرير Z، سحب نقدية)
│   ├── products.controller.ts   # قائمة الأصناف والباركود والمخزون والتصنيفات
│   ├── customers.controller.ts  # العملاء ونقاط الولاء والتسجيل السريع
│   ├── branches.controller.ts   # الفروع، الأجهزة، والتحقق برمز PIN للكاشير
│   └── sync.controller.ts       # مزامنة الطلبات دون اتصال (Offline Batch Sync)
└── routes/
    └── router.ts                # موجه الطلبات الموحد (يدعم GET, POST, PUT, PATCH, DELETE, OPTIONS)
```

---

## 🚀 طرق التشغيل (Running the Server)

### 1. تشغيل الخادم المستقل (Standalone API Server):
```bash
node --experimental-strip-types pos-apis/server.ts
```
أو عبر المنفذ المخصص:
```bash
PORT=3001 node --experimental-strip-types pos-apis/server.ts
```

### 2. تشغيل فحص واختبار جميع الطرق (Test Suite):
```bash
node --experimental-strip-types pos-apis/test-runner.mjs
```

---

## 📡 جدول واجهات الـ API وطرق الـ HTTP المدعومة (All Methods)

### 1. الطلبات والمبيعات (Orders & Checkout)
| الطريقة (Method) | المسار (Endpoint) | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/pos/orders` | استعراض فواتير وطلبات نقاط البيع مع فلاتر (الفرع، الحالة، الكاشير، التاريخ، البحث) |
| `GET` | `/api/pos/orders/:id` | جلب تفاصيل فاتورة محددة مع بنود الأصناف وتفاصيل الضريبة |
| `POST` | `/api/pos/orders` | إنشاء فاتورة بيع جديدة وحفظ البنود واحتساب الضريبة وتحديث رصيد الوردية |
| `PUT` | `/api/pos/orders/:id` | تعديل واستبدال كامل لبيانات الفاتورة أو بنودها أو طاولة العميل |
| `PATCH` | `/api/pos/orders/:id/status` | تحديث حالة الفاتورة السريع (`completed`, `paid`, `parked`, `cancelled`, `refunded`) |
| `DELETE` | `/api/pos/orders/:id` | إلغاء / حذف الفاتورة نهائياً مع تسجيل أثر المراجعة |
| `POST` | `/api/pos/orders/park` | تعليق فاتورة / حفظ مؤقت لطلب العميل لاستئنافه لاحقاً |
| `GET` | `/api/pos/orders/parked` | جلب قائمة كافة الطلبات المعلقة في الفرع |
| `POST` | `/api/pos/orders/:id/refund` | معالجة استرجاع كامل أو جزئي لطلب (Storno / Refund) مع سبب الإرجاع |

### 2. الورديات والجرد النقدي (Shifts & Cash Management)
| الطريقة (Method) | المسار (Endpoint) | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/pos/shifts` | استعراض سجل الورديات المغلقة والنشطة عبر الفروع |
| `GET` | `/api/pos/shifts/current` | جلب الوردية المفتوحة حالياً للكاشير والفرع |
| `POST` | `/api/pos/shifts/open` | فتح وردية جديدة مع تسجيل عهدة الكاشير الافتتاحية (Float) |
| `POST` | `/api/pos/shifts/close` | إغلاق الوردية ومطابقة النقدية الفعلية مع المتوقعة واحتساب العجز/الزيادة |
| `POST` | `/api/pos/shifts/cash-movement` | تسجيل حركة سحب أو توريد نقدية من الدرج (Safe Drop / Petty Cash) |
| `GET` | `/api/pos/shifts/:id/z-report` | استخراج تقرير Z المالي المفصل الشامل لمبيعات الوردية وضرائبها |
| `PUT` | `/api/pos/shifts/:id` | تعديل بيانات وردية مسجلة |
| `DELETE` | `/api/pos/shifts/:id` | إلغاء وحذف وردية تم فتحها بالخطأ |

### 3. قائمة الأصناف والمخزون (Catalog & Barcodes)
| الطريقة (Method) | المسار (Endpoint) | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/pos/products` | جلب قائمة منتجات نقاط البيع مع الأسعار والأرصدة والباركود |
| `GET` | `/api/pos/products/barcode/:barcode` | فحص سريع بالباركود أو الـ SKU لجهاز الماسح الضوئي |
| `GET` | `/api/pos/categories` | جلب مجموعات وتصنيفات الحلويات في المنيو |
| `POST` | `/api/pos/products` | إضافة صنف جديد لقائمة نقاط البيع |
| `PUT` | `/api/pos/products/:id` | تعديل أسعار أو تفاصيل صنف في المنيو |
| `PATCH` | `/api/pos/products/:id/stock` | خصم أو تعديل فوري لرصيد الصنف في مخزن الفرع |
| `DELETE` | `/api/pos/products/:id` | إيقاف تفعيل الصنف من المنيو |

### 4. العملاء ونقاط الولاء (Customers & Loyalty)
| الطريقة (Method) | المسار (Endpoint) | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/pos/customers` | بحث فوري عن العميل برقم الهاتف أو الاسم |
| `GET` | `/api/pos/customers/:id` | جلب ملف العميل ورصيد نقاط المكافآت وتاريخ طلباته |
| `POST` | `/api/pos/customers` | تسجيل سريع لعميل جديد أثناء الشراء على شاشة الكاشير |
| `PUT` | `/api/pos/customers/:id` | تحديث بيانات العميل أو العنوان |
| `PATCH` | `/api/pos/customers/:id/loyalty` | إضافة أو استبدال نقاط ولاء العميل في الفاتورة |
| `DELETE` | `/api/pos/customers/:id` | حذف بيانات عميل |

### 5. الفروع وأجهزة نقاط البيع وتسجيل الدخول (Branches & Auth)
| الطريقة (Method) | المسار (Endpoint) | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/pos/branches` | استعراض قائمة الفروع الـ 18 والمطبخ المركزي |
| `GET` | `/api/pos/branches/:id` | تفاصيل الفرع والعنوان والخط الساخن |
| `POST` | `/api/pos/auth/pin-verify` | تسجيل دخول سريع للكاشير برمز PIN المكون من 4 أرقام |
| `GET` | `/api/pos/terminals` | جلب الأجهزة ونقاط البيع المسجلة في الفرع (Sunmi, Pax, PC) |

### 6. المزامنة والعمل بدون إنترنت (Offline Sync)
| الطريقة (Method) | المسار (Endpoint) | الوصف |
| :--- | :--- | :--- |
| `POST` | `/api/pos/sync/batch` | رفع دفعة فواتير تم إنشاؤها أثناء انقطاع الإنترنت ومطابقتها بالسيرفر |
| `GET` | `/api/pos/sync/health` | فحص اتصال الخادم وحالة المزامنة السحابية |
| `OPTIONS` | `*` | استجابة CORS Preflight لكافة المتصفحات والتطبيقات الخارجية |

---

## 💻 استخدام الـ Client SDK داخل الكود

```typescript
import { posApiClient } from "./pos-apis/client";

// 1. إنشاء طلب كاشير
const order = await posApiClient.orders.create({
  branchId: "korba",
  cashierId: "usr-korba",
  cashierName: "أحمد فريد",
  orderType: "takeaway",
  paymentMethod: "cash",
  items: [
    { sku: "SKU-OM-ALI", nameAr: "طاجن أم علي", nameEn: "Om Ali", quantity: 2, unitPrice: 110 }
  ]
});

// 2. فحص صنف بالباركود
const item = await posApiClient.products.byBarcode("622100101");

// 3. فتح وردية
const shift = await posApiClient.shifts.open({
  branchId: "korba",
  cashierId: "usr-korba",
  cashierName: "أحمد فريد",
  openingCash: 1500
});

// 4. استخراج تقرير Z
const zReport = await posApiClient.shifts.zReport(shift.data.id);
```
