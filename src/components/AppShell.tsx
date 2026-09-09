import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Sparkles,
  ReceiptText,
  ShoppingCart,
  Calculator,
  Boxes,
  Users,
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
} from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useSidebarVisible } from "@/lib/ui-prefs";
import { useCompanySettings } from "@/lib/settings-store";
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
  { to: "/sales", key: "nav_sales", icon: ReceiptText },
  { to: "/purchases", key: "nav_purchases", icon: ShoppingCart },
  { to: "/accounting", key: "nav_accounting", icon: Calculator },
  { to: "/inventory", key: "nav_inventory", icon: Boxes },
  { to: "/manufacturing", key: "nav_manufacturing", icon: Factory },
  { to: "/partners", key: "nav_partners", icon: Users },
] as const;

const controlNav = [
  { to: "/reports", key: "nav_reports", icon: BarChart3 },
  { to: "/audit", key: "nav_audit", icon: ScrollText },
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
}: {
  items: typeof erpNav | typeof controlNav;
  label: string;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-6 first:mt-0">
      <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-foreground/45">
        {label}
      </p>
      <nav className="mt-2 space-y-1">
        {items.map(({ to, key, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:bg-ink-foreground/10 hover:text-ink-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
          >
            <Icon className="size-4 shrink-0" />
            <span>{t(key)}</span>
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

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS
  );
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

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
      setIsLogoutOpen(false);
      setIsLoggedOutSuccess(false);
    }, 1200);
  };

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    }
    if (isNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotifOpen]);

  return (
    <div className="flex min-h-screen bg-secondary">
      {/* Sidebar */}
      <aside
        className={cn(
          "gradient-ink sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-border/20 p-4",
          sidebarVisible && "lg:flex"
        )}
      >
        <Link to="/" className="block px-1" aria-label={companyName}>
          <div className="rounded-xl bg-white p-2 shadow-sm transition-transform hover:scale-[1.01]">
            <img
              src={companyLogo}
              alt={companyName}
              className="h-auto max-h-20 w-full object-contain"
            />
          </div>
        </Link>

        <div className="mt-4 flex-1 overflow-y-auto">
          <NavList items={erpNav} label={t("group_erp")} />
          <NavList items={controlNav} label={t("group_control")} />
        </div>

        <div className="rounded-lg border border-ink-foreground/15 bg-ink-foreground/5 p-3">
          <p className="text-xs font-bold text-ink-foreground">{companyName}</p>
          <p className="text-[11px] text-ink-foreground/55">{t("role_manager")}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex items-center gap-2.5 sm:gap-3 border-b border-border/70 bg-card/95 backdrop-blur px-4 py-3">
          <Link
            to="/"
            className="w-32 shrink-0 lg:hidden"
            aria-label={companyName}
          >
            <img
              src={companyLogo}
              alt={companyName}
              className="h-9 w-full object-contain"
            />
          </Link>

          {/* Sidebar toggle */}
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
            className="hidden lg:inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {sidebarVisible ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeft className="size-4" />
            )}
          </button>

          {/* Search Bar */}
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/80 bg-secondary/50 px-3.5 py-1.5 focus-within:border-primary focus-within:bg-card transition-colors">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              placeholder={t("search")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>

          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={notifDropdownRef}>
            <button
              onClick={() => setIsNotifOpen((prev) => !prev)}
              title={t("notifications")}
              aria-label={t("notifications")}
              className={cn(
                "relative inline-flex items-center justify-center size-9 rounded-lg border transition-colors",
                isNotifOpen
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-card animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {isNotifOpen && (
              <div
                className={cn(
                  "absolute top-full mt-2 w-80 sm:w-96 rounded-xl border border-border/70 bg-card p-3 shadow-xl z-50 text-xs",
                  dir === "rtl" ? "left-0" : "right-0"
                )}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Bell className="size-3.5 text-primary" />
                    <span>{t("notifications")}</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-mono">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-medium text-primary hover:underline"
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
                          "p-2.5 rounded-lg border transition-colors cursor-pointer space-y-1",
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

          {/* Language Switcher */}
          <button
            onClick={toggle}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold uppercase hover:bg-secondary transition-colors"
          >
            <Languages className="size-4" />
            <span>{t("lang")}</span>
          </button>

          {/* Ask AI Button */}
          <Link
            to="/ai"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold uppercase text-primary-foreground shadow-sm hover:opacity-95 transition-all"
            )}
          >
            <Sparkles className="size-4" />
            <span>{t("askAi")}</span>
          </Link>

          {/* Logout Icon Button */}
          <button
            onClick={() => setIsLogoutOpen(true)}
            className="inline-flex items-center justify-center size-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
            title={t("logout")}
            aria-label={t("logout")}
          >
            <LogOut className="size-4" />
          </button>
        </header>

        {/* Mobile Navigation */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border/40 bg-ink px-2 py-2 lg:hidden">
          {[...erpNav, ...controlNav].map(({ to, key }) => (
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

        {/* Page Main Content */}
        <main key={lang} className="flex-1 space-y-6 p-4 md:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card px-6 py-4 text-xs text-muted-foreground">
          {t("demoNote")} · Hafez Rahim · +20 100 741 9344
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
    </div>
  );
}
