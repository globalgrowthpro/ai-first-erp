import { useState, useEffect, useCallback } from "react";

export type TicketPriority = "urgent" | "high" | "medium" | "low";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketCategory =
  | "branch_pos"
  | "central_kitchen"
  | "inventory_supply"
  | "billing_accounting"
  | "system_bug"
  | "general_inquiry";

export interface TicketResponse {
  id: string;
  sender: string;
  senderRole: string;
  message: string;
  timestamp: string;
  isInternal?: boolean;
}

export interface HelpdeskTicket {
  id: string;
  ticketNumber: string; // e.g. TKT-2026-101
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  branchOrLocation: string;
  submitterName: string;
  submitterRole: string;
  submitterPhone?: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  slaDueHours: number;
  responses: TicketResponse[];
  resolutionNotes?: string;
}

const STORAGE_KEY = "wazeer_erp_helpdesk_tickets_v1";

export const INITIAL_TICKETS: HelpdeskTicket[] = [
  {
    id: "tkt-1",
    ticketNumber: "TKT-2026-101",
    title: "عطل طابعة إيصالات الكاشير في نقطة بيع #2 - فرع الكوربة",
    description: "طابعة الإيصالات الحرارية توقفت عن العمل فجأة أثناء وردية المساء مع ظهور رسالة خطأ اتصال USB، تم تجربة إعادة التشغيل ولم تستجب.",
    category: "branch_pos",
    priority: "high",
    status: "in_progress",
    branchOrLocation: "فرع الكوربة — مصر الجديدة",
    submitterName: "أحمد حسني",
    submitterRole: "مشرف وردية الكاشير",
    submitterPhone: "+20 102 334 1122",
    assignedTo: "م. إسلام حمدي (دعم تقني فروع)",
    createdAt: "2026-09-26 15:30",
    updatedAt: "2026-09-26 16:45",
    slaDueHours: 4,
    responses: [
      {
        id: "resp-1",
        sender: "أحمد حسني",
        senderRole: "مشرف وردية الكاشير",
        message: "تم توجيه العملاء مؤقتاً لنقطة بيع رقم 1 حتى حل المشكلة لتجنب التكدس.",
        timestamp: "2026-09-26 15:35",
      },
      {
        id: "resp-2",
        sender: "م. إسلام حمدي",
        senderRole: "مهندس الدعم الفني",
        message: "تم عمل اتصال عن بعد (AnyDesk)، المشكلة في تعريف المنفذ بعد تحديث الويندوز. جاري إعادة تثبيت التعريف.",
        timestamp: "2026-09-26 16:45",
        isInternal: true,
      },
    ],
  },
  {
    id: "tkt-2",
    ticketNumber: "TKT-2026-102",
    title: "طلب تصريح خروج شحنة أرز باللبن وقشطوطة طارئة للمطبخ المركزي",
    description: "طلب تعزيز عاجل لفرع التجمع الخامس نتيجة نفاذ عبوات القشطوطة والأرز باللبن خلال فعالية محلية.",
    category: "inventory_supply",
    priority: "urgent",
    status: "open",
    branchOrLocation: "فرع التجمع الخامس — التسعين",
    submitterName: "عمر فاروق",
    submitterRole: "مدير الفرع",
    submitterPhone: "+20 109 332 5580",
    assignedTo: "م. شريف بدوي (اللوجستيات المركزية)",
    createdAt: "2026-09-26 17:15",
    updatedAt: "2026-09-26 17:15",
    slaDueHours: 2,
    responses: [
      {
        id: "resp-3",
        sender: "عمر فاروق",
        senderRole: "مدير الفرع",
        message: "نحتاج 80 عبوة قشطوطة لوتس و60 عبوة كشري أرز باللبن قبل الساعة 8 مساءً.",
        timestamp: "2026-09-26 17:20",
      },
    ],
  },
  {
    id: "tkt-3",
    ticketNumber: "TKT-2026-103",
    title: "معايرة ميزان الديجيتال بعنبر تحضير الأسبونش والفرن",
    description: "وجود فارق تقريبي 15 جرام في الأوزان الحساسة الخاصة بمحسن الكيك والنشا، يتطلب فحص حساس الوزن وضبط المعايرة.",
    category: "central_kitchen",
    priority: "medium",
    status: "in_progress",
    branchOrLocation: "مصنع العاشر المركزي — عنبر الأسبونش",
    submitterName: "شيف طارق عبد العال",
    submitterRole: "رئيس قسم تحضير الأسبونش",
    submitterPhone: "+20 122 334 5560",
    assignedTo: "م. سامي رزق (صيانة الأجهزة)",
    createdAt: "2026-09-26 11:00",
    updatedAt: "2026-09-26 14:10",
    slaDueHours: 8,
    responses: [
      {
        id: "resp-4",
        sender: "م. سامي رزق",
        senderRole: "مهندس الصيانة",
        message: "تم توفير ميزان بديل مؤقت لحين استبدال بطارية وخلايا الوزن.",
        timestamp: "2026-09-26 14:10",
      },
    ],
  },
  {
    id: "tkt-4",
    ticketNumber: "TKT-2026-104",
    title: "استفسار تسوية جرد نهاية الشهر لمستودع التبريد والخامات",
    description: "استفسار حول آلية إثبات الهالك الطبيعي لصوصات النوتيلا والكراميل بعد فتح البراميل 15 كجم.",
    category: "billing_accounting",
    priority: "low",
    status: "resolved",
    branchOrLocation: "مستودع التبريد والخامات المركزي",
    submitterName: "أ. سعيد حامد",
    submitterRole: "أمين المستودع",
    submitterPhone: "+20 109 443 1200",
    assignedTo: "أ. محمود عبد الرحمن (الحسابات والتكاليف)",
    createdAt: "2026-09-25 09:30",
    updatedAt: "2026-09-26 10:15",
    slaDueHours: 24,
    resolutionNotes: "تم توضيح بند نسبة الفاقد القياسي (Scrap Rate 1.5%) وفق معايير ريسبي 2026 وإضافته في استمارة الجرد.",
    responses: [
      {
        id: "resp-5",
        sender: "أ. محمود عبد الرحمن",
        senderRole: "رئيس قسم التكاليف",
        message: "تم تفعيل حقل نسبة الهدر المعتمد في شيت الجرد السحابي، يمكنك الآن قيد الفاقد مباشرة.",
        timestamp: "2026-09-26 10:15",
      },
    ],
  },
  {
    id: "tkt-5",
    ticketNumber: "TKT-2026-105",
    title: "بطء في مزامنة فواتير الكاشير بنظام الضرائب الإلكترونية",
    description: "تأخر ظهور رقم الـ UUID الإلكتروني لبعض فواتير فرع المعادي خلال ساعات الذروة.",
    category: "system_bug",
    priority: "high",
    status: "closed",
    branchOrLocation: "فرع المعادي — شارع النصر",
    submitterName: "أ. كريم عبد الله",
    submitterRole: "مدير فرع المعادي",
    submitterPhone: "+20 122 710 4433",
    assignedTo: "فريق هندسة البرمجيات والربط السحابي",
    createdAt: "2026-09-24 18:00",
    updatedAt: "2026-09-25 12:30",
    slaDueHours: 6,
    resolutionNotes: "تم فحص الـ API Gateway وزيادة مهلة الاستجابة إلى 10 ثوان، واكتمال الربط بنجاح بنسبة 100%.",
    responses: [
      {
        id: "resp-6",
        sender: "فريق الدعم الفني",
        senderRole: "مدير النظم",
        message: "تم تحديث خادم الـ Gateway ومزامنة كافة الفواتير المعلقة دون أي فقد بالبيانات.",
        timestamp: "2026-09-25 12:30",
      },
    ],
  },
];

export function useHelpdeskStore() {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>(() => {
    if (typeof window === "undefined") return INITIAL_TICKETS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_TICKETS;
    } catch {
      return INITIAL_TICKETS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch (e) {
      console.error("Failed to save helpdesk tickets", e);
    }
  }, [tickets]);

  const addTicket = useCallback(
    (ticket: Omit<HelpdeskTicket, "id" | "ticketNumber" | "createdAt" | "updatedAt" | "responses">) => {
      const newTicket: HelpdeskTicket = {
        ...ticket,
        id: `tkt-${Date.now()}`,
        ticketNumber: `TKT-2026-${Math.floor(100 + Math.random() * 900)}`,
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        updatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        responses: [],
      };
      setTickets((prev) => [newTicket, ...prev]);
      return newTicket;
    },
    []
  );

  const updateTicketStatus = useCallback((id: string, status: TicketStatus, resolutionNotes?: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              updatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
              ...(resolutionNotes !== undefined ? { resolutionNotes } : {}),
            }
          : t
      )
    );
  }, []);

  const assignTicket = useCallback((id: string, assignee: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              assignedTo: assignee,
              updatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
            }
          : t
      )
    );
  }, []);

  const addResponse = useCallback(
    (ticketId: string, response: Omit<TicketResponse, "id" | "timestamp">) => {
      const newResponse: TicketResponse = {
        ...response,
        id: `resp-${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      };

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                updatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
                responses: [...t.responses, newResponse],
              }
            : t
        )
      );
    },
    []
  );

  const deleteTicket = useCallback((id: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const resetToSeed = useCallback(() => {
    setTickets(INITIAL_TICKETS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return {
    tickets,
    addTicket,
    updateTicketStatus,
    assignTicket,
    addResponse,
    deleteTicket,
    resetToSeed,
  };
}
