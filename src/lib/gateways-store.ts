import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SmsGatewaySettings {
  environment: "live" | "sandbox";
  defaultLanguage: "english" | "arabic";
  username: string;
  password: string;
  apiKey: string;
  senderToken: string;
  enableSms: boolean;
}

export interface SmtpEmailSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  useSslTls: boolean;
  enableEmail: boolean;
}

export const DEFAULT_SMS_SETTINGS: SmsGatewaySettings = {
  environment: "live",
  defaultLanguage: "english",
  username: "wazeer_sms_gateway",
  password: "",
  apiKey: "",
  senderToken: "WazeerElHelw",
  enableSms: true,
};

export const DEFAULT_SMTP_SETTINGS: SmtpEmailSettings = {
  host: "smtp.hostinger.com",
  port: 465,
  username: "notifications@odooteams.com",
  password: "",
  fromName: "وزير الحلو — نظام ERP الذكي",
  fromEmail: "info@odooteams.com",
  useSslTls: true,
  enableEmail: true,
};

export function useGatewaysStore() {
  const [smsSettings, setSmsSettings] = useState<SmsGatewaySettings>(DEFAULT_SMS_SETTINGS);
  const [smtpSettings, setSmtpSettings] = useState<SmtpEmailSettings>(DEFAULT_SMTP_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = (await supabase.from('gateway_settings' as any).select('*')) as { data: any[] | null };
    if (data) {
      const sms = data.find(d => d.type === 'sms');
      const smtp = data.find(d => d.type === 'smtp');
      if (sms && sms.settings) setSmsSettings(sms.settings as unknown as SmsGatewaySettings);
      if (smtp && smtp.settings) setSmtpSettings(smtp.settings as unknown as SmtpEmailSettings);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSmsSettings = useCallback(async (updates: Partial<SmsGatewaySettings>) => {
    const newSettings = { ...smsSettings, ...updates };
    setSmsSettings(newSettings);
    
    const { data } = (await supabase.from('gateway_settings' as any).select('id').eq('type', 'sms').single()) as { data: any };
    if (data) {
      await supabase.from('gateway_settings' as any).update({ settings: newSettings as any }).eq('id', data.id);
    } else {
      await supabase.from('gateway_settings' as any).insert({ type: 'sms', settings: newSettings as any });
    }
  }, [smsSettings]);

  const updateSmtpSettings = useCallback(async (updates: Partial<SmtpEmailSettings>) => {
    const newSettings = { ...smtpSettings, ...updates };
    setSmtpSettings(newSettings);
    
    const { data } = (await supabase.from('gateway_settings' as any).select('id').eq('type', 'smtp').single()) as { data: any };
    if (data) {
      await supabase.from('gateway_settings' as any).update({ settings: newSettings as any }).eq('id', data.id);
    } else {
      await supabase.from('gateway_settings' as any).insert({ type: 'smtp', settings: newSettings as any });
    }
  }, [smtpSettings]);

  return {
    smsSettings,
    smtpSettings,
    updateSmsSettings,
    updateSmtpSettings,
    loading
  };
}
