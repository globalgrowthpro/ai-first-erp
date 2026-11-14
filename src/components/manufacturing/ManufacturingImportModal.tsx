import { useState, useRef, useMemo } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Factory,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  type ManufacturingOrder,
  type ProductionStage,
  type OrderPriority,
} from "@/lib/manufacturing-store";
import {
  generateManufacturingBlankTemplate,
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

interface ManufacturingImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingOrders: ManufacturingOrder[];
  products: any[];
  boms: any[];
  warehouses: any[];
  onImportSuccess: (orders: ManufacturingOrder[], mode: "upsert" | "skip") => Promise<void>;
}

interface ParsedWorkOrderRow {
  code: string;
  finishedProductId: string;
  finishedProductName: { ar: string; en: string };
  targetQty: number;
  producedQty: number;
  unitName: { ar: string; en: string };
  bomId: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  supervisor: string;
  startDate: string;
  dueDate: string;
  status: ProductionStage;
  priority: OrderPriority;
  notes?: string | undefined;
  isExisting: boolean;
  warnings: string[];
}

export function ManufacturingImportModal({
  open,
  onOpenChange,
  existingOrders,
  products,
  boms,
  warehouses,
  onImportSuccess,
}: ManufacturingImportModalProps) {
  const { pick, n } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedWorkOrderRow[]>([]);
  const [importMode, setImportMode] = useState<"upsert" | "skip">("upsert");
  const [isImporting, setIsImporting] = useState(false);

  // Normalize Stage / Status
  const normalizeStage = (val: any): ProductionStage => {
    if (!val) return "draft";
    const str = String(val).toLowerCase().trim();
    if (str.includes("progress") || str.includes("تشغيل") || str.includes("طهي")) return "in_progress";
    if (str.includes("confirm") || str.includes("مؤكد")) return "confirmed";
    if (str.includes("qc") || str.includes("جود")) return "qc_check";
    if (str.includes("complete") || str.includes("مكتمل") || str.includes("تم")) return "completed";
    return "draft";
  };

  // Normalize Priority
  const normalizePriority = (val: any): OrderPriority => {
    if (!val) return "medium";
    const str = String(val).toLowerCase().trim();
    if (str.includes("urgent") || str.includes("قصوى") || str.includes("طارئ")) return "urgent";
    if (str.includes("high") || str.includes("عاجل") || str.includes("مرتفع")) return "high";
    if (str.includes("low") || str.includes("منخفض") || str.includes("عادي")) return "low";
    return "medium";
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

        const existingCodesSet = new Set(existingOrders.map((o) => o.code.trim().toUpperCase()));
        const parsed: ParsedWorkOrderRow[] = [];

        for (const row of rawJson) {
          const codeVal =
            row["كود أمر التشغيل (Order Code)"] ??
            row["كود أمر التشغيل"] ??
            row["Order Code"] ??
            row["code"] ??
            row["order_no"];

          const code = String(codeVal || "").trim();
          if (!code) continue;

          const skuVal =
            row["كود الصنف التام (Product SKU)"] ??
            row["كود الصنف التام"] ??
            row["Product SKU"] ??
            row["sku"] ??
            row["SKU"];
          const sku = String(skuVal || "").trim();

          const nameArVal =
            row["اسم الصنف التام (عربي)"] ??
            row["اسم الصنف"] ??
            row["Product Name"];
          const nameAr = String(nameArVal || "").trim();

          const targetQtyVal =
            row["الكمية المستهدفة (Target Qty)"] ??
            row["الكمية المستهدفة"] ??
            row["Target Qty"] ??
            row["quantity"] ??
            row["الكمية"];
          const targetQty = Number(targetQtyVal) || 1;

          const producedQtyVal =
            row["الكمية المنتجة (Produced Qty)"] ??
            row["الكمية المنتجة"] ??
            row["Produced Qty"];
          const producedQty = Number(producedQtyVal) || 0;

          const unitVal =
            row["الوحدة (Unit)"] ??
            row["الوحدة"] ??
            row["Unit"];
          const unitStr = String(unitVal || "قطعة").trim();

          const bomCodeVal =
            row["كود الوصفة / قائمة المواد (BOM Code)"] ??
            row["كود الوصفة"] ??
            row["BOM Code"] ??
            row["bom_id"];
          const bomCode = String(bomCodeVal || "").trim();

          const supervisorVal =
            row["الشيف / المشرف المسؤول (Supervisor)"] ??
            row["المشرف المسؤول"] ??
            row["المشرف"] ??
            row["Supervisor"];
          const supervisor = String(supervisorVal || "الشيف المسؤول").trim();

          const startDateVal =
            row["تاريخ البدء (Start Date)"] ??
            row["تاريخ البدء"] ??
            row["Start Date"] ??
            row["startDate"];
          const startDate = String(startDateVal || new Date().toISOString().slice(0, 10)).slice(0, 10);

          const dueDateVal =
            row["تاريخ الاستحقاق (Due Date)"] ??
            row["تاريخ الاستحقاق"] ??
            row["Due Date"] ??
            row["dueDate"];
          const dueDate = String(dueDateVal || new Date(Date.now() + 86400000).toISOString().slice(0, 10)).slice(0, 10);

          const stageVal =
            row["مرحلة التشغيل (Stage/Status)"] ??
            row["مرحلة التشغيل"] ??
            row["Status"] ??
            row["status"];
          const stage = normalizeStage(stageVal);

          const priorityVal =
            row["الأولوية (Priority)"] ??
            row["الأولوية"] ??
            row["Priority"] ??
            row["priority"];
          const priority = normalizePriority(priorityVal);

          const notesVal =
            row["الملاحظات (Notes)"] ??
            row["الملاحظات"] ??
            row["Notes"] ??
            row["notes"];
          const notes = notesVal ? String(notesVal).trim() : undefined;

          // Lookup matching product
          const foundProd = products.find(
            (p) =>
              (sku && p.sku?.toUpperCase() === sku.toUpperCase()) ||
              (nameAr && (p.name?.ar?.includes(nameAr) || nameAr.includes(p.name?.ar)))
          );

          // Lookup matching BOM
          const foundBom = boms.find(
            (b) =>
              (bomCode && b.code?.toUpperCase() === bomCode.toUpperCase()) ||
              (foundProd && b.finishedProductId === foundProd.id)
          );

          const warnings: string[] = [];
          if (!foundProd) {
            warnings.push(pick(`الصنف التام (${sku || nameAr}) غير مسجل في المخزون`, `Product (${sku || nameAr}) not found`));
          }

          const isExisting = existingCodesSet.has(code.toUpperCase());

          parsed.push({
            code,
            finishedProductId: foundProd?.id || sku || "prod-custom",
            finishedProductName: foundProd?.name || { ar: nameAr || sku, en: sku || nameAr },
            targetQty,
            producedQty,
            unitName: { ar: unitStr, en: unitStr },
            bomId: foundBom?.id || (boms[0]?.id || "bom-01"),
            sourceWarehouseId: warehouses[0]?.id || "wh-kitchen",
            destWarehouseId: warehouses[1]?.id || warehouses[0]?.id || "wh-retail",
            supervisor,
            startDate,
            dueDate,
            status: stage,
            priority,
            notes,
            isExisting,
            warnings,
          });
        }

        setParsedRows(parsed);
        setIsProcessing(false);
        toast.success(
          pick(
            `تمت قراءة ${parsed.length} أمر تشغيل بنجاح`,
            `Successfully read ${parsed.length} work orders`
          )
        );
      } catch (err: any) {
        console.error("Excel parse error:", err);
        toast.error(err.message || pick("فشل قراءة الملف", "Failed to parse file"));
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    try {
      const wb = generateManufacturingBlankTemplate({ boms, products, warehouses });
      safeDownloadWorkbook(wb, "نموذج_استيراد_أوامر_التشغيل_Work_Orders_Template.xlsx");
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

      const ordersToSave: ManufacturingOrder[] = parsedRows.map((r) => ({
        id: r.code,
        code: r.code,
        bomId: r.bomId,
        finishedProductId: r.finishedProductId,
        finishedProductName: r.finishedProductName,
        targetQty: r.targetQty,
        producedQty: r.producedQty,
        unitName: r.unitName,
        sourceWarehouseId: r.sourceWarehouseId,
        destWarehouseId: r.destWarehouseId,
        startDate: r.startDate,
        dueDate: r.dueDate,
        supervisor: r.supervisor,
        estimatedMaterialCost: r.targetQty * 35,
        overheadCost: r.targetQty * 5,
        totalCost: r.targetQty * 40,
        status: r.status,
        priority: r.priority,
        componentsRequired: [],
        notes: r.notes,
      }));

      await onImportSuccess(ordersToSave, importMode);

      toast.success(
        pick(
          `تم استيراد ${ordersToSave.length} أمر تشغيل بنجاح!`,
          `Successfully imported ${ordersToSave.length} work orders!`
        )
      );

      setParsedRows([]);
      setFileName("");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err.message || pick("فشل استيراد أوامر التشغيل", "Failed to import work orders"));
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
                <Factory className="size-5" />
              </div>
              <div>
                <span>{pick("استيراد أوامر التشغيل من Excel", "Import Work Orders from Excel")}</span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  {pick(
                    "إضافة وجدولة دفعات التصنيع والتشغيل بالمطبخ المركزي عبر ملفات Excel (.xlsx, .xls, .csv)",
                    "Bulk import & schedule kitchen production batches using Excel files (.xlsx, .xls, .csv)"
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
                id="wo-excel-upload-input"
              />

              <label
                htmlFor="wo-excel-upload-input"
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
                    "يدعم ملفات .xlsx و .xls و .csv التي تشتمل على كود أمر التشغيل، كود الصنف التام، الكمية، والمشرف المسؤول.",
                    "Supports .xlsx, .xls, and .csv files with Order Code, Product SKU, Target Qty, and Supervisor."
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
                    ({n(parsedRows.length)} {pick("أمر تشغيل مكتشف", "orders detected")})
                  </span>
                </div>

                <Btn variant="outline" size="sm" onClick={handleReset} className="text-xs">
                  {pick("اختيار ملف آخر", "Choose another file")}
                </Btn>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-border bg-card">
                  <div className="text-[11px] font-bold text-muted-foreground">{pick("إجمالي الأوامر", "Total Orders")}</div>
                  <div className="text-lg font-black text-foreground font-mono mt-0.5">{n(stats.total)}</div>
                </div>
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{pick("أوامر جديدة", "New Orders")}</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">+{n(stats.newItems)}</div>
                </div>
                <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10">
                  <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300">{pick("تحديث أوامر قائمة", "Update Existing")}</div>
                  <div className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">{n(stats.existing)}</div>
                </div>
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">{pick("ملاحظات / تحذيرات", "Warnings")}</div>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{n(stats.withWarnings)}</div>
                </div>
              </div>

              {/* Import Mode */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                <span className="text-xs font-bold text-foreground">{pick("طريقة معالجة الأوامر المكررة:", "Duplicate Handling Mode:")}</span>
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
                      name="woImportMode"
                      value="upsert"
                      checked={importMode === "upsert"}
                      onChange={() => setImportMode("upsert")}
                      className="text-primary focus:ring-primary size-4"
                    />
                    <div>
                      <div>{pick("تحديث الأوامر الموجودة وإضافة الجديدة (Merge & Update)", "Update existing & add new")}</div>
                      <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
                        {pick("يحدّث بيانات الكمية والمرحلة والمشرف إذا كان الكود مسجلاً مسبقاً", "Updates quantity and stage if order code exists")}
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
                      name="woImportMode"
                      value="skip"
                      checked={importMode === "skip"}
                      onChange={() => setImportMode("skip")}
                      className="text-primary focus:ring-primary size-4"
                    />
                    <div>
                      <div>{pick("تخطي الأوامر المكررة وإضافة الجديدة فقط (Skip Existing)", "Skip existing codes")}</div>
                      <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
                        {pick("يتجاهل أي أمر تشغيل موجود بالكود مسبقاً", "Ignores orders with existing codes")}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="p-2.5 bg-muted/60 border-b border-border text-xs font-bold text-foreground flex items-center justify-between">
                  <span>{pick("معاينة أوامر التشغيل (أول 20 أمراً):", "Preview (First 20 work orders):")}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {parsedRows.slice(0, 20).length} / {parsedRows.length}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-muted text-[11px] font-bold text-muted-foreground border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 text-start">{pick("كود الأمر", "Code")}</th>
                        <th className="py-2 px-3 text-start">{pick("الصنف التام", "Product")}</th>
                        <th className="py-2 px-3 text-end">{pick("الكمية", "Qty")}</th>
                        <th className="py-2 px-3 text-start">{pick("المشرف", "Supervisor")}</th>
                        <th className="py-2 px-3 text-start">{pick("المرحلة", "Stage")}</th>
                        <th className="py-2 px-3 text-start">{pick("الأولوية", "Priority")}</th>
                        <th className="py-2 px-3 text-center">{pick("الإجراء", "Action")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {parsedRows.slice(0, 20).map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="py-2 px-3 font-mono font-bold text-foreground">{r.code}</td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-foreground">{pick(r.finishedProductName)}</div>
                            {r.warnings.length > 0 && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="size-3" />
                                <span>{r.warnings.join("، ")}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-end font-mono font-bold text-foreground">
                            {n(r.targetQty)}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{r.supervisor}</td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">
                              {r.priority}
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
                      <span>{pick("جاري حفظ الأوامر...", "Importing orders...")}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      <span>
                        {pick(
                          `تأكيد استيراد ${parsedRows.length} أمر تشغيل`,
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

