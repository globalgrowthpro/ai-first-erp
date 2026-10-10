import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Sparkles,
  ReceiptText,
  ShoppingCart,
  Calculator,
  Boxes,
  Users,
  Truck,
  BarChart3,
  ScrollText,
  ShieldCheck,
  Languages,
  Search,
  Bot,
  Bell,
  LogOut,
  AlertTriangle,
  FileText,
  CheckCircle2,
  X,
  Check,
  PanelLeft,
  PanelLeftClose,
  Factory,
  ChevronDown,
  User,
  ChefHat,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  LifeBuoy,
  Store,
  Phone,
  History,
} from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useSidebarVisible } from "@/lib/ui-prefs";
import { useCompanySettings } from "@/lib/settings-store";
import { useAuthStore, type AppUser } from "@/lib/auth-store";
import { useHelpdeskStore } from "@/lib/helpdesk-store";
import { useOnlinePresence } from "@/lib/presence-store";
import { OnlineUsersModal } from "@/components/presence/OnlineUsersModal";
import { LoginOverlay } from "@/components/auth/LoginOverlay";
import { AccessDeniedView } from "./AccessDeniedView";
import { cn } from "@/lib/utils";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const erpNav = [
  { to: "/", key: "nav_dashboard", icon: LayoutDashboard },
  { to: "/ai", key: "nav_ai", icon: Sparkles },
  { to: "/pos", key: "nav_pos", icon: Store },
  { to: "/pos-shifts", key: "nav_pos_shifts", icon: History },
  { to: "/sales", key: "nav_sales", icon: ReceiptText },
  { to: "/purchases", key: "nav_purchases", icon: ShoppingCart },
  { to: "/accounting", key: "nav_accounting", icon: Calculator },
  { to: "/inventory", key: "nav_inventory", icon: Boxes },
  { to: "/manufacturing", key: "nav_manufacturing", icon: Factory },
  { to: "/dispatch", key: "nav_dispatch", icon: Truck },
  { to: "/partners", key: "nav_partners", icon: Users },
  { to: "/hr", key: "nav_hr", icon: UserCheck },
] as const;

const controlNav = [
  { to: "/reports", key: "nav_reports", icon: BarChart3 },
  { to: "/audit", key: "nav_audit", icon: ScrollText },
  { to: "/helpdesk", key: "nav_helpdesk", icon: LifeBuoy },
  { to: "/ai-modules", key: "nav_ai_modules", icon: Bot },
  { to: "/settings", key: "nav_settings", icon: ShieldCheck },
] as const;

interface NotificationItem {
  id: string;
  title: { ar: string; en: string };
  desc: { ar: string; en: string };
  time: { ar: string; en: string };
  type: "warning" | "info" | "success";
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: { ar: "تنبيه نقص المخزون", en: "Low Stock Alert" },
    desc: {
      ar: "رصيد قشطة بلدي طبيعية (90 كجم) أوشك على الحد الأدنى في مستودع التبريد",
      en: "Clotted Baladi Cream (90kg) is near minimum threshold in Cold Hub",
    },
    time: { ar: "منذ 15 دقيقة", en: "15m ago" },
    type: "warning",
    read: false,
  },
  {
    id: "notif-2",
    title: { ar: "فاتورة مشتريات جديدة", en: "New Vendor Bill" },
    desc: {
      ar: "فاتورة توريد عبوات كرتون من الأهرام للتغليف بـ 18,500 ج.م بانتظار الاعتماد",
      en: "Carton packaging bill from Al-Ahram (18,500 EGP) awaiting review",
    },
    time: { ar: "منذ ساعة", en: "1h ago" },
    type: "info",
    read: false,
  },
  {
    id: "notif-3",
    title: { ar: "تجاوز مستهدف مبيعات اليوم", en: "Sales Target Exceeded" },
    desc: {
      ar: "تجاوزت مبيعات فروع الكوربة والمعادي 85,000 ج.م اليوم بنمو +14%",
      en: "Sales exceeded 85,000 EGP across Korba & Maadi (+14% growth)",
    },
    time: { ar: "منذ ساعتين", en: "2h ago" },
    type: "success",
    read: false,
  },
];

function NavList({
  items,
  label,
  allowedPages,
  isAdmin = false,
}: {
  items: typeof erpNav | typeof controlNav;
  label: string;
  allowedPages: string[];
  isAdmin?: boolean;
}) {
  const { t } = useI18n();
  const { tickets } = useHelpdeskStore();
  const activeTicketsCount = tickets.filter(
    (tk) => tk.status === "open" || tk.status === "in_progress"
  ).length;

  const visibleItems = items.filter(
    (item) => isAdmin || allowedPages.includes("*") || allowedPages.includes(item.to)
  );
  if (visibleItems.length === 0) return null;

  return (
    <div className="mt-5 first:mt-0">
      <p className="px-2.5 text-[9px] font-bold uppercase tracking-[0.16em] text-ink-foreground/45">
        {label}
      </p>
      <nav className="mt-1.5 space-y-0.5">
        {visibleItems.map(({ to, key, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-foreground/75 transition-colors hover:bg-ink-foreground/10 hover:text-ink-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{t(key)}</span>
            </div>
            {to === "/helpdesk" && activeTicketsCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 group-data-[status=active]:bg-primary-foreground/20 group-data-[status=active]:text-primary-foreground shrink-0">
                {activeTicketsCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, pick, toggle, lang, dir } = useI18n();
  const [sidebarVisible, setSidebarVisible] = useSidebarVisible();
  const { settings } = useCompanySettings();
  const companyName = lang === "ar" ? settings.nameAr : settings.nameEn;
  const companyLogo = settings.logoUrl || "/ai-first-erp-logo.png";

  const {
    currentUser,
    isAuthenticated,
    demoAccounts,
    loginAs,
    logout,
    setAuthenticated,
  } = useAuthStore();

  const { onlineUsers, totalCount } = useOnlinePresence();
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const normalizedPath = currentPath === "/" ? "/" : currentPath.replace(/\/$/, "");
  const isAdmin = currentUser.role === "admin";
  const isPageAllowed =
    isAdmin ||
    currentUser.allowedPages.includes("*") ||
    currentUser.allowedPages.includes(normalizedPath) ||
    currentUser.allowedPages.some(
      (page) => page !== "/" && (normalizedPath === page || normalizedPath.startsWith(page + "/"))
    );

  // Check if on POS screen to render dedicated full-screen POS terminal
  const isPosPage = normalizedPath === "/pos";

  // Check if current user only has permission for AI Workspace
  const hasOnlyAiPermission =
    !isAdmin &&
    (currentUser.role === "ai" ||
      (currentUser.allowedPages.length > 0 &&
        currentUser.allowedPages.every((p) => p === "/ai")));

  // Check if current user only has permission for POS Screen
  const hasOnlyPosPermission =
    !isAdmin &&
    (currentUser.role === "pos_cashier" ||
      (currentUser.allowedPages.length > 0 &&
        currentUser.allowedPages.every((p) => p === "/pos")));

  useEffect(() => {
    if (!isPageAllowed) {
      const fallback = currentUser.allowedPages[0] || "/";
      navigate({ to: fallback });
    }
  }, [isPageAllowed, currentUser.allowedPages, navigate]);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  useEffect(() => {
    const handleNewNotif = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationItem>;
      if (customEvent.detail) {
        setNotifications((prev) => [customEvent.detail, ...prev.filter((n) => n.id !== customEvent.detail.id)]);
      }
    };
    window.addEventListener("hafez-system-notification", handleNewNotif);
    return () => window.removeEventListener("hafez-system-notification", handleNewNotif);
  }, []);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // User switcher dropdown state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);


  // Logout modal state
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggedOutSuccess, setIsLoggedOutSuccess] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markItemAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleLogoutConfirm = () => {
    setIsLoggedOutSuccess(true);
    setTimeout(() => {
      logout();
      setIsLogoutOpen(false);
      setIsLoggedOutSuccess(false);
    }, 600);
  };

  // Search state & permission filter
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const allowedNavItems = [...erpNav, ...controlNav].filter(
    (item) => isAdmin || currentUser.allowedPages.includes("*") || currentUser.allowedPages.includes(item.to)
  );

  const searchResults = searchQuery.trim()
    ? allowedNavItems.filter((item) => {
        const title = t(item.key).toLowerCase();
        const q = searchQuery.toLowerCase().trim();
        return title.includes(q) || item.to.toLowerCase().includes(q);
      })
    : [];

  // Close notifications, search & user menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    if (isNotifOpen || isUserMenuOpen || isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotifOpen, isUserMenuOpen, isSearchOpen]);

  return (
    <div className="flex min-h-screen bg-secondary">
      {/* Sidebar - Compact Width (Hidden on POS Terminal and for POS-only cashiers to maximize terminal workspace) */}
      {!hasOnlyPosPermission && !isPosPage && (
        <aside
          className={cn(
            "gradient-ink sticky top-0 hidden h-screen w-52 xl:w-56 shrink-0 flex-col border-e border-border/20 p-3",
            sidebarVisible && "lg:flex"
          )}
        >
          <Link to="/" className="block px-0.5" aria-label={companyName}>
            <div className="rounded-xl bg-white p-2 shadow-xs transition-transform hover:scale-[1.01]">
              <img
                src={companyLogo}
                alt={companyName}
                className="h-auto max-h-16 w-full object-contain"
              />
            </div>
          </Link>

          <div className="mt-3.5 flex-1 overflow-y-auto">
            <NavList items={erpNav} label={t("group_erp")} allowedPages={currentUser.allowedPages} isAdmin={isAdmin} />
            <NavList items={controlNav} label={t("group_control")} allowedPages={currentUser.allowedPages} isAdmin={isAdmin} />
          </div>

          <div className="rounded-lg border border-ink-foreground/15 bg-ink-foreground/5 p-2.5 space-y-0.5">
            <p className="text-xs font-bold text-ink-foreground truncate">
              {pick(currentUser.name.ar, currentUser.name.en)}
            </p>
            <p className="text-[10px] text-ink-foreground/65 truncate">
              {pick(currentUser.roleLabel.ar, currentUser.roleLabel.en)}
            </p>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header - Hidden on POS page to eliminate double header and provide dedicated POS terminal UI */}
        {!hasOnlyAiPermission && !isPosPage && (
          <header className="sticky top-0 z-20 flex items-center gap-2 sm:gap-2.5 border-b border-border/60 bg-card/90 backdrop-blur-md px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none">
          <Link
            to={hasOnlyPosPermission ? "/pos" : "/"}
            className="w-32 shrink-0 lg:hidden"
            aria-label={companyName}
          >
            <img
              src={companyLogo}
              alt={companyName}
              className="h-8 w-full object-contain"
            />
          </Link>

          {/* POS Terminal Station Badge */}
          {hasOnlyPosPermission && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <Store className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>{pick("محطة نقطة البيع المباشرة (POS Terminal)", "Direct POS Terminal Station")}</span>
            </div>
          )}

          {/* Sidebar toggle */}
          {!hasOnlyPosPermission && (
            <button
              onClick={() => setSidebarVisible(!sidebarVisible)}
              title={
                sidebarVisible
                  ? lang === "ar" ? "إخفاء الشريط الجانبي" : "Hide sidebar"
                  : lang === "ar" ? "إظهار الشريط الجانبي" : "Show sidebar"
              }
              aria-label={
                sidebarVisible
                  ? lang === "ar" ? "إخفاء الشريط الجانبي" : "Hide sidebar"
                  : lang === "ar" ? "إظهار الشريط الجانبي" : "Show sidebar"
              }
              aria-pressed={sidebarVisible}
              className="hidden lg:inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground shadow-2xs hover:shadow-xs transition-all duration-150 active:scale-95 cursor-pointer"
            >
              {sidebarVisible ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeft className="size-4" />
              )}
            </button>
          )}

          {/* Protected Search Bar */}
          {!hasOnlyPosPermission && (
            <div className="relative hidden sm:flex min-w-0 flex-1 max-w-md" ref={searchRef}>
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border/70 bg-secondary/35 px-3 hover:bg-secondary/60 focus-within:bg-card focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-150 shadow-2xs">
                <Search className="size-4 shrink-0 text-muted-foreground/75" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder={pick("بحث في النظام، الشاشات، والفواتير...", "Search system, modules, records...")}
                  className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/60 text-foreground"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground/70 bg-card border border-border/60 rounded-md shadow-2xs">
                    Ctrl K
                  </kbd>
                )}
              </label>

              {/* Protected Search Results Dropdown */}
              {isSearchOpen && searchQuery.trim().length > 0 && (
                <div
                  className={cn(
                    "absolute top-full mt-2 w-full max-w-md rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-2 shadow-2xl z-50 text-xs space-y-1 ring-1 ring-black/5",
                    dir === "rtl" ? "right-0" : "left-0"
                  )}
                >
                  <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/40">
                    {lang === "ar" ? "الصفحات المصرح بها" : "Authorized Modules"}
                  </div>
                {searchResults.length === 0 ? (
                  <div className="py-4 text-center text-muted-foreground text-xs">
                    {lang === "ar" ? "لا توجد نتائج مصرح بها" : "No authorized matches"}
                  </div>
                ) : (
                  searchResults.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-secondary transition-colors text-foreground font-medium"
                      >
                        <Icon className="size-4 text-primary shrink-0" />
                        <span>{t(item.key)}</span>
                        <span className="ms-auto font-mono text-[10px] text-muted-foreground">
                          {item.to}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

          {/* Action Controls Group - Pushed to the Left Edge */}
          <div className="flex items-center gap-1.5 sm:gap-2 ms-auto shrink-0">
            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={notifDropdownRef}>
            <button
              onClick={() => setIsNotifOpen((prev) => !prev)}
              title={t("notifications")}
              aria-label={t("notifications")}
              className={cn(
                "relative inline-flex items-center justify-center size-9 rounded-xl border transition-all duration-150 active:scale-95 shadow-2xs hover:shadow-xs shrink-0 cursor-pointer",
                isNotifOpen
                  ? "bg-secondary border-primary/50 text-primary ring-2 ring-primary/10"
                  : "border-border/70 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border"
              )}
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -end-1 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-[9px] font-mono font-bold text-white shadow-xs ring-2 ring-card">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {isNotifOpen && (
              <div
                className={cn(
                  "absolute top-full mt-2 w-80 sm:w-96 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-3.5 shadow-2xl z-50 text-xs ring-1 ring-black/5",
                  dir === "rtl" ? "left-0" : "right-0"
                )}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Bell className="size-3.5 text-primary" />
                    <span>{t("notifications")}</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-mono font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      {t("markAllRead")}
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground">
                      {t("notificationsEmpty")}
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => markItemAsRead(item.id)}
                        className={cn(
                          "p-2.5 rounded-xl border transition-colors cursor-pointer space-y-1",
                          item.read
                            ? "bg-transparent border-transparent opacity-65 hover:bg-secondary/60"
                            : "bg-secondary/70 border-border/50 hover:bg-secondary"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-semibold text-foreground">
                            {item.type === "warning" && (
                              <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                            )}
                            {item.type === "info" && (
                              <FileText className="size-3.5 text-blue-500 shrink-0" />
                            )}
                            {item.type === "success" && (
                              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                            )}
                            <span className="text-[11px]">{pick(item.title)}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {pick(item.time)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed ps-5">
                          {pick(item.desc)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Helpdesk Link */}
          {(currentUser.allowedPages.includes("/helpdesk") || currentUser.allowedPages.includes("/settings")) && (
            <Link
              to="/helpdesk"
              title={pick("مركز الدعم الفني والتذاكر", "Helpdesk & Support Tickets")}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-border/70 bg-secondary/40 text-muted-foreground hover:text-primary hover:bg-secondary hover:border-primary/30 shadow-2xs hover:shadow-xs transition-all duration-150 active:scale-95 shrink-0"
            >
              <LifeBuoy className="size-4" />
            </Link>
          )}

          {/* Language Switcher */}
          <button
            onClick={toggle}
            title={t("lang")}
            aria-label={t("lang")}
            className="inline-flex h-9 sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-secondary/40 px-2.5 sm:px-3 text-xs font-semibold text-foreground/85 hover:text-foreground hover:bg-secondary shadow-2xs hover:shadow-xs transition-all duration-150 active:scale-95 shrink-0 cursor-pointer"
          >
            <Languages className="size-3.5 text-muted-foreground shrink-0" />
            <span className="hidden sm:inline font-medium">{t("lang")}</span>
          </button>

          {/* Ask AI Button (Refined with glowing accent and AI badge) */}
          {(isAdmin || currentUser.allowedPages.includes("*") || currentUser.allowedPages.includes("/ai")) && (
            <Link
              to="/ai"
              className={cn(
                "hidden sm:inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-bold text-white transition-all duration-200 active:scale-95 shadow-sm shadow-primary/20 shrink-0",
                "bg-gradient-to-r from-primary via-primary/95 to-crimson hover:from-primary/90 hover:to-crimson hover:shadow-md hover:shadow-primary/30 border border-white/20 ring-1 ring-primary/20 cursor-pointer"
              )}
            >
              <Sparkles className="size-3.5 text-amber-300 animate-pulse shrink-0" />
              <span className="tracking-wide">{t("askAi")}</span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-white/20 text-[9px] font-mono font-black tracking-tight text-white">
                AI
              </span>
            </Link>
          )}

          {/* Demo User Switcher & Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={cn(
                "inline-flex items-center gap-2 h-9 rounded-xl border px-2.5 text-xs transition-all duration-150 cursor-pointer shrink-0 active:scale-98",
                isUserMenuOpen
                  ? "bg-secondary border-primary/40 ring-2 ring-primary/10 shadow-xs"
                  : "bg-secondary/40 hover:bg-secondary border-border/70 hover:border-border text-foreground shadow-2xs hover:shadow-xs"
              )}
              title={pick("تبديل الحساب التجريبي", "Switch Demo Account")}
            >
              <div
                className={`size-6 rounded-lg bg-gradient-to-tr ${currentUser.avatarBg} text-white flex items-center justify-center font-bold text-[11px] shadow-xs ring-1 ring-white/20 shrink-0`}
              >
                {currentUser.name.ar[0]}
              </div>
              <div className="hidden md:flex flex-col text-start justify-center">
                <p className="font-bold text-foreground text-[11px] leading-tight truncate max-w-[130px]">
                  {pick(currentUser.name.ar, currentUser.name.en)}
                </p>
                <span className="text-[9px] text-muted-foreground font-medium leading-none truncate max-w-[130px] mt-0.5">
                  {pick(currentUser.roleLabel.ar, currentUser.roleLabel.en)}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "size-3 text-muted-foreground transition-transform duration-200 shrink-0",
                  isUserMenuOpen && "rotate-180 text-foreground"
                )}
              />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div
                className={cn(
                  "absolute top-full mt-2 w-72 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-3 shadow-2xl z-50 text-xs space-y-2 ring-1 ring-black/5",
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

                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {demoAccounts.map((acc: AppUser) => {
                    const isSelected = currentUser.id === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          loginAs(acc.id);
                          setIsUserMenuOpen(false);
                        }}
                        className={cn(
                          "w-full p-2 rounded-xl text-start flex items-center gap-2.5 transition-all cursor-pointer",
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

                <div className="pt-2 border-t border-border/50 text-[11px] space-y-1">
                  <Link
                    to="/helpdesk"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="inline-flex items-center justify-between w-full p-2 rounded-xl text-foreground font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <LifeBuoy className="size-3.5 text-primary" />
                      <span>{pick("مركز الدعم الفني (Helpdesk)", "Operations Helpdesk")}</span>
                    </span>
                    <span className="bg-primary/15 text-primary text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                      Support
                    </span>
                  </Link>

                  <a
                    href="https://odooteams.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-between w-full p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <span>Developer: Mr.Hafez Rahim</span>
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </a>
                </div>
              </div>
            )}
          </div>

            {/* Logout Icon Button */}
            <button
              onClick={() => setIsLogoutOpen(true)}
              className="inline-flex items-center justify-center size-9 rounded-xl border border-border/70 bg-secondary/40 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/30 shadow-2xs hover:shadow-xs transition-all duration-150 active:scale-95 shrink-0 cursor-pointer"
              title={t("logout")}
              aria-label={t("logout")}
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        )}

        {/* Mobile Navigation */}
        {!hasOnlyAiPermission && (
          <nav className="flex gap-1 overflow-x-auto border-b border-border/40 bg-ink px-2 py-2 lg:hidden">
            {[...erpNav, ...controlNav]
              .filter((item) => isAdmin || currentUser.allowedPages.includes("*") || currentUser.allowedPages.includes(item.to))
              .map(({ to, key }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold text-ink-foreground/70 data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
              >
                {t(key)}
              </Link>
            ))}
          </nav>
        )}

        {/* Page Main Content */}
        <main key={lang} className="flex-1 space-y-6 p-4 md:p-6">
          {isPageAllowed ? (
            children
          ) : (
            <AccessDeniedView
              currentUser={currentUser}
              targetPath={normalizedPath}
              fallbackPath={currentUser.allowedPages[0] || "/"}
              lang={lang}
            />
          )}
        </main>

        {/* Footer: Current Online Users & Developer Info */}
        <footer
          className={cn(
            "border-t border-border/80 bg-card/60 backdrop-blur-md px-4 sm:px-6 py-2.5 text-xs text-muted-foreground flex flex-col items-center justify-between gap-3",
            dir === "rtl" ? "sm:flex-row" : "sm:flex-row-reverse"
          )}
        >
          {/* Online Users as Avatars (Renders on the Right side) — Admin Only */}
          {isAdmin ? (
            <div
              onClick={() => setIsOnlineModalOpen(true)}
              className="flex items-center gap-3 cursor-pointer group/online px-2 py-1 rounded-xl transition-all hover:bg-secondary/80 border border-transparent hover:border-border/60"
              title={pick(
                "عرض قائمة وتفاصيل المستخدمين المتصلين لحظياً في المنظومة",
                "Click to view live connected users & sessions"
              )}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-semibold text-foreground/80 group-hover/online:text-primary transition-colors">
                  {lang === "ar"
                    ? `المستخدمون المتصلون الآن (${totalCount}):`
                    : `Online Users (${totalCount}):`}
                </span>
              </div>

              {/* Overlapping Avatars Stack */}
              <div className="flex items-center -space-x-1.5 rtl:space-x-reverse">
                {onlineUsers.map((user) => {
                  const titleStr = `${user.name[lang]} • ${user.roleLabel[lang]} (${user.currentPathName[lang]})`;
                  return (
                    <div
                      key={user.sessionId}
                      className="group relative"
                      title={titleStr}
                    >
                      <div
                        className={cn(
                          "size-7 rounded-full bg-gradient-to-tr text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-card shadow-xs cursor-pointer transition-transform duration-150 group-hover:scale-120 group-hover:z-20",
                          user.avatarBg
                        )}
                      >
                        {user.initials}
                      </div>
                      <span className="absolute bottom-0 end-0 size-2 rounded-full bg-emerald-500 ring-1 ring-card" />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Left Side: Name and Number */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-foreground/85" dir="ltr">
            <span className="font-bold text-foreground">Hafez Rahim</span>
            <span className="text-muted-foreground/40">•</span>
            <a
              href="tel:+201007419344"
              className="text-primary hover:underline font-semibold tracking-tight transition-colors inline-flex items-center gap-1"
            >
              <Phone className="size-3 text-muted-foreground" />
              <span>+20 100 741 9344</span>
            </a>
          </div>
        </footer>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <DialogContent className="max-w-md border-0 shadow-xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm font-semibold">
              <LogOut className="size-5 shrink-0" />
              <span>{t("logoutConfirm")}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              {t("logoutDesc")}
            </p>

            {isLoggedOutSuccess ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Check className="size-4 shrink-0" />
                <span className="font-semibold">
                  {pick({
                    ar: "تم تسجيل الخروج بنجاح. يتم إنهاء الجلسة...",
                    en: "Logged out successfully. Terminating session...",
                  })}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLogoutOpen(false)}
                >
                  {t("cancel")}
                </Btn>
                <Btn
                  variant="danger"
                  size="sm"
                  onClick={handleLogoutConfirm}
                  className="gap-1.5"
                >
                  <LogOut className="size-3.5" />
                  <span>{t("logout")}</span>
                </Btn>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Screen Overlay with 1-Click Demo Accounts */}
      {!isAuthenticated && (
        <LoginOverlay
          onLoginSuccess={() => {
            setAuthenticated(true);
          }}
        />
      )}

      {/* Realtime Online Users & Presence Dossier Modal */}
      <OnlineUsersModal
        open={isOnlineModalOpen}
        onClose={() => setIsOnlineModalOpen(false)}
        onlineUsers={onlineUsers}
        onSwitchUser={() => setIsUserMenuOpen(true)}
      />
    </div>
  );
}
