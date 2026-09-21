import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold uppercase leading-none tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  aside,
  className,
  children,
  tone = "plain",
}: {
  title?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
  tone?: "plain" | "ink" | "brand";
}) {
  return (
    <section
      className={cn(
        "surface-panel rounded-xl overflow-hidden",
        tone === "ink" && "gradient-ink text-ink-foreground shadow-md",
        tone === "brand" && "gradient-brand text-primary-foreground shadow-md",
        className,
      )}
    >
      {title ? (
        <header
          className={cn(
            "flex items-center justify-between gap-3 border-b px-5 py-3.5",
            tone === "plain" ? "border-border/60 bg-card" : "border-ink-foreground/20",
          )}
        >
          <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
          {aside}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Btn({
  children,
  variant = "solid",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost" | "gold" | "ink" | "primary" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg font-bold uppercase tracking-wide transition-all shadow-sm active:translate-y-px",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-5 py-2.5 text-base",
        (variant === "solid" || variant === "primary") && "bg-primary text-primary-foreground hover:opacity-95 shadow-primary/20",
        variant === "danger" && "bg-destructive text-destructive-foreground hover:opacity-95 shadow-destructive/20",
        variant === "gold" && "bg-gold text-gold-foreground hover:opacity-95",
        variant === "ink" && "bg-ink text-ink-foreground hover:opacity-95",
        variant === "outline" && "bg-card text-foreground border border-border hover:bg-secondary",
        variant === "ghost" && "bg-transparent hover:bg-secondary shadow-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StatusPill({ status }: { status: "paid" | "partial" | "overdue" | "draft" }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase",
        status === "paid" && "bg-success/15 text-success font-bold",
        status === "partial" && "bg-gold/20 text-gold-foreground font-bold",
        status === "overdue" && "bg-destructive/15 text-destructive font-bold",
        status === "draft" && "bg-secondary text-muted-foreground font-semibold",
      )}
    >
      {t(status)}
    </span>
  );
}

export type KpiColor =
  | "rose"
  | "blue"
  | "amber"
  | "emerald"
  | "indigo"
  | "purple"
  | "cyan"
  | "orange"
  | "fuchsia"
  | "teal"
  | "lime"
  | "violet"
  | "sky"
  | "yellow"
  | "slate";

const KPI_COLOR_MAP: Record<KpiColor, { bg: string; bar: string; label: string }> = {
  rose: {
    bg: "bg-gradient-to-r from-pink-500 via-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  blue: {
    bg: "bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 text-white shadow-md shadow-blue-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  amber: {
    bg: "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md shadow-amber-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  emerald: {
    bg: "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  indigo: {
    bg: "bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  purple: {
    bg: "bg-gradient-to-r from-purple-500 via-violet-600 to-purple-600 text-white shadow-md shadow-purple-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  cyan: {
    bg: "bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-600 text-white shadow-md shadow-cyan-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  orange: {
    bg: "bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  fuchsia: {
    bg: "bg-gradient-to-r from-fuchsia-500 via-pink-600 to-rose-500 text-white shadow-md shadow-fuchsia-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  teal: {
    bg: "bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 text-white shadow-md shadow-teal-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  lime: {
    bg: "bg-gradient-to-r from-lime-500 via-green-500 to-emerald-600 text-white shadow-md shadow-lime-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  violet: {
    bg: "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  sky: {
    bg: "bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white shadow-md shadow-sky-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  yellow: {
    bg: "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white shadow-md shadow-amber-500/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
  slate: {
    bg: "bg-gradient-to-r from-slate-600 via-slate-700 to-zinc-800 text-white shadow-md shadow-slate-700/25 border-transparent",
    bar: "bg-white/80 shadow-xs shadow-white/50",
    label: "text-white/90 font-semibold",
  },
};

export function KpiCard({
  label,
  value,
  delta,
  accent = "brand",
  color,
  hideDelta = false,
  className,
}: {
  label: string;
  value: string;
  delta?: number;
  accent?: "brand" | "primary" | "gold" | "ink";
  color?: KpiColor;
  hideDelta?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const theme = color ? KPI_COLOR_MAP[color] : null;

  return (
    <div
      className={cn(
        "rounded-2xl p-4 sm:p-5 border transition-all hover:scale-[1.01] hover:shadow-lg",
        theme ? theme.bg : "surface-panel border-border/70",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {!theme && (
          <span
            className={cn(
              "h-4 w-1.5 rounded-full shrink-0",
              accent === "brand" && "bg-brand",
              accent === "primary" && "bg-primary",
              accent === "gold" && "bg-gold",
              accent === "ink" && "bg-ink"
            )}
          />
        )}
        <p
          className={cn(
            "text-[11px] font-bold uppercase tracking-wide truncate",
            theme ? theme.label : "text-muted-foreground"
          )}
        >
          {label}
        </p>
      </div>
      <p
        className={cn(
          "num mt-2.5 sm:mt-3 text-xl sm:text-2xl font-black tracking-tight",
          theme ? "text-white" : "text-foreground"
        )}
      >
        {value}
      </p>
      {typeof delta === "number" && !hideDelta ? (
        <p
          className={cn(
            "mt-1.5 text-xs font-semibold flex items-center gap-1.5",
            theme ? "text-white/90" : delta >= 0 ? "text-emerald-500" : "text-rose-500"
          )}
        >
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-md text-[11px] font-bold",
              theme
                ? "bg-white/20 text-white"
                : delta >= 0
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-rose-500/10 text-rose-600"
            )}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
          <span className={theme ? "text-white/75" : "text-muted-foreground"}>· {t("vsYesterday")}</span>
        </p>
      ) : null}
    </div>
  );
}

export function DataTable({
  head,
  columns,
  children,
}: {
  head?: string[];
  columns?: ({ header: string; className?: string } | { header: string })[];
  children: ReactNode;
}) {
  const headers = columns
    ? columns.map((col) => ({ title: col.header, className: "className" in col ? col.className : undefined }))
    : (head ?? []).map((h) => ({ title: h, className: undefined }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/80 text-start">
            {headers.map((h, i) => (
              <th
                key={i}
                className={cn(
                  "px-3 py-2.5 text-start text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80",
                  h.className
                )}
              >
                {h.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-3 py-3", className)}>{children}</td>;
}
