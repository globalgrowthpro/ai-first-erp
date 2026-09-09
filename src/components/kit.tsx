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

export function KpiCard({
  label,
  value,
  delta,
  accent = "brand",
}: {
  label: string;
  value: string;
  delta?: number;
  accent?: "brand" | "primary" | "gold" | "ink";
}) {
  const { t } = useI18n();
  return (
    <div className="surface-panel rounded-xl p-5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-4 w-1.5 rounded-sm",
            accent === "brand" && "bg-brand",
            accent === "primary" && "bg-primary",
            accent === "gold" && "bg-gold",
            accent === "ink" && "bg-ink",
          )}
        />
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="num mt-3 text-2xl font-bold">{value}</p>
      {typeof delta === "number" ? (
        <p
          className={cn(
            "mt-1 text-xs font-semibold",
            delta >= 0 ? "text-success" : "text-destructive",
          )}
        >
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% · {t("vsYesterday")}
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
