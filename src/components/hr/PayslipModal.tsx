import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Printer,
  Download,
  Building2,
  Calendar,
  User,
  CreditCard,
  FileCheck,
  Receipt,
  Sparkles,
} from "lucide-react";
import type { PayslipItem } from "@/lib/hr-store";

interface PayslipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslip: PayslipItem | null;
}

export function PayslipModal({ open, onOpenChange, payslip }: PayslipModalProps) {
  const { pick, dir, money } = useI18n();

  if (!payslip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              {pick("قسيمة راتب معتمدة (Payslip)", "Official Payslip Statement")}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 bg-muted rounded">
              {payslip.period}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Printable Payslip Card */}
        <div className="rounded-xl border-2 border-border/80 bg-background p-6 space-y-6 shadow-sm print:m-0 print:border-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-primary/40 pb-4">
            <div>
              <h2 className="text-xl font-black text-ink-foreground tracking-tight">
                {pick("مجموعة وزير الحلو للحلويات والصناعات الغذائية", "Wazeer El Helw Confectionery & Food Industries")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pick("إدارة الموارد البشرية وشؤون العاملين — كشف استحقاق راتب", "Human Resources & Payroll Department — Payslip")}
              </p>
              <p className="text-[11px] font-mono text-muted-foreground mt-1">
                {pick("فترة الاستحقاق:", "Pay Period:")} <span className="font-bold text-ink-foreground">{payslip.period}</span>
              </p>
            </div>
            <div className="text-end">
              <span className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-bold text-xs rounded-full">
                {pick("كشف راتب شهري رسمي", "Official Monthly Slip")}
              </span>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">
                Ref: {payslip.id}
              </p>
            </div>
          </div>

          {/* Employee Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-3.5 rounded-lg text-xs border border-border/60">
            <div>
              <span className="text-muted-foreground block text-[10px]">{pick("كود الموظف:", "Emp Code:")}</span>
              <span className="font-mono font-bold text-ink-foreground">{payslip.employeeCode}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">{pick("اسم الموظف:", "Employee Name:")}</span>
              <span className="font-bold text-ink-foreground">{pick(payslip.employeeName.ar, payslip.employeeName.en)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">{pick("الإدارة:", "Department:")}</span>
              <span className="font-semibold text-ink-foreground">{pick(payslip.departmentName.ar, payslip.departmentName.en)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">{pick("المسمى الوظيفي:", "Job Title:")}</span>
              <span className="font-semibold text-ink-foreground">{pick(payslip.positionName.ar, payslip.positionName.en)}</span>
            </div>
          </div>

          {/* Two Columns: Earnings vs Deductions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Earnings Column */}
            <div className="border border-border/70 rounded-lg overflow-hidden">
              <div className="bg-emerald-500/10 px-3 py-2 border-b border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                <span>{pick("الاستحقاقات والبدلات (Earnings)", "Earnings & Allowances")}</span>
                <span>{pick("المبلغ (ج.م)", "Amount")}</span>
              </div>
              <div className="divide-y divide-border/40 text-xs">
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-muted-foreground">{pick("الراتب الأساسي", "Basic Salary")}</span>
                  <span className="font-mono font-semibold">{money(payslip.basicSalary)}</span>
                </div>
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-muted-foreground">{pick("بدل سكن", "Housing Allowance")}</span>
                  <span className="font-mono">{money(payslip.housingAllowance)}</span>
                </div>
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-muted-foreground">{pick("بدل انتقال", "Transport Allowance")}</span>
                  <span className="font-mono">{money(payslip.transportAllowance)}</span>
                </div>
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-muted-foreground">{pick("بدل وجبة / مطبخ", "Food Allowance")}</span>
                  <span className="font-mono">{money(payslip.foodAllowance)}</span>
                </div>
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-muted-foreground">{pick("مكافأة أداء KPI", "KPI Performance Bonus")}</span>
                  <span className="font-mono text-emerald-600 font-semibold">+{money(payslip.kpiBonus)}</span>
                </div>
                {payslip.overtimePay > 0 && (
                  <div className="flex justify-between px-3 py-1.5 bg-emerald-500/5">
                    <span className="text-muted-foreground">
                      {pick(`عمل إضافي (${payslip.overtimeHours} ساعة)`, `Overtime (${payslip.overtimeHours} hrs)`)}
                    </span>
                    <span className="font-mono text-emerald-600 font-semibold">+{money(payslip.overtimePay)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2 bg-muted/40 font-bold border-t border-border">
                  <span>{pick("إجمالي الاستحقاقات (Gross)", "Total Earnings")}</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">{money(payslip.grossSalary)}</span>
                </div>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="border border-border/70 rounded-lg overflow-hidden">
              <div className="bg-rose-500/10 px-3 py-2 border-b border-rose-500/20 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-between">
                <span>{pick("الاستقطاعات والخصومات (Deductions)", "Deductions & Taxes")}</span>
                <span>{pick("المبلغ (ج.م)", "Amount")}</span>
              </div>
              <div className="divide-y divide-border/40 text-xs">
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-muted-foreground">{pick("حصة التأمينات الاجتماعية (11%)", "Social Insurance (11%)")}</span>
                  <span className="font-mono text-rose-600">-{money(payslip.socialInsuranceDeduction)}</span>
                </div>
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-muted-foreground">{pick("ضريبة كسب العمل (Tax)", "Income Tax")}</span>
                  <span className="font-mono text-rose-600">-{money(payslip.taxDeduction)}</span>
                </div>
                {payslip.absencePenalties > 0 && (
                  <div className="flex justify-between px-3 py-1.5">
                    <span className="text-muted-foreground">{pick("خصومات تأخير وغياب", "Absence/Late Penalties")}</span>
                    <span className="font-mono text-rose-600">-{money(payslip.absencePenalties)}</span>
                  </div>
                )}
                {payslip.advanceDeduction > 0 && (
                  <div className="flex justify-between px-3 py-1.5">
                    <span className="text-muted-foreground">{pick("سداد سلفة راتب سابقة", "Advance Loan Repayment")}</span>
                    <span className="font-mono text-rose-600">-{money(payslip.advanceDeduction)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2 bg-muted/40 font-bold border-t border-border">
                  <span>{pick("إجمالي الاستقطاعات", "Total Deductions")}</span>
                  <span className="font-mono text-rose-700 dark:text-rose-400">-{money(payslip.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* NET PAY BOX */}
          <div className="p-4 rounded-xl bg-primary/10 border-2 border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {pick("صافي الراتب المستحق للتحويل البنكي", "Net Payable Salary")}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pick("طريقة الصرف:", "Disbursement:")}{" "}
                <span className="font-semibold text-ink-foreground">
                  {payslip.paymentMethod === "instapay" ? "محفظة / InstaPay" : "تحويل مصرفي (Bank Transfer)"}
                </span>
              </p>
            </div>
            <div className="text-end">
              <span className="text-2xl sm:text-3xl font-black text-primary font-mono tracking-tight">
                {money(payslip.netSalary)}
              </span>
            </div>
          </div>

          {/* Signatures & Approvals */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/70 text-center text-[11px] text-muted-foreground">
            <div className="space-y-6">
              <p className="font-semibold">{pick("إعداد شؤون العاملين", "Prepared by HR")}</p>
              <p className="font-mono text-[10px]">سارة عبد العزيز</p>
            </div>
            <div className="space-y-6">
              <p className="font-semibold">{pick("اعتماد المدير المالي", "Approved by CFO")}</p>
              <p className="font-mono text-[10px]">أ. منى خليل (معتمد)</p>
            </div>
            <div className="space-y-6">
              <p className="font-semibold">{pick("توقيع واستلام الموظف", "Employee Signature")}</p>
              <p className="font-mono text-[10px]">..................................</p>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
          <Btn variant="outline" onClick={() => onOpenChange(false)}>
            {pick("إغلاق", "Close")}
          </Btn>
          <Btn variant="solid" onClick={() => window.print()} className="gap-1.5">
            <Printer className="size-4" />
            {pick("طباعة القسيمة (Print)", "Print Payslip")}
          </Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}
