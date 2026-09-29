import { useState, useEffect } from "react";
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
  Sparkles,
  KeyRound,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Store,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCompanySettings } from "@/lib/settings-store";
import { useAuthStore, POS_CASHIER_CREDENTIALS } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

interface LoginOverlayProps {
  onLoginSuccess?: () => void;
}

const SLIDER_IMAGES = [
  {
    src: "/wazeer.png",
    tag: { ar: "حلويات شرقية فاخرة", en: "Royal Confectionery" },
    title: {
      ar: "حلويات شرقية فاخرة وتراث مصري عريق",
      en: "Authentic Luxury Oriental Sweets & Heritage",
    },
    subtitle: {
      ar: "صناعة الحلويات الملكية بأجود خامات السمن البلدي والفستق الحلبي بإشراف كبار الشيفات.",
      en: "Crafting royal confectionery using pure baladi ghee and the finest pistachios under master chef supervision.",
    },
  },
  {
    src: "/wazeer1.png",
    tag: { ar: "تشكيلات الهدايا", en: "Gift Collections" },
    title: {
      ar: "علب المناسبات وضيافة الفنادق الراقية",
      en: "Luxury Event Boxes & Hotel Hospitality",
    },
    subtitle: {
      ar: "تغليف استثنائي وتشكيلات فاخرة تلبي كبرى المؤتمرات وحفلات الاستقبال في الجمهورية.",
      en: "Exquisite gift packaging and royal platters catering to prestigious hotels, banquets, and summits.",
    },
  },
  {
    src: "/wazeer2.png",
    tag: { ar: "المطبخ المركزي", en: "Central Factory" },
    title: {
      ar: "مطبخ مركزي ذكي بخطوط إنتاج مؤتمتة",
      en: "Automated Central Kitchen & Batch Precision",
    },
    subtitle: {
      ar: "تخطيط دقيق لجميع مراحل التصنيع (BOM) والتحكم الرقمي في درجات الخبز وأوزان العبوات.",
      en: "Real-time production recipes (BOM), automated ingredient distribution, and hygienic batch control.",
    },
  },
  {
    src: "/wazeer3.png",
    tag: { ar: "سلاسل الإمداد", en: "Cold Chain Supply" },
    title: {
      ar: "سلاسل إمداد مبردة ومستودعات مركزية",
      en: "Integrated Cold Hubs & Supply Chain Network",
    },
    subtitle: {
      ar: "مراقبة درجات الحرارة والأرصدة لحظة بلحظة مع تدوير المخزون (FIFO) بين المستودعات والفروع.",
      en: "Continuous cold-hub telemetry, FIFO stock rotation, and real-time automated branch replenishment.",
    },
  },
  {
    src: "/wazeer4.png",
    tag: { ar: "ذكاء تشغيلي", en: "AI Operating Layer" },
    title: {
      ar: "منظومة تخطيط الموارد المدعومة بالذكاء الاصطناعي",
      en: "AI-First Enterprise Resource Planning",
    },
    subtitle: {
      ar: "وكلاء تشغيليون متخصصون للمبيعات والمشتريات والمخازن لتحليل الطلب وأتمتة القرارات.",
      en: "Autonomous AI sentinels across sales, finance, and logistics providing predictive insights and decision support.",
    },
  },
  {
    src: "/wazeer5.png",
    tag: { ar: "انتشار الفروع", en: "Nationwide Reach" },
    title: {
      ar: "شبكة فروع واسعة وخدمة توريد متكاملة",
      en: "Extensive Branch Network & Daily Logistics",
    },
    subtitle: {
      ar: "ربط رقمي لحظي بين فروع الكوربة والمعادي والتجمع والساحل لتحديث المبيعات فورا.",
      en: "Instant point-of-sale synchronization across Korba, Maadi, New Cairo, and North Coast outlets.",
    },
  },
];

export function LoginOverlay({ onLoginSuccess }: LoginOverlayProps) {
  const { pick, dir, lang } = useI18n();
  const { settings } = useCompanySettings();
  const { loginAsync } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Slider state
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-slide every 5 seconds unless paused
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDER_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handleNext = () => {
    setActiveSlide((prev) => (prev + 1) % SLIDER_IMAGES.length);
  };

  const handlePrev = () => {
    setActiveSlide((prev) => (prev - 1 + SLIDER_IMAGES.length) % SLIDER_IMAGES.length);
  };

  const companyLogo = settings.logoUrl || "/wazeer-logo.png";
  const companyName = lang === "ar" ? settings.nameAr : settings.nameEn;

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await loginAsync(email, password);
    setLoading(false);
    if (ok) {
      onLoginSuccess?.();
    } else {
      setError(
        pick(
          "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
          "Invalid email or password."
        )
      );
    }
  };

  const currentSlide = SLIDER_IMAGES[activeSlide] ?? SLIDER_IMAGES[0]!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-3 sm:p-4 overflow-hidden select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      dir={dir}
    >
      {/* Expanded wide container (max-w-6xl on desktop, max-w-7xl on XL) - No scrollbar */}
      <div className="w-full max-w-6xl xl:max-w-7xl my-auto grid lg:grid-cols-12 rounded-3xl border border-border/50 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ============================================================ */}
        {/* Left Side (Desktop): Extended Image Slider Showcase (8 cols) */}
        {/* ============================================================ */}
        <div
          className="lg:col-span-7 xl:col-span-8 relative flex flex-col justify-between p-5 sm:p-7 text-white min-h-[300px] lg:min-h-[580px] overflow-hidden select-none bg-zinc-950"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Background Images Slider with object-contain */}
          {SLIDER_IMAGES.map((item, idx) => {
            const isActive = idx === activeSlide;
            return (
              <div
                key={item.src}
                className={cn(
                  "absolute inset-0 transition-opacity duration-1000 ease-in-out flex items-center justify-center",
                  isActive ? "opacity-100 z-0" : "opacity-0 -z-10 pointer-events-none"
                )}
              >
                {/* Subtle ambient blur of the same image */}
                <img
                  src={item.src}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110"
                />

                {/* Primary full image in contain format - uncropped */}
                <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10 lg:p-12 pb-24 sm:pb-28">
                  <img
                    src={item.src}
                    alt={pick(item.title.ar, item.title.en)}
                    className={cn(
                      "w-full h-full object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)] transition-all duration-700 ease-out",
                      isActive ? "scale-100 opacity-100" : "scale-95 opacity-0"
                    )}
                  />
                </div>

                {/* Dark Gradient Overlay for Maximum Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/40 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40 pointer-events-none" />
              </div>
            );
          })}

          {/* Top Bar: Slider Counter & Play/Pause */}
          <div className="relative z-10 flex items-center justify-end">
            <div className="flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 px-2.5 py-1 text-xs text-white shadow-lg">
              <span className="font-mono text-xs font-bold text-amber-400">0{activeSlide + 1}</span>
              <span className="text-white/40">/</span>
              <span className="font-mono text-xs text-white/60">0{SLIDER_IMAGES.length}</span>
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className="ms-1 p-0.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                title={isPaused ? pick("تشغيل العرض التلقائي", "Resume Autoplay") : pick("إيقاف مؤقت", "Pause Autoplay")}
              >
                {isPaused ? <Play className="size-3 fill-current" /> : <Pause className="size-3 fill-current" />}
              </button>
            </div>
          </div>

          {/* Middle/Bottom: Active Slide Caption & Navigation */}
          <div className="relative z-10 space-y-3 pt-6 sm:pt-12">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[11px] font-bold">
              <Sparkles className="size-2.5" />
              <span>{pick(currentSlide.tag.ar, currentSlide.tag.en)}</span>
            </div>

            {/* Slide Title & Subtitle */}
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                {pick(currentSlide.title.ar, currentSlide.title.en)}
              </h3>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-xl drop-shadow line-clamp-2 sm:line-clamp-none">
                {pick(currentSlide.subtitle.ar, currentSlide.subtitle.en)}
              </p>
            </div>

            {/* Navigation Dots & Arrow Buttons */}
            <div className="flex items-center justify-between pt-1">
              {/* Dots Indicator */}
              <div className="flex items-center gap-1.5">
                {SLIDER_IMAGES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                      idx === activeSlide
                        ? "w-7 bg-amber-400 shadow-sm"
                        : "w-2 bg-white/40 hover:bg-white/70"
                    )}
                    title={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Prev / Next Arrows */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="size-8 rounded-full bg-black/50 hover:bg-white/20 border border-white/25 text-white flex items-center justify-center backdrop-blur-md transition-colors shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                  title={pick("السابق", "Previous")}
                >
                  {dir === "rtl" ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="size-8 rounded-full bg-black/50 hover:bg-white/20 border border-white/25 text-white flex items-center justify-center backdrop-blur-md transition-colors shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                  title={pick("التالي", "Next")}
                >
                  {dir === "rtl" ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Developer Credit Footer */}
            <div className="pt-2.5 border-t border-white/15 flex items-center justify-between text-[10px] text-white/75">
              <a
                href="https://odooteams.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-white transition-colors group underline-offset-4 hover:underline"
                title="https://odooteams.com"
              >
                <span>Developer: Mr.Hafez Rahim</span>
                <ExternalLink className="size-2.5 text-white/70 group-hover:text-white transition-colors shrink-0" />
              </a>
              <span className="text-white/50 font-mono">Wazeer El-Helw ERP v1.0</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Right Side: Login Form & 1-Click Demo Accounts (Compact 4 cols) */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 xl:col-span-4 p-4 sm:p-5 space-y-2.5 bg-card flex flex-col justify-between">
          <div>
            {/* Form Header - Centered with Logo */}
            <div className="flex flex-col items-center text-center pb-1">
              <div className="mb-2 p-1.5 px-3 rounded-2xl bg-white shadow-xs border border-border/50 inline-flex items-center justify-center">
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="h-9 sm:h-10 w-auto max-w-[130px] object-contain"
                />
              </div>
              <h1 className="text-lg font-black text-foreground tracking-tight">
                {pick("تسجيل الدخول للنظام", "Sign In to ERP Workspace")}
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                {pick(
                  "أدخل بريدك الإلكتروني وكلمة المرور للدخول",
                  "Enter your credentials to securely access your workspace"
                )}
              </p>
            </div>

            {error && (
              <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Manual Form */}
            <form onSubmit={handleManualLogin} className="space-y-2.5 mt-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-0.5">
                  {pick("اسم المستخدم أو البريد الإلكتروني", "Username or Email")}
                </label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cashier@wazeer-elhelw.com"
                    className="w-full rounded-xl border border-border/80 bg-secondary/40 ps-8 pe-3 py-1.5 text-xs font-mono outline-none focus:border-primary focus:bg-card transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-0.5">
                  {pick("كلمة المرور", "Password")}
                </label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-border/80 bg-secondary/40 ps-8 pe-3 py-1.5 text-xs font-mono outline-none focus:border-primary focus:bg-card transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <KeyRound className="size-3.5" />
                <span>{loading ? pick("جاري التحقق...", "Signing in...") : pick("تسجيل الدخول", "Sign In")}</span>
              </button>
            </form>

            {/* Quick POS Cashier Credentials Card */}
            <div className="mt-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  <Store className="size-3.5" />
                  <span>{pick("حساب كاشير نقطة البيع (POS Only)", "POS Cashier Account (POS Only)")}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  {pick("وصول حصري للـ POS", "POS Screen Only")}
                </span>
              </div>
              <div className="text-[11px] space-y-1 text-muted-foreground bg-card/70 rounded-xl p-2 border border-border/60 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-sans text-muted-foreground/80">{pick("المستخدم:", "User:")}</span>
                  <span className="font-bold text-foreground">{POS_CASHIER_CREDENTIALS.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-sans text-muted-foreground/80">{pick("كلمة المرور:", "Pass:")}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{POS_CASHIER_CREDENTIALS.password}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail(POS_CASHIER_CREDENTIALS.email);
                  setPassword(POS_CASHIER_CREDENTIALS.password);
                }}
                className="w-full py-1.5 rounded-xl border border-emerald-500/40 bg-card text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="size-3" />
                <span>{pick("تعبئة بيانات الكاشير بنقرة واحدة", "Fill Cashier Credentials (1-Click)")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
