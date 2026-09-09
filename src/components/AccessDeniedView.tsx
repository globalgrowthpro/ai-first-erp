import React from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft, ArrowRight, Lock, UserCheck } from "lucide-react";
import { type DemoUser } from "@/lib/auth-store";

interface AccessDeniedViewProps {
  currentUser: DemoUser;
  targetPath: string;
  fallbackPath: string;
  lang: "ar" | "en";
}

export function AccessDeniedView({
  currentUser,
  targetPath,
  fallbackPath,
  lang,
}: AccessDeniedViewProps) {
  const isRtl = lang === "ar";
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="flex min-h-[55vh] items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-card p-6 md:p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Shield Icon Badge */}
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-inner">
          <ShieldAlert className="size-8" />
        </div>

        {/* Header & Status */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <Lock className="size-3.5" />
            <span>403 · {isRtl ? "غير مصرح به" : "Access Restricted"}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            {isRtl
              ? "عفواً، ليس لديك صلاحية للوصول إلى هذا المسار"
              : "Access Denied: Restricted Module"}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            {isRtl ? (
              <>
                حسابك الحالي (<strong className="text-foreground">{currentUser.name.ar}</strong> —{" "}
                <span className="text-primary font-medium">{currentUser.roleLabel.ar}</span>) لا يمتلك
                صلاحية للوصول إلى الرابط{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-foreground font-semibold">
                  {targetPath}
                </code>
                .
              </>
            ) : (
              <>
                Your current account (<strong className="text-foreground">{currentUser.name.en}</strong> —{" "}
                <span className="text-primary font-medium">{currentUser.roleLabel.en}</span>) is not
                authorized to view{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-foreground font-semibold">
                  {targetPath}
                </code>
                .
              </>
            )}
          </p>
        </div>

        {/* Allowed Modules Preview */}
        <div className="rounded-xl border border-border/60 bg-secondary/40 p-3.5 text-start text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <UserCheck className="size-4 text-emerald-500" />
            <span>
              {isRtl
                ? `الصفحات المصرح بها لدور (${currentUser.roleLabel.ar}):`
                : `Authorized modules for (${currentUser.roleLabel.en}):`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {currentUser.allowedPages.map((page) => (
              <span
                key={page}
                className="px-2 py-0.5 rounded-md bg-card border border-border/80 font-mono text-[11px] text-muted-foreground"
              >
                {page === "/" ? "/ (Dashboard)" : page}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            to={fallbackPath}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
          >
            <span>
              {isRtl
                ? "العودة إلى لوحة التحكم المصرح بها"
                : "Return to Authorized Dashboard"}
            </span>
            <Arrow className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
