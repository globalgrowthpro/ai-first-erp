import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore, type AppUser } from "@/lib/auth-store";
import { useLocation } from "@tanstack/react-router";

export interface OnlinePresenceUser {
  sessionId: string;
  userId: string;
  name: { ar: string; en: string };
  email: string;
  role: string;
  roleLabel: { ar: string; en: string };
  department?: { ar: string; en: string } | undefined;
  position?: { ar: string; en: string } | undefined;
  avatarBg: string;
  initials: string;
  currentPath: string;
  currentPathName: { ar: string; en: string };
  connectedAt: string;
  lastSeen: number;
  deviceInfo: string;
  isCurrentUser: boolean;
  isAiAgent?: boolean | undefined;
}

export function getPathLabel(path: string): { ar: string; en: string } {
  const clean = path === "/" ? "/" : path.replace(/\/$/, "");
  switch (clean) {
    case "/":
      return { ar: "لوحة التحكم الرئيسية", en: "Executive Dashboard" };
    case "/pos":
      return { ar: "نقطة البيع والكاشير", en: "POS Cashier Terminal" };
    case "/sales":
      return { ar: "المبيعات وفواتير التوريد", en: "Sales & Invoicing" };
    case "/purchases":
      return { ar: "المشتريات والتوريد", en: "Procurement & POs" };
    case "/accounting":
      return { ar: "الدفتر العام والمالية", en: "General Ledger" };
    case "/inventory":
      return { ar: "المستودعات والمخزون", en: "Inventory & Warehouses" };
    case "/manufacturing":
      return { ar: "المطبخ المركزي والتصنيع", en: "Central Kitchen Production" };
    case "/dispatch":
      return { ar: "إدارة الأسطول والتوزيع", en: "Dispatch & Logistics" };
    case "/partners":
      return { ar: "دليل العملاء والموردين", en: "Partners Directory" };
    case "/hr":
      return { ar: "الموارد البشرية والرواتب", en: "HR & Payroll" };
    case "/reports":
      return { ar: "التقارير والذكاء التجاري", en: "Reports & BI Studio" };
    case "/audit":
      return { ar: "سجل التدقيق والأمان", en: "Audit Trail" };
    case "/ai":
      return { ar: "مساعد الذكاء الاصطناعي", en: "AI Copilot Workspace" };
    case "/ai-modules":
      return { ar: "وكلاء الذكاء الاصطناعي", en: "AI Autonomous Agents" };
    case "/settings":
      return { ar: "إعدادات المنظومة والمستخدمين", en: "System Settings" };
    case "/helpdesk":
      return { ar: "مركز الدعم الفني", en: "Helpdesk & Support" };
    default:
      return { ar: `قسم: ${clean}`, en: `Screen: ${clean}` };
  }
}

export function computeInitials(name?: { ar: string; en: string } | string): string {
  if (!name) return "U";
  if (typeof name === "string") {
    const parts = name.trim().split(/\s+/);
    const first = parts[0];
    const second = parts[1];
    if (first && second && first[0] && second[0]) {
      return (first[0] + second[0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  const en = name.en || "";
  if (en) {
    const parts = en.trim().split(/\s+/);
    const first = parts[0];
    const second = parts[1];
    if (first && second && first[0] && second[0]) {
      return (first[0] + second[0]).toUpperCase();
    }
    return en.slice(0, 2).toUpperCase();
  }

  const ar = name.ar || "";
  const arParts = ar.trim().split(/\s+/);
  const firstAr = arParts[0];
  const secondAr = arParts[1];
  if (firstAr && secondAr && firstAr[0] && secondAr[0]) {
    return firstAr[0] + secondAr[0];
  }
  return ar.slice(0, 2) || "HR";
}

function getBrowserDeviceInfo(): string {
  if (typeof window === "undefined" || !navigator) return "Web Terminal";
  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";

  let os = "Desktop";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return `${browser} • ${os}`;
}

const AI_COPILOT_AGENT: OnlinePresenceUser = {
  sessionId: "ai-copilot-presence-singleton",
  userId: "usr-ai-copilot",
  name: { ar: "وكيل الذكاء الاصطناعي (AI Copilot)", en: "AI Copilot Agent" },
  email: "copilot@wazeer-elhelw.com",
  role: "ai",
  roleLabel: { ar: "مساعد تشغيلي ذكي 24/7", en: "Autonomous 24/7 Agent" },
  department: { ar: "الأنظمة الذكية والمراقبة", en: "Autonomous Operations" },
  position: { ar: "منسق العمليات الذكي", en: "Executive Copilot" },
  avatarBg: "from-violet-600 via-fuchsia-600 to-pink-600",
  initials: "✨",
  currentPath: "/ai",
  currentPathName: { ar: "مراقبة وتحليل المنظومة", en: "Autonomous System Sentinel" },
  connectedAt: new Date(Date.now() - 3600000).toISOString(),
  lastSeen: Date.now(),
  deviceInfo: "Cloud AI Infrastructure • 24/7",
  isCurrentUser: false,
  isAiAgent: true,
};

// Generate persistent unique tab session id in sessionStorage
function getTabSessionId(): string {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return `sess-${Math.random().toString(36).slice(2, 9)}`;
  }
  let sid = sessionStorage.getItem("hafez_erp_presence_tab_id");
  if (!sid) {
    sid = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem("hafez_erp_presence_tab_id", sid);
  }
  return sid;
}

// Get or initialize session connect time
function getSessionConnectedAt(): string {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return new Date().toISOString();
  }
  let ct = sessionStorage.getItem("hafez_erp_presence_connected_at");
  if (!ct) {
    ct = new Date().toISOString();
    sessionStorage.setItem("hafez_erp_presence_connected_at", ct);
  }
  return ct;
}

export function useOnlinePresence() {
  const { currentUser } = useAuthStore();
  const location = useLocation();
  const currentPath = location.pathname;

  const sessionId = useMemo(() => getTabSessionId(), []);
  const connectedAt = useMemo(() => getSessionConnectedAt(), []);

  // Remote and cross-tab sessions map: key = sessionId
  const [remoteSessions, setRemoteSessions] = useState<Record<string, OnlinePresenceUser>>({});

  // Build the current user presence record
  const currentPresencePayload = useMemo<OnlinePresenceUser>(() => {
    const user = currentUser || {
      id: "usr-1",
      name: { ar: "حافظ رحيم", en: "Hafez Rahim" },
      email: "hafez@wazeer-elhelw.com",
      role: "admin",
      roleLabel: { ar: "مسؤول النظام", en: "System Administrator" },
      department: { ar: "الإدارة العامة", en: "Executive Management" },
      position: { ar: "المدير العام", en: "General Manager" },
      avatarBg: "from-purple-600 via-indigo-600 to-blue-600",
      description: { ar: "كامل صلاحيات النظام", en: "Full administrative control" },
      allowedPages: ["*"],
    };

    return {
      sessionId,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: user.roleLabel || { ar: "مستخدم معتمد", en: "Authorized User" },
      department: user.department,
      position: user.position,
      avatarBg: user.avatarBg || "from-purple-600 to-indigo-700",
      initials: computeInitials(user.name),
      currentPath,
      currentPathName: getPathLabel(currentPath),
      connectedAt,
      lastSeen: Date.now(),
      deviceInfo: getBrowserDeviceInfo(),
      isCurrentUser: true,
      isAiAgent: false,
    };
  }, [currentUser, currentPath, sessionId, connectedAt]);

  // 1. Cross-tab BroadcastChannel & Local Storage Heartbeat Sync
  useEffect(() => {
    if (typeof window === "undefined") return;

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("hafez_erp_presence_sync");
        bc.onmessage = (event) => {
          const msg = event.data;
          if (!msg || !msg.type) return;

          if (msg.type === "PRESENCE_PING" && msg.payload) {
            const peer = msg.payload as OnlinePresenceUser;
            if (peer.sessionId !== sessionId) {
              setRemoteSessions((prev) => ({
                ...prev,
                [peer.sessionId]: { ...peer, isCurrentUser: false },
              }));
            }
          } else if (msg.type === "PRESENCE_BYE" && msg.sessionId) {
            setRemoteSessions((prev) => {
              const copy = { ...prev };
              delete copy[msg.sessionId];
              return copy;
            });
          }
        };
      }
    } catch {}

    // Broadcast current session ping immediately
    const broadcastPing = () => {
      const pingMsg = { type: "PRESENCE_PING", payload: currentPresencePayload };
      try {
        bc?.postMessage(pingMsg);
      } catch {}

      // Fallback via localStorage for browsers without BroadcastChannel
      try {
        localStorage.setItem(`hafez_presence_${sessionId}`, JSON.stringify(currentPresencePayload));
      } catch {}
    };

    broadcastPing();
    const interval = setInterval(broadcastPing, 5000);

    // Prune stale sessions older than 18 seconds
    const pruneInterval = setInterval(() => {
      const threshold = Date.now() - 18000;
      setRemoteSessions((prev) => {
        let changed = false;
        const next: Record<string, OnlinePresenceUser> = {};
        for (const [sid, s] of Object.entries(prev)) {
          if (s.lastSeen >= threshold) {
            next[sid] = s;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 6000);

    // Cleanup on tab close / unload
    const handleUnload = () => {
      try {
        bc?.postMessage({ type: "PRESENCE_BYE", sessionId });
        localStorage.removeItem(`hafez_presence_${sessionId}`);
      } catch {}
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      clearInterval(pruneInterval);
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
      try {
        bc?.close();
      } catch {}
    };
  }, [currentPresencePayload, sessionId]);

  // 2. Supabase Realtime Presence Channel (Network-wide sync across different devices)
  useEffect(() => {
    let channel: any = null;
    try {
      channel = supabase.channel("online_erp_presence", {
        config: {
          presence: { key: sessionId },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const remoteMap: Record<string, OnlinePresenceUser> = {};

          for (const key of Object.keys(state)) {
            if (key === sessionId) continue;
            const presenceList = state[key];
            if (Array.isArray(presenceList) && presenceList.length > 0) {
              const latest = presenceList[presenceList.length - 1];
              if (latest && latest.userId) {
                remoteMap[key] = {
                  ...latest,
                  isCurrentUser: false,
                  lastSeen: Date.now(),
                };
              }
            }
          }

          if (Object.keys(remoteMap).length > 0) {
            setRemoteSessions((prev) => ({ ...prev, ...remoteMap }));
          }
        })
        .on("presence", { event: "leave" }, ({ key }: { key: string }) => {
          if (key && key !== sessionId) {
            setRemoteSessions((prev) => {
              const copy = { ...prev };
              delete copy[key];
              return copy;
            });
          }
        })
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") {
            try {
              await channel.track(currentPresencePayload);
            } catch {}
          }
        });
    } catch (e) {
      console.warn("Supabase presence channel error:", e);
    }

    return () => {
      if (channel) {
        try {
          channel.untrack();
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [sessionId, currentPresencePayload]);

  // Aggregate final online users: Current User Tab + Remote Connected Users/Tabs + AI Copilot
  const onlineUsers = useMemo<OnlinePresenceUser[]>(() => {
    const list: OnlinePresenceUser[] = [currentPresencePayload];

    // Add unique other connected sessions
    for (const [sid, remoteUser] of Object.entries(remoteSessions)) {
      if (sid === sessionId) continue;
      // Do not duplicate exact same session
      list.push(remoteUser);
    }

    // Always append the AI Copilot Agent as virtual 24/7 team participant
    list.push(AI_COPILOT_AGENT);

    return list;
  }, [currentPresencePayload, remoteSessions, sessionId]);

  return {
    onlineUsers,
    totalCount: onlineUsers.length,
    currentPresence: currentPresencePayload,
  };
}
