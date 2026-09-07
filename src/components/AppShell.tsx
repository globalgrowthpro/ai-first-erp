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
} from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/ai-first-erp-logo.png.asset.json";

const erpNav = [
  { to: "/", key: "nav_dashboard", icon: LayoutDashboard },
  { to: "/ai", key: "nav_ai", icon: Sparkles },
  { to: "/sales", key: "nav_sales", icon: ReceiptText },
  { to: "/purchases", key: "nav_purchases", icon: ShoppingCart },
  { to: "/accounting", key: "nav_accounting", icon: Calculator },
  { to: "/inventory", key: "nav_inventory", icon: Boxes },
  { to: "/partners", key: "nav_partners", icon: Users },
] as const;

const controlNav = [
  { to: "/reports", key: "nav_reports", icon: BarChart3 },
  { to: "/audit", key: "nav_audit", icon: ScrollText },
  { to: "/settings", key: "nav_settings", icon: ShieldCheck },
] as const;

function NavList({ items, label }: { items: typeof erpNav | typeof controlNav; label: string }) {
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
  const { t, toggle, lang } = useI18n();

  return (
    <div className="flex min-h-screen bg-secondary">
      <aside className="gradient-ink sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e-2 border-ink p-4 lg:flex">
        <Link to="/" className="block px-1" aria-label={t("appName")}>
          <img
            src={logoAsset.url}
            alt={t("appName")}
            className="h-auto w-full object-contain"
          />
        </Link>

        <div className="mt-4 flex-1 overflow-y-auto">
          <NavList items={erpNav} label={t("group_erp")} />
          <NavList items={controlNav} label={t("group_control")} />
        </div>

        <div className="rounded-md border border-ink-foreground/20 bg-ink-foreground/5 p-3">
          <p className="text-xs font-bold text-ink-foreground">{t("company")}</p>
          <p className="text-[11px] text-ink-foreground/55">{t("role_manager")}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b-2 border-ink bg-card px-4 py-3">
          <Link to="/" className="w-32 shrink-0 lg:hidden" aria-label={t("appName")}>
            <img
              src={logoAsset.url}
              alt={t("appName")}
              className="h-9 w-full object-contain"
            />
          </Link>
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border-2 border-ink bg-secondary px-3 py-1.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              placeholder={t("search")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            onClick={toggle}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-card px-3 py-1.5 text-xs font-bold uppercase hover:bg-secondary"
          >
            <Languages className="size-4" />
            {t("lang")}
          </button>
          <Link
            to="/ai"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]",
            )}
          >
            <Sparkles className="size-4" />
            {t("askAi")}
          </Link>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b-2 border-ink bg-ink px-2 py-2 lg:hidden">
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

        <main key={lang} className="flex-1 space-y-6 p-4 md:p-6">
          {children}
        </main>

        <footer className="border-t-2 border-ink bg-card px-6 py-4 text-xs text-muted-foreground">
          {t("demoNote")} · Hafez Rahim · +20 100 741 9344
        </footer>
      </div>
    </div>
  );
}
