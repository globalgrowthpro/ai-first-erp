import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EmploymentType = "full_time" | "part_time" | "shift" | "seasonal" | "contract";
export type EmployeeStatus = "active" | "on_leave" | "probation" | "suspended" | "terminated";
export type HealthCertStatus = "valid" | "expiring_soon" | "expired" | "not_required";

export interface CompensationDetails {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  kpiBonus: number;
  socialInsuranceRate: number;
  taxRate: number;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  iban: string;
  walletNumber?: string;
}

export interface EmployeeRecord {
  id: string;
  code: string;
  userId?: string | null;
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
  avatarUrl?: string;
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
  date: string;
  employeeId: string;
  employeeCode: string;
  employeeName: { ar: string; en: string };
  departmentName: { ar: string; en: string };
  shiftName: { ar: string; en: string };
  checkIn: string;
  checkOut: string;
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
  period: string;
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
  period: string;
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

export const MALE_AVATARS = [
  "/avatars/male-1.png",
  "/avatars/male-2.png",
  "/avatars/male-3.png",
  "/avatars/male-4.png",
];

export const FEMALE_AVATARS = [
  "/avatars/female-1.jpg",
  "/avatars/female-2.jpg",
  "/avatars/female-3.jpg",
  "/avatars/female-4.png",
];

export function getDefaultAvatar(gender: "male" | "female", seed?: string | number): string {
  const list = gender === "female" ? FEMALE_AVATARS : MALE_AVATARS;
  if (!seed) return list[0] ?? (gender === "female" ? "/avatars/female-1.jpg" : "/avatars/male-1.png");
  let num = 0;
  if (typeof seed === "number") {
    num = seed;
  } else {
    const digits = seed.replace(/\D/g, "");
    if (digits) {
      num = parseInt(digits, 10);
      num = num > 0 ? num - 1 : num;
    } else {
      for (let i = 0; i < seed.length; i++) num = (num * 31 + seed.charCodeAt(i)) >>> 0;
    }
  }
  return list[Math.abs(num) % list.length] ?? list[0] ?? (gender === "female" ? "/avatars/female-1.jpg" : "/avatars/male-1.png");
}

const INITIAL_AI_INSIGHTS: HrAiInsight[] = [
  {
    id: "ins-1",
    type: "warning",
    title: { ar: "ارتفاع معدل العمل الإضافي في المطبخ المركزي", en: "High Overtime in Central Kitchen" },
    description: { ar: "تجاوزت ساعات العمل الإضافي 120 ساعة هذا الأسبوع بسبب ورديات حلويات الحفلات والمناسبات", en: "Over 120 overtime hours recorded this week due to high catering production demands" },
    metric: "120 ساعة",
    suggestedAction: { ar: "توظيف طباخين ومساعدين موسميين (Part-time)", en: "Hire seasonal part-time culinary staff" },
    department: "المطبخ المركزي",
    actionKey: "hire_part_time",
  },
  {
    id: "ins-2",
    type: "info",
    title: { ar: "تجديد الشهادات الصحية الدورية", en: "Periodic Health Certificate Renewals" },
    description: { ar: "3 موظفين في قطاع الإنتاج والبيع بحاجة لتجديد الكشف الطبي السنوي قبل نهاية الشهر", en: "3 staff members in production and retail require annual medical certificate renewals" },
    metric: "3 شهادات",
    suggestedAction: { ar: "جدولة الفحص الطبي الشامل", en: "Schedule comprehensive medical checkups" },
    department: "الجودة والرقابة",
    actionKey: "schedule_medical",
  },
];

const STORAGE_KEY = "hafez_hr_data_v4";

// Baseline operational roles to supplement the DB so kitchen and sales have complete staffing
export const DEFAULT_SUPPLEMENTAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: "emp-chef-ibrahim",
    code: "EMP-006",
    name: { ar: "الشيف إبراهيم عثمان", en: "Chef Ibrahim Osman" },
    nationalId: "28804151200345",
    email: "kitchen@wazeer-elhelw.com",
    phone: "+20 100 112 0000",
    emergencyContact: { name: "هبة عثمان", phone: "+20 100 112 0099", relation: { ar: "زوجة", en: "Spouse" } },
    departmentId: "ad8160eb-cbf7-4356-9243-f3755003a7ed",
    departmentName: { ar: "المطبخ المركزي والتصنيع", en: "Central Kitchen & Production" },
    positionId: "a021cfda-5cbd-467c-95f2-12c69d0ef063",
    positionName: { ar: "الشيف التنفيذي لحلويات الوزير", en: "Executive Pastry Chef" },
    branchId: "27e6e065-8833-4143-9e7c-e545e53c2e80",
    branchName: { ar: "المطبخ المركزي — طلبات التوصيل", en: "Central Kitchen Delivery Hub" },
    directManager: "Hafez Rahim",
    hireDate: "2022-04-01",
    gender: "male",
    contractType: "عقد دائم غير محدد المدة (Permanent)",
    employmentType: "full_time",
    status: "active",
    avatarBg: "from-amber-600 to-orange-700",
    avatarInitials: "إع",
    avatarUrl: "/avatars/male-2.png",
    compensation: {
      basicSalary: 42000,
      housingAllowance: 5000,
      transportAllowance: 3000,
      foodAllowance: 2000,
      kpiBonus: 4000,
      socialInsuranceRate: 0.11,
      taxRate: 0.10,
    },
    bank: {
      bankName: "البنك التجاري الدولي (CIB)",
      accountNumber: "100098471234",
      iban: "EG3800100098471234000000001",
      walletNumber: "01001120000",
    },
    healthCert: {
      number: "HC-2026-8819",
      expiryDate: "2027-06-30",
      status: "valid",
    },
    leaveBalances: {
      annualTotal: 21,
      annualUsed: 3,
      sickTotal: 14,
      sickUsed: 0,
      emergencyTotal: 6,
      emergencyUsed: 1,
    },
  },
  {
    id: "emp-cashier-yasmin",
    code: "EMP-007",
    name: { ar: "ياسمين فاروق", en: "Yasmin Farouk" },
    nationalId: "29609201400892",
    email: "y.farouk@wazeer-elhelw.com",
    phone: "+20 100 771 4455",
    emergencyContact: { name: "فاروق رضوان", phone: "+20 100 771 4400", relation: { ar: "والد", en: "Father" } },
    departmentId: "c4a6d086-7e42-4f04-8732-08cb33788b70",
    departmentName: { ar: "المبيعات ونقاط البيع والفروع", en: "Sales, POS & Branches" },
    positionId: "e254171a-bbcd-417e-a50c-e12371ec48fc",
    positionName: { ar: "كاشير ومسؤول بيع فوري", en: "Retail Cashier & Sales Rep" },
    branchId: "2265d911-4037-4165-b835-31fbef5a7ffe",
    branchName: { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis Branch" },
    directManager: "Ahmed Salem",
    hireDate: "2023-09-15",
    gender: "female",
    contractType: "عقد سنوي متجدد (Annual Renewable)",
    employmentType: "shift",
    status: "active",
    avatarBg: "from-pink-600 to-rose-700",
    avatarInitials: "يف",
    avatarUrl: "/avatars/female-2.jpg",
    compensation: {
      basicSalary: 12000,
      housingAllowance: 1500,
      transportAllowance: 1200,
      foodAllowance: 800,
      kpiBonus: 1000,
      socialInsuranceRate: 0.11,
      taxRate: 0.05,
    },
    bank: {
      bankName: "البنك الأهلي المصري (NBE)",
      accountNumber: "298471203948",
      iban: "EG1500012984712039480000001",
      walletNumber: "01007714455",
    },
    healthCert: {
      number: "HC-2026-9041",
      expiryDate: "2027-04-15",
      status: "valid",
    },
    leaveBalances: {
      annualTotal: 21,
      annualUsed: 2,
      sickTotal: 14,
      sickUsed: 1,
      emergencyTotal: 6,
      emergencyUsed: 0,
    },
  },
  {
    id: "emp-accountant-karim",
    code: "EMP-008",
    name: { ar: "كريم ممدوح", en: "Karim Mamdouh" },
    nationalId: "29208110100654",
    email: "maadi@wazeer-elhelw.com",
    phone: "+20 100 882 3344",
    emergencyContact: { name: "ممدوح شحاتة", phone: "+20 100 882 3300", relation: { ar: "والد", en: "Father" } },
    departmentId: "b2c65149-55c9-4276-bd0d-3603dce66d53",
    departmentName: { ar: "الإدارة المالية والحسابات", en: "Finance & Accounting" },
    positionId: "d0980e15-7092-4054-8c65-5cd99b86fa70",
    positionName: { ar: "محاسب تكاليف وفروع", en: "Branch & Cost Accountant" },
    branchId: "d4bd24ca-d25a-4fac-8c64-580a55ff9826",
    branchName: { ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St. Branch" },
    directManager: "Mona Khalil",
    hireDate: "2023-02-01",
    gender: "male",
    contractType: "عقد دائم غير محدد المدة (Permanent)",
    employmentType: "full_time",
    status: "active",
    avatarBg: "from-blue-600 to-indigo-700",
    avatarInitials: "كم",
    avatarUrl: "/avatars/male-3.png",
    compensation: {
      basicSalary: 18500,
      housingAllowance: 2500,
      transportAllowance: 1500,
      foodAllowance: 1000,
      kpiBonus: 1500,
      socialInsuranceRate: 0.11,
      taxRate: 0.05,
    },
    bank: {
      bankName: "بنك مصر (Banque Misr)",
      accountNumber: "450918273645",
      iban: "EG0200024509182736450000001",
      walletNumber: "01008823344",
    },
    healthCert: {
      number: "HC-2026-7732",
      expiryDate: "2027-08-20",
      status: "valid",
    },
    leaveBalances: {
      annualTotal: 21,
      annualUsed: 4,
      sickTotal: 14,
      sickUsed: 0,
      emergencyTotal: 6,
      emergencyUsed: 0,
    },
  },
];

// Singleton shared state across the application
let globalEmployees: EmployeeRecord[] = [];
let globalAttendance: AttendanceRecord[] = [];
let globalLeaves: LeaveRequest[] = [];
let globalPayrollRuns: PayrollRun[] = [];
let globalInsights: HrAiInsight[] = INITIAL_AI_INSIGHTS;
let globalLoading = false;
let isInitialized = false;

const listeners = new Set<() => void>();
function notify() {
  for (const fn of listeners) fn();
}

function persistToStorage() {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      employees: globalEmployees,
      attendance: globalAttendance,
      leaves: globalLeaves,
      payrollRuns: globalPayrollRuns,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

function restoreFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed.employees && Array.isArray(parsed.employees) && parsed.employees.length > 0) {
      globalEmployees = parsed.employees;
      globalAttendance = parsed.attendance || [];
      globalLeaves = parsed.leaves || [];
      globalPayrollRuns = parsed.payrollRuns || [];
      return true;
    }
  } catch {}
  return false;
}

// Generate realistic default attendance records for active employees
function generateDefaultAttendance(emps: EmployeeRecord[]): AttendanceRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  return emps.map((emp, i) => {
    const isLate = i === 1; // 1 employee late for realistic delta KPI display
    return {
      id: `att-${today}-${emp.id}`,
      date: today,
      employeeId: emp.id,
      employeeCode: emp.code,
      employeeName: emp.name,
      departmentName: emp.departmentName,
      shiftName:
        emp.employmentType === "shift"
          ? { ar: "وردية مسائية (14:00 - 23:00)", en: "Evening Shift (14:00 - 23:00)" }
          : { ar: "دوام المقر الرئيسي (08:30 - 17:00)", en: "HQ Shift (08:30 - 17:00)" },
      checkIn: isLate ? "09:22" : "08:28",
      checkOut: isLate ? "17:30" : "17:05",
      status: isLate ? "late" : "present",
      overtimeHours: i === 0 ? 1.5 : i === 2 ? 2.0 : 0,
      lateMinutes: isLate ? 52 : 0,
      notes: isLate ? "تأخير بعذر مواصلات" : "حضور منتظم بالبصمة",
    };
  });
}

// Generate realistic default leave requests
function generateDefaultLeaves(emps: EmployeeRecord[]): LeaveRequest[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "lev-001",
      employeeId: emps[1]?.id || "emp-salem",
      employeeCode: emps[1]?.code || "EMP-002",
      employeeName: emps[1]?.name || { ar: "أحمد سالم", en: "Ahmed Salem" },
      departmentName: emps[1]?.departmentName || { ar: "المبيعات ونقاط البيع والفروع", en: "Sales, POS & Branches" },
      leaveType: "annual",
      startDate: "2026-10-12",
      endDate: "2026-10-15",
      daysCount: 3,
      reason: "إجازة سنوية اعتيادية لظرف عائلي",
      contactWhileAway: "+20 100 455 2211",
      status: "pending",
      appliedDate: today,
    },
    {
      id: "lev-002",
      employeeId: emps[2]?.id || "emp-khalil",
      employeeCode: emps[2]?.code || "EMP-003",
      employeeName: emps[2]?.name || { ar: "منى خليل", en: "Mona Khalil" },
      departmentName: emps[2]?.departmentName || { ar: "الإدارة المالية والحسابات", en: "Finance & Accounting" },
      leaveType: "sick",
      startDate: "2026-09-20",
      endDate: "2026-09-21",
      daysCount: 2,
      reason: "وعكة صحية وراحة طبية معتمدة",
      contactWhileAway: "+20 100 000 0003",
      status: "approved",
      appliedDate: "2026-09-19",
      reviewedBy: "Hafez Rahim",
      reviewDate: "2026-09-19",
      reviewNotes: "معتمد مع تمنياتنا بالشفاء العاجل",
    },
  ];
}

// Compute payslips and payroll run for the period
function buildPayrollRunForPeriod(period: string, emps: EmployeeRecord[], att: AttendanceRecord[]): PayrollRun {
  const payslips: PayslipItem[] = emps.map((emp) => {
    const basic = emp.compensation.basicSalary;
    const housing = emp.compensation.housingAllowance;
    const transport = emp.compensation.transportAllowance;
    const food = emp.compensation.foodAllowance;
    const kpi = emp.compensation.kpiBonus;

    const empAtt = att.filter((a) => a.employeeId === emp.id && a.date.startsWith(period));
    const overtimeHours = empAtt.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
    const hourlyRate = Math.round(basic / (30 * 8));
    const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5);

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
      overtimeHours,
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

  return {
    id: `pr-${period}`,
    period,
    title: { ar: `مسير رواتب شهر ${period}`, en: `Payroll Run for ${period}` },
    runDate: new Date().toISOString().slice(0, 10),
    status: "approved",
    totalEmployees: payslips.length,
    totalGross,
    totalDeductions,
    totalNet,
    payslips,
  };
}

export function useHrStore() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(globalEmployees);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(globalAttendance);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(globalLeaves);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(globalPayrollRuns);
  const [insights, setInsights] = useState<HrAiInsight[]>(globalInsights);
  const [loading, setLoading] = useState<boolean>(globalLoading);

  useEffect(() => {
    const update = () => {
      setEmployees([...globalEmployees]);
      setAttendance([...globalAttendance]);
      setLeaves([...globalLeaves]);
      setPayrollRuns([...globalPayrollRuns]);
      setInsights([...globalInsights]);
      setLoading(globalLoading);
    };
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const fetchAllHrData = useCallback(async () => {
    globalLoading = true;
    notify();

    try {
      // 1. Fetch live relations in parallel from Supabase
      const [empRes, deptRes, posRes, branchRes, attRes, leaveRes, payRes] = await Promise.all([
        supabase.from("employees").select("*, department:departments(*), position:positions(*)"),
        supabase.from("departments").select("*"),
        supabase.from("positions").select("*"),
        supabase.from("branches").select("*"),
        supabase.from("attendance").select("*"),
        supabase.from("leave_requests").select("*"),
        supabase.from("payroll_runs").select("*"),
      ]);

      const departmentsMap = new Map((deptRes.data || []).map((d: any) => [d.id, d]));
      const positionsMap = new Map((posRes.data || []).map((p: any) => [p.id, p]));
      const branchesList = branchRes.data || [];

      // Realistic benchmark compensations for positions
      const defaultCompensationByCode: Record<string, CompensationDetails> = {
        "pos-gm": { basicSalary: 85000, housingAllowance: 10000, transportAllowance: 5000, foodAllowance: 3000, kpiBonus: 7000, socialInsuranceRate: 0.11, taxRate: 0.15 },
        "pos-cfo": { basicSalary: 55000, housingAllowance: 8000, transportAllowance: 4000, foodAllowance: 2500, kpiBonus: 5500, socialInsuranceRate: 0.11, taxRate: 0.12 },
        "pos-branch-mgr": { basicSalary: 28000, housingAllowance: 4000, transportAllowance: 2500, foodAllowance: 1500, kpiBonus: 3000, socialInsuranceRate: 0.11, taxRate: 0.08 },
        "pos-storekeeper": { basicSalary: 16500, housingAllowance: 2000, transportAllowance: 1500, foodAllowance: 1000, kpiBonus: 1500, socialInsuranceRate: 0.11, taxRate: 0.05 },
        "pos-auditor": { basicSalary: 24000, housingAllowance: 3500, transportAllowance: 2000, foodAllowance: 1500, kpiBonus: 2500, socialInsuranceRate: 0.11, taxRate: 0.08 },
        "pos-chef": { basicSalary: 42000, housingAllowance: 5000, transportAllowance: 3000, foodAllowance: 2000, kpiBonus: 4000, socialInsuranceRate: 0.11, taxRate: 0.10 },
        "pos-accountant": { basicSalary: 18500, housingAllowance: 2500, transportAllowance: 1500, foodAllowance: 1000, kpiBonus: 1500, socialInsuranceRate: 0.11, taxRate: 0.05 },
        "pos-cashier": { basicSalary: 12000, housingAllowance: 1500, transportAllowance: 1200, foodAllowance: 800, kpiBonus: 1000, socialInsuranceRate: 0.11, taxRate: 0.05 },
      };

      // 2. Map database employees
      const dbEmployees: EmployeeRecord[] = (empRes.data || []).map((e: any, idx: number) => {
        const dept = e.department || departmentsMap.get(e.department_id) || {};
        const pos = e.position || positionsMap.get(e.position_id) || {};

        // Associate matching branch
        let branch = branchesList.find((b: any) => b.id === e.branch_id);
        if (!branch) {
          if (pos.code === "pos-branch-mgr") {
            branch = branchesList.find((b: any) => b.code === "korba");
          } else if (pos.code === "pos-chef") {
            branch = branchesList.find((b: any) => b.code === "kitchen");
          } else if (dept.code === "SUPPLY") {
            branch = branchesList.find((b: any) => b.code === "kitchen");
          } else {
            branch = branchesList.find((b: any) => b.is_wazeer_owned) || branchesList[0];
          }
        }

        const isFemale =
          e.name_en?.toLowerCase().includes("mona") ||
          e.name_en?.toLowerCase().includes("sarah") ||
          e.name_ar?.includes("منى") ||
          e.name_ar?.includes("سارة");
        const gender: "male" | "female" = isFemale ? "female" : "male";

        const positionCode = pos.code || "pos-gm";
        const benchmarkComp = defaultCompensationByCode[positionCode] || {
          basicSalary: Number(e.base_salary) > 0 ? Number(e.base_salary) : 20000,
          housingAllowance: 2500,
          transportAllowance: 1500,
          foodAllowance: 1000,
          kpiBonus: 1500,
          socialInsuranceRate: 0.11,
          taxRate: 0.07,
        };

        const code = e.code || `EMP-00${idx + 1}`;
        const defaultPhones = [
          "+20 100 000 0001",
          "+20 100 455 2211",
          "+20 100 000 0003",
          "+20 100 000 0004",
          "+20 100 000 0005",
        ];
        const defaultNIDs = [
          "28501010100011",
          "28905201200044",
          "29107151400033",
          "28703101600022",
          "29311251800055",
        ];

        return {
          id: e.id,
          code,
          userId: e.user_id || null,
          name: { ar: e.name_ar || "موظف", en: e.name_en || "Employee" },
          nationalId: e.national_id || defaultNIDs[idx] || `2900${idx + 1}010100011`,
          email: e.email || `${code.toLowerCase()}@wazeer-elhelw.com`,
          phone: e.phone || defaultPhones[idx] || `+20 100 000 000${idx + 1}`,
          emergencyContact: {
            name: isFemale ? "الأسرة" : "الزوجة",
            phone: "+20 100 999 0000",
            relation: { ar: "أقارب درجة أولى", en: "Immediate Family" },
          },
          departmentId: dept.id || e.department_id || "",
          departmentName: {
            ar: dept.name_ar || "الإدارة العامة والتنفيذية",
            en: dept.name_en || "Executive Management",
          },
          positionId: pos.id || e.position_id || "",
          positionName: {
            ar: pos.title_ar || "المدير العام والمالك",
            en: pos.title_en || "General Manager & Owner",
          },
          branchId: branch?.id || "",
          branchName: {
            ar: branch?.name_ar || "المقر الرئيسي — القاهرة",
            en: branch?.name_en || "Headquarters — Cairo",
          },
          directManager: idx === 0 ? "مجلس الإدارة" : "Hafez Rahim",
          hireDate: e.hire_date || "2022-01-15",
          gender,
          contractType: "عقد دائم غير محدد المدة (Permanent)",
          employmentType: "full_time",
          status: (e.is_active !== false ? "active" : "terminated") as EmployeeStatus,
          avatarBg: gender === "female" ? "from-pink-600 to-rose-700" : "from-blue-600 to-indigo-700",
          avatarInitials: (e.name_ar?.[0] || e.name_en?.[0] || "H").toUpperCase(),
          avatarUrl: getDefaultAvatar(gender, code),
          compensation: {
            basicSalary: Number(e.base_salary) > 0 ? Number(e.base_salary) : benchmarkComp.basicSalary,
            housingAllowance: benchmarkComp.housingAllowance,
            transportAllowance: benchmarkComp.transportAllowance,
            foodAllowance: benchmarkComp.foodAllowance,
            kpiBonus: benchmarkComp.kpiBonus,
            socialInsuranceRate: benchmarkComp.socialInsuranceRate,
            taxRate: benchmarkComp.taxRate,
          },
          bank: {
            bankName: "البنك التجاري الدولي (CIB)",
            accountNumber: `10009847123${idx}`,
            iban: `EG380010009847123${idx}000000001`,
            walletNumber: defaultPhones[idx]?.replace(/\D/g, "") || "",
          },
          healthCert: {
            number: `HC-2026-00${idx + 1}`,
            expiryDate: "2027-05-30",
            status: "valid",
          },
          leaveBalances: {
            annualTotal: 21,
            annualUsed: idx === 1 ? 3 : idx === 2 ? 2 : 0,
            sickTotal: 14,
            sickUsed: idx === 2 ? 2 : 0,
            emergencyTotal: 6,
            emergencyUsed: 0,
          },
        };
      });

      // Merge with supplemental employees to ensure kitchen, sales, and accounts are complete
      const existingCodes = new Set(dbEmployees.map((e) => e.code));
      const missingSupplementals = DEFAULT_SUPPLEMENTAL_EMPLOYEES.filter((s) => !existingCodes.has(s.code));
      const mergedEmployees = [...dbEmployees, ...missingSupplementals];

      globalEmployees = mergedEmployees;

      // 3. Map Attendance
      if (attRes.data && attRes.data.length > 0) {
        globalAttendance = attRes.data.map((a: any) => {
          const emp = mergedEmployees.find((e) => e.id === a.employee_id) || mergedEmployees[0];
          return {
            id: a.id,
            date: a.work_date,
            employeeId: a.employee_id,
            employeeCode: emp.code,
            employeeName: emp.name,
            departmentName: emp.departmentName,
            shiftName: { ar: "دوام منتظم", en: "Regular Shift" },
            checkIn: a.check_in || "08:30",
            checkOut: a.check_out || "17:00",
            status: (a.status || "present") as AttendanceStatus,
            overtimeHours: 0,
            lateMinutes: a.status === "late" ? 45 : 0,
            notes: a.notes || "",
          };
        });
      } else {
        globalAttendance = generateDefaultAttendance(mergedEmployees);
      }

      // 4. Map Leaves
      if (leaveRes.data && leaveRes.data.length > 0) {
        globalLeaves = leaveRes.data.map((l: any) => {
          const emp = mergedEmployees.find((e) => e.id === l.employee_id) || mergedEmployees[0];
          return {
            id: l.id,
            employeeId: l.employee_id,
            employeeCode: emp.code,
            employeeName: emp.name,
            departmentName: emp.departmentName,
            leaveType: (l.leave_type || "annual") as LeaveType,
            startDate: l.start_date,
            endDate: l.end_date,
            daysCount: Math.max(1, Math.round((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / (1000 * 3600 * 24)) + 1),
            reason: l.reason || "",
            contactWhileAway: emp.phone,
            status: (l.status || "pending") as LeaveStatus,
            appliedDate: l.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          };
        });
      } else {
        globalLeaves = generateDefaultLeaves(mergedEmployees);
      }

      // 5. Map Payroll Runs
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (payRes.data && payRes.data.length > 0) {
        globalPayrollRuns = payRes.data.map((p: any) => ({
          id: p.id,
          period: p.period_month,
          title: { ar: `مسير رواتب شهر ${p.period_month}`, en: `Payroll Run for ${p.period_month}` },
          runDate: p.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          status: (p.is_posted ? "posted_to_gl" : "approved") as PayrollRunStatus,
          totalEmployees: mergedEmployees.length,
          totalGross: Number(p.total_gross || 0),
          totalDeductions: Number(p.total_deductions || 0),
          totalNet: Number(p.total_net || 0),
          payslips: [],
        }));
      } else {
        globalPayrollRuns = [buildPayrollRunForPeriod(currentMonth, mergedEmployees, globalAttendance)];
      }

      persistToStorage();
    } catch (err) {
      console.error("[HR Store] Supabase fetch error, fallback to cache:", err);
      restoreFromStorage();
    } finally {
      globalLoading = false;
      notify();
    }
  }, []);

  // Initialize once on mount
  useEffect(() => {
    if (!isInitialized) {
      isInitialized = true;
      const restored = restoreFromStorage();
      if (restored) {
        notify();
      }
      fetchAllHrData();
    }
  }, [fetchAllHrData]);

  // Actions
  const addEmployee = useCallback(
    async (empData: Omit<EmployeeRecord, "id"> & { id?: string }) => {
      const newEmp: EmployeeRecord = {
        ...empData,
        id: empData.id || `emp-${Date.now()}`,
      };

      globalEmployees = [newEmp, ...globalEmployees];
      persistToStorage();
      notify();

      try {
        await supabase.from("employees").insert({
          code: newEmp.code,
          name_ar: newEmp.name.ar,
          name_en: newEmp.name.en,
          email: newEmp.email,
          phone: newEmp.phone,
          department_id: newEmp.departmentId || null,
          position_id: newEmp.positionId || null,
          base_salary: newEmp.compensation?.basicSalary || 0,
          hire_date: newEmp.hireDate || new Date().toISOString().slice(0, 10),
          is_active: newEmp.status === "active",
        });
      } catch (err) {
        console.warn("[HR Store] DB insert warning:", err);
      }

      return newEmp;
    },
    []
  );

  const updateEmployee = useCallback(async (id: string, updates: Partial<EmployeeRecord>) => {
    globalEmployees = globalEmployees.map((emp) =>
      emp.id === id ? { ...emp, ...updates } : emp
    );
    persistToStorage();
    notify();

    try {
      await supabase
        .from("employees")
        .update({
          name_ar: updates.name?.ar,
          name_en: updates.name?.en,
          phone: updates.phone,
          email: updates.email,
          base_salary: updates.compensation?.basicSalary,
        })
        .eq("id", id);
    } catch (err) {
      console.warn("[HR Store] DB update warning:", err);
    }
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    globalEmployees = globalEmployees.filter((emp) => emp.id !== id);
    persistToStorage();
    notify();

    try {
      await supabase.from("employees").delete().eq("id", id);
    } catch (err) {
      console.warn("[HR Store] DB delete warning:", err);
    }
  }, []);

  const bulkAddEmployees = useCallback((newEmps: Omit<EmployeeRecord, "id">[]) => {
    const records: EmployeeRecord[] = newEmps.map((emp, i) => ({
      ...emp,
      id: `emp-${Date.now()}-${i}`,
    }));
    globalEmployees = [...records, ...globalEmployees];
    persistToStorage();
    notify();
    return records.length;
  }, []);

  // Attendance actions
  const logAttendance = useCallback(async (record: Omit<AttendanceRecord, "id">) => {
    const newRecord: AttendanceRecord = {
      ...record,
      id: `att-${Date.now()}`,
    };
    globalAttendance = [newRecord, ...globalAttendance];
    persistToStorage();
    notify();

    try {
      await supabase.from("attendance").insert({
        employee_id: record.employeeId,
        work_date: record.date,
        check_in: record.checkIn,
        check_out: record.checkOut,
        status: record.status as any,
        notes: record.notes || null,
      });
    } catch (err) {
      console.warn("[HR Store] Attendance DB insert warning:", err);
    }

    return newRecord;
  }, []);

  const bulkCheckIn = useCallback(async (date: string) => {
    const existingEmpIds = new Set(
      globalAttendance.filter((a) => a.date === date).map((a) => a.employeeId)
    );
    const newRecords: AttendanceRecord[] = [];

    globalEmployees.forEach((emp) => {
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
      globalAttendance = [...newRecords, ...globalAttendance];
      persistToStorage();
      notify();
    }
    return newRecords.length;
  }, []);

  // Leave actions
  const submitLeaveRequest = useCallback(
    async (leaveData: Omit<LeaveRequest, "id" | "status" | "appliedDate">) => {
      const newLeave: LeaveRequest = {
        ...leaveData,
        id: `lev-${Date.now()}`,
        status: "pending",
        appliedDate: new Date().toISOString().slice(0, 10),
      };
      globalLeaves = [newLeave, ...globalLeaves];
      persistToStorage();
      notify();

      try {
        await supabase.from("leave_requests").insert({
          employee_id: leaveData.employeeId,
          start_date: leaveData.startDate,
          end_date: leaveData.endDate,
          leave_type: leaveData.leaveType as any,
          reason: leaveData.reason,
          status: "pending",
        });
      } catch (err) {
        console.warn("[HR Store] Leave DB insert warning:", err);
      }

      return newLeave;
    },
    []
  );

  const approveLeaveRequest = useCallback(
    async (id: string, reviewerName: string, notes?: string) => {
      const today = new Date().toISOString().slice(0, 10);
      globalLeaves = globalLeaves.map((lev): LeaveRequest => {
        if (lev.id !== id) return lev;
        return {
          ...lev,
          status: "approved",
          reviewedBy: reviewerName,
          reviewDate: today,
          reviewNotes: notes || "تمت الموافقة من قبل الإدارة",
        };
      });

      // Deduct from employee leave balance
      const targetLeave = globalLeaves.find((l) => l.id === id);
      if (targetLeave) {
        globalEmployees = globalEmployees.map((emp) => {
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
        });
      }

      persistToStorage();
      notify();

      try {
        await supabase
          .from("leave_requests")
          .update({ status: "approved" as any })
          .eq("id", id);
      } catch (err) {
        console.warn("[HR Store] Leave DB update warning:", err);
      }
    },
    []
  );

  const rejectLeaveRequest = useCallback(async (id: string, reviewerName: string, notes: string) => {
    const today = new Date().toISOString().slice(0, 10);
    globalLeaves = globalLeaves.map((lev): LeaveRequest => {
      if (lev.id !== id) return lev;
      return {
        ...lev,
        status: "rejected",
        reviewedBy: reviewerName,
        reviewDate: today,
        reviewNotes: notes,
      };
    });
    persistToStorage();
    notify();

    try {
      await supabase
        .from("leave_requests")
        .update({ status: "rejected" as any })
        .eq("id", id);
    } catch (err) {
      console.warn("[HR Store] Leave DB update warning:", err);
    }
  }, []);

  // Payroll actions
  const generateMonthlyPayroll = useCallback((period: string) => {
    const existing = globalPayrollRuns.find((p) => p.period === period);
    if (existing) return existing;

    const newRun = buildPayrollRunForPeriod(period, globalEmployees, globalAttendance);
    newRun.status = "draft";
    globalPayrollRuns = [newRun, ...globalPayrollRuns];
    persistToStorage();
    notify();

    try {
      supabase.from("payroll_runs").insert({
        period_month: period,
        total_gross: newRun.totalGross,
        total_deductions: newRun.totalDeductions,
        total_net: newRun.totalNet,
        is_posted: false,
      });
    } catch (err) {
      console.warn("[HR Store] Payroll DB insert warning:", err);
    }

    return newRun;
  }, []);

  const approvePayrollRun = useCallback((id: string) => {
    globalPayrollRuns = globalPayrollRuns.map((run) =>
      run.id === id ? { ...run, status: "approved" } : run
    );
    persistToStorage();
    notify();
  }, []);

  const postPayrollToGl = useCallback(async (id: string) => {
    const journalId = `JE-${Date.now().toString().slice(-6)}`;
    globalPayrollRuns = globalPayrollRuns.map((run) =>
      run.id === id
        ? {
            ...run,
            status: "posted_to_gl",
            postedJournalId: journalId,
          }
        : run
    );
    persistToStorage();
    notify();

    try {
      await supabase
        .from("payroll_runs")
        .update({ is_posted: true })
        .eq("id", id);
    } catch (err) {
      console.warn("[HR Store] Payroll DB post warning:", err);
    }

    return journalId;
  }, []);

  return {
    employees,
    attendance,
    leaves,
    payrollRuns,
    insights,
    loading,
    refreshHrData: fetchAllHrData,
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
