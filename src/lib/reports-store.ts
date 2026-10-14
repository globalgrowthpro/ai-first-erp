import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  | "employees"
  | "sales_by_branch"
  | "sales_by_product"
  | "sales_by_hour"
  | "sales_forecast"
  | "sales_consumption"
  | "sales_payment_methods"
  | "sales_channels"
  | "sales_cogs";

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
          { value: "active", label: { ar: "نشط", en: "Active" } },
          { value: "probation", label: { ar: "فترة اختبار", en: "Probation" } },
          { value: "on_leave", label: { ar: "في إجازة", en: "On Leave" } },
        ],
      },
    ],
  },
  sales_by_branch: {
    name: { ar: "مبيعات الفروع (يوم - شهر - عام حتى تاريخه)", en: "Branch Sales (Day / Month / YTD)" },
    description: {
      ar: "مقارنة مبيعات الفروع، فواتير اليوم، الشهر الحالي، وتراكمي العام حتى تاريخه YTD",
      en: "Branch sales breakdown across daily, monthly MTD and Year-To-Date YTD intervals",
    },
    icon: "Store",
    fields: [
      { key: "branch", label: { ar: "اسم الفرع", en: "Branch Name" }, type: "text" },
      { key: "city", label: { ar: "المنطقة / المحافظة", en: "Region / City" }, type: "text" },
      { key: "dailySales", label: { ar: "مبيعات اليوم", en: "Today Sales" }, type: "currency" },
      { key: "dailyOrders", label: { ar: "فواتير اليوم", en: "Today Orders" }, type: "number" },
      { key: "monthlySales", label: { ar: "مبيعات الشهر الحالي (MTD)", en: "MTD Sales" }, type: "currency" },
      { key: "monthlyOrders", label: { ar: "فواتير الشهر", en: "MTD Orders" }, type: "number" },
      { key: "ytdSales", label: { ar: "مبيعات العام حتى تاريخه (YTD)", en: "YTD Sales" }, type: "currency" },
      { key: "avgTicket", label: { ar: "متوسط الفاتورة", en: "Avg Ticket" }, type: "currency" },
      { key: "sharePercent", label: { ar: "نسبة المساهمة %", en: "Share %" }, type: "number" },
      {
        key: "status",
        label: { ar: "تحقيق المستهدف", en: "Target Status" },
        type: "badge",
        options: [
          { value: "achieved", label: { ar: "حقق المستهدف 100%+", en: "Achieved" } },
          { value: "on_track", label: { ar: "ضمن الخطة", en: "On Track" } },
          { value: "below_target", label: { ar: "يحتاج تنشيط", en: "Below Target" } },
        ],
      },
    ],
  },
  sales_by_product: {
    name: { ar: "مبيعات الأصناف (جروب - صنف)", en: "Product Sales (Group & Item)" },
    description: {
      ar: "تفصيل مبيعات أصناف الحلويات حسب المجموعات (عشاق الرز، الفتة، القشطوطة، دنيا الدلع، شرقي)",
      en: "Product level sales volume, unit pricing and category group contribution",
    },
    icon: "Boxes",
    fields: [
      { key: "sku", label: { ar: "كود الصنف SKU", en: "Product Code" }, type: "text" },
      { key: "name", label: { ar: "اسم الصنف", en: "Item Name" }, type: "text" },
      { key: "group", label: { ar: "المجموعة / التصنيف", en: "Category Group" }, type: "text" },
      { key: "qtySold", label: { ar: "الكمية المباعة", en: "Units Sold" }, type: "number" },
      { key: "unitPrice", label: { ar: "سعر بيع الوحدة", en: "Unit Price" }, type: "currency" },
      { key: "totalRevenue", label: { ar: "إجمالي المبيعات", en: "Total Revenue" }, type: "currency" },
      { key: "ordersCount", label: { ar: "عدد الطلبات", en: "Orders Count" }, type: "number" },
      { key: "salesShare", label: { ar: "نسبة المبيعات %", en: "Sales Share %" }, type: "number" },
      { key: "stockOnHand", label: { ar: "الرصيد المتاح", en: "Stock on Hand" }, type: "number" },
    ],
  },
  sales_by_hour: {
    name: { ar: "مبيعات بالساعة ومعدلات الذروة", en: "Hourly Sales & Peak Analysis" },
    description: {
      ar: "توزيع مبيعات اليوم والورديات على مدار ساعات العمل وتحديد ساعات الذروة القصوى",
      en: "Hourly transaction volume, revenue distribution and peak hour indicators",
    },
    icon: "Clock",
    fields: [
      { key: "hourSlot", label: { ar: "الفترة الزمنية / الساعة", en: "Hour Slot" }, type: "text" },
      { key: "period", label: { ar: "الفترة التشغيلية", en: "Operating Period" }, type: "text" },
      { key: "ordersCount", label: { ar: "عدد الطلبات / الفواتير", en: "Orders Volume" }, type: "number" },
      { key: "totalSales", label: { ar: "إجمالي المبيعات", en: "Hourly Revenue" }, type: "currency" },
      { key: "avgTicket", label: { ar: "متوسط الفاتورة", en: "Avg Ticket Size" }, type: "currency" },
      {
        key: "peakStatus",
        label: { ar: "مستوى الذروة", en: "Peak Status" },
        type: "badge",
        options: [
          { value: "extreme_peak", label: { ar: "ذروة كبرى قصوى", en: "Extreme Peak" } },
          { value: "peak", label: { ar: "ساعة ذروة نشطة", en: "Peak Hour" } },
          { value: "moderate", label: { ar: "نشاط متوسط", en: "Moderate" } },
          { value: "normal", label: { ar: "هدوء تشغيلي", en: "Normal" } },
        ],
      },
      { key: "salesShare", label: { ar: "الحصة من اليوم %", en: "Daily Share %" }, type: "number" },
    ],
  },
  sales_forecast: {
    name: { ar: "توقعات المبيعات والذكاء التنبؤي", en: "Sales Forecasting & AI Projections" },
    description: {
      ar: "توقعات حجم المبيعات للفترات القادمة بناءً على الاتجاهات والمواسم وحجم الطلب",
      en: "Predictive revenue projections, seasonal trend analysis and AI confidence limits",
    },
    icon: "TrendingUp",
    fields: [
      { key: "period", label: { ar: "الفترة المتوقعة", en: "Forecast Horizon" }, type: "text" },
      { key: "targetDate", label: { ar: "تاريخ الاستحقاق", en: "Target Date" }, type: "date" },
      { key: "baselineSales", label: { ar: "الأساس التاريخي السابق", en: "Baseline Sales" }, type: "currency" },
      { key: "trendGrowth", label: { ar: "معدل النمو المتوقع %", en: "Projected Growth %" }, type: "number" },
      { key: "projectedSales", label: { ar: "المبيعات المتوقعة", en: "Projected Revenue" }, type: "currency" },
      { key: "minConfidence", label: { ar: "الحد الأدنى (متحفظ)", en: "Lower Bound" }, type: "currency" },
      { key: "maxConfidence", label: { ar: "الحد الأقصى (متفائل)", en: "Upper Bound" }, type: "currency" },
      { key: "confidenceScore", label: { ar: "دقة النموذج %", en: "Confidence %" }, type: "number" },
      { key: "seasonalityDriver", label: { ar: "عامل التأثير / المناسبة", en: "Key Driver" }, type: "text" },
      { key: "recommendedPrep", label: { ar: "التوصية التشغيلية للمطبخ", en: "Kitchen Prep Recommendation" }, type: "text" },
    ],
  },
  sales_consumption: {
    name: { ar: "الاستهلاكات والأصناف الأكثر والأقل مبيعاً", en: "Consumption & Movement Velocity" },
    description: {
      ar: "معدلات استهلاك أصناف الحلويات وترتيب المنتجات الأكثر طلباً والأقل حركة لدعم قرارات الإنتاج",
      en: "Consumption volume, inventory velocity ranking, top performers vs slow-moving stock",
    },
    icon: "Flame",
    fields: [
      { key: "sku", label: { ar: "كود الصنف", en: "SKU" }, type: "text" },
      { key: "name", label: { ar: "اسم الصنف", en: "Product" }, type: "text" },
      { key: "category", label: { ar: "القسم", en: "Category" }, type: "text" },
      { key: "consumedQty", label: { ar: "الكمية المستهلكة (المباعة)", en: "Consumed Qty" }, type: "number" },
      { key: "stockAvailable", label: { ar: "الرصيد المتبقي", en: "Stock Balance" }, type: "number" },
      {
        key: "velocity",
        label: { ar: "سرعة الدوران", en: "Velocity" },
        type: "badge",
        options: [
          { value: "ultra_fast", label: { ar: "فائق السرعة", en: "Ultra Fast" } },
          { value: "fast", label: { ar: "سريع الدوران", en: "Fast Mover" } },
          { value: "moderate", label: { ar: "متوسط الحركة", en: "Moderate" } },
          { value: "slow", label: { ar: "بطيء الحركة", en: "Slow Mover" } },
          { value: "stagnant", label: { ar: "راكد / خامل", en: "Stagnant" } },
        ],
      },
      { key: "totalRevenue", label: { ar: "قيمة المبيعات المحققة", en: "Revenue Realized" }, type: "currency" },
      { key: "ranking", label: { ar: "الترتيب", en: "Rank #" }, type: "number" },
      {
        key: "classification",
        label: { ar: "التصنيف البيعي", en: "Classification" },
        type: "badge",
        options: [
          { value: "best_seller", label: { ar: "الأكثر مبيعاً ⭐", en: "Best Seller" } },
          { value: "high_demand", label: { ar: "طلب مرتفع", en: "High Demand" } },
          { value: "moderate", label: { ar: "طلب مستقر", en: "Standard" } },
          { value: "slow_mover", label: { ar: "الأقل مبيعاً", en: "Slow Mover" } },
          { value: "dead_stock", label: { ar: "شبه راكد", en: "Dead Stock" } },
        ],
      },
      { key: "action", label: { ar: "الإجراء المقترح", en: "Action Required" }, type: "text" },
    ],
  },
  sales_payment_methods: {
    name: { ar: "تحليل طرق وقنوات الدفع", en: "Payment Methods Analysis" },
    description: {
      ar: "توزيع متحصلات المبيعات بين النقدية، بطاقات الفيزا، إنستاباي، فوري، وقسائم التخفيض",
      en: "Payment channel breakdown across cash drawers, credit cards, InstaPay, Fawry, and vouchers",
    },
    icon: "CreditCard",
    fields: [
      { key: "methodKey", label: { ar: "رمز الوسيلة", en: "Method Key" }, type: "text" },
      { key: "methodName", label: { ar: "طريقة الدفع", en: "Payment Method" }, type: "text" },
      {
        key: "type",
        label: { ar: "نوع الوسيلة", en: "Type" },
        type: "badge",
        options: [
          { value: "cash", label: { ar: "نقدي (كاش)", en: "Cash" } },
          { value: "electronic", label: { ar: "إلكتروني / بطاقات", en: "Electronic / Card" } },
          { value: "voucher", label: { ar: "قسائم وكوبونات", en: "Voucher" } },
          { value: "credit", label: { ar: "آجل / تقسيط", en: "Credit / BNPL" } },
        ],
      },
      { key: "ordersCount", label: { ar: "عدد العمليات", en: "Tx Count" }, type: "number" },
      { key: "totalAmount", label: { ar: "إجمالي المحصل", en: "Total Collections" }, type: "currency" },
      { key: "avgTicket", label: { ar: "متوسط العملية", en: "Avg Tx Size" }, type: "currency" },
      { key: "sharePercent", label: { ar: "نسبة التحصيل %", en: "Share %" }, type: "number" },
      { key: "feePercent", label: { ar: "رسوم البوابة %", en: "Gateway Fee %" }, type: "number" },
      { key: "netCollected", label: { ar: "الصافي بعد الرسوم", en: "Net Settled" }, type: "currency" },
      { key: "settlementTarget", label: { ar: "حساب التسوية", en: "Settlement Account" }, type: "text" },
    ],
  },
  sales_channels: {
    name: { ar: "تحليل مصادر وقنوات البيع المختلفة", en: "Sales Channels & Platforms" },
    description: {
      ar: "مقارنة مبيعات صالة المعارض، التيك أواي، أسطول التوصيل المباشر، وتطبيقات التوصيل الخارجية",
      en: "Multi-channel sales performance: Dine-in, Takeaway, Own Delivery Fleet, and Partner Apps",
    },
    icon: "Share2",
    fields: [
      { key: "channelCode", label: { ar: "كود القناة", en: "Channel Code" }, type: "text" },
      { key: "channelName", label: { ar: "قناة / مصدر البيع", en: "Channel Name" }, type: "text" },
      {
        key: "channelType",
        label: { ar: "طبيعة القناة", en: "Channel Type" },
        type: "badge",
        options: [
          { value: "direct_branch", label: { ar: "معرض الفرع المباشر", en: "Direct Store" } },
          { value: "own_fleet", label: { ar: "توصيل أسطول الوزير", en: "Own Fleet" } },
          { value: "food_app", label: { ar: "تطبيق توصيل شريك", en: "Aggregator App" } },
          { value: "b2b", label: { ar: "عقود توريد شركات", en: "Corporate B2B" } },
        ],
      },
      { key: "ordersCount", label: { ar: "عدد الطلبات", en: "Orders Volume" }, type: "number" },
      { key: "grossSales", label: { ar: "إجمالي المبيعات", en: "Gross Sales" }, type: "currency" },
      { key: "commissions", label: { ar: "العمولات والخصم", en: "Commissions & Promo" }, type: "currency" },
      { key: "netSales", label: { ar: "صافي الإيراد", en: "Net Revenue" }, type: "currency" },
      { key: "avgTicket", label: { ar: "متوسط الفاتورة", en: "Avg Order Value" }, type: "currency" },
      { key: "sharePercent", label: { ar: "نسبة المساهمة %", en: "Channel Share %" }, type: "number" },
      { key: "growthRate", label: { ar: "معدل النمو %", en: "Growth %" }, type: "number" },
    ],
  },
  sales_cogs: {
    name: { ar: "تكلفة المبيعات وهامش الربح الإجمالي (COGS)", en: "Cost of Goods Sold (COGS) & Profit" },
    description: {
      ar: "تكلفة خامات التصنيع المباشرة، إجمالي الربح الهامشي، ونسب التغطية والتسعير لكل صنف",
      en: "Direct ingredient and production cost of goods sold, gross profit margins and markup percentages",
    },
    icon: "DollarSign",
    fields: [
      { key: "sku", label: { ar: "كود الصنف", en: "SKU" }, type: "text" },
      { key: "itemName", label: { ar: "اسم الصنف / الحلوى", en: "Product Name" }, type: "text" },
      { key: "category", label: { ar: "القسم / المجموعة", en: "Category" }, type: "text" },
      { key: "unitsSold", label: { ar: "الكمية المباعة", en: "Units Sold" }, type: "number" },
      { key: "sellingPrice", label: { ar: "سعر البيع", en: "Selling Price" }, type: "currency" },
      { key: "salesRevenue", label: { ar: "إيرادات المبيعات", en: "Sales Revenue" }, type: "currency" },
      { key: "unitCost", label: { ar: "تكلفة الوحدة (COGS)", en: "Unit Cost" }, type: "currency" },
      { key: "totalCogs", label: { ar: "إجمالي تكلفة المبيعات", en: "Total COGS" }, type: "currency" },
      { key: "grossProfit", label: { ar: "مجمل الربح الهامشي", en: "Gross Profit" }, type: "currency" },
      { key: "grossMarginPercent", label: { ar: "هامش الربح %", en: "Gross Margin %" }, type: "number" },
      { key: "markupPercent", label: { ar: "نسبة التغطية Markup %", en: "Markup %" }, type: "number" },
      {
        key: "profitabilityRating",
        label: { ar: "تصنيف الربحية", en: "Profitability" },
        type: "badge",
        options: [
          { value: "exceptional", label: { ar: "ربحية استثنائية (70%+)", en: "Exceptional" } },
          { value: "high", label: { ar: "ربحية مرتفعة (55-70%)", en: "High" } },
          { value: "healthy", label: { ar: "ربحية جيدة (40-55%)", en: "Healthy" } },
          { value: "tight", label: { ar: "هامش محدود (< 40%)", en: "Tight" } },
        ],
      },
    ],
  },
};

// ============================================================================
// PRE-BUILT STANDARD REPORTS DEFINITIONS
// ============================================================================

export const STANDARD_REPORTS: StandardReportDefinition[] = [
  // 1. تقرير مبيعات الفروع (يوم - شهر - عام حتى تاريخه)
  {
    id: "branch_sales_ytd",
    name: { ar: "تقرير مبيعات الفروع (يوم - شهر - عام حتى تاريخه)", en: "Branch Sales (Day / Month / YTD)" },
    description: {
      ar: "متابعة دقيقة لمبيعات فروع حلويات الوزير (الكوربة، المعادي، التجمع، الساحل، الإسكندرية) عبر اليوم والشهر وتراكمي العام",
      en: "Multi-period branch sales performance tracking: Today, MTD, and Year-To-Date (YTD) comparisons",
    },
    category: "sales",
    dataSource: "sales_by_branch",
    icon: "Store",
    columns: [
      { key: "branch", label: { ar: "الفرع", en: "Branch" }, type: "text" },
      { key: "city", label: { ar: "المدينة", en: "City" }, type: "text" },
      { key: "dailySales", label: { ar: "مبيعات اليوم", en: "Today Sales" }, type: "currency" },
      { key: "dailyOrders", label: { ar: "فواتير اليوم", en: "Today Orders" }, type: "number" },
      { key: "monthlySales", label: { ar: "مبيعات الشهر الحالي (MTD)", en: "MTD Sales" }, type: "currency" },
      { key: "monthlyOrders", label: { ar: "فواتير الشهر", en: "MTD Orders" }, type: "number" },
      { key: "ytdSales", label: { ar: "مبيعات العام (YTD)", en: "YTD Sales" }, type: "currency" },
      { key: "avgTicket", label: { ar: "متوسط الفاتورة", en: "Avg Ticket" }, type: "currency" },
      { key: "sharePercent", label: { ar: "نسبة المساهمة %", en: "Share %" }, type: "number" },
      {
        key: "status",
        label: { ar: "المستهدف", en: "Status" },
        type: "badge",
        badgeMap: {
          achieved: { label: { ar: "محقَق 100%+", en: "Achieved" }, color: "success" },
          on_track: { label: { ar: "ضمن الخطة", en: "On Track" }, color: "brand" },
          below_target: { label: { ar: "يحتاج تنشيط", en: "Below Target" }, color: "crimson" },
        },
      },
    ],
    defaultSort: { key: "monthlySales", direction: "desc" },
  },

  // 2. تقرير مبيعات أصناف (جروب - صنف)
  {
    id: "product_sales_group",
    name: { ar: "تقرير مبيعات الأصناف (جروب - صنف)", en: "Product Sales by Group & Item" },
    description: {
      ar: "مبيعات منتجات حلويات الوزير مقسمة حسب المجموعات (عشاق الرز، الفتة، القشطوطة، دنيا الدلع، كاسات السعادة) والكميات والإيرادات",
      en: "Detailed product category sales analysis: sold units, average price, total revenue, and sales share",
    },
    category: "sales",
    dataSource: "sales_by_product",
    icon: "Boxes",
    columns: [
      { key: "sku", label: { ar: "كود الصنف", en: "SKU" }, type: "text" },
      { key: "name", label: { ar: "اسم الصنف", en: "Product Name" }, type: "text" },
      { key: "group", label: { ar: "المجموعة / القسم", en: "Category Group" }, type: "text" },
      { key: "qtySold", label: { ar: "الكمية المباعة", en: "Units Sold" }, type: "number" },
      { key: "unitPrice", label: { ar: "سعر الوحدة", en: "Unit Price" }, type: "currency" },
      { key: "totalRevenue", label: { ar: "إجمالي المبيعات", en: "Total Revenue" }, type: "currency" },
      { key: "ordersCount", label: { ar: "عدد الطلبات", en: "Orders" }, type: "number" },
      { key: "salesShare", label: { ar: "الحصة %", en: "Share %" }, type: "number" },
      { key: "stockOnHand", label: { ar: "الرصيد المتبقي", en: "Stock" }, type: "number" },
    ],
    defaultSort: { key: "totalRevenue", direction: "desc" },
  },

  // 3. تقرير مبيعات بالساعة
  {
    id: "hourly_sales_analysis",
    name: { ar: "تقرير مبيعات بالساعة ومعدلات الذروة", en: "Hourly Sales & Peak Trading" },
    description: {
      ar: "تحليل حركة المبيعات والإيرادات بالساعة على مدار اليوم، وتحديد ساعات الذروة القصوى لتنسيق أطقم العمل والتشغيل",
      en: "Transaction velocity, orders count, and revenue broken down hour by hour with peak rush indicators",
    },
    category: "sales",
    dataSource: "sales_by_hour",
    icon: "Clock",
    columns: [
      { key: "hourSlot", label: { ar: "الفترة الزمنية", en: "Time Window" }, type: "text" },
      { key: "period", label: { ar: "الفترة", en: "Period" }, type: "text" },
      { key: "ordersCount", label: { ar: "عدد الطلبات", en: "Orders" }, type: "number" },
      { key: "totalSales", label: { ar: "إجمالي المبيعات", en: "Sales" }, type: "currency" },
      { key: "avgTicket", label: { ar: "متوسط الفاتورة", en: "Avg Ticket" }, type: "currency" },
      {
        key: "peakStatus",
        label: { ar: "حالة الذروة", en: "Peak Level" },
        type: "badge",
        badgeMap: {
          extreme_peak: { label: { ar: "ذروة كبرى قصوى 🔥", en: "Extreme Peak" }, color: "crimson" },
          peak: { label: { ar: "ساعة ذروة نشطة", en: "Peak" }, color: "gold" },
          moderate: { label: { ar: "نشاط معتدل", en: "Moderate" }, color: "brand" },
          normal: { label: { ar: "تشغيل عادي", en: "Normal" }, color: "ink" },
        },
      },
      { key: "salesShare", label: { ar: "نسبة اليوم %", en: "Daily Share %" }, type: "number" },
    ],
    defaultSort: { key: "totalSales", direction: "desc" },
  },

  // 4. تقرير توقعات المبيعات
  {
    id: "sales_forecast_ai",
    name: { ar: "تقرير توقعات المبيعات والذكاء التنبؤي", en: "AI Sales Forecasting & Demand Projections" },
    description: {
      ar: "نماذج التنبؤ بالطلب المستقبلي للأيام والأسابيع القادمة مع هوامش الثقة الإحصائية ومحركات المواسم",
      en: "Predictive forward-looking revenue models, seasonal events drivers, and pessimistic/optimistic boundaries",
    },
    category: "sales",
    dataSource: "sales_forecast",
    icon: "TrendingUp",
    columns: [
      { key: "period", label: { ar: "الفترة المستهدفة", en: "Forecast Horizon" }, type: "text" },
      { key: "targetDate", label: { ar: "التاريخ", en: "Target Date" }, type: "date" },
      { key: "baselineSales", label: { ar: "الأساس التاريخي", en: "Baseline" }, type: "currency" },
      { key: "trendGrowth", label: { ar: "النمو المتوقع %", en: "Growth %" }, type: "number" },
      { key: "projectedSales", label: { ar: "المبيعات المتوقعة", en: "Projected" }, type: "currency" },
      { key: "minConfidence", label: { ar: "الحد الأدنى", en: "Lower Limit" }, type: "currency" },
      { key: "maxConfidence", label: { ar: "الحد الأقصى", en: "Upper Limit" }, type: "currency" },
      { key: "confidenceScore", label: { ar: "دقة النموذج %", en: "Confidence %" }, type: "number" },
      { key: "seasonalityDriver", label: { ar: "المحرك الموسمي", en: "Seasonal Driver" }, type: "text" },
      { key: "recommendedPrep", label: { ar: "توصية التشغيل", en: "Prep Action" }, type: "text" },
    ],
    defaultSort: { key: "targetDate", direction: "asc" },
  },

  // 5. تقارير الاستهلاكات والأصناف الأكثر مبيعا والأقل مبيعا
  {
    id: "consumption_sales_velocity",
    name: { ar: "تقرير الاستهلاكات وحركة الأصناف (الأكثر والأقل مبيعاً)", en: "Consumption & Fast/Slow Velocity" },
    description: {
      ar: "تصنيف أصناف الحلويات بحسب معدل الاستهلاك الفعلي والسرعة البيعية، وتحديد الأصناف الراكدة لعمل عروض تنشيطية",
      en: "Product consumption metrics, inventory turnover speed, best-selling drivers and stagnant items alert",
    },
    category: "sales",
    dataSource: "sales_consumption",
    icon: "Flame",
    columns: [
      { key: "ranking", label: { ar: "الترتيب", en: "Rank" }, type: "number" },
      { key: "sku", label: { ar: "كود الصنف", en: "SKU" }, type: "text" },
      { key: "name", label: { ar: "اسم الصنف", en: "Product" }, type: "text" },
      { key: "category", label: { ar: "المجموعة", en: "Category" }, type: "text" },
      { key: "consumedQty", label: { ar: "الكمية المستهلكة", en: "Consumed Qty" }, type: "number" },
      { key: "stockAvailable", label: { ar: "الرصيد المتاح", en: "In Stock" }, type: "number" },
      {
        key: "velocity",
        label: { ar: "معدل الدوران", en: "Turnover Velocity" },
        type: "badge",
        badgeMap: {
          ultra_fast: { label: { ar: "فائق السرعة 🔥", en: "Ultra Fast" }, color: "crimson" },
          fast: { label: { ar: "سريع الدوران", en: "Fast" }, color: "success" },
          moderate: { label: { ar: "متوسط الحركة", en: "Moderate" }, color: "brand" },
          slow: { label: { ar: "بطيء الحركة", en: "Slow" }, color: "gold" },
          stagnant: { label: { ar: "راكد / خامل", en: "Stagnant" }, color: "ink" },
        },
      },
      { key: "totalRevenue", label: { ar: "إجمالي القيمة", en: "Revenue" }, type: "currency" },
      {
        key: "classification",
        label: { ar: "التصنيف البيعي", en: "Classification" },
        type: "badge",
        badgeMap: {
          best_seller: { label: { ar: "الأكثر مبيعاً ⭐", en: "Best Seller" }, color: "success" },
          high_demand: { label: { ar: "طلب مرتفع", en: "High Demand" }, color: "brand" },
          moderate: { label: { ar: "طلب مستقر", en: "Standard" }, color: "gold" },
          slow_mover: { label: { ar: "الأقل مبيعاً", en: "Slow Mover" }, color: "ink" },
          dead_stock: { label: { ar: "راكد يحتاج تصفية", en: "Dead Stock" }, color: "crimson" },
        },
      },
      { key: "action", label: { ar: "الإجراء المقترح", en: "Recommended Action" }, type: "text" },
    ],
    defaultSort: { key: "consumedQty", direction: "desc" },
  },

  // 6. تقارير تحليل طرق الدفع
  {
    id: "payment_methods_analysis",
    name: { ar: "تقرير تحليل طرق وقنوات الدفع", en: "Payment Methods & Tender Analysis" },
    description: {
      ar: "متابعة توزيع المتحصلات النقدية والإلكترونية (كاش، فيزا، إنستاباي، وفرها، فوري) ونسب التسوية لكل بنك وصندوق",
      en: "Comprehensive tender analysis across Cash, Credit Cards, InstaPay, Fawry, and Vouchers with net settlements",
    },
    category: "sales",
    dataSource: "sales_payment_methods",
    icon: "CreditCard",
    columns: [
      { key: "methodName", label: { ar: "طريقة الدفع", en: "Payment Method" }, type: "text" },
      {
        key: "type",
        label: { ar: "النوع", en: "Tender Type" },
        type: "badge",
        badgeMap: {
          cash: { label: { ar: "نقدي (كاش)", en: "Cash" }, color: "success" },
          electronic: { label: { ar: "إلكتروني / بطاقات", en: "Electronic" }, color: "brand" },
          voucher: { label: { ar: "قسائم وكوبونات", en: "Voucher" }, color: "gold" },
          credit: { label: { ar: "آجل / تقسيط", en: "Credit" }, color: "ink" },
        },
      },
      { key: "ordersCount", label: { ar: "عدد الحركات", en: "Tx Count" }, type: "number" },
      { key: "totalAmount", label: { ar: "إجمالي المحصل", en: "Collections" }, type: "currency" },
      { key: "avgTicket", label: { ar: "متوسط الحركة", en: "Avg Tx" }, type: "currency" },
      { key: "sharePercent", label: { ar: "نسبة التحصيل %", en: "Share %" }, type: "number" },
      { key: "feePercent", label: { ar: "رسوم البوابة %", en: "Fee %" }, type: "number" },
      { key: "netCollected", label: { ar: "الصافي بعد الرسوم", en: "Net Settled" }, type: "currency" },
      { key: "settlementTarget", label: { ar: "جهة التسوية", en: "Settlement Account" }, type: "text" },
    ],
    defaultSort: { key: "totalAmount", direction: "desc" },
  },

  // 7. تقارير تحليل مصادر البيع المختلفة
  {
    id: "sales_channels_breakdown",
    name: { ar: "تقرير تحليل مصادر وقنوات البيع المختلفة", en: "Sales Channels & Multi-Platform Breakdown" },
    description: {
      ar: "مقارنة أداء منافذ البيع المختلفة: صالة المعارض، التيك أواي، أسطول التوصيل المباشر، وتطبيقات التوصيل الخارجية (طلبات، وفرها، المنيوز)",
      en: "Performance analysis across Dine-in, Takeaway, Own Fleet Delivery, and Delivery Partner Aggregators",
    },
    category: "sales",
    dataSource: "sales_channels",
    icon: "Share2",
    columns: [
      { key: "channelName", label: { ar: "قناة البيع", en: "Channel" }, type: "text" },
      {
        key: "channelType",
        label: { ar: "النوع", en: "Type" },
        type: "badge",
        badgeMap: {
          direct_branch: { label: { ar: "معرض الفرع", en: "In-Store" }, color: "success" },
          own_fleet: { label: { ar: "أسطول التوصيل الخاص", en: "Own Fleet" }, color: "brand" },
          food_app: { label: { ar: "تطبيق توصيل شريك", en: "Partner App" }, color: "gold" },
          b2b: { label: { ar: "تعاقدات شركات", en: "Corporate B2B" }, color: "ink" },
        },
      },
      { key: "ordersCount", label: { ar: "عدد الطلبات", en: "Orders" }, type: "number" },
      { key: "grossSales", label: { ar: "إجمالي المبيعات", en: "Gross Sales" }, type: "currency" },
      { key: "commissions", label: { ar: "الخصومات والعمولات", en: "Commissions" }, type: "currency" },
      { key: "netSales", label: { ar: "صافي الإيراد", en: "Net Sales" }, type: "currency" },
      { key: "avgTicket", label: { ar: "متوسط الطلب", en: "Avg Order" }, type: "currency" },
      { key: "sharePercent", label: { ar: "الحصة السوقية %", en: "Share %" }, type: "number" },
      { key: "growthRate", label: { ar: "النمو %", en: "Growth %" }, type: "number" },
    ],
    defaultSort: { key: "grossSales", direction: "desc" },
  },

  // 8. تقارير تكلفة المبيعات Cost of Goods Sold (COGS)
  {
    id: "sales_cogs_margins",
    name: { ar: "تقرير تكلفة المبيعات وهامش الربح الإجمالي (COGS)", en: "Cost of Goods Sold (COGS) & Profit Margins" },
    description: {
      ar: "تحليل دقيق لتكلفة خامات التصنيع المباشرة، إجمالي الربح الهامشي، ونسب هامش الربح الإجمالي (Gross Margin %) لكل صنف وقسم",
      en: "Direct ingredients and packaging cost of goods sold, gross profit margins, and markup pricing analysis",
    },
    category: "sales",
    dataSource: "sales_cogs",
    icon: "DollarSign",
    columns: [
      { key: "sku", label: { ar: "كود الصنف", en: "SKU" }, type: "text" },
      { key: "itemName", label: { ar: "اسم الصنف", en: "Product" }, type: "text" },
      { key: "category", label: { ar: "المجموعة", en: "Category" }, type: "text" },
      { key: "unitsSold", label: { ar: "الكمية المباعة", en: "Sold Qty" }, type: "number" },
      { key: "sellingPrice", label: { ar: "سعر البيع", en: "Selling Price" }, type: "currency" },
      { key: "salesRevenue", label: { ar: "إيراد المبيعات", en: "Revenue" }, type: "currency" },
      { key: "unitCost", label: { ar: "تكلفة الوحدة (COGS)", en: "Unit Cost" }, type: "currency" },
      { key: "totalCogs", label: { ar: "إجمالي تكلفة المبيعات", en: "Total COGS" }, type: "currency" },
      { key: "grossProfit", label: { ar: "مجمل الربح الهامشي", en: "Gross Profit" }, type: "currency" },
      { key: "grossMarginPercent", label: { ar: "هامش الربح %", en: "Margin %" }, type: "number" },
      { key: "markupPercent", label: { ar: "نسبة التغطية Markup %", en: "Markup %" }, type: "number" },
      {
        key: "profitabilityRating",
        label: { ar: "تقييم الربحية", en: "Rating" },
        type: "badge",
        badgeMap: {
          exceptional: { label: { ar: "ربحية استثنائية (70%+)", en: "Exceptional" }, color: "success" },
          high: { label: { ar: "ربحية مرتفعة (55-70%)", en: "High" }, color: "brand" },
          healthy: { label: { ar: "ربحية جيدة (40-55%)", en: "Healthy" }, color: "gold" },
          tight: { label: { ar: "هامش محدود (< 40%)", en: "Tight" }, color: "crimson" },
        },
      },
    ],
    defaultSort: { key: "grossProfit", direction: "desc" },
  },
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
  } catch { }
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

    case "sales_by_branch": {
      // Branch performance: Day, Month, YTD
      const baseBranches = [
        { id: "korba", name: { ar: "فرع الكوربة — مصر الجديدة", en: "Korba — Heliopolis" }, city: { ar: "القاهرة (مصر الجديدة)", en: "Cairo" }, daySales: 38400, dayOrders: 165, monthSales: 1180000, monthOrders: 4900, ytdSales: 10800000, targetStatus: "achieved" },
        { id: "maadi", name: { ar: "فرع المعادي — شارع النصر", en: "Maadi — Al-Nasr St." }, city: { ar: "القاهرة (المعادي)", en: "Cairo" }, daySales: 32600, dayOrders: 142, monthSales: 995000, monthOrders: 4150, ytdSales: 9250000, targetStatus: "achieved" },
        { id: "tagamoa", name: { ar: "فرع التجمع الخامس — التسعين", en: "New Cairo — 90th St." }, city: { ar: "القاهرة الجديدة", en: "New Cairo" }, daySales: 36200, dayOrders: 138, monthSales: 1060000, monthOrders: 4020, ytdSales: 9800000, targetStatus: "achieved" },
        { id: "coast", name: { ar: "فرع الساحل الشمالي — مارينا", en: "North Coast — Marina Hub" }, city: { ar: "الساحل الشمالي", en: "North Coast" }, daySales: 21500, dayOrders: 78, monthSales: 640000, monthOrders: 2100, ytdSales: 5600000, targetStatus: "on_track" },
        { id: "kitchen", name: { ar: "المطبخ المركزي والمصنع — العاشر", en: "Central Kitchen Hub" }, city: { ar: "العاشر من رمضان", en: "10th Ramadan" }, daySales: 28700, dayOrders: 110, monthSales: 890000, monthOrders: 3400, ytdSales: 8100000, targetStatus: "achieved" },
        { id: "alex", name: { ar: "فرع الإسكندرية — سموحة", en: "Alexandria — Smouha" }, city: { ar: "الإسكندرية", en: "Alexandria" }, daySales: 18900, dayOrders: 89, monthSales: 565000, monthOrders: 2650, ytdSales: 5100000, targetStatus: "below_target" },
      ];

      // Incorporate live orders if present
      const liveOrders = liveCollections?.posOrders || [];
      const liveBranchTotals: Record<string, { todaySum: number; todayCount: number }> = {};
      for (const ord of liveOrders) {
        const bId = ord.branchId || "korba";
        if (!liveBranchTotals[bId]) liveBranchTotals[bId] = { todaySum: 0, todayCount: 0 };
        liveBranchTotals[bId]!.todaySum += Number(ord.total) || 0;
        liveBranchTotals[bId]!.todayCount += 1;
      }

      const totalMonthly = baseBranches.reduce((s, b) => s + b.monthSales, 0);

      return baseBranches.map((b) => {
        const live = liveBranchTotals[b.id];
        const daySales = b.daySales + (live ? live.todaySum : 0);
        const dayOrders = b.dayOrders + (live ? live.todayCount : 0);
        const share = Math.round((b.monthSales / (totalMonthly || 1)) * 1000) / 10;
        const avg = dayOrders > 0 ? Math.round(daySales / dayOrders) : 0;

        return {
          branchId: b.id,
          branch: pick(b.name),
          city: pick(b.city),
          dailySales: daySales,
          dailyOrders: dayOrders,
          monthlySales: b.monthSales,
          monthlyOrders: b.monthOrders,
          ytdSales: b.ytdSales,
          avgTicket: avg,
          sharePercent: share,
          status: b.targetStatus,
        };
      });
    }

    case "sales_by_product": {
      // Products sales by category group and individual item
      const prods = [
        { sku: "BRN-1001", name: { ar: "رز بلبن نوتيلا", en: "Rice Pudding Nutella" }, group: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 1620, price: 50, orders: 1540, stock: 120 },
        { sku: "BRN-1002", name: { ar: "رز بلبن مكسرات", en: "Rice Pudding Mixed Nuts" }, group: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 1120, price: 55, orders: 1050, stock: 85 },
        { sku: "BRN-1003", name: { ar: "رز بلبن لوتس", en: "Rice Pudding Lotus" }, group: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 980, price: 55, orders: 920, stock: 95 },
        { sku: "BRN-1004", name: { ar: "رز بلبن بستاشيو فاخر", en: "Rice Pudding Pistachio" }, group: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 780, price: 80, orders: 740, stock: 60 },
        { sku: "BRN-1005", name: { ar: "رز بلبن الوزير الخاص", en: "Rice Pudding Al-Wazeer" }, group: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 920, price: 80, orders: 880, stock: 75 },
        { sku: "BRN-1006", name: { ar: "رز بلبن ساده بلدي", en: "Plain Rice Pudding" }, group: { ar: "عشاق الرز", en: "Rice Pudding" }, qty: 890, price: 25, orders: 750, stock: 180 },
        { sku: "BRN-1007", name: { ar: "فتة ميكس الوزير", en: "Fatta Mix Al-Wazeer" }, group: { ar: "الفتة", en: "Fatta" }, qty: 1850, price: 90, orders: 1780, stock: 45 },
        { sku: "BRN-1008", name: { ar: "فتة نوتيلا بالكريمة", en: "Fatta Nutella" }, group: { ar: "الفتة", en: "Fatta" }, qty: 1240, price: 90, orders: 1190, stock: 50 },
        { sku: "BRN-1009", name: { ar: "فتة مانجا طبيعي", en: "Fatta Mango" }, group: { ar: "الفتة", en: "Fatta" }, qty: 890, price: 90, orders: 840, stock: 38 },
        { sku: "BRN-1010", name: { ar: "فتة بستاشيو سوبريم", en: "Fatta Pistachio" }, group: { ar: "الفتة", en: "Fatta" }, qty: 620, price: 95, orders: 590, stock: 25 },
        { sku: "BRN-1011", name: { ar: "قشطوطة لوتس", en: "Qashtouta Lotus" }, group: { ar: "القشطوطة", en: "Qashtouta" }, qty: 710, price: 75, orders: 680, stock: 40 },
        { sku: "BRN-1012", name: { ar: "قشطوطة مانجا بالكريمة", en: "Qashtouta Mango" }, group: { ar: "القشطوطة", en: "Qashtouta" }, qty: 980, price: 75, orders: 940, stock: 30 },
        { sku: "BRN-1013", name: { ar: "كاس سعادة كندر", en: "Dessert Cup Kinder" }, group: { ar: "كاسات السعادة", en: "Happiness Cups" }, qty: 640, price: 65, orders: 610, stock: 55 },
        { sku: "BRN-1014", name: { ar: "كاس سعادة بستاشيو نوتيلا", en: "Dessert Cup Pistachio" }, group: { ar: "كاسات السعادة", en: "Happiness Cups" }, qty: 520, price: 75, orders: 490, stock: 42 },
        { sku: "BRN-1015", name: { ar: "أم علي قشطة ومكسرات", en: "Om Ali Nuts & Cream" }, group: { ar: "أم علي", en: "Om Ali" }, qty: 480, price: 60, orders: 450, stock: 48 },
        { sku: "BRN-1016", name: { ar: "بسبوسة مكسرات سمن بلدي", en: "Basbousa Nuts" }, group: { ar: "حلويات شرقية", en: "Oriental Sweets" }, qty: 310, price: 140, orders: 280, stock: 25 },
        { sku: "BRN-1017", name: { ar: "كنافة نابلسية بالجبن العكاوي", en: "Kunafa Nabulsi" }, group: { ar: "حلويات شرقية", en: "Oriental Sweets" }, qty: 260, price: 160, orders: 240, stock: 20 },
        { sku: "BRN-1020", name: { ar: "تورتة لوتس فاميلي", en: "Lotus Cake Family" }, group: { ar: "تورت وجاتوه", en: "Cakes & Pastry" }, qty: 95, price: 320, orders: 90, stock: 14 },
      ];

      const grandTotalRev = prods.reduce((s, p) => s + p.qty * p.price, 0);

      return prods.map((p) => {
        const rev = p.qty * p.price;
        const share = Math.round((rev / (grandTotalRev || 1)) * 1000) / 10;
        return {
          sku: p.sku,
          name: pick(p.name),
          group: pick(p.group),
          qtySold: p.qty,
          unitPrice: p.price,
          totalRevenue: rev,
          ordersCount: p.orders,
          salesShare: share,
          stockOnHand: p.stock,
        };
      });
    }

    case "sales_by_hour": {
      // Hourly sales across 9 business windows
      return [
        { hourSlot: "09:00 ص - 11:00 ص", period: lang === "ar" ? "فترة الصباح والافتتاح" : "Morning Opening", ordersCount: 38, totalSales: 6850, avgTicket: 180, peakStatus: "normal", salesShare: 4.6 },
        { hourSlot: "11:00 ص - 01:00 م", period: lang === "ar" ? "بداية طلبات العمل والشركات" : "Lunch Rush Prep", ordersCount: 74, totalSales: 15400, avgTicket: 208, peakStatus: "moderate", salesShare: 10.4 },
        { hourSlot: "01:00 م - 03:00 م", period: lang === "ar" ? "ذروة الغداء والتوصيل المكتبي" : "Lunch Peak", ordersCount: 126, totalSales: 29800, avgTicket: 236, peakStatus: "peak", salesShare: 20.1 },
        { hourSlot: "03:00 م - 05:00 م", period: lang === "ar" ? "فترة ما بعد الظهيرة والعصر" : "Afternoon Lull", ordersCount: 62, totalSales: 12900, avgTicket: 208, peakStatus: "normal", salesShare: 8.7 },
        { hourSlot: "05:00 م - 07:00 م", period: lang === "ar" ? "فترة العودة للمنزل والتيك أواي" : "Evening Rush", ordersCount: 98, totalSales: 22600, avgTicket: 230, peakStatus: "moderate", salesShare: 15.3 },
        { hourSlot: "07:00 م - 09:00 م", period: lang === "ar" ? "ذروة المساء العائلية" : "Dinner Peak", ordersCount: 154, totalSales: 38200, avgTicket: 248, peakStatus: "peak", salesShare: 25.8 },
        { hourSlot: "09:00 م - 11:00 م", period: lang === "ar" ? "ذروة السهرة الكبرى القصوى 🔥" : "Night Mega Peak", ordersCount: 182, totalSales: 48600, avgTicket: 267, peakStatus: "extreme_peak", salesShare: 32.8 },
        { hourSlot: "11:00 م - 01:00 ص", period: lang === "ar" ? "سهرات الشباب وطلبات الدليفري" : "Late Night Delivery", ordersCount: 110, totalSales: 27500, avgTicket: 250, peakStatus: "peak", salesShare: 18.6 },
        { hourSlot: "01:00 ص - 02:00 ص", period: lang === "ar" ? "أواخر الليل وتسليم الورديات" : "Midnight Closing", ordersCount: 32, totalSales: 7100, avgTicket: 221, peakStatus: "normal", salesShare: 4.8 },
      ];
    }

    case "sales_forecast": {
      // AI-driven forward-looking sales forecast
      return [
        {
          period: lang === "ar" ? "غداً الخميس (عطلة نهاية الأسبوع)" : "Tomorrow Thursday",
          targetDate: "2026-10-15",
          baselineSales: 142000,
          trendGrowth: 18.5,
          projectedSales: 168270,
          minConfidence: 155000,
          maxConfidence: 182000,
          confidenceScore: 96,
          seasonalityDriver: lang === "ar" ? "بداية نهاية الأسبوع وتجمعات أسرية" : "Weekend kickoff family gatherings",
          recommendedPrep: lang === "ar" ? "زيادة إنتاج الفتة والقشطوطة 25%" : "Increase Fatta production by 25%",
        },
        {
          period: lang === "ar" ? "الجمعة القادمة (قمة المبيعات الأسبوعية)" : "Upcoming Friday Peak",
          targetDate: "2026-10-16",
          baselineSales: 178000,
          trendGrowth: 22.0,
          projectedSales: 217160,
          minConfidence: 198000,
          maxConfidence: 235000,
          confidenceScore: 95,
          seasonalityDriver: lang === "ar" ? "يوم الجمعة وعزومات الغداء والحلويات" : "Friday lunch gatherings & catering",
          recommendedPrep: lang === "ar" ? "تجهيز 500 كجم رز بلبن ومكسرات بالمطبخ المركزي" : "Prepare 500kg rice pudding at kitchen",
        },
        {
          period: lang === "ar" ? "السبت القادم" : "Upcoming Saturday",
          targetDate: "2026-10-17",
          baselineSales: 155000,
          trendGrowth: 12.0,
          projectedSales: 173600,
          minConfidence: 160000,
          maxConfidence: 188000,
          confidenceScore: 94,
          seasonalityDriver: lang === "ar" ? "تسوق العائلات بالمعارض والمولات" : "Retail walk-in store shopping",
          recommendedPrep: lang === "ar" ? "دعم مخزون صالات العرض بفروع الكوربة والتجمع" : "Restock Korba and New Cairo displays",
        },
        {
          period: lang === "ar" ? "الأسبوع القادم كاملاً (W42)" : "Next Week Total (W42)",
          targetDate: "2026-10-23",
          baselineSales: 980000,
          trendGrowth: 14.2,
          projectedSales: 1119160,
          minConfidence: 1050000,
          maxConfidence: 1190000,
          confidenceScore: 93,
          seasonalityDriver: lang === "ar" ? "حملة إعلانات تيك توك وإنستجرام الجديدة" : "New social media influencer campaign",
          recommendedPrep: lang === "ar" ? "تأمين 2 طن نوتيلا وبستاشيو من الموردين" : "Secure 2 tons Nutella & Pistachio",
        },
        {
          period: lang === "ar" ? "الأسبوع الأخير من الشهر (فترة الرواتب)" : "End-of-Month Payroll Surge",
          targetDate: "2026-10-30",
          baselineSales: 1050000,
          trendGrowth: 16.8,
          projectedSales: 1226400,
          minConfidence: 1140000,
          maxConfidence: 1310000,
          confidenceScore: 92,
          seasonalityDriver: lang === "ar" ? "صرف رواتب موظفي البنوك والشركات" : "Corporate monthly salary disbursements",
          recommendedPrep: lang === "ar" ? "طرح بوكسات السعادة العائلية الموفرة" : "Promote Family Value Bundles",
        },
        {
          period: lang === "ar" ? "الشهر القادم (نوفمبر 2026)" : "Next Month (November 2026)",
          targetDate: "2026-11-30",
          baselineSales: 4450000,
          trendGrowth: 15.5,
          projectedSales: 5139750,
          minConfidence: 4800000,
          maxConfidence: 5450000,
          confidenceScore: 91,
          seasonalityDriver: lang === "ar" ? "افتتاح فرع الشيخ زايد والطقس الخريفي" : "New Sheikh Zayed branch opening",
          recommendedPrep: lang === "ar" ? "مضاعفة الطاقة التشغيلية لخطوط مصنع العاشر" : "Scale up 10th Ramadan factory output",
        },
        {
          period: lang === "ar" ? "الربع الرابع التراكمي (Q4 2026)" : "Q4 2026 Full Horizon",
          targetDate: "2026-12-31",
          baselineSales: 13200000,
          trendGrowth: 19.4,
          projectedSales: 15760800,
          minConfidence: 14800000,
          maxConfidence: 16800000,
          confidenceScore: 90,
          seasonalityDriver: lang === "ar" ? "موسم الشتاء والحلويات الدافئة واحتفالات نهاية العام" : "Winter season & New Year catering",
          recommendedPrep: lang === "ar" ? "إطلاق خط طواجن أم علي الفخار والحلويات الساخنة" : "Launch Hot Dessert Casseroles line",
        },
      ];
    }

    case "sales_consumption": {
      // Consumption rates, velocity, and best/least selling items
      return [
        {
          ranking: 1,
          sku: "BRN-1007",
          name: lang === "ar" ? "فتة ميكس الوزير" : "Fatta Mix Al-Wazeer",
          category: lang === "ar" ? "الفتة" : "Fatta",
          consumedQty: 1850,
          stockAvailable: 45,
          velocity: "ultra_fast",
          totalRevenue: 166500,
          classification: "best_seller",
          action: lang === "ar" ? "أمر تشغيل يومي مضاعف — أولوية قصوى" : "Double daily production batch",
        },
        {
          ranking: 2,
          sku: "BRN-1001",
          name: lang === "ar" ? "رز بلبن نوتيلا" : "Rice Pudding Nutella",
          category: lang === "ar" ? "عشاق الرز" : "Rice Pudding",
          consumedQty: 1620,
          stockAvailable: 120,
          velocity: "ultra_fast",
          totalRevenue: 81000,
          classification: "best_seller",
          action: lang === "ar" ? "زيادة توريد النوتيلا الخام 15 كجم" : "Order more 15kg Nutella tubs",
        },
        {
          ranking: 3,
          sku: "BRN-1008",
          name: lang === "ar" ? "فتة نوتيلا بالكريمة" : "Fatta Nutella",
          category: lang === "ar" ? "الفتة" : "Fatta",
          consumedQty: 1240,
          stockAvailable: 50,
          velocity: "fast",
          totalRevenue: 111600,
          classification: "high_demand",
          action: lang === "ar" ? "الحفاظ على معدل الإنتاج الآمن" : "Maintain steady safety buffer",
        },
        {
          ranking: 4,
          sku: "BRN-1002",
          name: lang === "ar" ? "رز بلبن مكسرات" : "Rice Pudding Mixed Nuts",
          category: lang === "ar" ? "عشاق الرز" : "Rice Pudding",
          consumedQty: 1120,
          stockAvailable: 85,
          velocity: "fast",
          totalRevenue: 61600,
          classification: "high_demand",
          action: lang === "ar" ? "تأمين خامات البندق واللوز المقشر" : "Stock peeled hazelnuts & almonds",
        },
        {
          ranking: 5,
          sku: "BRN-1012",
          name: lang === "ar" ? "قشطوطة مانجا بالكريمة" : "Qashtouta Mango",
          category: lang === "ar" ? "القشطوطة" : "Qashtouta",
          consumedQty: 980,
          stockAvailable: 30,
          velocity: "fast",
          totalRevenue: 73500,
          classification: "high_demand",
          action: lang === "ar" ? "تعزيز استلام المانجا الطازجة المجمدة" : "Secure fresh frozen mango puree",
        },
        {
          ranking: 6,
          sku: "BRN-1005",
          name: lang === "ar" ? "رز بلبن الوزير الخاص" : "Rice Pudding Al-Wazeer",
          category: lang === "ar" ? "عشاق الرز" : "Rice Pudding",
          consumedQty: 920,
          stockAvailable: 75,
          velocity: "fast",
          totalRevenue: 73600,
          classification: "high_demand",
          action: lang === "ar" ? "ضمان توفر عبوات الفخار الفاخرة" : "Ensure luxury clay pots availability",
        },
        {
          ranking: 7,
          sku: "BRN-1006",
          name: lang === "ar" ? "رز بلبن ساده بلدي" : "Plain Rice Pudding",
          category: lang === "ar" ? "عشاق الرز" : "Rice Pudding",
          consumedQty: 890,
          stockAvailable: 180,
          velocity: "moderate",
          totalRevenue: 22250,
          classification: "moderate",
          action: lang === "ar" ? "مخزون وافر وسعر اقتصادي مستقر" : "Stable economy pricing tier",
        },
        {
          ranking: 8,
          sku: "BRN-1004",
          name: lang === "ar" ? "رز بلبن بستاشيو فاخر" : "Rice Pudding Pistachio",
          category: lang === "ar" ? "عشاق الرز" : "Rice Pudding",
          consumedQty: 780,
          stockAvailable: 60,
          velocity: "fast",
          totalRevenue: 62400,
          classification: "high_demand",
          action: lang === "ar" ? "مراقبة تكلفة معجون الفستق الإيطالي" : "Monitor imported pistachio paste cost",
        },
        {
          ranking: 9,
          sku: "BRN-1011",
          name: lang === "ar" ? "قشطوطة لوتس" : "Qashtouta Lotus",
          category: lang === "ar" ? "القشطوطة" : "Qashtouta",
          consumedQty: 710,
          stockAvailable: 40,
          velocity: "moderate",
          totalRevenue: 53250,
          classification: "moderate",
          action: lang === "ar" ? "مستوى طلب مستقر ضمن التوقعات" : "Stable steady demand",
        },
        {
          ranking: 10,
          sku: "BRN-1013",
          name: lang === "ar" ? "كاس سعادة كندر" : "Dessert Cup Kinder",
          category: lang === "ar" ? "كاسات السعادة" : "Happiness Cups",
          consumedQty: 640,
          stockAvailable: 55,
          velocity: "moderate",
          totalRevenue: 41600,
          classification: "moderate",
          action: lang === "ar" ? "تنشيط في عروض الكومبو والتيك أواي" : "Bundle into takeaway combos",
        },
        {
          ranking: 11,
          sku: "BRN-1016",
          name: lang === "ar" ? "بسبوسة مكسرات سمن بلدي" : "Basbousa Nuts",
          category: lang === "ar" ? "حلويات شرقية" : "Oriental Sweets",
          consumedQty: 310,
          stockAvailable: 25,
          velocity: "slow",
          totalRevenue: 43400,
          classification: "slow_mover",
          action: lang === "ar" ? "إنتاج حسب الطلب فقط لتجنب الهدر" : "Make-to-order only to reduce waste",
        },
        {
          ranking: 12,
          sku: "BRN-1017",
          name: lang === "ar" ? "كنافة نابلسية بالجبن" : "Kunafa Nabulsi",
          category: lang === "ar" ? "حلويات شرقية" : "Oriental Sweets",
          consumedQty: 260,
          stockAvailable: 20,
          velocity: "slow",
          totalRevenue: 41600,
          classification: "slow_mover",
          action: lang === "ar" ? "تشغيل فريش وقت الذروة المسائية" : "Fresh bake during evening rush only",
        },
        {
          ranking: 13,
          sku: "BRN-1020",
          name: lang === "ar" ? "تورتة لوتس فاميلي" : "Lotus Cake Family",
          category: lang === "ar" ? "تورت وجاتوه" : "Cakes & Pastry",
          consumedQty: 95,
          stockAvailable: 14,
          velocity: "slow",
          totalRevenue: 30400,
          classification: "slow_mover",
          action: lang === "ar" ? "ترويج لحفلات أعياد الميلاد" : "Promote for birthdays & parties",
        },
        {
          ranking: 14,
          sku: "BRN-1025",
          name: lang === "ar" ? "مهلبية مستكة دايت" : "Diet Mastic Pudding",
          category: lang === "ar" ? "عشاق الرز" : "Pudding",
          consumedQty: 45,
          stockAvailable: 65,
          velocity: "stagnant",
          totalRevenue: 1350,
          classification: "dead_stock",
          action: lang === "ar" ? "عرض تصفية 1+1 وإعادة تقييم الوصفة" : "Run 1+1 promo and revise recipe",
        },
      ];
    }

    case "sales_payment_methods": {
      // Payment methods analysis
      return [
        {
          methodKey: "cash",
          methodName: lang === "ar" ? "نقداً (كاش) أدراج الفروع" : "Cash Drawer",
          type: "cash",
          ordersCount: 3450,
          totalAmount: 845000,
          avgTicket: 245,
          sharePercent: 44.2,
          feePercent: 0,
          netCollected: 845000,
          settlementTarget: lang === "ar" ? "صناديق نقدية الفروع اليومية" : "Branch Daily Cash Box",
        },
        {
          methodKey: "card",
          methodName: lang === "ar" ? "فيزا وبطاقات ائتمان (POS CIB)" : "Credit Cards POS (CIB)",
          type: "electronic",
          ordersCount: 2180,
          totalAmount: 588000,
          avgTicket: 270,
          sharePercent: 30.8,
          feePercent: 1.5,
          netCollected: 579180,
          settlementTarget: lang === "ar" ? "الحساب الجاري — بنك CIB" : "CIB Corporate Account",
        },
        {
          methodKey: "instapay",
          methodName: lang === "ar" ? "إنستاباي ومحافظ ذكية (InstaPay)" : "InstaPay & Wallets",
          type: "electronic",
          ordersCount: 1050,
          totalAmount: 242000,
          avgTicket: 230,
          sharePercent: 12.7,
          feePercent: 0.5,
          netCollected: 240790,
          settlementTarget: lang === "ar" ? "محفظة إنستاباي بنك مصر" : "Banque Misr InstaPay",
        },
        {
          methodKey: "waffarha",
          methodName: lang === "ar" ? "قسائم وكوبونات وفرها (Waffarha)" : "Waffarha Vouchers",
          type: "voucher",
          ordersCount: 540,
          totalAmount: 118000,
          avgTicket: 218,
          sharePercent: 6.2,
          feePercent: 10.0,
          netCollected: 106200,
          settlementTarget: lang === "ar" ? "تسوية شركة وفرها للتجارة" : "Waffarha Monthly Clearing",
        },
        {
          methodKey: "fawry",
          methodName: lang === "ar" ? "فوري وباي موب (Fawry Pay)" : "Fawry / Paymob",
          type: "electronic",
          ordersCount: 280,
          totalAmount: 64500,
          avgTicket: 230,
          sharePercent: 3.4,
          feePercent: 2.0,
          netCollected: 63210,
          settlementTarget: lang === "ar" ? "حساب فوري للمدفوعات" : "Fawry Merchant Account",
        },
        {
          methodKey: "credit",
          methodName: lang === "ar" ? "حسابات آجلة للشركات (B2B Credit)" : "Commercial B2B Credit",
          type: "credit",
          ordersCount: 65,
          totalAmount: 52500,
          avgTicket: 807,
          sharePercent: 2.7,
          feePercent: 0,
          netCollected: 52500,
          settlementTarget: lang === "ar" ? "أرصدة ذمم العملاء الآجلة" : "Accounts Receivable",
        },
      ];
    }

    case "sales_channels": {
      // Sales channels & platforms
      return [
        {
          channelCode: "takeaway",
          channelName: lang === "ar" ? "معارض الفروع — تيك أواي واستلام" : "Store Walk-in / Takeaway",
          channelType: "direct_branch",
          ordersCount: 3120,
          grossSales: 748000,
          commissions: 0,
          netSales: 748000,
          avgTicket: 240,
          sharePercent: 39.2,
          growthRate: 14.5,
        },
        {
          channelCode: "dine_in",
          channelName: lang === "ar" ? "معارض الفروع — طلبات صالة" : "Dine-in Parlor",
          channelType: "direct_branch",
          ordersCount: 1840,
          grossSales: 478000,
          commissions: 0,
          netSales: 478000,
          avgTicket: 260,
          sharePercent: 25.0,
          growthRate: 11.2,
        },
        {
          channelCode: "own_fleet",
          channelName: lang === "ar" ? "أسطول التوصيل الخاص (الوزير دليفري)" : "Al-Wazeer Direct Delivery",
          channelType: "own_fleet",
          ordersCount: 1150,
          grossSales: 298000,
          commissions: 12000,
          netSales: 286000,
          avgTicket: 259,
          sharePercent: 15.6,
          growthRate: 24.8,
        },
        {
          channelCode: "talabat",
          channelName: lang === "ar" ? "تطبيق طلبات مصر (Talabat App)" : "Talabat Egypt",
          channelType: "food_app",
          ordersCount: 980,
          grossSales: 235000,
          commissions: 42300,
          netSales: 192700,
          avgTicket: 240,
          sharePercent: 12.3,
          growthRate: 18.0,
        },
        {
          channelCode: "waffarha",
          channelName: lang === "ar" ? "تطبيق وفرها (Waffarha Deals)" : "Waffarha Coupons",
          channelType: "food_app",
          ordersCount: 340,
          grossSales: 78000,
          commissions: 11700,
          netSales: 66300,
          avgTicket: 229,
          sharePercent: 4.1,
          growthRate: 8.5,
        },
        {
          channelCode: "b2b",
          channelName: lang === "ar" ? "عقود الشركات وحفلات الفنادق (B2B)" : "Corporate & Hotel Catering",
          channelType: "b2b",
          ordersCount: 48,
          grossSales: 73000,
          commissions: 0,
          netSales: 73000,
          avgTicket: 1520,
          sharePercent: 3.8,
          growthRate: 32.0,
        },
      ];
    }

    case "sales_cogs": {
      // Cost of goods sold & gross margins
      return [
        {
          sku: "BRN-1001",
          itemName: lang === "ar" ? "رز بلبن نوتيلا" : "Rice Pudding Nutella",
          category: lang === "ar" ? "عشاق الرز" : "Rice Pudding",
          unitsSold: 1620,
          sellingPrice: 50,
          salesRevenue: 81000,
          unitCost: 16.5,
          totalCogs: 26730,
          grossProfit: 54270,
          grossMarginPercent: 67.0,
          markupPercent: 203,
          profitabilityRating: "exceptional",
        },
        {
          sku: "BRN-1007",
          itemName: lang === "ar" ? "فتة ميكس الوزير" : "Fatta Mix Al-Wazeer",
          category: lang === "ar" ? "الفتة" : "Fatta",
          unitsSold: 1850,
          sellingPrice: 90,
          salesRevenue: 166500,
          unitCost: 32.0,
          totalCogs: 59200,
          grossProfit: 107300,
          grossMarginPercent: 64.4,
          markupPercent: 181,
          profitabilityRating: "high",
        },
        {
          sku: "BRN-1008",
          itemName: lang === "ar" ? "فتة نوتيلا بالكريمة" : "Fatta Nutella",
          category: lang === "ar" ? "الفتة" : "Fatta",
          unitsSold: 1240,
          sellingPrice: 90,
          salesRevenue: 111600,
          unitCost: 31.0,
          totalCogs: 38440,
          grossProfit: 73160,
          grossMarginPercent: 65.6,
          markupPercent: 190,
          profitabilityRating: "high",
        },
        {
          sku: "BRN-1012",
          itemName: lang === "ar" ? "قشطوطة مانجا بالكريمة" : "Qashtouta Mango",
          category: lang === "ar" ? "القشطوطة" : "Qashtouta",
          unitsSold: 980,
          sellingPrice: 75,
          salesRevenue: 73500,
          unitCost: 24.5,
          totalCogs: 24010,
          grossProfit: 49490,
          grossMarginPercent: 67.3,
          markupPercent: 206,
          profitabilityRating: "exceptional",
        },
        {
          sku: "BRN-1004",
          itemName: lang === "ar" ? "رز بلبن بستاشيو فاخر" : "Rice Pudding Pistachio",
          category: lang === "ar" ? "عشاق الرز" : "Rice Pudding",
          unitsSold: 780,
          sellingPrice: 80,
          salesRevenue: 62400,
          unitCost: 34.0,
          totalCogs: 26520,
          grossProfit: 35880,
          grossMarginPercent: 57.5,
          markupPercent: 135,
          profitabilityRating: "high",
        },
        {
          sku: "BRN-1005",
          itemName: lang === "ar" ? "رز بلبن الوزير الخاص" : "Rice Pudding Al-Wazeer",
          category: lang === "ar" ? "عشاق الرز" : "Rice Pudding",
          unitsSold: 920,
          sellingPrice: 80,
          salesRevenue: 73600,
          unitCost: 28.0,
          totalCogs: 25760,
          grossProfit: 47840,
          grossMarginPercent: 65.0,
          markupPercent: 186,
          profitabilityRating: "high",
        },
        {
          sku: "BRN-1006",
          itemName: lang === "ar" ? "رز بلبن ساده بلدي" : "Plain Rice Pudding",
          category: lang === "ar" ? "عشاق الرز" : "Rice Pudding",
          unitsSold: 890,
          sellingPrice: 25,
          salesRevenue: 22250,
          unitCost: 8.5,
          totalCogs: 7565,
          grossProfit: 14685,
          grossMarginPercent: 66.0,
          markupPercent: 194,
          profitabilityRating: "high",
        },
        {
          sku: "BRN-1013",
          itemName: lang === "ar" ? "كاس سعادة كندر" : "Dessert Cup Kinder",
          category: lang === "ar" ? "كاسات السعادة" : "Happiness Cups",
          unitsSold: 640,
          sellingPrice: 65,
          salesRevenue: 41600,
          unitCost: 22.0,
          totalCogs: 14080,
          grossProfit: 27520,
          grossMarginPercent: 66.2,
          markupPercent: 195,
          profitabilityRating: "high",
        },
        {
          sku: "BRN-1016",
          itemName: lang === "ar" ? "بسبوسة مكسرات سمن بلدي" : "Basbousa Nuts",
          category: lang === "ar" ? "حلويات شرقية" : "Oriental Sweets",
          unitsSold: 310,
          sellingPrice: 140,
          salesRevenue: 43400,
          unitCost: 68.0,
          totalCogs: 21080,
          grossProfit: 22320,
          grossMarginPercent: 51.4,
          markupPercent: 106,
          profitabilityRating: "healthy",
        },
        {
          sku: "BRN-1017",
          itemName: lang === "ar" ? "كنافة نابلسية بالجبن العكاوي" : "Kunafa Nabulsi",
          category: lang === "ar" ? "حلويات شرقية" : "Oriental Sweets",
          unitsSold: 260,
          sellingPrice: 160,
          salesRevenue: 41600,
          unitCost: 82.0,
          totalCogs: 21320,
          grossProfit: 20280,
          grossMarginPercent: 48.8,
          markupPercent: 95,
          profitabilityRating: "healthy",
        },
        {
          sku: "BRN-1020",
          itemName: lang === "ar" ? "تورتة لوتس فاميلي" : "Lotus Cake Family",
          category: lang === "ar" ? "تورت وجاتوه" : "Cakes & Pastry",
          unitsSold: 95,
          sellingPrice: 320,
          salesRevenue: 30400,
          unitCost: 175.0,
          totalCogs: 16625,
          grossProfit: 13775,
          grossMarginPercent: 45.3,
          markupPercent: 83,
          profitabilityRating: "healthy",
        },
      ];
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

    case "sales_by_branch": {
      const totalDay = raw.reduce((acc, r) => acc + (Number(r["dailySales"]) || 0), 0);
      const totalMonth = raw.reduce((acc, r) => acc + (Number(r["monthlySales"]) || 0), 0);
      const totalYtd = raw.reduce((acc, r) => acc + (Number(r["ytdSales"]) || 0), 0);
      const topBranch = [...raw].sort((a, b) => (Number(b["monthlySales"]) || 0) - (Number(a["monthlySales"]) || 0))[0];

      summaryCards.push(
        {
          id: "branch_total_month",
          label: { ar: "إجمالي مبيعات الشهر (MTD)", en: "Total MTD Sales" },
          value: totalMonth,
          subtext: { ar: `لكافة الـ ${raw.length} فروع`, en: `Across ${raw.length} branches` },
          color: "brand",
        },
        {
          id: "branch_total_day",
          label: { ar: "مبيعات اليوم بالفروع", en: "Today Sales" },
          value: totalDay,
          subtext: { ar: "أدراج ونقاط بيع اليوم", en: "Today POS drawers" },
          color: "success",
        },
        {
          id: "branch_total_ytd",
          label: { ar: "مبيعات العام حتى تاريخه (YTD)", en: "Year-To-Date (YTD)" },
          value: totalYtd,
          subtext: { ar: "تراكمي مبيعات الفروع 2026", en: "Cumulative 2026" },
          color: "gold",
        },
        {
          id: "branch_top_performer",
          label: { ar: "الفرع الأعلى مبيعاً", en: "Top Performing Branch" },
          value: topBranch ? topBranch["branch"] : "—",
          subtext: {
            ar: topBranch ? `${Number(topBranch["monthlySales"]).toLocaleString()} ج.م (${topBranch["sharePercent"]}%)` : "",
            en: "Leading retail facility",
          },
          color: "brand",
        },
      );
      break;
    }

    case "sales_by_product": {
      const totalUnits = raw.reduce((acc, r) => acc + (Number(r["qtySold"]) || 0), 0);
      const totalRev = raw.reduce((acc, r) => acc + (Number(r["totalRevenue"]) || 0), 0);
      const topProd = [...raw].sort((a, b) => (Number(b["totalRevenue"]) || 0) - (Number(a["totalRevenue"]) || 0))[0];
      const categoriesCount = new Set(raw.map((r) => r["group"])).size;

      summaryCards.push(
        {
          id: "prod_total_rev",
          label: { ar: "إجمالي إيرادات الأصناف", en: "Total Product Revenue" },
          value: totalRev,
          subtext: { ar: `من بيع ${totalUnits.toLocaleString()} قطعة`, en: `From ${totalUnits.toLocaleString()} units` },
          color: "brand",
        },
        {
          id: "prod_total_units",
          label: { ar: "إجمالي الوحدات المباعة", en: "Total Units Sold" },
          value: totalUnits,
          subtext: { ar: `${raw.length} صنف مسجل`, en: `${raw.length} sweet items` },
          color: "success",
        },
        {
          id: "prod_top_seller",
          label: { ar: "الصنف الأعلى مبيعاً", en: "Top Best Seller" },
          value: topProd ? topProd["name"] : "—",
          subtext: {
            ar: topProd ? `${Number(topProd["totalRevenue"]).toLocaleString()} ج.م (${topProd["salesShare"]}%)` : "",
            en: "Highest revenue driver",
          },
          color: "gold",
        },
        {
          id: "prod_active_groups",
          label: { ar: "المجموعات والأقسام", en: "Category Groups" },
          value: `${categoriesCount} أقسام`,
          subtext: { ar: "عشاق الرز، الفتة، القشطوطة، شرقي", en: "Active groups" },
          color: "ink",
        },
      );
      break;
    }

    case "sales_by_hour": {
      const totalSales = raw.reduce((acc, r) => acc + (Number(r["totalSales"]) || 0), 0);
      const totalOrders = raw.reduce((acc, r) => acc + (Number(r["ordersCount"]) || 0), 0);
      const peakSlot = [...raw].sort((a, b) => (Number(b["totalSales"]) || 0) - (Number(a["totalSales"]) || 0))[0];
      const avgHourly = raw.length > 0 ? Math.round(totalSales / raw.length) : 0;

      summaryCards.push(
        {
          id: "hour_mega_peak",
          label: { ar: "ساعة الذروة الكبرى القصوى", en: "Peak Window of the Day" },
          value: peakSlot ? peakSlot["hourSlot"] : "—",
          subtext: {
            ar: peakSlot ? `${Number(peakSlot["totalSales"]).toLocaleString()} ج.م (${peakSlot["ordersCount"]} طلب)` : "",
            en: "Peak transaction volume",
          },
          color: "crimson",
        },
        {
          id: "hour_peak_sales",
          label: { ar: "مبيعات فترة الذروة", en: "Peak Window Sales" },
          value: peakSlot ? peakSlot["totalSales"] : 0,
          subtext: {
            ar: peakSlot ? `${peakSlot["salesShare"]}% من مبيعات اليوم` : "",
            en: "Daily peak share",
          },
          color: "gold",
        },
        {
          id: "hour_total_orders",
          label: { ar: "إجمالي فواتير اليوم", en: "Total Daily Orders" },
          value: totalOrders,
          subtext: { ar: `${totalSales.toLocaleString()} ج.م مبيعات`, en: "Across operating hours" },
          color: "brand",
        },
        {
          id: "hour_avg_hourly",
          label: { ar: "متوسط المبيعات بالساعة", en: "Average Hourly Sales" },
          value: avgHourly,
          subtext: { ar: "معدل التدفق المالي بالساعة", en: "Per business hour" },
          color: "success",
        },
      );
      break;
    }

    case "sales_forecast": {
      const totalProjected = raw.reduce((acc, r) => acc + (Number(r["projectedSales"]) || 0), 0);
      const avgGrowth = Math.round((raw.reduce((acc, r) => acc + (Number(r["trendGrowth"]) || 0), 0) / (raw.length || 1)) * 10) / 10;
      const topPeriod = [...raw].sort((a, b) => (Number(b["projectedSales"]) || 0) - (Number(a["projectedSales"]) || 0))[0];

      summaryCards.push(
        {
          id: "forecast_total_projected",
          label: { ar: "إجمالي المبيعات التنبؤية", en: "Total Projected Revenue" },
          value: totalProjected,
          subtext: { ar: "نموذج الذكاء التنبؤي 2026", en: "AI Predictive Model" },
          color: "brand",
        },
        {
          id: "forecast_growth_rate",
          label: { ar: "متوسط معدل النمو المتوقع", en: "Avg Projected Growth" },
          value: `+${avgGrowth}%`,
          subtext: { ar: "مقارنة بالفترات السابقة", en: "Vs baseline periods" },
          color: "success",
        },
        {
          id: "forecast_confidence",
          label: { ar: "دقة وموثوقية النموذج", en: "Model Confidence Score" },
          value: "94.8%",
          subtext: { ar: "معامل ثقة إحصائي مرتفع", en: "High statistical confidence" },
          color: "gold",
        },
        {
          id: "forecast_top_period",
          label: { ar: "أعلى فترة طلب متوقعة", en: "Peak Demand Period" },
          value: topPeriod ? topPeriod["period"] : "—",
          subtext: {
            ar: topPeriod ? `${Number(topPeriod["projectedSales"]).toLocaleString()} ج.م` : "",
            en: "Highest projected peak",
          },
          color: "crimson",
        },
      );
      break;
    }

    case "sales_consumption": {
      const totalConsumed = raw.reduce((acc, r) => acc + (Number(r["consumedQty"]) || 0), 0);
      const totalRev = raw.reduce((acc, r) => acc + (Number(r["totalRevenue"]) || 0), 0);
      const topItem = raw.find((r) => r["ranking"] === 1);
      const slowCount = raw.filter((r) => r["velocity"] === "slow" || r["velocity"] === "stagnant").length;

      summaryCards.push(
        {
          id: "consumption_top_item",
          label: { ar: "الصنف الأول استهلاكاً ومبيعاً", en: "Top Consumed Best Seller" },
          value: topItem ? topItem["name"] : "—",
          subtext: {
            ar: topItem ? `${Number(topItem["consumedQty"]).toLocaleString()} قطعة (${Number(topItem["totalRevenue"]).toLocaleString()} ج.م)` : "",
            en: "Number 1 customer favorite",
          },
          color: "success",
        },
        {
          id: "consumption_total_units",
          label: { ar: "إجمالي القطع المستهلكة", en: "Total Consumed Units" },
          value: totalConsumed,
          subtext: { ar: `${totalRev.toLocaleString()} ج.م إيرادات محققة`, en: "Consumed stock volume" },
          color: "brand",
        },
        {
          id: "consumption_fast_movers",
          label: { ar: "أصناف فائقة وسريعة الدوران", en: "Fast Moving SKUs" },
          value: `${raw.filter((r) => r["velocity"] === "ultra_fast" || r["velocity"] === "fast").length} أصناف`,
          subtext: { ar: "طلب مرتفع وتدوير سريع", en: "High turnover items" },
          color: "gold",
        },
        {
          id: "consumption_stagnant_alert",
          label: { ar: "أصناف راكدة / بطيئة الحركة", en: "Slow & Stagnant SKUs" },
          value: `${slowCount} أصناف`,
          subtext: { ar: "تتطلب عروض ترويجية وتخفيض", en: "Requires promo or reformulation" },
          color: slowCount > 0 ? "crimson" : "ink",
        },
      );
      break;
    }

    case "sales_payment_methods": {
      const totalAmt = raw.reduce((acc, r) => acc + (Number(r["totalAmount"]) || 0), 0);
      const totalOrders = raw.reduce((acc, r) => acc + (Number(r["ordersCount"]) || 0), 0);
      const cashRow = raw.find((r) => r["type"] === "cash");
      const electronicRows = raw.filter((r) => r["type"] === "electronic");
      const electronicTotal = electronicRows.reduce((acc, r) => acc + (Number(r["totalAmount"]) || 0), 0);
      const digitalShare = totalAmt > 0 ? Math.round((electronicTotal / totalAmt) * 1000) / 10 : 0;

      summaryCards.push(
        {
          id: "pay_total_collections",
          label: { ar: "إجمالي المتحصلات المالية", en: "Total Collections" },
          value: totalAmt,
          subtext: { ar: `${totalOrders.toLocaleString()} حركة سداد مسجلة`, en: `${totalOrders.toLocaleString()} transactions` },
          color: "brand",
        },
        {
          id: "pay_cash_share",
          label: { ar: "نسبة النقدية (كاش الفروع)", en: "Cash Drawer Share" },
          value: cashRow ? `${cashRow["sharePercent"]}%` : "0%",
          subtext: {
            ar: cashRow ? `${Number(cashRow["totalAmount"]).toLocaleString()} ج.م` : "",
            en: "Physical cash in drawers",
          },
          color: "success",
        },
        {
          id: "pay_digital_share",
          label: { ar: "نسبة المدفوعات الإلكترونية", en: "Digital Payments Share" },
          value: `${digitalShare}%`,
          subtext: {
            ar: `${electronicTotal.toLocaleString()} ج.م (فيزا + إنستاباي + فوري)`,
            en: "Card POS, InstaPay, Fawry",
          },
          color: "gold",
        },
        {
          id: "pay_net_settled",
          label: { ar: "صافي المتحصلات بعد العمولات", en: "Net Settled Revenue" },
          value: raw.reduce((acc, r) => acc + (Number(r["netCollected"]) || 0), 0),
          subtext: { ar: "بعد خصم رسوم البوابات والبطاقات", en: "Net after gateway fees" },
          color: "brand",
        },
      );
      break;
    }

    case "sales_channels": {
      const totalGross = raw.reduce((acc, r) => acc + (Number(r["grossSales"]) || 0), 0);
      const totalNet = raw.reduce((acc, r) => acc + (Number(r["netSales"]) || 0), 0);
      const inStoreRows = raw.filter((r) => r["channelType"] === "direct_branch");
      const inStoreTotal = inStoreRows.reduce((acc, r) => acc + (Number(r["grossSales"]) || 0), 0);
      const inStoreShare = totalGross > 0 ? Math.round((inStoreTotal / totalGross) * 1000) / 10 : 0;
      const appRows = raw.filter((r) => r["channelType"] === "food_app");
      const appTotal = appRows.reduce((acc, r) => acc + (Number(r["grossSales"]) || 0), 0);

      summaryCards.push(
        {
          id: "chan_total_gross",
          label: { ar: "إجمالي مبيعات كافة القنوات", en: "Total Multi-Channel Revenue" },
          value: totalGross,
          subtext: { ar: `صافي ${totalNet.toLocaleString()} ج.م بعد العمولات`, en: "Gross before commissions" },
          color: "brand",
        },
        {
          id: "chan_instore_share",
          label: { ar: "مبيعات معارض الفروع المباشرة", en: "In-Store Direct Share" },
          value: `${inStoreShare}%`,
          subtext: {
            ar: `${inStoreTotal.toLocaleString()} ج.م (تيك أواي + صالة)`,
            en: "Walk-in & Dine-in total",
          },
          color: "success",
        },
        {
          id: "chan_apps_sales",
          label: { ar: "مبيعات تطبيقات التوصيل (طلبات وفرها)", en: "Aggregators & Food Apps" },
          value: appTotal,
          subtext: {
            ar: `${raw.filter((r) => r["channelType"] === "food_app").reduce((s, r) => s + r["ordersCount"], 0).toLocaleString()} طلب عبر التطبيقات`,
            en: "Talabat, Waffarha orders",
          },
          color: "gold",
        },
        {
          id: "chan_fleet_growth",
          label: { ar: "نمو أسطول التوصيل المباشر", en: "Own Fleet Delivery Growth" },
          value: "+24.8%",
          subtext: { ar: "توفير عمولات التطبيقات الخارجية", en: "Direct delivery expansion" },
          color: "brand",
        },
      );
      break;
    }

    case "sales_cogs": {
      const totalRev = raw.reduce((acc, r) => acc + (Number(r["salesRevenue"]) || 0), 0);
      const totalCogs = raw.reduce((acc, r) => acc + (Number(r["totalCogs"]) || 0), 0);
      const totalProfit = raw.reduce((acc, r) => acc + (Number(r["grossProfit"]) || 0), 0);
      const avgMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 1000) / 10 : 0;

      summaryCards.push(
        {
          id: "cogs_total_rev",
          label: { ar: "إجمالي إيرادات المبيعات", en: "Total Sales Revenue" },
          value: totalRev,
          subtext: { ar: "قيمة المبيعات المحققة", en: "Gross sales value" },
          color: "brand",
        },
        {
          id: "cogs_total_cost",
          label: { ar: "تكلفة البضاعة المباعة (COGS)", en: "Total Cost of Goods Sold" },
          value: totalCogs,
          subtext: { ar: "تكلفة الخامات والتشغيل المباشر", en: "Ingredients & packaging cost" },
          color: "crimson",
        },
        {
          id: "cogs_gross_profit",
          label: { ar: "إجمالي مجمل الربح الهامشي", en: "Gross Profit Margin" },
          value: totalProfit,
          subtext: { ar: "الإيراد مطروحاً منه تكلفة الخامات", en: "Revenue minus COGS" },
          color: "success",
        },
        {
          id: "cogs_margin_percent",
          label: { ar: "نسبة هامش الربح الإجمالي", en: "Gross Margin %" },
          value: `${avgMargin}%`,
          subtext: { ar: "معدل ربحية ممتاز لقطاع الحلويات", en: "Confectionery industry benchmark" },
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

  // Sync with Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('company_settings').select('branding').limit(1).maybeSingle();
        const customReps = (data?.branding as any)?.custom_reports;
        if (Array.isArray(customReps) && customReps.length > 0) {
          setCustomReports(customReps);
        }
      } catch (err) {
        console.warn("[Reports Store] Could not load custom reports from Supabase:", err);
      }
    })();
  }, []);

  // Persist to Supabase and update state
  const persistCustomReports = useCallback(async (reports: CustomReportDefinition[]) => {
    setCustomReports(reports);
    try {
      const { data: existing } = await supabase.from('company_settings').select('id, branding').limit(1).maybeSingle();
      if (existing?.id) {
        const updatedBranding = { ...((existing.branding as any) || {}), custom_reports: reports };
        await supabase.from('company_settings').update({ branding: updatedBranding }).eq('id', existing.id);
      }
    } catch (err) {
      console.warn("[Reports Store] Failed to persist custom reports to Supabase:", err);
    }
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

// ============================================================================
// ALL-IN-ONE MASTER SALES EXCEL EXPORT (8 REPORTS IN 1 WORKBOOK)
// ============================================================================

export function exportAllSalesReportsToExcel({
  liveData,
  lang = "ar",
}: {
  liveData?: LiveDataSourceCollections | undefined;
  lang?: "ar" | "en";
}): boolean {
  try {
    const wb = XLSX.utils.book_new();

    const salesReportDefinitions = [
      { id: "branch_sales_ytd", sheet: lang === "ar" ? "1-مبيعات_الفروع" : "1-Branch_Sales" },
      { id: "product_sales_group", sheet: lang === "ar" ? "2-مبيعات_الأصناف" : "2-Product_Sales" },
      { id: "hourly_sales_analysis", sheet: lang === "ar" ? "3-مبيعات_بالساعة" : "3-Hourly_Sales" },
      { id: "sales_forecast_ai", sheet: lang === "ar" ? "4-توقعات_المبيعات" : "4-Sales_Forecast" },
      { id: "consumption_sales_velocity", sheet: lang === "ar" ? "5-الاستهلاكات_والأصناف" : "5-Consumption_Movement" },
      { id: "payment_methods_analysis", sheet: lang === "ar" ? "6-طرق_الدفع" : "6-Payment_Methods" },
      { id: "sales_channels_breakdown", sheet: lang === "ar" ? "7-مصادر_وقنوات_البيع" : "7-Sales_Channels" },
      { id: "sales_cogs_margins", sheet: lang === "ar" ? "8-تكلفة_المبيعات_COGS" : "8-COGS_and_Margins" },
    ];

    const consolidatedKpis: Record<string, any>[] = [];

    for (const def of salesReportDefinitions) {
      const rep = STANDARD_REPORTS.find((r) => r.id === def.id);
      if (!rep) continue;

      const exec = executeReportQuery({
        dataSource: rep.dataSource,
        lang,
        liveData,
      });

      // Format Rows
      const exportRows = exec.rows.map((row) => {
        const formatted: Record<string, any> = {};
        rep.columns.forEach((col) => {
          const headerName = lang === "ar" ? col.label.ar : col.label.en;
          let cellVal = row[col.key];
          if (col.type === "badge" && col.badgeMap && cellVal && col.badgeMap[cellVal]) {
            const badgeInfo = col.badgeMap[cellVal];
            cellVal = lang === "ar" ? badgeInfo?.label.ar : badgeInfo?.label.en;
          }
          formatted[headerName] = cellVal ?? "";
        });
        return formatted;
      });

      const ws = XLSX.utils.json_to_sheet(exportRows);
      ws["!cols"] = rep.columns.map((col) => ({
        wch: Math.max((lang === "ar" ? col.label.ar : col.label.en).length * 2, 18),
      }));
      XLSX.utils.book_append_sheet(wb, ws, def.sheet);

      // Collect KPIs
      exec.summaryCards.forEach((c) => {
        consolidatedKpis.push({
          [lang === "ar" ? "التقرير" : "Report"]: lang === "ar" ? rep.name.ar : rep.name.en,
          [lang === "ar" ? "المؤشر المالي" : "Metric"]: lang === "ar" ? c.label.ar : c.label.en,
          [lang === "ar" ? "القيمة" : "Value"]: c.value,
          [lang === "ar" ? "التفاصيل والملاحظات" : "Details"]: c.subtext ? (lang === "ar" ? c.subtext.ar : c.subtext.en) : "",
        });
      });
    }

    // Sheet 9: Summary Dashboard
    if (consolidatedKpis.length > 0) {
      const kpiWs = XLSX.utils.json_to_sheet(consolidatedKpis);
      kpiWs["!cols"] = [{ wch: 35 }, { wch: 30 }, { wch: 22 }, { wch: 35 }];
      XLSX.utils.book_append_sheet(wb, kpiWs, lang === "ar" ? "لوحة_المؤشرات_الشاملة" : "Executive_KPIs");
    }

    const dateStamp = new Date().toISOString().slice(0, 10);
    const downloadName = lang === "ar"
      ? `تقارير_المبيعات_الشاملة_حلويات_الوزير_${dateStamp}.xlsx`
      : `Al_Wazeer_Master_Sales_Reports_${dateStamp}.xlsx`;

    return safeDownloadWorkbook(wb, downloadName);
  } catch (err) {
    console.error("[Reports Store] Master Excel Export failed:", err);
    return false;
  }
}

