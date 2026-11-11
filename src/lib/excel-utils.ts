import * as XLSX from "xlsx";
import { type EmployeeRecord, type AttendanceRecord, type PayslipItem, getDefaultAvatar } from "@/lib/hr-store";

/**
 * Export employees array to an Excel (.xlsx) file
 */
export function exportEmployeesToExcel(employees: EmployeeRecord[], filename?: string) {
  const data = employees.map((emp) => {
    const totalGross =
      emp.compensation.basicSalary +
      emp.compensation.housingAllowance +
      emp.compensation.transportAllowance +
      emp.compensation.foodAllowance +
      emp.compensation.kpiBonus;

    return {
      "كود الموظف (ID)": emp.code,
      "الاسم بالعربية": emp.name.ar,
      "الاسم بالإنجليزية": emp.name.en,
      "النوع (Gender)": emp.gender === "female" ? "أنثى / Female" : "ذكر / Male",
      "الإدارة / القسم": emp.departmentName.ar,
      "المسمى الوظيفي": emp.positionName.ar,
      "الفرع / الموقع": emp.branchName.ar,
      "نوع العقد": emp.contractType || "عقد دائم",
      "نظام الدوام": emp.employmentType,
      "تاريخ التعيين": emp.hireDate,
      "المدير المباشر": emp.directManager,
      "الرقم القومي / الإقامة": emp.nationalId,
      "رقم الهاتف": emp.phone,
      "البريد الإلكتروني": emp.email,
      "جهة اتصال الطوارئ": emp.emergencyContact.name,
      "هاتف الطوارئ": emp.emergencyContact.phone,
      "الصلة": emp.emergencyContact.relation.ar,
      "الراتب الأساسي (ج.م)": emp.compensation.basicSalary,
      "بدل السكن": emp.compensation.housingAllowance,
      "بدل الانتقال": emp.compensation.transportAllowance,
      "بدل الوجبة": emp.compensation.foodAllowance,
      "حافز الأداء KPI": emp.compensation.kpiBonus,
      "إجمالي الراتب الشامل": totalGross,
      "اسم البنك": emp.bank.bankName,
      "رقم الحساب": emp.bank.accountNumber,
      "الآيبان IBAN": emp.bank.iban,
      "المحفظة / إنستاباي": emp.bank.walletNumber || "",
      "رقم الشهادة الصحية": emp.healthCert.number,
      "تاريخ انتهاء الشهادة": emp.healthCert.expiryDate,
      "حالة الشهادة": emp.healthCert.status,
      "حالة العمل": emp.status,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const colWidths = Object.keys(data[0] || {}).map((k) => ({
    wch: Math.max(k.length * 2, 14),
  }));
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees_الموظفون");

  const actualFilename = filename || `employees-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  safeDownloadWorkbook(workbook, actualFilename);
}

/**
 * Safe browser workbook downloader
 */
export function safeDownloadWorkbook(workbook: XLSX.WorkBook, filename: string): boolean {
  try {
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      try {
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, 300);
    return true;
  } catch (err) {
    console.warn("Direct blob download failed, attempting XLSX.writeFile fallback:", err);
    try {
      XLSX.writeFile(workbook, filename);
      return true;
    } catch (err2) {
      console.error("XLSX.writeFile also failed:", err2);
      return false;
    }
  }
}

/**
 * Export attendance records to Excel (.xlsx)
 */
export function exportAttendanceToExcel(attendance: AttendanceRecord[], filename?: string) {
  const data = attendance.map((rec) => ({
    "التاريخ": rec.date,
    "كود الموظف": rec.employeeCode,
    "اسم الموظف": rec.employeeName.ar,
    "الإدارة": rec.departmentName.ar,
    "الوردية": rec.shiftName.ar,
    "وقت الحضور": rec.checkIn,
    "وقت الانصراف": rec.checkOut,
    "حالة الحضور": rec.status,
    "ساعات إضافية": rec.overtimeHours,
    "دقائق التأخير": rec.lateMinutes,
    "ملاحظات المشرف": rec.notes || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance_الحضور");

  const actualFilename = filename || `attendance-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  safeDownloadWorkbook(workbook, actualFilename);
}

/**
 * Generate and download an empty sample Excel template for employee imports
 */
export function downloadEmployeeTemplateExcel() {
  const sampleData = [
    {
      "كود الموظف (ID)": "EMP-2001",
      "الاسم بالعربية": "كريم فؤاد الشافعي",
      "الاسم بالإنجليزية": "Kareem Fouad El-Shafei",
      "النوع (male/female)": "male",
      "الإدارة": "المطبخ المركزي والتصنيع",
      "المسمى الوظيفي": "شيف حلواني شرقي أول",
      "الفرع": "مصنع العاشر من رمضان",
      "نوع العقد": "عقد دائم غير محدد المدة (Permanent)",
      "نظام الدوام": "full_time",
      "تاريخ التعيين": "2024-01-15",
      "المدير المباشر": "شيف إبراهيم البدري",
      "الرقم القومي": "29408150109923",
      "رقم الهاتف": "+20 10 1122 3344",
      "البريد الإلكتروني": "kareem@wazeer-elhelw.com",
      "الراتب الأساسي": 14500,
      "بدل السكن": 2000,
      "بدل الانتقال": 1500,
      "بدل الوجبة": 1000,
      "حافز الأداء": 1200,
      "اسم البنك": "البنك الأهلي المصري",
      "رقم الحساب": "1982348761099",
      "رقم الشهادة الصحية": "HC-2026-9021",
      "تاريخ انتهاء الشهادة": "2027-04-30",
    },
    {
      "كود الموظف (ID)": "EMP-2002",
      "الاسم بالعربية": "ريهام نبيل غانم",
      "الاسم بالإنجليزية": "Reham Nabil Ghanem",
      "النوع (male/female)": "female",
      "الإدارة": "مبيعات التجزئة والفروع",
      "المسمى الوظيفي": "كاشير ومسؤولة فرع",
      "الفرع": "فرع الكوربة — مصر الجديدة",
      "نوع العقد": "عقد سنوي متجدد (Annual Renewable)",
      "نظام الدوام": "full_time",
      "تاريخ التعيين": "2024-03-01",
      "المدير المباشر": "أحمد سالم",
      "الرقم القومي": "29705120108812",
      "رقم الهاتف": "+20 11 9988 7766",
      "البريد الإلكتروني": "reham@wazeer-elhelw.com",
      "الراتب الأساسي": 10500,
      "بدل السكن": 1500,
      "بدل الانتقال": 1200,
      "بدل الوجبة": 800,
      "حافز الأداء": 1000,
      "اسم البنك": "بنك مصر",
      "رقم الحساب": "2441098872099",
      "رقم الشهادة الصحية": "HC-2026-9022",
      "تاريخ انتهاء الشهادة": "2027-05-15",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet["!cols"] = Object.keys(sampleData[0] || {}).map((k) => ({
    wch: Math.max(k.length * 2, 16),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template_نموذج_استيراد");

  safeDownloadWorkbook(workbook, "employees_import_template.xlsx");
}

/**
 * Parse an uploaded Excel or CSV file buffer into EmployeeRecord candidates
 */
export async function parseEmployeesExcelFile(
  file: File
): Promise<{ valid: Omit<EmployeeRecord, "id">[]; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          return resolve({ valid: [], errors: ["الملف فارغ أو لا يحتوي على صفحات عمل."] });
        }

        const sheet = workbook.Sheets[firstSheetName]!;
        const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!rawRows || rawRows.length === 0) {
          return resolve({ valid: [], errors: ["لم يتم العثور على أي صفوف بيانات في الملف."] });
        }

        const valid: Omit<EmployeeRecord, "id">[] = [];
        const errors: string[] = [];

        rawRows.forEach((row, index) => {
          const rowNum = index + 2; // header is line 1

          // Extract names
          const nameAr = (
            row["الاسم بالعربية"] ||
            row["الاسم"] ||
            row["Name Ar"] ||
            row["name_ar"] ||
            ""
          ).toString().trim();

          const nameEn = (
            row["الاسم بالإنجليزية"] ||
            row["Name En"] ||
            row["name_en"] ||
            nameAr
          ).toString().trim();

          if (!nameAr && !nameEn) {
            errors.push(`صف ${rowNum}: اسم الموظف مفقود.`);
            return;
          }

          const code = (
            row["كود الموظف (ID)"] ||
            row["كود الموظف"] ||
            row["الرقم الوظيفي"] ||
            row["Code"] ||
            row["code"] ||
            `EMP-${Math.floor(2000 + Math.random() * 8000)}`
          ).toString().trim();

          const rawGender = (
            row["النوع (male/female)"] ||
            row["النوع"] ||
            row["الجنس"] ||
            row["Gender"] ||
            ""
          ).toString().toLowerCase();

          const gender: "male" | "female" =
            rawGender.includes("female") || rawGender.includes("أنثى") ? "female" : "male";

          const deptName = (
            row["الإدارة / القسم"] ||
            row["الإدارة"] ||
            row["القسم"] ||
            row["Department"] ||
            "المطبخ المركزي والتصنيع"
          ).toString().trim();

          const posName = (
            row["المسمى الوظيفي"] ||
            row["الوظيفة"] ||
            row["Position"] ||
            "عامل إنتاج"
          ).toString().trim();

          const branchName = (
            row["الفرع / الموقع"] ||
            row["الفرع"] ||
            row["الموقع"] ||
            row["Branch"] ||
            "مصنع العاشر من رمضان"
          ).toString().trim();

          const contractType = (
            row["نوع العقد"] ||
            row["العقد"] ||
            row["Contract Type"] ||
            "عقد دائم غير محدد المدة (Permanent)"
          ).toString().trim();

          const hireDate = (
            row["تاريخ التعيين"] ||
            row["Hire Date"] ||
            new Date().toISOString().slice(0, 10)
          ).toString().trim();

          const nationalId = (
            row["الرقم القومي / الإقامة"] ||
            row["الرقم القومي"] ||
            row["National ID"] ||
            "29000000000000"
          ).toString().trim();

          const phone = (
            row["رقم الهاتف"] ||
            row["الهاتف"] ||
            row["Phone"] ||
            "+20 10 0000 0000"
          ).toString().trim();

          const email = (
            row["البريد الإلكتروني"] ||
            row["الإيميل"] ||
            row["Email"] ||
            `emp-${Date.now().toString().slice(-4)}@wazeer-elhelw.com`
          ).toString().trim();

          const basicSalary = Number(
            row["الراتب الأساسي (ج.م)"] ||
            row["الراتب الأساسي"] ||
            row["الأساسي"] ||
            row["Basic Salary"] ||
            9000
          ) || 9000;

          const housingAllowance = Number(row["بدل السكن"] || row["Housing"] || 0) || 0;
          const transportAllowance = Number(row["بدل الانتقال"] || row["Transport"] || 0) || 0;
          const foodAllowance = Number(row["بدل الوجبة"] || row["Food"] || 0) || 0;
          const kpiBonus = Number(row["حافز الأداء"] || row["حافز الأداء KPI"] || row["KPI"] || 0) || 0;

          const bankName = (row["اسم البنك"] || row["البنك"] || row["Bank"] || "البنك الأهلي المصري (NBE)").toString().trim();
          const accountNumber = (row["رقم الحساب"] || row["Account Number"] || "").toString().trim();

          const healthCertNumber = (row["رقم الشهادة الصحية"] || row["الشهادة الصحية"] || "HC-2026-0000").toString().trim();
          const healthCertExpiry = (row["تاريخ انتهاء الشهادة"] || "2027-04-30").toString().trim();

          const avatarBg =
            gender === "female" ? "from-pink-600 to-rose-700" : "from-blue-600 to-indigo-700";
          const initials = (nameAr.slice(0, 1) + nameAr.slice(-1)).trim() || "مظ";

          valid.push({
            code,
            name: { ar: nameAr, en: nameEn },
            nationalId,
            email,
            phone,
            emergencyContact: {
              name: "جهة اتصال الطوارئ",
              phone,
              relation: { ar: "أقارب", en: "Family" },
            },
            departmentId: "dept-kitchen",
            departmentName: { ar: deptName, en: deptName },
            positionId: "pos-imported",
            positionName: { ar: posName, en: posName },
            branchId: "br-tenth",
            branchName: { ar: branchName, en: branchName },
            directManager: (row["المدير المباشر"] || "م. وزير الحلو").toString().trim(),
            hireDate,
            gender,
            contractType,
            employmentType: "full_time",
            status: "active",
            avatarBg,
            avatarInitials: initials,
            avatarUrl: getDefaultAvatar(gender, code),
            compensation: {
              basicSalary,
              housingAllowance,
              transportAllowance,
              foodAllowance,
              kpiBonus,
              socialInsuranceRate: 0.11,
              taxRate: 0.05,
            },
            bank: {
              bankName,
              accountNumber,
              iban: "",
            },
            healthCert: {
              number: healthCertNumber,
              expiryDate: healthCertExpiry,
              status: "valid",
            },
            leaveBalances: {
              annualTotal: 21,
              annualUsed: 0,
              sickTotal: 15,
              sickUsed: 0,
              emergencyTotal: 6,
              emergencyUsed: 0,
            },
          });
        });

        resolve({ valid, errors });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

/**
 * Generate a complete Excel template (.xlsx) for Products containing every column from the Add Product Form
 */
export function generateProductsBlankTemplate(options?: {
  categories?: { id: string; name: { ar: string; en: string } }[];
  warehouses?: { id: string; name: { ar: string; en: string } }[];
  units?: { id: string; code: string; name: { ar: string; en: string } }[];
  branches?: { id: string; name: { ar: string; en: string } }[];
}) {
  const sampleRows = [
    {
      "كود الصنف (SKU)": "BRN-1001",
      "اسم الصنف (عربي)": "أرز بلبن لوتس ومكسرات",
      "اسم الصنف (إنجليزي)": "Rice Pudding Lotus & Nuts",
      "جهة الإنتاج / التكويد (مصنع / فرع)": "منتج فرع (BRN-)",
      "التصنيف الفني (دليل ERP)": "تجميع عند الطلب (فرع)",
      "التصنيف (Category)": options?.categories?.[0]?.name.ar || "أرز بلبن وزير الحلو",
      "المخزن (Warehouse)": options?.warehouses?.[0]?.name.ar || "عنبر الألبان والصوصات والتبريد",
      "الوحدة (Unit)": options?.units?.[0]?.code || "BOX",
      "المجموعة (Group)": "عشاق الرز",
      "الفرع (Branch)": "جميع الفروع",
      "القسم / العنبر (Department)": "قسم الألبان والحلويات الشرقية",
      "التصنيف الداخلي (خام / لف وحزم)": "منتج تام الصنع",
      "طبيعة الخامة (خامات مشتراه / مصنعة)": "خامات مصنعة ومجمعة",
      "سعر التكلفة (ج.م)": 35.0,
      "سعر البيع (ج.م)": 70.0,
      "ضريبة القيمة المضافة (ج.م)": 14.0,
      "السعر شامل الضريبة (ج.م)": 84.0,
      "هامش الربح (%)": "50%",
      "الرصيد الافتتاحي (Qty)": 50,
      "حد الأمان / الحد الأدنى (Min Stock)": 15,
      "مادة خام (نعم/لا)": "لا",
      "عرض في كاشير POS (نعم/لا)": "نعم",
      "تتبع المخزون (نعم/لا)": "نعم",
      "سعر العميل المميز VIP (ج.م)": 60.0,
      "تاريخ سريان سعر VIP": "2026-12-31",
      "العملاء المستحقين لـ VIP": "فندق الماسة, مطاعم وكافيهات سيزار",
      "مكونات وخامات الوصفة (Recipe / BOM)": "سكر: 0.1: كجم | لبن بخيره: 0.5: لتر | زبدة لوتس: 0.05: كجم | عبوة تقديم: 1: علبة",
      "رابط صورة المنتج (URL)": "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500",
    },
    {
      "كود الصنف (SKU)": "FAC-1002",
      "اسم الصنف (عربي)": "سكر خشن نقي أكياس",
      "اسم الصنف (إنجليزي)": "Pure Coarse Sugar 1kg",
      "جهة الإنتاج / التكويد (مصنع / فرع)": "منتج مصنع (FAC-)",
      "التصنيف الفني (دليل ERP)": "مادة خام ومستلزمات",
      "التصنيف (Category)": options?.categories?.[1]?.name.ar || "خامات ومواد أولية",
      "المخزن (Warehouse)": options?.warehouses?.[0]?.name.ar || "مستودع الخامات الجافة",
      "الوحدة (Unit)": "KG",
      "المجموعة (Group)": "مشروبات وإضافات",
      "الفرع (Branch)": "جميع الفروع",
      "القسم / العنبر (Department)": "المخزن الرئيسي",
      "التصنيف الداخلي (خام / لف وحزم)": "مواد خام تغذية",
      "طبيعة الخامة (خامات مشتراه / مصنعة)": "خامات مشتراه",
      "سعر التكلفة (ج.م)": 23.5,
      "سعر البيع (ج.م)": 28.0,
      "ضريبة القيمة المضافة (ج.م)": 14.0,
      "السعر شامل الضريبة (ج.م)": 42.0,
      "هامش الربح (%)": "16%",
      "الرصيد الافتتاحي (Qty)": 150,
      "حد الأمان / الحد الأدنى (Min Stock)": 30,
      "مادة خام (نعم/لا)": "نعم",
      "عرض في كاشير POS (نعم/لا)": "لا",
      "تتبع المخزون (نعم/لا)": "نعم",
      "سعر العميل المميز VIP (ج.م)": 26.0,
      "تاريخ سريان سعر VIP": "2026-12-31",
      "العملاء المستحقين لـ VIP": "جميع عملاء VIP",
      "مكونات وخامات الوصفة (Recipe / BOM)": "",
      "رابط صورة المنتج (URL)": "",
    },
    {
      "كود الصنف (SKU)": "FAC-2010",
      "اسم الصنف (عربي)": "صاج كيك فادج شوكولاتة خام",
      "اسم الصنف (إنجليزي)": "Chocolate Fudge Sponge Sheet",
      "جهة الإنتاج / التكويد (مصنع / فرع)": "منتج مصنع (FAC-)",
      "التصنيف الفني (دليل ERP)": "نصف مصنّع (مصنع)",
      "التصنيف (Category)": "كيك وتشييز",
      "المخزن (Warehouse)": "قسم الأسبونش والفادج",
      "الوحدة (Unit)": "SAJ",
      "المجموعة (Group)": "طواجن ساخنة",
      "الفرع (Branch)": "المصنع المركزي",
      "القسم / العنبر (Department)": "عنبر الخبيز والأفران",
      "التصنيف الداخلي (خام / لف وحزم)": "خامات مصنعة ونصف مصنعة",
      "طبيعة الخامة (خامات مشتراه / مصنعة)": "خامات مصنعة",
      "سعر التكلفة (ج.م)": 140.0,
      "سعر البيع (ج.م)": 180.0,
      "ضريبة القيمة المضافة (ج.م)": 14.0,
      "السعر شامل الضريبة (ج.م)": 194.0,
      "هامش الربح (%)": "22%",
      "الرصيد الافتتاحي (Qty)": 20,
      "حد الأمان / الحد الأدنى (Min Stock)": 5,
      "مادة خام (نعم/لا)": "نعم",
      "عرض في كاشير POS (نعم/لا)": "لا",
      "تتبع المخزون (نعم/لا)": "نعم",
      "سعر العميل المميز VIP (ج.م)": 165.0,
      "تاريخ سريان سعر VIP": "2026-12-31",
      "العملاء المستحقين لـ VIP": "مطاعم وكافيهات سيزار",
      "مكونات وخامات الوصفة (Recipe / BOM)": "دقيق جولد: 2: كجم | كاكاو إسباني: 0.5: كجم | بيض طازج: 12: بيضة | زبدة فيرن: 0.8: كجم",
      "رابط صورة المنتج (URL)": "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws["!cols"] = [
    { wch: 18 }, // SKU
    { wch: 30 }, // Name AR
    { wch: 30 }, // Name EN
    { wch: 25 }, // Production / Coding
    { wch: 26 }, // Technical Type
    { wch: 24 }, // Category
    { wch: 26 }, // Warehouse
    { wch: 15 }, // Unit
    { wch: 18 }, // Group
    { wch: 22 }, // Branch
    { wch: 26 }, // Department
    { wch: 26 }, // Classification
    { wch: 28 }, // Raw Type
    { wch: 18 }, // Cost Price
    { wch: 18 }, // Selling Price
    { wch: 24 }, // VAT
    { wch: 24 }, // Total Price with VAT
    { wch: 16 }, // Margin %
    { wch: 22 }, // Qty
    { wch: 24 }, // Min Stock
    { wch: 18 }, // Is Raw
    { wch: 24 }, // Show on POS
    { wch: 20 }, // Track Inventory
    { wch: 25 }, // VIP Price
    { wch: 22 }, // VIP Valid Until
    { wch: 34 }, // VIP Clients
    { wch: 45 }, // Recipe / BOM
    { wch: 38 }, // Image URL
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الأصناف_Products_Template");

  // Reference Guide sheet
  const referenceRows: Record<string, any>[] = [
    {
      "الحقل في النموذج": "جهة الإنتاج / التكويد (مصنع / فرع)",
      "القيم المقبولة": "منتج فرع (BRN-) | منتج مصنع (FAC-)",
      "الشرح والتوجيه": "يحدد كود الصنف التلقائي والجهة المسؤولة عن تحضير الصنف (المصنع المركزي أو الفرع الميداني)",
    },
    {
      "الحقل في النموذج": "التصنيف الفني (دليل ERP)",
      "القيم المقبولة": "تجميع عند الطلب (فرع) | نصف مصنّع (مصنع) | مادة خام ومستلزمات | منتج تام جاهز مخزن",
      "الشرح والتوجيه": "تجميع عند الطلب: يجمع للعميل فوراً | نصف مصنع: ينتجه المصنع كقواعد وصوصات | مادة خام: خامات الموردين | منتج تام: مخزن برصيد مادي",
    },
    {
      "الحقل في النموذج": "ضريبة القيمة المضافة (ج.م)",
      "القيم المقبولة": "قيمة رقمية بالجنيه المصري (الافتراضي 14)",
      "الشرح والتوجيه": "قيمة ضريبة القيمة المضافة المحددة للصنف (14 EGP)، وتضاف تلقائياً في فواتير ونقاط البيع",
    },
    {
      "الحقل في النموذج": "سعر العميل المميز VIP (ج.م)",
      "القيم المقبولة": "قيمة رقمية اختيارية",
      "الشرح والتوجيه": "سعر تفضيلي يطبق تلقائياً عند اختيار عميل معتمد في الفواتير أو الكاشير",
    },
    {
      "الحقل في النموذج": "العملاء المستحقين لـ VIP",
      "القيم المقبولة": "جميع عملاء VIP (أو أسماء/أرقام العملاء مفصولة بفاصلة)",
      "الشرح والتوجيه": "مثال: فندق الماسة, مطاعم وكافيهات سيزار (أو اكتب 'جميع عملاء VIP')",
    },
    {
      "الحقل في النموذج": "مكونات وخامات الوصفة (Recipe / BOM)",
      "القيم المقبولة": "اسم الخامة: الكمية: الوحدة | اسم الخامة: الكمية: الوحدة",
      "الشرح والتوجيه": "تحديد خامات الصنف لخصمها تلقائياً من رصيد المخزن عند كل بيع وحساب تكلفة الإنتاج بدقة",
    },
    {
      "الحقل في النموذج": "مادة خام (نعم/لا)",
      "القيم المقبولة": "نعم أو لا",
      "الشرح والتوجيه": "نعم للخامات المشتراة من الموردين ولا للمنتجات التامة والمجمعة",
    },
    {
      "الحقل في النموذج": "عرض في كاشير POS (نعم/لا)",
      "القيم المقبولة": "نعم أو لا",
      "الشرح والتوجيه": "نعم لإظهار الصنف في شاشة البيع المباشر للمستخدمين والكاشير",
    },
    {
      "الحقل في النموذج": "تتبع المخزون (نعم/لا)",
      "القيم المقبولة": "نعم أو لا",
      "الشرح والتوجيه": "نعم لتتبع حركات الإدخال والصرف وجرد المخازن",
    },
  ];

  // Add system categories, warehouses, and units to reference sheet
  if (options?.categories && options.categories.length > 0) {
    referenceRows.push({
      "الحقل في النموذج": "التصنيفات المتاحة حالياً بالنظام",
      "القيم المقبولة": options.categories.map((c) => c.name.ar).join(" | "),
      "الشرح والتوجيه": "يمكنك كتابة اسم التصنيف أو كوده مباشرة داخل عمود التصنيف",
    });
  }
  if (options?.warehouses && options.warehouses.length > 0) {
    referenceRows.push({
      "الحقل في النموذج": "المخازن والمستودعات المتاحة",
      "القيم المقبولة": options.warehouses.map((w) => w.name.ar).join(" | "),
      "الشرح والتوجيه": "يمكنك كتابة اسم المخزن أو كوده مباشرة داخل عمود المخزن",
    });
  }
  if (options?.units && options.units.length > 0) {
    referenceRows.push({
      "الحقل في النموذج": "وحدات القياس المتاحة",
      "القيم المقبولة": options.units.map((u) => `${u.name.ar} (${u.code})`).join(" | "),
      "الشرح والتوجيه": "استخدم كود الوحدة مثل KG, PCS, BOX, LTR, SAJ",
    });
  }
  if (options?.branches && options.branches.length > 0) {
    referenceRows.push({
      "الحقل في النموذج": "الفروع المتاحة",
      "القيم المقبولة": options.branches.map((b) => b.name.ar).join(" | ") + " | جميع الفروع",
      "الشرح والتوجيه": "حدد فرعاً معيناً أو اتركه 'جميع الفروع' لتعميمه على كل نقاط البيع",
    });
  }

  const refWs = XLSX.utils.json_to_sheet(referenceRows);
  refWs["!cols"] = [{ wch: 34 }, { wch: 60 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, refWs, "دليل_الحقول_Guide");

  return wb;
}
