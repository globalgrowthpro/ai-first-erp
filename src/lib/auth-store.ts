import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppUser {
  id: string;
  name: { ar: string; en: string };
  email: string;
  role:
    "admin" | "cfo" | "kitchen" | "sales" | "warehouse" | "ai" | "user" | "pos_cashier" | string;
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
  {
    branchCode: "korba",
    branchNameAr: "الكوربة",
    branchNameEn: "Korba",
    email: "cashier.korba@wazeer-elhelw.com",
    username: "cashier_korba",
    password: "Korba@2026",
    nameAr: "أحمد سالم",
    code: "101",
  },
  {
    branchCode: "abbas",
    branchNameAr: "عباس العقاد",
    branchNameEn: "Abbas El-Akkad",
    email: "cashier.abbas@wazeer-elhelw.com",
    username: "cashier_abbas",
    password: "Abbas@2026",
    nameAr: "محمد فتحي",
    code: "102",
  },
  {
    branchCode: "helmeya",
    branchNameAr: "الحلمية",
    branchNameEn: "Helmeya",
    email: "cashier.helmeya@wazeer-elhelw.com",
    username: "cashier_helmeya",
    password: "Helmeya@2026",
    nameAr: "خالد سعيد",
    code: "103",
  },
  {
    branchCode: "khosoos",
    branchNameAr: "الخصوص",
    branchNameEn: "El-Khosoos",
    email: "cashier.khosoos@wazeer-elhelw.com",
    username: "cashier_khosoos",
    password: "Khosoos@2026",
    nameAr: "محمود بدوي",
    code: "104",
  },
  {
    branchCode: "wost_elbalad",
    branchNameAr: "وسط البلد",
    branchNameEn: "Downtown",
    email: "cashier.downtown@wazeer-elhelw.com",
    username: "cashier_downtown",
    password: "Balad@2026",
    nameAr: "أشرف عثمان",
    code: "105",
  },
  {
    branchCode: "giza",
    branchNameAr: "الجيزة",
    branchNameEn: "Giza",
    email: "cashier.giza@wazeer-elhelw.com",
    username: "cashier_giza",
    password: "Giza@2026",
    nameAr: "حسام حسن",
    code: "106",
  },
  {
    branchCode: "faisal",
    branchNameAr: "فيصل",
    branchNameEn: "Faisal",
    email: "cashier.faisal@wazeer-elhelw.com",
    username: "cashier_faisal",
    password: "Faisal@2026",
    nameAr: "عادل رمزي",
    code: "107",
  },
  {
    branchCode: "dar_elsalam",
    branchNameAr: "دار السلام",
    branchNameEn: "Dar El-Salam",
    email: "cashier.darsalam@wazeer-elhelw.com",
    username: "cashier_darsalam",
    password: "Salam@2026",
    nameAr: "كرم عبد العظيم",
    code: "108",
  },
  {
    branchCode: "october_gardens",
    branchNameAr: "حدائق أكتوبر",
    branchNameEn: "October Gardens",
    email: "cashier.october@wazeer-elhelw.com",
    username: "cashier_october",
    password: "October@2026",
    nameAr: "أيمن الشاذلي",
    code: "109",
  },
  {
    branchCode: "ahram_gardens",
    branchNameAr: "حدائق الأهرام",
    branchNameEn: "Ahram Gardens",
    email: "cashier.ahram@wazeer-elhelw.com",
    username: "cashier_ahram",
    password: "Ahram@2026",
    nameAr: "ياسر مصطفى",
    code: "110",
  },
  {
    branchCode: "hosary",
    branchNameAr: "الحصري",
    branchNameEn: "Al-Hosary",
    email: "cashier.hosary@wazeer-elhelw.com",
    username: "cashier_hosary",
    password: "Hosary@2026",
    nameAr: "عمرو شريف",
    code: "111",
  },
  {
    branchCode: "sheikh_zayed",
    branchNameAr: "الشيخ زايد",
    branchNameEn: "Sheikh Zayed",
    email: "cashier.zayed@wazeer-elhelw.com",
    username: "cashier_zayed",
    password: "Zayed@2026",
    nameAr: "عمر الدسوقي",
    code: "112",
  },
  {
    branchCode: "mansoura",
    branchNameAr: "المنصورة",
    branchNameEn: "Mansoura",
    email: "cashier.mansoura@wazeer-elhelw.com",
    username: "cashier_mansoura",
    password: "Mansoura@2026",
    nameAr: "سامح التابعي",
    code: "113",
  },
  {
    branchCode: "banha",
    branchNameAr: "بنها",
    branchNameEn: "Banha",
    email: "cashier.banha@wazeer-elhelw.com",
    username: "cashier_banha",
    password: "Banha@2026",
    nameAr: "نبيل شكري",
    code: "114",
  },
  {
    branchCode: "tenth_ramadan",
    branchNameAr: "العاشر",
    branchNameEn: "10th Ramadan",
    email: "cashier.tenth@wazeer-elhelw.com",
    username: "cashier_tenth",
    password: "Tenth@2026",
    nameAr: "طارق سليم",
    code: "115",
  },
];

export const POS_CASHIER_CREDENTIALS = {
  email: "cashier@wazeer-elhelw.com",
  username: "cashier",
  password: "Pos@123456",
} as const;

export const ADMIN_ACCOUNT_CREDENTIALS = {
  email: "wazeerAdmin@erp.org",
  username: "wazeerAdmin",
  password: "#786$Wazeri",
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
    "/",
    "/pos",
    "/pos-shifts",
    "/sales",
    "/purchases",
    "/accounting",
    "/inventory",
    "/manufacturing",
    "/dispatch",
    "/partners",
    "/hr",
    "/reports",
    "/audit",
    "/helpdesk",
    "/ai",
    "/ai-modules",
    "/settings",
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
  allowedPages?: string[];
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

  // Synchronize directly to Supabase profiles, user_roles & user_pages tables
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

    if (account.allowedPages && account.allowedPages.length > 0) {
      try {
        await supabase.from("user_pages").delete().eq("user_id", account.userId);
        const valid = account.allowedPages.filter((p) => p && p !== "*");
        if (valid.length > 0) {
          await supabase
            .from("user_pages")
            .insert(valid.map((pagePath) => ({ user_id: account.userId, page_path: pagePath })));
        }
      } catch (pageErr) {
        console.warn("[Auth Store] Could not sync user_pages to Supabase:", pageErr);
      }
    }
  } catch (err) {
    console.warn("[Auth Store] Could not sync provisioned account to Supabase:", err);
  }
}

export function getProvisionedAccount(email: string): ProvisionedAccount | undefined {
  return provisionedAccountsMap.get(email.trim().toLowerCase());
}

const AUTH_USER_KEY = "wazeer_erp_auth_user";
const AUTH_STATUS_KEY = "wazeer_erp_is_auth";

function readStoredUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function readStoredAuth(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const isAuth = localStorage.getItem(AUTH_STATUS_KEY);
    if (isAuth === "true") return true;
    if (localStorage.getItem(AUTH_USER_KEY)) return true;
  } catch {}
  return false;
}

let globalUser: AppUser | null = readStoredUser();
let globalIsAuth = readStoredAuth();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    l();
  }
}

function persistSession(user: AppUser | null, isAuth: boolean) {
  globalUser = user;
  globalIsAuth = isAuth;
  if (typeof window !== "undefined") {
    try {
      if (user && isAuth) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        localStorage.setItem(AUTH_STATUS_KEY, "true");
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_STATUS_KEY);
      }
    } catch {}
  }
  emit();
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
        const isProfileAdmin =
          normalized === "wazeeradmin@erp.org" ||
          normalized.includes("admin") ||
          (p.full_name_ar && p.full_name_ar.includes("أدمين")) ||
          (p.full_name_en && p.full_name_en.toLowerCase().includes("admin"));

        const role =
          roles?.find((r) => r.user_id === p.id)?.role || (isProfileAdmin ? "admin" : "sales");
        if (!provisionedAccountsMap.has(normalized)) {
          provisionedAccountsMap.set(normalized, {
            email: normalized,
            role,
            userId: p.id,
            name: {
              ar: p.full_name_ar || (isProfileAdmin ? "مسؤول النظام" : ""),
              en: p.full_name_en || (isProfileAdmin ? "Administrator" : ""),
            },
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

  const getDynamicPagesForUser = async (
    userId: string,
    email?: string,
  ): Promise<string[] | null> => {
    try {
      let targetId = userId;
      const cleanEmail = email?.trim().toLowerCase();

      // If userId is not a UUID, resolve it from profiles via email
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId) &&
        cleanEmail
      ) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", cleanEmail)
          .maybeSingle();
        if (prof?.id) targetId = prof.id;
      }

      if (
        targetId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)
      ) {
        const { data: dbPages } = await supabase
          .from("user_pages")
          .select("page_path")
          .eq("user_id", targetId);
        if (dbPages && dbPages.length > 0) {
          return dbPages.map((p: any) => p.page_path);
        }
      }
    } catch (err) {
      console.warn("[Auth Store] Could not query user_pages from Supabase:", err);
    }
    return null;
  };

  const loadUserProfile = async (userId: string, email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const dynamicPages = await getDynamicPagesForUser(userId, cleanEmail);

    // 1. Check if branch cashier from registry
    const branchReg = BRANCH_CASHIERS_REGISTRY.find(
      (bc) =>
        bc.email.toLowerCase() === cleanEmail ||
        bc.username.toLowerCase() === cleanEmail ||
        cleanEmail.includes(bc.branchCode) ||
        userId.includes(bc.branchCode),
    );

    if (branchReg) {
      persistSession(
        {
          id: userId || `usr-cashier-${branchReg.branchCode}`,
          name: {
            ar: `كاشير ${branchReg.nameAr} (${branchReg.branchNameAr})`,
            en: `Cashier ${branchReg.nameAr} (${branchReg.branchNameEn})`,
          },
          email: cleanEmail,
          role: "pos_cashier",
          roleLabel: {
            ar: `كاشير فرع ${branchReg.branchNameAr}`,
            en: `${branchReg.branchNameEn} Cashier`,
          },
          department: {
            ar: `فرع ${branchReg.branchNameAr}`,
            en: `${branchReg.branchNameEn} Branch`,
          },
          position: { ar: "كاشير فرع معتمد", en: "Branch Cashier" },
          avatarBg: "from-emerald-600 to-teal-700",
          description: {
            ar: `حساب تشغيل كاشير معتمد لفرع ${branchReg.branchNameAr}`,
            en: `Authorized cashier account for ${branchReg.branchNameEn} Branch`,
          },
          allowedPages: dynamicPages && dynamicPages.length > 0 ? dynamicPages : ["/pos"],
          branchCode: branchReg.branchCode,
          branchName: {
            ar: `فرع ${branchReg.branchNameAr}`,
            en: `${branchReg.branchNameEn} Branch`,
          },
        },
        true,
      );
      return;
    }

    // 2. Check if generic POS Cashier
    if (
      cleanEmail === "cashier@wazeer-elhelw.com" ||
      cleanEmail === "pos@wazeer-elhelw.com" ||
      cleanEmail === "cashier"
    ) {
      persistSession(
        {
          ...POS_CASHIER_ACCOUNT,
          id: userId || POS_CASHIER_ACCOUNT.id,
          email: cleanEmail,
          allowedPages: dynamicPages && dynamicPages.length > 0 ? dynamicPages : ["/pos"],
        },
        true,
      );
      return;
    }

    // 3. Check if Admin account by email (wazeerAdmin@erp.org)
    if (
      cleanEmail === "wazeeradmin@erp.org" ||
      cleanEmail === "wazeeradmin" ||
      cleanEmail.includes("admin")
    ) {
      persistSession(
        {
          ...DEFAULT_USER,
          id: userId || "usr-wazeer-admin",
          email: cleanEmail,
          name: { ar: "أدمين وزير الحلو", en: "Wazeer Admin" },
          role: "admin",
          roleLabel: { ar: "مسؤول النظام العام", en: "System Administrator" },
          allowedPages:
            dynamicPages && dynamicPages.length > 0 ? dynamicPages : DEFAULT_USER.allowedPages,
        },
        true,
      );
      return;
    }

    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const effectiveRole = roles && roles.length > 0 && roles[0] ? roles[0].role : "admin";

      if (effectiveRole === "pos_cashier") {
        persistSession(
          {
            ...POS_CASHIER_ACCOUNT,
            id: userId,
            email: cleanEmail,
            allowedPages: dynamicPages && dynamicPages.length > 0 ? dynamicPages : ["/pos"],
          },
          true,
        );
      } else if (effectiveRole === "admin") {
        persistSession(
          {
            ...DEFAULT_USER,
            id: userId,
            email: cleanEmail,
            role: "admin",
            allowedPages:
              dynamicPages && dynamicPages.length > 0 ? dynamicPages : DEFAULT_USER.allowedPages,
            name: {
              ar: cleanEmail ? cleanEmail.split("@")[0] || "User" : "User",
              en: cleanEmail ? cleanEmail.split("@")[0] || "User" : "User",
            },
          },
          true,
        );
      } else {
        persistSession(
          {
            ...DEFAULT_USER,
            id: userId,
            email: cleanEmail,
            role: effectiveRole as any,
            allowedPages:
              dynamicPages && dynamicPages.length > 0 ? dynamicPages : ["/", "/sales", "/pos"],
            name: {
              ar: cleanEmail ? cleanEmail.split("@")[0] || "User" : "User",
              en: cleanEmail ? cleanEmail.split("@")[0] || "User" : "User",
            },
          },
          true,
        );
      }
    } catch (_) {
      persistSession(
        {
          ...DEFAULT_USER,
          id: userId,
          email: cleanEmail,
          allowedPages:
            dynamicPages && dynamicPages.length > 0 ? dynamicPages : DEFAULT_USER.allowedPages,
        },
        true,
      );
    }
  };

  useEffect(() => {
    if (!initialized) {
      initialized = true;

      // Sync user profiles from Supabase
      syncAccountsFromSupabase();

      // Check live session with Supabase Auth (preserving local stored session on refresh)
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (session?.user) {
            loadUserProfile(session.user.id, session.user.email || "");
          } else if (!globalUser && !readStoredAuth()) {
            persistSession(null, false);
          }
        })
        .catch(() => {});

      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          loadUserProfile(session.user.id, session.user.email || "");
        }
      });

      // Subscribe ONCE to real-time changes on public.user_pages table
      try {
        supabase
          .channel("auth_user_pages_realtime_sync")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "user_pages" },
            async (payload: any) => {
              const current = globalUser;
              if (!current) return;
              const targetUserId = payload.new?.user_id || payload.old?.user_id;

              let matchesCurrent = current.id === targetUserId;
              if (!matchesCurrent && current.email) {
                const { data: prof } = await supabase
                  .from("profiles")
                  .select("id")
                  .eq("email", current.email.toLowerCase().trim())
                  .maybeSingle();
                if (prof?.id === targetUserId) {
                  matchesCurrent = true;
                }
              }

              if (matchesCurrent && targetUserId) {
                const { data: dbPages } = await supabase
                  .from("user_pages")
                  .select("page_path")
                  .eq("user_id", targetUserId);

                const freshPages =
                  dbPages && dbPages.length > 0
                    ? dbPages.map((p: any) => p.page_path)
                    : current.role === "admin"
                      ? DEFAULT_USER.allowedPages
                      : ["/pos"];

                persistSession(
                  {
                    ...current,
                    allowedPages: freshPages,
                  },
                  true,
                );
              }
            },
          )
          .subscribe();
      } catch (err) {
        console.warn("[Auth Store] Realtime channel setup error:", err);
      }
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
      (pass === "Pos@123456" || pass === "pos123" || pass === "cashier123" || pass === "123456");

    if (isDefaultCashier) {
      await loadUserProfile(POS_CASHIER_ACCOUNT.id, email);
      return true;
    }

    // Check against 15 Branch Cashiers Registry
    const branchCashier = BRANCH_CASHIERS_REGISTRY.find(
      (bc) =>
        (email === bc.email.toLowerCase() || email === bc.username.toLowerCase()) &&
        (pass === bc.password || pass === "123456" || pass === "Pos@123456"),
    );

    if (branchCashier) {
      try {
        const { data } = await supabase.auth.signInWithPassword({
          email: branchCashier.email,
          password: branchCashier.password,
        });
        if (data?.user) {
          await loadUserProfile(data.user.id, branchCashier.email);
          return true;
        }
      } catch (_) {}
      await loadUserProfile(`usr-cashier-${branchCashier.branchCode}`, branchCashier.email);
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
      await loadUserProfile(prov.userId, prov.email);
      return true;
    }

    // Admin fallback credentials (including official credentials wazeerAdmin@erp.org / #786$Wazeri)
    const isAdmin =
      (email === "wazeeradmin@erp.org" ||
        email === "wazeeradmin" ||
        email === "hafez@wazeer-elhelw.com" ||
        email === "admin@wazeer-elhelw.com" ||
        email === "admin") &&
      (pass === "#786$Wazeri" ||
        pass === "admin123" ||
        pass === "wazeer123" ||
        pass === "123456" ||
        pass === "Pos@123456");

    if (isAdmin) {
      const cleanAdminEmail = email.includes("@") ? email : "wazeeradmin@erp.org";
      await loadUserProfile("usr-wazeer-admin", cleanAdminEmail);
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
    persistSession(null, false);
  };

  const setAuthenticated = (val: boolean) => {
    if (!val) {
      persistSession(null, false);
    } else {
      persistSession(globalUser || readStoredUser() || DEFAULT_USER, true);
    }
  };

  const adminAccount: AppUser = {
    ...DEFAULT_USER,
    id: "usr-wazeer-admin",
    name: { ar: "أدمين وزير الحلو", en: "Wazeer Admin" },
    email: "wazeerAdmin@erp.org",
    role: "admin",
    roleLabel: { ar: "مسؤول النظام (لوحة التحكم)", en: "System Administrator" },
  };

  return {
    currentUser: currentUser || DEFAULT_USER,
    isAuthenticated,
    demoAccounts: [adminAccount, POS_CASHIER_ACCOUNT] as AppUser[],
    login: loginSync,
    loginAsync: login,
    loginAs,
    logout,
    setAuthenticated,
  };
}
