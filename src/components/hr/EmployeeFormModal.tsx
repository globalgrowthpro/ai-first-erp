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
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type EmployeeRecord,
  type EmploymentType,
  type EmployeeStatus,
  type HealthCertStatus,
  MALE_AVATARS,
  FEMALE_AVATARS,
  getDefaultAvatar,
  useHrStore,
} from "@/lib/hr-store";
import { useOrgStore } from "@/lib/org-store";
import { useInventoryStore } from "@/lib/inventory-store";
import { supabase } from "@/integrations/supabase/client";
import { getProvisionedAccount } from "@/lib/auth-store";

interface EmployeeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: EmployeeRecord | null;
  suggestedCode?: string;
  onSave: (data: Omit<EmployeeRecord, "id"> & {
    grantErpAccess?: boolean;
    erpRole?: string;
    erpPassword?: string;
  }) => void;
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

  // Real Database Records
  const { departments: orgDepts, positions: orgPositions } = useOrgStore();
  const { branches: invBranches } = useInventoryStore();
  const { employees } = useHrStore();

  const [dbDepts, setDbDepts] = useState<{ id: string; nameAr: string; nameEn: string; code: string }[]>([]);
  const [dbBranches, setDbBranches] = useState<{ id: string; nameAr: string; nameEn: string; code: string; isWazeerOwned?: boolean }[]>([]);
  const [dbPositions, setDbPositions] = useState<{ id: string; titleAr: string; titleEn: string; code: string; departmentId?: string }[]>([]);

  // Identification & Gender
  const [code, setCode] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [avatarUrl, setAvatarUrl] = useState("");

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
  const [departmentId, setDepartmentId] = useState("");
  const [departmentNameAr, setDepartmentNameAr] = useState("");
  const [departmentNameEn, setDepartmentNameEn] = useState("");
  const [positionId, setPositionId] = useState("");
  const [positionNameAr, setPositionNameAr] = useState("");
  const [positionNameEn, setPositionNameEn] = useState("");
  const [branchId, setBranchId] = useState("");
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

  // ERP System User Account Access
  const [grantErpAccess, setGrantErpAccess] = useState(false);
  const [erpRole, setErpRole] = useState("sales");
  const [erpPassword, setErpPassword] = useState("");
  const [showErpPassword, setShowErpPassword] = useState(false);

  // Synchronize and load live data from database
  useEffect(() => {
    let isMounted = true;
    async function loadRealData() {
      // 1. Real Departments
      if (orgDepts && orgDepts.length > 0) {
        if (isMounted) setDbDepts(orgDepts.map((d) => ({ id: d.id, nameAr: d.name.ar, nameEn: d.name.en, code: d.code })));
      } else {
        const { data } = await supabase.from("departments").select("id, name_ar, name_en, code").order("name_ar");
        if (data && data.length > 0 && isMounted) {
          setDbDepts(data.map((d: any) => ({ id: d.id, nameAr: d.name_ar, nameEn: d.name_en, code: d.code })));
        }
      }

      // 2. Real Branches
      if (invBranches && invBranches.length > 0) {
        if (isMounted) setDbBranches(invBranches.map((b) => ({ id: b.id, nameAr: b.name.ar, nameEn: b.name.en, code: b.code, isWazeerOwned: b.isWazeerOwned })));
      } else {
        const { data } = await supabase.from("branches").select("id, name_ar, name_en, code, is_wazeer_owned").order("name_ar");
        if (data && data.length > 0 && isMounted) {
          setDbBranches(data.map((b: any) => ({ id: b.id, nameAr: b.name_ar, nameEn: b.name_en, code: b.code, isWazeerOwned: b.is_wazeer_owned })));
        }
      }

      // 3. Real Positions
      if (orgPositions && orgPositions.length > 0) {
        if (isMounted) setDbPositions(orgPositions.map((p) => ({ id: p.id, titleAr: p.title.ar, titleEn: p.title.en, code: p.code || "", departmentId: p.departmentId })));
      } else {
        const { data } = await supabase.from("positions").select("id, title_ar, title_en, code, department_id").order("title_ar");
        if (data && data.length > 0 && isMounted) {
          setDbPositions(data.map((p: any) => ({ id: p.id, titleAr: p.title_ar, titleEn: p.title_en, code: p.code, departmentId: p.department_id })));
        }
      }
    }
    loadRealData();
    return () => { isMounted = false; };
  }, [orgDepts, invBranches, orgPositions]);

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
      setDepartmentId(editing.departmentId || "");
      setDepartmentNameAr(editing.departmentName?.ar || "");
      setDepartmentNameEn(editing.departmentName?.en || "");

      setPositionId(editing.positionId || "");
      setPositionNameAr(editing.positionName?.ar || "");
      setPositionNameEn(editing.positionName?.en || "");

      setBranchId(editing.branchId || "");
      setBranchNameAr(editing.branchName?.ar || "");
      setBranchNameEn(editing.branchName?.en || "");

      setDirectManager(editing.directManager || "Hafez Rahim");
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
      setAvatarUrl(editing.avatarUrl || getDefaultAvatar(editing.gender, editing.code));
      setGrantErpAccess(Boolean(editing.userId));
      const provPass = (editing.email ? getProvisionedAccount(editing.email)?.passwordPlain : "") || (editing.userId ? "Wazeer@2026#" : "");
      setErpPassword(provPass);
      setShowErpPassword(false);
    } else {
      const newCode = suggestedCode || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
      setCode(newCode);
      setGender("male");
      setAvatarUrl(getDefaultAvatar("male", newCode));
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

      // Real Defaults from Database
      const defDept = dbDepts[0] || (orgDepts && orgDepts[0] ? { id: orgDepts[0].id, nameAr: orgDepts[0].name.ar, nameEn: orgDepts[0].name.en } : null);
      if (defDept) {
        setDepartmentId(defDept.id);
        setDepartmentNameAr(defDept.nameAr);
        setDepartmentNameEn(defDept.nameEn);
      } else {
        setDepartmentId("ad8160eb-cbf7-4356-9243-f3755003a7ed");
        setDepartmentNameAr("المطبخ المركزي والتصنيع");
        setDepartmentNameEn("Central Kitchen & Production");
      }

      const defBranch = dbBranches[0] || (invBranches && invBranches[0] ? { id: invBranches[0].id, nameAr: invBranches[0].name.ar, nameEn: invBranches[0].name.en } : null);
      if (defBranch) {
        setBranchId(defBranch.id);
        setBranchNameAr(defBranch.nameAr);
        setBranchNameEn(defBranch.nameEn);
      } else {
        setBranchId("2265d911-4037-4165-b835-31fbef5a7ffe");
        setBranchNameAr("فرع الكوربة — مصر الجديدة");
        setBranchNameEn("Korba — Heliopolis Branch");
      }

      const defPos = dbPositions[0] || (orgPositions && orgPositions[0] ? { id: orgPositions[0].id, titleAr: orgPositions[0].title.ar, titleEn: orgPositions[0].title.en } : null);
      if (defPos) {
        setPositionId(defPos.id);
        setPositionNameAr(defPos.titleAr);
        setPositionNameEn(defPos.titleEn);
      } else {
        setPositionId("a021cfda-5cbd-467c-95f2-12c69d0ef063");
        setPositionNameAr("الشيف التنفيذي لحلويات الوزير");
        setPositionNameEn("Executive Pastry Chef");
      }

      setDirectManager("Hafez Rahim");
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
      setGrantErpAccess(false);
      setErpRole("sales");
      setErpPassword("");
      setShowErpPassword(false);
      setActiveTab("personal");
    }
  }, [open, editing, suggestedCode, dbDepts, dbBranches, dbPositions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() && !nameEn.trim()) return;

    const initials = (nameAr.trim().slice(0, 1) + nameAr.trim().slice(-1)).trim() || "مظ";
    const avatarBg =
      editing?.avatarBg ||
      (gender === "female" ? "from-pink-600 to-rose-700" : "from-blue-600 to-indigo-700");

    const resolvedDeptId = departmentId || (dbDepts.find((d) => d.nameAr === departmentNameAr)?.id) || "ad8160eb-cbf7-4356-9243-f3755003a7ed";
    const resolvedBranchId = branchId || (dbBranches.find((b) => b.nameAr === branchNameAr)?.id) || "2265d911-4037-4165-b835-31fbef5a7ffe";
    const resolvedPosId = positionId || (dbPositions.find((p) => p.titleAr === positionNameAr)?.id) || "a021cfda-5cbd-467c-95f2-12c69d0ef063";

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
      departmentId: resolvedDeptId,
      departmentName: {
        ar: departmentNameAr.trim() || "المطبخ المركزي والتصنيع",
        en: departmentNameEn.trim() || "Central Kitchen & Production",
      },
      positionId: resolvedPosId,
      positionName: {
        ar: positionNameAr.trim() || "الشيف التنفيذي لحلويات الوزير",
        en: positionNameEn.trim() || "Executive Pastry Chef",
      },
      branchId: resolvedBranchId,
      branchName: {
        ar: branchNameAr.trim() || "فرع الكوربة — مصر الجديدة",
        en: branchNameEn.trim() || "Korba — Heliopolis Branch",
      },
      directManager: directManager.trim() || "Hafez Rahim",
      hireDate: hireDate || new Date().toISOString().slice(0, 10),
      gender,
      contractType,
      employmentType,
      status,
      avatarBg,
      avatarInitials: initials,
      avatarUrl: avatarUrl || getDefaultAvatar(gender, code),
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
      ...(grantErpAccess ? { grantErpAccess, erpRole } : {}),
      ...(erpPassword.trim() ? { erpPassword: erpPassword.trim() } : {}),
      userId: editing?.userId || null,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl max-h-[92vh] overflow-y-auto p-6 sm:p-8" dir={dir}>
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "personal"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary"
              }`}
          >
            {pick("البيانات الشخصية والتعريف", "Personal & ID")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("job")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "job"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary"
              }`}
          >
            {pick("الوظيفة والعقد والفرع", "Job, Contract & Branch")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comp")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "comp"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary"
              }`}
          >
            {pick("الراتب والبدلات والبنك", "Compensation & Bank")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("compliance")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "compliance"
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
                  <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                    <User className="size-3.5 text-primary" />
                    {pick("النوع / الجنس (Gender) *", "Gender *")}
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setGender("male");
                        setAvatarUrl((prev) =>
                          FEMALE_AVATARS.includes(prev)
                            ? getDefaultAvatar("male", code)
                            : prev || getDefaultAvatar("male", code)
                        );
                      }}
                      className={`py-2 px-3 rounded-md border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${gender === "male"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-background border-input text-muted-foreground hover:bg-muted"
                        }`}
                    >
                      <span>{pick("ذكر (Male)", "Male")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGender("female");
                        setAvatarUrl((prev) =>
                          MALE_AVATARS.includes(prev)
                            ? getDefaultAvatar("female", code)
                            : prev || getDefaultAvatar("female", code)
                        );
                      }}
                      className={`py-2 px-3 rounded-md border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${gender === "female"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-background border-input text-muted-foreground hover:bg-muted"
                        }`}
                    >
                      <span>{pick("أنثى (Female)", "Female")}</span>
                    </button>
                  </div>

                  {/* Avatar Picker for chosen Gender */}
                  <div className="mt-2.5">
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                      {pick("الصورة الرمزية المختارة:", "Selected Avatar:")}
                    </label>
                    <div className="flex items-center gap-2">
                      {(gender === "female" ? FEMALE_AVATARS : MALE_AVATARS).map((imgUrl, idx) => {
                        const isSelected = avatarUrl === imgUrl || (!avatarUrl && idx === 0);
                        return (
                          <button
                            key={imgUrl}
                            type="button"
                            onClick={() => setAvatarUrl(imgUrl)}
                            className={cn(
                              "relative size-9 rounded-lg overflow-hidden border-2 transition-all p-0.5 bg-muted cursor-pointer",
                              isSelected
                                ? "border-primary ring-2 ring-primary/40 scale-105"
                                : "border-border/60 opacity-60 hover:opacity-100 hover:border-primary/40"
                            )}
                            title={pick(`خيار الصورة ${idx + 1}`, `Avatar ${idx + 1}`)}
                          >
                            <img
                              src={imgUrl}
                              alt={`Avatar ${idx + 1}`}
                              className="size-full object-cover rounded-md"
                            />
                            {isSelected && (
                              <span className="absolute bottom-0.5 end-0.5 size-3 bg-primary rounded-full flex items-center justify-center text-[7px] text-white font-bold">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
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
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-primary" />
                    {pick("الإدارة / القسم *", "Department *")}
                  </label>
                  <select
                    value={departmentId || departmentNameAr}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const dept = dbDepts.find((d) => d.id === selectedVal || d.nameAr === selectedVal);
                      if (dept) {
                        setDepartmentId(dept.id);
                        setDepartmentNameAr(dept.nameAr);
                        setDepartmentNameEn(dept.nameEn);
                      }
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                  >
                    {dbDepts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {pick(d.nameAr, d.nameEn)} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Briefcase className="size-3.5 text-primary" />
                    {pick("المسمى الوظيفي *", "Job Position *")}
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={positionId || (dbPositions.some((p) => p.titleAr === positionNameAr) ? (dbPositions.find((p) => p.titleAr === positionNameAr)?.id || "") : "custom")}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "custom") {
                          setPositionId("");
                        } else {
                          const pos = dbPositions.find((p) => p.id === val || p.titleAr === val);
                          if (pos) {
                            setPositionId(pos.id);
                            setPositionNameAr(pos.titleAr);
                            setPositionNameEn(pos.titleEn);
                          }
                        }
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                    >
                      {dbPositions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {pick(p.titleAr, p.titleEn)} ({p.code})
                        </option>
                      ))}
                      <option value="custom">{pick("— مسمى وظيفي مخصص (كتابة يدوية) —", "— Custom Job Title (Manual Entry) —")}</option>
                    </select>

                    {(!positionId || !dbPositions.some((p) => p.id === positionId)) && (
                      <input
                        type="text"
                        required
                        value={positionNameAr}
                        onChange={(e) => {
                          setPositionNameAr(e.target.value);
                          setPositionNameEn(e.target.value);
                        }}
                        placeholder={pick("أدخل المسمى الوظيفي يدوياً...", "Enter custom job title...")}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" />
                    {pick("موقع العمل / الفرع *", "Branch / Work Location *")}
                  </label>
                  <select
                    value={branchId || branchNameAr}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const br = dbBranches.find((b) => b.id === selectedVal || b.nameAr === selectedVal);
                      if (br) {
                        setBranchId(br.id);
                        setBranchNameAr(br.nameAr);
                        setBranchNameEn(br.nameEn);
                      }
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                  >
                    {dbBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {pick(b.nameAr, b.nameEn)} {b.isWazeerOwned === false ? pick("(فرنشايز)", "(Franchise)") : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <User className="size-3.5 text-primary" />
                    {pick("المسؤول المباشر", "Direct Supervisor")}
                  </label>
                  <input
                    type="text"
                    list="supervisors-datalist"
                    value={directManager}
                    onChange={(e) => setDirectManager(e.target.value)}
                    placeholder="مثال: Hafez Rahim / الشيف إبراهيم عثمان"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <datalist id="supervisors-datalist">
                    <option value="Hafez Rahim (المدير العام)" />
                    {employees.map((emp) => (
                      <option
                        key={emp.id}
                        value={`${emp.name.ar} (${pick(emp.positionName.ar, emp.positionName.en)})`}
                      />
                    ))}
                  </datalist>
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
                    <option value="active">نشط (Active)</option>
                    <option value="probation">فترة اختبار (Probation)</option>
                    <option value="on_leave">في إجازة (On Leave)</option>
                    <option value="suspended">موقوف مؤقتاً (Suspended)</option>
                    <option value="terminated">منتهي خدمته (Terminated)</option>
                  </select>
                </div>
              </div>

              {/* ERP System Access (ربط بنظام المستخدمين) */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {pick("منح حساب دخول لنظام الـ ERP (System Access)", "Grant ERP System Login Access")}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {pick(
                          "تفعيل حساب مستخدم مرتبط بهذا الموظف مع صلاحيات تشغيل الفروع أو الحسابات أو الإدارة",
                          "Provision a linked user account with branch, accounting, or administrative permissions"
                        )}
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grantErpAccess}
                      onChange={(e) => setGrantErpAccess(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {grantErpAccess && (
                  <div className="space-y-3 pt-3 border-t border-primary/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          {pick("دور وصلاحيات المستخدم في النظام", "Assigned System Role")}
                        </label>
                        <select
                          value={erpRole}
                          onChange={(e) => setErpRole(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium"
                        >
                          <option value="sales">{pick("نقطة بيع ومبيعات الفروع (Cashier / POS)", "POS & Branch Sales")}</option>
                          <option value="inventory_manager">{pick("أمين مخزن ومستودعات (Inventory Manager)", "Inventory Manager")}</option>
                          <option value="accountant">{pick("محاسب ومراجع مالي (Accountant / Finance)", "Accountant / Finance")}</option>
                          <option value="hr_manager">{pick("مدير موارد بشرية (HR Manager)", "HR Manager")}</option>
                          <option value="branch_manager">{pick("مدير فرع / تشغيل (Branch Manager)", "Branch Manager")}</option>
                          <option value="admin">{pick("مدير نظام بصلاحيات كاملة (System Administrator)", "System Administrator")}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          {pick("البريد الإلكتروني لتسجيل الدخول", "Login Email Address")}
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="emp@wazeer-elhelw.com"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                        />
                      </div>

                      <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                            <KeyRound className="size-3.5 text-primary" />
                            {pick("تعيين كلمة مرور الحساب", "Set Account Password")}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const chars = "abcdefghjkmnpqrstuvwxyz23456789";
                              let rnd = "";
                              for (let i = 0; i < 4; i++) rnd += chars.charAt(Math.floor(Math.random() * chars.length));
                              const pass = `Wz@${rnd}#26`;
                              setErpPassword(pass);
                              setShowErpPassword(true);
                            }}
                            className="text-[11px] text-primary hover:text-primary/80 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Sparkles className="size-3" />
                            {pick("توليد كلمة مرور عشوائية", "Generate Password")}
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            type={showErpPassword ? "text" : "password"}
                            value={erpPassword}
                            onChange={(e) => setErpPassword(e.target.value)}
                            placeholder={pick("أدخل كلمة مرور مخصصة أو اتركها فارغة للافتراضية (Wazeer@2026#)", "Enter custom password or leave blank for default (Wazeer@2026#)")}
                            className="w-full px-3 pe-10 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono focus:border-primary focus:outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowErpPassword(!showErpPassword)}
                            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                            title={showErpPassword ? pick("إخفاء كلمة المرور", "Hide password") : pick("إظهار كلمة المرور", "Show password")}
                          >
                            {showErpPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {pick(
                            "يمكن للمستخدم تسجيل الدخول فوراً باستخدام بريده الإلكتروني وكلمة المرور المحددة هنا.",
                            "The user can immediately log in using their email and the password specified here."
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
