import { useState } from "react";
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  ChefHat,
  Calculator,
  Boxes,
  Building2,
  Check,
  ArrowRight,
  Sparkles,
  KeyRound,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCompanySettings } from "@/lib/settings-store";
import { useAuthStore, type DemoUser } from "@/lib/auth-store";

interface LoginOverlayProps {
  onLoginSuccess?: () => void;
}

export function LoginOverlay({ onLoginSuccess }: LoginOverlayProps) {
  const { pick, dir, lang } = useI18n();
  const { settings } = useCompanySettings();
  const { demoAccounts, login, loginAs } = useAuthStore();

  const [email, setEmail] = useState("admin@wazeer-elhelw.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const companyName = lang === "ar" ? settings.nameAr : settings.nameEn;
  const companyLogo = settings.logoUrl || "/wazeer-logo.png";

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ok = login(email, password);
    if (ok) {
      onLoginSuccess?.();
    } else {
      setError(
        pick(
          "البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى اختيار أحد الحسابات بالأسفل.",
          "Invalid email or password. Please choose one of the demo accounts below."
        )
      );
    }
  };

  const handleQuickDemoLogin = (account: DemoUser) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
    loginAs(account.id);
    onLoginSuccess?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 overflow-y-auto"
      dir={dir}
    >
      <div className="w-full max-w-4xl my-auto grid lg:grid-cols-12 rounded-3xl border border-border/40 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Left Side (Desktop): Branding & Graphic */}
        <div className="lg:col-span-5 gradient-ink p-8 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute -top-12 -start-12 size-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-12 -end-12 size-48 rounded-full bg-amber-500/20 blur-3xl" />

          <div className="relative z-10 space-y-6 flex flex-col items-center text-center">
            <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xl w-full max-w-[240px] flex items-center justify-center transition-transform hover:scale-105">
              <img
                src={companyLogo}
                alt={companyName}
                className="h-20 sm:h-24 w-auto object-contain"
              />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight">{companyName}</h2>
              <p className="text-xs text-white/75 mt-1.5 leading-relaxed max-w-xs mx-auto">
                {pick(
                  "نظام إدارة الموارد وتخطيط الإنتاج المدعوم بطبقة الذكاء الاصطناعي التشغيلي.",
                  "AI-First Enterprise Resource Planning & Confectionery Manufacturing."
                )}
              </p>
            </div>

            <div className="w-full space-y-2.5 pt-2 text-xs text-white/85 text-start">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-white/10 flex items-center justify-center text-amber-400">
                  <Sparkles className="size-3" />
                </div>
                <span>{pick("وكلاء ذكاء للمبيعات، المخزون، والرقابة", "Dedicated AI Operating Sentinels")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-white/10 flex items-center justify-center text-emerald-400">
                  <Check className="size-3" />
                </div>
                <span>{pick("مسار تشغيل 5 مراحل للمطبخ المركزي", "5-Stage Central Kitchen Manufacturing")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-white/10 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="size-3" />
                </div>
                <span>{pick("سجل تدقيق كامل مشفر ومصفحات أمنية", "Immutable Security & AI Audit Trail")}</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/15 text-[11px] text-white/80 flex items-center justify-between">
            <a
              href="https://odooteams.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors group underline-offset-4 hover:underline"
              title="https://odooteams.com"
            >
              <span>Developer: Mr.Hafez Rahim</span>
              <ExternalLink className="size-3 text-white/70 group-hover:text-white transition-colors shrink-0" />
            </a>
            <span className="text-white/40 text-[10px]">Hafez ERP</span>
          </div>
        </div>

        {/* Right Side: Login Form & 1-Click Demo Accounts */}
        <div className="lg:col-span-7 p-6 sm:p-8 space-y-6 bg-card">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {pick("تسجيل الدخول للنظام", "Sign In to ERP Workspace")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pick(
                "أدخل بيانات حسابك أو اختر أحد الحسابات التجريبية الجاهزة بالأسفل",
                "Enter your credentials or pick a demo account below"
              )}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleManualLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                {pick("البريد الإلكتروني", "Email Address")}
              </label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-secondary/40 ps-9 pe-3 py-2 text-xs font-mono outline-none focus:border-primary focus:bg-card transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                {pick("كلمة المرور", "Password")}
              </label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-secondary/40 ps-9 pe-3 py-2 text-xs font-mono outline-none focus:border-primary focus:bg-card transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
            >
              <KeyRound className="size-4" />
              <span>{loading ? pick("جاري التحقق...", "Signing in...") : pick("دخول", "Sign In")}</span>
            </button>
          </form>

          {/* Quick Demo Accounts List */}
          <div className="space-y-2.5 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-primary" />
                <span>{pick("الحسابات التجريبية الجاهزة (1-Click Demo Accounts)", "Ready Demo Accounts")}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                {pick("انقر على أي حساب للدخول الفوري", "Click any card to sign in")}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto pr-1">
              {demoAccounts.map((account) => {
                let RoleIcon = User;
                if (account.role === "admin") RoleIcon = ShieldCheck;
                if (account.role === "cfo") RoleIcon = Calculator;
                if (account.role === "kitchen") RoleIcon = ChefHat;
                if (account.role === "sales") RoleIcon = Building2;
                if (account.role === "warehouse") RoleIcon = Boxes;

                const isCurrent = email === account.email;

                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handleQuickDemoLogin(account)}
                    className={`group p-2.5 rounded-xl border text-start transition-all flex items-start gap-2.5 hover:shadow-md cursor-pointer ${
                      isCurrent
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border/70 bg-card hover:bg-secondary/70 hover:border-primary/50"
                    }`}
                  >
                    <div
                      className={`size-8 rounded-lg bg-gradient-to-tr ${account.avatarBg} text-white flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105`}
                    >
                      <RoleIcon className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {pick(account.name.ar, account.name.en)}
                        </p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                          {pick("دخول", "Login")}
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-primary truncate">
                        {pick(account.roleLabel.ar, account.roleLabel.en)}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                        {account.email}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
