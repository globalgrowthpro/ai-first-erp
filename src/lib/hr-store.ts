import { useState, useEffect, useCallback } from "react";

export type EmploymentType = "full_time" | "part_time" | "shift" | "seasonal" | "contract";

export type EmployeeStatus = "active" | "on_leave" | "probation" | "suspended" | "terminated";

export type HealthCertStatus = "valid" | "expiring_soon" | "expired" | "not_required";

export interface CompensationDetails {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  kpiBonus: number;
  socialInsuranceRate: number; // e.g. 0.11
  taxRate: number; // e.g. 0.05
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  iban: string;
  walletNumber?: string; // e.g. Vodafone Cash / InstaPay
}

export interface EmployeeRecord {
  id: string;
  code: string; // e.g. EMP-101
  name: { ar: string; en: string };
  nationalId: string;
  email: string;
  phone: string;
  emergencyContact: {
    name: string;
    phone: string;
    relation: { ar: string; en: string };
  };
  departmentId: string;
  departmentName: { ar: string; en: string };
  positionId: string;
  positionName: { ar: string; en: string };
  branchId: string;
  branchName: { ar: string; en: string };
  directManager: string;
  hireDate: string;
  gender: "male" | "female";
  contractType: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  avatarBg: string;
  avatarInitials: string;
  compensation: CompensationDetails;
  bank: BankDetails;
  healthCert: {
    number: string;
    expiryDate: string;
    status: HealthCertStatus;
  };
  leaveBalances: {
    annualTotal: number;
    annualUsed: number;
    sickTotal: number;
    sickUsed: number;
    emergencyTotal: number;
    emergencyUsed: number;
  };
}

export type AttendanceStatus = "present" | "late" | "absent" | "half_day" | "on_leave";

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeCode: string;
  employeeName: { ar: string; en: string };
  departmentName: { ar: string; en: string };
  shiftName: { ar: string; en: string };
  checkIn: string; // HH:MM
  checkOut: string; // HH:MM
  status: AttendanceStatus;
  overtimeHours: number;
  lateMinutes: number;
  notes?: string;
}

export type LeaveType = "annual" | "sick" | "emergency" | "unpaid" | "hajj" | "maternity";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: { ar: string; en: string };
  departmentName: { ar: string; en: string };
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  contactWhileAway: string;
  status: LeaveStatus;
  appliedDate: string;
  reviewedBy?: string;
  reviewDate?: string;
  reviewNotes?: string;
}

export type PayrollRunStatus = "draft" | "approved" | "posted_to_gl";

export interface PayslipItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: { ar: string; en: string };
  departmentName: { ar: string; en: string };
  positionName: { ar: string; en: string };
  period: string; // e.g. "2026-09"
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  kpiBonus: number;
  overtimeHours: number;
  overtimePay: number;
  grossSalary: number;
  socialInsuranceDeduction: number;
  taxDeduction: number;
  absencePenalties: number;
  advanceDeduction: number;
  totalDeductions: number;
  netSalary: number;
  paymentMethod: "bank_transfer" | "instapay" | "cash";
  status: "pending" | "paid";
}

export interface PayrollRun {
  id: string;
  period: string; // e.g. "2026-09"
  title: { ar: string; en: string };
  runDate: string;
  status: PayrollRunStatus;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  postedJournalId?: string;
  payslips: PayslipItem[];
}

export interface HrAiInsight {
  id: string;
  type: "warning" | "info" | "action" | "success";
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  metric?: string;
  suggestedAction?: { ar: string; en: string };
  department?: string;
  actionKey?: string;
}

const STORAGE_KEY_EMPLOYEES = "wazeer_erp_hr_employees_v1";
const STORAGE_KEY_ATTENDANCE = "wazeer_erp_hr_attendance_v1";
const STORAGE_KEY_LEAVES = "wazeer_erp_hr_leaves_v1";
const STORAGE_KEY_PAYROLL = "wazeer_erp_hr_payroll_v1";

export const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: "emp-101",
    code: "EMP-1001",
    name: { ar: "شيف إبراهيم البدري", en: "Chef Ibrahim El-Badry" },
    nationalId: "28405120101955",
    email: "kitchen@wazeer-elhelw.com",
    phone: "+20 10 9988 7766",
    emergencyContact: {
      name: "فاطمة البدري (زوجة)",
      phone: "+20 10 1122 3344",
      relation: { ar: "زوجة", en: "Spouse" },
    },
    departmentId: "dept-kitchen",
    departmentName: { ar: "المطبخ المركزي والتصنيع", en: "Central Kitchen & Manufacturing" },
    positionId: "pos-head-chef",
    positionName: { ar: "كبير حلوانية ومدير الإنتاج", en: "Head Pastry Chef & Production Lead" },
    branchId: "br-tenth",
    branchName: { ar: "مصنع العاشر من رمضان", en: "10th of Ramadan Factory" },
    directManager: "م. حافظ رحيم",
    hireDate: "2022-03-15",
    gender: "male",
    contractType: "عقد دائم غير محدد المدة (Permanent)",
    employmentType: "full_time",
    status: "active",
    avatarBg: "from-amber-600 to-orange-700",
    avatarInitials: "إب",
    compensation: {
      basicSalary: 28000,
      housingAllowance: 4000,
      transportAllowance: 2000,
      foodAllowance: 1500,
      kpiBonus: 3500,
      socialInsuranceRate: 0.11,
      taxRate: 0.05,
    },
    bank: {
      bankName: "البنك الأهلي المصري (NBE)",
      accountNumber: "1982348761001",
      iban: "EG34000300001982348761001",
      walletNumber: "01099887766",
    },
    healthCert: {
      number: "HC-2026-8812",
      expiryDate: "2027-02-28",
      status: "valid",
    },
    leaveBalances: {
      annualTotal: 21,
      annualUsed: 6,
      sickTotal: 15,
      sickUsed: 1,
      emergencyTotal: 6,
      emergencyUsed: 2,
    },
  },
  {
    id: "emp-102",
    code: "EMP-1002",
    name: { ar: "أحمد سالم", en: "Ahmed Salem" },
    nationalId: "29107240102431",
    email: "sales@wazeer-elhelw.com",
    phone: "+20 11 4455 6677",
    emergencyContact: {
      name: "سالم محمود (والد)",
      phone: "+20 12 3344 5566",
      relation: { ar: "والد", en: "Father" },
    },
    departmentId: "dept-sales",
    departmentName: { ar: "مبيعات التجزئة والفروع", en: "Retail Branches & Sales" },
    positionId: "pos-branch-mgr",
    positionName: { ar: "مدير فرع الكوربة وحفلات التوزيع", en: "Branch Manager (Korba)" },
    branchId: "br-korba",
    branchName: { ar: "فرع الكوربة — مصر الجديدة", en: "Korba Branch — Heliopolis" },
    directManager: "م. حافظ رحيم",
    hireDate: "2023-01-10",
    gender: "male",
    contractType: "عقد محدد المدة 3 سنوات (Fixed-term)",
    employmentType: "full_time",
    status: "active",
    avatarBg: "from-blue-600 to-indigo-700",
    avatarInitials: "أس",
    compensation: {
      basicSalary: 18500,
      housingAllowance: 2500,
      transportAllowance: 1500,
      foodAllowance: 1000,
      kpiBonus: 2500,
      socialInsuranceRate: 0.11,
      taxRate: 0.05,
    },
    bank: {
      bankName: "بنك مصر (Banque Misr)",
      accountNumber: "2441098872002",
      iban: "EG12000200002441098872002",
      walletNumber: "01144556677",
    },
    healthCert: {
      number: "HC-2025-9430",
      expiryDate: "2026-09-28",
      status: "expiring_soon",
    },
    leaveBalances: {
      annualTotal: 21,
      annualUsed: 12,
      sickTotal: 15,
      sickUsed: 0,
      emergencyTotal: 6,
      emergencyUsed: 1,
    },
  },
  {
    id: "emp-103",
    code: "EMP-1003",
    name: { ar: "سارة عبد العزيز", en: "Sarah Abdelaziz" },
    nationalId: "29503180104882",
    email: "sarah.hr@wazeer-elhelw.com",
    phone: "+20 12 7788 9900",
    emergencyContact: {
      name: "د. هاني كمال (زوج)",
      phone: "+20 10 4433 2211",
      relation: { ar: "زوج", en: "Spouse" },
    },
    departmentId: "dept-hr",
    departmentName: { ar: "الموارد البشرية والشؤون الإدارية", en: "HR & People Operations" },
    positionId: "pos-hr-specialist",
    positionName: { ar: "أخصائي أول موارد بشرية واستحقاقات", en: "Senior HR & People Partner" },
    branchId: "br-hq",
    branchName: { ar: "المقر الرئيسي — القاهرة الجديدة", en: "Headquarters — New Cairo" },
    directManager: "م. حافظ رحيم",
    hireDate: "2023-06-01",
    gender: "female",
    contractType: "عقد دائم غير محدد المدة (Permanent)",
    employmentType: "full_time",
    status: "active",
    avatarBg: "from-pink-600 to-rose-700",
    avatarInitials: "سع",
    compensation: {
      basicSalary: 16000,
      housingAllowance: 2000,
      transportAllowance: 1200,
      foodAllowance: 800,
      kpiBonus: 1500,
      socialInsuranceRate: 0.11,
      taxRate: 0.05,
    },
    bank: {
      bankName: "البنك التجاري الدولي (CIB)",
      accountNumber: "1000452391003",
      iban: "EG55001000001000452391003",
      walletNumber: "01277889900",
    },
    healthCert: {
      number: "N/A",
      expiryDate: "",
      status: "not_required",
    },
    leaveBalances: {
      annualTotal: 21,
      annualUsed: 4,
      sickTotal: 15,
      sickUsed: 2,
      emergencyTotal: 6,
      emergencyUsed: 0,
    },
  },
  {
    id: "emp-104",
    code: "EMP-1004",
    name: { ar: "محمود عطية", en: "Mahmoud Attia" },
    nationalId: "28811090103774",
    email: "warehouse@wazeer-elhelw.com",
    phone: "+20 15 2233 4455",
    emergencyContact: {
      name: "حسام عطية (شقيق)",
      phone: "+20 11 8899 0011",
      relation: { ar: "شقيق", en: "Brother" },
    },
    departmentId: "dept-logistics",
    departmentName: { ar: "سلاسل الإمداد والخدمات اللوجستية", en: "Supply Chain & Logistics" },
    positionId: "pos-warehouse-mgr",
    positionName: { ar: "أمين المستودع المركزي والمبرّد", en: "Central Cold Store Supervisor" },
    branchId: "br-tenth",
    branchName: { ar: "مصنع العاشر من رمضان", en: "10th of Ramadan Factory" },
    directManager: "شيف إبراهيم البدري",
    hireDate: "2022-08-20",
    gender: "male",
    contractType: "عقد محدد المدة سنتين (Fixed-term)",
    employmentType: "full_time",
    status: "active",
    avatarBg: "from-cyan-600 to-blue-700",
    avatarInitials: "مع",
    compensation: {
      basicSalary: 14000,
      housingAllowance: 2000,
      transportAllowance: 1500,
      foodAllowance: 1000,
      kpiBonus: 1200,
      socialInsuranceRate: 0.11,
      taxRate: 0.05,
    },
    bank: {
      bankName: "بنك القاهرة (Banque du Caire)",
      accountNumber: "3004521191004",
      iban: "EG90000400003004521191004",
      walletNumber: "01522334455",
    },
    healthCert: {
      number: "HC-2026-3012",
      expiryDate: "2027-04-15",
      status: "valid",
    },
    leaveBalances: {
      annualTotal: 21,
      annualUsed: 8,
      sickTotal: 15,
      sickUsed: 3,
      emergencyTotal: 6,
      emergencyUsed: 1,
    },
  },
  {
    id: "emp-105",
    code: "EMP-1005",
    name: { ar: "طارق النجار", en: "Tarek El-Naggar" },
    nationalId: "29608140108819",
    email: "tarek.chef@wazeer-elhelw.com",
    phone: "+20 10 6655 4433",
    emergencyContact: {
      name: "منى النجار (أخت)",
      phone: "+20 12 9900 1122",
      relation: { ar: "أخت", en: "Sister" },
    },
    departmentId: "dept-kitchen",
    departmentName: { ar: "المطبخ المركزي والتصنيع", en: "Central Kitchen & Manufacturing" },
    positionId: "pos-sous-chef",
    positionName: { ar: "شيف حلواني غربي (شوكولاتة وتورت)", en: "Sous Chef — Pastry & Cakes" },
    branchId: "br-tenth",
    branchName: { ar: "مصنع العاشر من رمضان", en: "10th of Ramadan Factory" },
    directManager: "شيف إبراهيم البدري",
    hireDate: "2023-09-01",
    gender: "male",
    contractType: "عقد موسمي / ورديات (Shift & Seasonal)",
    employmentType: "shift",
    status: "active",
    avatarBg: "from-emerald-600 to-teal-700",
    avatarInitials: "طن",
    compensation: {
      basicSalary: 15500,
      housingAllowance: 2200,
      transportAllowance: 1400,
      foodAllowance: 1200,
      kpiBonus: 1800,
      socialInsuranceRate: 0.11,
      taxRate: 0.05,
    },
    bank: {
      bankName: "البنك الأهلي المصري (NBE)",
      accountNumber: "1982348761005",
      iban: "EG34000300001982348761005",
      walletNumber: "01066554433",
    },
    healthCert: {
      number: "HC-2025-4109",
      expiryDate: "2026-08-30",
      status: "expired",
    },
    leaveBalances: {
      annualTotal: 21,
      annualUsed: 5,
      sickTotal: 15,
      sickUsed: 0,
      emergencyTotal: 6,
      emergencyUsed: 0,
    },
  },
  {
    id: "emp-106",
    code: "EMP-1006",
    name: { ar: "ياسمين الشناوي", en: "Yasmine El-Shennawy" },
    nationalId: "29801220109923",
    email: "yasmine.sales@wazeer-elhelw.com",
    phone: "+20 11 9922 3344",
    emergencyContact: {
      name: "محمد الشناوي (زوج)",
      phone: "+20 10 5544 3322",
      relation: { ar: "زوج", en: "Spouse" },
    },
    departmentId: "dept-sales",
    departmentName: { ar: "مبيعات التجزئة والفروع", en: "Retail Branches & Sales" },
    positionId: "pos-cashier",
    positionName: { ar: "مشرفة صالة ومبيعات (فرع المعادي)", en: "Front-of-House Lead (Maadi)" },
    branchId: "br-maadi",
    branchName: { ar: "فرع المعادي — دجلة", en: "Maadi Branch — Degla" },
    directManager: "أحمد سالم",
    hireDate: "2024-02-15",
    gender: "female",
    contractType: "عقد سنوي متجدد (Annual Renewable)",
    employmentType: "full_time",
    status: "active",
    avatarBg: "from-purple-600 to-indigo-700",
    avatarInitials: "يش",
    compensation: {
      basicSalary: 9500,
      housingAllowance: 1200,
      transportAllowance: 1000,
      foodAllowance: 800,
      kpiBonus: 1000,
      socialInsuranceRate: 0.11,
      taxRate: 0.05,
    },
    bank: {
      bankName: "بنك مصر (Banque Misr)",
      accountNumber: "2441098872006",
      iban: "EG12000200002441098872006",
      walletNumber: "01199223344",
    },
    healthCert: {
      number: "HC-2026-7281",
      expiryDate: "2027-01-20",
      status: "valid",
    },
    leaveBalances: {
      annualTotal: 21,
      annualUsed: 2,
      sickTotal: 15,
      sickUsed: 1,
      emergencyTotal: 6,
      emergencyUsed: 0,
    },
  },
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: "att-101",
    date: "2026-09-12",
    employeeId: "emp-101",
    employeeCode: "EMP-1001",
    employeeName: { ar: "شيف إبراهيم البدري", en: "Chef Ibrahim El-Badry" },
    departmentName: { ar: "المطبخ المركزي والتصنيع", en: "Central Kitchen" },
    shiftName: { ar: "وردية الصباح الأولى (06:00 - 14:30)", en: "Early Morning (06:00 - 14:30)" },
    checkIn: "05:52",
    checkOut: "16:30",
    status: "present",
    overtimeHours: 2.0,
    lateMinutes: 0,
    notes: "إشراف على خلط شوكولاتة نوتيلا وكشري حلو لطلبيات الفروع المبكرة",
  },
  {
    id: "att-102",
    date: "2026-09-12",
    employeeId: "emp-102",
    employeeCode: "EMP-1002",
    employeeName: { ar: "أحمد سالم", en: "Ahmed Salem" },
    departmentName: { ar: "مبيعات التجزئة والفروع", en: "Retail Branches" },
    shiftName: { ar: "وردية افتتاح الفرع (09:00 - 17:30)", en: "Store Opening (09:00 - 17:30)" },
    checkIn: "09:22",
    checkOut: "17:45",
    status: "late",
    overtimeHours: 0,
    lateMinutes: 22,
    notes: "ازدحام مروري بطريق العروبة — تم إخطار الإدارة",
  },
  {
    id: "att-103",
    date: "2026-09-12",
    employeeId: "emp-103",
    employeeCode: "EMP-1003",
    employeeName: { ar: "سارة عبد العزيز", en: "Sarah Abdelaziz" },
    departmentName: { ar: "الموارد البشرية والشؤون الإدارية", en: "HR & People Operations" },
    shiftName: { ar: "دوام المقر الرئيسي (09:00 - 17:00)", en: "HQ Normal (09:00 - 17:00)" },
    checkIn: "08:55",
    checkOut: "17:05",
    status: "present",
    overtimeHours: 0,
    lateMinutes: 0,
    notes: "مراجعة كشوفات حضور مصنع العاشر وإصدار عقود جديدة",
  },
  {
    id: "att-104",
    date: "2026-09-12",
    employeeId: "emp-104",
    employeeCode: "EMP-1004",
    employeeName: { ar: "محمود عطية", en: "Mahmoud Attia" },
    departmentName: { ar: "سلاسل الإمداد والخدمات اللوجستية", en: "Supply Chain & Logistics" },
    shiftName: { ar: "وردية استلام وتوريد (07:00 - 15:30)", en: "Receiving Shift (07:00 - 15:30)" },
    checkIn: "06:58",
    checkOut: "17:00",
    status: "present",
    overtimeHours: 1.5,
    lateMinutes: 0,
    notes: "استلام شحنة عبوات كرتون الأهرام وتفريغ شحنة حليب جهينة",
  },
  {
    id: "att-105",
    date: "2026-09-12",
    employeeId: "emp-105",
    employeeCode: "EMP-1005",
    employeeName: { ar: "طارق النجار", en: "Tarek El-Naggar" },
    departmentName: { ar: "المطبخ المركزي والتصنيع", en: "Central Kitchen" },
    shiftName: { ar: "وردية الطهي والحلويات (08:00 - 16:30)", en: "Cooking Shift (08:00 - 16:30)" },
    checkIn: "07:50",
    checkOut: "18:00",
    status: "present",
    overtimeHours: 1.5,
    lateMinutes: 0,
    notes: "تجهيز وتزيين تورتات حفلة فندق شيراتون",
  },
  {
    id: "att-106",
    date: "2026-09-12",
    employeeId: "emp-106",
    employeeCode: "EMP-1006",
    employeeName: { ar: "ياسمين الشناوي", en: "Yasmine El-Shennawy" },
    departmentName: { ar: "مبيعات التجزئة والفروع", en: "Retail Branches" },
    shiftName: { ar: "وردية مسائية (14:00 - 22:30)", en: "Evening Shift (14:00 - 22:30)" },
    checkIn: "13:50",
    checkOut: "22:45",
    status: "present",
    overtimeHours: 0.25,
    lateMinutes: 0,
    notes: "إغلاق نقطة البيع ومطابقة النقدية مع تقرير الـ POS اليومي",
  },
];

export const INITIAL_LEAVES: LeaveRequest[] = [
  {
    id: "lev-201",
    employeeId: "emp-102",
    employeeCode: "EMP-1002",
    employeeName: { ar: "أحمد سالم", en: "Ahmed Salem" },
    departmentName: { ar: "مبيعات التجزئة والفروع", en: "Retail Branches" },
    leaveType: "annual",
    startDate: "2026-09-18",
    endDate: "2026-09-21",
    daysCount: 3,
    reason: "إجازة عائلية قصيرة وترتيبات خاصة",
    contactWhileAway: "+20 11 4455 6677",
    status: "pending",
    appliedDate: "2026-09-10",
  },
  {
    id: "lev-202",
    employeeId: "emp-105",
    employeeCode: "EMP-1005",
    employeeName: { ar: "طارق النجار", en: "Tarek El-Naggar" },
    departmentName: { ar: "المطبخ المركزي والتصنيع", en: "Central Kitchen" },
    leaveType: "emergency",
    startDate: "2026-09-14",
    endDate: "2026-09-15",
    daysCount: 2,
    reason: "ظرف عائلي طارئ وتجديد الشهادة الصحية في مكتب الصحة",
    contactWhileAway: "+20 10 6655 4433",
    status: "pending",
    appliedDate: "2026-09-11",
  },
  {
    id: "lev-203",
    employeeId: "emp-101",
    employeeCode: "EMP-1001",
    employeeName: { ar: "شيف إبراهيم البدري", en: "Chef Ibrahim El-Badry" },
    departmentName: { ar: "المطبخ المركزي والتصنيع", en: "Central Kitchen" },
    leaveType: "annual",
    startDate: "2026-08-10",
    endDate: "2026-08-14",
    daysCount: 4,
    reason: "راحة سنوية بعد انتهاء موسم صيف الإسكندرية",
    contactWhileAway: "+20 10 9988 7766",
    status: "approved",
    appliedDate: "2026-08-01",
    reviewedBy: "م. حافظ رحيم",
    reviewDate: "2026-08-02",
    reviewNotes: "تم الاعتماد مع تكليف شيف طارق بإدارة الوردية أثناء الغياب",
  },
  {
    id: "lev-204",
    employeeId: "emp-104",
    employeeCode: "EMP-1004",
    employeeName: { ar: "محمود عطية", en: "Mahmoud Attia" },
    departmentName: { ar: "سلاسل الإمداد والخدمات اللوجستية", en: "Supply Chain" },
    leaveType: "sick",
    startDate: "2026-08-22",
    endDate: "2026-08-23",
    daysCount: 2,
    reason: "نزلة برد حادة ومرفق تقرير التأمين الصحي",
    contactWhileAway: "+20 15 2233 4455",
    status: "approved",
    appliedDate: "2026-08-22",
    reviewedBy: "سارة عبد العزيز",
    reviewDate: "2026-08-23",
    reviewNotes: "تم التحقق من التقرير الطبي وخصمه من رصيد الإجازات المرضية",
  },
];

export const INITIAL_PAYROLL_RUNS: PayrollRun[] = [
  {
    id: "pr-2026-09",
    period: "2026-09",
    title: { ar: "مسير رواتب سبتمبر 2026", en: "September 2026 Payroll Run" },
    runDate: "2026-09-12",
    status: "draft",
    totalEmployees: 6,
    totalGross: 132450,
    totalDeductions: 22610,
    totalNet: 109840,
    payslips: [
      {
        id: "ps-09-101",
        payrollRunId: "pr-2026-09",
        employeeId: "emp-101",
        employeeCode: "EMP-1001",
        employeeName: { ar: "شيف إبراهيم البدري", en: "Chef Ibrahim El-Badry" },
        departmentName: { ar: "المطبخ المركزي والتصنيع", en: "Central Kitchen" },
        positionName: { ar: "كبير حلوانية ومدير الإنتاج", en: "Head Pastry Chef" },
        period: "2026-09",
        basicSalary: 28000,
        housingAllowance: 4000,
        transportAllowance: 2000,
        foodAllowance: 1500,
        kpiBonus: 3500,
        overtimeHours: 14,
        overtimePay: 2940,
        grossSalary: 41940,
        socialInsuranceDeduction: 3080,
        taxDeduction: 2097,
        absencePenalties: 0,
        advanceDeduction: 0,
        totalDeductions: 5177,
        netSalary: 36763,
        paymentMethod: "bank_transfer",
        status: "pending",
      },
      {
        id: "ps-09-102",
        payrollRunId: "pr-2026-09",
        employeeId: "emp-102",
        employeeCode: "EMP-1002",
        employeeName: { ar: "أحمد سالم", en: "Ahmed Salem" },
        departmentName: { ar: "مبيعات التجزئة والفروع", en: "Retail Branches" },
        positionName: { ar: "مدير فرع الكوربة وحفلات التوزيع", en: "Branch Manager" },
        period: "2026-09",
        basicSalary: 18500,
        housingAllowance: 2500,
        transportAllowance: 1500,
        foodAllowance: 1000,
        kpiBonus: 2500,
        overtimeHours: 6,
        overtimePay: 832,
        grossSalary: 26832,
        socialInsuranceDeduction: 2035,
        taxDeduction: 1341,
        absencePenalties: 120,
        advanceDeduction: 1000,
        totalDeductions: 4496,
        netSalary: 22336,
        paymentMethod: "bank_transfer",
        status: "pending",
      },
      {
        id: "ps-09-103",
        payrollRunId: "pr-2026-09",
        employeeId: "emp-103",
        employeeCode: "EMP-1003",
        employeeName: { ar: "سارة عبد العزيز", en: "Sarah Abdelaziz" },
        departmentName: { ar: "الموارد البشرية والشؤون الإدارية", en: "HR Operations" },
        positionName: { ar: "أخصائي أول موارد بشرية", en: "Senior HR Partner" },
        period: "2026-09",
        basicSalary: 16000,
        housingAllowance: 2000,
        transportAllowance: 1200,
        foodAllowance: 800,
        kpiBonus: 1500,
        overtimeHours: 0,
        overtimePay: 0,
        grossSalary: 21500,
        socialInsuranceDeduction: 1760,
        taxDeduction: 1075,
        absencePenalties: 0,
        advanceDeduction: 0,
        totalDeductions: 2835,
        netSalary: 18665,
        paymentMethod: "bank_transfer",
        status: "pending",
      },
      {
        id: "ps-09-104",
        payrollRunId: "pr-2026-09",
        employeeId: "emp-104",
        employeeCode: "EMP-1004",
        employeeName: { ar: "محمود عطية", en: "Mahmoud Attia" },
        departmentName: { ar: "سلاسل الإمداد والخدمات اللوجستية", en: "Logistics" },
        positionName: { ar: "أمين المستودع المركزي والمبرّد", en: "Cold Store Lead" },
        period: "2026-09",
        basicSalary: 14000,
        housingAllowance: 2000,
        transportAllowance: 1500,
        foodAllowance: 1000,
        kpiBonus: 1200,
        overtimeHours: 12,
        overtimePay: 1260,
        grossSalary: 20960,
        socialInsuranceDeduction: 1540,
        taxDeduction: 1048,
        absencePenalties: 0,
        advanceDeduction: 500,
        totalDeductions: 3088,
        netSalary: 17872,
        paymentMethod: "instapay",
        status: "pending",
      },
      {
        id: "ps-09-105",
        payrollRunId: "pr-2026-09",
        employeeId: "emp-105",
        employeeCode: "EMP-1005",
        employeeName: { ar: "طارق النجار", en: "Tarek El-Naggar" },
        departmentName: { ar: "المطبخ المركزي والتصنيع", en: "Central Kitchen" },
        positionName: { ar: "شيف حلواني غربي", en: "Sous Chef" },
        period: "2026-09",
        basicSalary: 15500,
        housingAllowance: 2200,
        transportAllowance: 1400,
        foodAllowance: 1200,
        kpiBonus: 1800,
        overtimeHours: 10,
        overtimePay: 1162,
        grossSalary: 23262,
        socialInsuranceDeduction: 1705,
        taxDeduction: 1163,
        absencePenalties: 0,
        advanceDeduction: 0,
        totalDeductions: 2868,
        netSalary: 20394,
        paymentMethod: "bank_transfer",
        status: "pending",
      },
      {
        id: "ps-09-106",
        payrollRunId: "pr-2026-09",
        employeeId: "emp-106",
        employeeCode: "EMP-1006",
        employeeName: { ar: "ياسمين الشناوي", en: "Yasmine El-Shennawy" },
        departmentName: { ar: "مبيعات التجزئة والفروع", en: "Retail Branches" },
        positionName: { ar: "مشرفة صالة ومبيعات (فرع المعادي)", en: "Front Lead" },
        period: "2026-09",
        basicSalary: 9500,
        housingAllowance: 1200,
        transportAllowance: 1000,
        foodAllowance: 800,
        kpiBonus: 1000,
        overtimeHours: 4,
        overtimePay: 271,
        grossSalary: 13771,
        socialInsuranceDeduction: 1045,
        taxDeduction: 688,
        absencePenalties: 0,
        advanceDeduction: 0,
        totalDeductions: 1733,
        netSalary: 12038,
        paymentMethod: "instapay",
        status: "pending",
      },
    ],
  },
];

export const INITIAL_AI_INSIGHTS: HrAiInsight[] = [
  {
    id: "ins-1",
    type: "warning",
    title: { ar: "شهادة صحية منتهية الصلاحية (مطبخ العاشر)", en: "Expired Health Certificate (Central Kitchen)" },
    description: {
      ar: "شيف طارق النجار (EMP-1005) انتهت شهادته الصحية في 2026-08-30. مطلوب فحص مكتب صحة فوري لتجنب مخالفات هيئة سلامة الغذاء.",
      en: "Chef Tarek El-Naggar's health certificate expired on 2026-08-30. Immediate clinic testing required to comply with food safety standards.",
    },
    metric: "شهادة منتهية",
    suggestedAction: { ar: "إصدار خطاب إحالة لمكتب صحة العاشر", en: "Issue Health Clinic Referral Letter" },
    department: "المطبخ المركزي",
    actionKey: "renew_health_cert",
  },
  {
    id: "ins-2",
    type: "info",
    title: { ar: "ذروة ساعات عمل إضافية للمصنع قبل المولد النبوي", en: "Overtime Spike Before Mawlid Season" },
    description: {
      ar: "سجل طاقم التصنيع والمخبز 56 ساعة عمل إضافية هذا الأسبوع (+32% عن المتوسط الشهري) لتلبية طلبيات حلاوة المولد وموسم الاحتفالات.",
      en: "Central kitchen recorded 56 overtime hours this week (+32% above average) due to festive confectionery surge.",
    },
    metric: "+32% Overtime",
    suggestedAction: { ar: "اعتماد بدل الساعات الإضافية لمسير سبتمبر", en: "Approve Overtime Payout for September" },
    department: "المطبخ المركزي والتصنيع",
    actionKey: "approve_overtime",
  },
  {
    id: "ins-3",
    type: "action",
    title: { ar: "شهادة صحية تقترب من التجديد (فرع الكوربة)", en: "Health Cert Expiring Soon (Korba Branch)" },
    description: {
      ar: "شهادة أ. أحمد سالم (EMP-1002) تنتهي خلال 16 يوماً (2026-09-28). تم جدولة التنبيه التلقائي للموظف.",
      en: "Ahmed Salem's health cert expires in 16 days (2026-09-28). Automated reminder dispatched.",
    },
    metric: "16 يوم متبقي",
    suggestedAction: { ar: "إرسال إشعار للموظف عبر واتساب", en: "Send WhatsApp Alert to Employee" },
    department: "مبيعات التجزئة",
    actionKey: "notify_employee",
  },
  {
    id: "ins-4",
    type: "success",
    title: { ar: "انضباط الحضور والدوام بنسبة 96.4%", en: "High Attendance Discipline (96.4%)" },
    description: {
      ar: "معدل الالتزام بمواعيد الوردية الصباحية والمسائية عبر جميع الفروع وصل إلى 96.4% خلال شهر سبتمبر الحالي، وهو الأعلى هذا العام.",
      en: "Shift punctuality and attendance reached 96.4% across all branches in September, the highest year-to-date.",
    },
    metric: "96.4% معدل الالتزام",
    suggestedAction: { ar: "صرف مكافأة الالتزام (KPI) للمنضبطين", en: "Disburse Punctuality KPI Bonus" },
    department: "جميع الإدارات",
    actionKey: "punctuality_bonus",
  },
];

export function useHrStore() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(() => {
    if (typeof window === "undefined") return INITIAL_EMPLOYEES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load HR employees", e);
    }
    return INITIAL_EMPLOYEES;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    if (typeof window === "undefined") return INITIAL_ATTENDANCE;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load HR attendance", e);
    }
    return INITIAL_ATTENDANCE;
  });

  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => {
    if (typeof window === "undefined") return INITIAL_LEAVES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LEAVES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load HR leaves", e);
    }
    return INITIAL_LEAVES;
  });

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(() => {
    if (typeof window === "undefined") return INITIAL_PAYROLL_RUNS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAYROLL);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load HR payroll runs", e);
    }
    return INITIAL_PAYROLL_RUNS;
  });

  const [insights, setInsights] = useState<HrAiInsight[]>(INITIAL_AI_INSIGHTS);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
    } catch (e) {
      console.error("Failed to save HR employees", e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendance));
    } catch (e) {
      console.error("Failed to save HR attendance", e);
    }
  }, [attendance]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LEAVES, JSON.stringify(leaves));
    } catch (e) {
      console.error("Failed to save HR leaves", e);
    }
  }, [leaves]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PAYROLL, JSON.stringify(payrollRuns));
    } catch (e) {
      console.error("Failed to save HR payroll", e);
    }
  }, [payrollRuns]);

  // Employee actions
  const addEmployee = useCallback((empData: Omit<EmployeeRecord, "id" | "code"> & { code?: string }) => {
    const nextNum = 1000 + employees.length + 1;
    const newEmp: EmployeeRecord = {
      ...empData,
      id: `emp-${Date.now()}`,
      code: empData.code?.trim() || `EMP-${nextNum}`,
    };
    setEmployees((prev) => [newEmp, ...prev]);
    return newEmp;
  }, [employees.length]);

  const updateEmployee = useCallback((id: string, updates: Partial<EmployeeRecord>) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp))
    );
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
  }, []);

  const bulkAddEmployees = useCallback((newEmps: Omit<EmployeeRecord, "id">[]) => {
    const records: EmployeeRecord[] = newEmps.map((emp, i) => ({
      ...emp,
      id: `emp-${Date.now()}-${i}`,
    }));
    setEmployees((prev) => [...records, ...prev]);
    return records.length;
  }, []);

  // Attendance actions
  const logAttendance = useCallback((record: Omit<AttendanceRecord, "id">) => {
    const newRecord: AttendanceRecord = {
      ...record,
      id: `att-${Date.now()}`,
    };
    setAttendance((prev) => [newRecord, ...prev]);
    return newRecord;
  }, []);

  const bulkCheckIn = useCallback((date: string) => {
    const existingEmpIds = new Set(attendance.filter((a) => a.date === date).map((a) => a.employeeId));
    const newRecords: AttendanceRecord[] = [];

    employees.forEach((emp) => {
      if (emp.status === "active" && !existingEmpIds.has(emp.id)) {
        newRecords.push({
          id: `att-${Date.now()}-${emp.id}`,
          date,
          employeeId: emp.id,
          employeeCode: emp.code,
          employeeName: emp.name,
          departmentName: emp.departmentName,
          shiftName: { ar: "دوام عمل منتظم", en: "Regular Shift" },
          checkIn: "08:50",
          checkOut: "17:00",
          status: "present",
          overtimeHours: 0,
          lateMinutes: 0,
          notes: "تسجيل حضور جماعي تلقائي",
        });
      }
    });

    if (newRecords.length > 0) {
      setAttendance((prev) => [...newRecords, ...prev]);
    }
    return newRecords.length;
  }, [attendance, employees]);

  // Leave actions
  const submitLeaveRequest = useCallback((leaveData: Omit<LeaveRequest, "id" | "status" | "appliedDate">) => {
    const newLeave: LeaveRequest = {
      ...leaveData,
      id: `lev-${Date.now()}`,
      status: "pending",
      appliedDate: new Date().toISOString().slice(0, 10),
    };
    setLeaves((prev) => [newLeave, ...prev]);
    return newLeave;
  }, []);

  const approveLeaveRequest = useCallback((id: string, reviewerName: string, notes?: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setLeaves((prev) =>
      prev.map((lev): LeaveRequest => {
        if (lev.id !== id) return lev;
        return {
          ...lev,
          status: "approved",
          reviewedBy: reviewerName,
          reviewDate: today,
          reviewNotes: notes || "تمت الموافقة من قبل الإدارة",
        };
      })
    );

    // Deduct from employee leave balance
    const targetLeave = leaves.find((l) => l.id === id);
    if (targetLeave) {
      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id !== targetLeave.employeeId) return emp;
          const balances = { ...emp.leaveBalances };
          if (targetLeave.leaveType === "annual") {
            balances.annualUsed = Math.min(balances.annualTotal, balances.annualUsed + targetLeave.daysCount);
          } else if (targetLeave.leaveType === "sick") {
            balances.sickUsed = Math.min(balances.sickTotal, balances.sickUsed + targetLeave.daysCount);
          } else if (targetLeave.leaveType === "emergency") {
            balances.emergencyUsed = Math.min(balances.emergencyTotal, balances.emergencyUsed + targetLeave.daysCount);
          }
          return { ...emp, leaveBalances: balances };
        })
      );
    }
  }, [leaves]);

  const rejectLeaveRequest = useCallback((id: string, reviewerName: string, notes: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setLeaves((prev) =>
      prev.map((lev): LeaveRequest => {
        if (lev.id !== id) return lev;
        return {
          ...lev,
          status: "rejected",
          reviewedBy: reviewerName,
          reviewDate: today,
          reviewNotes: notes,
        };
      })
    );
  }, []);

  // Payroll actions
  const generateMonthlyPayroll = useCallback((period: string) => {
    const existing = payrollRuns.find((p) => p.period === period);
    if (existing) return existing;

    const payslips: PayslipItem[] = employees.map((emp) => {
      const basic = emp.compensation.basicSalary;
      const housing = emp.compensation.housingAllowance;
      const transport = emp.compensation.transportAllowance;
      const food = emp.compensation.foodAllowance;
      const kpi = emp.compensation.kpiBonus;

      // Calculate overtime from attendance in this period
      const empAttendance = attendance.filter((a) => a.employeeId === emp.id && a.date.startsWith(period));
      const totalOvertimeHours = empAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
      const hourlyRate = basic / (30 * 8);
      const overtimePay = Math.round(totalOvertimeHours * hourlyRate * 1.5);

      const gross = basic + housing + transport + food + kpi + overtimePay;
      const socialInsurance = Math.round(basic * (emp.compensation.socialInsuranceRate || 0.11));
      const tax = Math.round(gross * (emp.compensation.taxRate || 0.05));
      const totalDeductions = socialInsurance + tax;
      const net = gross - totalDeductions;

      return {
        id: `ps-${period}-${emp.id}`,
        payrollRunId: `pr-${period}`,
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.name,
        departmentName: emp.departmentName,
        positionName: emp.positionName,
        period,
        basicSalary: basic,
        housingAllowance: housing,
        transportAllowance: transport,
        foodAllowance: food,
        kpiBonus: kpi,
        overtimeHours: totalOvertimeHours,
        overtimePay,
        grossSalary: gross,
        socialInsuranceDeduction: socialInsurance,
        taxDeduction: tax,
        absencePenalties: 0,
        advanceDeduction: 0,
        totalDeductions,
        netSalary: net,
        paymentMethod: emp.bank.walletNumber ? "instapay" : "bank_transfer",
        status: "pending",
      };
    });

    const totalGross = payslips.reduce((s, p) => s + p.grossSalary, 0);
    const totalDeductions = payslips.reduce((s, p) => s + p.totalDeductions, 0);
    const totalNet = payslips.reduce((s, p) => s + p.netSalary, 0);

    const newRun: PayrollRun = {
      id: `pr-${period}`,
      period,
      title: { ar: `مسير رواتب شهر ${period}`, en: `Payroll Run for ${period}` },
      runDate: new Date().toISOString().slice(0, 10),
      status: "draft",
      totalEmployees: payslips.length,
      totalGross,
      totalDeductions,
      totalNet,
      payslips,
    };

    setPayrollRuns((prev) => [newRun, ...prev]);
    return newRun;
  }, [employees, attendance, payrollRuns]);

  const approvePayrollRun = useCallback((id: string) => {
    setPayrollRuns((prev) =>
      prev.map((run) => (run.id === id ? { ...run, status: "approved" } : run))
    );
  }, []);

  const postPayrollToGl = useCallback((id: string) => {
    const journalId = `JE-${Date.now().toString().slice(-6)}`;
    setPayrollRuns((prev) =>
      prev.map((run) =>
        run.id === id
          ? {
              ...run,
              status: "posted_to_gl",
              postedJournalId: journalId,
            }
          : run
      )
    );
    return journalId;
  }, []);

  return {
    employees,
    attendance,
    leaves,
    payrollRuns,
    insights,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    bulkAddEmployees,
    logAttendance,
    bulkCheckIn,
    submitLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    generateMonthlyPayroll,
    approvePayrollRun,
    postPayrollToGl,
  };
}
