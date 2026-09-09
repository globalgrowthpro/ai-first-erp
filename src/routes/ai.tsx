import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCompanySettings } from "@/lib/settings-store";
import { cn } from "@/lib/utils";

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

// ==========================================
// Mock Data for All 8 Activities
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
    notes: "AI remote agent inspected system logs, restarted the local sync daemon, and queued firmware patch v2.4.1 for terminal POS-NC-04. System reboot verified; awaiting final cashier physical barcode scan confirmation.",
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
      text: "Hello Kareem, I see the error in the logs. Restarting the sync service remotely now and deploying patch v2.4.1.",
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
// SVG QR Code Component
// ==========================================
function QrCodeGraphic({ value, size = 64 }: { value: string; size?: number }) {
  return (
    <div
      className="p-1.5 bg-white rounded-lg border border-border/80 inline-block shadow-xs"
      title={`Verify: ${value}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Decorative realistic QR grid matrix */}
        <rect width="24" height="24" fill="white" />
        {/* Top Left Marker */}
        <rect x="2" y="2" width="6" height="6" rx="1" fill="#1e293b" />
        <rect x="3" y="3" width="4" height="4" fill="white" />
        <rect x="4" y="4" width="2" height="2" fill="#1e293b" />
        {/* Top Right Marker */}
        <rect x="16" y="2" width="6" height="6" rx="1" fill="#1e293b" />
        <rect x="17" y="3" width="4" height="4" fill="white" />
        <rect x="18" y="4" width="2" height="2" fill="#1e293b" />
        {/* Bottom Left Marker */}
        <rect x="2" y="16" width="6" height="6" rx="1" fill="#1e293b" />
        <rect x="3" y="17" width="4" height="4" fill="white" />
        <rect x="4" y="18" width="2" height="2" fill="#1e293b" />
        {/* Data bits */}
        <rect x="10" y="2" width="2" height="2" fill="#1e293b" />
        <rect x="13" y="3" width="1.5" height="1.5" fill="#1e293b" />
        <rect x="10" y="6" width="2" height="2" fill="#1e293b" />
        <rect x="9" y="9" width="3" height="3" rx="0.5" fill="#1e293b" />
        <rect x="14" y="10" width="2" height="2" fill="#1e293b" />
        <rect x="17" y="10" width="2" height="1.5" fill="#1e293b" />
        <rect x="3" y="10" width="2" height="2" fill="#1e293b" />
        <rect x="6" y="12" width="2" height="2" fill="#1e293b" />
        <rect x="10" y="14" width="2" height="2" fill="#1e293b" />
        <rect x="13" y="16" width="2" height="3" fill="#1e293b" />
        <rect x="17" y="14" width="2" height="2" fill="#1e293b" />
        <rect x="19" y="18" width="3" height="3" fill="#1e293b" />
        <rect x="10" y="20" width="2" height="2" fill="#1e293b" />
        <rect x="16" y="20" width="1.5" height="1.5" fill="#1e293b" />
      </svg>
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

function AiWorkspacePage() {
  const { t, pick, dir, lang } = useI18n();
  const { settings } = useCompanySettings();
  const companyLogo = settings.logoUrl || "/wazeer-logo.png";
  const companyName = lang === "ar" ? settings.nameAr : settings.nameEn;

  // State
  const [selectedActivityId, setSelectedActivityId] = useState<string>("act-1");
  const [selectedDocId, setSelectedDocId] = useState<string>("inv-4521");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [activeMobileTab, setActiveMobileTab] = useState<"activities" | "document" | "chat">("document");

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Current active document
  const currentDoc: DocumentData = SAMPLE_DOCUMENTS[selectedDocId] ?? SAMPLE_DOCUMENTS["inv-4521"]!;

  // Activity click handler
  const handleSelectActivity = (activity: ActivityItem) => {
    setSelectedActivityId(activity.id);
    if (activity.documentId && SAMPLE_DOCUMENTS[activity.documentId]) {
      setSelectedDocId(activity.documentId);
    }
    if (ACTIVITY_CHATS[activity.id]) {
      setMessages(ACTIVITY_CHATS[activity.id]!);
    }
    // If mobile, switch to document view
    setActiveMobileTab("document");
  };

  // Send message handler
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMsgText = inputText.trim();
    setInputText("");

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "agent",
      senderName: "Hafez",
      text: userMsgText,
      time: timeStr,
      status: "delivered",
    };

    setMessages((prev) => [...prev, userMsg]);

    // Intelligent AI Copilot response after short delay
    setTimeout(() => {
      let replyText = pick({
        ar: "تم استلام طلبك ومراجعة تفاصيل المستند. كل الأمور مسجلة وموثقة في النظام بنجاح!",
        en: "Your request has been received and verified against the ERP records. All entries are updated!",
      });

      const lower = userMsgText.toLowerCase();
      if (lower.includes("invoice") || lower.includes("فاتورة") || lower.includes("order") || lower.includes("طلب")) {
        const totalStr = currentDoc.total !== undefined ? ` بقيمة $${currentDoc.total.toLocaleString()}` : "";
        const totalStrEn = currentDoc.total !== undefined ? ` totaling $${currentDoc.total.toLocaleString()}` : "";
        replyText = pick({
          ar: `لقد تم استعراض ${currentDoc.category} (${currentDoc.code}) للجهة ${currentDoc.clientName}${totalStr} وحالتها (${currentDoc.status}).`,
          en: `Displaying ${currentDoc.category} ${currentDoc.code} for ${currentDoc.clientName}${totalStrEn} (Status: ${currentDoc.status}).`,
        });
      } else if (lower.includes("ticket") || lower.includes("تذكرة") || lower.includes("دعم") || lower.includes("pos")) {
        replyText = pick({
          ar: `التذكرة ${currentDoc.code} قيد المعالجة السريعة من فريق الدعم الفني وتم تفعيل بروتوكول الصيانة.`,
          en: `Ticket ${currentDoc.code} is being actively handled by IT systems engineering team.`,
        });
      } else if (lower.includes("discount") || lower.includes("خصم")) {
        replyText = pick({
          ar: "تم حساب نسبة الخصم وتحديث تفاصيل المعاملة المعتمدة.",
          en: "Discount calculation applied and approved transaction record updated.",
        });
      } else if (lower.includes("receipt") || lower.includes("إيصال") || lower.includes("pdf") || lower.includes("طباعة")) {
        replyText = pick({
          ar: `تم تجهيز المستند المعتمد ورابط ${currentDoc.code}. يمكنك تحميل نسخة PDF أو طباعتها مباشرة.`,
          en: `Verified record generated for ${currentDoc.code}. You can export or print the PDF directly.`,
        });
      }

      const botReply: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        sender: "client",
        senderName: currentDoc.clientName || "Client",
        ...(currentDoc.clientName ? { avatarText: currentDoc.clientName[0] } : {}),
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botReply]);
    }, 800);
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
              <div className="size-7 sm:size-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                HR
              </div>
              <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="text-xs">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground block font-medium">
                {pick({ ar: "صباح الخير،", en: "Good morning," })}
              </span>
              <span className="font-bold text-foreground flex items-center gap-1 text-[11px] sm:text-xs">
                <span>Hafez</span>
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
            <div className="sm:hidden relative">
              <div className="size-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
                HR
              </div>
            </div>
            <button
              className="size-8 rounded-lg hidden sm:flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title={pick({ ar: "المزيد", en: "More options" })}
            >
              <ChevronDown className="size-4" />
            </button>
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
            {INITIAL_ACTIVITIES.length}
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
            {INITIAL_ACTIVITIES.map((act) => {
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
                  <QrCodeGraphic value={`${currentDoc.code}|${currentDoc.status}|${currentDoc.total ?? currentDoc.clientName}`} size={52} />
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
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online</span>
                </p>
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
                  onClick={() => setInputText(pick({ ar: "انشر التحديث السريع v2.4.1 لنقطة البيع", en: "Deploy quick patch v2.4.1 to POS terminal" }))}
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