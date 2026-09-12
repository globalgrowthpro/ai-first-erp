import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  UserPlus,
  Clock,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Printer,
  Sparkles,
  Building2,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Briefcase,
  Layers,
  Scale,
  Plus,
  Send,
  Download,
  Upload,
  FileSpreadsheet,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, PageHeader, Panel, Td } from "@/components/kit";
import {
  useHrStore,
  type EmployeeRecord,
  type AttendanceRecord,
  type LeaveRequest,
  type PayrollRun,
  type PayslipItem,
} from "@/lib/hr-store";
import { EmployeeFormModal } from "@/components/hr/EmployeeFormModal";
import { EmployeeDetailModal } from "@/components/hr/EmployeeDetailModal";
import { AttendanceModal } from "@/components/hr/AttendanceModal";
import { LeaveRequestModal } from "@/components/hr/LeaveRequestModal";
import { PayslipModal } from "@/components/hr/PayslipModal";
import { PayrollProcessModal } from "@/components/hr/PayrollProcessModal";
import { EmployeeImportModal } from "@/components/hr/EmployeeImportModal";
import {
  exportEmployeesToExcel,
  exportAttendanceToExcel,
} from "@/lib/excel-utils";

export const Route = createFileRoute("/hr")({
  head: () => ({
    meta: [
      { title: "Human Resources & Payroll — Hafez ERP" },
      {
        name: "description",
        content:
          "Enterprise HR management, employee dossiers, shift attendance tracking, leave requests, payroll processing, and AI workforce insights.",
      },
      { property: "og:title", content: "Human Resources — Hafez ERP" },
      {
        property: "og:description",
        content:
          "Personnel dossiers, shift attendance, leaves approval and payroll runs.",
      },
    ],
  }),
  component: HrPage,
});

function HrPage() {
  const { t, pick, money, dir, lang } = useI18n();

  const {
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
  } = useHrStore();

  const [activeTab, setActiveTab] = useState<"employees" | "attendance" | "leaves" | "payroll" | "ai">("employees");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [healthCertFilter, setHealthCertFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Attendance Filter States
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [attendanceShiftFilter, setAttendanceShiftFilter] = useState("all");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("all");

  // Modal States
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [selectedDetailEmployee, setSelectedDetailEmployee] = useState<EmployeeRecord | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipItem | null>(null);
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<PayrollRun | null>(null);

  // End-of-Service Calculator State
  const [eosYears, setEosYears] = useState<number>(3);
  const [eosSalary, setEosSalary] = useState<number>(18000);
  const eosGratuity = useMemo(() => {
    // Egyptian Labor Law No. 12 of 2003: Half month basic for first 5 years, one month for subsequent years
    if (eosYears <= 5) {
      return Math.round(eosYears * (eosSalary / 2));
    }
    return Math.round(5 * (eosSalary / 2) + (eosYears - 5) * eosSalary);
  }, [eosYears, eosSalary]);

  // Active filters count
  const activeFiltersCount = [
    deptFilter !== "all",
    branchFilter !== "all",
    contractFilter !== "all",
    genderFilter !== "all",
    healthCertFilter !== "all",
    statusFilter !== "all",
    searchQuery.trim() !== "",
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSearchQuery("");
    setDeptFilter("all");
    setBranchFilter("all");
    setContractFilter("all");
    setGenderFilter("all");
    setHealthCertFilter("all");
    setStatusFilter("all");
  };

  // Distinct departments and branches for filter dropdowns
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.departmentName?.ar) set.add(e.departmentName.ar);
    });
    return Array.from(set);
  }, [employees]);

  const uniqueBranches = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.branchName?.ar) set.add(e.branchName.ar);
    });
    return Array.from(set);
  }, [employees]);

  // Top KPI Calculations
  const activeEmployeesCount = employees.filter((e) => e.status === "active").length;
  const todayAttendance = attendance.filter((a) => a.date === attendanceDate);
  const presentTodayCount = todayAttendance.filter((a) => a.status === "present" || a.status === "late").length;
  const lateTodayCount = todayAttendance.filter((a) => a.status === "late").length;
  const pendingLeavesCount = leaves.filter((l) => l.status === "pending").length;
  const currentPayrollTotal = payrollRuns[0]?.totalNet || 109840;

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (deptFilter !== "all" && emp.departmentName.ar !== deptFilter) return false;
      if (branchFilter !== "all" && emp.branchName.ar !== branchFilter) return false;
      if (contractFilter !== "all" && emp.contractType !== contractFilter) return false;
      if (genderFilter !== "all" && emp.gender !== genderFilter) return false;
      if (healthCertFilter !== "all" && emp.healthCert.status !== healthCertFilter) return false;
      if (statusFilter !== "all" && emp.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = emp.code.toLowerCase().includes(q);
        const nameMatch =
          emp.name.ar.toLowerCase().includes(q) ||
          emp.name.en.toLowerCase().includes(q);
        const posMatch =
          emp.positionName.ar.toLowerCase().includes(q) ||
          emp.positionName.en.toLowerCase().includes(q);
        const phoneMatch = emp.phone.toLowerCase().includes(q);
        const nidMatch = emp.nationalId.toLowerCase().includes(q);
        const supMatch = emp.directManager.toLowerCase().includes(q);
        return codeMatch || nameMatch || posMatch || phoneMatch || nidMatch || supMatch;
      }
      return true;
    });
  }, [
    employees,
    deptFilter,
    branchFilter,
    contractFilter,
    genderFilter,
    healthCertFilter,
    statusFilter,
    searchQuery,
  ]);

  // Filtered Attendance Records
  const filteredAttendance = useMemo(() => {
    return attendance.filter((rec) => {
      if (attendanceDate && rec.date !== attendanceDate) return false;
      if (attendanceStatusFilter !== "all" && rec.status !== attendanceStatusFilter) return false;
      if (attendanceShiftFilter !== "all") {
        if (attendanceShiftFilter === "morning" && !rec.shiftName.ar.includes("الصباح")) return false;
        if (attendanceShiftFilter === "evening" && !rec.shiftName.ar.includes("مسائية")) return false;
        if (attendanceShiftFilter === "hq" && !rec.shiftName.ar.includes("المقر")) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.employeeCode.toLowerCase().includes(q) ||
          rec.employeeName.ar.toLowerCase().includes(q) ||
          rec.employeeName.en.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [attendance, attendanceDate, attendanceStatusFilter, attendanceShiftFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav_hr")}
        subtitle={pick(
          "إدارة شؤون الموظفين، الحضور والانصراف بالورديات، الإجازات، ومسير الرواتب الشهري المربوط بالدفاتر المحاسبية",
          "Workforce management, shift attendance, leave requests workflow, and monthly payroll integrated with general ledger"
        )}
      />

      {/* Top 4 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("hr_activeStaff")}
          value={`${activeEmployeesCount} ${pick("موظف", "staff")}`}
          accent="brand"
        />
        <KpiCard
          label={t("hr_presentToday")}
          value={`${presentTodayCount} / ${employees.length}`}
          delta={lateTodayCount > 0 ? -lateTodayCount : undefined}
          accent={lateTodayCount > 0 ? "gold" : "primary"}
        />
        <KpiCard
          label={t("hr_pendingLeaves")}
          value={`${pendingLeavesCount} ${pick("طلبات", "requests")}`}
          accent="gold"
        />
        <KpiCard
          label={t("hr_monthlyPayroll")}
          value={money(currentPayrollTotal)}
          accent="brand"
        />
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Btn
            variant={activeTab === "employees" ? "solid" : "outline"}
            onClick={() => setActiveTab("employees")}
            className="text-xs gap-1.5"
          >
            <Users className="size-4" />
            {t("hr_employees")}
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-mono">
              {employees.length}
            </span>
          </Btn>

          <Btn
            variant={activeTab === "attendance" ? "solid" : "outline"}
            onClick={() => setActiveTab("attendance")}
            className="text-xs gap-1.5"
          >
            <Clock className="size-4" />
            {t("hr_attendance")}
          </Btn>

          <Btn
            variant={activeTab === "leaves" ? "solid" : "outline"}
            onClick={() => setActiveTab("leaves")}
            className="text-xs gap-1.5"
          >
            <Calendar className="size-4" />
            {t("hr_leaves")}
            {pendingLeavesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                {pendingLeavesCount}
              </span>
            )}
          </Btn>

          <Btn
            variant={activeTab === "payroll" ? "solid" : "outline"}
            onClick={() => setActiveTab("payroll")}
            className="text-xs gap-1.5"
          >
            <DollarSign className="size-4" />
            {t("hr_payroll")}
          </Btn>

          <Btn
            variant={activeTab === "ai" ? "solid" : "outline"}
            onClick={() => setActiveTab("ai")}
            className="text-xs gap-1.5"
          >
            <Sparkles className="size-4 text-amber-500" />
            {t("hr_ai")}
          </Btn>
        </div>

        {/* Tab-specific Quick Action */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "employees" && (
            <>
              <Btn
                variant="outline"
                onClick={() => setIsImportModalOpen(true)}
                className="text-xs gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                <Upload className="size-3.5" />
                {pick("استيراد Excel", "Import Excel")}
              </Btn>

              <Btn
                variant="outline"
                onClick={() => exportEmployeesToExcel(filteredEmployees)}
                className="text-xs gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                title={pick("تصدير الموظفين المفلترين إلى ملف Excel", "Export filtered employees to Excel")}
              >
                <FileSpreadsheet className="size-3.5" />
                {pick("تصدير Excel", "Export Excel")}
                {filteredEmployees.length !== employees.length && (
                  <span className="text-[10px] bg-emerald-500/20 px-1 rounded font-mono">
                    ({filteredEmployees.length})
                  </span>
                )}
              </Btn>

              <Btn
                variant="solid"
                onClick={() => {
                  setEditingEmployee(null);
                  setIsEmployeeFormOpen(true);
                }}
                className="text-xs gap-1.5"
              >
                <UserPlus className="size-4" />
                {pick("إضافة موظف جديد", "Add Employee")}
              </Btn>
            </>
          )}

          {activeTab === "attendance" && (
            <div className="flex flex-wrap items-center gap-2">
              <Btn
                variant="outline"
                onClick={() => exportAttendanceToExcel(filteredAttendance, `attendance_${attendanceDate}.xlsx`)}
                className="text-xs gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                title={pick("تصدير كشف حضور اليوم إلى Excel", "Export attendance log to Excel")}
              >
                <FileSpreadsheet className="size-3.5" />
                {pick("تصدير كشف الدوام", "Export Excel")}
              </Btn>

              <Btn
                variant="outline"
                onClick={() => {
                  const count = bulkCheckIn(attendanceDate);
                  alert(
                    pick(
                      `تم تسجيل حضور جماعي لـ ${count} موظفاً ليوم ${attendanceDate}`,
                      `Bulk checked-in ${count} employees for ${attendanceDate}`
                    )
                  );
                }}
                className="text-xs"
              >
                <UserCheck className="size-4 text-emerald-600" />
                {pick("تسجيل حضور جماعي", "Bulk Check-In")}
              </Btn>

              <Btn
                variant="solid"
                onClick={() => setIsAttendanceModalOpen(true)}
                className="text-xs gap-1.5"
              >
                <Plus className="size-4" />
                {pick("تسجيل بصمة موظف", "Log Punch")}
              </Btn>
            </div>
          )}

          {activeTab === "leaves" && (
            <Btn
              variant="solid"
              onClick={() => setIsLeaveModalOpen(true)}
              className="text-xs gap-1.5"
            >
              <Plus className="size-4" />
              {pick("طلب إجازة جديد", "New Leave Request")}
            </Btn>
          )}

          {activeTab === "payroll" && (
            <Btn
              variant="solid"
              onClick={() => {
                const run = generateMonthlyPayroll("2026-09");
                setSelectedPayrollRun(run);
              }}
              className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Scale className="size-4" />
              {pick("مراجعة واعتماد مسير سبتمبر", "Review September Run")}
            </Btn>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EMPLOYEES DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === "employees" && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
              {/* Search input with clear button */}
              <div className="relative w-full sm:w-80">
                <Search className="size-4 absolute start-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={pick("بحث بالاسم، الكود، الوظيفة، الرقم القومي...", "Search by name, code, title, ID...")}
                  className="w-full ps-9 pe-8 py-1.5 rounded-lg border border-border bg-background text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute end-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title={pick("مسح البحث", "Clear search")}
                  >
                    <XCircle className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Filter Selects & Controls */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Department select */}
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium"
                >
                  <option value="all">{pick("جميع الإدارات", "All Departments")}</option>
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                {/* Branch select */}
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium"
                >
                  <option value="all">{pick("جميع الفروع والمواقع", "All Branches")}</option>
                  {uniqueBranches.map((br) => (
                    <option key={br} value={br}>
                      {br}
                    </option>
                  ))}
                </select>

                {/* Status select */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium"
                >
                  <option value="all">{pick("جميع الحالات", "All Statuses")}</option>
                  <option value="active">{pick("على رأس العمل (Active)", "Active")}</option>
                  <option value="on_leave">{pick("في إجازة (On Leave)", "On Leave")}</option>
                  <option value="probation">{pick("تحت الاختبار (Probation)", "Probation")}</option>
                  <option value="terminated">{pick("منتهي الخدمة (Terminated)", "Terminated")}</option>
                </select>

                {/* Advanced Filters Toggle Button */}
                <Btn
                  variant={showAdvancedFilters ? "solid" : "outline"}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="text-xs gap-1.5"
                  title={pick("فلاتر إضافية: نوع التعاقد، الجنس، الشهادة الصحية", "Advanced filters: Contract, Gender, Health Cert")}
                >
                  <SlidersHorizontal className="size-3.5" />
                  {pick("فلاتر متقدمة", "Advanced")}
                  {[contractFilter !== "all", genderFilter !== "all", healthCertFilter !== "all"].filter(Boolean).length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary text-primary-foreground font-mono font-bold">
                      {[contractFilter !== "all", genderFilter !== "all", healthCertFilter !== "all"].filter(Boolean).length}
                    </span>
                  )}
                  {showAdvancedFilters ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </Btn>

                {/* Reset Filters button */}
                {activeFiltersCount > 0 && (
                  <Btn
                    variant="ghost"
                    onClick={resetAllFilters}
                    className="text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                    title={pick("إلغاء جميع الفلاتر والبحث", "Reset all filters and search")}
                  >
                    <RotateCcw className="size-3" />
                    {pick("إعادة ضبط", "Reset")}
                    <span className="text-[10px] font-mono">({activeFiltersCount})</span>
                  </Btn>
                )}
              </div>
            </div>

            {/* Collapsible Advanced Filters Drawer */}
            {showAdvancedFilters && (
              <div className="p-3 rounded-lg border border-border/70 bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-foreground flex items-center gap-1.5">
                    <Filter className="size-3.5 text-primary" />
                    {pick("تخصيص البحث والفلاتر التفصيلية", "Detailed Filter Criteria")}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {pick(`إجمالي المطابق: ${filteredEmployees.length} من أصل ${employees.length}`, `Matching: ${filteredEmployees.length} of ${employees.length} staff`)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Contract Type */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      {pick("نوع التعاقد (Contract Type)", "Contract Type")}
                    </label>
                    <select
                      value={contractFilter}
                      onChange={(e) => setContractFilter(e.target.value)}
                      className="w-full px-2.5 py-1 rounded-md border border-border bg-background text-xs"
                    >
                      <option value="all">{pick("جميع العقود", "All Contract Types")}</option>
                      <option value="عقد محدد المدة 3 سنوات (Fixed-term)">{pick("محدد المدة 3 سنوات", "Fixed-term (3 yrs)")}</option>
                      <option value="عقد محدد المدة سنتان (Fixed-term)">{pick("محدد المدة سنتان", "Fixed-term (2 yrs)")}</option>
                      <option value="عقد غير محدد المدة (Indefinite)">{pick("غير محدد المدة", "Indefinite")}</option>
                      <option value="دوام جزئي (Part-time)">{pick("دوام جزئي", "Part-time")}</option>
                      <option value="موسمي (Seasonal)">{pick("موسمي", "Seasonal")}</option>
                      <option value="تحت الاختبار (Probation)">{pick("تحت الاختبار", "Probation")}</option>
                    </select>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      {pick("النوع / الجنس (Gender)", "Gender")}
                    </label>
                    <select
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value)}
                      className="w-full px-2.5 py-1 rounded-md border border-border bg-background text-xs"
                    >
                      <option value="all">{pick("الكل (الذكور والإناث)", "All (Male & Female)")}</option>
                      <option value="male">{pick("ذكر (Male)", "Male")}</option>
                      <option value="female">{pick("أنثى (Female)", "Female")}</option>
                    </select>
                  </div>

                  {/* Health Certificate */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      {pick("الشهادة الصحية لمناولة الغذاء", "Food Handling Health Cert")}
                    </label>
                    <select
                      value={healthCertFilter}
                      onChange={(e) => setHealthCertFilter(e.target.value)}
                      className="w-full px-2.5 py-1 rounded-md border border-border bg-background text-xs"
                    >
                      <option value="all">{pick("جميع الشهادات", "All Health Certs")}</option>
                      <option value="valid">{pick("سارية الصلاحية (Valid)", "Valid")}</option>
                      <option value="expiring_soon">{pick("تنتهي خلال 30 يوماً (Expiring Soon)", "Expiring Soon")}</option>
                      <option value="expired">{pick("منتهية الصلاحية (Expired)", "Expired")}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Employees Table */}
          <Panel title={pick("سجل العاملين والملفات الوظيفية", "Staff Directory & Personnel Files")}>
            <DataTable
              head={[
                pick("الكود", "Code"),
                pick("الموظف", "Employee"),
                pick("الإدارة والموقع", "Dept & Branch"),
                pick("نوع التعاقد", "Contract"),
                pick("الشهادة الصحية", "Health Cert"),
                pick("الراتب الشامل", "Gross Salary"),
                pick("الحالة", "Status"),
                pick("الإجراءات", "Actions"),
              ]}
            >
              {filteredEmployees.map((emp) => {
                const totalGross =
                  emp.compensation.basicSalary +
                  emp.compensation.housingAllowance +
                  emp.compensation.transportAllowance +
                  emp.compensation.foodAllowance +
                  emp.compensation.kpiBonus;

                return (
                  <tr key={emp.id} className="hover:bg-secondary/50 transition-colors">
                    <Td className="font-mono font-bold text-xs">{emp.code}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`size-8 rounded-lg bg-linear-to-br ${emp.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0`}
                        >
                          {emp.avatarInitials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-ink-foreground text-xs">
                              {pick(emp.name.ar, emp.name.en)}
                            </p>
                            <span className="text-[11px]" title={emp.gender === "female" ? "Female" : "Male"}>
                              {emp.gender === "female" ? "👩" : "👨"}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {pick(emp.positionName.ar, emp.positionName.en)}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="text-xs">
                        <p className="font-medium text-ink-foreground">
                          {pick(emp.departmentName.ar, emp.departmentName.en)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {pick(emp.branchName.ar, emp.branchName.en)}
                        </p>
                      </div>
                    </Td>
                    <Td className="text-xs font-medium text-ink-foreground max-w-[140px]">
                      <span className="block truncate" title={emp.contractType}>
                        {emp.contractType || pick("عقد دائم", "Permanent")}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.healthCert.status === "valid"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : emp.healthCert.status === "expiring_soon"
                            ? "bg-amber-500/10 text-amber-600"
                            : emp.healthCert.status === "expired"
                            ? "bg-rose-500/10 text-rose-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {emp.healthCert.status === "valid" && <ShieldCheck className="size-3" />}
                        {emp.healthCert.status === "expiring_soon" && <Clock className="size-3" />}
                        {emp.healthCert.status === "expired" && <ShieldAlert className="size-3" />}
                        {emp.healthCert.status === "valid"
                          ? pick("سارية", "Valid")
                          : emp.healthCert.status === "expiring_soon"
                          ? pick("توشك على الانتهاء", "Expiring Soon")
                          : emp.healthCert.status === "expired"
                          ? pick("منتهية!", "Expired!")
                          : pick("غير مطلوب", "N/A")}
                      </span>
                    </Td>
                    <Td className="font-mono font-bold text-xs">{money(totalGross)}</Td>
                    <Td>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : emp.status === "on_leave"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {emp.status === "active"
                          ? pick("على رأس العمل", "Active")
                          : emp.status === "on_leave"
                          ? pick("في إجازة", "On Leave")
                          : pick("فترة اختبار", "Probation")}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailEmployee(emp)}
                          title={pick("عرض الملف الوظيفي", "View Dossier")}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEmployee(emp);
                            setIsEmployeeFormOpen(true);
                          }}
                          title={pick("تعديل البيانات", "Edit")}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(pick(`هل أنت متأكد من حذف ${emp.code}؟`, `Delete ${emp.code}?`))) {
                              deleteEmployee(emp.id);
                            }
                          }}
                          title={pick("حذف الموظف", "Delete")}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </DataTable>
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ATTENDANCE & SHIFTS */}
      {/* ========================================================================= */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          {/* Attendance Filters Bar */}
          <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  {pick("تاريخ الحضور:", "Date:")}
                </label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono"
                />
              </div>

              {/* Shift Filter */}
              <select
                value={attendanceShiftFilter}
                onChange={(e) => setAttendanceShiftFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium"
              >
                <option value="all">{pick("جميع الورديات", "All Shifts")}</option>
                <option value="morning">{pick("الوردية الصباحية (07:00 - 15:30)", "Morning Shift")}</option>
                <option value="evening">{pick("الوردية المسائية (15:00 - 23:30)", "Evening Shift")}</option>
                <option value="hq">{pick("دوام المقر الإداري (09:00 - 17:00)", "HQ Office Hours")}</option>
              </select>

              {/* Attendance Status Filter */}
              <select
                value={attendanceStatusFilter}
                onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium"
              >
                <option value="all">{pick("جميع حالات الحضور", "All Statuses")}</option>
                <option value="present">{pick("حاضر في الموعد (Present)", "Present")}</option>
                <option value="late">{pick("تأخير صباحي (Late)", "Late")}</option>
                <option value="absent">{pick("غياب غير مبرر (Absent)", "Absent")}</option>
                <option value="on_leave">{pick("في إجازة رسمية (On Leave)", "On Leave")}</option>
              </select>

              {(attendanceShiftFilter !== "all" || attendanceStatusFilter !== "all") && (
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAttendanceShiftFilter("all");
                    setAttendanceStatusFilter("all");
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700"
                >
                  <RotateCcw className="size-3" />
                  {pick("إلغاء الفرز", "Clear")}
                </Btn>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground self-end md:self-auto">
              <div>
                {pick("السجلات المطابقة:", "Matching records:")}{" "}
                <span className="font-bold font-mono text-ink-foreground">{filteredAttendance.length}</span>
              </div>
            </div>
          </div>

          <Panel title={pick("كشف دوام الحضور والانصراف والساعات الإضافية", "Shift Punches & Overtime Log")}>
            <DataTable
              head={[
                pick("الكود", "Code"),
                pick("الموظف", "Employee"),
                pick("الإدارة", "Department"),
                pick("الوردية", "Shift Schedule"),
                pick("الحضور", "Check-In"),
                pick("الانصراف", "Check-Out"),
                pick("ساعات إضافية", "Overtime"),
                pick("الحالة", "Status"),
                pick("ملاحظات", "Notes"),
              ]}
            >
              {filteredAttendance.map((rec) => (
                <tr key={rec.id} className="hover:bg-secondary/50">
                  <Td className="font-mono font-bold text-xs">{rec.employeeCode}</Td>
                  <Td className="font-bold text-xs">{pick(rec.employeeName.ar, rec.employeeName.en)}</Td>
                  <Td className="text-xs text-muted-foreground">{pick(rec.departmentName.ar, rec.departmentName.en)}</Td>
                  <Td className="text-xs">{pick(rec.shiftName.ar, rec.shiftName.en)}</Td>
                  <Td className="font-mono text-xs font-semibold text-emerald-600">{rec.checkIn}</Td>
                  <Td className="font-mono text-xs text-muted-foreground">{rec.checkOut}</Td>
                  <Td className="font-mono text-xs text-center">
                    {rec.overtimeHours > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                        +{rec.overtimeHours} {pick("ساعة", "hrs")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.status === "present"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : rec.status === "late"
                          ? "bg-amber-500/10 text-amber-600"
                          : rec.status === "on_leave"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-rose-500/10 text-rose-600"
                      }`}
                    >
                      {rec.status === "present"
                        ? pick("حاضر", "Present")
                        : rec.status === "late"
                        ? pick(`متأخر (${rec.lateMinutes} د)`, `Late (${rec.lateMinutes}m)`)
                        : rec.status === "on_leave"
                        ? pick("إجازة", "On Leave")
                        : pick("غائب", "Absent")}
                    </span>
                  </Td>
                  <Td className="text-xs text-muted-foreground max-w-xs truncate">
                    {rec.notes || "—"}
                  </Td>
                </tr>
              ))}
            </DataTable>
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LEAVES & TIME OFF */}
      {/* ========================================================================= */}
      {activeTab === "leaves" && (
        <div className="space-y-6">
          {/* Pending Approvals Section */}
          {pendingLeavesCount > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="size-4" />
                {pick("طلبات إجازة بانتظار الاعتماد الفوري", "Pending Approval Requests")} ({pendingLeavesCount})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leaves
                  .filter((l) => l.status === "pending")
                  .map((req) => (
                    <div
                      key={req.id}
                      className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-ink-foreground">
                              {pick(req.employeeName.ar, req.employeeName.en)}
                            </span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                              {req.employeeCode}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pick(req.departmentName.ar, req.departmentName.en)}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          {req.leaveType === "annual"
                            ? pick("إجازة سنوية", "Annual Leave")
                            : req.leaveType === "emergency"
                            ? pick("إجازة عارضة", "Emergency")
                            : pick("إجازة مرضية", "Sick")}
                        </span>
                      </div>

                      <div className="bg-muted/20 p-2.5 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{pick("الفترة:", "Duration:")}</span>
                          <span className="font-bold text-ink-foreground">
                            {req.startDate} ⬅ {req.endDate} ({req.daysCount} {pick("أيام", "days")})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{pick("السبب:", "Reason:")}</span>
                          <span className="text-ink-foreground font-medium">{req.reason}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Btn
                          size="sm"
                          variant="outline"
                          onClick={() => rejectLeaveRequest(req.id, "م. حافظ رحيم", "تعذر الموافقة لضغط العمل")}
                          className="text-xs text-rose-600 hover:bg-rose-50"
                        >
                          <XCircle className="size-3.5" />
                          {pick("رفض", "Reject")}
                        </Btn>
                        <Btn
                          size="sm"
                          variant="solid"
                          onClick={() => approveLeaveRequest(req.id, "م. حافظ رحيم", "تم الاعتماد")}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="size-3.5" />
                          {pick("اعتماد وخصم من الرصيد", "Approve & Deduct")}
                        </Btn>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Historical Leaves Log */}
          <Panel title={pick("سجل الإجازات المعتمدة والسابقة", "Historical Leave Log")}>
            <DataTable
              head={[
                pick("الكود", "Code"),
                pick("الموظف", "Employee"),
                pick("نوع الإجازة", "Leave Type"),
                pick("من تاريخ", "Start Date"),
                pick("إلى تاريخ", "End Date"),
                pick("المدة", "Days"),
                pick("الحالة", "Status"),
                pick("المعتمد", "Approved By"),
              ]}
            >
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-secondary/50">
                  <Td className="font-mono text-xs">{l.employeeCode}</Td>
                  <Td className="font-bold text-xs">{pick(l.employeeName.ar, l.employeeName.en)}</Td>
                  <Td className="text-xs">
                    {l.leaveType === "annual"
                      ? pick("سنوية", "Annual")
                      : l.leaveType === "sick"
                      ? pick("مرضية", "Sick")
                      : pick("عارضة", "Emergency")}
                  </Td>
                  <Td className="font-mono text-xs">{l.startDate}</Td>
                  <Td className="font-mono text-xs">{l.endDate}</Td>
                  <Td className="font-mono text-xs font-bold text-center">{l.daysCount}</Td>
                  <Td>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        l.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : l.status === "rejected"
                          ? "bg-rose-500/10 text-rose-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {l.status === "approved"
                        ? pick("معتمدة", "Approved")
                        : l.status === "rejected"
                        ? pick("مرفوضة", "Rejected")
                        : pick("معلقة", "Pending")}
                    </span>
                  </Td>
                  <Td className="text-xs text-muted-foreground">{l.reviewedBy || "—"}</Td>
                </tr>
              ))}
            </DataTable>
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PAYROLL & COMPENSATION */}
      {/* ========================================================================= */}
      {activeTab === "payroll" && (
        <div className="space-y-6">
          {/* Active Payroll Runs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {payrollRuns.map((run) => (
              <div
                key={run.id}
                className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-ink-foreground">
                      {pick(run.title.ar, run.title.en)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {pick("تاريخ الإصدار:", "Run Date:")} {run.runDate}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      run.status === "posted_to_gl"
                        ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                        : run.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {run.status === "posted_to_gl"
                      ? pick("مرحل لدفتر اليومية (GL Posted)", "GL Posted")
                      : run.status === "approved"
                      ? pick("معتمد (Approved)", "Approved")
                      : pick("مسودة (Draft)", "Draft")}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-muted/20 p-3 rounded-lg text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">{pick("الإجمالي:", "Gross:")}</span>
                    <span className="font-mono font-bold text-ink-foreground">{money(run.totalGross)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">{pick("الاستقطاعات:", "Deductions:")}</span>
                    <span className="font-mono font-bold text-rose-600">-{money(run.totalDeductions)}</span>
                  </div>
                  <div>
                    <span className="text-primary block text-[10px] font-semibold">{pick("الصافي:", "Net Pay:")}</span>
                    <span className="font-mono font-black text-primary">{money(run.totalNet)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {run.totalEmployees} {pick("موظفين مشمولين", "staff members")}
                  </span>
                  <Btn
                    variant="solid"
                    size="sm"
                    onClick={() => setSelectedPayrollRun(run)}
                    className="text-xs gap-1.5"
                  >
                    <FileText className="size-3.5" />
                    {pick("كشف تفصيلي واعتماد المسير", "Inspect & Approve")}
                  </Btn>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Itemized Payslips Table */}
          <Panel title={pick("أحدث قسائم الرواتب الفردية الصادرة", "Recent Itemized Payslips")}>
            <DataTable
              head={[
                pick("الكود", "Code"),
                pick("الموظف", "Employee"),
                pick("الإدارة", "Department"),
                pick("الفترة", "Period"),
                pick("الراتب الأساسي", "Basic"),
                pick("الإضافي والبدلات", "Allowances"),
                pick("الاستقطاعات", "Deductions"),
                pick("الصافي للتحويل", "Net Pay"),
                pick("قسيمة القبض", "Payslip"),
              ]}
            >
              {payrollRuns[0]?.payslips.map((ps) => {
                const allowances =
                  ps.housingAllowance +
                  ps.transportAllowance +
                  ps.foodAllowance +
                  ps.kpiBonus +
                  ps.overtimePay;

                return (
                  <tr key={ps.id} className="hover:bg-secondary/50">
                    <Td className="font-mono font-bold text-xs">{ps.employeeCode}</Td>
                    <Td className="font-bold text-xs">{pick(ps.employeeName.ar, ps.employeeName.en)}</Td>
                    <Td className="text-xs text-muted-foreground">{pick(ps.departmentName.ar, ps.departmentName.en)}</Td>
                    <Td className="font-mono text-xs">{ps.period}</Td>
                    <Td className="font-mono text-xs">{money(ps.basicSalary)}</Td>
                    <Td className="font-mono text-xs text-emerald-600">+{money(allowances)}</Td>
                    <Td className="font-mono text-xs text-rose-600">-{money(ps.totalDeductions)}</Td>
                    <Td className="font-mono text-xs font-bold text-primary">{money(ps.netSalary)}</Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => setSelectedPayslip(ps)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-[11px] font-semibold transition-colors"
                      >
                        <Printer className="size-3" />
                        {pick("قسيمة رسمية", "Official Slip")}
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </DataTable>
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AI HR INSIGHTS & COPILOT */}
      {/* ========================================================================= */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          {/* AI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-sm relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`size-8 rounded-lg flex items-center justify-center ${
                        ins.type === "warning"
                          ? "bg-rose-500/10 text-rose-600"
                          : ins.type === "action"
                          ? "bg-amber-500/10 text-amber-600"
                          : ins.type === "success"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-blue-500/10 text-blue-600"
                      }`}
                    >
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-ink-foreground">
                        {pick(ins.title.ar, ins.title.en)}
                      </h4>
                      {ins.department && (
                        <p className="text-[10px] text-muted-foreground">{ins.department}</p>
                      )}
                    </div>
                  </div>
                  {ins.metric && (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-ink-foreground">
                      {ins.metric}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {pick(ins.description.ar, ins.description.en)}
                </p>

                {ins.suggestedAction && (
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-primary">
                      {pick("الإجراء المقترح من الذكاء:", "AI Recommended Action:")}
                    </span>
                    <Btn
                      size="sm"
                      variant="solid"
                      onClick={() =>
                        alert(
                          pick(
                            `تم تنفيذ الإجراء: ${ins.suggestedAction?.ar}`,
                            `Executed action: ${ins.suggestedAction?.en}`
                          )
                        )
                      }
                      className="text-xs gap-1.5"
                    >
                      <Send className="size-3" />
                      {pick(ins.suggestedAction.ar, ins.suggestedAction.en)}
                    </Btn>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI HR Tool: End of Service Gratuity Calculator (حاسبة مكافأة نهاية الخدمة) */}
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Scale className="size-5 text-primary" />
              <div>
                <h3 className="font-bold text-sm text-ink-foreground">
                  {pick(
                    "حاسبة مكافأة نهاية الخدمة الذكية (طبقاً لقانون العمل المصري)",
                    "Smart End-of-Service Gratuity Calculator (Egyptian Labor Law)"
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {pick(
                    "احتساب المستحقات القانونية وفقاً للمادة 126: أجر نصف شهر عن كل سنة من السنوات الخمس الأولى، وأجر شهر عن كل سنة تالية",
                    "Calculates statutory gratuity: half month basic pay for first 5 years, full month pay for subsequent years"
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {pick("سنوات الخدمة في الشركة", "Years of Service")}
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="40"
                  step="0.5"
                  value={eosYears}
                  onChange={(e) => setEosYears(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {pick("آخر راتب أساسي مستلم (ج.م)", "Last Basic Salary (EGP)")}
                </label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={eosSalary}
                  onChange={(e) => setEosSalary(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold num"
                />
              </div>

              <div className="bg-background rounded-lg border border-primary/30 p-3 flex flex-col justify-center text-center">
                <span className="text-xs text-muted-foreground font-medium">
                  {pick("مكافأة نهاية الخدمة المستحقة", "Total Gratuity Entitlement")}
                </span>
                <span className="text-xl font-black text-primary num mt-0.5">
                  {money(eosGratuity)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      {/* 1. Employee Form Modal (Add / Edit) */}
      <EmployeeFormModal
        open={isEmployeeFormOpen}
        onOpenChange={setIsEmployeeFormOpen}
        editing={editingEmployee}
        suggestedCode={`EMP-${1000 + employees.length + 1}`}
        onSave={(empData) => {
          if (editingEmployee) {
            updateEmployee(editingEmployee.id, empData);
          } else {
            addEmployee(empData);
          }
        }}
      />

      {/* 2. Employee Detail Modal (Dossier) */}
      <EmployeeDetailModal
        open={!!selectedDetailEmployee}
        onOpenChange={(open) => !open && setSelectedDetailEmployee(null)}
        employee={selectedDetailEmployee}
        onEdit={(emp) => {
          setEditingEmployee(emp);
          setIsEmployeeFormOpen(true);
        }}
      />

      {/* 3. Attendance Punch Modal */}
      <AttendanceModal
        open={isAttendanceModalOpen}
        onOpenChange={setIsAttendanceModalOpen}
        employees={employees}
        onSave={(rec) => logAttendance(rec)}
      />

      {/* 4. Leave Request Modal */}
      <LeaveRequestModal
        open={isLeaveModalOpen}
        onOpenChange={setIsLeaveModalOpen}
        employees={employees}
        onSave={(req) => submitLeaveRequest(req)}
      />

      {/* 5. Payslip Modal (Print Preview) */}
      <PayslipModal
        open={!!selectedPayslip}
        onOpenChange={(open) => !open && setSelectedPayslip(null)}
        payslip={selectedPayslip}
      />

      {/* 6. Payroll Process Modal */}
      <PayrollProcessModal
        open={!!selectedPayrollRun}
        onOpenChange={(open) => !open && setSelectedPayrollRun(null)}
        run={selectedPayrollRun}
        onApprove={(id) => approvePayrollRun(id)}
        onPostToGl={(id) => postPayrollToGl(id)}
        onViewPayslip={(ps) => setSelectedPayslip(ps)}
      />

      {/* 7. Employee Import Modal (Excel .xlsx / .csv) */}
      <EmployeeImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImport={(newEmps) => {
          bulkAddEmployees(newEmps);
        }}
      />
    </div>
  );
}
