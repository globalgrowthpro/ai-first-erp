import { useState, useRef, useMemo } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Layers,
  ArrowRight,
  RefreshCw,
  FolderTree,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  type AccountItem,
  type AccountType,
  type NormalBalance,
} from "@/lib/demo-data";
import { generateAccountsBlankTemplate, safeDownloadWorkbook } from "@/lib/excel-utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AccountsImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingAccounts: AccountItem[];
  onImportSuccess: (importedAccounts: AccountItem[], mode: "upsert" | "skip") => Promise<void>;
}

interface ParsedAccountRow {
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId?: string | undefined;
  level: number;
  isParent: boolean;
  balance: number;
  status: "active" | "inactive";
  description?: string | undefined;
  isExisting: boolean;
  warnings: string[];
}

export function AccountsImportModal({
  open,
  onOpenChange,
  existingAccounts,
  onImportSuccess,
}: AccountsImportModalProps) {
  const { pick, lang, n, money } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedAccountRow[]>([]);
  const [importMode, setImportMode] = useState<"upsert" | "skip">("upsert");
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Normalize Account Type from flexible Arabic / English text
  const normalizeAccountType = (val: any): AccountType => {
    if (!val) return "asset";
    const str = String(val).toLowerCase().trim();
    if (str.includes("asset") || str.includes("أصول") || str.includes("اصل")) return "asset";
    if (str.includes("liabilit") || str.includes("خصوم") || str.includes("التزام")) return "liability";
    if (str.includes("equit") || str.includes("ملكية") || str.includes("حقوق")) return "equity";
    if (str.includes("reven") || str.includes("sales") || str.includes("إيراد") || str.includes("مبيع")) return "revenue";
    if (str.includes("expens") || str.includes("cogs") || str.includes("مصروف") || str.includes("تكل")) return "expense";
    return "asset";
  };

  // Normalize Normal Balance
  const normalizeNormalBalance = (val: any, accType: AccountType): NormalBalance => {
    if (val) {
      const str = String(val).toLowerCase().trim();
      if (str.includes("credit") || str.includes("دائن")) return "credit";
      if (str.includes("debit") || str.includes("مدين")) return "debit";
    }
    // Fallback based on type
    return ["asset", "expense"].includes(accType) ? "debit" : "credit";
  };

  // Handle File Selection & Excel Parsing
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
          toast.error(pick("الملف لا يحتوي على أوراق عمل صالحة", "File contains no valid worksheets"));
          setIsProcessing(false);
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (rawJson.length === 0) {
          toast.error(pick("الملف فارغ أو لا يحتوي على صفوف بيانات", "Sheet is empty"));
          setIsProcessing(false);
          return;
        }

        const existingCodesSet = new Set(existingAccounts.map((a) => a.code.trim()));
        const parsed: ParsedAccountRow[] = [];

        for (const row of rawJson) {
          // Flexible key lookup
          const codeVal =
            row["كود الحساب (Account Code)"] ??
            row["كود الحساب"] ??
            row["Account Code"] ??
            row["Code"] ??
            row["code"] ??
            row["الكود"];

          const code = String(codeVal || "").trim();
          if (!code) continue; // skip completely empty codes

          const nameArVal =
            row["اسم الحساب (عربي)"] ??
            row["اسم الحساب بالعربية"] ??
            row["اسم الحساب"] ??
            row["Name AR"] ??
            row["Name_Ar"] ??
            row["name_ar"];

          const nameEnVal =
            row["اسم الحساب (إنجليزي)"] ??
            row["اسم الحساب بالإنجليزية"] ??
            row["Name EN"] ??
            row["Name_En"] ??
            row["name_en"] ??
            row["English Name"];

          const nameAr = String(nameArVal || "").trim();
          const nameEn = String(nameEnVal || "").trim();

          const typeVal =
            row["نوع الحساب (Type)"] ??
            row["نوع الحساب"] ??
            row["Type"] ??
            row["Account Type"] ??
            row["type"];
          const accType = normalizeAccountType(typeVal);

          const normalBalVal =
            row["طبيعة الحساب (Normal Balance)"] ??
            row["طبيعة الحساب"] ??
            row["Normal Balance"] ??
            row["normal_balance"];
          const normalBal = normalizeNormalBalance(normalBalVal, accType);

          const parentVal =
            row["كود الحساب الأب (Parent Code)"] ??
            row["كود الحساب الأب"] ??
            row["الحساب الأب"] ??
            row["Parent Code"] ??
            row["parent_id"] ??
            row["parentId"];
          const parentId = String(parentVal || "").trim() || undefined;

          const levelVal =
            row["المستوى (Level)"] ??
            row["المستوى"] ??
            row["Level"] ??
            row["level"];
          let level = Number(levelVal) || 1;
          if (!levelVal && parentId) {
            level = 2;
          }

          const isParentVal =
            row["حساب تجميعي رئيسي (نعم/لا)"] ??
            row["حساب رئيسي/تجميعي"] ??
            row["حساب رئيسي"] ??
            row["Is Parent"] ??
            row["is_parent"];
          let isParent = false;
          if (isParentVal !== undefined && isParentVal !== "") {
            const strP = String(isParentVal).toLowerCase();
            isParent = strP === "نعم" || strP === "true" || strP === "1";
          }

          const balanceVal =
            row["الرصيد الافتتاحي (Opening Balance)"] ??
            row["الرصيد الافتتاحي"] ??
            row["Opening Balance"] ??
            row["Balance"] ??
            row["balance"];
          const balance = Number(balanceVal) || 0;

          const statusVal =
            row["الحالة (نشط/غير نشط)"] ??
            row["الحالة"] ??
            row["Status"] ??
            row["status"];
          let status: "active" | "inactive" = "active";
          if (statusVal) {
            const strS = String(statusVal).toLowerCase();
            if (strS.includes("غير") || strS === "inactive" || strS === "disabled") {
              status = "inactive";
            }
          }

          const descVal =
            row["الوصف والملاحظات (Description)"] ??
            row["الوصف والملاحظات"] ??
            row["الوصف"] ??
            row["Description"] ??
            row["description"];
          const description = descVal ? String(descVal).trim() : undefined;

          const warnings: string[] = [];
          if (!nameAr && !nameEn) {
            warnings.push(pick("اسم الحساب غير موجود", "Missing account name"));
          }
          if (parentId && !existingCodesSet.has(parentId) && !rawJson.some((r: any) => String(r["كود الحساب (Account Code)"] || r["كود الحساب"] || r["Code"] || "").trim() === parentId)) {
            warnings.push(pick(`كود الحساب الأب (${parentId}) غير موجود`, `Parent code (${parentId}) not in chart`));
          }

          const isExisting = existingCodesSet.has(code);

          parsed.push({
            code,
            nameAr: nameAr || nameEn || code,
            nameEn: nameEn || nameAr || code,
            type: accType,
            normalBalance: normalBal,
            parentId,
            level,
            isParent,
            balance,
            status,
            description,
            isExisting,
            warnings,
          });
        }

        // Auto-detect parents: if an account's code appears as parentId in any row, mark as parent
        const parentIdsInSheet = new Set(parsed.map((p) => p.parentId).filter(Boolean));
        for (const item of parsed) {
          if (parentIdsInSheet.has(item.code)) {
            item.isParent = true;
          }
        }

        setParsedRows(parsed);
        setIsProcessing(false);
        toast.success(
          pick(
            `تمت قراءة ${parsed.length} حساب من ملف Excel بنجاح`,
            `Successfully read ${parsed.length} accounts from Excel file`
          )
        );
      } catch (err: any) {
        console.error("Excel parse error:", err);
        toast.error(err.message || pick("فشل تحليل ملف Excel", "Failed to parse Excel file"));
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Download blank template
  const handleDownloadTemplate = () => {
    try {
      const wb = generateAccountsBlankTemplate();
      const fname = "نموذج_استيراد_دليل_الحسابات_Chart_of_Accounts_Template.xlsx";
      safeDownloadWorkbook(wb, fname);
      toast.success(pick("تم تنزيل النموذج الفارغ بنجاح", "Blank template downloaded successfully"));
    } catch {
      toast.error(pick("فشل تنزيل النموذج", "Failed to download template"));
    }
  };

  // Summary counts
  const stats = useMemo(() => {
    const total = parsedRows.length;
    const existing = parsedRows.filter((r) => r.isExisting).length;
    const newItems = total - existing;
    const withWarnings = parsedRows.filter((r) => r.warnings.length > 0).length;
    return { total, existing, newItems, withWarnings };
  }, [parsedRows]);

  // Execute Import
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    try {
      setIsImporting(true);

      const accountsToSave: AccountItem[] = parsedRows.map((r) => ({
        code: r.code,
        name: { ar: r.nameAr, en: r.nameEn },
        type: r.type,
        normalBalance: r.normalBalance,
        balance: r.balance,
        parentId: r.parentId,
        level: r.level,
        isParent: r.isParent,
        status: r.status,
        description: r.description ? { ar: r.description, en: r.description } : undefined,
      }));

      await onImportSuccess(accountsToSave, importMode);

      toast.success(
        pick(
          `تم استيراد ${accountsToSave.length} حساب بنجاح في دليل الحسابات!`,
          `Successfully imported ${accountsToSave.length} accounts into Chart of Accounts!`
        )
      );

      // Reset and close
      setParsedRows([]);
      setFileName("");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err.message || pick("فشل استيراد الحسابات", "Failed to import accounts"));
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
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="size-5" />
              </div>
              <div>
                <span>{pick("استيراد دليل الحسابات من Excel", "Import Chart of Accounts from Excel")}</span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  {pick(
                    "إضافة وتحديث شجرة الحسابات المحاسبية دفعة واحدة عبر ملفات Excel (.xlsx, .xls, .csv)",
                    "Bulk add & update the Chart of Accounts hierarchy using Excel files (.xlsx, .xls, .csv)"
                  )}
                </p>
              </div>
            </div>

            <Btn
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs gap-1.5 font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <Download className="size-3.5" />
              <span>{pick("تحميل النموذج الفارغ (.xlsx)", "Download Template")}</span>
            </Btn>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* STEP 1: Upload Dropzone if no file selected */}
          {parsedRows.length === 0 ? (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
                id="coa-excel-upload-input"
              />

              <label
                htmlFor="coa-excel-upload-input"
                className={cn(
                  "flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border/80 hover:border-emerald-500 bg-secondary/30 hover:bg-emerald-500/5 transition-all cursor-pointer text-center group",
                  isProcessing && "opacity-60 pointer-events-none"
                )}
              >
                <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-3 shadow-xs">
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
                    "يدعم ملفات .xlsx و .xls و .csv التي تحتوي على أعمدة كود الحساب، الاسم، النوع، الحساب الأب، والرصيد الافتتاحي.",
                    "Supports .xlsx, .xls, and .csv files with columns for Account Code, Name, Type, Parent Code, and Balance."
                  )}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-secondary text-[11px] font-mono text-muted-foreground">
                    .XLSX
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-secondary text-[11px] font-mono text-muted-foreground">
                    .XLS
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-secondary text-[11px] font-mono text-muted-foreground">
                    .CSV
                  </span>
                </div>
              </label>

              {/* Quick instructions panel */}
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2 text-xs">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <FolderTree className="size-4 text-primary" />
                  <span>{pick("إرشادات هيكل شجرة الحسابات:", "Chart of Accounts Structure Guide:")}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                  <li>{pick("الحسابات الرئيسية (مستوى 1 مثل 1000 الأصول، 2000 الخصوم) يجب أن يكون عمود 'كود الحساب الأب' فارغاً.", "Root level 1 accounts (1000 Assets, 2000 Liabilities) must leave 'Parent Code' blank.")}</li>
                  <li>{pick("الحسابات الفرعية ترتبط بحسابها الأب بكتابة كوده في عمود 'كود الحساب الأب' (مثال: 1100 أبوه 1000).", "Child accounts link to parents via the Parent Code column (e.g. 1100 references 1000).")}</li>
                  <li>{pick("أنواع الحسابات المعتمدة: أصول (asset)، خصوم (liability)، حقوق ملكية (equity)، إيرادات (revenue)، مصروفات (expense).", "Valid account types: asset, liability, equity, revenue, expense.")}</li>
                  <li>{pick("طبيعة الحساب: مدين (debit) للأصول والمصروفات، دائن (credit) للخصوم وحقوق الملكية والإيرادات.", "Normal balance: debit for assets & expenses, credit for liabilities, equity & revenues.")}</li>
                </ul>
              </div>
            </div>
          ) : (
            /* STEP 2: Preview & Confirmation */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-secondary/50 border border-border/80">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-xs text-foreground font-mono">{fileName}</span>
                  <span className="text-[11px] text-muted-foreground">
                    ({n(parsedRows.length)} {pick("حساب مكتشف", "accounts detected")})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Btn variant="outline" size="sm" onClick={handleReset} className="text-xs">
                    {pick("اختيار ملف آخر", "Choose another file")}
                  </Btn>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-border bg-card">
                  <div className="text-[11px] font-bold text-muted-foreground">{pick("إجمالي الحسابات", "Total Accounts")}</div>
                  <div className="text-lg font-black text-foreground font-mono mt-0.5">{n(stats.total)}</div>
                </div>
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{pick("حسابات جديدة", "New Accounts")}</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">+{n(stats.newItems)}</div>
                </div>
                <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10">
                  <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300">{pick("تحديث حسابات قائمة", "Update Existing")}</div>
                  <div className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">{n(stats.existing)}</div>
                </div>
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">{pick("ملاحظات وتحذيرات", "Warnings")}</div>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{n(stats.withWarnings)}</div>
                </div>
              </div>

              {/* Import Mode Options */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                <span className="text-xs font-bold text-foreground">{pick("طريقة معالجة الحسابات المكررة:", "Duplicate Handling Mode:")}</span>
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
                      name="importMode"
                      value="upsert"
                      checked={importMode === "upsert"}
                      onChange={() => setImportMode("upsert")}
                      className="text-primary focus:ring-primary size-4"
                    />
                    <div>
                      <div>{pick("تحديث الحسابات الموجودة وإضافة الجديدة (Merge & Update)", "Update existing accounts & add new")}</div>
                      <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
                        {pick("يحدّث الاسم والنوع والرصيد إذا كان الكود موجوداً مسبقاً", "Updates name, type, and balance if code exists")}
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
                      name="importMode"
                      value="skip"
                      checked={importMode === "skip"}
                      onChange={() => setImportMode("skip")}
                      className="text-primary focus:ring-primary size-4"
                    />
                    <div>
                      <div>{pick("تخطي الحسابات المكررة وإضافة الجديدة فقط (Skip Existing)", "Skip existing codes & add new only")}</div>
                      <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
                        {pick("يتجاهل أي حساب موجود بالكود ولا يعدل بياناته الحالية", "Ignores any account with existing code")}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="p-2.5 bg-muted/60 border-b border-border text-xs font-bold text-foreground flex items-center justify-between">
                  <span>{pick("معاينة الحسابات المستوردة (أول 20 صفاً):", "Import Preview (First 20 rows):")}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {parsedRows.slice(0, 20).length} / {parsedRows.length}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-muted text-[11px] font-bold text-muted-foreground border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 text-start w-24">{pick("كود الحساب", "Code")}</th>
                        <th className="py-2 px-3 text-start">{pick("اسم الحساب (عربي / إنجليزي)", "Account Name")}</th>
                        <th className="py-2 px-3 text-start w-24">{pick("النوع", "Type")}</th>
                        <th className="py-2 px-3 text-start w-20">{pick("الطبيعة", "Normal")}</th>
                        <th className="py-2 px-3 text-start w-20">{pick("الأب", "Parent")}</th>
                        <th className="py-2 px-3 text-end w-24">{pick("الافتتاحي", "Opening")}</th>
                        <th className="py-2 px-3 text-center w-24">{pick("الإجراء", "Action")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {parsedRows.slice(0, 20).map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="py-2 px-3 font-mono font-bold text-foreground">{r.code}</td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-foreground">{r.nameAr}</div>
                            {r.nameEn && r.nameEn !== r.nameAr && (
                              <div className="text-[10px] text-muted-foreground">{r.nameEn}</div>
                            )}
                            {r.warnings.length > 0 && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="size-3" />
                                <span>{r.warnings.join("، ")}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">
                              {r.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                            {r.normalBalance === "debit" ? pick("مدين", "Dr") : pick("دائن", "Cr")}
                          </td>
                          <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                            {r.parentId || "—"}
                          </td>
                          <td className="py-2 px-3 text-end font-mono font-bold text-foreground">
                            {r.balance > 0 ? money(r.balance) : "0"}
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

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <Btn variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                  {pick("إلغاء", "Cancel")}
                </Btn>

                <div className="flex items-center gap-2">
                  <Btn
                    variant="solid"
                    size="sm"
                    disabled={isImporting || parsedRows.length === 0}
                    onClick={handleConfirmImport}
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>{pick("جاري حفظ الحسابات...", "Importing accounts...")}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3.5" />
                        <span>
                          {pick(
                            `تأكيد استيراد ${parsedRows.length} حساب`,
                            `Confirm Import (${parsedRows.length} Accounts)`
                          )}
                        </span>
                      </>
                    )}
                  </Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

