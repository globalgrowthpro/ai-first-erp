import React from "react";
import {
  X,
  Users,
  Sparkles,
  Radio,
  ExternalLink,
  Laptop,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Store,
  Compass,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Btn } from "@/components/kit";
import type { OnlinePresenceUser } from "@/lib/presence-store";

interface OnlineUsersModalProps {
  open: boolean;
  onClose: () => void;
  onlineUsers: OnlinePresenceUser[];
  onSwitchUser?: () => void;
}

export function OnlineUsersModal({
  open,
  onClose,
  onlineUsers,
  onSwitchUser,
}: OnlineUsersModalProps) {
  const { lang, pick, dir } = useI18n();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/80 bg-secondary/60 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Radio className="size-4 animate-pulse text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-foreground uppercase tracking-tight">
                  {lang === "ar" ? "المستخدمون المتصلون الآن" : "Active Online Users"}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {onlineUsers.length} {lang === "ar" ? "متصل" : "Online"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {lang === "ar"
                  ? "مزامنة لحظية عبر قنوات Supabase Realtime Presence"
                  : "Live heartbeat via Supabase Realtime Presence"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Online Users List */}
        <div className="p-4 space-y-2.5 max-h-[65vh] overflow-y-auto">
          {onlineUsers.map((user) => {
            const isMe = user.isCurrentUser;
            const isAi = user.isAiAgent;

            return (
              <div
                key={user.sessionId}
                className={cn(
                  "relative flex flex-col gap-2 rounded-xl border p-3 transition-all",
                  isMe
                    ? "border-primary/40 bg-primary/5 shadow-xs ring-1 ring-primary/20"
                    : isAi
                    ? "border-violet-500/30 bg-violet-500/5 shadow-xs"
                    : "border-border/70 bg-card hover:border-border"
                )}
              >
                {/* Top Row: Avatar + Name + Badges */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          "size-9 rounded-full bg-gradient-to-tr text-white flex items-center justify-center font-bold text-xs ring-2 shadow-xs",
                          user.avatarBg,
                          isMe ? "ring-primary" : "ring-border"
                        )}
                      >
                        {user.initials}
                      </div>
                      <span className="absolute bottom-0 end-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-foreground truncate">
                          {lang === "ar" ? user.name.ar : user.name.en}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded-md bg-primary text-primary-foreground text-[9px] font-bold">
                            {lang === "ar" ? "أنت (جلستك الحالية)" : "You (Active)"}
                          </span>
                        )}
                        {isAi && (
                          <span className="px-1.5 py-0.2 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[9px] font-bold inline-flex items-center gap-0.5">
                            <Sparkles className="size-2.5" />
                            {lang === "ar" ? "وكيل ذكي" : "AI Agent"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate mt-0.5">
                        <span>{lang === "ar" ? user.roleLabel.ar : user.roleLabel.en}</span>
                        {user.department && (
                          <>
                            <span>•</span>
                            <span>{lang === "ar" ? user.department.ar : user.department.en}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Device Tag */}
                  <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/80 font-mono bg-secondary/60 px-2 py-0.5 rounded-md shrink-0">
                    <Laptop className="size-3" />
                    <span>{user.deviceInfo}</span>
                  </div>
                </div>

                {/* Bottom Row: Current Screen & Activity */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px]">
                  <div className="flex items-center gap-1.5 text-foreground/85 font-semibold truncate">
                    <Compass className="size-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground font-normal">
                      {lang === "ar" ? "الموقع الحالي:" : "Current Screen:"}
                    </span>
                    <span className="text-primary truncate">
                      {lang === "ar" ? user.currentPathName.ar : user.currentPathName.en}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 font-mono">
                      ({user.currentPath})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold shrink-0">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{lang === "ar" ? "متصل الآن" : "Active"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <footer className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/80 bg-secondary/30 px-5 py-3">
          <div className="flex items-center gap-2">
            <a
              href="/pos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <Store className="size-3.5" />
              <span>{lang === "ar" ? "فتح نافذة كاشير أخرى (POS)" : "Open POS Terminal Tab"}</span>
              <ExternalLink className="size-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchUser && (
              <Btn
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onSwitchUser();
                }}
                className="text-xs"
              >
                {lang === "ar" ? "تبديل المستخدم" : "Switch Account"}
              </Btn>
            )}
            <Btn variant="solid" size="sm" onClick={onClose} className="text-xs">
              {lang === "ar" ? "إغلاق" : "Close"}
            </Btn>
          </div>
        </footer>
      </div>
    </div>
  );
}
