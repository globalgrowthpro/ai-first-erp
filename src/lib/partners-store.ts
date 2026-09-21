import { useState, useEffect, useCallback } from "react";

export type PartnerType = "customer" | "supplier";

export type PartnerGroup =
  | "hotels"
  | "restaurants"
  | "catering"
  | "retail"
  | "raw_ingredients"
  | "packaging"
  | "services";

export type PaymentTerms = "immediate" | "15_days" | "30_days" | "45_days" | "60_days";

export type PaymentCategory = "invoice" | "advance" | "nulling";

export interface PartnerTransaction {
  id: string;
  date: string;
  type: "invoice" | "payment" | "purchase_order" | "credit_note";
  docRef: string;
  description: { ar: string; en: string };
  amount: number;
  status: "paid" | "partial" | "pending";
  paymentCategory?: PaymentCategory | undefined;
  relatedDocRef?: string | undefined;
  paymentMethod?: string | undefined;
  proofImage?: string | undefined;
}

export interface RecordPaymentParams {
  category: PaymentCategory;
  amount: number;
  date?: string | undefined;
  relatedDocRef?: string | undefined;
  paymentMethod?: string | undefined;
  notes?: string | undefined;
  proofImage?: string | undefined;
}

export interface Partner {
  id: string;
  code: string;
  name: { ar: string; en: string };
  type: PartnerType;
  group: PartnerGroup;
  taxNumber: string;
  phone: string;
  email: string;
  address: { ar: string; en: string };
  contactPerson: string;
  creditLimit: number;
  balance: number;
  paymentTerms: PaymentTerms;
  status: "active" | "inactive";
  logo?: string | undefined;
  notes?: string | undefined;
  createdAt: string;
  transactions: PartnerTransaction[];
}

const STORAGE_KEY = "wazeer_erp_partners_store_v1";

export const INITIAL_PARTNERS: Partner[] = [
  // CUSTOMERS (HOTELS & VIP CLIENTS)
  {
    id: "p-1",
    code: "CUST-1042",
    name: { ar: "فندق الماسة كابيتال — العاصمة الإدارية", en: "Al-Masa Hotel Capital" },
    type: "customer",
    group: "hotels",
    taxNumber: "100-349-821",
    phone: "+20 100 741 9344",
    email: "catering@almasa-hotel.eg",
    address: { ar: "الحي الحكومي، العاصمة الإدارية الجديدة", en: "Government District, New Administrative Capital" },
    contactPerson: "أ. عصام شحاتة (مدير المشتريات)",
    creditLimit: 100000,
    balance: 24500,
    paymentTerms: "30_days",
    status: "active",
    logo: "/logos/al-masa.svg",
    notes: "عميل VIP لتوريد حلويات بوفيهات الحفلات والمؤتمرات الرسمية",
    createdAt: "2026-01-15",
    transactions: [
      {
        id: "tx-1",
        date: "2026-09-07",
        type: "invoice",
        docRef: "INV-10452",
        description: { ar: "توريد حلويات شرقية فاخرة لحفل ختامي", en: "Luxury oriental sweets catering" },
        amount: 36000,
        status: "paid",
      },
      {
        id: "tx-2",
        date: "2026-09-02",
        type: "invoice",
        docRef: "INV-10430",
        description: { ar: "توريد 150 طبق كشري حلو وقشطوطة", en: "150 sweet koshary & kashtouta bowls" },
        amount: 24500,
        status: "pending",
      },
    ],
  },
  {
    id: "p-2",
    code: "CUST-1043",
    name: { ar: "سلسلة مطاعم وكافيهات سيزار", en: "Cesar Restaurant & Cafe Chain" },
    type: "customer",
    group: "restaurants",
    taxNumber: "220-891-443",
    phone: "+20 122 555 8100",
    email: "procurement@cesarcafe.com",
    address: { ar: "مول العرب، بوابة 3، الشيخ زايد", en: "Mall of Arabia, Gate 3, Sheikh Zayed" },
    contactPerson: "م. حسام النجار",
    creditLimit: 120000,
    balance: 0,
    paymentTerms: "15_days",
    status: "active",
    logo: "/logos/cesar.svg",
    notes: "سداد فوري ومنتظم، خصم تجاري معتمد 8%",
    createdAt: "2026-02-10",
    transactions: [
      {
        id: "tx-3",
        date: "2026-09-07",
        type: "invoice",
        docRef: "INV-10451",
        description: { ar: "توريد كاسات حلويات وطواجن نوتيلا", en: "Dessert cups and nutella tajins" },
        amount: 84500,
        status: "paid",
      },
    ],
  },
  {
    id: "p-3",
    code: "CUST-1044",
    name: { ar: "نادي الجزيرة الرياضي — الزمالك", en: "Gezira Sporting Club — Zamalek" },
    type: "customer",
    group: "catering",
    taxNumber: "331-502-119",
    phone: "+20 111 903 4477",
    email: "events@geziraclub.eg",
    address: { ar: "شارع سراي الجزيرة، الزمالك، القاهرة", en: "Saray El-Gezira St, Zamalek, Cairo" },
    contactPerson: "كابتن شريف عثمان",
    creditLimit: 150000,
    balance: 61000,
    paymentTerms: "30_days",
    status: "active",
    logo: "/logos/gezira.svg",
    notes: "توريدات ركن حلويات وزير الحلو بالحديقة الرئيسية بالنادي",
    createdAt: "2026-03-01",
    transactions: [
      {
        id: "tx-4",
        date: "2026-09-05",
        type: "invoice",
        docRef: "INV-10447",
        description: { ar: "بوفيه حلويات عطلة نهاية الأسبوع", en: "Weekend sweet buffet catering" },
        amount: 141000,
        status: "partial",
      },
    ],
  },
  {
    id: "p-4",
    code: "CUST-1045",
    name: { ar: "مؤسسة لوسيل لتنظيم المؤتمرات والمعارض", en: "Lusail Events & Catering" },
    type: "customer",
    group: "catering",
    taxNumber: "405-112-990",
    phone: "+20 101 229 0044",
    email: "info@lusailevents.com",
    address: { ar: "مركز مصر للمعارض الدولية، محور المشير", en: "Egypt International Exhibition Center" },
    contactPerson: "أ. نورهان المهدي",
    creditLimit: 50000,
    balance: 19750,
    paymentTerms: "15_days",
    status: "active",
    logo: "/logos/lusail.svg",
    notes: "فواتير موسمية معتمدة",
    createdAt: "2026-04-12",
    transactions: [
      {
        id: "tx-5",
        date: "2026-09-06",
        type: "invoice",
        docRef: "INV-10450",
        description: { ar: "بوفيه ضيافة معرض التكنولوجيا", en: "Tech Expo VIP hospitality sweets" },
        amount: 19750,
        status: "pending",
      },
    ],
  },

  // SUPPLIERS (INGREDIENTS & PACKAGING)
  {
    id: "p-5",
    code: "SUPP-2011",
    name: { ar: "شركة فيريرو مصر — توريد نوتيلا وشوكولاتة", en: "Ferrero Egypt — Nutella & Spreads" },
    type: "supplier",
    group: "raw_ingredients",
    taxNumber: "102-881-300",
    phone: "+20 2 2614 7000",
    email: "b2b.egypt@ferrero.com",
    address: { ar: "القطامية ديونز، التجمع الخامس، القاهرة", en: "Katameya Dunes, New Cairo" },
    contactPerson: "أ. كريم منصور (مدير مبيعات الشركات)",
    creditLimit: 250000,
    balance: 45500,
    paymentTerms: "45_days",
    status: "active",
    logo: "/logos/ferrero.svg",
    notes: "المورد الحصري لنوتيلا جردل 15 كجم إيطالي أصلي للمطبخ المركزي",
    createdAt: "2026-01-10",
    transactions: [
      {
        id: "tx-6",
        date: "2026-09-07",
        type: "purchase_order",
        docRef: "PO-2291",
        description: { ar: "توريد 15 جردل نوتيلا 15 كجم خام", en: "15x 15kg Nutella buckets" },
        amount: 45500,
        status: "partial",
      },
    ],
  },
  {
    id: "p-6",
    code: "SUPP-2012",
    name: { ar: "مزارع دينا — حليب طازج وقشطة بلدي", en: "Dina Farms Dairy & Cream" },
    type: "supplier",
    group: "raw_ingredients",
    taxNumber: "140-901-772",
    phone: "+20 100 120 4400",
    email: "dairy-sales@dinafarms.com",
    address: { ar: "طريق مصر إسكندرية الصحراوي، كم 80", en: "Cairo-Alex Desert Road, KM 80" },
    contactPerson: "د. سامي رضوان",
    creditLimit: 180000,
    balance: 18900,
    paymentTerms: "15_days",
    status: "active",
    logo: "/logos/dina-farms.svg",
    notes: "توريد يومي فجر كل يوم للمطبخ المركزي بالعاشر من رمضان",
    createdAt: "2026-01-12",
    transactions: [
      {
        id: "tx-7",
        date: "2026-09-05",
        type: "purchase_order",
        docRef: "PO-2289",
        description: { ar: "توريد 1500 لتر حليب كامل الدسم و100 كجم قشطة", en: "1500L milk + 100kg clotted cream" },
        amount: 18900,
        status: "pending",
      },
    ],
  },
  {
    id: "p-7",
    code: "SUPP-2013",
    name: { ar: "مطاحن ومضارب الدلتا — أرز وسكر نقي", en: "Delta Mills — Rice & Sugar" },
    type: "supplier",
    group: "raw_ingredients",
    taxNumber: "190-442-108",
    phone: "+20 40 338 1200",
    email: "orders@deltamills.com.eg",
    address: { ar: "المنطقة الصناعية، طنطا، محافظة الغربية", en: "Industrial Zone, Tanta, Gharbia" },
    contactPerson: "الحاج فوزي الدلجاوي",
    creditLimit: 100000,
    balance: 0,
    paymentTerms: "30_days",
    status: "active",
    logo: "/logos/delta-mills.svg",
    notes: "أرز مصري حبة قصيرة مخصص للأرز باللبن بنسبة كسر 0%",
    createdAt: "2026-02-05",
    transactions: [
      {
        id: "tx-8",
        date: "2026-09-06",
        type: "purchase_order",
        docRef: "PO-2290",
        description: { ar: "توريد 2 طن أرز مصري ممتاز و1 طن سكر ناعم", en: "2 tons rice & 1 ton sugar" },
        amount: 25500,
        status: "paid",
      },
    ],
  },
  {
    id: "p-8",
    code: "SUPP-2014",
    name: { ar: "شركة الأهرام للكرتون ومواد التغليف", en: "Al-Ahram Packaging & Paper Boxes" },
    type: "supplier",
    group: "packaging",
    taxNumber: "210-672-881",
    phone: "+20 122 884 1199",
    email: "packaging@ahrampack.eg",
    address: { ar: "المنطقة الصناعية الثالثة، مدينة 6 أكتوبر", en: "3rd Industrial Zone, 6th of October" },
    contactPerson: "م. عادل الشاذلي",
    creditLimit: 80000,
    balance: 0,
    paymentTerms: "30_days",
    status: "active",
    logo: "/logos/ahram-packaging.svg",
    notes: "طباعة عبوات كشري الحلو وشاورما الوزير وصناديق الهدايا الفاخرة",
    createdAt: "2026-02-20",
    transactions: [
      {
        id: "tx-9",
        date: "2026-09-04",
        type: "purchase_order",
        docRef: "PO-2288",
        description: { ar: "توريد 10,000 طبق كرتون مطبوع بشعار وزير الحلو", en: "10,000 branded dessert bowls" },
        amount: 6300,
        status: "paid",
      },
    ],
  },
  {
    id: "p-9",
    code: "CUST-1046",
    name: { ar: "شركة الشرق للمؤتمرات والمعارض", en: "Sharq Conferences & Exhibitions" },
    type: "customer",
    group: "catering",
    taxNumber: "512-883-914",
    phone: "+20 102 334 5566",
    email: "events@sharq-expo.eg",
    address: { ar: "قاعة المؤتمرات الكبرى، مدينة نصر، القاهرة", en: "Grand Conference Center, Nasr City, Cairo" },
    contactPerson: "أ. ماجد فوزي",
    creditLimit: 75000,
    balance: 0,
    paymentTerms: "15_days",
    status: "active",
    logo: "/logos/sharq.svg",
    notes: "توريد ضيافة قاعات الـ VIP للمؤتمرات والمعارض الرسمية",
    createdAt: "2026-05-10",
    transactions: [
      {
        id: "tx-sharq-1",
        date: "2026-09-06",
        type: "invoice",
        docRef: "INV-10449",
        description: { ar: "توريد ضيافة مؤتمر الاستثمار العربي", en: "Arab Investment Forum VIP sweets" },
        amount: 12400,
        status: "paid",
      },
    ],
  },
  {
    id: "p-10",
    code: "CUST-1047",
    name: { ar: "المهندس محمود عبد الله — حفل خاص", en: "Mahmoud Abdullah — Private Event" },
    type: "customer",
    group: "retail",
    taxNumber: "620-119-445",
    phone: "+20 114 778 9900",
    email: "eng.mahmoud@gmail.com",
    address: { ar: "فيلا 42، كمبوند الياسمين، التجمع الأول", en: "Villa 42, Yasmeen Compound, 1st Settlement" },
    contactPerson: "م. محمود عبد الله",
    creditLimit: 30000,
    balance: 5600,
    paymentTerms: "immediate",
    status: "active",
    logo: "/logos/client-vip.svg",
    notes: "حفل عائلي خاص وضيافة حلويات كشري حلو وقشطوطة",
    createdAt: "2026-06-01",
    transactions: [
      {
        id: "tx-eng-1",
        date: "2026-09-05",
        type: "invoice",
        docRef: "INV-10448",
        description: { ar: "بوفيه ضيافة حفل تخرج خاص", en: "Private family graduation buffet" },
        amount: 5600,
        status: "pending",
      },
    ],
  },
];

export function usePartnersStore() {
  const [partners, setPartners] = useState<Partner[]>(() => {
    if (typeof window === "undefined") return INITIAL_PARTNERS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partner[];
        const existingIds = new Set(parsed.map((p) => p.id));
        const merged = [...parsed];
        for (const init of INITIAL_PARTNERS) {
          if (!existingIds.has(init.id)) {
            merged.push(init);
          }
        }
        return merged.map((p) => {
          const init = INITIAL_PARTNERS.find((item) => item.id === p.id);
          if (init && !p.logo) {
            return { ...p, logo: init.logo };
          }
          return p;
        });
      }
    } catch (e) {
      console.error("Failed to parse partners store", e);
    }
    return INITIAL_PARTNERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(partners));
    } catch (e) {
      console.error("Failed to save partners store", e);
    }
  }, [partners]);

  const addPartner = useCallback((partner: Omit<Partner, "id" | "createdAt" | "transactions">) => {
    const newPartner: Partner = {
      ...partner,
      id: `p-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      transactions: [],
    };
    setPartners((prev) => [newPartner, ...prev]);
    return newPartner;
  }, []);

  const updatePartner = useCallback((id: string, updates: Partial<Partner>) => {
    setPartners((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const deletePartner = useCallback((id: string) => {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggleStatus = useCallback((id: string) => {
    setPartners((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "active" ? "inactive" : "active" }
          : p
      )
    );
  }, []);

  const recordPayment = useCallback(
    (partnerId: string, payment: RecordPaymentParams) => {
      setPartners((prev) =>
        prev.map((p) => {
          if (p.id !== partnerId) return p;

          const date = payment.date || new Date().toISOString().slice(0, 10);
          const prefix = p.type === "customer" ? "REC" : "PAY";
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          const docRef = `${prefix}-${randomNum}`;

          let descAr = "";
          let descEn = "";

          if (payment.category === "invoice") {
            descAr = payment.relatedDocRef
              ? `سداد مرتبط بالمستند (${payment.relatedDocRef})`
              : p.type === "customer"
              ? "تحصيل دفعة نقدية مرتبطة بفاتورة"
              : "سداد دفعة للمورد مرتبطة بفاتورة";
            descEn = payment.relatedDocRef
              ? `Payment linked to doc (${payment.relatedDocRef})`
              : "Invoice settlement payment";
          } else if (payment.category === "advance") {
            descAr =
              p.type === "customer"
                ? "دفعة مقدمة / عربون تحت الحساب"
                : "دفعة مقدمة تحت الحساب للمورد";
            descEn = "Advance deposit payment";
          } else if (payment.category === "nulling") {
            descAr =
              p.type === "customer"
                ? "تصفية وتسوية رصيد العميل (مقاصة / إعفاء)"
                : "تصفية وتسوية حساب المورد (مقاصة)";
            descEn = "Balance settlement & nullification";
          }

          if (payment.notes) {
            descAr += ` — ${payment.notes}`;
            descEn += ` — ${payment.notes}`;
          }

          const newTransaction: PartnerTransaction = {
            id: `tx-${Date.now()}`,
            date,
            type: "payment",
            docRef,
            description: { ar: descAr, en: descEn },
            amount: payment.amount,
            status: "paid",
            paymentCategory: payment.category,
            relatedDocRef: payment.relatedDocRef,
            paymentMethod: payment.paymentMethod,
            proofImage: payment.proofImage,
          };

          // Calculate new balance
          const newBalance = Math.max(0, p.balance - payment.amount);

          // If linked to an invoice, optionally update that invoice's status in partner.transactions
          const updatedTransactions = [
            newTransaction,
            ...p.transactions.map((tx) => {
              if (
                payment.category === "invoice" &&
                payment.relatedDocRef &&
                tx.docRef === payment.relatedDocRef
              ) {
                return {
                  ...tx,
                  status:
                    payment.amount >= tx.amount ? ("paid" as const) : ("partial" as const),
                };
              }
              return tx;
            }),
          ];

          return {
            ...p,
            balance: newBalance,
            transactions: updatedTransactions,
          };
        })
      );
    },
    []
  );

  return {
    partners,
    addPartner,
    updatePartner,
    deletePartner,
    toggleStatus,
    recordPayment,
  };
}
