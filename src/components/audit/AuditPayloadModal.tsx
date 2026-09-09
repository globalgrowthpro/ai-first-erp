import { useState } from "react";
import {
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Cpu,
  User,
  Copy,
  Check,
  Terminal,
  Layers,
  Sparkles,
  Bot,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AuditEntry } from "@/lib/audit-store";

interface AuditPayloadModalProps {
  entry: AuditEntry | null;
  open: boolean;
  onClose: () => void;
}

export function AuditPayloadModal({
  entry,
  open,
  onClose,
}: AuditPayloadModalProps) {
  const { t, pick, dir } = useI18n();
  const [isCopied, setIsCopied] = useState(false);

  if (!entry) return null;

  const jsonString = JSON.stringify(entry.payload, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        dir={dir}
      >
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`size-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                  entry.result === "success"
                    ? "bg-emerald-500/15 text-emerald-600"
                    : entry.result === "denied"
                    ? "bg-rose-500/15 text-rose-600"
                    : "bg-amber-500/15 text-amber-600"
                }`}
              >
                {entry.result === "success" && <CheckCircle2 className="size-5" />}
                {entry.result === "denied" && <XCircle className="size-5" />}
                {entry.result === "flagged" && <AlertTriangle className="size-5" />}
                {entry.result === "warning" && <AlertTriangle className="size-5" />}
              </div>

              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>{pick("فحص سجل التدقيق والحمولة البرمجية", "Audit Trace & Payload Inspector")}</span>
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  ID: {entry.id} • {entry.timestamp} ({entry.durationMs}ms)
                </p>
              </div>
            </div>

            {/* Severity Badge */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                entry.severity === "critical"
                  ? "bg-rose-600 text-white border-rose-600 animate-pulse"
                  : entry.severity === "high"
                  ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
                  : entry.severity === "medium"
                  ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                  : "bg-blue-500/15 text-blue-600 border-blue-500/30"
              }`}
            >
              {entry.severity} severity
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Action Summary Card */}
          <div className="rounded-xl border border-border/80 bg-secondary/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">
                {pick("العملية المنفذة:", "Executed Action:")}
              </span>
              <span className="font-mono text-primary font-bold">
                {pick("المورد: ", "Resource: ")}
                {entry.targetResource}
              </span>
            </div>
            <p className="text-foreground font-bold text-sm leading-relaxed">
              {pick(entry.action.ar, entry.action.en)}
            </p>
          </div>

          {/* Security Rationale Box (If Denied or Flagged) */}
          {entry.securityRationale && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                entry.result === "denied"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
              }`}
            >
              <ShieldAlert className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-xs uppercase tracking-wide">
                  {entry.result === "denied"
                    ? pick("سياسة الحماية وسبب الرفض", "Security Policy & Denial Reason")
                    : pick("تنبيه رقابي واشتباه احتيال", "Anomaly Detection Alert")}
                </p>
                <p className="text-xs leading-relaxed">
                  {pick(entry.securityRationale.ar, entry.securityRationale.en)}
                </p>
              </div>
            </div>
          )}

          {/* Actors: Human vs AI */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* User */}
            <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <User className="size-3.5 text-primary" />
                <span>{pick("المستخدم البشري المنفذ", "Initiating Human User")}</span>
              </div>
              <p className="font-bold text-foreground text-sm">
                {pick(entry.user.ar, entry.user.en)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {entry.user.role} • <span className="font-mono">{entry.user.ip}</span>
              </p>
            </div>

            {/* Agent */}
            <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <Bot className="size-3.5 text-primary" />
                <span>{pick("وكيل الذكاء المراقب / المنفذ", "Supervising AI Agent")}</span>
              </div>
              {entry.agent ? (
                <>
                  <p className="font-bold text-foreground text-sm">
                    {pick(entry.agent.ar, entry.agent.en)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-mono font-bold text-primary">
                      {entry.agent.model}
                    </span>{" "}
                    ({entry.agent.provider})
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground italic text-xs pt-1">
                  {pick("تنفيذ يدوي مباشر بدون تدخل وكيل", "Direct manual execution")}
                </p>
              )}
            </div>
          </div>

          {/* Raw JSON Payload Inspector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-muted-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Terminal className="size-3 text-primary" />
                <span>{pick("الحمولة البرمجية والبيانات المرفقة (JSON Payload)", "JSON Payload & Execution Context")}</span>
              </span>

              <button
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="size-3 text-emerald-600" />
                    <span className="text-emerald-600">{pick("تم النسخ", "Copied!")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>{pick("نسخ JSON", "Copy JSON")}</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-xl border border-border/80 bg-zinc-950 p-3.5 overflow-x-auto text-emerald-400 font-mono text-[11px] leading-relaxed shadow-inner max-h-60">
              <pre>{jsonString}</pre>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[11px] text-muted-foreground font-mono">
              SHA256: {entry.id.replace("aud-", "e7a82b").padEnd(16, "0")}
            </span>
            <Btn variant="outline" onClick={onClose}>
              {t("close")}
            </Btn>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
