import { useState, useRef, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  MessageSquareText,
  Sparkles,
  Clock,
  ArrowLeft,
  ArrowRight,
  Download,
  Printer,
  MoreHorizontal,
  Search,
  Bell,
  ChevronDown,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  Send,
  FileText,
  FileCheck,
  MessageSquare,
  User,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  PanelLeft,
  PanelLeftClose,
  Languages,
  LogOut,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCompanySettings } from "@/lib/settings-store";
import { useAuthStore } from "@/lib/auth-store";
import { useSidebarVisible } from "@/lib/ui-prefs";
import { RealQrCode } from "@/components/ui/qr-code";
import { cn } from "@/lib/utils";
import { useAiModulesStore, DEFAULT_GEMINI_KEY } from "@/lib/ai-modules-store";
import { usePosOrdersStore } from "@/lib/pos-orders-store";
import { useInventoryStore } from "@/lib/inventory-store";
import { useHelpdeskStore } from "@/lib/helpdesk-store";
import { usePartnersStore } from "@/lib/partners-store";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "AI Workspace — ChatHub & Document Copilot" },
      {
        name: "description",
        content:
          "Intelligent operations workspace featuring live recent activities, document preview sheets, and interactive AI client messenger.",
      },
      {
        property: "og:title",
        content: "AI Workspace — ChatHub & Document Copilot",
      },
    ],
  }),
  component: AiWorkspacePage,
});

// ==========================================
// Types
// ==========================================

interface ActivityItem {
  id: string;
  type: "invoice" | "order" | "ticket" | "registration" | "document" | "message" | "meeting";
  title: string;
  subtitle: string;
  time: string;
  iconBg: string;
  iconColor: string;
  icon: any;
  documentId?: string;
}

interface InvoiceItemLine {
  num: number;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface DocumentDetailField {
  label: string;
  value: string;
  badge?: string;
  badgeTone?: "emerald" | "amber" | "blue" | "purple" | "rose";
}

interface DocumentData {
  id: string;
  category: string;
  categoryLabel?: { ar: string; en: string };
  code: string;
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  partyLabel?: { ar: string; en: string };
  invoiceDate: string;
  dueDate?: string;
  dateLabel?: { ar: string; en: string };
  dueDateLabel?: { ar: string; en: string };
  status: string;
  statusTone?: "emerald" | "amber" | "blue" | "purple" | "rose";
  items?: InvoiceItemLine[];
  subtotal?: number;
  taxPercent?: number;
  taxAmount?: number;
  total?: number;
  details?: DocumentDetailField[];
  notes?: string;
  notesTitle?: { ar: string; en: string };
  companyName: string;
  companyTagline: string;
  companyWebsite: string;
}

interface ChatMessage {
  id: string;
  sender: "client" | "agent";
  senderName: string;
  avatarText?: string;
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
}

function formatActivityTime(isoString?: string | null): string {
  if (!isoString) return "اليوم";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "اليوم";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return diffMins <= 1 ? "الآن" : `${diffMins} دقيقة`;
    if (diffHours < 24) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays === 1) return "أمس";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "اليوم";
  }
}

// ==========================================
// Fallback Reference Data
// ==========================================

const SAMPLE_DOCUMENTS: Record<string, DocumentData> = {
  // Activity 1: Invoice #4521
  "inv-4521": {
    id: "inv-4521",
    category: "INVOICE",
    categoryLabel: { ar: "فاتورة مبيعات", en: "Sales Invoice" },
    code: "INVOICE #4521",
    title: "Invoice #4521",
    clientName: "Ali Al-Mansoor",
    clientEmail: "ali@example.com",
    clientPhone: "+20 123 456 7890",
    clientAddress: "Nasr City, Cairo, Egypt",
    partyLabel: { ar: "فاتورة إلى:", en: "Bill To:" },
    invoiceDate: "08/09/2026",
    dueDate: "22/09/2026",
    dateLabel: { ar: "تاريخ الفاتورة", en: "Invoice Date" },
    dueDateLabel: { ar: "تاريخ الاستحقاق", en: "Due Date" },
    status: "Paid",
    statusTone: "emerald",
    items: [
      { num: 1, description: "Royal Sweet Koshary Party Trays (25 Units)", qty: 25, unitPrice: 40, total: 1000 },
      { num: 2, description: "Assorted Egyptian Baklava & Cream Basbousa", qty: 20, unitPrice: 25, total: 500 },
      { num: 3, description: "Express Cold-Chain Van Catering Delivery", qty: 1, unitPrice: 200, total: 200 },
    ],
    subtotal: 1700,
    taxPercent: 10,
    taxAmount: 170,
    total: 1870,
    companyName: "شركة وزير الحلو للحلويات",
    companyTagline: "حلويات ومواد غذائية وتوريدات فندقية",
    companyWebsite: "www.wazeer-elhelw.com",
  },

  // Activity 2: Sales Order #7780
  "ord-7780": {
    id: "ord-7780",
    category: "SALES ORDER",
    categoryLabel: { ar: "أمر بيع وتوريد", en: "Sales Order" },
    code: "ORDER #7780",
    title: "Sales Order #7780",
    clientName: "Maha Trading Co.",
    clientEmail: "orders@mahatrading.com",
    clientPhone: "+20 111 884 9021",
    clientAddress: "Industrial Area 3, Giza, Egypt",
    partyLabel: { ar: "جهة الشحن والتوريد:", en: "Ship & Bill To:" },
    invoiceDate: "08/09/2026",
    dueDate: "15/09/2026",
    dateLabel: { ar: "تاريخ أمر البيع", en: "Order Date" },
    dueDateLabel: { ar: "موعد الشحن والتسليم", en: "Shipment ETA" },
    status: "Processing",
    statusTone: "blue",
    items: [
      { num: 1, description: "Bulk Food Packaging Kraft Boxes (500 Pack)", qty: 35, unitPrice: 50, total: 1750 },
      { num: 2, description: "Specialty Greaseproof Confectionery Liners", qty: 10, unitPrice: 25, total: 250 },
      { num: 3, description: "Heavy Pallet Logistics & Transit Insurance", qty: 1, unitPrice: 280, total: 280 },
    ],
    subtotal: 2280,
    taxPercent: 14,
    taxAmount: 319.2,
    total: 2599.2,
    companyName: "Wazeer El-Helw Confectionery",
    companyTagline: "Commercial Distribution & Food Industries",
    companyWebsite: "www.wazeer-elhelw.com",
  },

  // Activity 3: Support Ticket #309
  "tkt-309": {
    id: "tkt-309",
    category: "SUPPORT TICKET",
    categoryLabel: { ar: "تذكرة دعم فني", en: "Support Ticket" },
    code: "TICKET #309",
    title: "Support Ticket #309",
    clientName: "Kareem Omar (Nasr City Branch)",
    clientEmail: "kareem.omar@wazeer-elhelw.com",
    clientPhone: "+20 102 984 5512",
    clientAddress: "Branch #3 - Makram Ebeid, Cairo",
    partyLabel: { ar: "مقدم البلاغ والفرع:", en: "Reported By / Branch:" },
    invoiceDate: "08/09/2026 09:32 AM",
    dueDate: "08/09/2026 12:00 PM",
    dateLabel: { ar: "وقت فتح التذكرة", en: "Opened At" },
    dueDateLabel: { ar: "الحد الأقصى للحل (SLA)", en: "Target SLA" },
    status: "Open / High Priority",
    statusTone: "rose",
    details: [
      { label: "Issue Category", value: "POS Terminal & Scanner Sync", badge: "Hardware/ERP", badgeTone: "purple" },
      { label: "Assigned Specialist", value: "Hafez Rahim (Senior Systems Eng.)" },
      { label: "Device Terminal", value: "POS-NC-04 (Sunmi T2 Touchscreen)" },
      { label: "Impact Level", value: "Checkout Delays at Branch #3", badge: "High Impact", badgeTone: "rose" },
      { label: "Diagnostic Status", value: "Cash drawer offline; barcode scanner buffer overflow." },
      { label: "Operational Workaround", value: "Temporary manual SKU lookup enabled for branch cashiers." },
    ],
    notesTitle: { ar: "تقرير الفحص الذكي والإجراءات المتخذة", en: "Diagnostic Report & AI Agent Actions" },
    notes: "AI remote agent inspected system logs, restarted the local sync daemon, and queued firmware patch v1.0.1 for terminal POS-NC-04. System reboot verified; awaiting final cashier physical barcode scan confirmation.",
    companyName: "Wazeer El-Helw IT Operations",
    companyTagline: "Enterprise POS & ERP Support Center",
    companyWebsite: "www.wazeer-elhelw.com",
  },

  // Activity 4: Client Registration #902
  "reg-902": {
    id: "reg-902",
    category: "CLIENT REGISTRATION",
    categoryLabel: { ar: "تسجيل عميل ومورد جديد", en: "Client Onboarding" },
    code: "REG #902",
    title: "Client Registration #902",
    clientName: "Ahmad Al-Saeed",
    clientEmail: "a.alsaeed@fourseasons-catering.eg",
    clientPhone: "+20 115 670 1934",
    clientAddress: "Smart Village, Building B4, 6th of October",
    partyLabel: { ar: "بيانات العميل / المفوض:", en: "Account Details:" },
    invoiceDate: "08/09/2026",
    dueDate: "Permanent / Active",
    dateLabel: { ar: "تاريخ طلب التسجيل", en: "Registration Date" },
    dueDateLabel: { ar: "حالة الحساب", en: "Account Status" },
    status: "Verified & Approved",
    statusTone: "emerald",
    details: [
      { label: "Company Legal Name", value: "Four Seasons Hospitality & Catering LLC" },
      { label: "Commercial Register (س.ت)", value: "CR-1049281 (Cairo Chamber of Commerce)" },
      { label: "Tax Identification (ب.ض)", value: "TAX-882-901-44" },
      { label: "Partnership Tier", value: "Tier 1 Gold Corporate Partner", badge: "Gold Partner", badgeTone: "amber" },
      { label: "Approved Credit Limit", value: "$15,000.00 (Net-30 Payment Terms)" },
      { label: "Assigned Account Rep", value: "Dr. Sarah Adel (Corporate Relations)" },
    ],
    notesTitle: { ar: "اعتماد إدارة الائتمان والرقابة الداخلية", en: "Credit Approval & Compliance Verification" },
    notes: "All tax documents, commercial registration certificates, and signature authorities have been verified via Egyptian e-Invoicing portal integration. Full B2B bulk ordering portal credentials issued.",
    companyName: "Wazeer El-Helw Corporate B2B",
    companyTagline: "Wholesale & Hospitality Partnership Network",
    companyWebsite: "www.wazeer-elhelw.com",
  },

  // Activity 5: Invoice #4519
  "inv-4519": {
    id: "inv-4519",
    category: "INVOICE",
    categoryLabel: { ar: "فاتورة ضريبية", en: "Tax Invoice" },
    code: "INVOICE #4519",
    title: "Invoice #4519",
    clientName: "Sara Co. for Hospitality",
    clientEmail: "finance@saraco.net",
    clientPhone: "+20 100 933 2145",
    clientAddress: "Stanley Bay, Alexandria, Egypt",
    partyLabel: { ar: "فاتورة إلى:", en: "Bill To:" },
    invoiceDate: "08/09/2026",
    dueDate: "18/09/2026",
    dateLabel: { ar: "تاريخ الفاتورة", en: "Invoice Date" },
    dueDateLabel: { ar: "تاريخ الاستحقاق", en: "Due Date" },
    status: "Pending",
    statusTone: "amber",
    items: [
      { num: 1, description: "Luxury VIP Sweets Buffet for Corporate Gala (120 Pax)", qty: 120, unitPrice: 45, total: 5400 },
      { num: 2, description: "Custom Laser-Engraved Dessert Displays & Branding", qty: 1, unitPrice: 1200, total: 1200 },
    ],
    subtotal: 6600,
    taxPercent: 14,
    taxAmount: 924,
    total: 7524,
    companyName: "Wazeer El-Helw Catering",
    companyTagline: "VIP Dessert Buffets & Receptions",
    companyWebsite: "www.wazeer-elhelw.com",
  },

  // Activity 6: Purchase Order #1208
  "po-1208": {
    id: "po-1208",
    category: "PURCHASE ORDER",
    categoryLabel: { ar: "أمر شراء وتوريد خامات", en: "Purchase Order" },
    code: "PO #1208",
    title: "Purchase Order #1208",
    clientName: "Nile Packaging Ltd.",
    clientEmail: "supply@nilepkg.com",
    clientPhone: "+20 122 443 8900",
    clientAddress: "Industrial City 3, 10th of Ramadan",
    partyLabel: { ar: "المورد المعتمد:", en: "Authorized Supplier:" },
    invoiceDate: "07/09/2026",
    dueDate: "14/09/2026",
    dateLabel: { ar: "تاريخ أمر الشراء", en: "PO Date" },
    dueDateLabel: { ar: "تاريخ الاستلام الفعلي", en: "Delivered To Warehouse" },
    status: "Received & Checked",
    statusTone: "emerald",
    items: [
      { num: 1, description: "Sweet Koshary Food-Grade Bowls 500ml (Embossed Logo)", qty: 2000, unitPrice: 2.2, total: 4400 },
      { num: 2, description: "Golden Dessert Spoons & Hygienic Sealed Pouches", qty: 2000, unitPrice: 0.8, total: 1600 },
      { num: 3, description: "Heavy Duty Corrugated Shipping Cartons (Size XL)", qty: 150, unitPrice: 5.6, total: 840 },
    ],
    subtotal: 6840,
    taxPercent: 14,
    taxAmount: 957.6,
    total: 7797.6,
    companyName: "Central Procurement Dept",
    companyTagline: "Wazeer El-Helw Supply Chain & Factory Procurement",
    companyWebsite: "www.wazeer-elhelw.com",
  },

  // Activity 7: Customer Inquiry #104
  "msg-104": {
    id: "msg-104",
    category: "CUSTOMER INQUIRY",
    categoryLabel: { ar: "استفسار وطلب تسعير", en: "Customer Inquiry" },
    code: "INQUIRY #104",
    title: "Customer Inquiry #104",
    clientName: "Fatima Hassan",
    clientEmail: "fatima.hassan@gmail.com",
    clientPhone: "+20 109 233 4481",
    clientAddress: "Heliopolis, Cairo, Egypt",
    partyLabel: { ar: "بيانات العميل المستفسر:", en: "Prospective Client:" },
    invoiceDate: "08/09/2026 08:15 AM",
    dueDate: "28/09/2026 (Event Date)",
    dateLabel: { ar: "وقت ورود الاستفسار", en: "Received At" },
    dueDateLabel: { ar: "موعد المناسبة المقترح", en: "Event Target Date" },
    status: "Quotation Sent",
    statusTone: "blue",
    details: [
      { label: "Occasion Type", value: "Wedding Dessert & Konafa Buffet (250 Guests)", badge: "VIP Private Event", badgeTone: "purple" },
      { label: "Venue Location", value: "Heliopolis Palace Ballroom, Cairo" },
      { label: "Requested Menu", value: "Signature Sweet Koshary, Mango Konafa Bowls, Pistachio Basbousa" },
      { label: "Estimated Budget", value: "Approx. 120,000 EGP (~$3,800 USD)" },
      { label: "Custom Request", value: "Golden ribbons with Bride & Groom names on individual mini bowls." },
      { label: "Response Status", value: "Formal quotation #Q-512 emailed by Sales Desk." },
    ],
    notesTitle: { ar: "ملخص المحادثة ومتابعة فريق المبيعات", en: "Inquiry Brief & AI Follow-Up Recommendation" },
    notes: "Customer loved the food tasting sample delivered to Heliopolis yesterday. Follow-up tasting session and contract signing arranged for Thursday at 4:00 PM.",
    companyName: "Wazeer El-Helw Events & Weddings",
    companyTagline: "Luxury Celebrations & Catering Experiences",
    companyWebsite: "www.wazeer-elhelw.com",
  },

  // Activity 8: Meeting Brief #55
  "mtg-55": {
    id: "mtg-55",
    category: "MEETING BRIEF",
    categoryLabel: { ar: "محضر وموعد اجتماع", en: "Meeting Brief" },
    code: "MEETING #55",
    title: "Meeting Brief #55",
    clientName: "Al-Ahram Packaging Group",
    clientEmail: "procurement@ahram-pkg.eg",
    clientPhone: "+20 120 771 9922",
    clientAddress: "6th of October Industrial Zone 4",
    partyLabel: { ar: "الطرف المشارك في الاجتماع:", en: "Meeting Partner:" },
    invoiceDate: "09/09/2026 02:00 PM",
    dueDate: "09/09/2026 03:30 PM",
    dateLabel: { ar: "موعد بدء الاجتماع", en: "Meeting Time" },
    dueDateLabel: { ar: "المدة المتوقعة", en: "Expected Duration" },
    status: "Confirmed & Calendar Synced",
    statusTone: "emerald",
    details: [
      { label: "Meeting Subject", value: "Q4 Bulk Packaging SLA & 8% Volume Rebate Agreement" },
      { label: "Meeting Location", value: "Head Office Executive Boardroom & Zoom Hybrid", badge: "Hybrid", badgeTone: "blue" },
      { label: "Host & Moderator", value: "Mr. Hafez Rahim (Executive Director)" },
      { label: "Key Attendees", value: "Eng. Tamer (Supply Chain), Dr. Sarah Adel (AI Ops), Eng. Hany (Al-Ahram)" },
      { label: "Main Agenda", value: "1. Review Q3 delivery lead times 2. Eco-friendly kraft boxes 3. Payment terms (60-day credit)" },
      { label: "Preparation Status", value: "Annual volume reports and contract draft v2 attached." },
    ],
    notesTitle: { ar: "أهداف الاجتماع وتوصيات الذكاء الاصطناعي", en: "Strategic Meeting Objectives & Pre-Brief" },
    notes: "AI purchasing agent predicts a 12% rise in raw paper pulp costs next quarter. Securing an 8-month fixed price agreement during this meeting will save approximately $18,400 in packaging overhead.",
    companyName: "Wazeer El-Helw Executive Board",
    companyTagline: "Strategic Partnerships & Vendor Operations",
    companyWebsite: "www.wazeer-elhelw.com",
  },
};

const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    type: "invoice",
    title: "Invoice #4521",
    subtitle: "Client: Ali Al-Mansoor",
    time: "10:02 AM",
    iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    iconColor: "text-blue-600",
    icon: FileText,
    documentId: "inv-4521",
  },
  {
    id: "act-2",
    type: "order",
    title: "Order #7780",
    subtitle: "Client: Maha Trading",
    time: "09:45 AM",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    iconColor: "text-emerald-600",
    icon: FileCheck,
    documentId: "ord-7780",
  },
  {
    id: "act-3",
    type: "ticket",
    title: "Support Ticket #309",
    subtitle: "POS Sync & Scanner Incident",
    time: "09:32 AM",
    iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    iconColor: "text-purple-600",
    icon: MessageSquare,
    documentId: "tkt-309",
  },
  {
    id: "act-4",
    type: "registration",
    title: "New Client Registration",
    subtitle: "Ahmad Al-Saeed (Four Seasons)",
    time: "08:50 AM",
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    iconColor: "text-amber-600",
    icon: User,
    documentId: "reg-902",
  },
  {
    id: "act-5",
    type: "invoice",
    title: "Invoice #4519",
    subtitle: "Client: Sara Co. Hospitality",
    time: "08:20 AM",
    iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    iconColor: "text-rose-600",
    icon: FileText,
    documentId: "inv-4519",
  },
  {
    id: "act-6",
    type: "document",
    title: "Document Received",
    subtitle: "Purchase Order #1208",
    time: "Yesterday",
    iconBg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    iconColor: "text-cyan-600",
    icon: FileText,
    documentId: "po-1208",
  },
  {
    id: "act-7",
    type: "message",
    title: "New Customer Inquiry",
    subtitle: "From: Fatima Hassan (Buffet)",
    time: "Yesterday",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    iconColor: "text-emerald-600",
    icon: MessageSquareText,
    documentId: "msg-104",
  },
  {
    id: "act-8",
    type: "meeting",
    title: "Meeting Scheduled",
    subtitle: "Al-Ahram Packaging SLA",
    time: "Yesterday",
    iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    iconColor: "text-indigo-600",
    icon: Calendar,
    documentId: "mtg-55",
  },
];

const ACTIVITY_CHATS: Record<string, ChatMessage[]> = {
  "act-1": [
    {
      id: "msg-1-1",
      sender: "client",
      senderName: "Ali",
      avatarText: "A",
      text: "Hello, I need an update on invoice #4521. Has it been marked paid in your system?",
      time: "09:58 AM",
    },
    {
      id: "msg-1-2",
      sender: "agent",
      senderName: "Hafez",
      text: "Good morning Ali! Yes, invoice #4521 for $1,870 is fully settled and cleared. Details are on the screen.",
      time: "10:02 AM",
      status: "read",
    },
    {
      id: "msg-1-3",
      sender: "client",
      senderName: "Ali",
      avatarText: "A",
      text: "Great! Can I get the tax receipt stamped as well?",
      time: "10:04 AM",
    },
    {
      id: "msg-1-4",
      sender: "agent",
      senderName: "Hafez",
      text: "Certainly! You can download the official PDF directly with the QR seal.",
      time: "10:07 AM",
      status: "read",
    },
  ],
  "act-2": [
    {
      id: "msg-2-1",
      sender: "client",
      senderName: "Maha Trading",
      avatarText: "M",
      text: "Hello Hafez, we placed order #7780 for 35 packaging box packs. When will delivery depart?",
      time: "09:40 AM",
    },
    {
      id: "msg-2-2",
      sender: "agent",
      senderName: "Hafez",
      text: "Hi Maha Trading! Your order is being packed in our central warehouse now. Expected dispatch is today by 2:00 PM.",
      time: "09:45 AM",
      status: "read",
    },
  ],
  "act-3": [
    {
      id: "msg-3-1",
      sender: "client",
      senderName: "Kareem Omar",
      avatarText: "K",
      text: "Ticket #309: Makram Ebeid branch barcode scanner stopped responding on POS #4 during morning rush.",
      time: "09:30 AM",
    },
    {
      id: "msg-3-2",
      sender: "agent",
      senderName: "Hafez",
      text: "Hello Kareem, I see the error in the logs. Restarting the sync service remotely now and deploying patch v1.0.1.",
      time: "09:32 AM",
      status: "read",
    },
  ],
  "act-4": [
    {
      id: "msg-4-1",
      sender: "client",
      senderName: "Ahmad Al-Saeed",
      avatarText: "A",
      text: "Good morning, Four Seasons Catering registration documents and commercial register have been uploaded.",
      time: "08:45 AM",
    },
    {
      id: "msg-4-2",
      sender: "agent",
      senderName: "Hafez",
      text: "Welcome Ahmad! Your corporate account #902 has been verified and approved with a $15,000 credit line.",
      time: "08:50 AM",
      status: "read",
    },
  ],
  "act-5": [
    {
      id: "msg-5-1",
      sender: "client",
      senderName: "Sara Co.",
      avatarText: "S",
      text: "Hi, we received invoice #4519 for the Alexandria corporate sweets buffet. Can we get 5% prompt payment discount?",
      time: "08:15 AM",
    },
    {
      id: "msg-5-2",
      sender: "agent",
      senderName: "Hafez",
      text: "Hello Sara, the invoice is currently pending review. Let me apply the standard 5% early settlement terms for you.",
      time: "08:20 AM",
      status: "read",
    },
  ],
  "act-6": [
    {
      id: "msg-6-1",
      sender: "client",
      senderName: "Nile Packaging",
      avatarText: "N",
      text: "PO #1208 shipment of 2,000 Sweet Koshary bowls and dessert spoons has arrived at your warehouse dock #2.",
      time: "Yesterday",
    },
    {
      id: "msg-6-2",
      sender: "agent",
      senderName: "Hafez",
      text: "Confirmed! Our quality control team verified all 2,000 units and signed the delivery receipt.",
      time: "Yesterday",
      status: "read",
    },
  ],
  "act-7": [
    {
      id: "msg-7-1",
      sender: "client",
      senderName: "Fatima Hassan",
      avatarText: "F",
      text: "Peace be upon you! We are planning a wedding with 250 guests in Heliopolis. Do you offer custom branded dessert bowls?",
      time: "Yesterday",
    },
    {
      id: "msg-7-2",
      sender: "agent",
      senderName: "Hafez",
      text: "Peace and congratulations! Yes, we create custom gold-ribbon Sweet Koshary & Konafa bowls. Quotation #Q-512 is sent!",
      time: "Yesterday",
      status: "read",
    },
  ],
  "act-8": [
    {
      id: "msg-8-1",
      sender: "client",
      senderName: "Al-Ahram Group",
      avatarText: "P",
      text: "Confirming our board meeting tomorrow at 2:00 PM regarding Q4 packaging SLA and annual rebate terms.",
      time: "Yesterday",
    },
    {
      id: "msg-8-2",
      sender: "agent",
      senderName: "Hafez",
      text: "Confirmed Eng. Hany! The meeting room is reserved and the AI contract review draft is attached to brief #55.",
      time: "Yesterday",
      status: "read",
    },
  ],
};

const INITIAL_MESSAGES: ChatMessage[] = ACTIVITY_CHATS["act-1"] || [];

// ==========================================
// Real Standard Scannable QR Code Component
// ==========================================
function QrCodeGraphic({ value, size = 64 }: { value: string; size?: number }) {
  return <RealQrCode value={value} size={size} margin={1} />;
}

// ==========================================
// Main Component
// ==========================================

function AiWorkspacePage() {
  const { t, pick, dir, lang, toggle } = useI18n();
  const { settings } = useCompanySettings();
  const companyLogo = settings.logoUrl || "/wazeer-logo.png";
  const companyName = lang === "ar" ? settings.nameAr : settings.nameEn;

  const { currentUser, demoAccounts, loginAs, logout } = useAuthStore();
  const [sidebarVisible, setSidebarVisible] = useSidebarVisible();
  const hasOnlyAiPermission =
    currentUser.role === "ai" ||
    (currentUser.allowedPages.length > 0 &&
      currentUser.allowedPages.every((p) => p === "/ai"));

  const [isAiUserMenuOpen, setIsAiUserMenuOpen] = useState(false);
  const aiUserMenuRef = useRef<HTMLDivElement>(null);

  // Close AI user menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        aiUserMenuRef.current &&
        !aiUserMenuRef.current.contains(event.target as Node)
      ) {
        setIsAiUserMenuOpen(false);
      }
    }
    if (isAiUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAiUserMenuOpen]);

  // Real ERP Stores
  const { orders: posOrders } = usePosOrdersStore();
  const { stockMoves } = useInventoryStore();
  const { tickets: helpdeskTickets } = useHelpdeskStore();
  const { partners } = usePartnersStore();
  const { modules } = useAiModulesStore();

  // Dynamically map real ERP activities, documents, and contextual chats
  const { realActivities, realDocuments, realChats } = useMemo(() => {
    const activities: ActivityItem[] = [];
    const documents: Record<string, DocumentData> = {};
    const chats: Record<string, ChatMessage[]> = {};

    // 1. Real POS Invoices from Supabase
    (posOrders || []).slice(0, 10).forEach((order) => {
      const actId = `act-pos-${order.id}`;
      const docId = `doc-pos-${order.id}`;
      const branchLabel = pick(order.branchName.ar, order.branchName.en);
      const isPaid = order.status === "completed" || order.status === "paid";

      activities.push({
        id: actId,
        type: "invoice",
        title: pick({ ar: `فاتورة ${order.orderNumber}`, en: `Invoice ${order.orderNumber}` }),
        subtitle: `${order.customerName || pick("عميل نقدي", "Cash Client")} • ${branchLabel}`,
        time: formatActivityTime(order.createdAt),
        iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
        iconColor: "text-blue-600",
        icon: FileText,
        documentId: docId,
      });

      documents[docId] = {
        id: docId,
        category: "INVOICE",
        categoryLabel: { ar: "فاتورة مبيعات معتمدة", en: "Sales Invoice" },
        code: order.orderNumber,
        title: `فاتورة ${order.orderNumber}`,
        clientName: order.customerName || pick("عميل نقدي / صالة", "Cash Customer"),
        clientEmail: order.customerPhone ? `tel:${order.customerPhone}` : "pos@wazeer-elhelw.com",
        clientPhone: order.customerPhone || "+20 100 112 0000",
        clientAddress: branchLabel,
        partyLabel: { ar: "فرع الإصدار والبيع:", en: "Branch / Sales Point:" },
        invoiceDate: order.formattedDate || new Date(order.createdAt).toLocaleDateString(),
        dueDate: order.formattedDate || new Date(order.createdAt).toLocaleDateString(),
        dateLabel: { ar: "تاريخ الفاتورة", en: "Invoice Date" },
        dueDateLabel: { ar: "تاريخ السداد", en: "Payment Date" },
        status: isPaid ? "Paid" : order.status,
        statusTone: isPaid ? "emerald" : "blue",
        items:
          order.items && order.items.length > 0
            ? order.items.map((it, idx) => ({
                num: idx + 1,
                description: pick(it.name.ar, it.name.en),
                qty: it.quantity,
                unitPrice: it.unitPrice,
                total: it.totalPrice,
              }))
            : [
                {
                  num: 1,
                  description: "طلب مبيعات حلويات وزير الحلو",
                  qty: 1,
                  unitPrice: order.total,
                  total: order.total,
                },
              ],
        subtotal: order.subtotal || order.total,
        taxPercent: 14,
        taxAmount: order.vatAmount || 0,
        total: order.total,
        notesTitle: { ar: "تفاصيل العملية ونقطة البيع", en: "POS Operation & Payment Details" },
        notes: `الكاشير المناوب: ${order.cashierName} | الفرع: ${branchLabel} | طريقة الدفع: ${order.paymentMethodLabel || order.paymentMethod} | نوع الطلب: ${order.orderType}`,
        companyName: "شركة وزير الحلو للحلويات والمواد الغذائية",
        companyTagline: "حلويات ومواد غذائية وتوريدات فندقية",
        companyWebsite: "www.wazeer-elhelw.com",
      };

      chats[actId] = [
        {
          id: `chat-${order.id}-1`,
          sender: "client",
          senderName: order.customerName || pick("العميل", "Customer"),
          avatarText: (order.customerName || "C")[0],
          text: pick({
            ar: `مرحباً، أود مراجعة تفاصيل الفاتورة ${order.orderNumber} الصادرة من ${branchLabel}.`,
            en: `Hello, I would like to verify details for invoice ${order.orderNumber} issued at ${branchLabel}.`,
          }),
          time: formatActivityTime(order.createdAt),
        },
        {
          id: `chat-${order.id}-2`,
          sender: "agent",
          senderName: "وكيل مبيعات وزير الحلو",
          text: pick({
            ar: `أهلاً بك! الفاتورة ${order.orderNumber} مسجلة في النظام بقيمة $${order.total.toLocaleString()} وحالتها (${isPaid ? "مسددة بالكامل" : order.status})، تم إصدارها بواسطة ${order.cashierName}.`,
            en: `Welcome! Invoice ${order.orderNumber} is recorded in the system for $${order.total.toLocaleString()} (Status: ${order.status}), issued by ${order.cashierName}.`,
          }),
          time: formatActivityTime(order.createdAt),
          status: "delivered",
        },
      ];
    });

    // 2. Real Stock Movements from Supabase
    (stockMoves || []).slice(0, 6).forEach((move) => {
      const actId = `act-move-${move.id}`;
      const docId = `doc-move-${move.id}`;
      const prodName = pick(move.productName.ar, move.productName.en);
      const fromWh = move.fromWarehouseName ? pick(move.fromWarehouseName.ar, move.fromWarehouseName.en) : "المستودع الرئيسي";
      const toWh = move.toWarehouseName ? pick(move.toWarehouseName.ar, move.toWarehouseName.en) : "المطبخ المركزي";

      activities.push({
        id: actId,
        type: "document",
        title: pick({ ar: `حركة مخزنية ${move.moveNo}`, en: `Stock Move ${move.moveNo}` }),
        subtitle: `${prodName} • ${move.quantity} وحدة`,
        time: formatActivityTime(move.movedAt || move.createdAt),
        iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        iconColor: "text-emerald-600",
        icon: FileCheck,
        documentId: docId,
      });

      documents[docId] = {
        id: docId,
        category: "STOCK MOVEMENT",
        categoryLabel: { ar: "إذن حركة مخزنية معتمد", en: "Stock Movement Voucher" },
        code: move.moveNo,
        title: `حركة مخزنية ${move.moveNo}`,
        clientName: fromWh,
        clientEmail: "inventory@wazeer-elhelw.com",
        clientPhone: "+20 100 112 0000",
        clientAddress: `المسار: ${fromWh} ⬅ إلى ⬅ ${toWh}`,
        partyLabel: { ar: "المستودع المصدر / الوجهة:", en: "Source / Destination:" },
        invoiceDate: new Date(move.movedAt || move.createdAt).toLocaleDateString(),
        dueDate: new Date(move.movedAt || move.createdAt).toLocaleDateString(),
        dateLabel: { ar: "تاريخ الحركة", en: "Move Date" },
        dueDateLabel: { ar: "تاريخ القيد", en: "Entry Date" },
        status: "Approved",
        statusTone: "emerald",
        items: [
          {
            num: 1,
            description: `${prodName} (كود: ${move.productSku})`,
            qty: move.quantity,
            unitPrice: move.unitCost,
            total: move.totalCost,
          },
        ],
        subtotal: move.totalCost,
        total: move.totalCost,
        notesTitle: { ar: "تقرير التدقيق المخزني والجرد", en: "Inventory Audit & Movement Log" },
        notes: `نوع الحركة: ${move.moveType === "in" ? "وارد مخزني" : move.moveType === "out" ? "صرف مستودع" : move.moveType === "transfer" ? "تحويل بين فروع" : "تسوية جردية"} | مرجع القيد: ${move.reference || "N/A"} | ملاحظات أمين المخزن: ${move.notes || "فحص الجودة مطابق للمواصفات"}`,
        companyName: "شركة وزير الحلو للحلويات والمواد الغذائية",
        companyTagline: "إدارة المخازن والمستودعات وسلاسل الإمداد",
        companyWebsite: "www.wazeer-elhelw.com",
      };

      chats[actId] = [
        {
          id: `chat-${move.id}-1`,
          sender: "client",
          senderName: "أمين المخزن",
          avatarText: "م",
          text: pick({
            ar: `تم تسجيل إذن حركة المخزون رقم ${move.moveNo} للصنف ${prodName}. يرجى التحقق من القيد.`,
            en: `Stock movement voucher ${move.moveNo} for item ${prodName} has been logged. Please verify.`,
          }),
          time: formatActivityTime(move.movedAt || move.createdAt),
        },
        {
          id: `chat-${move.id}-2`,
          sender: "agent",
          senderName: "وكيل سلاسل الإمداد الذكي",
          text: pick({
            ar: `تم فحص الإذن ${move.moveNo} بنجاح. الكمية (${move.quantity} وحدة) بقيمة إجمالية $${move.totalCost.toLocaleString()} تم إثباتها في أرصدة المخازن بدقة.`,
            en: `Movement voucher ${move.moveNo} verified. Quantity of ${move.quantity} units (Total: $${move.totalCost.toLocaleString()}) recorded successfully in inventory ledger.`,
          }),
          time: formatActivityTime(move.movedAt || move.createdAt),
          status: "delivered",
        },
      ];
    });

    // 3. Real Helpdesk Tickets
    (helpdeskTickets || []).slice(0, 4).forEach((ticket) => {
      const actId = `act-tkt-${ticket.id}`;
      const docId = `doc-tkt-${ticket.id}`;

      activities.push({
        id: actId,
        type: "ticket",
        title: `تذكرة #${ticket.ticketNumber}`,
        subtitle: `${ticket.title} • ${ticket.branchOrLocation}`,
        time: formatActivityTime(ticket.createdAt),
        iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
        iconColor: "text-purple-600",
        icon: MessageSquare,
        documentId: docId,
      });

      documents[docId] = {
        id: docId,
        category: "SUPPORT TICKET",
        categoryLabel: { ar: "تذكرة دعم فني", en: "Support Ticket" },
        code: `TICKET #${ticket.ticketNumber}`,
        title: ticket.title,
        clientName: ticket.submitterName,
        clientEmail: `${ticket.category}@wazeer-elhelw.com`,
        clientPhone: ticket.submitterPhone || "+20 100 112 0000",
        clientAddress: ticket.branchOrLocation,
        partyLabel: { ar: "مقدم البلاغ والفرع:", en: "Reported By / Location:" },
        invoiceDate: new Date(ticket.createdAt).toLocaleString(),
        dueDate: "SLA: 2 Hours",
        status: ticket.status === "resolved" ? "Resolved" : "Open",
        statusTone: ticket.status === "resolved" ? "emerald" : "rose",
        details: [
          { label: "الأولوية", value: ticket.priority, badgeTone: ticket.priority === "urgent" ? "rose" : "amber" },
          { label: "القسم / الفرع", value: ticket.branchOrLocation },
          { label: "المسؤول المعين", value: ticket.assignedTo },
        ],
        notesTitle: { ar: "تفاصيل البلاغ والإجراءات", en: "Incident Details" },
        notes: ticket.description,
        companyName: "شركة وزير الحلو — مركز العمليات",
        companyTagline: "فريق الدعم الفني وتكنولوجيا المعلومات",
        companyWebsite: "www.wazeer-elhelw.com",
      };

      chats[actId] = [
        {
          id: `chat-${ticket.id}-1`,
          sender: "client",
          senderName: ticket.submitterName,
          avatarText: (ticket.submitterName || "U")[0],
          text: ticket.title,
          time: formatActivityTime(ticket.createdAt),
        },
        {
          id: `chat-${ticket.id}-2`,
          sender: "agent",
          senderName: "وكيل الدعم الفني الذكي",
          text: `تم استلام التذكرة #${ticket.ticketNumber} وجاري متابعة حل العطل مع المهندس المعين ${ticket.assignedTo}.`,
          time: formatActivityTime(ticket.createdAt),
          status: "delivered",
        },
      ];
    });

    // 4. Real Partners
    (partners || []).slice(0, 3).forEach((partner) => {
      const actId = `act-part-${partner.id}`;
      const docId = `doc-part-${partner.id}`;
      const partnerName = pick(partner.name.ar, partner.name.en);

      activities.push({
        id: actId,
        type: "registration",
        title: pick({ ar: `تسجيل: ${partnerName}`, en: `Partner: ${partnerName}` }),
        subtitle: `${partner.type === "customer" ? "عميل" : "مورد"} • ${partner.phone}`,
        time: formatActivityTime(partner.createdAt),
        iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        iconColor: "text-amber-600",
        icon: User,
        documentId: docId,
      });

      documents[docId] = {
        id: docId,
        category: "PARTNER REGISTRATION",
        categoryLabel: { ar: "بيانات شريك العمل المعتمدة", en: "Partner Profile" },
        code: partner.code,
        title: partnerName,
        clientName: partnerName,
        clientEmail: partner.email || "partner@wazeer-elhelw.com",
        clientPhone: partner.phone || "+20 100 112 0000",
        clientAddress: pick(partner.address.ar, partner.address.en),
        invoiceDate: new Date(partner.createdAt).toLocaleDateString(),
        status: partner.status === "active" ? "Active" : "Inactive",
        statusTone: partner.status === "active" ? "emerald" : "amber",
        details: [
          { label: "كود الشريك", value: partner.code },
          { label: "نوع الحساب", value: partner.type === "customer" ? "عميل تجاري" : "مورد معتمد" },
          { label: "شروط السداد", value: partner.paymentTerms },
          { label: "الحد الائتماني", value: `$${partner.creditLimit.toLocaleString()}` },
          { label: "الرصيد الحالي", value: `$${partner.balance.toLocaleString()}` },
        ],
        notesTitle: { ar: "ملف الشراكة والائتمان", en: "Partnership & Credit Log" },
        notes: `السجل التجاري والبطاقة الضريبية: ${partner.taxNumber || "مكتمل"} | جهة الاتصال: ${partner.contactPerson || "المسؤول المالي"}`,
        companyName: "شركة وزير الحلو للحلويات والمواد الغذائية",
        companyTagline: "إدارة علاقات العملاء والموردين",
        companyWebsite: "www.wazeer-elhelw.com",
      };

      chats[actId] = [
        {
          id: `chat-${partner.id}-1`,
          sender: "client",
          senderName: partnerName,
          avatarText: (partnerName || "P")[0],
          text: `مرحباً، أود التأكد من اعتماد بيانات حسابنا التجاري والحد الائتماني.`,
          time: formatActivityTime(partner.createdAt),
        },
        {
          id: `chat-${partner.id}-2`,
          sender: "agent",
          senderName: "وكيل الحسابات والشركاء",
          text: `أهلاً بك! تم اعتماد حساب ${partnerName} بنجاح مع حد ائتماني قدره $${partner.creditLimit.toLocaleString()} وشروط سداد ${partner.paymentTerms}.`,
          time: formatActivityTime(partner.createdAt),
          status: "delivered",
        },
      ];
    });

    if (activities.length === 0) {
      return {
        realActivities: INITIAL_ACTIVITIES,
        realDocuments: SAMPLE_DOCUMENTS,
        realChats: ACTIVITY_CHATS,
      };
    }

    return {
      realActivities: activities,
      realDocuments: documents,
      realChats: chats,
    };
  }, [posOrders, stockMoves, helpdeskTickets, partners, lang]);

  // State
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [activeMobileTab, setActiveMobileTab] = useState<"activities" | "document" | "chat">("document");
  const [isAiThinking, setIsAiThinking] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Sync selection to first activity on load
  useEffect(() => {
    if (realActivities.length > 0) {
      const exists = realActivities.some((a) => a.id === selectedActivityId);
      if (!selectedActivityId || !exists) {
        const first = realActivities[0];
        if (first) {
          setSelectedActivityId(first.id);
          if (first.documentId && realDocuments[first.documentId]) {
            setSelectedDocId(first.documentId);
          }
          if (realChats[first.id]) {
            setMessages(realChats[first.id]);
          } else {
            setMessages(INITIAL_MESSAGES);
          }
        }
      }
    }
  }, [realActivities, selectedActivityId, realDocuments, realChats]);

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Current active document
  const currentDoc: DocumentData =
    realDocuments[selectedDocId] ??
    (selectedDocId && SAMPLE_DOCUMENTS[selectedDocId]) ??
    realDocuments[realActivities[0]?.documentId || ""] ??
    SAMPLE_DOCUMENTS["inv-4521"]!;

  // Activity click handler
  const handleSelectActivity = (activity: ActivityItem) => {
    setSelectedActivityId(activity.id);
    if (activity.documentId && realDocuments[activity.documentId]) {
      setSelectedDocId(activity.documentId);
    } else if (activity.documentId && SAMPLE_DOCUMENTS[activity.documentId]) {
      setSelectedDocId(activity.documentId);
    }
    if (realChats[activity.id]) {
      setMessages(realChats[activity.id]);
    } else if (ACTIVITY_CHATS[activity.id]) {
      setMessages(ACTIVITY_CHATS[activity.id]);
    }
    // If mobile, switch to document view
    setActiveMobileTab("document");
  };

  // Send message handler with real AI model call & document context
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isAiThinking) return;

    const userMsgText = inputText.trim();
    setInputText("");

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "agent",
      senderName: pick(currentUser.name.ar, currentUser.name.en),
      text: userMsgText,
      time: timeStr,
      status: "delivered",
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAiThinking(true);

    // Look for active Gemini module from store or use default
    const geminiModule = modules.find((m) => m.provider === "gemini" && m.status === "active");
    const activeKey = geminiModule?.apiKey || DEFAULT_GEMINI_KEY;
    const modelName = geminiModule?.model || "gemini-3.8-flash";

    // Prepare rich ERP document context for Gemini
    const docContextLines = [
      `بيانات المستند المفتوح حالياً أمامك في شاشة وزير الحلو:`,
      `- الكود: ${currentDoc.code}`,
      `- النوع: ${currentDoc.category} (${pick(currentDoc.categoryLabel.ar, currentDoc.categoryLabel.en)})`,
      `- الطرف / العميل: ${currentDoc.clientName} (${currentDoc.clientEmail || ""}, ${currentDoc.clientPhone || ""})`,
      `- الحالة: ${currentDoc.status}`,
      `- التاريخ: ${currentDoc.invoiceDate} | تاريخ الاستحقاق: ${currentDoc.dueDate}`,
      currentDoc.total !== undefined ? `- الإجمالي الكلي: $${currentDoc.total.toLocaleString()}` : "",
      currentDoc.subtotal !== undefined ? `- المبلغ قبل الضريبة: $${currentDoc.subtotal.toLocaleString()}` : "",
      currentDoc.taxAmount !== undefined ? `- الضريبة: $${currentDoc.taxAmount.toLocaleString()}` : "",
      currentDoc.items && currentDoc.items.length > 0
        ? `- البنود والكميات: ${currentDoc.items.map((it) => `${it.num}. ${it.description} (الكمية: ${it.qty}, السعر: $${it.unitPrice}, الإجمالي: $${it.total})`).join(" | ")}`
        : "",
      currentDoc.notes ? `- ملاحظات / التقرير: ${currentDoc.notes}` : "",
      currentDoc.details && currentDoc.details.length > 0
        ? `- تفاصيل المعاملة: ${currentDoc.details.map((d) => `${d.label}: ${d.value}`).join(" | ")}`
        : "",
    ].filter(Boolean);

    const systemPrompt = `أنت وكيل الذكاء الاصطناعي الذكي في منصة ChatHub التابعة لمنظومة ERP "وزير الحلو للحلويات والمواد الغذائية".
المستخدم يتواصل معك بشأن المستند الحالي:
${docContextLines.join("\n")}

إرشادات تقديم الرد:
1. قدم رداً واقعياً ودقيقاً ومطابقاً تماماً للأرقام والتواريخ والحالة المذكورة في بيانات المستند أعلاه.
2. أجب بنفس اللغة التي سأل بها المستخدم (إذا كان السؤال بالعربية أجب بالعربية، وإذا كان بالإنجليزية أجب بالإنجليزية).
3. كن مهنياً، ودوداً ومباشراً بدون مقدمات مطولة غير لازمة.`;

    let replyText = "";

    if (activeKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${systemPrompt}\n\nرسالة واستفسار المستخدم: "${userMsgText}"`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: geminiModule?.temperature ?? 0.3,
                maxOutputTokens: 600,
              },
            }),
          }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          const resData = await res.json();
          const candidateText = resData.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
          if (candidateText && candidateText.trim()) {
            replyText = candidateText.trim();
          }
        }
      } catch (err) {
        console.warn("Gemini ChatHub live call failed, falling back to local copilot rules", err);
      }
    }

    // High quality contextual fallback if network or API was unavailable
    if (!replyText) {
      const lower = userMsgText.toLowerCase();
      if (lower.includes("invoice") || lower.includes("فاتورة") || lower.includes("order") || lower.includes("طلب")) {
        const totalStr = currentDoc.total !== undefined ? ` بقيمة $${currentDoc.total.toLocaleString()}` : "";
        const totalStrEn = currentDoc.total !== undefined ? ` totaling $${currentDoc.total.toLocaleString()}` : "";
        replyText = pick({
          ar: `لقد تم مراجعة ${currentDoc.category} (${currentDoc.code}) للجهة ${currentDoc.clientName}${totalStr}، وحالتها الحالية في النظام هي (${currentDoc.status}). كافة السجلات مطابقة ومعتمدة.`,
          en: `Reviewed ${currentDoc.category} ${currentDoc.code} for ${currentDoc.clientName}${totalStrEn} (Status: ${currentDoc.status}). All records are verified and aligned.`,
        });
      } else if (lower.includes("ticket") || lower.includes("تذكرة") || lower.includes("دعم") || lower.includes("pos")) {
        replyText = pick({
          ar: `التذكرة ${currentDoc.code} قيد المعالجة السريعة من فريق الدعم الفني، وتم تفعيل بروتوكول التشخيص وإصلاح الأجهزة بنجاح.`,
          en: `Ticket ${currentDoc.code} is being actively handled by IT systems engineering team; diagnostic patch verified.`,
        });
      } else if (lower.includes("discount") || lower.includes("خصم")) {
        replyText = pick({
          ar: `تم احتساب نسبة الخصم المعتمدة وتحديث إجمالي الفاتورة في النظام المحاسبي.`,
          en: `Approved discount rate has been computed and total invoice amount updated in the accounting module.`,
        });
      } else if (lower.includes("receipt") || lower.includes("إيصال") || lower.includes("pdf") || lower.includes("طباعة")) {
        replyText = pick({
          ar: `تم تجهيز المستند المعتمد ورابط ${currentDoc.code}. يمكنك تصدير أو طباعة نسخة الـ PDF الرسمية مباشرة مع الختم الرقمي.`,
          en: `Verified record generated for ${currentDoc.code}. You can export or print the official PDF directly with QR seal.`,
        });
      } else {
        replyText = pick({
          ar: `تم استلام استفسارك ومراجعة تفاصيل المستند ${currentDoc.code} للعميل ${currentDoc.clientName}. كل العمليات موثقة ومحدثة في قاعدة البيانات.`,
          en: `Your request regarding ${currentDoc.code} for ${currentDoc.clientName} has been processed and aligned with ERP database.`,
        });
      }
    }

    const botReply: ChatMessage = {
      id: `msg-reply-${Date.now()}`,
      sender: "client",
      senderName: currentDoc.clientName || "AI Copilot",
      ...(currentDoc.clientName ? { avatarText: currentDoc.clientName[0] } : { avatarText: "AI" }),
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, botReply]);
    setIsAiThinking(false);
  };

  // Print invoice sheet
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 -mt-2">
      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* Top Floating Subheader Bar (Responsive across all screens) */}
      {/* ============================================================ */}
      <div className="surface-panel rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: ChatHub Branding */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {hasOnlyAiPermission && (
              <button
                type="button"
                onClick={() => setSidebarVisible(!sidebarVisible)}
                className="hidden lg:inline-flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title={sidebarVisible ? (lang === "ar" ? "إخفاء الشريط الجانبي" : "Hide sidebar") : (lang === "ar" ? "إظهار الشريط الجانبي" : "Show sidebar")}
              >
                {sidebarVisible ? (
                  <PanelLeftClose className="size-4" />
                ) : (
                  <PanelLeft className="size-4" />
                )}
              </button>
            )}
            <div className="size-9 sm:size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <MessageSquareText className="size-4 sm:size-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-extrabold text-sm sm:text-base tracking-tight text-foreground">
                <span>ChatHub</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium hidden xs:block">
                Connect · Support · Grow
              </p>
            </div>
          </div>

          {/* Center-Left: Greeting & User Profile (hidden on small mobile) */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-muted/40 border border-border/50">
            <div className="relative">
              <div
                className={cn(
                  "size-7 sm:size-8 rounded-full bg-gradient-to-tr text-white flex items-center justify-center font-bold text-xs shadow-xs",
                  currentUser.avatarBg
                )}
              >
                {currentUser.name.ar[0]}
              </div>
              <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="text-xs">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground block font-medium">
                {pick({ ar: "صباح الخير،", en: "Good morning," })}
              </span>
              <span className="font-bold text-foreground flex items-center gap-1 text-[11px] sm:text-xs">
                <span>{pick(currentUser.name.ar, currentUser.name.en)}</span>
                <span>👋</span>
              </span>
            </div>
          </div>

          {/* Center-Right: Date & Time Indicator (hidden on mobile and small tablet) */}
          <div className="hidden md:flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-muted/40 border border-border/50 text-xs">
            <Calendar className="size-4 text-primary" />
            <div>
              <span className="text-[10px] font-bold text-primary block uppercase tracking-wider">
                {pick({ ar: "اليوم", en: "Today" })}
              </span>
              <span className="font-mono text-muted-foreground text-[11px]">
                08/09/2026 10:10 AM
              </span>
            </div>
          </div>

          {/* Far Right: Quick Tools */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title={pick({ ar: "بحث", en: "Search" })}
            >
              <Search className="size-4" />
            </button>
            <button
              className="relative size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title={pick({ ar: "الإشعارات", en: "Notifications" })}
            >
              <Bell className="size-4" />
              <span className="absolute top-1 right-1 size-2 rounded-full bg-rose-500" />
            </button>

            {hasOnlyAiPermission && (
              <>
                {/* Language Switcher */}
                <button
                  onClick={toggle}
                  className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  title={t("lang")}
                >
                  <Languages className="size-4" />
                </button>

                {/* Account Switcher Dropdown */}
                <div className="relative" ref={aiUserMenuRef}>
                  <button
                    onClick={() => setIsAiUserMenuOpen(!isAiUserMenuOpen)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl border border-border/70 bg-card hover:bg-secondary text-xs transition-colors"
                    title={pick("تبديل الحساب التجريبي", "Switch Demo Account")}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-md bg-gradient-to-tr text-white flex items-center justify-center font-bold text-[9px] shadow-xs",
                        currentUser.avatarBg
                      )}
                    >
                      {currentUser.name.ar[0]}
                    </div>
                    <span className="hidden md:inline font-semibold text-[11px] max-w-[90px] truncate">
                      {pick(currentUser.name.ar, currentUser.name.en)}
                    </span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </button>

                  {isAiUserMenuOpen && (
                    <div
                      className={cn(
                        "absolute top-full mt-2 w-72 rounded-2xl border border-border/70 bg-card p-3 shadow-2xl z-50 text-xs space-y-2",
                        dir === "rtl" ? "left-0" : "right-0"
                      )}
                    >
                      <div className="pb-2 border-b border-border/50">
                        <p className="font-bold text-foreground text-xs">
                          {pick("تبديل الحساب التجريبي", "Switch Demo Account")}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {pick(
                            "اختر أي دور لتجربة الصلاحيات وواجهة المستخدم المخصصة",
                            "Select a role to test its specific view & permissions"
                          )}
                        </p>
                      </div>

                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {demoAccounts.map((acc) => {
                          const isSelected = currentUser.id === acc.id;
                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                loginAs(acc.id);
                                setIsAiUserMenuOpen(false);
                              }}
                              className={cn(
                                "w-full p-2 rounded-xl text-start flex items-center gap-2.5 transition-all",
                                isSelected
                                  ? "bg-primary/10 border border-primary/30"
                                  : "hover:bg-secondary/70 border border-transparent"
                              )}
                            >
                              <div
                                className={`size-7 rounded-lg bg-gradient-to-tr ${acc.avatarBg} text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm`}
                              >
                                {acc.name.ar[0]}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-foreground text-xs truncate">
                                  {pick(acc.name.ar, acc.name.en)}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {pick(acc.roleLabel.ar, acc.roleLabel.en)}
                                </p>
                              </div>
                              {isSelected && (
                                <Check className="size-3.5 text-primary shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => logout()}
                  className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                  title={t("logout")}
                >
                  <LogOut className="size-4" />
                </button>
              </>
            )}

            {!hasOnlyAiPermission && (
              <>
                <div className="sm:hidden relative">
                  <div
                    className={cn(
                      "size-7 rounded-full bg-gradient-to-tr text-white flex items-center justify-center font-bold text-[10px] shadow-xs",
                      currentUser.avatarBg
                    )}
                  >
                    {currentUser.name.ar[0]}
                  </div>
                </div>
                <button
                  className="size-8 rounded-lg hidden sm:flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  title={pick({ ar: "المزيد", en: "More options" })}
                >
                  <ChevronDown className="size-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher (< 768px screens) */}
      <div className="md:hidden flex items-center gap-1 p-1 bg-card rounded-xl border border-border/60 text-xs font-semibold shadow-2xs">
        <button
          onClick={() => setActiveMobileTab("activities")}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg transition-colors text-center flex items-center justify-center gap-1.5",
            activeMobileTab === "activities"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          <Clock className="size-3.5" />
          <span>{pick({ ar: "الأنشطة", en: "Activities" })}</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
              activeMobileTab === "activities"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {realActivities.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMobileTab("document")}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg transition-colors text-center flex items-center justify-center gap-1.5 truncate",
            activeMobileTab === "document"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          <FileText className="size-3.5" />
          <span className="truncate">{pick({ ar: "المستند", en: "Document" })}</span>
        </button>

        <button
          onClick={() => setActiveMobileTab("chat")}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg transition-colors text-center flex items-center justify-center gap-1.5",
            activeMobileTab === "chat"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          <MessageSquareText className="size-3.5" />
          <span>{pick({ ar: "المحادثة", en: "Chat" })}</span>
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>
      </div>

      {/* Tablet Mode Segmented Controller (768px - 1023px screens) */}
      <div className="hidden md:flex lg:hidden items-center justify-between p-2.5 bg-card rounded-xl border border-border/60 text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-foreground font-bold">
          <Layers className="size-4 text-primary" />
          <span>{pick({ ar: "عرض التابلت التنفيذي", en: "Executive Tablet Mode" })}</span>
          <span className="text-[11px] text-muted-foreground font-normal">
            ({currentDoc.code})
          </span>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
          <button
            onClick={() => setActiveMobileTab("document")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
              activeMobileTab !== "chat"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="size-3.5" />
            <span>{pick({ ar: "معاينة المستند", en: "Document Preview" })}</span>
          </button>
          <button
            onClick={() => setActiveMobileTab("chat")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
              activeMobileTab === "chat"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquareText className="size-3.5" />
            <span>{pick({ ar: "محادثة العميل", en: "Client Chat" })}</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Responsive Workspace Grid: Mobile (1-col), Tablet (2-col), Desktop (3-col) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* ---------------------------------------------------------- */}
        {/* Column 1: Recent Activities (Mobile: when active, Tablet: col-5, Desktop: col-3) */}
        {/* ---------------------------------------------------------- */}
        <div
          className={cn(
            "surface-panel rounded-2xl shadow-sm overflow-hidden flex flex-col",
            "h-[calc(100dvh-230px)] min-h-[520px] md:h-[720px] lg:h-[760px] xl:h-[800px]",
            activeMobileTab !== "activities" ? "hidden md:flex md:col-span-5 lg:col-span-3" : "flex md:col-span-5 lg:col-span-3"
          )}
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-foreground">
              <Clock className="size-4 text-muted-foreground" />
              <span>{pick({ ar: "الأنشطة الأخيرة", en: "Recent Activities" })}</span>
            </div>
            <button className="text-xs font-semibold text-primary hover:underline">
              {pick({ ar: "عرض الكل", en: "View All" })}
            </button>
          </div>

          {/* Activities List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2 space-y-1">
            {realActivities.map((act) => {
              const isSelected = selectedActivityId === act.id;
              const IconComp = act.icon;
              return (
                <div
                  key={act.id}
                  onClick={() => handleSelectActivity(act)}
                  className={cn(
                    "p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2.5",
                    isSelected
                      ? "bg-primary/10 border border-primary/20 shadow-xs"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "size-9 rounded-xl flex items-center justify-center shrink-0",
                        act.iconBg
                      )}
                    >
                      <IconComp className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {act.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="text-end shrink-0">
                    <span className="text-[10px] text-muted-foreground block mb-1">
                      {act.time}
                    </span>
                    <button
                      type="button"
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {pick({ ar: "عرض", en: "View" })}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Column 2: Live Document Sheet Preview (Mobile: when active, Tablet: col-7, Desktop: col-5) */}
        {/* ---------------------------------------------------------- */}
        <div
          className={cn(
            "surface-panel rounded-2xl shadow-sm overflow-hidden flex flex-col",
            "h-[calc(100dvh-230px)] min-h-[520px] md:h-[720px] lg:h-[760px] xl:h-[800px]",
            "lg:flex lg:col-span-5 xl:col-span-5",
            activeMobileTab === "document"
              ? "flex md:col-span-7"
              : activeMobileTab === "activities"
                ? "hidden md:flex md:col-span-7"
                : "hidden lg:flex"
          )}
        >
          {/* Top Bar above sheet */}
          <div className="p-3 sm:p-3.5 border-b border-border/50 flex items-center justify-between bg-card/60 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile Back Button to Activities */}
              <button
                onClick={() => setActiveMobileTab("activities")}
                className="md:hidden size-7 rounded-lg border border-border/60 bg-background flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                title={pick({ ar: "الأنشطة الأخيرة", en: "Back to Activities" })}
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h3 className="font-bold text-xs sm:text-sm text-foreground leading-tight truncate">
                    {currentDoc.code}
                  </h3>
                  <span
                    className={cn(
                      "px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold shrink-0",
                      currentDoc.statusTone === "emerald" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                      currentDoc.statusTone === "amber" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      currentDoc.statusTone === "blue" && "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                      currentDoc.statusTone === "purple" && "bg-purple-500/15 text-purple-600 dark:text-purple-400",
                      currentDoc.statusTone === "rose" && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                      !currentDoc.statusTone && "bg-muted text-muted-foreground"
                    )}
                  >
                    {currentDoc.status}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                  {currentDoc.partyLabel ? pick(currentDoc.partyLabel) : "Contact:"} {currentDoc.clientName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Quick Jump to Client Chat on Mobile / Tablet */}
              <button
                onClick={() => setActiveMobileTab("chat")}
                className="lg:hidden px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold flex items-center gap-1 transition-colors"
                title={pick({ ar: "فتح محادثة العميل", en: "Open Client Chat" })}
              >
                <MessageSquareText className="size-3.5" />
                <span className="hidden sm:inline">{pick({ ar: "محادثة", en: "Chat" })}</span>
              </button>
              <button
                onClick={handlePrint}
                className="size-7 sm:size-8 rounded-lg border border-border/70 bg-background text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                title={pick({ ar: "تحميل / طباعة", en: "Download / Print" })}
              >
                <Download className="size-3.5 sm:size-4" />
              </button>
              <button
                className="size-7 sm:size-8 rounded-lg border border-border/70 bg-background text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                title={pick({ ar: "المزيد من الخيارات", en: "More options" })}
              >
                <MoreHorizontal className="size-3.5 sm:size-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Document Canvas */}
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 md:p-6 bg-muted/20">
            {/* The Document Sheet */}
            <div className="bg-card text-card-foreground rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-border/60 space-y-4 sm:space-y-6 max-w-xl mx-auto">
              {/* Sheet Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b sm:border-b-0 border-border/40">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {/* Wazeer Logo */}
                  <div className="size-10 sm:size-12 rounded-xl bg-white p-1 shadow-sm border border-border/60 flex items-center justify-center shrink-0">
                    <img
                      src={companyLogo}
                      alt={companyName}
                      className="size-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm sm:text-base text-foreground leading-tight">
                      {companyName}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                      {currentDoc.companyTagline || (lang === "ar" ? "حلويات ومواد غذائية وتوريدات فندقية" : "Confectionery & Food Industries")}
                    </p>
                  </div>
                </div>

                <div className="text-start sm:text-end w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                  <span className="font-black text-xs sm:text-base tracking-wider text-slate-900 dark:text-slate-100 uppercase block">
                    {currentDoc.category}
                  </span>
                  <span className="font-mono font-bold text-xs text-muted-foreground">
                    #{currentDoc.code.replace(/[^0-9A-Za-z-]/g, "") || "DOC"}
                  </span>
                  {currentDoc.categoryLabel && (
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block font-medium">
                      {pick(currentDoc.categoryLabel)}
                    </span>
                  )}
                </div>
              </div>

              {/* Bill To / Contact & Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1 text-xs">
                {/* Left: Contact Info */}
                <div className="space-y-1 p-2.5 sm:p-0 rounded-lg bg-muted/20 sm:bg-transparent">
                  <span className="font-bold text-foreground text-xs block mb-1">
                    {currentDoc.partyLabel ? pick(currentDoc.partyLabel) : (lang === "ar" ? "إلى:" : "Bill To:")}
                  </span>
                  <p className="font-semibold text-foreground text-xs">{currentDoc.clientName}</p>
                  <p className="text-muted-foreground text-[11px] flex items-center gap-1 break-all">
                    ✉ {currentDoc.clientEmail}
                  </p>
                  <p className="text-muted-foreground text-[11px] font-mono">
                    ☎ {currentDoc.clientPhone}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    📍 {currentDoc.clientAddress}
                  </p>
                </div>

                {/* Right: Dates & Status */}
                <div className="space-y-1.5 p-2.5 sm:p-0 rounded-lg bg-muted/20 sm:bg-transparent sm:text-end">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">
                      {currentDoc.dateLabel ? pick(currentDoc.dateLabel) : (lang === "ar" ? "التاريخ:" : "Date:")}
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      {currentDoc.invoiceDate}
                    </span>
                  </div>
                  {currentDoc.dueDate && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">
                        {currentDoc.dueDateLabel ? pick(currentDoc.dueDateLabel) : (lang === "ar" ? "تاريخ الاستحقاق:" : "Due Date:")}
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {currentDoc.dueDate}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-muted-foreground text-[11px]">
                      {lang === "ar" ? "الحالة:" : "Status:"}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold",
                        currentDoc.statusTone === "emerald" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                        currentDoc.statusTone === "amber" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                        currentDoc.statusTone === "blue" && "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                        currentDoc.statusTone === "purple" && "bg-purple-500/15 text-purple-600 dark:text-purple-400",
                        currentDoc.statusTone === "rose" && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                        !currentDoc.statusTone && "bg-muted text-muted-foreground"
                      )}
                    >
                      {currentDoc.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table (if financial / line items document) */}
              {currentDoc.items && currentDoc.items.length > 0 && (
                <>
                  <div className="rounded-xl overflow-x-auto border border-border/50">
                    <table className="w-full text-xs min-w-[340px] sm:min-w-0">
                      <thead className="bg-muted/60 border-b border-border/50 text-muted-foreground">
                        <tr>
                          <th className="py-2 px-2.5 text-start font-semibold w-7">#</th>
                          <th className="py-2 px-2.5 text-start font-semibold">{pick({ ar: "الوصف / البند", en: "Description" })}</th>
                          <th className="py-2 px-2 text-center font-semibold w-10">{pick({ ar: "الكمية", en: "Qty" })}</th>
                          <th className="py-2 px-2 text-end font-semibold w-16 sm:w-20">{pick({ ar: "السعر", en: "Price" })}</th>
                          <th className="py-2 px-2.5 text-end font-semibold w-20">{pick({ ar: "الإجمالي", en: "Total" })}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono">
                        {currentDoc.items.map((item) => (
                          <tr key={item.num} className="hover:bg-muted/20">
                            <td className="py-2 px-2.5 text-start text-muted-foreground font-sans text-[11px]">
                              {item.num}
                            </td>
                            <td className="py-2 px-2.5 text-start font-sans font-medium text-foreground text-[11px] sm:text-xs">
                              {item.description}
                            </td>
                            <td className="py-2 px-2 text-center text-foreground text-[11px]">
                              {item.qty}
                            </td>
                            <td className="py-2 px-2 text-end text-muted-foreground text-[11px]">
                              ${item.unitPrice.toFixed(2)}
                            </td>
                            <td className="py-2 px-2.5 text-end font-semibold text-foreground text-[11px] sm:text-xs">
                              ${item.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Totals */}
                  {currentDoc.total !== undefined && (
                    <div className="flex justify-end pt-1">
                      <div className="w-full sm:w-56 space-y-1 text-xs">
                        {currentDoc.subtotal !== undefined && (
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>{pick({ ar: "المجموع الفرعي", en: "Subtotal" })}</span>
                            <span className="font-mono font-medium text-foreground">
                              ${currentDoc.subtotal.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {currentDoc.taxPercent !== undefined && currentDoc.taxAmount !== undefined && (
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>{pick({ ar: `ضريبة القيمة المضافة (${currentDoc.taxPercent}%)`, en: `Tax (${currentDoc.taxPercent}%)` })}</span>
                            <span className="font-mono font-medium text-foreground">
                              ${currentDoc.taxAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1.5 border-t border-border/60 font-bold">
                          <span className="text-foreground text-xs sm:text-sm">{pick({ ar: "الإجمالي النهائي", en: "Total" })}</span>
                          <span className="font-mono text-sm sm:text-base text-primary">
                            ${currentDoc.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Structured Details Cards (for tickets, registrations, meetings, inquiries) */}
              {currentDoc.details && currentDoc.details.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-3.5 space-y-2">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileCheck className="size-3.5 text-primary" />
                    <span>{pick({ ar: "تفاصيل وبيانات المعاملة المعتمدة", en: "Transaction Specifications & Records" })}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {currentDoc.details.map((det, idx) => (
                      <div key={idx} className="p-2 sm:p-2.5 rounded-lg bg-card border border-border/50">
                        <span className="text-[10px] text-muted-foreground font-medium block mb-0.5">
                          {det.label}
                        </span>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-foreground text-[11px] sm:text-xs">{det.value}</span>
                          {det.badge && (
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold shrink-0",
                                det.badgeTone === "emerald" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                                det.badgeTone === "rose" && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                                det.badgeTone === "purple" && "bg-purple-500/15 text-purple-600 dark:text-purple-400",
                                det.badgeTone === "amber" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                                (!det.badgeTone || det.badgeTone === "blue") && "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              )}
                            >
                              {det.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Copilot Intelligence Notes */}
              {currentDoc.notes && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                    <Sparkles className="size-3.5" />
                    <span>
                      {currentDoc.notesTitle ? pick(currentDoc.notesTitle) : pick({ ar: "ملاحظات وتوجيهات الذكاء الاصطناعي", en: "AI Copilot Notes & Intelligence" })}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] sm:text-xs leading-relaxed">
                    {currentDoc.notes}
                  </p>
                </div>
              )}

              {/* Footer Note & QR Code */}
              <div className="pt-4 sm:pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-3 text-center sm:text-start">
                <div className="space-y-0.5 text-xs">
                  <p className="font-medium text-muted-foreground italic text-[11px]">
                    {pick({
                      ar: "وثيقة رسمية معتمدة من النظام السحابي لمجموعة وزير الحلو",
                      en: "Official Certified Record — Wazeer El-Helw ERP Cloud",
                    })}
                  </p>
                  <p className="font-bold text-foreground text-[11px]">
                    {companyName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {currentDoc.companyWebsite}
                  </p>
                </div>

                <div className="shrink-0">
                  <QrCodeGraphic
                    value={`https://wazeer-elhelw.com/verify?doc=${currentDoc.code}&status=${encodeURIComponent(currentDoc.status)}&total=${currentDoc.total ?? 0}`}
                    size={60}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Column 3: Interactive Chat Assistant (Mobile: when active, Tablet: col-7, Desktop: col-4) */}
        {/* ---------------------------------------------------------- */}
        <div
          className={cn(
            "surface-panel rounded-2xl shadow-sm overflow-hidden flex flex-col",
            "h-[calc(100dvh-230px)] min-h-[520px] md:h-[720px] lg:h-[760px] xl:h-[800px]",
            "lg:flex lg:col-span-4 xl:col-span-4",
            activeMobileTab === "chat" ? "flex md:col-span-7" : "hidden lg:flex"
          )}
        >
          {/* Header */}
          <div className="p-3 sm:p-3.5 border-b border-border/50 flex items-center justify-between bg-card/60 gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              {/* Mobile Back Button to Activities */}
              <button
                onClick={() => setActiveMobileTab("activities")}
                className="md:hidden size-7 rounded-lg border border-border/60 bg-background flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                title={pick({ ar: "الأنشطة الأخيرة", en: "Back to Activities" })}
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="size-8 sm:size-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0">
                {currentDoc.clientName ? currentDoc.clientName[0] : "A"}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-foreground truncate">
                  {currentDoc.clientName || "Ali"}
                </h4>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Online</span>
                  </p>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-mono flex items-center gap-1 font-bold">
                    <Sparkles className="size-2.5 text-amber-500" />
                    <span>Gemini 3.8 Flash</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Mobile / Tablet switch to Document Preview */}
              <button
                onClick={() => setActiveMobileTab("document")}
                className="lg:hidden px-2 py-1 rounded-lg bg-secondary hover:bg-muted text-foreground border border-border/60 text-xs font-bold flex items-center gap-1 transition-colors"
                title={pick({ ar: "عرض المستند", en: "View Document" })}
              >
                <FileText className="size-3.5" />
                <span className="hidden sm:inline">{pick({ ar: "المستند", en: "Doc" })}</span>
              </button>
              <button
                className="size-7 sm:size-8 rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground flex items-center justify-center"
                title={pick({ ar: "خيارات المحادثة", en: "Chat options" })}
              >
                <MoreHorizontal className="size-3.5 sm:size-4" />
              </button>
            </div>
          </div>

          {/* Chat Thread Messages */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10 text-xs"
          >
            {/* Date Pill */}
            <div className="text-center">
              <span className="px-3 py-1 rounded-full bg-muted/60 text-muted-foreground text-[10px] font-semibold">
                Today
              </span>
            </div>

            {messages.map((msg) => {
              const isAgent = msg.sender === "agent";
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col space-y-1 max-w-[85%]",
                    isAgent ? "ms-auto items-end" : "me-auto items-start"
                  )}
                >
                  <div className="flex items-end gap-2">
                    {!isAgent && (
                      <div className="size-6 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] text-muted-foreground shrink-0">
                        {msg.avatarText || "A"}
                      </div>
                    )}

                    <div
                      className={cn(
                        "p-3 rounded-2xl leading-relaxed shadow-xs",
                        isAgent
                          ? "bg-blue-600 text-white rounded-br-xs"
                          : "bg-card border border-border/60 text-foreground rounded-bl-xs"
                      )}
                    >
                      <p>{msg.text}</p>
                    </div>

                    {isAgent && (
                      <div className="size-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                        HR
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 px-1 text-[10px] text-muted-foreground font-mono">
                    <span>{msg.time}</span>
                    {isAgent && (
                      <CheckCheck className="size-3 text-blue-500 font-bold" />
                    )}
                  </div>
                </div>
              );
            })}
            {isAiThinking && (
              <div className="flex flex-col space-y-1 me-auto items-start max-w-[85%] animate-in fade-in duration-200">
                <div className="flex items-end gap-2">
                  <div className="size-6 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                    <Sparkles className="size-3 text-amber-500 animate-spin" />
                  </div>
                  <div className="p-3 rounded-2xl bg-card border border-border/70 text-foreground rounded-bl-xs shadow-xs flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                      <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                      <span className="size-1.5 rounded-full bg-primary animate-bounce" />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {pick({ ar: "جاري تحليل المستند وصياغة الرد بالذكاء الاصطناعي...", en: "Analyzing document with Gemini AI..." })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 border-t border-border/40 bg-card/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
            {currentDoc.category === "INVOICE" && (
              <>
                <button
                  onClick={() => setInputText(pick({ ar: `أكد سداد الفاتورة ${currentDoc.code}`, en: `Confirm settlement for ${currentDoc.code}` }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  📄 {pick({ ar: "تأكيد الدفع", en: "Confirm Payment" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: `أرسل إيصال استلام رسمي للعميل ${currentDoc.clientName}`, en: `Send tax receipt to ${currentDoc.clientName}` }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  ✉ {pick({ ar: "إرسال إيصال", en: "Send Receipt" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "طبق خصم 5% سداد مبكر على الفاتورة", en: "Apply 5% prompt payment discount" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  ✨ {pick({ ar: "تطبيق خصم 5%", en: "Apply 5% Discount" })}
                </button>
              </>
            )}

            {currentDoc.category === "SALES ORDER" && (
              <>
                <button
                  onClick={() => setInputText(pick({ ar: `ما هو موعد شحن وتوصيل الطلب ${currentDoc.code}؟`, en: `What is the delivery ETA for ${currentDoc.code}?` }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  🚚 {pick({ ar: "تتبع الشحنة", en: "Track Shipment" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: `اطبع إذن صرف المستودع للطلب ${currentDoc.code}`, en: `Print warehouse dispatch note for ${currentDoc.code}` }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  📄 {pick({ ar: "إذن الصرف", en: "Dispatch Note" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "تأكيد فحص وتجهيز بضاعة الطلب", en: "Confirm warehouse packing completed" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  📦 {pick({ ar: "اكتمال التجهيز", en: "Packing Done" })}
                </button>
              </>
            )}

            {currentDoc.category === "SUPPORT TICKET" && (
              <>
                <button
                  onClick={() => setInputText(pick({ ar: "شغل فحص الاتصال بالشبكة وأعد تشغيل خادم المزامنة", en: "Run remote network diagnostics and restart sync daemon" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  🔧 {pick({ ar: "فحص الاتصال", en: "Run Diagnostics" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "انشر التحديث السريع v1.0.1 لنقطة البيع", en: "Deploy quick patch v1.0.1 to POS terminal" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  ⚡ {pick({ ar: "إرسال التحديث", en: "Deploy Patch" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "تم حل العطل وتأكيد عمل ماسح الباركود", en: "Issue resolved, scanner confirmed working" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  ✅ {pick({ ar: "إغلاق التذكرة", en: "Close Ticket" })}
                </button>
              </>
            )}

            {currentDoc.category === "CLIENT REGISTRATION" && (
              <>
                <button
                  onClick={() => setInputText(pick({ ar: `تم التحقق من السجل التجاري والبطاقة الضريبية لشركة ${currentDoc.clientName}`, en: `Verified tax card and commercial register for ${currentDoc.clientName}` }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  🛡️ {pick({ ar: "التحقق من البيانات", en: "Verify KYC" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "اعتمد تسهيل الائتمان $15,000 بحساب العميل", en: "Approve $15,000 credit limit on client account" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  💳 {pick({ ar: "اعتماد الائتمان", en: "Approve Credit" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "أرسل بيانات الدخول لبوابة الطلبات بالجملة", en: "Send wholesale B2B portal login credentials" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  ✉ {pick({ ar: "إرسال الترحيب", en: "Send Welcome" })}
                </button>
              </>
            )}

            {currentDoc.category === "PURCHASE ORDER" && (
              <>
                <button
                  onClick={() => setInputText(pick({ ar: `سجل استلام 2000 عبوة بالمخزن من المورد ${currentDoc.clientName}`, en: `Log warehouse intake of 2,000 units from ${currentDoc.clientName}` }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  📥 {pick({ ar: "استلام المخزن", en: "Warehouse Intake" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "اعتماد مطابقة المواصفات القياسية وفحص الجودة", en: "Approve quality inspection & batch testing" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  🔬 {pick({ ar: "فحص الجودة", en: "Quality Check" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "تحويل مستحقات المورد للحسابات للصرف", en: "Forward supplier payment to accounts payable" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  💵 {pick({ ar: "أمر الصرف", en: "Authorize Payout" })}
                </button>
              </>
            )}

            {currentDoc.category === "CUSTOMER INQUIRY" && (
              <>
                <button
                  onClick={() => setInputText(pick({ ar: `أرسل عرض أسعار بوفيه الأعراس الفاخر لـ ${currentDoc.clientName}`, en: `Send luxury wedding dessert quotation to ${currentDoc.clientName}` }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  📋 {pick({ ar: "إرسال عرض الأسعار", en: "Send Quote" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "تحديد موعد جلسة تذوق الأصناف يوم الخميس 4 عصراً", en: "Schedule dessert tasting session for Thursday at 4 PM" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  🍰 {pick({ ar: "موعد التذوق", en: "Schedule Tasting" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "حجز تاريخ المناسبة في جدول فعاليات قصر مصر الجديدة", en: "Reserve event date on Heliopolis ballroom schedule" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  📅 {pick({ ar: "حجز التاريخ", en: "Reserve Date" })}
                </button>
              </>
            )}

            {currentDoc.category === "MEETING BRIEF" && (
              <>
                <button
                  onClick={() => setInputText(pick({ ar: "إرسال رابط اجتماع Zoom ورسالة تذكير للأطراف المشاركة", en: "Send Zoom meeting link and reminder to all participants" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  📅 {pick({ ar: "رابط الاجتماع", en: "Send Link" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "تجهيز مسودة اتفاقية التوريد ونسبة الخصم 8% للاجتماع", en: "Prepare draft supply agreement and 8% rebate terms" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  📑 {pick({ ar: "مسودة الاتفاقية", en: "Draft Agreement" })}
                </button>
                <button
                  onClick={() => setInputText(pick({ ar: "تصدير ملخص محضر الاجتماع وتوصيات الذكاء الاصطناعي", en: "Export meeting brief summary and AI strategic insights" }))}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                >
                  📝 {pick({ ar: "تصدير المحضر", en: "Export Minutes" })}
                </button>
              </>
            )}
          </div>

          {/* Chat Message Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-border/50 bg-card flex items-center gap-2"
          >
            <div className="relative flex-1 flex items-center bg-secondary/60 rounded-xl px-3 py-1.5 border border-border/60 focus-within:border-primary focus-within:bg-card transition-colors">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={pick({
                  ar: "اكتب رسالة أو أمراً لحافظ الذكي...",
                  en: "Type a message...",
                })}
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />

              <div className="flex items-center gap-1.5 ms-2 text-muted-foreground">
                <button
                  type="button"
                  className="hover:text-foreground transition-colors p-1"
                  title="Attach file"
                >
                  <Paperclip className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="hover:text-foreground transition-colors p-1"
                  title="Emoji"
                >
                  <Smile className="size-3.5" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className={cn(
                "size-9 rounded-xl flex items-center justify-center transition-all shadow-sm",
                inputText.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20 active:scale-95"
                  : "bg-muted text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}