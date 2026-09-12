import * as XLSX from "xlsx";
import type { EmployeeRecord, AttendanceRecord, PayslipItem } from "@/lib/hr-store";

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
  XLSX.writeFile(workbook, actualFilename);
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
  XLSX.writeFile(workbook, actualFilename);
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

  XLSX.writeFile(workbook, "employees_import_template.xlsx");
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
            directManager: (row["المدير المباشر"] || "م. حافظ رحيم").toString().trim(),
            hireDate,
            gender,
            contractType,
            employmentType: "full_time",
            status: "active",
            avatarBg,
            avatarInitials: initials,
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
