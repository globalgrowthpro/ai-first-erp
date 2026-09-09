import { useState, useRef } from "react";
import {
  Building2,
  Palette,
  FileSpreadsheet,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
  Layout,
  Receipt,
  FileCheck,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, Panel } from "@/components/kit";
import {
  useCompanySettings,
  THEME_PRESETS,
  type CompanySettings,
} from "@/lib/settings-store";
import { DocumentLivePreview } from "./DocumentLivePreview";
import { cn } from "@/lib/utils";

export function CompanyBrandingSettings() {
  const { t, pick, dir } = useI18n();
  const { settings, updateSettings, resetSettings } = useCompanySettings();
  const [formState, setFormState] = useState<CompanySettings>(settings);
  const [activeSection, setActiveSection] = useState<"company" | "colors" | "document" | "footer">("company");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if external update
  const handleChange = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => {
    const updated = { ...formState, [key]: value };
    setFormState(updated);
    updateSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      handleChange("logoUrl", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const applyPreset = (preset: typeof THEME_PRESETS[number]) => {
    const updated = {
      ...formState,
      primaryColor: preset.primary,
      accentColor: preset.accent,
    };
    setFormState(updated);
    updateSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = () => {
    if (confirm(pick("هل تريد استعادة الإعدادات الافتراضية؟", "Reset to default settings?"))) {
      resetSettings();
      // Force update local form state
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action status alert if saved */}
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/15 px-4 py-2.5 text-sm font-bold text-success shadow-sm">
          <Check className="size-4" />
          <span>{t("settingsSaved")}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Settings Configuration Editor (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Sub-Navigation Pills for Settings */}
          <div className="flex flex-wrap gap-2 border-b border-border/70 pb-3 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveSection("company")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 uppercase transition-all",
                activeSection === "company"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:bg-secondary",
              )}
            >
              <Building2 className="size-3.5" />
              {t("companyProfile")}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("colors")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 uppercase transition-all",
                activeSection === "colors"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:bg-secondary",
              )}
            >
              <Palette className="size-3.5" />
              {t("colorPalette")}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("document")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 uppercase transition-all",
                activeSection === "document"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:bg-secondary",
              )}
            >
              <FileSpreadsheet className="size-3.5" />
              {t("documentBranding")}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("footer")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 uppercase transition-all",
                activeSection === "footer"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:bg-secondary",
              )}
            >
              <FileCheck className="size-3.5" />
              {t("footerNotes")}
            </button>
          </div>

          {/* Section 1: Company Profile */}
          {activeSection === "company" && (
            <Panel title={t("companyProfile")}>
              <div className="space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("companyNameAr")} *
                    </label>
                    <input
                      type="text"
                      value={formState.nameAr}
                      onChange={(e) => handleChange("nameAr", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("companyNameEn")} *
                    </label>
                    <input
                      type="text"
                      value={formState.nameEn}
                      onChange={(e) => handleChange("nameEn", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("commercialRegister")}
                    </label>
                    <input
                      type="text"
                      value={formState.commercialRegister}
                      onChange={(e) => handleChange("commercialRegister", e.target.value)}
                      placeholder="e.g. 198420"
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("taxNumber")}
                    </label>
                    <input
                      type="text"
                      value={formState.taxNumber}
                      onChange={(e) => handleChange("taxNumber", e.target.value)}
                      placeholder="e.g. 492-810-339"
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("phone")}
                    </label>
                    <input
                      type="text"
                      value={formState.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm num focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("email")}
                    </label>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("website")}
                    </label>
                    <input
                      type="text"
                      value={formState.website}
                      onChange={(e) => handleChange("website", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("addressAr")}
                    </label>
                    <input
                      type="text"
                      value={formState.addressAr}
                      onChange={(e) => handleChange("addressAr", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("addressEn")}
                    </label>
                    <input
                      type="text"
                      value={formState.addressEn}
                      onChange={(e) => handleChange("addressEn", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                    {pick("العملة الافتراضية", "Default Currency")}
                  </label>
                  <select
                    value={formState.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="EGP">EGP — Egyptian Pound (ج.م)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="SAR">SAR — Saudi Riyal (ر.س)</option>
                    <option value="AED">AED — UAE Dirham (د.إ)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                  </select>
                </div>
              </div>
            </Panel>
          )}

          {/* Section 2: Color Palette */}
          {activeSection === "colors" && (
            <Panel title={t("colorPalette")}>
              <div className="space-y-6">
                {/* Theme presets */}
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-2.5">
                    {t("themePresets")}
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-2.5 text-start text-xs font-bold transition-all",
                          formState.primaryColor === preset.primary
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border bg-card hover:bg-secondary/60",
                        )}
                      >
                        <span>{pick(preset.name.ar, preset.name.en)}</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-5 rounded-full border border-border shadow-sm"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <span
                            className="size-5 rounded-full border border-border shadow-sm"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Official Wazeer El-Helw Palette */}
                <div className="rounded-xl border border-border/70 bg-secondary/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-extrabold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-gold" />
                        {pick("ألوان هوية وزير الحلو المستخرجة من الشعار", "Official Wazeer El-Helw Brand Colors")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {pick("انقر لتعيين أي لون كلون رئيسي أو لون تمييز للمستندات والفواتير", "Click to set as primary brand or accent color")}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { nameAr: "كحلي بنفسجي (رئيسي)", nameEn: "Navy Purple (Main)", hex: "#2E1A6B" },
                      { nameAr: "أحمر كرزي (تمييز)", nameEn: "Red (Accent)", hex: "#E11D2E" },
                      { nameAr: "أخضر ورقي", nameEn: "Leaf Green", hex: "#16A34A" },
                      { nameAr: "أصفر برّاق", nameEn: "Sparkle Yellow", hex: "#FBBF24" },
                      { nameAr: "أسود داكن", nameEn: "Dark Black", hex: "#0F172A" },
                      { nameAr: "رمادي فاتح", nameEn: "Light Gray", hex: "#F3F4F6" },
                    ].map((c) => (
                      <div
                        key={c.hex}
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-6 rounded-md border border-border shadow-sm shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <div>
                            <p className="font-bold text-[11px] leading-tight">{pick(c.nameAr, c.nameEn)}</p>
                            <p className="font-mono text-[10px] text-muted-foreground uppercase">{c.hex}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title={pick("تعيين كرئيسي", "Set as Primary")}
                            onClick={() => handleChange("primaryColor", c.hex)}
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase transition-colors border",
                              formState.primaryColor === c.hex
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-foreground border-border hover:bg-muted",
                            )}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            title={pick("تعيين كتمييز", "Set as Accent")}
                            onClick={() => handleChange("accentColor", c.hex)}
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase transition-colors border",
                              formState.accentColor === c.hex
                                ? "bg-accent text-accent-foreground border-accent"
                                : "bg-secondary text-foreground border-border hover:bg-muted",
                            )}
                          >
                            A
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Color Pickers */}
                <div className="grid gap-4 sm:grid-cols-2 border-t border-border/70 pt-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("primaryColor")}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formState.primaryColor}
                        onChange={(e) => handleChange("primaryColor", e.target.value)}
                        className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={formState.primaryColor}
                        onChange={(e) => handleChange("primaryColor", e.target.value)}
                        className="w-28 rounded-lg border border-border bg-background px-3 py-1 text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("accentColor")}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formState.accentColor}
                        onChange={(e) => handleChange("accentColor", e.target.value)}
                        className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={formState.accentColor}
                        onChange={(e) => handleChange("accentColor", e.target.value)}
                        className="w-28 rounded-lg border border-border bg-background px-3 py-1 text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {/* Section 3: Document Layout & Logo */}
          {activeSection === "document" && (
            <Panel title={t("documentBranding")}>
              <div className="space-y-5 text-sm">
                {/* Logo Uploader & Pre-set choices */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase text-muted-foreground">
                      {t("companyLogo")}
                    </label>
                    <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border">
                      {pick("خاص بالشركة والفواتير — لا يؤثر على شعار النظام", "Company & document logo only")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => handleChange("logoUrl", "/wazeer-emblem.png")}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-2 text-xs font-bold transition-all",
                        formState.logoUrl === "/wazeer-emblem.png"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:bg-secondary/60",
                      )}
                    >
                      <img src="/wazeer-emblem.png" alt="Wazeer Emblem" className="h-8 w-auto object-contain" />
                      <span>{pick("شعار وزير الحلو (مفرغ)", "Wazeer Emblem")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange("logoUrl", "/wazeer-logo.png")}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-2 text-xs font-bold transition-all",
                        formState.logoUrl === "/wazeer-logo.png"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:bg-secondary/60",
                      )}
                    >
                      <img src="/wazeer-logo.png" alt="Wazeer Full" className="h-8 w-auto object-contain" />
                      <span>{pick("شعار وزير الحلو مع الباليت", "Wazeer + Palette")}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {formState.logoUrl ? (
                      <div className="rounded-xl border border-border/80 bg-card p-2 shadow-sm">
                        <img
                          src={formState.logoUrl}
                          alt="Company Logo"
                          className="h-12 max-w-[160px] object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-28 items-center justify-center rounded-xl border border-dashed border-border/80 text-xs font-bold text-muted-foreground">
                        {pick("لا يوجد شعار", "No logo")}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Btn
                        type="button"
                        variant="solid"
                        className="h-8 px-3 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="size-3.5" />
                        {t("uploadLogo")}
                      </Btn>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      {formState.logoUrl && (
                        <Btn
                          type="button"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => handleChange("logoUrl", "")}
                        >
                          {t("removeLogo")}
                        </Btn>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Layout alignment */}
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                    {t("headerLayout")}
                  </label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        { id: "logo-start", label: t("logoStart") },
                        { id: "logo-end", label: t("logoEnd") },
                        { id: "centered", label: t("logoCenter") },
                      ] as const
                    ).map((layout) => (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => handleChange("headerLayout", layout.id)}
                        className={cn(
                          "rounded-lg border p-2 text-center text-xs font-bold uppercase transition-all",
                          formState.headerLayout === layout.id
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card hover:bg-secondary text-foreground",
                        )}
                      >
                        {layout.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document Titles */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("headerTitleAr")}
                    </label>
                    <input
                      type="text"
                      value={formState.headerTitleAr}
                      onChange={(e) => handleChange("headerTitleAr", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("headerTitleEn")}
                    </label>
                    <input
                      type="text"
                      value={formState.headerTitleEn}
                      onChange={(e) => handleChange("headerTitleEn", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                {/* Subtitles */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("invoiceSubtitleAr")}
                    </label>
                    <input
                      type="text"
                      value={formState.invoiceSubtitleAr}
                      onChange={(e) => handleChange("invoiceSubtitleAr", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("invoiceSubtitleEn")}
                    </label>
                    <input
                      type="text"
                      value={formState.invoiceSubtitleEn}
                      onChange={(e) => handleChange("invoiceSubtitleEn", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                {/* Bill Subtitle */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("billSubtitleAr")}
                    </label>
                    <input
                      type="text"
                      value={formState.billSubtitleAr}
                      onChange={(e) => handleChange("billSubtitleAr", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {t("billSubtitleEn")}
                    </label>
                    <input
                      type="text"
                      value={formState.billSubtitleEn}
                      onChange={(e) => handleChange("billSubtitleEn", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-2 border-t border-border/70">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={formState.showTaxQr}
                      onChange={(e) => handleChange("showTaxQr", e.target.checked)}
                      className="size-4 accent-primary"
                    />
                    <span>{t("showTaxQr")}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={formState.showSignature}
                      onChange={(e) => handleChange("showSignature", e.target.checked)}
                      className="size-4 accent-primary"
                    />
                    <span>{t("showSignature")}</span>
                  </label>
                </div>
              </div>
            </Panel>
          )}

          {/* Section 4: Footer Notes & Bank Info */}
          {activeSection === "footer" && (
            <Panel title={t("footerNotes")}>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                    {pick("البيانات البنكية وطرق التحويل (عربي)", "Bank Information (Arabic)")}
                  </label>
                  <textarea
                    rows={2}
                    value={formState.bankDetailsAr}
                    onChange={(e) => handleChange("bankDetailsAr", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                    {pick("البيانات البنكية وطرق التحويل (إنجليزي)", "Bank Information (English)")}
                  </label>
                  <textarea
                    rows={2}
                    value={formState.bankDetailsEn}
                    onChange={(e) => handleChange("bankDetailsEn", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                    {t("footerNotesAr")}
                  </label>
                  <textarea
                    rows={2}
                    value={formState.footerNotesAr}
                    onChange={(e) => handleChange("footerNotesAr", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                    {t("footerNotesEn")}
                  </label>
                  <textarea
                    rows={2}
                    value={formState.footerNotesEn}
                    onChange={(e) => handleChange("footerNotesEn", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </Panel>
          )}

          {/* Reset button bar */}
          <div className="flex items-center justify-between pt-2">
            <Btn
              type="button"
              variant="outline"
              onClick={handleReset}
              className="text-xs"
            >
              <RotateCcw className="size-3.5" />
              {t("resetDefaults")}
            </Btn>

            <span className="text-xs text-muted-foreground font-semibold">
              {pick("التغييرات تُحفظ وتظهر فوراً في المعاينة", "Changes save and preview in real time")}
            </span>
          </div>
        </div>

        {/* Right Column: Live Document Preview (5 cols, sticky) */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-3">
          <Panel
            title={t("livePreview")}
            aside={
              <span className="inline-flex items-center gap-1 rounded bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success-foreground uppercase">
                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                {pick("تحديث فوري", "Real-time")}
              </span>
            }
          >
            <DocumentLivePreview settings={formState} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
