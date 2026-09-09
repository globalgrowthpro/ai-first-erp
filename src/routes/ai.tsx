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

interface DocumentData {
  id: string;
  code: string;
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  invoiceDate: string;
  dueDate: string;
  status: "Paid" | "Pending" | "Draft" | "Overdue";
  items: InvoiceItemLine[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  companyName: string;
  companyTagline: string;
  companyWebsite: string;
}

interface ChatMessage {
  id: string;
  sender: "client" | "agent";
  senderName: string;
  avatarText?: string | undefined;
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read" | undefined;
}

// ==========================================
// Mock Data (matches exact reference image)
// ==========================================

const SAMPLE_DOCUMENTS: Record<string, DocumentData> = {
  "inv-4521": {
    id: "inv-4521",
    code: "INVOICE #4521",
    title: "Invoice #4521",
    clientName: "Ali",
    clientEmail: "ali@example.com",
    clientPhone: "+20 123 456 7890",
    clientAddress: "Cairo, Egypt",
    invoiceDate: "08/09/2026",
    dueDate: "22/09/2026",
    status: "Paid",
    items: [
      { num: 1, description: "Web Development", qty: 1, unitPrice: 1000, total: 1000 },
      { num: 2, description: "Design & UI/UX", qty: 1, unitPrice: 500, total: 500 },
      { num: 3, description: "Hosting (1 Year)", qty: 1, unitPrice: 200, total: 200 },
    ],
    subtotal: 1700,
    taxPercent: 10,
    taxAmount: 170,
    total: 1870,
    companyName: "Your Company",
    companyTagline: "Professional Services",
    companyWebsite: "www.yourcompany.com",
  },
  "ord-7780": {
    id: "ord-7780",
    code: "ORDER #7780",
    title: "Order #7780",
    clientName: "Maha Trading",
    clientEmail: "orders@mahatrading.com",
    clientPhone: "+20 111 884 9021",
    clientAddress: "Giza, Egypt",
    invoiceDate: "08/09/2026",
    dueDate: "15/09/2026",
    status: "Paid",
    items: [
      { num: 1, description: "Bulk Packaging Materials", qty: 50, unitPrice: 35, total: 1750 },
      { num: 2, description: "Express Delivery & Logistics", qty: 1, unitPrice: 250, total: 250 },
    ],
    subtotal: 2000,
    taxPercent: 14,
    taxAmount: 280,
    total: 2280,
    companyName: "Wazeer El-Helw Confectionery",
    companyTagline: "Commercial Orders & Distribution",
    companyWebsite: "www.wazeer-elhelw.com",
  },
  "inv-4519": {
    id: "inv-4519",
    code: "INVOICE #4519",
    title: "Invoice #4519",
    clientName: "Sara Co.",
    clientEmail: "finance@saraco.net",
    clientPhone: "+20 100 933 2145",
    clientAddress: "Alexandria, Egypt",
    invoiceDate: "08/09/2026",
    dueDate: "18/09/2026",
    status: "Pending",
    items: [
      { num: 1, description: "Catering Luxury Sweets Buffet", qty: 120, unitPrice: 45, total: 5400 },
      { num: 2, description: "Custom Event Branding & Setup", qty: 1, unitPrice: 1200, total: 1200 },
    ],
    subtotal: 6600,
    taxPercent: 14,
    taxAmount: 924,
    total: 7524,
    companyName: "Wazeer El-Helw Catering",
    companyTagline: "VIP Dessert Buffets & Receptions",
    companyWebsite: "www.wazeer-elhelw.com",
  },
  "doc-1208": {
    id: "doc-1208",
    code: "PO #1208",
    title: "Purchase Order #1208",
    clientName: "Nile Packaging Ltd.",
    clientEmail: "supply@nilepkg.com",
    clientPhone: "+20 122 443 8900",
    clientAddress: "10th of Ramadan City",
    invoiceDate: "07/09/2026",
    dueDate: "14/09/2026",
    status: "Paid",
    items: [
      { num: 1, description: "Sweet Koshary Plastic Bowls 500ml", qty: 2000, unitPrice: 2.2, total: 4400 },
      { num: 2, description: "Golden Dessert Spoons & Seals", qty: 2000, unitPrice: 0.8, total: 1600 },
    ],
    subtotal: 6000,
    taxPercent: 14,
    taxAmount: 840,
    total: 6840,
    companyName: "Central Procurement Dept",
    companyTagline: "Wazeer El-Helw Supply Chain",
    companyWebsite: "www.wazeer-elhelw.com",
  },
};

const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    type: "invoice",
    title: "Invoice #4521",
    subtitle: "Client: Ali",
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
    subtitle: "Issue with login",
    time: "09:32 AM",
    iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    iconColor: "text-purple-600",
    icon: MessageSquare,
    documentId: "inv-4521",
  },
  {
    id: "act-4",
    type: "registration",
    title: "New Client Registration",
    subtitle: "Ahmad Al-Saeed",
    time: "08:50 AM",
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    iconColor: "text-amber-600",
    icon: User,
    documentId: "inv-4519",
  },
  {
    id: "act-5",
    type: "invoice",
    title: "Invoice #4519",
    subtitle: "Client: Sara Co.",
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
    documentId: "doc-1208",
  },
  {
    id: "act-7",
    type: "message",
    title: "New Message",
    subtitle: "From: Fatima",
    time: "Yesterday",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    iconColor: "text-emerald-600",
    icon: MessageSquareText,
    documentId: "inv-4521",
  },
  {
    id: "act-8",
    type: "meeting",
    title: "Meeting Scheduled",
    subtitle: "Project Discussion",
    time: "Yesterday",
    iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    iconColor: "text-indigo-600",
    icon: Calendar,
    documentId: "ord-7780",
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    sender: "client",
    senderName: "Ali",
    avatarText: "A",
    text: "Hello, I need an update on invoice #4521. Has it been paid already?",
    time: "09:58 AM",
  },
  {
    id: "msg-2",
    sender: "agent",
    senderName: "Hafez",
    text: "Good morning Ali, Yes, the invoice is paid. Here is the details.",
    time: "10:02 AM",
    status: "read",
  },
  {
    id: "msg-3",
    sender: "client",
    senderName: "Ali",
    avatarText: "A",
    text: "Great! Thank you for the quick response.",
    time: "10:02 AM",
  },
  {
    id: "msg-4",
    sender: "agent",
    senderName: "Hafez",
    text: "You're welcome!",
    time: "10:07 AM",
    status: "read",
  },
];

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
  const { t, pick, dir } = useI18n();

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
      if (lower.includes("invoice") || lower.includes("فاتورة")) {
        replyText = pick({
          ar: `لقد تم عرض الفاتورة (${currentDoc.code}) للعميل ${currentDoc.clientName} بقيمة $${currentDoc.total.toLocaleString()} وحالتها (${currentDoc.status}).`,
          en: `Displaying invoice ${currentDoc.code} for ${currentDoc.clientName} totaling $${currentDoc.total.toLocaleString()} (Status: ${currentDoc.status}).`,
        });
      } else if (lower.includes("discount") || lower.includes("خصم")) {
        replyText = pick({
          ar: "تم حساب نسبة الخصم وتحديث إجمالي الفاتورة المعتمدة.",
          en: "Discount calculation applied and the approved total has been updated.",
        });
      } else if (lower.includes("receipt") || lower.includes("إيصال")) {
        replyText = pick({
          ar: `تم إنشاء سند القبض ورابط الفاتورة #${currentDoc.code}. يمكنك تحميل نسخة PDF مباشرة.`,
          en: `Payment receipt generated for ${currentDoc.code}. You can export or print the PDF directly.`,
        });
      }

      const botReply: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        sender: "client",
        senderName: currentDoc.clientName || "Ali",
        avatarText: currentDoc.clientName ? currentDoc.clientName[0] : "A",
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
      {/* Top Floating Subheader Bar (matches exact reference screenshot) */}
      {/* ============================================================ */}
      <div className="surface-panel rounded-2xl p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: ChatHub Branding */}
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <MessageSquareText className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-extrabold text-base tracking-tight text-foreground">
                <span>ChatHub</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                Connect · Support · Grow
              </p>
            </div>
          </div>

          {/* Center-Left: Greeting & User Profile */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/50">
            <div className="relative">
              <div className="size-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                HR
              </div>
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="text-xs">
              <span className="text-[10px] text-muted-foreground block font-medium">
                {pick({ ar: "صباح الخير،", en: "Good morning," })}
              </span>
              <span className="font-bold text-foreground flex items-center gap-1">
                <span>Hafez</span>
                <span>👋</span>
              </span>
            </div>
          </div>

          {/* Center-Right: Date & Time Indicator */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/50 text-xs">
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
          <div className="flex items-center gap-1.5">
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
            <button
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title={pick({ ar: "المزيد", en: "More options" })}
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher for 3 Columns */}
      <div className="lg:hidden flex items-center gap-1 p-1 bg-card rounded-xl border border-border/60 text-xs font-semibold">
        <button
          onClick={() => setActiveMobileTab("activities")}
          className={cn(
            "flex-1 py-1.5 rounded-lg transition-colors text-center",
            activeMobileTab === "activities"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          {pick({ ar: "الأنشطة الأخيرة", en: "Recent Activities" })}
        </button>
        <button
          onClick={() => setActiveMobileTab("document")}
          className={cn(
            "flex-1 py-1.5 rounded-lg transition-colors text-center",
            activeMobileTab === "document"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          {pick({ ar: "معاينة الفاتورة", en: "Invoice Preview" })}
        </button>
        <button
          onClick={() => setActiveMobileTab("chat")}
          className={cn(
            "flex-1 py-1.5 rounded-lg transition-colors text-center",
            activeMobileTab === "chat"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          {pick({ ar: "محادثة العميل", en: "Client Chat" })}
        </button>
      </div>

      {/* ============================================================ */}
      {/* 3-Column Executive Workspace Grid */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ---------------------------------------------------------- */}
        {/* Column 1: Recent Activities (Col-3) */}
        {/* ---------------------------------------------------------- */}
        <div
          className={cn(
            "surface-panel rounded-2xl shadow-sm overflow-hidden lg:col-span-3 flex flex-col h-[760px]",
            activeMobileTab !== "activities" && "hidden lg:flex"
          )}
        >
          {/* Header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
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
        {/* Column 2: Live Document Sheet Preview (Col-5 / 6) */}
        {/* ---------------------------------------------------------- */}
        <div
          className={cn(
            "surface-panel rounded-2xl shadow-sm overflow-hidden lg:col-span-5 xl:col-span-5 flex flex-col h-[760px]",
            activeMobileTab !== "document" && "hidden lg:flex"
          )}
        >
          {/* Top Bar above sheet */}
          <div className="p-3.5 border-b border-border/50 flex items-center justify-between bg-card/60">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setActiveMobileTab("activities")}
                className="size-7 rounded-lg border border-border/60 bg-background flex items-center justify-center text-muted-foreground hover:text-foreground"
                title={pick({ ar: "رجوع", en: "Back" })}
              >
                <ChevronLeft className="size-4" />
              </button>
              <div>
                <h3 className="font-bold text-sm text-foreground leading-tight">
                  {currentDoc.code}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Client: {currentDoc.clientName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrint}
                className="size-8 rounded-lg border border-border/70 bg-background text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                title={pick({ ar: "تحميل / طباعة", en: "Download / Print" })}
              >
                <Download className="size-4" />
              </button>
              <button
                className="size-8 rounded-lg border border-border/70 bg-background text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                title={pick({ ar: "المزيد من الخيارات", en: "More options" })}
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Document Canvas */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/20">
            {/* The Actual White Document Sheet (matches exact visual in image) */}
            <div className="bg-card text-card-foreground rounded-2xl p-6 sm:p-8 shadow-sm border border-border/60 space-y-6 max-w-xl mx-auto">
              {/* Sheet Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Geometric Logo */}
                  <div className="size-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 p-0.5 shadow-sm flex items-center justify-center text-white font-extrabold text-base">
                    ▲
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-foreground leading-tight">
                      {currentDoc.companyName}
                    </h2>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {currentDoc.companyTagline}
                    </p>
                  </div>
                </div>

                <div className="text-end">
                  <span className="font-black text-lg tracking-wider text-slate-900 dark:text-slate-100 uppercase block">
                    INVOICE
                  </span>
                  <span className="font-mono font-bold text-xs text-muted-foreground">
                    #{currentDoc.code.replace(/[^0-9]/g, "") || "4521"}
                  </span>
                </div>
              </div>

              {/* Bill To & Invoice Info */}
              <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                {/* Left: Bill To */}
                <div className="space-y-1">
                  <span className="font-bold text-foreground text-xs block mb-1">
                    Bill To:
                  </span>
                  <p className="font-semibold text-foreground">{currentDoc.clientName}</p>
                  <p className="text-muted-foreground text-[11px] flex items-center gap-1">
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
                <div className="space-y-1.5 text-end">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {currentDoc.invoiceDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {currentDoc.dueDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-muted-foreground text-[11px]">Status:</span>
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                        currentDoc.status === "Paid"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {currentDoc.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-xl overflow-hidden border border-border/50">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 border-b border-border/50 text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3 text-start font-semibold w-8">#</th>
                      <th className="py-2 px-3 text-start font-semibold">Description</th>
                      <th className="py-2 px-3 text-center font-semibold w-12">Qty</th>
                      <th className="py-2 px-3 text-end font-semibold w-24">Unit Price</th>
                      <th className="py-2 px-3 text-end font-semibold w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {currentDoc.items.map((item) => (
                      <tr key={item.num} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 text-start text-muted-foreground font-sans">
                          {item.num}
                        </td>
                        <td className="py-2.5 px-3 text-start font-sans font-medium text-foreground">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-3 text-center text-foreground">
                          {item.qty}
                        </td>
                        <td className="py-2.5 px-3 text-end text-muted-foreground">
                          ${item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-end font-semibold text-foreground">
                          ${item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-56 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono font-medium text-foreground">
                      ${currentDoc.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Tax ({currentDoc.taxPercent}%)</span>
                    <span className="font-mono font-medium text-foreground">
                      ${currentDoc.taxAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border/60 font-bold">
                    <span className="text-foreground text-sm">Total</span>
                    <span className="font-mono text-base text-primary">
                      ${currentDoc.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Note & QR Code */}
              <div className="pt-6 border-t border-border/40 flex items-end justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <p className="font-medium text-muted-foreground italic">
                    Thank you for your business!
                  </p>
                  <p className="font-bold text-foreground text-[11px]">
                    {currentDoc.companyName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {currentDoc.companyWebsite}
                  </p>
                </div>

                <div>
                  <QrCodeGraphic value={`${currentDoc.code}|${currentDoc.total}`} size={56} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Column 3: Interactive Chat Assistant (Col-4) */}
        {/* ---------------------------------------------------------- */}
        <div
          className={cn(
            "surface-panel rounded-2xl shadow-sm overflow-hidden lg:col-span-4 xl:col-span-4 flex flex-col h-[760px]",
            activeMobileTab !== "chat" && "hidden lg:flex"
          )}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-border/50 flex items-center justify-between bg-card/60">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {currentDoc.clientName ? currentDoc.clientName[0] : "A"}
              </div>
              <div>
                <h4 className="font-bold text-xs text-foreground">
                  {currentDoc.clientName || "Ali"}
                </h4>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online</span>
                </p>
              </div>
            </div>

            <button
              className="size-8 rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground flex items-center justify-center"
              title={pick({ ar: "خيارات المحادثة", en: "Chat options" })}
            >
              <MoreHorizontal className="size-4" />
            </button>
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
            <button
              onClick={() => {
                setInputText(pick({
                  ar: `أكد دفع الفاتورة ${currentDoc.code}`,
                  en: `Confirm payment for ${currentDoc.code}`,
                }));
              }}
              className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              📄 {pick({ ar: "تأكيد الدفع", en: "Confirm Payment" })}
            </button>
            <button
              onClick={() => {
                setInputText(pick({
                  ar: "أرسل إيصال استلام رسمي للعميل",
                  en: "Send official receipt to client",
                }));
              }}
              className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              ✉ {pick({ ar: "إرسال إيصال", en: "Send Receipt" })}
            </button>
            <button
              onClick={() => {
                setInputText(pick({
                  ar: "طبق خصم 5% على الفاتورة",
                  en: "Apply 5% discount to invoice",
                }));
              }}
              className="px-2.5 py-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              ✨ {pick({ ar: "تطبيق خصم", en: "Apply Discount" })}
            </button>
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