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
    <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-5">
      <div>
        <h1 className="text-3xl font-bold uppercase leading-none">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
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
        "surface-panel rounded-lg",
        tone === "ink" && "gradient-ink border-ink text-ink-foreground",
        tone === "brand" && "gradient-brand border-ink text-primary-foreground",
        className,
      )}
    >
      {title ? (
        <header
          className={cn(
            "flex items-center justify-between gap-3 border-b-2 px-5 py-3",
            tone === "plain" ? "border-ink/15" : "border-ink-foreground/25",
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
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost" | "gold" | "ink";
}) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border-2 border-ink px-4 py-2 text-sm font-bold uppercase tracking-wide transition-transform active:translate-y-px",
        variant === "solid" && "bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]",
        variant === "gold" && "bg-gold text-gold-foreground shadow-[3px_3px_0_0_var(--ink)]",
        variant === "ink" && "bg-ink text-ink-foreground",
        variant === "outline" && "bg-card text-foreground hover:bg-secondary",
        variant === "ghost" && "border-transparent bg-transparent hover:bg-secondary",
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
        "inline-block rounded-sm border border-ink px-2 py-0.5 text-[11px] font-bold uppercase",
        status === "paid" && "bg-success text-success-foreground",
        status === "partial" && "bg-gold text-gold-foreground",
        status === "overdue" && "bg-destructive text-destructive-foreground",
        status === "draft" && "bg-secondary text-secondary-foreground",
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
    <div className="surface-panel rounded-lg p-4">
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
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-ink text-start">
            {head.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-b border-border px-3 py-2.5", className)}>{children}</td>;
}
