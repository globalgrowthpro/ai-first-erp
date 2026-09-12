import { useState, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Users,
  FileText,
  X,
} from "lucide-react";
import {
  parseEmployeesExcelFile,
  downloadEmployeeTemplateExcel,
} from "@/lib/excel-utils";
import type { EmployeeRecord } from "@/lib/hr-store";

interface EmployeeImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (employees: Omit<EmployeeRecord, "id">[]) => void;
}

export function EmployeeImportModal({
  open,
  onOpenChange,
  onImport,
}: EmployeeImportModalProps) {
  const { pick, dir } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsedEmployees, setParsedEmployees] = useState<Omit<EmployeeRecord, "id">[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const resetState = () => {
    setFileName("");
    setParsedEmployees([]);
    setParseErrors([]);
    setIsSuccess(false);
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);
    setParseErrors([]);

    try {
      const { valid, errors } = await parseEmployeesExcelFile(file);
      setParsedEmployees(valid);
      setParseErrors(errors);
    } catch (err: any) {
      setParseErrors([err?.message || "فشل قراءة ملف الإكسيل. تأكد من سلامة التنسيق."]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedEmployees.length === 0) return;
    onImport(parsedEmployees);
    setIsSuccess(true);
    setTimeout(() => {
      onOpenChange(false);
      resetState();
    }, 1200);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetState();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-emerald-600" />
              {pick("استيراد موظفين من ملف إكسيل (Excel / CSV)", "Import Employees from Excel / CSV")}
            </span>
            <Btn
              variant="outline"
              size="sm"
              onClick={downloadEmployeeTemplateExcel}
              className="text-xs gap-1.5"
            >
              <Download className="size-3.5 text-primary" />
              {pick("تحميل نموذج إكسيل فارغ", "Download Template")}
            </Btn>
          </DialogTitle>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-12 text-center space-y-3">
            <CheckCircle2 className="size-12 text-emerald-600 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-ink-foreground">
              {pick(
                `تم بنجاح استيراد وإضافة ${parsedEmployees.length} موظفاً إلى المنظومة!`,
                `Successfully imported ${parsedEmployees.length} employees!`
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {pick("تم تحديث السجلات ومزامنتها تلقائياً.", "Records updated and synchronized.")}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="size-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-bold text-ink-foreground">
                {fileName || pick("انقر هنا أو اسحب ملف Excel (.xlsx, .xls, .csv)", "Click or drag an Excel file here")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {pick("يتعرف النظام تلقائياً على الأعمدة العربية والإنجليزية", "Supports Arabic and English column headers")}
              </p>
            </div>

            {/* Error alerts */}
            {parseErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{pick("تنبيهات أثناء قراءة الملف:", "File Warnings / Errors:")}</span>
                </div>
                <ul className="list-disc ps-5 space-y-0.5">
                  {parseErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Parsed Rows Preview */}
            {parsedEmployees.length > 0 && (
              <div className="border border-border/70 rounded-xl overflow-hidden bg-card space-y-2">
                <div className="p-3 bg-muted/30 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-emerald-600" />
                    <span className="text-xs font-bold text-ink-foreground">
                      {pick(
                        `معاينة الموظفين الجاهزين للاستيراد (${parsedEmployees.length})`,
                        `Preview Employees to Import (${parsedEmployees.length})`
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    {pick("بيانات مطابقة وجاهزة", "Valid & Ready")}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-muted/40 text-muted-foreground text-[10px] sticky top-0 border-b border-border/50">
                      <tr>
                        <th className="px-3 py-1.5 text-start">{pick("الكود", "Code")}</th>
                        <th className="px-3 py-1.5 text-start">{pick("الاسم", "Name")}</th>
                        <th className="px-3 py-1.5 text-start">{pick("النوع", "Gender")}</th>
                        <th className="px-3 py-1.5 text-start">{pick("الإدارة", "Dept")}</th>
                        <th className="px-3 py-1.5 text-start">{pick("الوظيفة", "Position")}</th>
                        <th className="px-3 py-1.5 text-start">{pick("نوع العقد", "Contract")}</th>
                        <th className="px-3 py-1.5 text-end">{pick("الأساسي", "Basic")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {parsedEmployees.map((emp, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono text-muted-foreground font-semibold">
                            {emp.code}
                          </td>
                          <td className="px-3 py-2 font-bold text-ink-foreground">
                            {emp.name.ar}
                          </td>
                          <td className="px-3 py-2">
                            {emp.gender === "female" ? "👩 أنثى" : "👨 ذكر"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {emp.departmentName.ar}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {emp.positionName.ar}
                          </td>
                          <td className="px-3 py-2 max-w-[120px] truncate text-muted-foreground">
                            {emp.contractType}
                          </td>
                          <td className="px-3 py-2 text-end font-mono font-bold text-primary">
                            {emp.compensation.basicSalary.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
              <Btn variant="outline" onClick={() => onOpenChange(false)}>
                {pick("إلغاء", "Cancel")}
              </Btn>
              <Btn
                variant="solid"
                disabled={parsedEmployees.length === 0 || isLoading}
                onClick={handleConfirmImport}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="size-4" />
                {pick(
                  `تأكيد استيراد ${parsedEmployees.length} موظفاً`,
                  `Confirm Import (${parsedEmployees.length} Staff)`
                )}
              </Btn>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
