import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator,
  CheckCircle2,
  FileCheck,
  Scale,
  Users,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Printer,
} from "lucide-react";
import type { PayrollRun, PayslipItem } from "@/lib/hr-store";

interface PayrollProcessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: PayrollRun | null;
  onApprove: (id: string) => void;
  onPostToGl: (id: string) => string;
  onViewPayslip: (payslip: PayslipItem) => void;
}

export function PayrollProcessModal({
  open,
  onOpenChange,
  run,
  onApprove,
  onPostToGl,
  onViewPayslip,
}: PayrollProcessModalProps) {
  const { pick, dir, money } = useI18n();
  const [postedGlId, setPostedGlId] = useState<string | null>(null);

  if (!run) return null;

  const handlePostGl = () => {
    const jeId = onPostToGl(run.id);
    setPostedGlId(jeId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Calculator className="size-5 text-primary" />
              {pick(run.title.ar, run.title.en)}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                run.status === "posted_to_gl" || postedGlId
                  ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                  : run.status === "approved"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
              }`}
            >
              {run.status === "posted_to_gl" || postedGlId
                ? pick("مرحل لدفتر الأستاذ (GL Posted)", "Posted to GL")
                : run.status === "approved"
                ? pick("معتمد من الإدارة (Approved)", "Approved")
                : pick("مسودة قيد المراجعة (Draft)", "Draft")}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* GL Posting Success Banner */}
        {(run.status === "posted_to_gl" || postedGlId) && (
          <div className="p-3.5 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Scale className="size-5 shrink-0" />
              <div>
                <p className="font-bold">
                  {pick(
                    "تم ترحيل مسير الرواتب تلقائياً إلى دفتر اليومية العامة والأستاذ العام!",
                    "Payroll batch successfully posted to General Ledger & Journal Entries!"
                  )}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {pick(
                    `رقم قيد اليومية: ${run.postedJournalId || postedGlId} — مدين: ح/ 5101 رواتب ومستحقات العاملين | دائن: ح/ 1101 البنك والسيولة النقدية`,
                    `Journal Entry ID: ${run.postedJournalId || postedGlId} — Debit: 5101 Salaries | Credit: 1101 Cash & Bank`
                  )}
                </p>
              </div>
            </div>
            <span className="font-mono font-bold bg-background px-2.5 py-1 rounded border border-purple-300 text-purple-700">
              {run.postedJournalId || postedGlId}
            </span>
          </div>
        )}

        {/* 3 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/70 bg-card p-3.5">
            <span className="text-[11px] text-muted-foreground block font-medium">
              {pick("إجمالي الاستحقاقات (Gross Salaries)", "Total Gross Salaries")}
            </span>
            <span className="text-xl font-black text-ink-foreground num mt-1 block">
              {money(run.totalGross)}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {run.totalEmployees} {pick("موظفين مشمولين", "employees covered")}
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-3.5">
            <span className="text-[11px] text-muted-foreground block font-medium">
              {pick("إجمالي الاستقطاعات (تأمينات وضرائب)", "Total Deductions (Taxes & Social Ins.)")}
            </span>
            <span className="text-xl font-black text-rose-600 num mt-1 block">
              -{money(run.totalDeductions)}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {pick("تأمينات اجتماعية 11% + ضرائب دخل", "11% social ins. + income tax")}
            </span>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5">
            <span className="text-[11px] text-primary block font-semibold">
              {pick("صافي المبلغ المصروف (Net Payable)", "Total Net Payable")}
            </span>
            <span className="text-xl font-black text-primary num mt-1 block">
              {money(run.totalNet)}
            </span>
            <span className="text-[10px] text-primary/80 mt-0.5 block">
              {pick("جاهز للصرف عبر التحويلات والإنستاباي", "Ready for bank/InstaPay batch")}
            </span>
          </div>
        </div>

        {/* Employee Payslips Table */}
        <div className="border border-border/70 rounded-xl overflow-hidden bg-card">
          <div className="p-3 bg-muted/30 border-b border-border/60 flex items-center justify-between">
            <span className="text-xs font-bold text-ink-foreground">
              {pick("كشف أجور الموظفين التفصيلي", "Itemized Employee Payroll Sheet")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {run.payslips.length} {pick("سجل", "records")}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/50 text-[11px]">
                <tr>
                  <th className="px-3 py-2 text-start">{pick("الكود", "Code")}</th>
                  <th className="px-3 py-2 text-start">{pick("الموظف", "Employee")}</th>
                  <th className="px-3 py-2 text-start">{pick("الإدارة", "Department")}</th>
                  <th className="px-3 py-2 text-end">{pick("الأساسي", "Basic")}</th>
                  <th className="px-3 py-2 text-end">{pick("إضافي وبدلات", "Allowances & OT")}</th>
                  <th className="px-3 py-2 text-end">{pick("الاستقطاعات", "Deductions")}</th>
                  <th className="px-3 py-2 text-end font-bold">{pick("الصافي", "Net Pay")}</th>
                  <th className="px-3 py-2 text-center">{pick("القسيمة", "Slip")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {run.payslips.map((ps) => {
                  const allowancesTotal =
                    ps.housingAllowance +
                    ps.transportAllowance +
                    ps.foodAllowance +
                    ps.kpiBonus +
                    ps.overtimePay;

                  return (
                    <tr key={ps.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-muted-foreground font-semibold">
                        {ps.employeeCode}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-ink-foreground">
                        {pick(ps.employeeName.ar, ps.employeeName.en)}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {pick(ps.departmentName.ar, ps.departmentName.en)}
                      </td>
                      <td className="px-3 py-2.5 text-end font-mono">
                        {money(ps.basicSalary)}
                      </td>
                      <td className="px-3 py-2.5 text-end font-mono text-emerald-600">
                        +{money(allowancesTotal)}
                      </td>
                      <td className="px-3 py-2.5 text-end font-mono text-rose-600">
                        -{money(ps.totalDeductions)}
                      </td>
                      <td className="px-3 py-2.5 text-end font-mono font-bold text-primary">
                        {money(ps.netSalary)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onViewPayslip(ps)}
                          className="px-2 py-1 bg-muted hover:bg-primary hover:text-primary-foreground rounded text-[10px] font-semibold transition-colors"
                        >
                          {pick("عرض القسيمة", "View Slip")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70">
          <div className="text-xs text-muted-foreground">
            {pick("تاريخ إنشاء المسير:", "Run Date:")} <span className="font-mono font-bold">{run.runDate}</span>
          </div>

          <div className="flex items-center gap-2">
            <Btn variant="outline" onClick={() => onOpenChange(false)}>
              {pick("إغلاق", "Close")}
            </Btn>

            {run.status === "draft" && (
              <Btn
                variant="solid"
                onClick={() => onApprove(run.id)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="size-4" />
                {pick("اعتماد مسير الرواتب", "Approve Payroll")}
              </Btn>
            )}

            {run.status !== "posted_to_gl" && !postedGlId && (
              <Btn
                variant="solid"
                onClick={handlePostGl}
                className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Scale className="size-4" />
                {pick("ترحيل للدفاتر المحاسبية (Post to GL)", "Post to GL")}
              </Btn>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
