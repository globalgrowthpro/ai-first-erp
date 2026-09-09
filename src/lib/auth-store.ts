import { useState, useEffect, useCallback } from "react";

export interface DemoUser {
  id: string;
  name: { ar: string; en: string };
  email: string;
  password: string;
  role: "admin" | "cfo" | "kitchen" | "sales" | "warehouse";
  roleLabel: { ar: string; en: string };
  department: { ar: string; en: string };
  position: { ar: string; en: string };
  avatarBg: string;
  description: { ar: string; en: string };
  allowedPages: string[];
}

export const DEMO_ACCOUNTS: DemoUser[] = [
  {
    id: "usr-admin",
    name: { ar: "م. حافظ رحيم", en: "Mr. Hafez Rahim" },
    email: "admin@wazeer-elhelw.com",
    password: "admin123",
    role: "admin",
    roleLabel: { ar: "المدير العام والمسؤول التقني", en: "General Manager & Admin" },
    department: { ar: "الإدارة العليا والرقابة", en: "Executive HQ" },
    position: { ar: "رئيس مجلس الإدارة", en: "Managing Director" },
    avatarBg: "from-purple-600 to-indigo-700",
    description: {
      ar: "صلاحيات كاملة شاملة: المالية، التصنيع، المخازن، والتحكم بالذكاء الاصطناعي",
      en: "Unrestricted access to all ERP modules, settings and AI operating agents",
    },
    allowedPages: [
      "/",
      "/sales",
      "/purchases",
      "/accounting",
      "/inventory",
      "/manufacturing",
      "/partners",
      "/reports",
      "/audit",
      "/ai",
      "/ai-modules",
      "/settings",
    ],
  },
  {
    id: "usr-finance",
    name: { ar: "أ. منى خليل", en: "Mona Khalil" },
    email: "finance@wazeer-elhelw.com",
    password: "finance123",
    role: "cfo",
    roleLabel: { ar: "المدير المالي ورئيس الحسابات", en: "Chief Financial Officer" },
    department: { ar: "الإدارة المالية والمراجعة", en: "Finance & Tax" },
    position: { ar: "المدير المالي (CFO)", en: "Chief Financial Officer" },
    avatarBg: "from-emerald-600 to-teal-700",
    description: {
      ar: "شجرة الحسابات، قيود اليومية، ميزان المراجعة، واعتماد المدفوعات والضرائب",
      en: "Chart of Accounts, journal entries, trial balance, tax compliance and vendor bills",
    },
    allowedPages: [
      "/",
      "/sales",
      "/purchases",
      "/accounting",
      "/partners",
      "/reports",
      "/audit",
      "/ai",
    ],
  },
  {
    id: "usr-kitchen",
    name: { ar: "شيف إبراهيم البدري", en: "Chef Ibrahim El-Badry" },
    email: "kitchen@wazeer-elhelw.com",
    password: "kitchen123",
    role: "kitchen",
    roleLabel: { ar: "كبير حلوانية ومدير الإنتاج", en: "Head Chef & Production Manager" },
    department: { ar: "المطبخ المركزي بالعاشر", en: "Central Kitchen Factory" },
    position: { ar: "مدير خطوط الإنتاج والحلويات", en: "Head of Confectionery Production" },
    avatarBg: "from-amber-600 to-orange-700",
    description: {
      ar: "إصدار وتخطيط أوامر التشغيل، قوائم المواد (BOM)، ومراقبة مراحل الطهي والجودة",
      en: "Work orders issuance, recipes BOM, ingredient allocation, and QC sign-offs",
    },
    allowedPages: [
      "/",
      "/manufacturing",
      "/inventory",
      "/ai",
      "/reports",
    ],
  },
  {
    id: "usr-sales",
    name: { ar: "أ. أحمد سالم", en: "Ahmed Salem" },
    email: "sales@wazeer-elhelw.com",
    password: "sales123",
    role: "sales",
    roleLabel: { ar: "مدير مبيعات الفروع والحفلات", en: "Branch & Catering Sales Manager" },
    department: { ar: "إدارة المبيعات والضيافة", en: "Sales & Catering" },
    position: { ar: "مدير مبيعات الفروع", en: "Branch Sales Director" },
    avatarBg: "from-blue-600 to-cyan-700",
    description: {
      ar: "تسعير وتوريد طلبيات الفنادق، إصدار الفواتير الإلكترونية، وإدارة العملاء",
      en: "Corporate hotel catering pricing, customer ledger, and point-of-sale invoicing",
    },
    allowedPages: [
      "/",
      "/sales",
      "/partners",
      "/inventory",
      "/ai",
    ],
  },
  {
    id: "usr-warehouse",
    name: { ar: "أ. طارق فؤاد", en: "Tarek Fouad" },
    email: "warehouse@wazeer-elhelw.com",
    password: "stock123",
    role: "warehouse",
    roleLabel: { ar: "مدير المستودعات وسلاسل الإمداد", en: "Warehouse & Supply Manager" },
    department: { ar: "سلاسل الإمداد والتوريد", en: "Supply Chain & Warehouses" },
    position: { ar: "مدير المخازن المركزية", en: "Central Logistics Manager" },
    avatarBg: "from-rose-600 to-pink-700",
    description: {
      ar: "أوامر الشراء، استلام المواد الخام وخامات التعبئة، والتحويلات بين الفروع",
      en: "Purchase orders, raw materials receiving, branch transfers, and stock counts",
    },
    allowedPages: [
      "/",
      "/purchases",
      "/inventory",
      "/manufacturing",
      "/partners",
      "/ai",
    ],
  },
];

const STORAGE_KEYS = {
  USER: "wazeer_erp_active_user_v1",
  AUTH: "wazeer_erp_is_authenticated_v1",
};

export function useAuthStore() {
  const [currentUser, setCurrentUser] = useState<DemoUser>(() => {
    if (typeof window === "undefined") return DEMO_ACCOUNTS[0];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load user from storage", e);
    }
    return DEMO_ACCOUNTS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (saved !== null) return JSON.parse(saved);
    } catch {
      return true;
    }
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(isAuthenticated));
    } catch (e) {
      console.error("Failed to save auth state", e);
    }
  }, [currentUser, isAuthenticated]);

  const login = useCallback((email: string, pass: string): boolean => {
    const found = DEMO_ACCOUNTS.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.password === pass.trim()
    );
    if (found) {
      setCurrentUser(found);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const loginAs = useCallback((userId: string) => {
    const found = DEMO_ACCOUNTS.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      setIsAuthenticated(true);
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  return {
    currentUser,
    isAuthenticated,
    demoAccounts: DEMO_ACCOUNTS,
    login,
    loginAs,
    logout,
  };
}
