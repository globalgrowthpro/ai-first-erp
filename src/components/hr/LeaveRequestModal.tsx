import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, User, FileText, AlertCircle, Save } from "lucide-react";
import type { EmployeeRecord, LeaveRequest, LeaveType } from "@/lib/hr-store";

interface LeaveRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: EmployeeRecord[];
  onSave: (data: Omit<LeaveRequest, "id" | "status" | "appliedDate">) => void;
}

export function LeaveRequestModal({
  open,
  onOpenChange,
  employees,
  onSave,
}: LeaveRequestModalProps) {
  const { pick, dir } = useI18n();

  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [contactWhileAway, setContactWhileAway] = useState("");

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId) || employees[0];

  useEffect(() => {
    if (!open) return;
    const firstEmp = employees[0];
    if (firstEmp && !selectedEmpId) {
      setSelectedEmpId(firstEmp.id);
      setContactWhileAway(firstEmp.phone);
    }
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    setEndDate(today);
    setLeaveType("annual");
    setReason("");
  }, [open, employees]);

  useEffect(() => {
    if (selectedEmployee) {
      setContactWhileAway(selectedEmployee.phone);
    }
  }, [selectedEmpId]);

  // Calculate days
  const daysCount = (() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (end < start) return 1;
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  })();

  const currentBalance = (() => {
    if (!selectedEmployee) return 0;
    if (leaveType === "annual") {
      return selectedEmployee.leaveBalances.annualTotal - selectedEmployee.leaveBalances.annualUsed;
    }
    if (leaveType === "sick") {
      return selectedEmployee.leaveBalances.sickTotal - selectedEmployee.leaveBalances.sickUsed;
    }
    if (leaveType === "emergency") {
      return selectedEmployee.leaveBalances.emergencyTotal - selectedEmployee.leaveBalances.emergencyUsed;
    }
    return 30;
  })();

  const isExceeded = (leaveType === "annual" || leaveType === "sick" || leaveType === "emergency") && daysCount > currentBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    onSave({
      employeeId: selectedEmployee.id,
      employeeCode: selectedEmployee.code,
      employeeName: selectedEmployee.name,
      departmentName: selectedEmployee.departmentName,
      leaveType,
      startDate,
      endDate,
      daysCount,
      reason: reason.trim() || "طلب إجازة اعتيادية",
      contactWhileAway: contactWhileAway.trim() || selectedEmployee.phone,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Calendar className="size-5 text-primary" />
            {pick("تقديم طلب إجازة جديد", "Submit Leave Request")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {pick("الموظف صاحب الطلب *", "Employee *")}
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.code} — {pick(emp.name.ar, emp.name.en)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {pick("نوع الإجازة *", "Leave Type *")}
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="annual">إجازة اعتيادية سنوية (Annual)</option>
                <option value="sick">إجازة مرضية (Sick)</option>
                <option value="emergency">إجازة عارضة (Emergency)</option>
                <option value="unpaid">إجازة بدون راتب (Unpaid)</option>
                <option value="hajj">إجازة حج / عمرة (Pilgrimage)</option>
                <option value="maternity">إجازة وضع ورعاية (Maternity)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {pick("الرصيد المتاح حالياً", "Available Balance")}
              </label>
              <div className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-bold text-ink-foreground flex items-center justify-between">
                <span>{currentBalance} {pick("يوم", "days")}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {pick("متبقي", "remaining")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {pick("من تاريخ *", "Start Date *")}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {pick("إلى تاريخ *", "End Date *")}
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
            <span className="font-semibold text-primary">
              {pick("إجمالي أيام الإجازة المطلوبة:", "Total Requested Days:")}
            </span>
            <span className="font-bold text-sm text-primary num">
              {daysCount} {pick("يوم عمل", "work days")}
            </span>
          </div>

          {isExceeded && (
            <div className="flex items-start gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-600">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>
                {pick(
                  "تنبيه: عدد الأيام المطلوبة يتجاوز الرصيد السنوي المتاح للموظف. سيتطلب اعتماده موافقة خاصة أو خصمه كإجازة بدون راتب.",
                  "Warning: Requested days exceed available balance. Requires supervisor exception or unpaid deduction."
                )}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {pick("سبب الإجازة *", "Reason *")}
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب طلب الإجازة والتنسيق مع بديل العمل..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {pick("رقم هاتف الاتصال أثناء الإجازة", "Contact Phone While Away")}
            </label>
            <input
              type="tel"
              value={contactWhileAway}
              onChange={(e) => setContactWhileAway(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
            <Btn type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {pick("إلغاء", "Cancel")}
            </Btn>
            <Btn type="submit" variant="solid" className="gap-1.5">
              <Save className="size-4" />
              {pick("إرسال الطلب للاعتماد", "Submit Request")}
            </Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
