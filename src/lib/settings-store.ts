import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompanySettings {
  nameAr: string;
  nameEn: string;
  taxNumber: string;
  commercialRegister: string;
  phone: string;
  email: string;
  website: string;
  addressAr: string;
  addressEn: string;
  currency: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  headerTitleAr: string;
  headerTitleEn: string;
  invoiceSubtitleAr: string;
  invoiceSubtitleEn: string;
  billSubtitleAr: string;
  billSubtitleEn: string;
  headerLayout: "logo-start" | "logo-end" | "centered";
  showTaxQr: boolean;
  showSignature: boolean;
  footerNotesAr: string;
  footerNotesEn: string;
  bankDetailsAr: string;
  bankDetailsEn: string;
}

export interface ThemePreset {
  id: string;
  name: { ar: string; en: string };
  primary: string;
  accent: string;
}

export const WAZEER_PALETTE = [
  { name: { ar: "كحلي بنفسجي (اللون الرئيسي)", en: "Navy Purple (Main)" }, hex: "#2E1A6B", role: "primary" },
  { name: { ar: "أحمر كرزي (لون التمييز)", en: "Red (Accent)" }, hex: "#E11D2E", role: "accent" },
  { name: { ar: "أخضر ورقي (فرعي)", en: "Green (Leaf Accent)" }, hex: "#16A34A", role: "secondary" },
  { name: { ar: "أصفر برّاق (فرعي)", en: "Yellow (Sparkle Accent)" }, hex: "#FBBF24", role: "accent" },
  { name: { ar: "أسود داكن (تفاصيل)", en: "Dark Black (Detail)" }, hex: "#0F172A", role: "detail" },
  { name: { ar: "رمادي فاتح (خلفية ودعم)", en: "Light Gray (Background)" }, hex: "#F3F4F6", role: "background" },
];

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "wazeer-brand",
    name: { ar: "وزير الحلو (الهوية الرسمية)", en: "Wazeer El-Helw (Official)" },
    primary: "#2E1A6B",
    accent: "#E11D2E",
  },
  {
    id: "wazeer-sparkle",
    name: { ar: "وزير الحلو (بنفسجي وأصفر)", en: "Wazeer (Purple & Sparkle Gold)" },
    primary: "#2E1A6B",
    accent: "#FBBF24",
  },
  {
    id: "wazeer-leaf",
    name: { ar: "وزير الحلو (بنفسجي وأخضر)", en: "Wazeer (Purple & Leaf Green)" },
    primary: "#2E1A6B",
    accent: "#16A34A",
  },
  {
    id: "nile-crimson",
    name: { ar: "النيل كلاسيك (قرمزي وذهبي)", en: "Nile Classic (Crimson & Gold)" },
    primary: "#D10056",
    accent: "#FFB900",
  },
  {
    id: "emerald-corp",
    name: { ar: "زمردي مؤسسي (أخضر وزمرد)", en: "Emerald Corporate (Deep Green)" },
    primary: "#047857",
    accent: "#10B981",
  },
  {
    id: "royal-blue",
    name: { ar: "أزرق ملكي (كحلي وسماوي)", en: "Royal Indigo (Navy & Electric Blue)" },
    primary: "#1E40AF",
    accent: "#3B82F6",
  },
];

export const DEFAULT_SETTINGS: CompanySettings = {
  nameAr: "شركة وزير الحلو للحلويات والمواد الغذائية",
  nameEn: "Wazeer El-Helw Sweets & Food Industries",
  taxNumber: "492-810-339",
  commercialRegister: "198420",
  phone: "+20 100 741 9344",
  email: "info@odooteams.com",
  website: "www.odooteams.com",
  addressAr: "المبنى الإداري 4، المنطقة الاستثمارية، القاهرة، مصر",
  addressEn: "Admin Bldg 4, Investment Zone, Cairo, Egypt",
  currency: "EGP",
  logoUrl: "/wazeer-emblem.png",
  primaryColor: "#2E1A6B",
  accentColor: "#E11D2E",
  headerTitleAr: "فاتورة ضريبية رسمية",
  headerTitleEn: "Official Tax Invoice",
  invoiceSubtitleAr: "فاتورة مبيعات معتمدة — شركة وزير الحلو",
  invoiceSubtitleEn: "Certified Sales Invoice — Wazeer El-Helw",
  billSubtitleAr: "فاتورة مشتريات وأمر استلام مخزني",
  billSubtitleEn: "Vendor Bill & Stock Inward Receipt",
  headerLayout: "logo-start",
  showTaxQr: true,
  showSignature: true,
  footerNotesAr: "منتجات وزير الحلو تخضع لأعلى معايير الجودة وسلامة الغذاء. الاستبدال والاسترجاع وفق الشروط المعتمدة.",
  footerNotesEn: "Wazeer El-Helw products comply with premier quality and food safety standards.",
  bankDetailsAr: "البنك التجاري الدولي (CIB) — حساب: 1000-8492-3312 — IBAN: EG3800000100084923312000",
  bankDetailsEn: "CIB Commercial Bank — Acc: 1000-8492-3312 — IBAN: EG3800000100084923312000",
};

let globalSettings: CompanySettings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    l();
  }
}

export function useCompanySettings() {
  const [settings, setSettingsState] = useState<CompanySettings>(globalSettings);

  useEffect(() => {
    const handleUpdate = () => {
      setSettingsState(globalSettings);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data } = (await supabase.from('company_settings').select('*').limit(1).maybeSingle()) as { data: any };
    if (data) {
      globalSettings = {
        ...DEFAULT_SETTINGS,
        nameAr: data.name_ar,
        nameEn: data.name_en,
        taxNumber: data.tax_number || '',
        commercialRegister: data.commercial_register || '',
        phone: data.phone || '',
        email: data.email || '',
        website: (data as any).website || '',
        addressAr: data.address_ar || '',
        addressEn: data.address_en || '',
        currency: data.currency || 'EGP',
        logoUrl: data.logo_url || '/wazeer-emblem.png',
        ...((data as any).branding || {})
      };
      emit();
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<CompanySettings>) => {
    const merged = { ...globalSettings, ...newSettings };
    globalSettings = merged;
    emit();

    const { data: existing } = (await supabase.from('company_settings').select('id').limit(1).maybeSingle()) as { data: any };
    
    const dbPayload = {
      name_ar: merged.nameAr,
      name_en: merged.nameEn,
      tax_number: merged.taxNumber,
      commercial_register: merged.commercialRegister,
      phone: merged.phone,
      email: merged.email,
      address_ar: merged.addressAr,
      address_en: merged.addressEn,
      currency: merged.currency,
      logo_url: merged.logoUrl,
      website: merged.website,
      branding: {
        primaryColor: merged.primaryColor,
        accentColor: merged.accentColor,
        headerTitleAr: merged.headerTitleAr,
        headerTitleEn: merged.headerTitleEn,
        invoiceSubtitleAr: merged.invoiceSubtitleAr,
        invoiceSubtitleEn: merged.invoiceSubtitleEn,
        billSubtitleAr: merged.billSubtitleAr,
        billSubtitleEn: merged.billSubtitleEn,
        headerLayout: merged.headerLayout,
        showTaxQr: merged.showTaxQr,
        showSignature: merged.showSignature,
        footerNotesAr: merged.footerNotesAr,
        footerNotesEn: merged.footerNotesEn,
        bankDetailsAr: merged.bankDetailsAr,
        bankDetailsEn: merged.bankDetailsEn,
      } as any
    };

    if (existing?.id) {
      await supabase.from('company_settings').update(dbPayload as any).eq('id', existing.id);
    } else {
      await supabase.from('company_settings').insert({
        ...dbPayload,
        fiscal_year_start: new Date().toISOString()
      } as any);
    }
  };

  const resetSettings = () => {
    updateSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
