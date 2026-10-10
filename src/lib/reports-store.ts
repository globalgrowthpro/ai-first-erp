import { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import {
  invoices,
  purchaseOrders,
  products,
  partners,
  journal,
  chartOfAccounts,
  type ProductItem,
  type InvoiceRow,
  type JournalEntry,
} from "@/lib/demo-data";
import { DEFAULT_SUPPLEMENTAL_EMPLOYEES as initialEmployees, type EmployeeRecord } from "@/lib/hr-store";
import { BRANCH_NAMES_MAP } from "@/lib/pos-orders-store";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type BiText = { ar: string; en: string };

export type ColumnType = "text" | "number" | "currency" | "date" | "badge";

export interface ReportColumn {
  key: string;
  label: BiText;
  type: ColumnType;
  sortable?: boolean | undefined;
  align?: "left" | "center" | "right" | undefined;
  badgeMap?: Record<string, { label: BiText; color: string }> | undefined;
}

export interface ReportSummaryCard {
  id: string;
  label: BiText;
  value: string | number;
  subtext?: BiText | undefined;
  color?: "brand" | "success" | "warning" | "crimson" | "gold" | "ink" | undefined;
}

export type ReportCategory =
  | "all"
  | "sales"
  | "pos"
  | "purchases"
  | "inventory"
  | "financial"
  | "partners"
  | "hr"
  | "custom";

export type DataSourceKey =
  | "sales"
  | "pos"
  | "purchases"
  | "inventory"
  | "journal"
  | "partners"
  | "employees";

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "between"
  | "is_empty"
  | "is_not_empty";

export type FilterMatchMode = "all" | "any";

export type DateRangePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last_7_days"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export type ReportChartType = "table" | "bar" | "pie" | "kpi";

export type ScheduleFrequency = "on_demand" | "daily" | "weekly" | "monthly";

export interface CustomReportFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
  value2?: string | undefined;
}

export interface CustomReportAggregation {
  field: string;
  func: "sum" | "avg" | "count" | "min" | "max";
  label?: BiText | undefined;
}

export interface CalculatedColumn {
  id: string;
  name: BiText;
  fieldA: string;
  operation: "add" | "subtract" | "multiply" | "divide" | "percentage_of";
  fieldB?: string | undefined;
  constantValue?: number | undefined;
  type: "currency" | "number" | "text";
}

export interface ColumnConfig {
  key: string;
  customLabel?: BiText | undefined;
  align?: "left" | "center" | "right" | undefined;
  showFooterTotal?: boolean | undefined;
}

export interface LiveDataSourceCollections {
  posOrders?: any[] | undefined;
  salesDocuments?: any[] | undefined;
  purchasesDocuments?: any[] | undefined;
  inventoryProducts?: any[] | undefined;
  partners?: any[] | undefined;
  employees?: any[] | undefined;
}

export interface CustomReportDefinition {
  id: string;
  name: BiText;
  description: BiText;
  category: ReportCategory;
  dataSource: DataSourceKey;
  selectedColumns: string[];
  columnConfigs?: Record<string, ColumnConfig> | undefined;
  filters: CustomReportFilter[];
  filterMatchMode?: FilterMatchMode | undefined;
  dateField?: string | undefined;
  dateRangePreset?: DateRangePreset | undefined;
  customStartDate?: string | undefined;
  customEndDate?: string | undefined;
  groupBy?: string | undefined;
  aggregations?: CustomReportAggregation[] | undefined;
  calculatedColumns?: CalculatedColumn[] | undefined;
  chartType?: ReportChartType | undefined;
  tags?: string[] | undefined;
  scheduleFrequency?: ScheduleFrequency | undefined;
  sortBy?: string | undefined;
  sortDirection?: "asc" | "desc" | undefined;
  secondarySortBy?: string | undefined;
  secondarySortDirection?: "asc" | "desc" | undefined;
  createdAt: string;
  updatedAt: string;
  isPreset?: boolean | undefined;
}

export interface StandardReportDefinition {
  id: string;
  name: BiText;
  description: BiText;
  category: ReportCategory;
  dataSource: DataSourceKey;
  icon: string;
  columns: ReportColumn[];
  defaultSort?: { key: string; direction: "asc" | "desc" } | undefined;
}

// ============================================================================
// DATA SOURCES FIELD CATALOG (Used by Custom Report Builder)
// ============================================================================

export interface DataSourceField {
  key: string;
  label: BiText;
  type: ColumnType;
  options?: { value: string; label: BiText }[];
}

export const DATA_SOURCE_CATALOG: Record<
  DataSourceKey,
  {
    name: BiText;
    description: BiText;
    icon: string;
    fields: DataSourceField[];
  }
> = {
  sales: {
    name: { ar: "فواتير المبيعات التجارية", en: "Sales Invoices" },
    description: {
      ar: "سجل فواتير البيع للشركات، الفنادق، وحفلات الخارجية",
      en: "Commercial sales invoices for catering, hotels and corporate clients",
    },
    icon: "Receipt",
    fields: [
      { key: "id", label: { ar: "رقم الفاتورة", en: "Invoice ID" }, type: "text" },
      { key: "party", label: { ar: "العميل / الطرف", en: "Customer / Client" }, type: "text" },
      { key: "date", label: { ar: "تاريخ الفاتورة", en: "Invoice Date" }, type: "date" },
      { key: "amount", label: { ar: "إجمالي الفاتورة", en: "Total Amount" }, type: "currency" },
      { key: "balance", label: { ar: "المبلغ المتبقي", en: "Remaining Balance" }, type: "currency" },
      { key: "paidAmount", label: { ar: "المسدد نقداً", en: "Paid Amount" }, type: "currency" },
      {
        key: "status",
        label: { ar: "حالة السداد", en: "Payment Status" },
        type: "badge",
        options: [
          { value: "paid", label: { ar: "مدفوع بالكامل", en: "Paid" } },
          { value: "partial", label: { ar: "سداد جزئي", en: "Partial" } },
          { value: "overdue", label: { ar: "متأخر عن السداد", en: "Overdue" } },
          { value: "draft", label: { ar: "مسودة", en: "Draft" } },
        ],
      },
    ],
  },
  pos: {
    name: { ar: "مبيعات الكاشير ونقاط البيع (POS)", en: "POS Shift & Orders" },
    description: {
      ar: "مبيعات فروع التجزئة، طلبات الصالة، التيك أواي، وتطبيقات التوصيل",
      en: "Retail POS orders, dine-in, takeaway and online delivery platforms",
    },
    icon: "Store",
    fields: [
      { key: "orderNumber", label: { ar: "رقم الطلب", en: "Order #" }, type: "text" },
      { key: "branch", label: { ar: "الفرع", en: "Branch" }, type: "text" },
      { key: "createdAt", label: { ar: "تاريخ ووقت الطلب", en: "Order Date" }, type: "date" },
      {
        key: "orderType",
        label: { ar: "نوع الطلب", en: "Order Type" },
        type: "badge",
        options: [
          { value: "takeaway", label: { ar: "تيك أواي", en: "Takeaway" } },
          { value: "dine_in", label: { ar: "صالة", en: "Dine-in" } },
          { value: "delivery", label: { ar: "توصيل", en: "Delivery" } },
        ],
      },
      {
        key: "paymentMethod",
        label: { ar: "طريقة الدفع", en: "Payment Method" },
        type: "badge",
        options: [
          { value: "cash", label: { ar: "نقدياً", en: "Cash" } },
          { value: "card", label: { ar: "فيزا / بطاقة", en: "Card" } },
          { value: "instapay", label: { ar: "إنستاباي / محفظة", en: "InstaPay" } },
          { value: "talabat", label: { ar: "طلبات Talabat", en: "Talabat" } },
        ],
      },
      { key: "subtotal", label: { ar: "المجموع الفرعي", en: "Subtotal" }, type: "currency" },
      { key: "vatAmount", label: { ar: "ضريبة القيمة المضافة", en: "VAT (14%)" }, type: "currency" },
      { key: "discountAmount", label: { ar: "الخصم الممنوح", en: "Discount" }, type: "currency" },
      { key: "total", label: { ar: "صافي المدفوع", en: "Total" }, type: "currency" },
      { key: "cashierName", label: { ar: "اسم الكاشير", en: "Cashier" }, type: "text" },
    ],
  },
  purchases: {
    name: { ar: "المشتريات وأوامر التوريد", en: "Purchase Orders" },
    description: {
      ar: "أوامر شراء الخامات (ألبان، نوتيلا، مكسرات، عبوات) ومستحقات الموردين",
      en: "Procurement orders, raw confectionery ingredients and packaging",
    },
    icon: "Truck",
    fields: [
      { key: "id", label: { ar: "رقم أمر الشراء", en: "PO Number" }, type: "text" },
      { key: "party", label: { ar: "المورد التجاري", en: "Supplier" }, type: "text" },
      { key: "date", label: { ar: "تاريخ الطلب", en: "Order Date" }, type: "date" },
      { key: "amount", label: { ar: "قيمة التوريد", en: "Total Amount" }, type: "currency" },
      { key: "balance", label: { ar: "المتبقي للمورد", en: "Remaining Balance" }, type: "currency" },
      { key: "paidAmount", label: { ar: "المسدد للمورد", en: "Paid Amount" }, type: "currency" },
      {
        key: "status",
        label: { ar: "حالة الفاتورة", en: "Status" },
        type: "badge",
        options: [
          { value: "paid", label: { ar: "مدفوع بالكامل", en: "Paid" } },
          { value: "partial", label: { ar: "سداد جزئي", en: "Partial" } },
          { value: "overdue", label: { ar: "مستحق السداد", en: "Overdue" } },
        ],
      },
    ],
  },
  inventory: {
    name: { ar: "مخزون أصناف حلويات الوزير", en: "Inventory & Stock" },
    description: {
      ar: "مخزون المنتجات التامة، مستودعات الفروع، والمطبخ المركزي",
      en: "Finished sweets stock, branch stores and central kitchen levels",
    },
    icon: "Boxes",
    fields: [
      { key: "sku", label: { ar: "كود الصنف SKU", en: "Product SKU" }, type: "text" },
      { key: "name", label: { ar: "اسم الصنف", en: "Product Name" }, type: "text" },
      { key: "category", label: { ar: "التصنيف", en: "Category" }, type: "text" },
      { key: "warehouse", label: { ar: "المستودع / الفرع", en: "Facility" }, type: "text" },
      { key: "qty", label: { ar: "الكمية المتاحة", en: "In Stock Qty" }, type: "number" },
      { key: "min", label: { ar: "حد الطلب الأدنى", en: "Reorder Limit" }, type: "number" },
      { key: "price", label: { ar: "سعر بيع الوحدة", en: "Unit Price" }, type: "currency" },
      { key: "totalValuation", label: { ar: "قيمة المخزون الإجمالية", en: "Stock Valuation" }, type: "currency" },
      {
        key: "stockStatus",
        label: { ar: "حالة المخزون", en: "Stock Status" },
        type: "badge",
        options: [
          { value: "healthy", label: { ar: "مخزون آمن", en: "Healthy" } },
          { value: "low", label: { ar: "منخفض / يقترب من النفاد", en: "Low Stock" } },
          { value: "critical", label: { ar: "حرج / نفد", en: "Out of Stock" } },
        ],
      },
    ],
  },
  journal: {
    name: { ar: "دفتر الأستاذ والقيود المحاسبية", en: "General Ledger & Journal" },
    description: {
      ar: "قيود اليومية العامة، حركات المدين والدائن، وتدقيق العمليات المالية",
      en: "General ledger entries, debits, credits, and operational audit lines",
    },
    icon: "BookOpen",
    fields: [
      { key: "id", label: { ar: "رقم القيد JV", en: "Entry ID" }, type: "text" },
      { key: "date", label: { ar: "التاريخ المحاسبي", en: "Posting Date" }, type: "date" },
      { key: "reference", label: { ar: "المرجع / السند", en: "Reference Doc" }, type: "text" },
      { key: "accountCode", label: { ar: "كود الحساب", en: "Account Code" }, type: "text" },
      { key: "account", label: { ar: "اسم الحساب", en: "Account Title" }, type: "text" },
      { key: "branch", label: { ar: "الفرع / المركز", en: "Cost Center" }, type: "text" },
      { key: "debit", label: { ar: "مدين (ج.م)", en: "Debit (EGP)" }, type: "currency" },
      { key: "credit", label: { ar: "دائن (ج.م)", en: "Credit (EGP)" }, type: "currency" },
      { key: "memo", label: { ar: "البيان / الشرح", en: "Memo / Description" }, type: "text" },
      {
        key: "status",
        label: { ar: "حالة القيد", en: "Posting Status" },
        type: "badge",
        options: [
          { value: "posted", label: { ar: "مرحل ومعتمد", en: "Posted" } },
          { value: "draft", label: { ar: "مسودة", en: "Draft" } },
        ],
      },
    ],
  },
  partners: {
    name: { ar: "سجل العملاء والموردين", en: "Partners & CRM" },
    description: {
      ar: "بيانات جهات التعامل، أرصدة الحسابات، الحدود الائتمانية والديون",
      en: "Commercial clients, suppliers, credit limits, and debt status",
    },
    icon: "Users",
    fields: [
      { key: "code", label: { ar: "كود الشريك", en: "Partner Code" }, type: "text" },
      { key: "name", label: { ar: "الاسم التجاري", en: "Commercial Name" }, type: "text" },
      {
        key: "type",
        label: { ar: "نوع الشريك", en: "Partner Type" },
        type: "badge",
        options: [
          { value: "customer", label: { ar: "عميل", en: "Customer" } },
          { value: "supplier", label: { ar: "مورد", en: "Supplier" } },
        ],
      },
      { key: "phone", label: { ar: "رقم الهاتف", en: "Phone" }, type: "text" },
      { key: "balance", label: { ar: "الرصيد المستحق", en: "Current Balance" }, type: "currency" },
      {
        key: "balanceType",
        label: { ar: "طبيعة الرصيد", en: "Balance Nature" },
        type: "badge",
        options: [
          { value: "receivable", label: { ar: "لنا (مدين)", en: "Receivable" } },
          { value: "payable", label: { ar: "علينا (دائن)", en: "Payable" } },
          { value: "zero", label: { ar: "مسدد بالكامل", en: "Settled" } },
        ],
      },
    ],
  },
  employees: {
    name: { ar: "شؤون الموظفين والرواتب", en: "HR & Payroll" },
    description: {
      ar: "سجل القوى البشرية، مستحقات الأجور، البدلات، وحوافز الأداء",
      en: "Employee directory, base wages, allowances and KPI compensation",
    },
    icon: "Briefcase",
    fields: [
      { key: "code", label: { ar: "الرقم الوظيفي", en: "Emp ID" }, type: "text" },
      { key: "name", label: { ar: "اسم الموظف", en: "Employee Name" }, type: "text" },
      { key: "department", label: { ar: "الإدارة / القسم", en: "Department" }, type: "text" },
      { key: "position", label: { ar: "المسمى الوظيفي", en: "Job Title" }, type: "text" },
      { key: "branch", label: { ar: "الفرع / الموقع", en: "Branch Location" }, type: "text" },
      { key: "basicSalary", label: { ar: "الراتب الأساسي", en: "Basic Salary" }, type: "currency" },
      { key: "allowances", label: { ar: "إجمالي البدلات", en: "Allowances" }, type: "currency" },
      { key: "kpiBonus", label: { ar: "حافز الأداء KPI", en: "KPI Bonus" }, type: "currency" },
      { key: "totalGross", label: { ar: "إجمالي الراتب الشامل", en: "Total Gross" }, type: "currency" },
      {
        key: "employmentType",
        label: { ar: "نوع الدوام", en: "Type" },
        type: "badge",
        options: [
          { value: "full_time", label: { ar: "دوام كامل", en: "Full-Time" } },
          { value: "shift", label: { ar: "ورديات تشغيل", en: "Shift" } },
          { value: "contract", label: { ar: "عقد مؤقت", en: "Contract" } },
        ],
      },
      {
        key: "status",
        label: { ar: "حالة العمل", en: "Status" },
        type: "badge",
        options: [
          { value: "active", label: { ar: "على رأس العمل", en: "Active" } },
          { value: "probation", label: { ar: "فترة اختبار", en: "Probation" } },
          { value: "on_leave", label: { ar: "في إجازة", en: "On Leave" } },
        ],
      },
    ],
  },
};

// ============================================================================
// PRE-BUILT STANDARD REPORTS DEFINITIONS
// ============================================================================

export const STANDARD_REPORTS: StandardReportDefinition[] = [
  {
    id: "sales_summary",
    name: { ar: "تقرير المبيعات والفواتير التجارية", en: "Sales & Invoicing Report" },
    description: {
      ar: "سجل تفصيلي لفواتير التوريد للشركات والفنادق مع توضيح المحصل والمتبقي",
      en: "Comprehensive commercial sales invoices with collection & overdue analysis",
    },
    category: "sales",
    dataSource: "sales",
    icon: "Receipt",
    columns: [
      { key: "id", label: { ar: "رقم الفاتورة", en: "Invoice #" }, type: "text" },
      { key: "party", label: { ar: "العميل / المؤسسة", en: "Customer / Entity" }, type: "text" },
      { key: "date", label: { ar: "تاريخ الإصدار", en: "Date" }, type: "date" },
      { key: "amount", label: { ar: "قيمة الفاتورة", en: "Amount" }, type: "currency" },
      { key: "paidAmount", label: { ar: "المسدد", en: "Paid" }, type: "currency" },
      { key: "balance", label: { ar: "المتبقي للتحصيل", en: "Balance" }, type: "currency" },
      {
        key: "status",
        label: { ar: "حالة التحصيل", en: "Status" },
        type: "badge",
        badgeMap: {
          paid: { label: { ar: "مدفوع بالكامل", en: "Paid" }, color: "success" },
          partial: { label: { ar: "سداد جزئي", en: "Partial" }, color: "gold" },
          overdue: { label: { ar: "متأخر", en: "Overdue" }, color: "crimson" },
          draft: { label: { ar: "مسودة", en: "Draft" }, color: "ink" },
        },
      },
    ],
    defaultSort: { key: "date", direction: "desc" },
  },
  {
    id: "pos_shifts",
    name: { ar: "تقرير مبيعات نقاط البيع والكاشير بالفروع", en: "Branch POS & Shift Performance" },
    description: {
      ar: "أداء فروع حلويات الوزير (الكوربة، المعادي، التجمع، الساحل، الإسكندرية) وتوزيع قنوات السداد",
      en: "Shift sales across retail branches, cash drawers, Visa cards, and delivery aggregators",
    },
    category: "pos",
    dataSource: "pos",
    icon: "Store",
    columns: [
      { key: "orderNumber", label: { ar: "رقم الحركة / الإيصال", en: "Receipt #" }, type: "text" },
      { key: "branch", label: { ar: "الفرع", en: "Branch" }, type: "text" },
      { key: "createdAt", label: { ar: "التاريخ والوقت", en: "Date/Time" }, type: "date" },
      {
        key: "orderType",
        label: { ar: "القناة", en: "Type" },
        type: "badge",
        badgeMap: {
          takeaway: { label: { ar: "تيك أواي", en: "Takeaway" }, color: "brand" },
          dine_in: { label: { ar: "صالة", en: "Dine-in" }, color: "gold" },
          delivery: { label: { ar: "توصيل", en: "Delivery" }, color: "success" },
        },
      },
      {
        key: "paymentMethod",
        label: { ar: "طريقة الدفع", en: "Payment" },
        type: "badge",
        badgeMap: {
          cash: { label: { ar: "كاش", en: "Cash" }, color: "success" },
          card: { label: { ar: "فيزا", en: "Card" }, color: "brand" },
          instapay: { label: { ar: "إنستاباي", en: "InstaPay" }, color: "gold" },
          talabat: { label: { ar: "طلبات", en: "Talabat" }, color: "crimson" },
        },
      },
      { key: "subtotal", label: { ar: "المبلغ", en: "Subtotal" }, type: "currency" },
      { key: "vatAmount", label: { ar: "الضريبة (14%)", en: "VAT" }, type: "currency" },
      { key: "discountAmount", label: { ar: "الخصم", en: "Discount" }, type: "currency" },
      { key: "total", label: { ar: "الصافي الإجمالي", en: "Total" }, type: "currency" },
      { key: "cashierName", label: { ar: "الكاشير", en: "Cashier" }, type: "text" },
    ],
    defaultSort: { key: "createdAt", direction: "desc" },
  },
  {
    id: "purchases_summary",
    name: { ar: "تقرير المشتريات وخامات التصنيع", en: "Procurement & Raw Materials" },
    description: {
      ar: "متابعة أوامر توريد خامات النوتيلا، البستاشيو، الألبان، والمستحقات المعلقة للموردين",
      en: "Factory ingredient purchases, supply orders, paid vs pending vendor commitments",
    },
    category: "purchases",
    dataSource: "purchases",
    icon: "Truck",
    columns: [
      { key: "id", label: { ar: "رقم أمر الشراء", en: "PO #" }, type: "text" },
      { key: "party", label: { ar: "المورد / الشركة", en: "Vendor" }, type: "text" },
      { key: "date", label: { ar: "تاريخ الطلب", en: "Date" }, type: "date" },
      { key: "amount", label: { ar: "إجمالي الفاتورة", en: "Amount" }, type: "currency" },
      { key: "paidAmount", label: { ar: "المسدد للمورد", en: "Paid" }, type: "currency" },
      { key: "balance", label: { ar: "المستحق القائم", en: "Due Balance" }, type: "currency" },
      {
        key: "status",
        label: { ar: "حالة السداد", en: "Status" },
        type: "badge",
        badgeMap: {
          paid: { label: { ar: "مسدد بالكامل", en: "Settled" }, color: "success" },
          partial: { label: { ar: "سداد جزئي", en: "Partial" }, color: "gold" },
          overdue: { label: { ar: "مستحق الدفع", en: "Payable" }, color: "crimson" },
        },
      },
    ],
    defaultSort: { key: "date", direction: "desc" },
  },
  {
    id: "inventory_valuation",
    name: { ar: "تقرير تقييم المخزون ونواقص الفروع", en: "Inventory Valuation & Stock Alert" },
    description: {
      ar: "جرد كميات أصناف الحلويات، القيمة السوقية للبضاعة، وتنبيهات إعادة الطلب التلقائية",
      en: "Total stock valuation across branches, reorder alerts, and safety stock status",
    },
    category: "inventory",
    dataSource: "inventory",
    icon: "Boxes",
    columns: [
      { key: "sku", label: { ar: "كود الصنف", en: "SKU" }, type: "text" },
      { key: "name", label: { ar: "اسم الصنف", en: "Product Name" }, type: "text" },
      { key: "category", label: { ar: "القسم / التشكيلة", en: "Category" }, type: "text" },
      { key: "warehouse", label: { ar: "الفرع / الموقع", en: "Facility" }, type: "text" },
      { key: "qty", label: { ar: "الرصيد المتاح", en: "Stock Qty" }, type: "number" },
      { key: "min", label: { ar: "الحد الأدنى", en: "Safety Min" }, type: "number" },
      { key: "price", label: { ar: "سعر الوحدة", en: "Unit Price" }, type: "currency" },
      { key: "totalValuation", label: { ar: "قيمة المخزون", en: "Valuation" }, type: "currency" },
      {
        key: "stockStatus",
        label: { ar: "حالة المخزون", en: "Status" },
        type: "badge",
        badgeMap: {
          healthy: { label: { ar: "متوفر وآمن", en: "Healthy" }, color: "success" },
          low: { label: { ar: "تحت الحد الأدنى", en: "Low Stock" }, color: "gold" },
          critical: { label: { ar: "حرج / نفد", en: "Critical" }, color: "crimson" },
        },
      },
    ],
    defaultSort: { key: "totalValuation", direction: "desc" },
  },
  {
    id: "financial_ledger",
    name: { ar: "تقرير دفتر اليومية العامة وحركات القيود", en: "General Journal Audit & Ledger" },
    description: {
      ar: "سجل العمليات المالية والقيود المحاسبية المرحلة، حسابات البنوك، وصناديق الفروع",
      en: "Audited journal entries, debit/credit balance, branch cash drops and CIB deposits",
    },
    category: "financial",
    dataSource: "journal",
    icon: "BookOpen",
    columns: [
      { key: "id", label: { ar: "رقم القيد", en: "JV #" }, type: "text" },
      { key: "date", label: { ar: "التاريخ", en: "Date" }, type: "date" },
      { key: "reference", label: { ar: "السند المرجعي", en: "Ref" }, type: "text" },
      { key: "accountCode", label: { ar: "كود الحساب", en: "Code" }, type: "text" },
      { key: "account", label: { ar: "الحساب المالي", en: "Account" }, type: "text" },
      { key: "branch", label: { ar: "مركز التكلفة / الفرع", en: "Cost Center" }, type: "text" },
      { key: "debit", label: { ar: "مدين Debit", en: "Debit" }, type: "currency" },
      { key: "credit", label: { ar: "دائن Credit", en: "Credit" }, type: "currency" },
      { key: "memo", label: { ar: "البيان والوصف", en: "Description" }, type: "text" },
      {
        key: "status",
        label: { ar: "الحالة", en: "Status" },
        type: "badge",
        badgeMap: {
          posted: { label: { ar: "معتمد ومرحل", en: "Posted" }, color: "success" },
          draft: { label: { ar: "مسودة", en: "Draft" }, color: "ink" },
        },
      },
    ],
    defaultSort: { key: "date", direction: "desc" },
  },
  {
    id: "partners_balances",
    name: { ar: "تقرير أرصدة العملاء والموردين وأعمار الديون", en: "Partners Aging & Balance Status" },
    description: {
      ar: "كشف حسابات الفنادق، المطاعم، الموردين، ومراقبة الحدود الائتمانية والتحصيل",
      en: "Customer receivables and supplier payables with current balances & contact details",
    },
    category: "partners",
    dataSource: "partners",
    icon: "Users",
    columns: [
      { key: "code", label: { ar: "كود الشريك", en: "Partner Code" }, type: "text" },
      { key: "name", label: { ar: "الاسم التجاري", en: "Name" }, type: "text" },
      {
        key: "type",
        label: { ar: "الصفة", en: "Type" },
        type: "badge",
        badgeMap: {
          customer: { label: { ar: "عميل", en: "Customer" }, color: "brand" },
          supplier: { label: { ar: "مورد", en: "Supplier" }, color: "gold" },
        },
      },
      { key: "phone", label: { ar: "الهاتف", en: "Phone" }, type: "text" },
      { key: "balance", label: { ar: "الرصيد (ج.م)", en: "Balance" }, type: "currency" },
      {
        key: "balanceType",
        label: { ar: "طبيعة الرصيد", en: "Status" },
        type: "badge",
        badgeMap: {
          receivable: { label: { ar: "مستحق لنا (مدين)", en: "Receivable" }, color: "brand" },
          payable: { label: { ar: "مستحق علينا (دائن)", en: "Payable" }, color: "crimson" },
          zero: { label: { ar: "مسدد 0.00", en: "Settled" }, color: "success" },
        },
      },
    ],
    defaultSort: { key: "balance", direction: "desc" },
  },
  {
    id: "payroll_summary",
    name: { ar: "تقرير تكلفة الرواتب والقوى البشرية", en: "HR Headcount & Compensation" },
    description: {
      ar: "تفصيل الأجور الأساسية، بدلات السكن والانتقال، حوافز الأداء، وإجمالي تكلفة الرواتب",
      en: "Staff distribution across departments, basic wages, allowances, and monthly payroll burden",
    },
    category: "hr",
    dataSource: "employees",
    icon: "Briefcase",
    columns: [
      { key: "code", label: { ar: "الرقم الوظيفي", en: "ID" }, type: "text" },
      { key: "name", label: { ar: "اسم الموظف", en: "Employee Name" }, type: "text" },
      { key: "department", label: { ar: "الإدارة / القسم", en: "Department" }, type: "text" },
      { key: "position", label: { ar: "المسمى الوظيفي", en: "Job Title" }, type: "text" },
      { key: "branch", label: { ar: "الفرع", en: "Branch" }, type: "text" },
      { key: "basicSalary", label: { ar: "الراتب الأساسي", en: "Basic" }, type: "currency" },
      { key: "allowances", label: { ar: "البدلات", en: "Allowances" }, type: "currency" },
      { key: "kpiBonus", label: { ar: "حافز الأداء", en: "KPI Bonus" }, type: "currency" },
      { key: "totalGross", label: { ar: "الراتب الشامل", en: "Total Gross" }, type: "currency" },
      {
        key: "status",
        label: { ar: "حالة العمل", en: "Status" },
        type: "badge",
        badgeMap: {
          active: { label: { ar: "نشط", en: "Active" }, color: "success" },
          probation: { label: { ar: "اختبار", en: "Probation" }, color: "gold" },
          on_leave: { label: { ar: "إجازة", en: "On Leave" }, color: "ink" },
        },
      },
    ],
    defaultSort: { key: "totalGross", direction: "desc" },
  },
];

// ============================================================================
// DEFAULT PRESET CUSTOM REPORTS (Demonstrates logic engine to user)
// ============================================================================

export const DEFAULT_CUSTOM_REPORTS: CustomReportDefinition[] = [
  {
    id: "preset-uncollected-sales",
    name: {
      ar: "الفواتير الكبرى غير المحصلة (> 15,000 ج.م)",
      en: "High-Value Uncollected Invoices (> 15k)",
    },
    description: {
      ar: "فواتير العملاء الكبرى ذات الأرصدة المعلقة لسرعة التحصيل والتدقيق",
      en: "Large customer invoices with remaining balances exceeding 15,000 EGP",
    },
    category: "sales",
    dataSource: "sales",
    selectedColumns: ["id", "party", "date", "amount", "paidAmount", "balance", "status"],
    filters: [
      {
        id: "f-1",
        field: "balance",
        operator: "greater_than",
        value: "0",
      },
      {
        id: "f-2",
        field: "amount",
        operator: "greater_than",
        value: "15000",
      },
    ],
    filterMatchMode: "all",
    chartType: "table",
    tags: ["مبيعات", "تحصيل", "أرصدة"],
    scheduleFrequency: "weekly",
    sortBy: "balance",
    sortDirection: "desc",
    createdAt: "2026-10-01",
    updatedAt: "2026-10-01",
    isPreset: true,
  },
  {
    id: "preset-branch-pos-analytics",
    name: {
      ar: "تحليل مبيعات نقاط البيع حسب الفروع (تجميع ومخطط بياني)",
      en: "Branch POS Sales Analysis (Grouped & Chart)",
    },
    description: {
      ar: "تجميع مبيعات الكاشير حسب فروع حلويات الوزير وإجمالي مبيعات كل فرع مع رسم بياني",
      en: "Consolidated POS shift sales grouped by branch facility with visual bar breakdown",
    },
    category: "pos",
    dataSource: "pos",
    selectedColumns: ["branch", "total", "vatAmount", "discountAmount"],
    filters: [],
    filterMatchMode: "all",
    groupBy: "branch",
    chartType: "bar",
    tags: ["فروع", "كاشير", "تحليلي", "POS"],
    scheduleFrequency: "daily",
    sortBy: "total",
    sortDirection: "desc",
    createdAt: "2026-10-01",
    updatedAt: "2026-10-01",
    isPreset: true,
  },
  {
    id: "preset-stock-category-valuation",
    name: {
      ar: "توزيع تقييم المخزون المالي حسب تصنيف المنتجات (دائري)",
      en: "Stock Valuation by Category (Donut Breakdown)",
    },
    description: {
      ar: "تجميع القيمة الإجمالية للمخزون لكل قسم من أقسام الحلويات الغربية والشرقية",
      en: "Total inventory capital valuation aggregated by sweets product category",
    },
    category: "inventory",
    dataSource: "inventory",
    selectedColumns: ["category", "qty", "totalValuation"],
    filters: [],
    filterMatchMode: "all",
    groupBy: "category",
    chartType: "pie",
    tags: ["مخزون", "تصنيفات", "مالية"],
    scheduleFrequency: "weekly",
    sortBy: "totalValuation",
    sortDirection: "desc",
    createdAt: "2026-10-01",
    updatedAt: "2026-10-01",
    isPreset: true,
  },
  {
    id: "preset-sales-profit-margin",
    name: {
      ar: "فواتير المبيعات مع هامش الربح ونسبة التحصيل المحسوبة",
      en: "Sales with Calculated Margin & Collection %",
    },
    description: {
      ar: "تقرير مبيعات مزود بأعمدة حسابية مخصصة لهامش الربح التقديري ونسبة المسدد",
      en: "Sales report with dynamic formula columns for estimated profit and collection ratio",
    },
    category: "sales",
    dataSource: "sales",
    selectedColumns: ["id", "party", "amount", "paidAmount", "balance", "status"],
    calculatedColumns: [
      {
        id: "calc_margin",
        name: { ar: "هامش الربح التقديري (25%)", en: "Est. Margin (25%)" },
        fieldA: "amount",
        operation: "multiply",
        constantValue: 0.25,
        type: "currency",
      },
      {
        id: "calc_ratio",
        name: { ar: "نسبة التحصيل %", en: "Collection Ratio %" },
        fieldA: "paidAmount",
        fieldB: "amount",
        operation: "percentage_of",
        type: "number",
      },
    ],
    filters: [],
    chartType: "kpi",
    tags: ["أرباح", "حسابات مخصصة", "مبيعات"],
    scheduleFrequency: "monthly",
    sortBy: "amount",
    sortDirection: "desc",
    createdAt: "2026-10-01",
    updatedAt: "2026-10-01",
    isPreset: true,
  },
  {
    id: "preset-critical-stock",
    name: {
      ar: "نواقص أصناف الحلويات الحرجة (تحت حد الأمان)",
      en: "Critical Low Stock Sweets Alert",
    },
    description: {
      ar: "أصناف حلويات الوزير التي تتطلب أمر تشغيل فوري بالمطبخ المركزي",
      en: "Products where available inventory is near or below the safety reorder limit",
    },
    category: "inventory",
    dataSource: "inventory",
    selectedColumns: ["sku", "name", "category", "warehouse", "qty", "min", "price", "stockStatus"],
    filters: [
      {
        id: "f-stock-1",
        field: "qty",
        operator: "less_than",
        value: "50",
      },
    ],
    filterMatchMode: "all",
    chartType: "table",
    tags: ["مخزون", "نواقص", "تشغيل"],
    scheduleFrequency: "daily",
    sortBy: "qty",
    sortDirection: "asc",
    createdAt: "2026-10-01",
    updatedAt: "2026-10-01",
    isPreset: true,
  },
  {
    id: "preset-supplier-debts",
    name: {
      ar: "مستحقات موردي الخامات المؤجلة",
      en: "Outstanding Vendor Payables",
    },
    description: {
      ar: "أوامر التوريد وخامات التصنيع التي لها مبالغ مستحقة لم تسدد بالكامل",
      en: "Procurement orders with unpaid balances owed to ingredient suppliers",
    },
    category: "purchases",
    dataSource: "purchases",
    selectedColumns: ["id", "party", "date", "amount", "paidAmount", "balance", "status"],
    filters: [
      {
        id: "f-po-1",
        field: "balance",
        operator: "greater_than",
        value: "0",
      },
    ],
    filterMatchMode: "all",
    chartType: "table",
    tags: ["مشتريات", "موردون", "ديون"],
    scheduleFrequency: "weekly",
    sortBy: "balance",
    sortDirection: "desc",
    createdAt: "2026-10-01",
    updatedAt: "2026-10-01",
    isPreset: true,
  },
];

// ============================================================================
// DATA EXTRACTOR & FORMATTING ENGINE (Supports Realtime Live DB & Storage Data)
// ============================================================================

export function formatDateTimeString(raw: any): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  } catch {}
  return String(raw).slice(0, 16);
}

export function getStoredLocalPosOrders(): any[] {
  return [];
}

export function getDataSourceRawData(
  key: DataSourceKey,
  lang: "ar" | "en" = "ar",
  liveCollections?: LiveDataSourceCollections,
): Record<string, any>[] {
  const pick = (val: any) => {
    if (!val) return "";
    if (typeof val === "object" && ("ar" in val || "en" in val)) {
      return lang === "ar" ? val.ar : val.en;
    }
    return String(val);
  };

  switch (key) {
    case "sales": {
      const docs =
        liveCollections?.salesDocuments && liveCollections.salesDocuments.length > 0
          ? liveCollections.salesDocuments
          : invoices;

      return docs.map((inv: any) => {
        const amt = Number(inv.amount) || 0;
        const bal = Number(inv.balance) || 0;
        const paid = Math.max(0, amt - bal);
        return {
          id: inv.id || inv.code,
          party: pick(inv.party) || inv.notes || (lang === "ar" ? "عميل تجاري" : "Client"),
          date: String(inv.date || "").slice(0, 10),
          amount: amt,
          balance: bal,
          paidAmount: paid,
          status: inv.status || "paid",
          rawParty: inv.party,
        };
      });
    }

    case "pos": {
      // 1. Prefer live real orders from Supabase store
      const ordersToUse =
        liveCollections?.posOrders && liveCollections.posOrders.length > 0
          ? liveCollections.posOrders
          : getStoredLocalPosOrders();

      if (ordersToUse && ordersToUse.length > 0) {
        return ordersToUse.map((ord: any) => {
          let pm = ord.paymentMethod || ord.payment_method || "cash";
          if (pm === "wallet") pm = "instapay";
          if (ord.orderPlatform === "talabat" || ord.order_platform === "talabat") pm = "talabat";

          let ot = ord.orderType || ord.order_type || "takeaway";
          if (pm === "talabat") ot = "delivery";

          const sub = Number(ord.subtotal) || 0;
          const vat = Number(ord.vatAmount ?? ord.tax_amount ?? ord.vat ?? 0);
          const disc = Number(ord.discountAmount ?? ord.discount_amount ?? ord.discount ?? 0);
          const tot = Number(ord.total) || sub + vat - disc;

          let branchStr = "";
          if (ord.branchName) branchStr = pick(ord.branchName);
          else if (ord.branch_name) branchStr = pick(ord.branch_name);
          else if (ord.branchId && (BRANCH_NAMES_MAP as any)[ord.branchId])
            branchStr = pick((BRANCH_NAMES_MAP as any)[ord.branchId]);
          else if (ord.branch_id && (BRANCH_NAMES_MAP as any)[ord.branch_id])
            branchStr = pick((BRANCH_NAMES_MAP as any)[ord.branch_id]);
          else if (ord.branch) branchStr = pick(ord.branch);
          if (!branchStr) branchStr = lang === "ar" ? "الفرع الرئيسي" : "Main Branch";

          return {
            orderNumber: ord.orderNumber || ord.order_number || ord.id || "POS-ORD",
            branch: branchStr,
            createdAt: formatDateTimeString(ord.createdAt || ord.created_at || ord.formattedDate),
            orderType: ot,
            paymentMethod: pm,
            subtotal: sub,
            vatAmount: vat,
            discountAmount: disc,
            total: tot,
            cashierName: ord.cashierName || ord.cashier_name || (lang === "ar" ? "كاشير مناوب" : "Duty Cashier"),
            status: ord.status || "completed",
            customerName: ord.customerName || ord.customer_name,
          };
        });
      }

      // Fallback demo set if store has not loaded yet
      const branches = [
        { code: "korba", name: { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis" } },
        { code: "maadi", name: { ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St." } },
        { code: "tagamoa", name: { ar: "فرع التجمع — التسعين", en: "New Cairo — 90th St." } },
        { code: "kitchen", name: { ar: "المطبخ المركزي — طلبات", en: "Central Kitchen Hub" } },
        { code: "alex", name: { ar: "فرع الإسكندرية — سموحة", en: "Alexandria — Smouha" } },
      ];

      const cashiers = [
        { ar: "محمود رضا", en: "Mahmoud Reda" },
        { ar: "إبراهيم حسن", en: "Ibrahim Hassan" },
        { ar: "كريم يوسف", en: "Karim Youssef" },
        { ar: "طارق سليم", en: "Tarek Selim" },
      ];

      const methods = ["cash", "card", "instapay", "talabat"] as const;
      const types = ["takeaway", "dine_in", "delivery"] as const;

      const generated: Record<string, any>[] = [];
      const baseDate = "2026-10-0";

      for (let i = 1; i <= 24; i++) {
        const br = branches[i % branches.length]!;
        const csh = cashiers[i % cashiers.length]!;
        const pm = methods[i % methods.length]!;
        const ot = pm === "talabat" ? "delivery" : types[i % types.length]!;
        const sub = 120 + ((i * 85) % 850);
        const vat = Math.round(sub * 0.14);
        const disc = i % 5 === 0 ? 30 : 0;
        const tot = sub + vat - disc;
        const day = 1 + (i % 8);

        generated.push({
          orderNumber: `POS-${br.code.toUpperCase()}-${1000 + i}`,
          branch: pick(br.name),
          createdAt: `${baseDate}${day} 1${i % 10}:30`,
          orderType: ot,
          paymentMethod: pm,
          subtotal: sub,
          vatAmount: vat,
          discountAmount: disc,
          total: tot,
          cashierName: pick(csh),
          status: "completed",
        });
      }

      return generated;
    }

    case "purchases": {
      const pos =
        liveCollections?.purchasesDocuments && liveCollections.purchasesDocuments.length > 0
          ? liveCollections.purchasesDocuments
          : purchaseOrders;

      return pos.map((po: any) => {
        const amt = Number(po.amount) || 0;
        const bal = Number(po.balance) || 0;
        const paid = Math.max(0, amt - bal);
        return {
          id: po.id || po.code,
          party: pick(po.party) || po.notes || (lang === "ar" ? "مورد معتمد" : "Vendor"),
          date: String(po.date || "").slice(0, 10),
          amount: amt,
          balance: bal,
          paidAmount: paid,
          status: po.status || "completed",
          rawParty: po.party,
        };
      });
    }

    case "inventory": {
      const prods =
        liveCollections?.inventoryProducts && liveCollections.inventoryProducts.length > 0
          ? liveCollections.inventoryProducts
          : products;

      return prods.map((p: any) => {
        const qty = Number(p.qty) || 0;
        const min = Number(p.min ?? p.minStock ?? 10);
        const price = Number(p.price ?? p.sellingPrice ?? p.sale_price ?? 0);
        const val = qty * price;
        let status = "healthy";
        if (qty <= 0) status = "critical";
        else if (qty <= min) status = "low";

        let catName = "";
        if (p.category) catName = pick(p.category);
        else if (p.category_name) catName = pick(p.category_name);
        else if (p.categoryId) catName = p.categoryId;
        if (!catName) catName = lang === "ar" ? "حلويات شرقية فاخرة" : "Oriental Sweets";

        let whName = "";
        if (p.warehouse) whName = pick(p.warehouse);
        else if (p.warehouse_name) whName = pick(p.warehouse_name);
        else if (p.warehouseId) whName = p.warehouseId;
        if (!whName) whName = lang === "ar" ? "المستودع والمطبخ الرئيسي" : "Central Facility";

        return {
          sku: p.sku || "SKU-001",
          name: pick(p.name) || (lang === "ar" ? "صنف حلوى" : "Item"),
          category: catName,
          warehouse: whName,
          qty: qty,
          min: min,
          price: price,
          totalValuation: val,
          stockStatus: status,
        };
      });
    }

    case "journal": {
      return journal.map((j) => ({
        id: j.id,
        date: j.date,
        reference: j.reference || "JV-REF",
        accountCode: j.accountCode || "1110",
        account: pick(j.account),
        branch: pick(j.branchName || { ar: "الإدارة العامة", en: "Headquarters" }),
        debit: j.debit,
        credit: j.credit,
        memo: pick(j.memo || { ar: "قيد محاسبي معتمد", en: "Journal entry" }),
        status: j.status || "posted",
      }));
    }

    case "partners": {
      const pts =
        liveCollections?.partners && liveCollections.partners.length > 0 ? liveCollections.partners : partners;

      return pts.map((pt: any) => {
        const bal = Number(pt.balance) || 0;
        let bType = "zero";
        if (bal > 0) {
          bType = pt.type === "customer" ? "receivable" : "payable";
        }
        return {
          code: pt.code || pt.id || "PT-01",
          name: pick(pt.name) || (lang === "ar" ? "شريك تجاري" : "Partner"),
          type: pt.type || "customer",
          phone: pt.phone || "—",
          balance: bal,
          balanceType: bType,
        };
      });
    }

    case "employees": {
      const emps =
        liveCollections?.employees && liveCollections.employees.length > 0
          ? liveCollections.employees
          : initialEmployees;

      return emps.map((e: any) => {
        const basic = Number(e.compensation?.basicSalary ?? e.basicSalary ?? 6000);
        const housing = Number(e.compensation?.housingAllowance ?? 0);
        const transport = Number(e.compensation?.transportAllowance ?? 0);
        const food = Number(e.compensation?.foodAllowance ?? 0);
        const allowances = housing + transport + food;
        const kpi = Number(e.compensation?.kpiBonus ?? 0);
        const gross = basic + allowances + kpi;

        return {
          code: e.code || "EMP-01",
          name: pick(e.name) || (lang === "ar" ? "موظف" : "Employee"),
          department: pick(e.departmentName || e.department) || (lang === "ar" ? "التشغيل" : "Operations"),
          position: pick(e.positionName || e.position) || (lang === "ar" ? "عضو فريق" : "Staff"),
          branch: pick(e.branchName || e.branch) || (lang === "ar" ? "الفرع الرئيسي" : "Main Branch"),
          basicSalary: basic,
          allowances: allowances,
          kpiBonus: kpi,
          totalGross: gross,
          employmentType: e.employmentType || "full_time",
          status: e.status || "active",
        };
      });
    }

    default:
      return [];
  }
}

// ============================================================================
// REPORT EXECUTION ENGINE (Runs standard & custom report filters)
// ============================================================================

// ============================================================================
// DATE RANGE CALCULATION UTILITY
// ============================================================================

export function computeDateRange(
  preset?: DateRangePreset,
  customStart?: string,
  customEnd?: string,
): { start?: string | undefined; end?: string | undefined; label: BiText } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (!preset || preset === "all") {
    return { label: { ar: "كل الفترات", en: "All Time" } };
  }

  switch (preset) {
    case "today": {
      const todayStr = fmt(now);
      return { start: todayStr, end: todayStr, label: { ar: "اليوم", en: "Today" } };
    }
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = fmt(y);
      return { start: yStr, end: yStr, label: { ar: "أمس", en: "Yesterday" } };
    }
    case "last_7_days": {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      return {
        start: fmt(past),
        end: fmt(now),
        label: { ar: "آخر 7 أيام", en: "Last 7 Days" },
      };
    }
    case "this_month": {
      const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      const end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-31`;
      return { start, end, label: { ar: "الشهر الحالي", en: "This Month" } };
    }
    case "last_month": {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: fmt(lm),
        end: fmt(lmEnd),
        label: { ar: "الشهر السابق", en: "Last Month" },
      };
    }
    case "this_quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const qStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const qEnd = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
      return {
        start: fmt(qStart),
        end: fmt(qEnd),
        label: { ar: "الربع الحالي", en: "This Quarter" },
      };
    }
    case "this_year": {
      return {
        start: `${now.getFullYear()}-01-01`,
        end: `${now.getFullYear()}-12-31`,
        label: { ar: "السنة الحالية", en: "This Year" },
      };
    }
    case "custom": {
      return {
        start: customStart,
        end: customEnd,
        label: {
          ar: `مخصص: ${customStart || "..."} إلى ${customEnd || "..."}`,
          en: `Custom: ${customStart || "..."} - ${customEnd || "..."}`,
        },
      };
    }
  }
}

// ============================================================================
// REPORT EXECUTION ENGINE (Runs standard & custom report filters)
// ============================================================================

export interface ExecuteReportQueryOptions {
  dataSource: DataSourceKey;
  selectedColumns?: string[] | undefined;
  filters?: CustomReportFilter[] | undefined;
  filterMatchMode?: FilterMatchMode | undefined;
  dateField?: string | undefined;
  dateRangePreset?: DateRangePreset | undefined;
  customStartDate?: string | undefined;
  customEndDate?: string | undefined;
  groupBy?: string | undefined;
  aggregations?: CustomReportAggregation[] | undefined;
  calculatedColumns?: CalculatedColumn[] | undefined;
  columnConfigs?: Record<string, ColumnConfig> | undefined;
  sortBy?: string | undefined;
  sortDirection?: "asc" | "desc" | undefined;
  secondarySortBy?: string | undefined;
  secondarySortDirection?: "asc" | "desc" | undefined;
  lang?: "ar" | "en" | undefined;
  liveData?: LiveDataSourceCollections | undefined;
}

export interface ExecuteReportQueryResult {
  rows: Record<string, any>[];
  totalCount: number;
  summaryCards: ReportSummaryCard[];
  groupedData?: { key: string; label: string; count: number; metrics: Record<string, number> }[] | undefined;
  columns?: ReportColumn[] | undefined;
  footerTotals?: Record<string, number> | undefined;
}

export function executeReportQuery({
  dataSource,
  selectedColumns,
  filters = [],
  filterMatchMode = "all",
  dateField,
  dateRangePreset,
  customStartDate,
  customEndDate,
  groupBy,
  aggregations,
  calculatedColumns = [],
  columnConfigs,
  sortBy,
  sortDirection = "desc",
  secondarySortBy,
  secondarySortDirection = "desc",
  lang = "ar",
  liveData,
}: ExecuteReportQueryOptions): ExecuteReportQueryResult {
  let raw = getDataSourceRawData(dataSource, lang, liveData);

  // 1. Compute dynamic calculated columns for each row first
  if (calculatedColumns && calculatedColumns.length > 0) {
    raw = raw.map((row) => {
      const updated = { ...row };
      for (const calc of calculatedColumns) {
        const valA = Number(updated[calc.fieldA]) || 0;
        const valB = calc.fieldB ? (Number(updated[calc.fieldB]) || 0) : (calc.constantValue ?? 0);
        let res = 0;
        switch (calc.operation) {
          case "add":
            res = valA + valB;
            break;
          case "subtract":
            res = valA - valB;
            break;
          case "multiply":
            res = valA * valB;
            break;
          case "divide":
            res = valB !== 0 ? Math.round((valA / valB) * 100) / 100 : 0;
            break;
          case "percentage_of":
            res = valB !== 0 ? Math.round((valA / valB) * 1000) / 10 : 0;
            break;
        }
        updated[calc.id] = res;
      }
      return updated;
    });
  }

  // 2. Apply Date Range Filtering if specified
  if (dateField && dateRangePreset && dateRangePreset !== "all") {
    const { start, end } = computeDateRange(dateRangePreset, customStartDate, customEndDate);
    if (start || end) {
      raw = raw.filter((row) => {
        const rowDateVal = String(row[dateField] ?? "").slice(0, 10);
        if (!rowDateVal) return true;
        if (start && rowDateVal < start) return false;
        if (end && rowDateVal > end) return false;
        return true;
      });
    }
  }

  // 3. Apply Filter Rules with match mode (ALL vs ANY)
  if (filters && filters.length > 0) {
    const activeFilters = filters.filter((f) => {
      if (!f.field) return false;
      if (f.operator === "is_empty" || f.operator === "is_not_empty") return true;
      return f.value !== undefined && f.value !== "";
    });

    if (activeFilters.length > 0) {
      const testRowAgainstFilter = (row: Record<string, any>, f: CustomReportFilter) => {
        const val = row[f.field];
        const strVal = String(val ?? "").toLowerCase();
        const target = String(f.value ?? "").toLowerCase();

        switch (f.operator) {
          case "equals":
            return strVal === target;
          case "not_equals":
            return strVal !== target;
          case "contains":
            return strVal.includes(target);
          case "starts_with":
            return strVal.startsWith(target);
          case "ends_with":
            return strVal.endsWith(target);
          case "greater_than": {
            const numVal = Number(val);
            const numTarget = Number(f.value);
            return !isNaN(numVal) && !isNaN(numTarget) && numVal > numTarget;
          }
          case "less_than": {
            const numVal = Number(val);
            const numTarget = Number(f.value);
            return !isNaN(numVal) && !isNaN(numTarget) && numVal < numTarget;
          }
          case "between": {
            const numVal = Number(val);
            const low = Number(f.value);
            const high = Number(f.value2 ?? f.value);
            return !isNaN(numVal) && numVal >= low && numVal <= high;
          }
          case "is_empty":
            return val === null || val === undefined || String(val).trim() === "";
          case "is_not_empty":
            return val !== null && val !== undefined && String(val).trim() !== "";
          default:
            return true;
        }
      };

      raw = raw.filter((row) => {
        if (filterMatchMode === "any") {
          return activeFilters.some((f) => testRowAgainstFilter(row, f));
        } else {
          return activeFilters.every((f) => testRowAgainstFilter(row, f));
        }
      });
    }
  }

  // 4. Primary and Secondary Sorting Helper
  const compareVals = (valA: any, valB: any, dir: "asc" | "desc") => {
    if (typeof valA === "number" && typeof valB === "number") {
      return dir === "asc" ? valA - valB : valB - valA;
    }
    const strA = String(valA ?? "");
    const strB = String(valB ?? "");
    return dir === "asc"
      ? strA.localeCompare(strB, "ar")
      : strB.localeCompare(strA, "ar");
  };

  if (sortBy || secondarySortBy) {
    raw.sort((a, b) => {
      if (sortBy) {
        const res = compareVals(a[sortBy], b[sortBy], sortDirection);
        if (res !== 0) return res;
      }
      if (secondarySortBy) {
        return compareVals(a[secondarySortBy], b[secondarySortBy], secondarySortDirection);
      }
      return 0;
    });
  }

  // 5. Group By & Aggregations (Pivot Summary)
  let groupedData: { key: string; label: string; count: number; metrics: Record<string, number> }[] | undefined;
  let finalRows = raw;

  if (groupBy) {
    const groups = new Map<string, Record<string, any>[]>();
    for (const r of raw) {
      const gKey = String(r[groupBy] ?? (lang === "ar" ? "غير محدد" : "Unspecified"));
      if (!groups.has(gKey)) groups.set(gKey, []);
      groups.get(gKey)!.push(r);
    }

    const aggregatedGroupRows: Record<string, any>[] = [];
    groupedData = [];

    // Fields to aggregate: either configured aggregations, or selected numeric fields
    const availableFields = DATA_SOURCE_CATALOG[dataSource].fields;
    const numericKeys = (selectedColumns || availableFields.map((f) => f.key)).filter((k) => {
      const f = availableFields.find((x) => x.key === k);
      return f?.type === "currency" || f?.type === "number";
    });

    groups.forEach((groupItems, groupName) => {
      const groupRow: Record<string, any> = {
        [groupBy]: groupName,
        _recordCount: groupItems.length,
      };
      const metrics: Record<string, number> = {};

      if (aggregations && aggregations.length > 0) {
        for (const agg of aggregations) {
          const colKey = agg.field;
          const vals = groupItems.map((item) => Number(item[colKey]) || 0);
          let aggVal = 0;
          if (agg.func === "sum") {
            aggVal = vals.reduce((a, b) => a + b, 0);
          } else if (agg.func === "avg") {
            aggVal = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
          } else if (agg.func === "count") {
            aggVal = vals.length;
          } else if (agg.func === "min") {
            aggVal = vals.length > 0 ? Math.min(...vals) : 0;
          } else if (agg.func === "max") {
            aggVal = vals.length > 0 ? Math.max(...vals) : 0;
          }
          const metricKey = `${agg.func}_${colKey}`;
          groupRow[colKey] = aggVal;
          groupRow[metricKey] = aggVal;
          metrics[colKey] = aggVal;
        }
      } else {
        // Default sum of numeric keys
        for (const nk of numericKeys) {
          const sum = groupItems.reduce((acc, item) => acc + (Number(item[nk]) || 0), 0);
          groupRow[nk] = sum;
          metrics[nk] = sum;
        }
      }

      aggregatedGroupRows.push(groupRow);
      groupedData?.push({
        key: groupName,
        label: groupName,
        count: groupItems.length,
        metrics,
      });
    });

    // If grouped, final rows become the aggregated groups!
    finalRows = aggregatedGroupRows;
  }

  // 6. Compute Domain Summary KPIs
  const summaryCards: ReportSummaryCard[] = [];

  switch (dataSource) {
    case "sales": {
      const totalRev = raw.reduce((acc, r) => acc + (Number(r["amount"]) || 0), 0);
      const totalBal = raw.reduce((acc, r) => acc + (Number(r["balance"]) || 0), 0);
      const totalPaid = raw.reduce((acc, r) => acc + (Number(r["paidAmount"]) || 0), 0);
      const avg = raw.length > 0 ? Math.round(totalRev / raw.length) : 0;

      summaryCards.push(
        {
          id: "total_revenue",
          label: { ar: "إجمالي قيمة الفواتير", en: "Total Sales Amount" },
          value: totalRev,
          subtext: { ar: `${raw.length} فاتورة مسجلة`, en: `${raw.length} invoices` },
          color: "brand",
        },
        {
          id: "total_paid",
          label: { ar: "المبالغ المحصلة", en: "Collected Cash" },
          value: totalPaid,
          subtext: {
            ar: `${Math.round((totalPaid / (totalRev || 1)) * 100)}% نسبة التحصيل`,
            en: "Collection rate",
          },
          color: "success",
        },
        {
          id: "total_balance",
          label: { ar: "المتبقي غير المحصل", en: "Uncollected Balance" },
          value: totalBal,
          subtext: { ar: "مستحقات آجلة", en: "Receivable" },
          color: totalBal > 0 ? "crimson" : "ink",
        },
        {
          id: "avg_invoice",
          label: { ar: "متوسط الفاتورة", en: "Average Invoice" },
          value: avg,
          subtext: { ar: "معدل الطلب", en: "Per order" },
          color: "gold",
        },
      );
      break;
    }

    case "pos": {
      const total = raw.reduce((acc, r) => acc + (Number(r["total"]) || 0), 0);
      const vat = raw.reduce((acc, r) => acc + (Number(r["vatAmount"]) || 0), 0);
      const discount = raw.reduce((acc, r) => acc + (Number(r["discountAmount"]) || 0), 0);
      const cashOrders = raw.filter((r) => r["paymentMethod"] === "cash").length;

      summaryCards.push(
        {
          id: "pos_total",
          label: { ar: "صافي مبيعات الكاشير", en: "Total POS Revenue" },
          value: total,
          subtext: { ar: `${raw.length} عملية بيع`, en: `${raw.length} shifts orders` },
          color: "brand",
        },
        {
          id: "pos_vat",
          label: { ar: "ضريبة القيمة المضافة 14%", en: "VAT (14%)" },
          value: vat,
          subtext: { ar: "مستحقة للضرائب", en: "Tax liability" },
          color: "gold",
        },
        {
          id: "pos_discount",
          label: { ar: "إجمالي الخصومات", en: "Discounts Given" },
          value: discount,
          subtext: { ar: "عروض ترويجية", en: "Promotions" },
          color: "crimson",
        },
        {
          id: "cash_ratio",
          label: { ar: "طلبات النقدية (كاش)", en: "Cash Orders" },
          value: `${cashOrders} / ${raw.length}`,
          subtext: { ar: "أدراج الكاشير", en: "Drawer settlement" },
          color: "success",
        },
      );
      break;
    }

    case "purchases": {
      const total = raw.reduce((acc, r) => acc + (Number(r["amount"]) || 0), 0);
      const balance = raw.reduce((acc, r) => acc + (Number(r["balance"]) || 0), 0);
      const paid = raw.reduce((acc, r) => acc + (Number(r["paidAmount"]) || 0), 0);

      summaryCards.push(
        {
          id: "po_total",
          label: { ar: "إجمالي قيمة المشتريات", en: "Total Purchases" },
          value: total,
          subtext: { ar: `${raw.length} أمر توريد`, en: `${raw.length} orders` },
          color: "brand",
        },
        {
          id: "po_paid",
          label: { ar: "المسدد للموردين", en: "Paid to Vendors" },
          value: paid,
          subtext: { ar: "دفعات نقدية وبنكية", en: "Cash & bank transfers" },
          color: "success",
        },
        {
          id: "po_balance",
          label: { ar: "المستحق القائم للموردين", en: "Accounts Payable" },
          value: balance,
          subtext: { ar: "آجل مستحق", en: "Due commitments" },
          color: balance > 0 ? "crimson" : "ink",
        },
      );
      break;
    }

    case "inventory": {
      const val = raw.reduce((acc, r) => acc + (Number(r["totalValuation"]) || 0), 0);
      const totalUnits = raw.reduce((acc, r) => acc + (Number(r["qty"]) || 0), 0);
      const lowStockCount = raw.filter((r) => r["stockStatus"] === "low" || r["stockStatus"] === "critical").length;

      summaryCards.push(
        {
          id: "stock_val",
          label: { ar: "إجمالي تقييم المخزون", en: "Stock Valuation" },
          value: val,
          subtext: { ar: "بسعر البيع الحالي", en: "At current list price" },
          color: "brand",
        },
        {
          id: "total_units",
          label: { ar: "إجمالي القطع الجاهزة", en: "Total Finished Sweets" },
          value: totalUnits,
          subtext: { ar: `${raw.length} صنف مسجل`, en: `${raw.length} active SKUs` },
          color: "success",
        },
        {
          id: "low_stock",
          label: { ar: "أصناف قاربت على النفاد", en: "Low Stock Items" },
          value: lowStockCount,
          subtext: { ar: "تحت الحد الأدنى", en: "Below reorder limit" },
          color: lowStockCount > 0 ? "crimson" : "ink",
        },
      );
      break;
    }

    case "journal": {
      const totalDebit = raw.reduce((acc, r) => acc + (Number(r["debit"]) || 0), 0);
      const totalCredit = raw.reduce((acc, r) => acc + (Number(r["credit"]) || 0), 0);

      summaryCards.push(
        {
          id: "gl_debit",
          label: { ar: "إجمالي الحركات المدينة", en: "Total Debits" },
          value: totalDebit,
          subtext: { ar: `${raw.length} سطر قيد`, en: `${raw.length} journal lines` },
          color: "brand",
        },
        {
          id: "gl_credit",
          label: { ar: "إجمالي الحركات الدائنة", en: "Total Credits" },
          value: totalCredit,
          subtext: { ar: "الجانب الدائن", en: "Credit side" },
          color: "success",
        },
        {
          id: "gl_balance",
          label: { ar: "فارق التوازن", en: "Balance Difference" },
          value: Math.abs(totalDebit - totalCredit),
          subtext: {
            ar: Math.abs(totalDebit - totalCredit) === 0 ? "القيود متوازنة تماماً" : "توجد فروق",
            en: "Balance check",
          },
          color: Math.abs(totalDebit - totalCredit) === 0 ? "success" : "crimson",
        },
      );
      break;
    }

    case "partners": {
      const cust = raw.filter((r) => r["type"] === "customer");
      const supp = raw.filter((r) => r["type"] === "supplier");
      const receivables = cust.reduce((acc, r) => acc + (Number(r["balance"]) || 0), 0);
      const payables = supp.reduce((acc, r) => acc + (Number(r["balance"]) || 0), 0);

      summaryCards.push(
        {
          id: "partner_receivables",
          label: { ar: "مستحقات على العملاء", en: "Trade Receivables" },
          value: receivables,
          subtext: { ar: `${cust.length} عميل تجاري`, en: `${cust.length} customers` },
          color: "brand",
        },
        {
          id: "partner_payables",
          label: { ar: "مستحقات للموردين", en: "Trade Payables" },
          value: payables,
          subtext: { ar: `${supp.length} مورد معتمد`, en: `${supp.length} suppliers` },
          color: payables > 0 ? "crimson" : "ink",
        },
        {
          id: "partner_net",
          label: { ar: "صافي مركز السيولة", en: "Net Exposure" },
          value: receivables - payables,
          subtext: { ar: "فارق الذمم المدينة والدائنة", en: "Receivables minus payables" },
          color: receivables >= payables ? "success" : "warning",
        },
      );
      break;
    }

    case "employees": {
      const gross = raw.reduce((acc, r) => acc + (Number(r["totalGross"]) || 0), 0);
      const basic = raw.reduce((acc, r) => acc + (Number(r["basicSalary"]) || 0), 0);
      const kpis = raw.reduce((acc, r) => acc + (Number(r["kpiBonus"]) || 0), 0);

      summaryCards.push(
        {
          id: "hr_gross",
          label: { ar: "إجمالي فاتورة الرواتب الشهرية", en: "Monthly Payroll Burden" },
          value: gross,
          subtext: { ar: `${raw.length} موظف`, en: `${raw.length} staff` },
          color: "brand",
        },
        {
          id: "hr_basic",
          label: { ar: "الأجور الأساسية", en: "Base Salaries" },
          value: basic,
          subtext: { ar: "الراتب الأساسي", en: "Basic wages" },
          color: "ink",
        },
        {
          id: "hr_kpis",
          label: { ar: "حوافز الأداء والإنتاج", en: "KPI Bonuses" },
          value: kpis,
          subtext: { ar: "مرتبط بالنتائج", en: "Performance-linked" },
          color: "gold",
        },
      );
      break;
    }
  }

  // 7. Calculate Footer Totals for numeric columns
  const footerTotals: Record<string, number> = {};
  if (finalRows.length > 0) {
    const sampleRow = finalRows[0]!;
    for (const k of Object.keys(sampleRow)) {
      if (typeof sampleRow[k] === "number" && !k.startsWith("_")) {
        const sumVal = finalRows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
        footerTotals[k] = sumVal;
      }
    }
  }

  return {
    rows: finalRows,
    totalCount: finalRows.length,
    summaryCards,
    groupedData,
    footerTotals,
  };
}

// ============================================================================
// EXCEL EXPORT ENGINE (.xlsx)
// ============================================================================

export function exportReportToExcel({
  reportTitle,
  columns,
  rows,
  summaryCards = [],
  lang = "ar",
  filename,
}: {
  reportTitle: BiText;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  summaryCards?: ReportSummaryCard[];
  lang?: "ar" | "en";
  filename?: string;
}): boolean {
  try {
    const workbook = XLSX.utils.book_new();

    // 1. Prepare Main Data Rows with localized Header Titles
    const exportData = rows.map((row) => {
      const formattedRow: Record<string, any> = {};
      columns.forEach((col) => {
        const headerName = lang === "ar" ? col.label.ar : col.label.en;
        let cellVal = row[col.key];

        // Format cell values for spreadsheet presentation
        if (col.type === "currency") {
          cellVal = typeof cellVal === "number" ? cellVal : Number(cellVal) || 0;
        } else if (col.type === "badge" && col.badgeMap && cellVal && col.badgeMap[cellVal]) {
          const badgeInfo = col.badgeMap[cellVal];
          if (badgeInfo) {
            cellVal = lang === "ar" ? badgeInfo.label.ar : badgeInfo.label.en;
          }
        }

        formattedRow[headerName] = cellVal ?? "";
      });
      return formattedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // 2. Set auto column widths
    const colWidths = columns.map((col) => {
      const headerLength = (lang === "ar" ? col.label.ar : col.label.en).length;
      return { wch: Math.max(headerLength * 2, 16) };
    });
    worksheet["!cols"] = colWidths;

    // 3. Add to workbook
    const safeSheetName = (lang === "ar" ? reportTitle.ar : reportTitle.en)
      .slice(0, 30)
      .replace(/[\/\\?*[\]]/g, "_");
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName || "Report");

    // 4. If summary KPIs exist, add a dedicated Summary Sheet
    if (summaryCards.length > 0) {
      const summaryRows = summaryCards.map((c) => ({
        [lang === "ar" ? "المؤشر المالي" : "Metric"]: lang === "ar" ? c.label.ar : c.label.en,
        [lang === "ar" ? "القيمة" : "Value"]: c.value,
        [lang === "ar" ? "ملاحظات وتفاصيل" : "Notes"]: c.subtext ? (lang === "ar" ? c.subtext.ar : c.subtext.en) : "",
      }));
      const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
      summaryWs["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, summaryWs, lang === "ar" ? "ملخص_المؤشرات" : "KPI_Summary");
    }

    // 5. Trigger safe download
    const dateStamp = new Date().toISOString().slice(0, 10);
    const downloadName =
      filename ||
      `${(lang === "ar" ? reportTitle.ar : reportTitle.en).replace(/\s+/g, "_")}_${dateStamp}.xlsx`;

    return safeDownloadWorkbook(workbook, downloadName);
  } catch (err) {
    console.error("[Reports Store] Excel Export failed:", err);
    return false;
  }
}

// ============================================================================
// CSV EXPORT ENGINE (.csv with UTF-8 BOM)
// ============================================================================

export function exportReportToCsv({
  reportTitle,
  columns,
  rows,
  lang = "ar",
  filename,
}: {
  reportTitle: BiText;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  lang?: "ar" | "en";
  filename?: string;
}): boolean {
  try {
    const headers = columns.map((c) => `"${(lang === "ar" ? c.label.ar : c.label.en).replace(/"/g, '""')}"`);
    const csvRows = rows.map((r) => {
      return columns
        .map((c) => {
          let val = r[c.key];
          if (c.type === "badge" && c.badgeMap && val && c.badgeMap[val]) {
            const badgeInfo = c.badgeMap[val];
            if (badgeInfo) {
              val = lang === "ar" ? badgeInfo.label.ar : badgeInfo.label.en;
            }
          }
          if (val === null || val === undefined) val = "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.download =
      filename ||
      `${(lang === "ar" ? reportTitle.ar : reportTitle.en).replace(/\s+/g, "_")}_${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("[Reports Store] CSV export error:", err);
    return false;
  }
}

// ============================================================================
// REACT HOOK: useReportsStore
// ============================================================================

export function useReportsStore() {
  const [customReports, setCustomReports] = useState<CustomReportDefinition[]>(DEFAULT_CUSTOM_REPORTS);

  // Sync in-memory state
  const persistCustomReports = useCallback((reports: CustomReportDefinition[]) => {
    setCustomReports(reports);
  }, []);

  const saveCustomReport = useCallback(
    (reportDef: Omit<CustomReportDefinition, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
      const now = new Date().toISOString().slice(0, 10);

      if (reportDef.id) {
        // Edit existing
        const updated = customReports.map((r) =>
          r.id === reportDef.id
            ? {
                ...r,
                ...reportDef,
                updatedAt: now,
              }
            : r,
        );
        persistCustomReports(updated);
        return reportDef.id;
      } else {
        // Create new
        const newId = `custom-rep-${Date.now().toString(36)}`;
        const newReport: CustomReportDefinition = {
          ...reportDef,
          id: newId,
          createdAt: now,
          updatedAt: now,
        };
        persistCustomReports([newReport, ...customReports]);
        return newId;
      }
    },
    [customReports, persistCustomReports],
  );

  const deleteCustomReport = useCallback(
    (id: string) => {
      const filtered = customReports.filter((r) => r.id !== id);
      persistCustomReports(filtered);
    },
    [customReports, persistCustomReports],
  );

  const duplicateCustomReport = useCallback(
    (id: string) => {
      const source = customReports.find((r) => r.id === id);
      if (!source) return null;

      const newId = `custom-rep-${Date.now().toString(36)}`;
      const now = new Date().toISOString().slice(0, 10);
      const cloned: CustomReportDefinition = {
        ...source,
        id: newId,
        name: {
          ar: `${source.name.ar} (نسخة مكررة)`,
          en: `${source.name.en} (Copy)`,
        },
        isPreset: false,
        createdAt: now,
        updatedAt: now,
      };

      persistCustomReports([cloned, ...customReports]);
      return newId;
    },
    [customReports, persistCustomReports],
  );

  return {
    customReports,
    standardReports: STANDARD_REPORTS,
    saveCustomReport,
    deleteCustomReport,
    duplicateCustomReport,
  };
}
