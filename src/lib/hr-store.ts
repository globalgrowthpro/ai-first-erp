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
    title: { ar: "ارتفاع معدل العمل الإضافي في המطبخ المركزي", en: "High Overtime in Central Kitchen" },
    description: { ar: "تجاوز ساعات العمل الإضافي 120 ساعة هذا الأسبوع بسبب ورديات حلويات الحفلات", en: "Over 120 overtime hours recorded this week due to catering shifts" },
    metric: "120 ساعة",
    suggestedAction: { ar: "توظيف طباخين موسميين (Part-time)", en: "Hire seasonal part-timers" },
    department: "المطبخ المركزي",
    actionKey: "hire_part_time",
  },
];

export function useHrStore() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [insights, setInsights] = useState<HrAiInsight[]>(INITIAL_AI_INSIGHTS);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('employees').select('*');
    if (data) {
      setEmployees(data.map((e: any) => ({
        id: e.id,
        code: e.code || '',
        name: { ar: e.name_ar || 'موظف', en: e.name_en || 'Employee' },
        nationalId: '',
        email: e.email || '',
        phone: e.phone || '',
        emergencyContact: { name: '', phone: '', relation: { ar: 'غير محدد', en: 'Unknown' } },
        departmentId: e.department_id || '',
        departmentName: { ar: 'الإدارة', en: 'Management' },
        positionId: e.position_id || '',
        positionName: { ar: 'موظف', en: 'Employee' },
        branchId: e.branch_id || '',
        branchName: { ar: 'الرئيسي', en: 'Main' },
        directManager: e.manager_id || '',
        hireDate: e.hire_date || '',
        gender: "male",
        contractType: "Standard",
        employmentType: "full_time",
        status: (e.is_active !== false ? "active" : "terminated") as EmployeeStatus,
        avatarBg: "from-slate-500 to-slate-700",
        avatarInitials: (e.name_ar?.[0] || e.name_en?.[0] || 'U').toUpperCase(),
        avatarUrl: getDefaultAvatar("male", e.code || e.id),
        compensation: { basicSalary: Number(e.base_salary || 0), housingAllowance: 0, transportAllowance: 0, foodAllowance: 0, kpiBonus: 0, socialInsuranceRate: 0.11, taxRate: 0.05 },
        bank: { bankName: '', accountNumber: '', iban: '' },
        healthCert: { number: '', expiryDate: '', status: 'not_required' },
        leaveBalances: { annualTotal: 21, annualUsed: 0, sickTotal: 14, sickUsed: 0, emergencyTotal: 6, emergencyUsed: 0 }
      })));
    }
    setLoading(false);
  }, []);

  const fetchAttendance = useCallback(async () => {
    const { data } = await supabase.from('attendance').select('*');
    if (data) {
      setAttendance(data.map((a: any) => ({
        id: a.id,
        date: a.work_date || '',
        employeeId: a.employee_id || '',
        employeeCode: '',
        employeeName: { ar: 'موظف', en: 'Employee' },
        departmentName: { ar: 'الإدارة', en: 'Management' },
        shiftName: { ar: 'دوام كامل', en: 'Full Shift' },
        checkIn: a.check_in || '',
        checkOut: a.check_out || '',
        status: (a.status || 'present') as any,
        overtimeHours: 0,
        lateMinutes: 0
      })));
    }
  }, []);

  const fetchLeaves = useCallback(async () => {
    const { data } = await supabase.from('leave_requests').select('*');
    if (data) {
      setLeaves(data.map((l: any) => ({
        id: l.id,
        employeeId: l.employee_id || '',
        employeeCode: '',
        employeeName: { ar: 'موظف', en: 'Employee' },
        departmentName: { ar: 'الإدارة', en: 'Management' },
        leaveType: (l.leave_type || 'annual') as any,
        startDate: l.start_date || '',
        endDate: l.end_date || '',
        daysCount: 1,
        reason: l.reason || '',
        contactWhileAway: '',
        status: (l.status || 'pending') as any,
        appliedDate: l.created_at || ''
      })));
    }
  }, []);

  const fetchPayrollRuns = useCallback(async () => {
    const { data } = await supabase.from('payroll_runs').select('*');
    if (data) {
      setPayrollRuns(data.map((p: any) => ({
        id: p.id,
        period: p.period || '',
        title: { ar: 'مسير رواتب', en: 'Payroll Run' },
        runDate: p.created_at || '',
        status: (p.status || 'draft') as any,
        totalEmployees: 0,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        payslips: []
      })));
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    fetchLeaves();
    fetchPayrollRuns();
  }, [fetchEmployees, fetchAttendance, fetchLeaves, fetchPayrollRuns]);

  const addEmployee = useCallback(async (empData: any) => {
    await supabase.from('employees').insert({
      code: empData.code,
      name_ar: empData.name.ar,
      name_en: empData.name.en,
      email: empData.email,
      phone: empData.phone,
      base_salary: empData.compensation?.basicSalary
    });
    fetchEmployees();
    return empData;
  }, [fetchEmployees]);

  const updateEmployee = useCallback(async (id: string, updates: any) => {
    await supabase.from('employees').update({
      name_ar: updates.name?.ar,
      name_en: updates.name?.en,
    }).eq('id', id);
    fetchEmployees();
  }, [fetchEmployees]);

  const deleteEmployee = useCallback(async (id: string) => {
    await supabase.from('employees').delete().eq('id', id);
    fetchEmployees();
  }, [fetchEmployees]);

  const bulkAddEmployees = useCallback(async (newEmps: any[]) => { return 0; }, []);
  
  const logAttendance = useCallback(async (record: any) => {
    await supabase.from('attendance').insert({
      employee_id: record.employeeId,
      work_date: record.date,
      check_in: record.checkIn,
      check_out: record.checkOut,
      status: record.status as any
    });
    fetchAttendance();
    return record;
  }, [fetchAttendance]);

  const bulkCheckIn = useCallback(async (date: string) => { return 0; }, []);
  
  const submitLeaveRequest = useCallback(async (leaveData: any) => {
    await supabase.from('leave_requests').insert({
      employee_id: leaveData.employeeId,
      start_date: leaveData.startDate,
      end_date: leaveData.endDate,
      leave_type: leaveData.leaveType as any,
      reason: leaveData.reason,
      status: 'pending' as any
    });
    fetchLeaves();
    return leaveData;
  }, [fetchLeaves]);

  const approveLeaveRequest = useCallback(async (id: string, reviewerName: string, notes?: string) => {
    await supabase.from('leave_requests').update({ status: 'approved' as any }).eq('id', id);
    fetchLeaves();
  }, [fetchLeaves]);

  const rejectLeaveRequest = useCallback(async (id: string, reviewerName: string, notes: string) => {
    await supabase.from('leave_requests').update({ status: 'rejected' as any }).eq('id', id);
    fetchLeaves();
  }, [fetchLeaves]);
  
  const generateMonthlyPayroll = useCallback(async (period: string) => { return {} as any; }, []);
  const approvePayrollRun = useCallback(async (id: string) => {}, []);
  const postPayrollToGl = useCallback(async (id: string) => { return ""; }, []);

  return {
    employees, attendance, leaves, payrollRuns, insights,
    addEmployee, updateEmployee, deleteEmployee, bulkAddEmployees,
    logAttendance, bulkCheckIn, submitLeaveRequest, approveLeaveRequest, rejectLeaveRequest,
    generateMonthlyPayroll, approvePayrollRun, postPayrollToGl, loading
  };
}
