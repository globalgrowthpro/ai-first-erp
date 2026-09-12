import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Building2,
  Briefcase,
  DollarSign,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Save,
  X,
  BadgeCheck,
  FileCheck2,
} from "lucide-react";
import type { EmployeeRecord, EmploymentType, EmployeeStatus, HealthCertStatus } from "@/lib/hr-store";

interface EmployeeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: EmployeeRecord | null;
  suggestedCode?: string;
  onSave: (data: Omit<EmployeeRecord, "id" | "code"> & { code?: string }) => void;
}

export function EmployeeFormModal({
  open,
  onOpenChange,
  editing,
  suggestedCode,
  onSave,
}: EmployeeFormModalProps) {
  const { pick, dir } = useI18n();

  const [activeTab, setActiveTab] = useState<"personal" | "job" | "comp" | "compliance">("personal");

  // Identification & Gender
  const [code, setCode] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  // Personal Info
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationAr, setEmergencyRelationAr] = useState("");
  const [emergencyRelationEn, setEmergencyRelationEn] = useState("");

  // Job Info & Contract
  const [contractType, setContractType] = useState("عقد دائم غير محدد المدة (Permanent)");
  const [departmentNameAr, setDepartmentNameAr] = useState("");
  const [departmentNameEn, setDepartmentNameEn] = useState("");
  const [positionNameAr, setPositionNameAr] = useState("");
  const [positionNameEn, setPositionNameEn] = useState("");
  const [branchNameAr, setBranchNameAr] = useState("");
  const [branchNameEn, setBranchNameEn] = useState("");
  const [directManager, setDirectManager] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("full_time");
  const [status, setStatus] = useState<EmployeeStatus>("active");

  // Compensation Info
  const [basicSalary, setBasicSalary] = useState<number>(12000);
  const [housingAllowance, setHousingAllowance] = useState<number>(2000);
  const [transportAllowance, setTransportAllowance] = useState<number>(1000);
  const [foodAllowance, setFoodAllowance] = useState<number>(800);
  const [kpiBonus, setKpiBonus] = useState<number>(1000);
  const [bankName, setBankName] = useState("البنك الأهلي المصري (NBE)");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [walletNumber, setWalletNumber] = useState("");

  // Health Compliance
  const [healthCertNumber, setHealthCertNumber] = useState("");
  const [healthCertExpiry, setHealthCertExpiry] = useState("");
  const [healthCertStatus, setHealthCertStatus] = useState<HealthCertStatus>("valid");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCode(editing.code);
      setGender(editing.gender || "male");
      setNameAr(editing.name.ar);
      setNameEn(editing.name.en);
      setNationalId(editing.nationalId);
      setEmail(editing.email);
      setPhone(editing.phone);
      setEmergencyName(editing.emergencyContact.name);
      setEmergencyPhone(editing.emergencyContact.phone);
      setEmergencyRelationAr(editing.emergencyContact.relation.ar);
      setEmergencyRelationEn(editing.emergencyContact.relation.en);

      setContractType(editing.contractType || "عقد دائم غير محدد المدة (Permanent)");
      setDepartmentNameAr(editing.departmentName.ar);
      setDepartmentNameEn(editing.departmentName.en);
      setPositionNameAr(editing.positionName.ar);
      setPositionNameEn(editing.positionName.en);
      setBranchNameAr(editing.branchName.ar);
      setBranchNameEn(editing.branchName.en);
      setDirectManager(editing.directManager);
      setHireDate(editing.hireDate);
      setEmploymentType(editing.employmentType);
      setStatus(editing.status);

      setBasicSalary(editing.compensation.basicSalary);
      setHousingAllowance(editing.compensation.housingAllowance);
      setTransportAllowance(editing.compensation.transportAllowance);
      setFoodAllowance(editing.compensation.foodAllowance);
      setKpiBonus(editing.compensation.kpiBonus);
      setBankName(editing.bank.bankName);
      setAccountNumber(editing.bank.accountNumber);
      setIban(editing.bank.iban);
      setWalletNumber(editing.bank.walletNumber || "");

      setHealthCertNumber(editing.healthCert.number);
      setHealthCertExpiry(editing.healthCert.expiryDate);
      setHealthCertStatus(editing.healthCert.status);
    } else {
      setCode(suggestedCode || `EMP-${Math.floor(1000 + Math.random() * 9000)}`);
      setGender("male");
      setNameAr("");
      setNameEn("");
      setNationalId("");
      setEmail("");
      setPhone("+20 ");
      setEmergencyName("");
      setEmergencyPhone("+20 ");
      setEmergencyRelationAr("أقارب درجة أولى");
      setEmergencyRelationEn("Immediate Family");

      setContractType("عقد دائم غير محدد المدة (Permanent)");
      setDepartmentNameAr("المطبخ المركزي والتصنيع");
      setDepartmentNameEn("Central Kitchen & Manufacturing");
      setPositionNameAr("شيف حلواني");
      setPositionNameEn("Pastry Chef");
      setBranchNameAr("مصنع العاشر من رمضان");
      setBranchNameEn("10th of Ramadan Factory");
      setDirectManager("شيف إبراهيم البدري");
      setHireDate(new Date().toISOString().slice(0, 10));
      setEmploymentType("full_time");
      setStatus("active");

      setBasicSalary(12000);
      setHousingAllowance(1500);
      setTransportAllowance(1000);
      setFoodAllowance(800);
      setKpiBonus(1200);
      setBankName("البنك الأهلي المصري (NBE)");
      setAccountNumber("");
      setIban("");
      setWalletNumber("");

      setHealthCertNumber(`HC-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setHealthCertExpiry("2027-03-31");
      setHealthCertStatus("valid");
      setActiveTab("personal");
    }
  }, [open, editing, suggestedCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() && !nameEn.trim()) return;

    const initials = (nameAr.trim().slice(0, 1) + nameAr.trim().slice(-1)).trim() || "مظ";
    const avatarBg =
      editing?.avatarBg ||
      (gender === "female" ? "from-pink-600 to-rose-700" : "from-blue-600 to-indigo-700");

    onSave({
      code: code.trim(),
      name: {
        ar: nameAr.trim() || nameEn.trim(),
        en: nameEn.trim() || nameAr.trim(),
      },
      nationalId: nationalId.trim() || "29000000000000",
      email: email.trim() || "emp@wazeer-elhelw.com",
      phone: phone.trim() || "+20 10 0000 0000",
      emergencyContact: {
        name: emergencyName.trim() || "جهة اتصال للطوارئ",
        phone: emergencyPhone.trim() || "+20 10 0000 0000",
        relation: {
          ar: emergencyRelationAr.trim() || "أقارب",
          en: emergencyRelationEn.trim() || "Family",
        },
      },
      departmentId: "dept-kitchen",
      departmentName: {
        ar: departmentNameAr.trim() || "المطبخ المركزي",
        en: departmentNameEn.trim() || "Central Kitchen",
      },
      positionId: "pos-chef",
      positionName: {
        ar: positionNameAr.trim() || "شيف حلواني",
        en: positionNameEn.trim() || "Pastry Chef",
      },
      branchId: "br-tenth",
      branchName: {
        ar: branchNameAr.trim() || "مصنع العاشر من رمضان",
        en: branchNameEn.trim() || "10th of Ramadan Factory",
      },
      directManager: directManager.trim() || "م. حافظ رحيم",
      hireDate: hireDate || new Date().toISOString().slice(0, 10),
      gender,
      contractType,
      employmentType,
      status,
      avatarBg,
      avatarInitials: initials,
      compensation: {
        basicSalary: Number(basicSalary) || 0,
        housingAllowance: Number(housingAllowance) || 0,
        transportAllowance: Number(transportAllowance) || 0,
        foodAllowance: Number(foodAllowance) || 0,
        kpiBonus: Number(kpiBonus) || 0,
        socialInsuranceRate: 0.11,
        taxRate: 0.05,
      },
      bank: {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        iban: iban.trim(),
        walletNumber: walletNumber.trim(),
      },
      healthCert: {
        number: healthCertNumber.trim() || "HC-2026-0000",
        expiryDate: healthCertExpiry,
        status: healthCertStatus,
      },
      leaveBalances: editing?.leaveBalances || {
        annualTotal: 21,
        annualUsed: 0,
        sickTotal: 15,
        sickUsed: 0,
        emergencyTotal: 6,
        emergencyUsed: 0,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <User className="size-5 text-primary" />
            {editing
              ? pick(`تعديل بيانات الموظف: ${editing.code}`, `Edit Employee: ${editing.code}`)
              : pick("إضافة موظف جديد إلى المنظومة", "Add New Employee")}
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border/70 gap-2 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "personal"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {pick("البيانات الشخصية والتعريف", "Personal & ID")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("job")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "job"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {pick("الوظيفة والعقد والفرع", "Job, Contract & Branch")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comp")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "comp"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {pick("الراتب والبدلات والبنك", "Compensation & Bank")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("compliance")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "compliance"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {pick("السلامة والشهادة الصحية", "Health & Safety")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* TAB 1: Personal Info & Identification */}
          {activeTab === "personal" && (
            <div className="space-y-3">
              {/* Row 1: Employee ID + Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 border border-border/60 rounded-lg">
                <div>
                  <label className="block text-xs font-bold text-ink-foreground mb-1 flex items-center gap-1.5">
                    <BadgeCheck className="size-3.5 text-primary" />
                    {pick("الرقم الوظيفي / كود الموظف (Employee ID) *", "Employee ID / Code *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="EMP-1001"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    {pick("كود فريد يحدد هوية الموظف في البصمة والرواتب", "Unique ID used for attendance & payroll")}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-foreground mb-1 flex items-center gap-1.5">
                    <User className="size-3.5 text-primary" />
                    {pick("النوع / الجنس (Gender) *", "Gender *")}
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setGender("male")}
                      className={`py-2 px-3 rounded-md border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        gender === "male"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-background border-input text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>👨</span>
                      <span>{pick("ذكر (Male)", "Male")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender("female")}
                      className={`py-2 px-3 rounded-md border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        gender === "female"
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-background border-input text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>👩</span>
                      <span>{pick("أنثى (Female)", "Female")}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("الاسم بالعربية *", "Name (Arabic) *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: شيف سامح خليل"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("الاسم بالإنجليزية", "Name (English)")}
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Sameh Khalil"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Row 3: National ID, Phone, Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("الرقم القومي / الإقامة", "National ID / Iqama")}
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="14 رقماً"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("رقم الهاتف", "Phone Number")}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+20 10..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("البريد الإلكتروني", "Email")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="emp@wazeer-elhelw.com"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-xs font-bold text-ink-foreground/80 mb-2">
                  {pick("بيانات الطوارئ (Emergency Contact)", "Emergency Contact")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      {pick("اسم جهة الاتصال", "Contact Name")}
                    </label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="مثال: منى خليل"
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      {pick("هاتف الطوارئ", "Emergency Phone")}
                    </label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="+20 10..."
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      {pick("صلة القرابة", "Relationship")}
                    </label>
                    <input
                      type="text"
                      value={emergencyRelationAr}
                      onChange={(e) => {
                        setEmergencyRelationAr(e.target.value);
                        setEmergencyRelationEn(e.target.value);
                      }}
                      placeholder="زوجة / شقيق / والد"
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Job Info & Contract Type */}
          {activeTab === "job" && (
            <div className="space-y-3">
              {/* Contract Type Banner */}
              <div className="p-3 bg-muted/30 border border-border/70 rounded-lg">
                <label className="block text-xs font-bold text-ink-foreground mb-1 flex items-center gap-1.5">
                  <FileCheck2 className="size-4 text-primary" />
                  {pick("نوع العقد (Contract Type) *", "Contract Type *")}
                </label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-primary"
                >
                  <option value="عقد دائم غير محدد المدة (Permanent)">
                    {pick("عقد دائم غير محدد المدة (Permanent / Indefinite)", "Permanent / Indefinite Contract")}
                  </option>
                  <option value="عقد محدد المدة 3 سنوات (Fixed-term 3 Years)">
                    {pick("عقد محدد المدة — 3 سنوات (Fixed-term)", "Fixed-term 3 Years Contract")}
                  </option>
                  <option value="عقد محدد المدة سنتين (Fixed-term 2 Years)">
                    {pick("عقد محدد المدة — سنتين (Fixed-term)", "Fixed-term 2 Years Contract")}
                  </option>
                  <option value="عقد سنوي متجدد (Annual Renewable)">
                    {pick("عقد سنوي قابل للتجديد (Annual Renewable)", "Annual Renewable Contract")}
                  </option>
                  <option value="عقد موسمي / ورديات (Shift & Seasonal)">
                    {pick("عقد تشغيل موسمي (أعياد/رمضان/موالد) (Seasonal)", "Seasonal / Event-based Contract")}
                  </option>
                  <option value="عقد تحت الاختبار 3 أشهر (Probationary 3 Months)">
                    {pick("عقد مؤقت لفترة الاختبار 3 أشهر (Probation)", "Probationary Contract (3 Months)")}
                  </option>
                  <option value="عقد تدريب مهني وتأهيل (Apprenticeship)">
                    {pick("عقد تدريب مهني وتأهيل (Internship / Apprenticeship)", "Apprenticeship / Internship")}
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("الإدارة / القسم", "Department")}
                  </label>
                  <select
                    value={departmentNameAr}
                    onChange={(e) => {
                      setDepartmentNameAr(e.target.value);
                      if (e.target.value.includes("المطبخ")) setDepartmentNameEn("Central Kitchen");
                      else if (e.target.value.includes("مبيعات")) setDepartmentNameEn("Retail Sales");
                      else if (e.target.value.includes("إمداد")) setDepartmentNameEn("Supply Chain");
                      else setDepartmentNameEn("Corporate HQ");
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="المطبخ المركزي والتصنيع">المطبخ المركزي والتصنيع (Kitchen & Factory)</option>
                    <option value="مبيعات التجزئة والفروع">مبيعات التجزئة والفروع (Retail & POS)</option>
                    <option value="سلاسل الإمداد والخدمات اللوجستية">سلاسل الإمداد والخدمات اللوجستية (Logistics)</option>
                    <option value="الموارد البشرية والشؤون الإدارية">الموارد البشرية والشؤون الإدارية (HR)</option>
                    <option value="الإدارة المالية والمراجعة">الإدارة المالية والمراجعة (Finance)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("المسمى الوظيفي", "Job Position")}
                  </label>
                  <input
                    type="text"
                    required
                    value={positionNameAr}
                    onChange={(e) => {
                      setPositionNameAr(e.target.value);
                      setPositionNameEn(e.target.value);
                    }}
                    placeholder="مثال: شيف حلواني أول / كاشير / مسؤول مخزن"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("موقع العمل / الفرع", "Branch / Work Location")}
                  </label>
                  <select
                    value={branchNameAr}
                    onChange={(e) => {
                      setBranchNameAr(e.target.value);
                      setBranchNameEn(e.target.value);
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="مصنع العاشر من رمضان">مصنع العاشر من رمضان (Central Factory)</option>
                    <option value="فرع الكوربة — مصر الجديدة">فرع الكوربة — مصر الجديدة</option>
                    <option value="فرع المعادي — دجلة">فرع المعادي — دجلة</option>
                    <option value="المقر الرئيسي — القاهرة الجديدة">المقر الرئيسي — القاهرة الجديدة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("المسؤول المباشر", "Direct Supervisor")}
                  </label>
                  <input
                    type="text"
                    value={directManager}
                    onChange={(e) => setDirectManager(e.target.value)}
                    placeholder="مثال: شيف إبراهيم البدري"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("تاريخ التعيين", "Hire Date")}
                  </label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("نظام الدوام", "Employment Schedule")}
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="full_time">دوام كامل (Full-time)</option>
                    <option value="shift">ورديات مجدولة (Shift Worker)</option>
                    <option value="part_time">دوام جزئي (Part-time)</option>
                    <option value="seasonal">موسمي (Seasonal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("حالة العمل", "Status")}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="active">على رأس العمل (Active)</option>
                    <option value="probation">فترة اختبار (Probation)</option>
                    <option value="on_leave">في إجازة (On Leave)</option>
                    <option value="suspended">موقوف مؤقتاً (Suspended)</option>
                    <option value="terminated">منتهي خدمته (Terminated)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Compensation & Banking */}
          {activeTab === "comp" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("الراتب الأساسي (ج.م) *", "Basic Salary (EGP) *")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("بدل سكن (ج.م)", "Housing Allowance")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={housingAllowance}
                    onChange={(e) => setHousingAllowance(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("بدل انتقال (ج.م)", "Transport Allowance")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={transportAllowance}
                    onChange={(e) => setTransportAllowance(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("بدل وجبة / مطبخ (ج.م)", "Meal Allowance")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={foodAllowance}
                    onChange={(e) => setFoodAllowance(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("حافز أداء / KPI (ج.م)", "KPI Bonus")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={kpiBonus}
                    onChange={(e) => setKpiBonus(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm num"
                  />
                </div>
                <div className="bg-primary/10 rounded-lg p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-muted-foreground">
                    {pick("إجمالي الراتب الشامل", "Total Gross")}
                  </span>
                  <span className="text-sm font-bold text-primary num">
                    {(basicSalary + housingAllowance + transportAllowance + foodAllowance + kpiBonus).toLocaleString()}{" "}
                    {pick("ج.م", "EGP")}
                  </span>
                </div>
              </div>

              {/* Banking Details */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                <p className="text-xs font-bold text-ink-foreground/80">
                  {pick("بيانات التحويل البنكي ومحافظ الدفع (Disbursement)", "Bank & Disbursement Info")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      {pick("اسم البنك", "Bank Name")}
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="البنك الأهلي / بنك مصر / CIB"
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      {pick("رقم الحساب البنكي", "Account Number")}
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="1234567890..."
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      {pick("الآيبان الدولي (IBAN)", "IBAN")}
                    </label>
                    <input
                      type="text"
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      placeholder="EG..."
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      {pick("محفظة إلكترونية / إنستاباي (InstaPay)", "Mobile Wallet / InstaPay")}
                    </label>
                    <input
                      type="text"
                      value={walletNumber}
                      onChange={(e) => setWalletNumber(e.target.value)}
                      placeholder="010... / username@instapay"
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Health & Compliance */}
          {activeTab === "compliance" && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                {pick(
                  "تنبيه رقابي: طبقاً لمعايير هيئة سلامة الغذاء المصرية، يلزم توفر شهادة صحية سارية لجميع العاملين في خطوط الطهي، والتعبئة، والمخازن المبردة، ومبيعات الحلويات.",
                  "Regulatory Notice: In accordance with Egyptian Food Safety Authority regulations, valid health certificates are mandatory for all pastry chefs, food handlers, and store staff."
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("رقم الشهادة الصحية", "Health Cert Number")}
                  </label>
                  <input
                    type="text"
                    value={healthCertNumber}
                    onChange={(e) => setHealthCertNumber(e.target.value)}
                    placeholder="HC-2026-..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("تاريخ انتهاء الشهادة", "Expiration Date")}
                  </label>
                  <input
                    type="date"
                    value={healthCertExpiry}
                    onChange={(e) => setHealthCertExpiry(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {pick("حالة الشهادة", "Certificate Status")}
                  </label>
                  <select
                    value={healthCertStatus}
                    onChange={(e) => setHealthCertStatus(e.target.value as HealthCertStatus)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="valid">سارية ومعتمدة (Valid)</option>
                    <option value="expiring_soon">تنتهي قريباً خلال 30 يوم (Expiring Soon)</option>
                    <option value="expired">منتهية الصلاحية (Expired)</option>
                    <option value="not_required">غير مطلوب (إداري/مكتبي) (Not Required)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
            <Btn
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {pick("إلغاء", "Cancel")}
            </Btn>
            <Btn type="submit" variant="solid" className="gap-1.5">
              <Save className="size-4" />
              {pick("حفظ بيانات الموظف", "Save Employee")}
            </Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
