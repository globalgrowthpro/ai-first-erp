import { useState, useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Download,
  Upload,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Repeat,
  DollarSign,
  Edit2,
  Trash2,
  FileSpreadsheet,
  X,
  CreditCard,
  Building2,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, Panel, Td, TablePagination, usePagination } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  useTodoStore,
  type TodoCommitmentItem,
  type TodoStatus,
} from "@/lib/todo-store";

export const Route = createFileRoute("/todo")({
  head: () => ({
    meta: [
      { title: "المهام والالتزامات الشهرية — وزير الحلو ERP" },
      {
        name: "description",
        content: "إدارة ومتابعة الفواتير والمدفوعات الدورية والتزامات الفروع الشهرية.",
      },
    ],
  }),
  component: TodoPage,
});

const CATEGORIES = [
  { id: "فواتير ومرافق", ar: "فواتير ومرافق (كهرباء، مياه، هاتف، غاز)", en: "Utilities & Bills" },
  { id: "إيجارات ومقرات", ar: "إيجارات ومقرات الفروع والمستودعات", en: "Rent & Premises" },
  { id: "صيانة وتشغيل", ar: "صيانة وتشغيل معدات التبريد والأفران", en: "Maintenance & Operations" },
  { id: "تكنولوجيا ومعلومات", ar: "تكنولوجيا، استضافة وسيرفرات", en: "IT & Subscriptions" },
  { id: "حكومي وتراخيص", ar: "رسوم حكومية وتراخيص سلامة الغذاء", en: "Government & Licenses" },
  { id: "أخرى", ar: "التزامات عامة أخرى", en: "Other Commitments" },
];

export function TodoPage() {
  const { t, pick, n, dir, lang } = useI18n();
  const {
    items,
    loading,
    addTodo,
    importTodos,
    updateTodo,
    deleteTodo,
    toggleRepeatingMonthly,
    setTodoStatus,
  } = useTodoStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TodoCommitmentItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<TodoCommitmentItem | null>(null);

  // Form inputs state
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formTaskName, setFormTaskName] = useState("");
  const [formTaskNameEn, setFormTaskNameEn] = useState("");
  const [formRef, setFormRef] = useState("");
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDueDate, setFormDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [formStatus, setFormStatus] = useState<TodoStatus>("pending");
  const [formRepeating, setFormRepeating] = useState(false);
  const [formCategory, setFormCategory] = useState("فواتير ومرافق");
  const [formNotes, setFormNotes] = useState("");

  // KPI Calculations
  const stats = useMemo(() => {
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let issueAmount = 0;

    const safeItems = Array.isArray(items) ? items : [];
    let totalCount = safeItems.length;
    let paidCount = 0;
    let pendingCount = 0;
    let issueCount = 0;

    for (const item of safeItems) {
      const amt = Number(item.amount) || 0;
      totalAmount += amt;

      if (item.status === "paid") {
        paidAmount += amt;
        paidCount++;
      } else if (item.status === "pending") {
        pendingAmount += amt;
        pendingCount++;
      } else if (item.status === "has_issue") {
        issueAmount += amt;
        issueCount++;
      }
    }

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      issueAmount,
      totalCount,
      paidCount,
      pendingCount,
      issueCount,
    };
  }, [items]);

  // Filtered List
  const filteredItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    return safeItems.filter((item) => {
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      // Recurring filter
      if (recurringOnly && !item.repeatingMonthly) return false;

      // Category filter
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;

      // Date range filter (against dueDate or date)
      if (dateFrom && item.dueDate < dateFrom) return false;
      if (dateTo && item.dueDate > dateTo) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName =
          item.taskName?.toLowerCase().includes(q) ||
          item.taskNameEn?.toLowerCase().includes(q);
        const matchesRef = item.ref?.toLowerCase().includes(q);
        const matchesNotes = item.notes?.toLowerCase().includes(q);
        const matchesCategory = item.category?.toLowerCase().includes(q);
        if (!matchesName && !matchesRef && !matchesNotes && !matchesCategory) return false;
      }

      return true;
    });
  }, [items, statusFilter, recurringOnly, categoryFilter, dateFrom, dateTo, searchQuery]);

  // Pagination
  const {
    paginatedData,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    pageCount,
    totalCount,
  } = usePagination(filteredItems, 15);

  // Open Add Modal
  const openAddModal = () => {
    setEditingItem(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormTaskName("");
    setFormTaskNameEn("");
    setFormRef(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormAmount(0);
    setFormDueDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setFormStatus("pending");
    setFormRepeating(true);
    setFormCategory("فواتير ومرافق");
    setFormNotes("");
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: TodoCommitmentItem) => {
    setEditingItem(item);
    setFormDate(item.date);
    setFormTaskName(item.taskName);
    setFormTaskNameEn(item.taskNameEn || "");
    setFormRef(item.ref);
    setFormAmount(item.amount);
    setFormDueDate(item.dueDate);
    setFormStatus(item.status);
    setFormRepeating(item.repeatingMonthly);
    setFormCategory(item.category || "فواتير ومرافق");
    setFormNotes(item.notes || "");
    setIsFormModalOpen(true);
  };

  // Submit Add / Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTaskName.trim()) {
      toast.error(pick("يرجى إدخال اسم المهمة أو الالتزام", "Please enter task name"));
      return;
    }

    if (editingItem) {
      await updateTodo(editingItem.id, {
        date: formDate,
        taskName: formTaskName.trim(),
        taskNameEn: formTaskNameEn.trim() || undefined,
        ref: formRef.trim(),
        amount: Number(formAmount) || 0,
        dueDate: formDueDate,
        status: formStatus,
        repeatingMonthly: formRepeating,
        category: formCategory,
        notes: formNotes.trim() || undefined,
      });
      toast.success(pick("تم تحديث المهمة بنجاح", "Task updated successfully"));
    } else {
      await addTodo({
        date: formDate,
        taskName: formTaskName.trim(),
        taskNameEn: formTaskNameEn.trim() || undefined,
        ref: formRef.trim() || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
        amount: Number(formAmount) || 0,
        dueDate: formDueDate,
        status: formStatus,
        repeatingMonthly: formRepeating,
        category: formCategory,
        notes: formNotes.trim() || undefined,
      });
      toast.success(pick("تمت إضافة المهمة إلى قائمة الالتزامات", "Task added successfully"));
    }

    setIsFormModalOpen(false);
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredItems.map((item) => ({
        [pick("التاريخ", "Date")]: item.date,
        [pick("اسم المهمة", "Task Name")]: item.taskName,
        [pick("الاسم بالإنجليزية", "Task Name (EN)")]: item.taskNameEn || "",
        [pick("المرجع", "Ref")]: item.ref,
        [pick("المبلغ (ج.م)", "Amount (EGP)")]: item.amount,
        [pick("تاريخ الاستحقاق", "Due Date")]: item.dueDate,
        [pick("الحالة", "Status")]:
          item.status === "paid"
            ? pick("مسدد", "Paid")
            : item.status === "pending"
            ? pick("قيد الانتظار", "Pending")
            : pick("يوجد مشكلة", "Has Issue"),
        [pick("يتكرر شهرياً", "Monthly Recurring")]: item.repeatingMonthly
          ? pick("نعم", "Yes")
          : pick("لا", "No"),
        [pick("التصنيف", "Category")]: item.category || "",
        [pick("الملاحظات", "Notes")]: item.notes || "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(wb, ws, "Todo Commitments");
      safeDownloadWorkbook(wb, `wazeer-todo-commitments-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(pick("تم تصدير ملف الإكسيل بنجاح", "Excel exported successfully"));
    } catch (err) {
      toast.error(pick("فشل تصدير ملف الإكسيل", "Failed to export Excel"));
    }
  };

  // Download Excel Import Template
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          "التاريخ / Date": new Date().toISOString().slice(0, 10),
          "اسم المهمة / Task Name": "شحن باقة التليفون الأرضي والإنترنت الفايبر",
          "الاسم بالإنجليزية / Task Name (EN)": "Charge of landline & internet bill",
          "المرجع / Ref": "WE-LAND-1094",
          "المبلغ / Amount": 1450,
          "تاريخ الاستحقاق / Due Date": new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          "الحالة / Status (paid, pending, has_issue)": "pending",
          "تكرار شهري / Monthly Recurring (نعم/لا)": "نعم",
          "التصنيف / Category": "فواتير ومرافق",
          "الملاحظات / Notes": "سداد عبر فوري أو بطاقة الشركة",
        },
        {
          "التاريخ / Date": new Date().toISOString().slice(0, 10),
          "اسم المهمة / Task Name": "فاتورة استهلاك كهرباء فرع الكوربة",
          "الاسم بالإنجليزية / Task Name (EN)": "Korba branch electricity bill",
          "المرجع / Ref": "ELEC-KRB-88",
          "المبلغ / Amount": 5200,
          "تاريخ الاستحقاق / Due Date": new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
          "الحالة / Status (paid, pending, has_issue)": "pending",
          "تكرار شهري / Monthly Recurring (نعم/لا)": "نعم",
          "التصنيف / Category": "فواتير ومرافق",
          "الملاحظات / Notes": "عداد رئيسي",
        },
        {
          "التاريخ / Date": new Date().toISOString().slice(0, 10),
          "اسم المهمة / Task Name": "إيجار مقر فرع الكوربة - مصر الجديدة",
          "الاسم بالإنجليزية / Task Name (EN)": "Monthly rent for Korba branch",
          "المرجع / Ref": "RENT-KRB-11",
          "المبلغ / Amount": 35000,
          "تاريخ الاستحقاق / Due Date": new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
          "الحالة / Status (paid, pending, has_issue)": "pending",
          "تكرار شهري / Monthly Recurring (نعم/لا)": "نعم",
          "التصنيف / Category": "إيجارات ومقرات",
          "الملاحظات / Notes": "شيك مستحق في البنك الأهلي",
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Todo_Template");
      safeDownloadWorkbook(wb, "نموذج_استيراد_المهام_والالتزامات.xlsx");
      toast.success(pick("تم تحميل نموذج الإكسيل بنجاح", "Excel template downloaded successfully"));
    } catch {
      toast.error(pick("فشل تحميل النموذج", "Failed to download template"));
    }
  };

  // Import from Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(buffer, { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          toast.error(pick("ملف الإكسيل فارغ أو غير صالح", "Excel file is empty or invalid"));
          return;
        }

        const sheet = wb.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) {
          toast.error(pick("لم يتم العثور على أي صفوف في الملف", "No rows found in Excel sheet"));
          return;
        }

        const validItems: Omit<TodoCommitmentItem, "id">[] = [];

        for (const row of rows) {
          // Normalize task name
          const taskName = String(
            row["اسم المهمة / Task Name"] ||
            row["اسم المهمة"] ||
            row["Task Name"] ||
            row["Task"] ||
            row["المهمة"] ||
            row["البيان"] ||
            row["البند"] ||
            ""
          ).trim();

          if (!taskName) continue;

          const taskNameEn = String(
            row["الاسم بالإنجليزية / Task Name (EN)"] ||
            row["الاسم بالإنجليزية"] ||
            row["Task Name (EN)"] ||
            row["Task Name EN"] ||
            ""
          ).trim();

          const rawDate = String(
            row["التاريخ / Date"] ||
            row["التاريخ"] ||
            row["Date"] ||
            ""
          ).trim();
          const date = rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate)
            ? rawDate.slice(0, 10)
            : new Date().toISOString().slice(0, 10);

          const rawDueDate = String(
            row["تاريخ الاستحقاق / Due Date"] ||
            row["تاريخ الاستحقاق"] ||
            row["Due Date"] ||
            row["DueDate"] ||
            ""
          ).trim();
          const dueDate = rawDueDate && /^\d{4}-\d{2}-\d{2}/.test(rawDueDate)
            ? rawDueDate.slice(0, 10)
            : date;

          const ref = String(
            row["المرجع / Ref"] ||
            row["المرجع"] ||
            row["Ref"] ||
            row["Reference"] ||
            row["كود المرجع"] ||
            row["رقم الإيصال"] ||
            ""
          ).trim() || `REF-${Math.floor(1000 + Math.random() * 9000)}`;

          const rawAmount =
            row["المبلغ / Amount"] ??
            row["المبلغ (ج.م)"] ??
            row["المبلغ"] ??
            row["Amount"] ??
            row["Amount (EGP)"] ??
            0;
          const amount = Math.max(0, Number(rawAmount) || 0);

          // Status mapping
          const rawStatus = String(
            row["الحالة / Status (paid, pending, has_issue)"] ||
            row["الحالة"] ||
            row["Status"] ||
            "pending"
          ).trim().toLowerCase();

          let status: TodoStatus = "pending";
          if (
            rawStatus === "paid" ||
            rawStatus === "مسدد" ||
            rawStatus === "مدفوع" ||
            rawStatus === "تم السداد" ||
            rawStatus === "تم الدفع"
          ) {
            status = "paid";
          } else if (
            rawStatus === "has_issue" ||
            rawStatus === "يوجد مشكلة" ||
            rawStatus === "مشكلة" ||
            rawStatus === "معلق" ||
            rawStatus === "issue" ||
            rawStatus === "disputed"
          ) {
            status = "has_issue";
          }

          // Repeating monthly mapping
          const rawRepeating = String(
            row["تكرار شهري / Monthly Recurring (نعم/لا)"] ||
            row["يتكرر شهرياً"] ||
            row["تكرار شهري"] ||
            row["Monthly Recurring"] ||
            row["Repeating"] ||
            ""
          ).trim().toLowerCase();

          const repeatingMonthly =
            rawRepeating === "نعم" ||
            rawRepeating === "yes" ||
            rawRepeating === "true" ||
            rawRepeating === "1" ||
            rawRepeating === "مفعل" ||
            row["تكرار شهري / Monthly Recurring (نعم/لا)"] === true;

          const category = String(
            row["التصنيف / Category"] ||
            row["التصنيف"] ||
            row["Category"] ||
            "فواتير ومرافق"
          ).trim();

          const notes = String(
            row["الملاحظات / Notes"] ||
            row["الملاحظات"] ||
            row["Notes"] ||
            row["ملاحظات"] ||
            ""
          ).trim();

          validItems.push({
            date,
            taskName,
            taskNameEn: taskNameEn || undefined,
            ref,
            amount,
            dueDate,
            status,
            repeatingMonthly,
            category: category || undefined,
            notes: notes || undefined,
          });
        }

        if (validItems.length === 0) {
          toast.error(
            pick(
              "لم يتم العثور على أي مهام صالحة، يرجى التأكد من احتواء الملف على عمود (اسم المهمة)",
              "No valid tasks found. Please verify that 'Task Name' column exists."
            )
          );
          return;
        }

        const count = await importTodos(validItems);
        toast.success(
          pick(
            `تم استيراد ${count} مهمة والتزام بنجاح إلى القائمة`,
            `Successfully imported ${count} tasks & commitments from Excel`
          )
        );
      } catch (err: any) {
        console.error("Excel import error:", err);
        toast.error(pick("حدث خطأ أثناء قراءة ملف الإكسيل", "Error parsing Excel file"));
      } finally {
        if (e.target) e.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Helper for due badge
  const getDueBadge = (dueDateStr: string, status: TodoStatus) => {
    if (status === "paid") {
      return (
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          ✔ {pick("مسدد بالكامل", "Fully paid")}
        </span>
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const diffDays = Math.ceil(
      (new Date(dueDateStr).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return (
        <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded-md animate-pulse">
          ⚠ {pick(`متأخر ${Math.abs(diffDays)} يوم`, `Overdue ${Math.abs(diffDays)}d`)}
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
          ⏰ {pick("مستحق اليوم!", "Due Today!")}
        </span>
      );
    } else if (diffDays <= 3) {
      return (
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
          ⏳ {pick(`خلال ${diffDays} أيام`, `In ${diffDays} days`)}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium text-muted-foreground">
        {pick(`متبقي ${diffDays} يوم`, `${diffDays} days left`)}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 select-none" dir={dir}>
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-2xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shadow-xs">
              <CheckSquare className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground tracking-tight">
                {pick("قائمة المهام والالتزامات الشهرية (To-Do)", "Monthly Commitments & To-Do List")}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pick(
                  "متابعة شحن فواتير التليفون والمرافق، الإيجارات، وتذاكر الصيانة الدورية للفروع",
                  "Manage monthly utility bills, landline charges, rent, and operational branch tasks"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Excel Template */}
          <Btn
            type="button"
            variant="outline"
            onClick={handleDownloadTemplate}
            title={pick("تحميل نموذج إكسيل فارغ للاستيراد", "Download Excel Import Template")}
            className="text-xs h-9 gap-1.5 shadow-2xs font-bold text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3.5 text-primary" />
            <span className="hidden md:inline">{pick("نموذج إكسيل", "Template")}</span>
          </Btn>

          {/* Import from Excel */}
          <Btn
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs h-9 gap-1.5 shadow-2xs font-bold text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            title={pick("استيراد مهام والتزامات من ملف Excel", "Import Todo Tasks from Excel")}
          >
            <Upload className="size-3.5 text-emerald-600" />
            <span>{pick("استيراد Excel", "Import Excel")}</span>
          </Btn>
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls"
            onChange={handleImportExcel}
            className="hidden"
          />

          {/* Export to Excel */}
          <Btn
            type="button"
            variant="outline"
            onClick={handleExportExcel}
            className="text-xs h-9 gap-1.5 shadow-2xs font-bold"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span>{pick("تصدير Excel", "Export Excel")}</span>
          </Btn>

          {/* Add New Task */}
          <Btn
            type="button"
            variant="solid"
            onClick={openAddModal}
            className="text-xs h-9 gap-1.5 shadow-xs font-black bg-primary text-primary-foreground hover:opacity-95"
          >
            <Plus className="size-4" />
            <span>{pick("+ إضافة مهمة جديدة", "+ New Task / Bill")}</span>
          </Btn>
        </div>
      </div>

      {/* ── Top KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Commitments */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">
              {pick("إجمالي الالتزامات الشهرية", "Total Commitments")}
            </p>
            <p className="text-xl font-black text-foreground mt-1 font-mono">
              {n(stats.totalAmount)} <span className="text-xs font-sans text-muted-foreground">{pick("ج.م", "EGP")}</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
              {pick(`${stats.totalCount} مهمة مسجلة`, `${stats.totalCount} registered tasks`)}
            </p>
          </div>
          <div className="size-11 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <CreditCard className="size-5" />
          </div>
        </div>

        {/* Paid */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              {pick("تم السداد (Paid)", "Fully Paid")}
            </p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1 font-mono">
              {n(stats.paidAmount)} <span className="text-xs font-sans text-muted-foreground">{pick("ج.م", "EGP")}</span>
            </p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 font-bold">
              {pick(`${stats.paidCount} مهمة مدفوعة`, `${stats.paidCount} paid tasks`)}
              {stats.totalAmount > 0 && ` (${Math.round((stats.paidAmount / stats.totalAmount) * 100)}%)`}
            </p>
          </div>
          <div className="size-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
        </div>

        {/* Pending */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
              {pick("قيد الانتظار (Pending)", "Pending Due")}
            </p>
            <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1 font-mono">
              {n(stats.pendingAmount)} <span className="text-xs font-sans text-muted-foreground">{pick("ج.م", "EGP")}</span>
            </p>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 font-bold">
              {pick(`${stats.pendingCount} بانتظار السداد`, `${stats.pendingCount} awaiting payment`)}
            </p>
          </div>
          <div className="size-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="size-5" />
          </div>
        </div>

        {/* Has Issue */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
              {pick("يوجد مشكلة (Has Issue)", "Disputed / Has Issue")}
            </p>
            <p className="text-xl font-black text-rose-700 dark:text-rose-300 mt-1 font-mono">
              {n(stats.issueAmount)} <span className="text-xs font-sans text-muted-foreground">{pick("ج.م", "EGP")}</span>
            </p>
            <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 font-bold">
              {pick(`${stats.issueCount} مهام بها تعثر أو نزاع`, `${stats.issueCount} disputed items`)}
            </p>
          </div>
          <div className="size-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-5" />
          </div>
        </div>
      </div>

      {/* ── Filter and Search Bar ── */}
      <Panel className="p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={pick("بحث باسم المهمة، المرجع، أو الملاحظات...", "Search task name, ref, or notes...")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0);
              }}
              className="w-full h-9 rounded-xl border border-border/80 bg-background ps-9 pe-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs (Dark Blue Active Styling) */}
          <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
            {[
              { id: "all", ar: "الكل", en: "All", count: stats.totalCount },
              { id: "paid", ar: "مسدد", en: "Paid", count: stats.paidCount },
              { id: "pending", ar: "معلق", en: "Pending", count: stats.pendingCount },
              { id: "has_issue", ar: "به مشكلة", en: "Has Issue", count: stats.issueCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPageIndex(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-[#0f2744] text-white font-black shadow-xs dark:bg-blue-800 dark:text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80 font-bold"
                }`}
              >
                <span>{pick(tab.ar, tab.en)}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    statusFilter === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Recurring Monthly Filter Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setRecurringOnly((prev) => !prev);
              setPageIndex(0);
            }}
            className={cn(
              "h-9 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
              recurringOnly
                ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20"
                : "bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Repeat className={cn("size-3.5", recurringOnly && "animate-spin-slow text-indigo-600")} />
            <span>{pick("🔄 يتكرر شهرياً فقط", "🔄 Monthly Recurring Only")}</span>
          </button>
        </div>

        {/* Second Row: Date range & category filter & reset */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border/50 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Select */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPageIndex(0);
              }}
              className="h-8 px-2.5 text-xs font-medium rounded-lg border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">{pick("📂 جميع التصنيفات", "📂 All Categories")}</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {pick(c.ar, c.en)}
                </option>
              ))}
            </select>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-lg px-2 py-1 shadow-2xs">
              <Calendar className="size-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{pick("استحقاق من:", "Due from:")}</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPageIndex(0);
                }}
                className="bg-transparent text-xs font-mono font-medium focus:outline-none cursor-pointer"
              />
              <span className="text-muted-foreground/40">|</span>
              <span className="text-[11px] text-muted-foreground">{pick("إلى:", "To:")}</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPageIndex(0);
                }}
                className="bg-transparent text-xs font-mono font-medium focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Reset Filters */}
          {(searchQuery || statusFilter !== "all" || recurringOnly || categoryFilter !== "all" || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setRecurringOnly(false);
                setCategoryFilter("all");
                setDateFrom("");
                setDateTo("");
                setPageIndex(0);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>{pick("إعادة ضبط الفلاتر", "Reset Filters")}</span>
            </button>
          )}
        </div>
      </Panel>

      {/* ── Main Data Table ── */}
      <Panel className="p-0 overflow-hidden shadow-sm">
        <DataTable>
          <thead>
            <tr>
              <th className="py-3 px-3 text-start w-28">{pick("التاريخ", "Date")}</th>
              <th className="py-3 px-3 text-start min-w-[240px]">{pick("اسم المهمة والالتزام", "Task Name & Commitment")}</th>
              <th className="py-3 px-3 text-center w-32">{pick("المرجع", "Ref")}</th>
              <th className="py-3 px-3 text-center w-28">{pick("المبلغ", "Amount")}</th>
              <th className="py-3 px-3 text-center w-36">{pick("تاريخ الاستحقاق", "Due Date")}</th>
              <th className="py-3 px-3 text-center w-32">{pick("الحالة", "Status")}</th>
              <th className="py-3 px-3 text-center w-32">{pick("تكرار شهري", "Monthly Recur")}</th>
              <th className="py-3 px-3 text-center w-24">{pick("إجراءات", "Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  <CheckSquare className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-bold text-foreground">
                    {(items?.length || 0) === 0
                      ? pick("لا توجد مهام أو التزامات مسجلة بعد", "No tasks or commitments registered yet")
                      : pick("لا توجد مهام أو التزامات مطابقة للبحث", "No tasks matching current filters")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(items?.length || 0) === 0
                      ? pick("ابدأ بإضافة أول مهمة أو التزام شهري (فواتير، إيجارات، تراخيص...)", "Start by adding your first recurring or one-off task")
                      : pick("يمكنك تعديل الفلاتر أو إعادة ضبط البحث", "Try resetting filters or clear your search")}
                  </p>
                  {(items?.length || 0) === 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={openAddModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>{pick("+ إضافة أول مهمة / التزام", "+ Add First Task / Commitment")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-2xs hover:bg-emerald-500/20 transition-all cursor-pointer"
                      >
                        <Upload className="size-3.5" />
                        <span>{pick("استيراد من إكسيل (Excel)", "Import from Excel")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-bold shadow-2xs hover:bg-secondary transition-all cursor-pointer"
                      >
                        <Download className="size-3.5" />
                        <span>{pick("تحميل قالب فارغ", "Download Template")}</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  {/* Date */}
                  <Td className="font-mono text-xs text-muted-foreground">
                    {item.date}
                  </Td>

                  {/* Task Name */}
                  <Td>
                    <div className="font-extrabold text-foreground text-xs leading-snug">
                      {item.taskName}
                    </div>
                    {item.taskNameEn && (
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {item.taskNameEn}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {item.category && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold">
                          {item.category}
                        </span>
                      )}
                      {item.notes && (
                        <span
                          className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium truncate max-w-xs"
                          title={item.notes}
                        >
                          💬 {item.notes}
                        </span>
                      )}
                    </div>
                  </Td>

                  {/* Ref */}
                  <Td className="text-center font-mono font-black text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-md bg-secondary/80 border border-border/70 select-all">
                      {item.ref || "-"}
                    </span>
                  </Td>

                  {/* Amount */}
                  <Td className="text-center font-mono font-black text-xs text-foreground">
                    <span>{n(item.amount)}</span>
                    <span className="text-[10px] text-muted-foreground font-sans ms-1">{pick("ج.م", "EGP")}</span>
                  </Td>

                  {/* Due Date & Badge */}
                  <Td className="text-center">
                    <div className="font-mono text-xs font-bold text-foreground">
                      {item.dueDate}
                    </div>
                    <div className="mt-0.5">
                      {getDueBadge(item.dueDate, item.status)}
                    </div>
                  </Td>

                  {/* Status Dropdown / Badge */}
                  <Td className="text-center">
                    <select
                      value={item.status}
                      onChange={(e) => setTodoStatus(item.id, e.target.value as TodoStatus)}
                      className={cn(
                        "text-[11px] font-extrabold py-1 px-2 rounded-lg border focus:outline-none cursor-pointer transition-colors shadow-2xs",
                        item.status === "paid" &&
                          "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200",
                        item.status === "pending" &&
                          "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200",
                        item.status === "has_issue" &&
                          "bg-rose-500/15 border-rose-500/40 text-rose-800 dark:text-rose-200"
                      )}
                    >
                      <option value="paid">🟢 {pick("مسدد (Paid)", "Paid")}</option>
                      <option value="pending">🟡 {pick("قيد الانتظار (Pending)", "Pending")}</option>
                      <option value="has_issue">🔴 {pick("يوجد مشكلة (Has Issue)", "Has Issue")}</option>
                    </select>
                  </Td>

                  {/* Repeating Monthly Toggle Switch */}
                  <Td className="text-center">
                    <div className="inline-flex items-center gap-2">
                      <Switch
                        checked={item.repeatingMonthly}
                        onCheckedChange={() => toggleRepeatingMonthly(item.id)}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                      <span className={cn(
                        "text-[10px] font-extrabold",
                        item.repeatingMonthly
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-muted-foreground/60"
                      )}>
                        {item.repeatingMonthly ? pick("يتكرر شهرياً", "Monthly ON") : pick("إيقاف", "OFF")}
                      </span>
                    </div>
                  </Td>

                  {/* Actions */}
                  <Td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title={pick("تعديل", "Edit")}
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(item)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        title={pick("حذف", "Delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>

        {/* Pagination */}
        <TablePagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          totalCount={totalCount}
          onPageChange={setPageIndex}
          onPageSizeChange={setPageSize}
        />
      </Panel>

      {/* ── Add / Edit Task Modal ── */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl">
          <DialogHeader className="p-4 bg-muted/30 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <CheckSquare className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-extrabold text-foreground">
                  {editingItem
                    ? pick("تعديل المهمة / الالتزام", "Edit Task / Commitment")
                    : pick("إضافة مهمة / التزام جديد", "Add New Task / Commitment")}
                </DialogTitle>
                <p className="text-[10px] text-muted-foreground">
                  {pick(
                    "أدخل تفاصيل الفاتورة أو المهمة وموعد استحقاقها وخيار التكرار الشهري",
                    "Enter bill or task details, amount, due date, and recurring status"
                  )}
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs">
            {/* Task Name */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1">
                {pick("اسم المهمة / الالتزام", "Task Name / Commitment")} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={formTaskName}
                onChange={(e) => setFormTaskName(e.target.value)}
                placeholder={pick(
                  "مثال: شحن باقة الأرضي والإنترنت، إيجار فرع، فاتورة كهرباء...",
                  "e.g. Charge of landline bill, branch rent, electricity..."
                )}
                className="w-full h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>

            {/* English Name (optional) & Ref */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  {pick("الاسم بالإنجليزية (اختياري)", "Name in English")}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formTaskNameEn}
                  onChange={(e) => setFormTaskNameEn(e.target.value)}
                  placeholder="Charge of landbill"
                  className="w-full h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  {pick("المرجع / كود الفاتورة (Ref)", "Reference Code")}
                </label>
                <input
                  type="text"
                  value={formRef}
                  onChange={(e) => setFormRef(e.target.value)}
                  placeholder="WE-LAND-1094"
                  className="w-full h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Amount & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  {pick("المبلغ المطلوب (ج.م)", "Amount (EGP)")} <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={formAmount || ""}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    placeholder="1450"
                    className="w-full h-9 rounded-xl border border-border/80 bg-background ps-3 pe-12 text-sm font-mono font-extrabold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                    {pick("ج.م", "EGP")}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  {pick("التصنيف", "Category")}
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border/80 bg-background px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {pick(c.ar, c.en)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates: Registration Date & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  {pick("تاريخ التسجيل (Date)", "Registration Date")}
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  {pick("تاريخ الاستحقاق (Due Date)", "Due Date")} <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Status & Repeating Monthly Card */}
            <div className="p-3 rounded-xl border border-border/70 bg-secondary/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {/* Status Selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                    {pick("حالة السداد (Status)", "Payment Status")}
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TodoStatus)}
                    className="w-full h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="paid">🟢 {pick("مسدد (Paid)", "Paid")}</option>
                    <option value="pending">🟡 {pick("قيد الانتظار (Pending)", "Pending")}</option>
                    <option value="has_issue">🔴 {pick("يوجد مشكلة (Has Issue)", "Has Issue")}</option>
                  </select>
                </div>

                {/* Repeating Monthly Switch */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/60">
                  <div>
                    <p className="text-[11px] font-bold text-foreground">
                      {pick("تكرار شهري (Repeating Monthly)", "Repeating Monthly")}
                    </p>
                    <p className="text-[9.5px] text-muted-foreground">
                      {pick("تجديد الالتزام تلقائياً كل أول شهر", "Auto-recreate every 1st of month")}
                    </p>
                  </div>
                  <Switch
                    checked={formRepeating}
                    onCheckedChange={setFormRepeating}
                    className="data-[state=checked]:bg-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                {pick("ملاحظات / سبب المشكلة (Notes)", "Notes / Reason for Issue")}
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder={pick(
                  "أي تفاصيل تخص السداد أو سبب النزاع والتعثر...",
                  "Payment receipt numbers, dispute reasons, supplier notes..."
                )}
                className="w-full rounded-xl border border-border/80 bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Btn
                type="button"
                variant="outline"
                onClick={() => setIsFormModalOpen(false)}
                className="text-xs h-8"
              >
                {t("cancel")}
              </Btn>
              <Btn
                type="submit"
                variant="solid"
                disabled={loading}
                className="text-xs h-8 px-4 font-bold bg-primary text-primary-foreground"
              >
                {editingItem ? pick("حفظ التعديلات", "Save Changes") : pick("إضافة المهمة", "Add Task")}
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={Boolean(deleteCandidate)}
        onOpenChange={(open) => !open && setDeleteCandidate(null)}
      >
        <DialogContent className="max-w-md rounded-2xl border border-border/80 p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              <span>{pick("تأكيد حذف المهمة", "Confirm Delete Task")}</span>
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground py-2 leading-relaxed">
            {pick(
              "هل أنت متأكد من رغبتك في حذف هذا الالتزام من القائمة؟ لا يمكن التراجع عن هذا الإجراء.",
              "Are you sure you want to delete this commitment from the list? This cannot be undone."
            )}
          </p>

          {deleteCandidate && (
            <div className="p-3 rounded-xl bg-secondary/60 border border-border/70 text-xs font-semibold">
              <div className="font-bold text-foreground">{deleteCandidate.taskName}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {deleteCandidate.ref} • {n(deleteCandidate.amount)} {pick("ج.م", "EGP")} • {deleteCandidate.dueDate}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60 mt-2">
            <Btn
              type="button"
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
              className="text-xs h-8"
            >
              {t("cancel")}
            </Btn>
            <Btn
              type="button"
              variant="solid"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8 font-bold"
              onClick={async () => {
                if (deleteCandidate) {
                  await deleteTodo(deleteCandidate.id);
                  toast.success(pick("تم حذف المهمة بنجاح", "Task deleted successfully"));
                  setDeleteCandidate(null);
                }
              }}
            >
              {pick("نعم، احذف المهمة", "Yes, Delete Task")}
            </Btn>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

