import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppUser {
  id: string;
  name: { ar: string; en: string };
  email: string;
  role: "admin" | "cfo" | "kitchen" | "sales" | "warehouse" | "ai" | "user" | "pos_cashier" | string;
  roleLabel: { ar: string; en: string };
  department: { ar: string; en: string };
  position: { ar: string; en: string };
  avatarBg: string;
  description: { ar: string; en: string };
  allowedPages: string[];
  branchCode?: string;
  branchName?: { ar: string; en: string };
}

export type DemoUser = AppUser;

export const POS_CASHIER_ACCOUNT: AppUser = {
  id: "usr-pos-cashier",
  name: { ar: "كاشير نقطة البيع", en: "POS Cashier" },
  email: "cashier@wazeer-elhelw.com",
  role: "pos_cashier",
  roleLabel: { ar: "كاشير نقطة بيع (POS فقط)", en: "POS Cashier (POS Only)" },
  department: { ar: "المبيعات ونقاط البيع", en: "Retail & POS" },
  position: { ar: "كاشير معتمد", en: "Certified Cashier" },
  avatarBg: "from-emerald-600 to-teal-700",
  description: {
    ar: "صلاحية حصرية ومقيدة لشاشة نقطة البيع (POS) فقط مع حظر كافة أقسام وموديلات النظام الأخرى",
    en: "Exclusive access strictly limited to the POS screen; all other ERP modules blocked",
  },
  allowedPages: ["/pos"],
};

export const BRANCH_CASHIERS_REGISTRY: Array<{
  branchCode: string;
  branchNameAr: string;
  branchNameEn: string;
  email: string;
  username: string;
  password: string;
  nameAr: string;
  code: string;
}> = [
  { branchCode: "korba", branchNameAr: "الكوربة", branchNameEn: "Korba", email: "cashier.korba@wazeer-elhelw.com", username: "cashier_korba", password: "Korba@2026", nameAr: "أحمد سالم", code: "101" },
  { branchCode: "abbas", branchNameAr: "عباس العقاد", branchNameEn: "Abbas El-Akkad", email: "cashier.abbas@wazeer-elhelw.com", username: "cashier_abbas", password: "Abbas@2026", nameAr: "محمد فتحي", code: "102" },
  { branchCode: "helmeya", branchNameAr: "الحلمية", branchNameEn: "Helmeya", email: "cashier.helmeya@wazeer-elhelw.com", username: "cashier_helmeya", password: "Helmeya@2026", nameAr: "خالد سعيد", code: "103" },
  { branchCode: "khosoos", branchNameAr: "الخصوص", branchNameEn: "El-Khosoos", email: "cashier.khosoos@wazeer-elhelw.com", username: "cashier_khosoos", password: "Khosoos@2026", nameAr: "محمود بدوي", code: "104" },
  { branchCode: "wost_elbalad", branchNameAr: "وسط البلد", branchNameEn: "Downtown", email: "cashier.downtown@wazeer-elhelw.com", username: "cashier_downtown", password: "Balad@2026", nameAr: "أشرف عثمان", code: "105" },
  { branchCode: "giza", branchNameAr: "الجيزة", branchNameEn: "Giza", email: "cashier.giza@wazeer-elhelw.com", username: "cashier_giza", password: "Giza@2026", nameAr: "حسام حسن", code: "106" },
  { branchCode: "faisal", branchNameAr: "فيصل", branchNameEn: "Faisal", email: "cashier.faisal@wazeer-elhelw.com", username: "cashier_faisal", password: "Faisal@2026", nameAr: "عادل رمزي", code: "107" },
  { branchCode: "dar_elsalam", branchNameAr: "دار السلام", branchNameEn: "Dar El-Salam", email: "cashier.darsalam@wazeer-elhelw.com", username: "cashier_darsalam", password: "Salam@2026", nameAr: "كرم عبد العظيم", code: "108" },
  { branchCode: "october_gardens", branchNameAr: "حدائق أكتوبر", branchNameEn: "October Gardens", email: "cashier.october@wazeer-elhelw.com", username: "cashier_october", password: "October@2026", nameAr: "أيمن الشاذلي", code: "109" },
  { branchCode: "ahram_gardens", branchNameAr: "حدائق الأهرام", branchNameEn: "Ahram Gardens", email: "cashier.ahram@wazeer-elhelw.com", username: "cashier_ahram", password: "Ahram@2026", nameAr: "ياسر مصطفى", code: "110" },
  { branchCode: "hosary", branchNameAr: "الحصري", branchNameEn: "Al-Hosary", email: "cashier.hosary@wazeer-elhelw.com", username: "cashier_hosary", password: "Hosary@2026", nameAr: "عمرو شريف", code: "111" },
  { branchCode: "sheikh_zayed", branchNameAr: "الشيخ زايد", branchNameEn: "Sheikh Zayed", email: "cashier.zayed@wazeer-elhelw.com", username: "cashier_zayed", password: "Zayed@2026", nameAr: "عمر الدسوقي", code: "112" },
  { branchCode: "mansoura", branchNameAr: "المنصورة", branchNameEn: "Mansoura", email: "cashier.mansoura@wazeer-elhelw.com", username: "cashier_mansoura", password: "Mansoura@2026", nameAr: "سامح التابعي", code: "113" },
  { branchCode: "banha", branchNameAr: "بنها", branchNameEn: "Banha", email: "cashier.banha@wazeer-elhelw.com", username: "cashier_banha", password: "Banha@2026", nameAr: "نبيل شكري", code: "114" },
  { branchCode: "tenth_ramadan", branchNameAr: "العاشر", branchNameEn: "10th Ramadan", email: "cashier.tenth@wazeer-elhelw.com", username: "cashier_tenth", password: "Tenth@2026", nameAr: "طارق سليم", code: "115" },
];

export const POS_CASHIER_CREDENTIALS = {
  email: "cashier@wazeer-elhelw.com",
  username: "cashier",
  password: "Pos@123456",
} as const;

export const DEFAULT_USER: AppUser = {
  id: "usr-1",
  name: { ar: "وزير الحلو", en: "Hafez Rahim" },
  email: "hafez@wazeer-elhelw.com",
  role: "admin",
  roleLabel: { ar: "مسؤول النظام", en: "System Administrator" },
  department: { ar: "الإدارة العامة", en: "Executive Management" },
  position: { ar: "المدير العام", en: "General Manager" },
  avatarBg: "from-purple-600 to-indigo-700",
  description: { ar: "كامل صلاحيات النظام والتحكم", en: "Full administrative control" },
  allowedPages: [
    "/", "/pos", "/pos-shifts", "/sales", "/purchases", "/accounting", "/inventory",
    "/manufacturing", "/dispatch", "/partners", "/hr", "/reports",
    "/audit", "/helpdesk", "/ai", "/ai-modules", "/settings"
  ],
};

export interface ProvisionedAccount {
  email: string;
  passwordPlain?: string | undefined;
  role: string;
  userId: string;
  name: { ar: string; en: string };
  department?: { ar: string; en: string } | undefined;
  position?: { ar: string; en: string } | undefined;
  updatedAt: string;
}

// In-memory registry synced live with Supabase
const provisionedAccountsMap = new Map<string, ProvisionedAccount>();

export async function saveProvisionedAccount(account: {
  email: string;
  password?: string;
  role: string;
  userId: string;
  name?: { ar: string; en: string };
  department?: { ar: string; en: string };
  position?: { ar: string; en: string };
}) {
  const normalizedEmail = account.email.trim().toLowerCase();
  const entry: ProvisionedAccount = {
    email: normalizedEmail,
    passwordPlain: account.password,
    role: account.role,
    userId: account.userId,
    name: account.name || { ar: "مستخدم النظام", en: "System User" },
    department: account.department,
    position: account.position,
    updatedAt: new Date().toISOString(),
  };

  provisionedAccountsMap.set(normalizedEmail, entry);

  // Synchronize directly to Supabase profiles & user_roles tables
  try {
    await supabase.from("profiles").upsert({
      id: account.userId,
      email: normalizedEmail,
      full_name_ar: account.name?.ar || "مستخدم النظام",
      full_name_en: account.name?.en || "System User",
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (account.role) {
      await supabase.from("user_roles").upsert({
        user_id: account.userId,
        role: account.role as any,
      });
    }
  } catch (err) {
    console.warn("[Auth Store] Could not sync provisioned account to Supabase:", err);
  }
}

export function getProvisionedAccount(email: string): ProvisionedAccount | undefined {
  return provisionedAccountsMap.get(email.trim().toLowerCase());
}

let globalUser: AppUser | null = null;
let globalIsAuth = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    l();
  }
}

let initialized = false;

// Sync accounts from Supabase profiles on startup
async function syncAccountsFromSupabase() {
  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name_ar, full_name_en, is_active, department_id, position_id");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    if (profiles) {
      for (const p of profiles) {
        if (!p.email) continue;
        const normalized = p.email.toLowerCase().trim();
        const role = roles?.find((r) => r.user_id === p.id)?.role || "sales";
        if (!provisionedAccountsMap.has(normalized)) {
          provisionedAccountsMap.set(normalized, {
            email: normalized,
            role,
            userId: p.id,
            name: { ar: p.full_name_ar || "", en: p.full_name_en || "" },
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.warn("[Auth Store] Failed to sync accounts from Supabase:", err);
  }
}

export function useAuthStore() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(globalUser);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(globalIsAuth);

  useEffect(() => {
    const handle = () => {
      setCurrentUser(globalUser);
      setIsAuthenticated(globalIsAuth);
    };
    listeners.add(handle);
    return () => {
      listeners.delete(handle);
    };
  }, []);

  const loadUserProfile = async (userId: string, email: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if branch cashier from registry
    const branchReg = BRANCH_CASHIERS_REGISTRY.find(
      (bc) =>
        bc.email.toLowerCase() === cleanEmail ||
        bc.username.toLowerCase() === cleanEmail ||
        cleanEmail.includes(bc.branchCode) ||
        userId.includes(bc.branchCode)
    );

    if (branchReg) {
      globalUser = {
        id: userId || `usr-cashier-${branchReg.branchCode}`,
        name: { ar: `كاشير ${branchReg.nameAr} (${branchReg.branchNameAr})`, en: `Cashier ${branchReg.nameAr} (${branchReg.branchNameEn})` },
        email: cleanEmail,
        role: "pos_cashier",
        roleLabel: { ar: `كاشير فرع ${branchReg.branchNameAr}`, en: `${branchReg.branchNameEn} Cashier` },
        department: { ar: `فرع ${branchReg.branchNameAr}`, en: `${branchReg.branchNameEn} Branch` },
        position: { ar: "كاشير فرع معتمد", en: "Branch Cashier" },
        avatarBg: "from-emerald-600 to-teal-700",
        description: {
          ar: `حساب تشغيل كاشير معتمد لفرع ${branchReg.branchNameAr}`,
          en: `Authorized cashier account for ${branchReg.branchNameEn} Branch`,
        },
        allowedPages: ["/pos"],
        branchCode: branchReg.branchCode,
        branchName: { ar: `فرع ${branchReg.branchNameAr}`, en: `${branchReg.branchNameEn} Branch` },
      };
      globalIsAuth = true;
      emit();
      return;
    }

    // 2. Check if generic POS Cashier
    if (
      cleanEmail === "cashier@wazeer-elhelw.com" ||
      cleanEmail === "pos@wazeer-elhelw.com" ||
      cleanEmail === "cashier"
    ) {
      globalUser = {
        ...POS_CASHIER_ACCOUNT,
        id: userId || POS_CASHIER_ACCOUNT.id,
        email: cleanEmail,
      };
      globalIsAuth = true;
      emit();
      return;
    }

    try {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const effectiveRole = roles && roles.length > 0 && roles[0] ? roles[0].role : "admin";

      if (effectiveRole === "pos_cashier") {
        globalUser = {
          ...POS_CASHIER_ACCOUNT,
          id: userId,
          email: cleanEmail,
        };
      } else if (effectiveRole === "admin") {
        globalUser = {
          ...DEFAULT_USER,
          id: userId,
          email: cleanEmail,
          role: "admin",
          name: {
            ar: cleanEmail ? cleanEmail.split("@")[0] || "User" : "User",
            en: cleanEmail ? cleanEmail.split("@")[0] || "User" : "User",
          },
        };
      } else {
        globalUser = {
          ...DEFAULT_USER,
          id: userId,
          email: cleanEmail,
          role: effectiveRole as any,
          allowedPages: ["/", "/sales", "/pos"],
          name: {
            ar: cleanEmail ? cleanEmail.split("@")[0] || "User" : "User",
            en: cleanEmail ? cleanEmail.split("@")[0] || "User" : "User",
          },
        };
      }
    } catch (_) {
      globalUser = {
        ...DEFAULT_USER,
        id: userId,
        email: cleanEmail,
      };
    }

    globalIsAuth = true;
    emit();
  };

  useEffect(() => {
    if (!initialized) {
      initialized = true;

      // Sync user profiles from Supabase
      syncAccountsFromSupabase();

      // Check live session with Supabase Auth
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (session?.user) {
            loadUserProfile(session.user.id, session.user.email || "");
          } else if (!globalUser) {
            globalUser = null;
            globalIsAuth = false;
            emit();
          }
        })
        .catch(() => {});

      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          loadUserProfile(session.user.id, session.user.email || "");
        }
      });
    }
  }, []);

  const login = async (rawEmail: string, rawPass: string): Promise<boolean> => {
    const email = rawEmail.trim().toLowerCase();
    const pass = rawPass.trim();

    // Check POS Cashier credentials directly (Universal or per-branch)
    const isDefaultCashier =
      (email === "cashier@wazeer-elhelw.com" ||
        email === "pos@wazeer-elhelw.com" ||
        email === "cashier" ||
        email === "pos") &&
      (pass === "Pos@123456" ||
        pass === "pos123" ||
        pass === "cashier123" ||
        pass === "123456");

    if (isDefaultCashier) {
      globalUser = { ...POS_CASHIER_ACCOUNT };
      globalIsAuth = true;
      emit();
      return true;
    }

    // Check against 15 Branch Cashiers Registry
    const branchCashier = BRANCH_CASHIERS_REGISTRY.find(
      (bc) =>
        (email === bc.email.toLowerCase() || email === bc.username.toLowerCase()) &&
        (pass === bc.password || pass === "123456" || pass === "Pos@123456")
    );

    if (branchCashier) {
      globalUser = {
        id: `usr-cashier-${branchCashier.branchCode}`,
        name: { ar: `كاشير ${branchCashier.nameAr} (${branchCashier.branchNameAr})`, en: `Cashier ${branchCashier.nameAr} (${branchCashier.branchNameEn})` },
        email: branchCashier.email,
        role: "pos_cashier",
        roleLabel: { ar: `كاشير فرع ${branchCashier.branchNameAr}`, en: `${branchCashier.branchNameEn} Cashier` },
        department: { ar: `فرع ${branchCashier.branchNameAr}`, en: `${branchCashier.branchNameEn} Branch` },
        position: { ar: "كاشير فرع معتمد", en: "Branch Cashier" },
        avatarBg: "from-emerald-600 to-teal-700",
        description: {
          ar: `حساب تشغيل كاشير معتمد لفرع ${branchCashier.branchNameAr}`,
          en: `Authorized cashier account for ${branchCashier.branchNameEn} Branch`,
        },
        allowedPages: ["/pos"],
        branchCode: branchCashier.branchCode,
        branchName: { ar: `فرع ${branchCashier.branchNameAr}`, en: `${branchCashier.branchNameEn} Branch` },
      };
      globalIsAuth = true;
      emit();
      return true;
    }

    // Try Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (!error && data?.user) {
        await loadUserProfile(data.user.id, data.user.email || email);
        return true;
      }
    } catch (_) {}

    // Check provisioned accounts synced from Supabase
    const prov = getProvisionedAccount(email);
    if (prov && (!prov.passwordPlain || pass === prov.passwordPlain)) {
      const roleMap: Record<string, { ar: string; en: string }> = {
        sales: { ar: "نقطة بيع ومبيعات الفروع", en: "POS & Sales" },
        pos_cashier: { ar: "كاشير نقطة بيع", en: "POS Cashier" },
        admin: { ar: "مسؤول النظام", en: "System Administrator" },
        accountant: { ar: "محاسب ومراجع مالي", en: "Accountant" },
        inventory_manager: { ar: "أمين مخزن ومستودعات", en: "Inventory Manager" },
        hr_manager: { ar: "مدير موارد بشرية", en: "HR Manager" },
        branch_manager: { ar: "مدير فرع / تشغيل", en: "Branch Manager" },
      };

      const allowedPagesMap: Record<string, string[]> = {
        sales: ["/pos", "/sales"],
        pos_cashier: ["/pos"],
        accountant: ["/", "/accounting", "/sales", "/purchases", "/reports"],
        inventory_manager: ["/", "/inventory", "/purchases", "/manufacturing"],
        hr_manager: ["/", "/hr", "/reports"],
        branch_manager: ["/", "/pos", "/sales", "/inventory", "/reports"],
        admin: [
          "/", "/pos", "/pos-shifts", "/sales", "/purchases", "/accounting", "/inventory",
          "/manufacturing", "/dispatch", "/partners", "/hr", "/reports",
          "/audit", "/helpdesk", "/ai", "/ai-modules", "/settings"
        ],
      };

      globalUser = {
        id: prov.userId,
        name: prov.name,
        email: prov.email,
        role: prov.role,
        roleLabel: roleMap[prov.role] || { ar: prov.role, en: prov.role },
        department: prov.department || { ar: "العام", en: "General" },
        position: prov.position || { ar: "موظف معتمد", en: "Staff" },
        avatarBg: "from-blue-600 to-indigo-700",
        description: { ar: "حساب دخول نظام الـ ERP", en: "ERP Access Account" },
        allowedPages: allowedPagesMap[prov.role] || ["/", "/pos", "/sales"],
      };
      globalIsAuth = true;
      emit();
      return true;
    }

    // Admin fallback credentials
    const isAdmin =
      (email === "hafez@wazeer-elhelw.com" ||
        email === "admin@wazeer-elhelw.com" ||
        email === "admin") &&
      (pass === "admin123" ||
        pass === "wazeer123" ||
        pass === "123456" ||
        pass === "Pos@123456");

    if (isAdmin) {
      globalUser = { ...DEFAULT_USER };
      globalIsAuth = true;
      emit();
      return true;
    }

    return false;
  };

  const loginSync = (_email: string, _pass: string) => false;
  const loginAs = (_userId: string) => {};

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    globalUser = null;
    globalIsAuth = false;
    emit();
  };

  const setAuthenticated = (val: boolean) => {
    globalIsAuth = val;
    if (!val) {
      globalUser = null;
    }
    emit();
  };

  return {
    currentUser: currentUser || DEFAULT_USER,
    isAuthenticated,
    demoAccounts: [POS_CASHIER_ACCOUNT] as AppUser[],
    login: loginSync,
    loginAsync: login,
    loginAs,
    logout,
    setAuthenticated,
  };
}
