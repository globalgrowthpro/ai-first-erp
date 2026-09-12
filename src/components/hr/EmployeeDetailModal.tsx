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
  Phone,
  Mail,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  HeartHandshake,
  DollarSign,
  Printer,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  AlertTriangle,
} from "lucide-react";
import type { EmployeeRecord } from "@/lib/hr-store";

interface EmployeeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeRecord | null;
  onEdit: (employee: EmployeeRecord) => void;
}

export function EmployeeDetailModal({
  open,
  onOpenChange,
  employee,
  onEdit,
}: EmployeeDetailModalProps) {
  const { pick, dir, money } = useI18n();

  if (!employee) return null;

  const totalGross =
    employee.compensation.basicSalary +
    employee.compensation.housingAllowance +
    employee.compensation.transportAllowance +
    employee.compensation.foodAllowance +
    employee.compensation.kpiBonus;

  const socialInsurance = Math.round(
    employee.compensation.basicSalary * (employee.compensation.socialInsuranceRate || 0.11)
  );
  const tax = Math.round(totalGross * (employee.compensation.taxRate || 0.05));
  const estimatedNet = totalGross - (socialInsurance + tax);

  const cleanPhone = employee.phone.replace(/[^\d+]/g, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              {pick("الملف الوظيفي للموظف", "Employee Personnel File")}
            </span>
            <span className="font-mono text-xs px-2.5 py-1 bg-muted rounded-md text-muted-foreground">
              {employee.code}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Profile Header Banner */}
        <div className="rounded-xl border border-border/80 bg-linear-to-r from-card to-muted/40 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`size-16 rounded-2xl bg-linear-to-br ${employee.avatarBg} text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0`}
            >
              {employee.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-ink-foreground">
                  {pick(employee.name.ar, employee.name.en)}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    employee.gender === "female"
                      ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                      : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                  }`}
                >
                  {employee.gender === "female" ? pick("أنثى (Female)", "Female") : pick("ذكر (Male)", "Male")}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    employee.status === "active"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : employee.status === "on_leave"
                      ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  }`}
                >
                  {employee.status === "active"
                    ? pick("على رأس العمل", "Active")
                    : employee.status === "on_leave"
                    ? pick("في إجازة", "On Leave")
                    : pick("تحت الاختبار", "Probation")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                {pick(employee.positionName.ar, employee.positionName.en)}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="size-3.5 text-primary" />
                  {pick(employee.departmentName.ar, employee.departmentName.en)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {pick(employee.branchName.ar, employee.branchName.en)}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {pick("تاريخ التعيين:", "Hired:")} {employee.hireDate}
                </span>
                <span className="flex items-center gap-1 font-semibold text-primary">
                  <FileText className="size-3.5" />
                  {employee.contractType || pick("عقد دائم", "Permanent Contract")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Btn
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(employee);
              }}
              className="text-xs"
            >
              {pick("تعديل البيانات", "Edit Info")}
            </Btn>
            <Btn
              variant="solid"
              size="sm"
              onClick={() => window.print()}
              className="text-xs gap-1.5"
            >
              <Printer className="size-3.5" />
              {pick("طباعة البيان", "Print File")}
            </Btn>
          </div>
        </div>

        {/* 4 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Contact & Emergency */}
          <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
            <div className="flex items-center gap-2 text-xs font-bold text-ink-foreground uppercase tracking-wider">
              <Phone className="size-4 text-primary" />
              {pick("الاتصال والتواصل والطوارئ", "Contact & Emergency")}
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{pick("رقم الهاتف:", "Phone:")}</span>
                <a
                  href={`tel:${cleanPhone}`}
                  className="font-mono font-semibold text-primary hover:underline"
                >
                  {employee.phone}
                </a>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{pick("البريد الإلكتروني:", "Email:")}</span>
                <a
                  href={`mailto:${employee.email}`}
                  className="font-mono text-primary hover:underline"
                >
                  {employee.email}
                </a>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{pick("الرقم القومي / الإقامة:", "National ID:")}</span>
                <span className="font-mono font-semibold">{employee.nationalId}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{pick("المدير المباشر:", "Supervisor:")}</span>
                <span className="font-semibold">{employee.directManager}</span>
              </div>
              <div className="pt-2">
                <p className="text-[11px] font-bold text-muted-foreground mb-1">
                  {pick("جهة اتصال الطوارئ:", "Emergency Contact:")}
                </p>
                <div className="bg-muted/40 p-2.5 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-bold">{employee.emergencyContact.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {pick(employee.emergencyContact.relation.ar, employee.emergencyContact.relation.en)}
                    </p>
                  </div>
                  <a
                    href={`tel:${employee.emergencyContact.phone}`}
                    className="font-mono text-xs font-bold text-primary bg-background px-2 py-1 rounded border border-border"
                  >
                    {employee.emergencyContact.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Food Safety Health Cert Compliance */}
          <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-ink-foreground uppercase tracking-wider">
                <ShieldCheck className="size-4 text-emerald-600" />
                {pick("الشهادة الصحية وسلامة الغذاء", "Food Safety Health Cert")}
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  employee.healthCert.status === "valid"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : employee.healthCert.status === "expiring_soon"
                    ? "bg-amber-500/10 text-amber-600"
                    : employee.healthCert.status === "expired"
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {employee.healthCert.status === "valid"
                  ? pick("سارية ومعتمدة", "Valid")
                  : employee.healthCert.status === "expiring_soon"
                  ? pick("توشك على الانتهاء", "Expiring Soon")
                  : employee.healthCert.status === "expired"
                  ? pick("منتهية الصلاحية", "Expired")
                  : pick("غير مطلوب", "Not Required")}
              </span>
            </div>

            <div className="bg-muted/20 p-3 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{pick("رقم الشهادة:", "Cert Number:")}</span>
                <span className="font-mono font-bold">{employee.healthCert.number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{pick("تاريخ الانتهاء:", "Expiry Date:")}</span>
                <span className="font-mono font-bold text-ink-foreground">
                  {employee.healthCert.expiryDate || "—"}
                </span>
              </div>
            </div>

            {employee.healthCert.status === "expired" && (
              <div className="flex items-start gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-600">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>
                  {pick(
                    "تنبيه عاجل: يجب تجديد الشهادة فوراً طبقاً لتعليمات هيئة سلامة الغذاء لمنع إيقاف الموظف عن العمل في المطبخ.",
                    "Critical alert: Certificate expired! Employee must renew immediately to comply with food safety inspection regulations."
                  )}
                </span>
              </div>
            )}
            {employee.healthCert.status === "expiring_soon" && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600">
                <Clock className="size-4 shrink-0 mt-0.5" />
                <span>
                  {pick(
                    "تنتهي الشهادة قريباً. يرجى توجيه الموظف لمكتب الصحة لإجراء التحاليل الدورية.",
                    "Certificate is expiring soon. Please schedule a clinic visit for routine renewal screening."
                  )}
                </span>
              </div>
            )}

            {/* Leave Balances */}
            <div className="pt-2">
              <p className="text-xs font-bold text-ink-foreground mb-2">
                {pick("أرصدة الإجازات السنوية", "Leave Balances")}
              </p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">{pick("إجازة اعتيادية سنوية:", "Annual Leave:")}</span>
                    <span className="font-bold">
                      {employee.leaveBalances.annualTotal - employee.leaveBalances.annualUsed} /{" "}
                      {employee.leaveBalances.annualTotal} {pick("يوم متبقي", "days left")}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(employee.leaveBalances.annualUsed / employee.leaveBalances.annualTotal) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">{pick("إجازة مرضية:", "Sick Leave:")}</span>
                    <span className="font-bold">
                      {employee.leaveBalances.sickTotal - employee.leaveBalances.sickUsed} /{" "}
                      {employee.leaveBalances.sickTotal} {pick("يوم متبقي", "days left")}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: `${(employee.leaveBalances.sickUsed / employee.leaveBalances.sickTotal) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Compensation & Earnings Structure */}
          <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-ink-foreground uppercase tracking-wider">
                <DollarSign className="size-4 text-primary" />
                {pick("هيكل الراتب والبدلات والاستحقاقات الشهرية", "Compensation & Salary Breakdown")}
              </div>
              <span className="text-xs text-muted-foreground">
                {pick("العملة: جنيه مصري (EGP)", "Currency: EGP")}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-muted/40 text-center">
                <span className="block text-[10px] text-muted-foreground">{pick("الأساسي", "Basic")}</span>
                <span className="text-sm font-bold text-ink-foreground num">
                  {money(employee.compensation.basicSalary)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 text-center">
                <span className="block text-[10px] text-muted-foreground">{pick("بدل سكن", "Housing")}</span>
                <span className="text-sm font-bold text-ink-foreground num">
                  {money(employee.compensation.housingAllowance)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 text-center">
                <span className="block text-[10px] text-muted-foreground">{pick("بدل انتقال", "Transport")}</span>
                <span className="text-sm font-bold text-ink-foreground num">
                  {money(employee.compensation.transportAllowance)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 text-center">
                <span className="block text-[10px] text-muted-foreground">{pick("بدل وجبة/مطبخ", "Food")}</span>
                <span className="text-sm font-bold text-ink-foreground num">
                  {money(employee.compensation.foodAllowance)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 text-center">
                <span className="block text-[10px] text-muted-foreground">{pick("حافز أداء KPI", "KPI Bonus")}</span>
                <span className="text-sm font-bold text-emerald-600 num">
                  +{money(employee.compensation.kpiBonus)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <span className="block text-[10px] text-primary font-semibold">{pick("إجمالي الشامل", "Total Gross")}</span>
                <span className="text-sm font-black text-primary num">
                  {money(totalGross)}
                </span>
              </div>
            </div>

            {/* Banking Details Footer */}
            <div className="mt-3 p-3 rounded-lg border border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">{pick("بيانات الصرف:", "Disbursement:")}</span>
                <span className="font-semibold">{employee.bank.bankName}</span>
                <span className="font-mono text-muted-foreground">({employee.bank.accountNumber || "—"})</span>
              </div>
              {employee.bank.walletNumber && (
                <div className="flex items-center gap-1.5 font-mono text-[11px] bg-background px-2.5 py-1 rounded border border-border">
                  <span className="text-primary font-bold">{pick("إنستاباي / محفظة:", "InstaPay/Wallet:")}</span>
                  <span>{employee.bank.walletNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-border/70">
          <Btn variant="solid" onClick={() => onOpenChange(false)}>
            {pick("إغلاق", "Close")}
          </Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}
