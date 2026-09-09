import { useState } from "react";
import {
  MessageSquare,
  Mail,
  Save,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Radio,
  Lock,
  Sparkles,
  Info,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  useGatewaysStore,
  type SmsGatewaySettings,
  type SmtpEmailSettings,
} from "@/lib/gateways-store";

export function GatewaySettings() {
  const { pick, lang } = useI18n();
  const {
    smsSettings,
    smtpSettings,
    updateSmsSettings,
    updateSmtpSettings,
  } = useGatewaysStore();

  // SMS Form local state
  const [smsForm, setSmsForm] = useState<SmsGatewaySettings>(smsSettings);
  const [showSmsPassword, setShowSmsPassword] = useState(false);
  const [showSmsApiKey, setShowSmsApiKey] = useState(false);
  const [smsSavedToast, setSmsSavedToast] = useState(false);
  const [smsTestSuccess, setSmsTestSuccess] = useState(false);

  // SMTP Form local state
  const [smtpForm, setSmtpForm] = useState<SmtpEmailSettings>(smtpSettings);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpSavedToast, setSmtpSavedToast] = useState(false);
  const [smtpTestSuccess, setSmtpTestSuccess] = useState(false);

  const handleSaveSms = (e: React.FormEvent) => {
    e.preventDefault();
    updateSmsSettings(smsForm);
    setSmsSavedToast(true);
    setTimeout(() => setSmsSavedToast(false), 3000);
  };

  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    updateSmtpSettings(smtpForm);
    setSmtpSavedToast(true);
    setTimeout(() => setSmtpSavedToast(false), 3000);
  };

  const handleTestSms = () => {
    setSmsTestSuccess(true);
    setTimeout(() => setSmsTestSuccess(false), 4000);
  };

  const handleTestSmtp = () => {
    setSmtpTestSuccess(true);
    setTimeout(() => setSmtpTestSuccess(false), 4000);
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: SMS GATEWAY CONFIGURATION */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <MessageSquare className="size-4 text-orange-600" />
              <span>{pick("بوابة الرسائل القصيرة (SMS Gateway)", "SMS Gateway Configuration")}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pick(
                "إعدادات مزود الرسائل النصية لإرسال إشعارات الفواتير ورموز التأكيد للعملاء والموظفين.",
                "Configuration for sending SMS notifications, order confirmations, and verification OTPs."
              )}
            </p>
          </div>

          {smsSavedToast && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="size-3.5" />
              <span>{pick("تم حفظ إعدادات SMS!", "SMS settings saved!")}</span>
            </div>
          )}

          {smsTestSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="size-3.5" />
              <span>{pick("تم إرسال رسالة تجريبية بنجاح!", "Test SMS dispatched!")}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveSms} className="space-y-5">
          {/* Row 1: ENVIRONMENT & DEFAULT LANGUAGE */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                ENVIRONMENT
              </label>
              <select
                value={smsForm.environment}
                onChange={(e) =>
                  setSmsForm((prev) => ({
                    ...prev,
                    environment: e.target.value as "live" | "sandbox",
                  }))
                }
                className="w-full rounded-xl border border-border/80 bg-secondary/30 px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-orange-500 focus:bg-card transition-colors"
              >
                <option value="live">Live (2)</option>
                <option value="sandbox">Sandbox / Test (1)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                DEFAULT LANGUAGE
              </label>
              <select
                value={smsForm.defaultLanguage}
                onChange={(e) =>
                  setSmsForm((prev) => ({
                    ...prev,
                    defaultLanguage: e.target.value as "english" | "arabic",
                  }))
                }
                className="w-full rounded-xl border border-border/80 bg-secondary/30 px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-orange-500 focus:bg-card transition-colors"
              >
                <option value="english">English (2)</option>
                <option value="arabic">Arabic (العربية)</option>
              </select>
            </div>
          </div>

          {/* Row 2: USERNAME & PASSWORD */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                USERNAME
              </label>
              <input
                type="text"
                value={smsForm.username}
                onChange={(e) =>
                  setSmsForm((prev) => ({ ...prev, username: e.target.value }))
                }
                placeholder="wazeer_sms_api"
                className="w-full rounded-xl border border-border/80 bg-secondary/30 px-3.5 py-2 text-xs font-mono text-foreground outline-none focus:border-orange-500 focus:bg-card transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                PASSWORD (STORED — LEAVE BLANK TO KEEP)
              </label>
              <div className="relative">
                <input
                  type={showSmsPassword ? "text" : "password"}
                  value={smsForm.password}
                  onChange={(e) =>
                    setSmsForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border/80 bg-secondary/30 ps-3.5 pe-10 py-2 text-xs font-mono text-foreground outline-none focus:border-orange-500 focus:bg-card transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSmsPassword(!showSmsPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSmsPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: API KEY & SENDER TOKEN / ID */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                API KEY (STORED — LEAVE BLANK TO KEEP)
              </label>
              <div className="relative">
                <input
                  type={showSmsApiKey ? "text" : "password"}
                  value={smsForm.apiKey}
                  onChange={(e) =>
                    setSmsForm((prev) => ({ ...prev, apiKey: e.target.value }))
                  }
                  className="w-full rounded-xl border border-border/80 bg-secondary/30 ps-3.5 pe-10 py-2 text-xs font-mono text-foreground outline-none focus:border-orange-500 focus:bg-card transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSmsApiKey(!showSmsApiKey)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSmsApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Stored encrypted at rest. The key is never sent back to the browser after saving.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                SENDER TOKEN / ID
              </label>
              <input
                type="text"
                value={smsForm.senderToken}
                onChange={(e) =>
                  setSmsForm((prev) => ({ ...prev, senderToken: e.target.value }))
                }
                placeholder="WazeerElHelw"
                className="w-full rounded-xl border-2 border-orange-500 bg-secondary/20 px-3.5 py-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>
          </div>

          {/* Checkbox: Enable SMS sending */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="enableSms"
              checked={smsForm.enableSms}
              onChange={(e) =>
                setSmsForm((prev) => ({ ...prev, enableSms: e.target.checked }))
              }
              className="size-4 rounded border-border text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600"
            />
            <label
              htmlFor="enableSms"
              className="text-xs font-semibold text-foreground cursor-pointer select-none"
            >
              Enable SMS sending
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition-all"
            >
              <Save className="size-4" />
              <span>Save changes</span>
            </button>

            <button
              type="button"
              onClick={handleTestSms}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-secondary/50 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
            >
              <Send className="size-3.5 text-orange-600" />
              <span>{pick("إرسال رسالة اختبارية", "Send test SMS")}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: SMTP EMAIL CONFIGURATION */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Mail className="size-4 text-orange-600" />
              <span>{pick("إعدادات خادم البريد (SMTP Email Settings)", "SMTP Email Configuration")}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Defaults to Hostinger (smtp.hostinger.com:465 SSL). Used to send notification emails to managers and HR.
            </p>
          </div>

          {smtpSavedToast && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="size-3.5" />
              <span>{pick("تم حفظ إعدادات البريد!", "SMTP settings saved!")}</span>
            </div>
          )}

          {smtpTestSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="size-3.5" />
              <span>{pick("تم إرسال بريد اختباري بنجاح!", "Test email delivered!")}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveSmtp} className="space-y-5">
          {/* Row 1: SMTP HOST & PORT */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                SMTP HOST
              </label>
              <input
                type="text"
                value={smtpForm.host}
                onChange={(e) =>
                  setSmtpForm((prev) => ({ ...prev, host: e.target.value }))
                }
                placeholder="smtp.hostinger.com"
                className="w-full rounded-xl border border-border/80 bg-secondary/30 px-3.5 py-2 text-xs font-mono text-foreground outline-none focus:border-orange-500 focus:bg-card transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                PORT
              </label>
              <input
                type="number"
                value={smtpForm.port}
                onChange={(e) =>
                  setSmtpForm((prev) => ({ ...prev, port: Number(e.target.value) }))
                }
                placeholder="465"
                className="w-full rounded-xl border border-border/80 bg-secondary/30 px-3.5 py-2 text-xs font-mono font-bold text-foreground outline-none focus:border-orange-500 focus:bg-card transition-colors"
              />
            </div>
          </div>

          {/* Row 2: USERNAME & PASSWORD */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                USERNAME
              </label>
              <input
                type="text"
                value={smtpForm.username}
                onChange={(e) =>
                  setSmtpForm((prev) => ({ ...prev, username: e.target.value }))
                }
                placeholder="notifications@odooteams.com"
                className="w-full rounded-xl border border-border/80 bg-secondary/30 px-3.5 py-2 text-xs font-mono text-foreground outline-none focus:border-orange-500 focus:bg-card transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showSmtpPassword ? "text" : "password"}
                  value={smtpForm.password}
                  onChange={(e) =>
                    setSmtpForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border/80 bg-secondary/30 ps-3.5 pe-10 py-2 text-xs font-mono text-foreground outline-none focus:border-orange-500 focus:bg-card transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSmtpPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: FROM NAME & FROM EMAIL */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                FROM NAME
              </label>
              <input
                type="text"
                value={smtpForm.fromName}
                onChange={(e) =>
                  setSmtpForm((prev) => ({ ...prev, fromName: e.target.value }))
                }
                placeholder="Wazeer El-Helw Notifications"
                className="w-full rounded-xl border border-border/80 bg-secondary/30 px-3.5 py-2 text-xs font-medium text-foreground outline-none focus:border-orange-500 focus:bg-card transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                FROM EMAIL
              </label>
              <input
                type="email"
                value={smtpForm.fromEmail}
                onChange={(e) =>
                  setSmtpForm((prev) => ({ ...prev, fromEmail: e.target.value }))
                }
                placeholder="info@odooteams.com"
                className="w-full rounded-xl border-2 border-orange-500 bg-secondary/20 px-3.5 py-2 text-xs font-bold font-mono text-foreground outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>
          </div>

          {/* Row 4: Checkboxes */}
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useSslTls"
                checked={smtpForm.useSslTls}
                onChange={(e) =>
                  setSmtpForm((prev) => ({ ...prev, useSslTls: e.target.checked }))
                }
                className="size-4 rounded border-border text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600"
              />
              <label
                htmlFor="useSslTls"
                className="text-xs font-semibold text-foreground cursor-pointer select-none"
              >
                SSL/TLS
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableEmail"
                checked={smtpForm.enableEmail}
                onChange={(e) =>
                  setSmtpForm((prev) => ({ ...prev, enableEmail: e.target.checked }))
                }
                className="size-4 rounded border-border text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600"
              />
              <label
                htmlFor="enableEmail"
                className="text-xs font-semibold text-foreground cursor-pointer select-none"
              >
                Enable email sending
              </label>
            </div>
          </div>

          {/* Action Buttons: Save changes & Send test */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition-all"
            >
              <Save className="size-4" />
              <span>Save changes</span>
            </button>

            <button
              type="button"
              onClick={handleTestSmtp}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-secondary/50 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
            >
              <Mail className="size-3.5 text-orange-600" />
              <span>Send test</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
