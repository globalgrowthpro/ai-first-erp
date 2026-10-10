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

let globalUser: AppUser | null = null;
let globalIsAuth = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    l();
  }
}

let initialized = false;

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
    
    // Check if POS Cashier
    if (
      cleanEmail === "cashier@wazeer-elhelw.com" ||
      cleanEmail === "pos@wazeer-elhelw.com" ||
      cleanEmail.startsWith("cashier")
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
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId);
      const effectiveRole = (roles && roles.length > 0 && roles[0]) ? roles[0].role : 'admin';

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
          name: { ar: cleanEmail ? cleanEmail.split('@')[0] || 'User' : 'User', en: cleanEmail ? cleanEmail.split('@')[0] || 'User' : 'User' }
        };
      } else {
        globalUser = {
          ...DEFAULT_USER,
          id: userId,
          email: cleanEmail,
          role: effectiveRole as any,
          allowedPages: ["/", "/sales", "/pos"],
          name: { ar: cleanEmail ? cleanEmail.split('@')[0] || 'User' : 'User', en: cleanEmail ? cleanEmail.split('@')[0] || 'User' : 'User' }
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
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hafez_active_user_session", JSON.stringify(globalUser));
      } catch (_) {}
    }
    emit();
  };

  useEffect(() => {
    if (!initialized && typeof window !== 'undefined') {
      initialized = true;

      // 1. Restore local session if exists
      const stored = localStorage.getItem("hafez_active_user_session");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email) {
            globalUser = parsed;
            globalIsAuth = true;
            emit();
          }
        } catch (_) {}
      }

      // 2. Check Supabase Auth
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          loadUserProfile(session.user.id, session.user.email || '');
        } else if (!globalUser) {
          globalUser = null;
          globalIsAuth = false;
          emit();
        }
      }).catch(() => {
        // Fallback to stored session if offline
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          loadUserProfile(session.user.id, session.user.email || '');
        }
      });
    }
  }, []);

  const login = async (rawEmail: string, rawPass: string): Promise<boolean> => {
    const email = rawEmail.trim().toLowerCase();
    const pass = rawPass.trim();

    // Check POS Cashier credentials directly
    const isCashier =
      (email === "cashier@wazeer-elhelw.com" ||
        email === "pos@wazeer-elhelw.com" ||
        email === "cashier" ||
        email === "pos") &&
      (pass === "Pos@123456" ||
        pass === "pos123" ||
        pass === "cashier123" ||
        pass === "123456");

    if (isCashier) {
      globalUser = { ...POS_CASHIER_ACCOUNT };
      globalIsAuth = true;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hafez_active_user_session", JSON.stringify(globalUser));
        } catch (_) {}
      }
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
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hafez_active_user_session", JSON.stringify(globalUser));
        } catch (_) {}
      }
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
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("hafez_active_user_session");
      } catch (_) {}
    }
    emit();
  };

  const setAuthenticated = (val: boolean) => {
    globalIsAuth = val;
    if (!val) {
      globalUser = null;
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("hafez_active_user_session");
        } catch (_) {}
      }
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
