import { useState, useRef, useMemo } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Truck,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import { type DispatchOrder } from "@/lib/dispatch-store";
import {
  generateDispatchBlankTemplate,
  safeDownloadWorkbook,
} from "@/lib/excel-utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DispatchImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingOrders: DispatchOrder[];
  branches?: any[];
  onImportSuccess: (orders: DispatchOrder[], mode: "upsert" | "skip") => Promise<void>;
}

interface ParsedDispatchRow {
  id: string;
  date: string;
  branch: { ar: string; en: string };
  linkedDoc: { type: "sales" | "purchase" | "none"; id: string };
  status: "draft" | "shipped" | "delivered" | "partial" | "cancelled";
  totalItems: number;
  items: { sku: string; name: { ar: string; en: string }; qty: number }[];
  driver?: string;
  vehicle?: string;
  isExisting: boolean;
  warnings: string[];
}

export function DispatchImportModal({
  open,
  onOpenChange,
  existingOrders,
  branches = [],
  onImportSuccess,
}: DispatchImportModalProps) {
  const { pick, n } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedDispatchRow[]>([]);
  const [importMode, setImportMode] = useState<"upsert" | "skip">("upsert");
  const [isImporting, setIsImporting] = useState(false);

  const normalizeStatus = (val: any): "draft" | "shipped" | "delivered" | "partial" | "cancelled" => {
    if (!val) return "draft";
    const str = String(val).toLowerCase().trim();
    if (str.includes("ship") || str.includes("شحن")) return "shipped";
    if (str.includes("deliver") || str.includes("توصيل") || str.includes("استلام")) return "delivered";
    if (str.includes("part") || str.includes("جزئ")) return "partial";
    if (str.includes("cancel") || str.includes("ملغي")) return "cancelled";
    return "draft";
  };

  const normalizeLinkedDocType = (val: any): "sales" | "purchase" | "none" => {
    if (!val) return "none";
    const str = String(val).toLowerCase().trim();
    if (str.includes("sale") || str.includes("بيع") || str.includes("فاتورة")) return "sales";
    if (str.includes("purch") || str.includes("شراء") || str.includes("توريد")) return "purchase";
    return "none";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          toast.error(pick("الملف لا يحتوي على أوراق عمل صالحة", "File contains no worksheets"));
          setIsProcessing(false);
          return;
        }

        const rawJson: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
        if (rawJson.length === 0) {
          toast.error(pick("الملف فارغ أو لا يحتوي على صفوف بيانات", "File is empty"));
          setIsProcessing(false);
          return;
        }

        const existingIdsSet = new Set(existingOrders.map((o) => o.id.trim().toUpperCase()));
        const parsed: ParsedDispatchRow[] = [];

        for (const row of rawJson) {
          const idVal =
            row["رقم أمر التحميل (Dispatch #)"] ??
            row["رقم أمر التحميل"] ??
            row["Dispatch #"] ??
            row["tracking_number"] ??
            row["id"];
          const id = String(idVal || "").trim();
          if (!id) continue;

          const dateVal =
            row["التاريخ (Date)"] ??
            row["التاريخ"] ??
            row["Date"] ??
            row["created_at"];
          const date = String(dateVal || new Date().toISOString().slice(0, 10)).slice(0, 10);

          const branchArVal =
            row["الفرع / الوجهة (Destination Branch)"] ??
            row["الفرع / الوجهة"] ??
            row["الفرع"] ??
            row["Branch"];
          const branchAr = String(branchArVal || "فرع عام").trim();

          const branchEnVal =
            row["الفرع بالإنجليزية (Branch EN)"] ??
            row["Branch EN"] ??
            branchAr;
          const branchEn = String(branchEnVal || "General Branch").trim();

          const docTypeVal =
            row["مستند الربط (Linked Doc Type)"] ??
            row["نوع مستند الربط"] ??
            row["Linked Doc Type"];
          const linkedType = normalizeLinkedDocType(docTypeVal);

          const docIdVal =
            row["رقم مستند الربط (Linked Doc ID)"] ??
            row["رقم مستند الربط"] ??
            row["Linked Doc ID"];
          const docId = String(docIdVal || "").trim();

          const totalItemsVal =
            row["إجمالي العناصر المحملة (Total Items)"] ??
            row["إجمالي العناصر"] ??
            row["Total Items"] ??
            row["total_items"];
          const totalItems = Number(totalItemsVal) || 0;

          const driverVal =
            row["اسم السائق (Driver)"] ??
            row["اسم السائق"] ??
            row["Driver"] ??
            row["driver"];
          const driver = driverVal ? String(driverVal).trim() : undefined;

          const vehicleVal =
            row["رقم / بيانات المركبة (Vehicle)"] ??
            row["بيانات المركبة"] ??
            row["المركبة"] ??
            row["Vehicle"];
          const vehicle = vehicleVal ? String(vehicleVal).trim() : undefined;

          const statusVal =
            row["الحالة (Status)"] ??
            row["الحالة"] ??
            row["Status"] ??
            row["status"];
          const status = normalizeStatus(statusVal);

          const summaryVal =
            row["تفاصيل الشحنة والأصناف (Items Summary)"] ??
            row["تفاصيل الأصناف"] ??
            row["Items"];
          const summaryStr = String(summaryVal || "").trim();

          const itemsList = summaryStr
            ? [{ sku: "ITEMS-DISPATCH", name: { ar: summaryStr, en: summaryStr }, qty: totalItems || 1 }]
            : [];

          const warnings: string[] = [];
          if (!branchAr) {
            warnings.push(pick("لم يتم تحديد فرع الوجهة", "Destination branch missing"));
          }

          const isExisting = existingIdsSet.has(id.toUpperCase());

          parsed.push({
            id,
            date,
            branch: { ar: branchAr, en: branchEn },
            linkedDoc: { type: linkedType, id: docId },
            status,
            totalItems,
            items: itemsList,
            driver,
            vehicle,
            isExisting,
            warnings,
          });
        }

        setParsedRows(parsed);
        setIsProcessing(false);
        toast.success(
          pick(
            `تمت قراءة ${parsed.length} أمر تحميل بنجاح`,
            `Successfully read ${parsed.length} dispatch orders`
          )
        );
      } catch (err: any) {
        console.error("Excel parse error:", err);
        toast.error(err.message || pick("فشل تحليل الملف", "Failed to parse file"));
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    try {
      const wb = generateDispatchBlankTemplate({ branches });
      safeDownloadWorkbook(wb, "نموذج_استيراد_أوامر_التحميل_Dispatch_Orders_Template.xlsx");
      toast.success(pick("تم تنزيل النموذج الفارغ بنجاح", "Template downloaded"));
    } catch {
      toast.error(pick("فشل تنزيل النموذج", "Failed to download template"));
    }
  };

  const stats = useMemo(() => {
    const total = parsedRows.length;
    const existing = parsedRows.filter((r) => r.isExisting).length;
    const newItems = total - existing;
    const withWarnings = parsedRows.filter((r) => r.warnings.length > 0).length;
    return { total, existing, newItems, withWarnings };
  }, [parsedRows]);

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    try {
      setIsImporting(true);

      const ordersToSave: DispatchOrder[] = parsedRows.map((r) => ({
        id: r.id,
        date: r.date,
        branch: r.branch,
        linkedDoc: r.linkedDoc,
        status: r.status,
        totalItems: r.totalItems,
        items: r.items,
        driver: r.driver,
        vehicle: r.vehicle,
      }));

      await onImportSuccess(ordersToSave, importMode);

      toast.success(
        pick(
          `تم استيراد ${ordersToSave.length} أمر تحميل بنجاح!`,
          `Successfully imported ${ordersToSave.length} dispatch orders!`
        )
      );

      setParsedRows([]);
      setFileName("");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err.message || pick("فشل استيراد أوامر التحميل", "Failed to import dispatch orders"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base font-black">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Truck className="size-5" />
              </div>
              <div>
                <span>{pick("استيراد أوامر التحميل من Excel", "Import Dispatch Orders from Excel")}</span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  {pick(
                    "إضافة وجدولة شحنات النقل والتحميل وتوزيع البضائع للفروع عبر ملفات Excel (.xlsx, .xls, .csv)",
                    "Bulk import & schedule cargo dispatch shipments to branches using Excel files"
                  )}
                </p>
              </div>
            </div>

            <Btn
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs gap-1.5 font-bold border-primary/40 text-primary hover:bg-primary/10"
            >
              <Download className="size-3.5" />
              <span>{pick("تحميل النموذج الفارغ (.xlsx)", "Download Template")}</span>
            </Btn>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {parsedRows.length === 0 ? (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
                id="dispatch-excel-upload-input"
              />

              <label
                htmlFor="dispatch-excel-upload-input"
                className={cn(
                  "flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border/80 hover:border-primary bg-secondary/30 hover:bg-primary/5 transition-all cursor-pointer text-center group",
                  isProcessing && "opacity-60 pointer-events-none"
                )}
              >
                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform mb-3 shadow-xs">
                  {isProcessing ? (
                    <RefreshCw className="size-7 animate-spin" />
                  ) : (
                    <Upload className="size-7" />
                  )}
                </div>

                <div className="text-sm font-black text-foreground">
                  {isProcessing
                    ? pick("جاري قراءة وتحليل ملف Excel...", "Parsing Excel file...")
                    : pick("اضغط هنا لاختيار ملف Excel أو اسحبه وأفلته هنا", "Click to browse Excel file or drag & drop here")}
                </div>

                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  {pick(
                    "يدعم ملفات .xlsx و .xls و .csv التي تشتمل على رقم أمر التحميل، فرع الوجهة، السائق، وإجمالي العناصر.",
                    "Supports .xlsx, .xls, and .csv files with Dispatch #, Destination Branch, Driver, and Total Items."
                  )}
                </p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-secondary/50 border border-border/80">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-5 text-primary" />
                  <span className="font-bold text-xs text-foreground font-mono">{fileName}</span>
                  <span className="text-[11px] text-muted-foreground">
                    ({n(parsedRows.length)} {pick("أمر تحميل مكتشف", "orders detected")})
                  </span>
                </div>

                <Btn variant="outline" size="sm" onClick={handleReset} className="text-xs">
                  {pick("اختيار ملف آخر", "Choose another file")}
                </Btn>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-border bg-card">
                  <div className="text-[11px] font-bold text-muted-foreground">{pick("إجمالي الشحنات", "Total Shipments")}</div>
                  <div className="text-lg font-black text-foreground font-mono mt-0.5">{n(stats.total)}</div>
                </div>
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{pick("شحنات جديدة", "New Shipments")}</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">+{n(stats.newItems)}</div>
                </div>
                <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10">
                  <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300">{pick("تحديث شحنات قائمة", "Update Existing")}</div>
                  <div className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">{n(stats.existing)}</div>
                </div>
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">{pick("ملاحظات / تحذيرات", "Warnings")}</div>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{n(stats.withWarnings)}</div>
                </div>
              </div>

              {/* Import Mode */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                <span className="text-xs font-bold text-foreground">{pick("طريقة معالجة الشحنات المكررة:", "Duplicate Handling Mode:")}</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all",
                      importMode === "upsert"
                        ? "border-primary bg-primary/10 text-foreground font-bold"
                        : "border-border hover:bg-secondary/40 text-muted-foreground"
                    )}
                  >
                    <input
                      type="radio"
                      name="dispatchImportMode"
                      value="upsert"
                      checked={importMode === "upsert"}
                      onChange={() => setImportMode("upsert")}
                      className="text-primary focus:ring-primary size-4"
                    />
                    <div>
                      <div>{pick("تحديث الشحنات الموجودة وإضافة الجديدة (Merge & Update)", "Update existing & add new")}</div>
                      <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
                        {pick("يحدّث بيانات الفرع والحالة والسائق إذا كان رقم الأمر مسجلاً مسبقاً", "Updates branch, status, driver if dispatch # exists")}
                      </div>
                    </div>
                  </label>

                  <label
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all",
                      importMode === "skip"
                        ? "border-primary bg-primary/10 text-foreground font-bold"
                        : "border-border hover:bg-secondary/40 text-muted-foreground"
                    )}
                  >
                    <input
                      type="radio"
                      name="dispatchImportMode"
                      value="skip"
                      checked={importMode === "skip"}
                      onChange={() => setImportMode("skip")}
                      className="text-primary focus:ring-primary size-4"
                    />
                    <div>
                      <div>{pick("تخطي الشحنات المكررة وإضافة الجديدة فقط (Skip Existing)", "Skip existing numbers")}</div>
                      <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
                        {pick("يتجاهل أي أمر تحميل موجود مسبقاً", "Ignores orders with existing tracking numbers")}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="p-2.5 bg-muted/60 border-b border-border text-xs font-bold text-foreground flex items-center justify-between">
                  <span>{pick("معاينة أوامر التحميل (أول 20 شحنة):", "Preview (First 20 shipments):")}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {parsedRows.slice(0, 20).length} / {parsedRows.length}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-muted text-[11px] font-bold text-muted-foreground border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 text-start">{pick("رقم الأمر", "Dispatch #")}</th>
                        <th className="py-2 px-3 text-start">{pick("الفرع المستلم", "Destination")}</th>
                        <th className="py-2 px-3 text-end">{pick("العناصر", "Items")}</th>
                        <th className="py-2 px-3 text-start">{pick("السائق", "Driver")}</th>
                        <th className="py-2 px-3 text-start">{pick("الحالة", "Status")}</th>
                        <th className="py-2 px-3 text-center">{pick("الإجراء", "Action")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {parsedRows.slice(0, 20).map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="py-2 px-3 font-mono font-bold text-primary">{r.id}</td>
                          <td className="py-2 px-3 font-bold text-foreground">{pick(r.branch)}</td>
                          <td className="py-2 px-3 text-end font-mono font-bold text-foreground">{n(r.totalItems)}</td>
                          <td className="py-2 px-3 text-muted-foreground">{r.driver || "—"}</td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {r.isExisting ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                {importMode === "upsert" ? pick("تحديث", "Update") : pick("تخطي", "Skip")}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                {pick("جديد +", "New +")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <Btn variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                  {pick("إلغاء", "Cancel")}
                </Btn>

                <Btn
                  variant="solid"
                  size="sm"
                  disabled={isImporting || parsedRows.length === 0}
                  onClick={handleConfirmImport}
                  className="text-xs gap-1.5 bg-primary font-bold px-4"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>{pick("جاري حفظ الشحنات...", "Importing shipments...")}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      <span>
                        {pick(
                          `تأكيد استيراد ${parsedRows.length} أمر تحميل`,
                          `Confirm Import (${parsedRows.length} Orders)`
                        )}
                      </span>
                    </>
                  )}
                </Btn>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
