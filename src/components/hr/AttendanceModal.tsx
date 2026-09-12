import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, User, Calendar, Save, CheckCircle2 } from "lucide-react";
import type { EmployeeRecord, AttendanceRecord, AttendanceStatus } from "@/lib/hr-store";

interface AttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: EmployeeRecord[];
  onSave: (record: Omit<AttendanceRecord, "id">) => void;
}

export function AttendanceModal({
  open,
  onOpenChange,
  employees,
  onSave,
}: AttendanceModalProps) {
  const { pick, dir } = useI18n();

  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [date, setDate] = useState("");
  const [shiftNameAr, setShiftNameAr] = useState("وردية الصباح الأولى (06:00 - 14:30)");
  const [shiftNameEn, setShiftNameEn] = useState("Morning Shift (06:00 - 14:30)");
  const [checkIn, setCheckIn] = useState("08:00");
  const [checkOut, setCheckOut] = useState("16:30");
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [lateMinutes, setLateMinutes] = useState<number>(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setDate(new Date().toISOString().slice(0, 10));
    const firstEmp = employees[0];
    if (firstEmp && !selectedEmpId) {
      setSelectedEmpId(firstEmp.id);
    }
    setCheckIn("08:00");
    setCheckOut("16:30");
    setStatus("present");
    setOvertimeHours(0);
    setLateMinutes(0);
    setNotes("");
  }, [open, employees]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === selectedEmpId) || employees[0];
    if (!emp) return;

    onSave({
      date,
      employeeId: emp.id,
      employeeCode: emp.code,
      employeeName: emp.name,
      departmentName: emp.departmentName,
      shiftName: { ar: shiftNameAr, en: shiftNameEn },
      checkIn,
      checkOut,
      status,
      overtimeHours: Number(overtimeHours) || 0,
      lateMinutes: Number(lateMinutes) || 0,
      notes: notes.trim(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Clock className="size-5 text-primary" />
            {pick("تسجيل حركة دوام وحضور لموظف", "Log Attendance / Punch In-Out")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {pick("الموظف *", "Employee *")}
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.code} — {pick(emp.name.ar, emp.name.en)} ({pick(emp.departmentName.ar, emp.departmentName.en)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {pick("التاريخ *", "Date *")}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {pick("الوردية / الجدول", "Shift Schedule")}
              </label>
              <select
                value={shiftNameAr}
                onChange={(e) => {
                  setShiftNameAr(e.target.value);
                  if (e.target.value.includes("الصباح")) setShiftNameEn("Morning Shift");
                  else if (e.target.value.includes("مسائية")) setShiftNameEn("Evening Shift");
                  else setShiftNameEn("HQ Shift");
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="وردية الصباح الأولى (06:00 - 14:30)">وردية الصباح الأولى (06:00 - 14:30)</option>
                <option value="وردية مسائية بالفروع (14:00 - 22:30)">وردية مسائية بالفروع (14:00 - 22:30)</option>
                <option value="دوام المقر الرئيسي (09:00 - 17:00)">دوام المقر الرئيسي (09:00 - 17:00)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {pick("وقت الحضور (Check-In)", "Check-In Time")}
              </label>
              <input
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {pick("وقت الانصراف (Check-Out)", "Check-Out Time")}
              </label>
              <input
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {pick("حالة الحضور", "Status")}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="present">حاضر (Present)</option>
                <option value="late">متأخر (Late)</option>
                <option value="absent">غائب (Absent)</option>
                <option value="half_day">نصف يوم (Half Day)</option>
                <option value="on_leave">في إجازة (On Leave)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {pick("ساعات إضافية (Overtime)", "Overtime (hrs)")}
              </label>
              <input
                type="number"
                min="0"
                max="12"
                step="0.5"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm num font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {pick("دقائق التأخير", "Late (minutes)")}
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={lateMinutes}
                onChange={(e) => setLateMinutes(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm num"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {pick("ملاحظات المشرف / الوردية", "Supervisor Notes")}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تجهيز كميات إضافية لكشري حلو أو تأخر بسبب مواصلات"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
            <Btn type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {pick("إلغاء", "Cancel")}
            </Btn>
            <Btn type="submit" variant="solid" className="gap-1.5">
              <Save className="size-4" />
              {pick("تسجيل البصمة / الدوام", "Save Record")}
            </Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
