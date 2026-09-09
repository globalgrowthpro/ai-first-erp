import { useState, useEffect, useCallback } from "react";

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

const STORAGE_KEYS = {
  SMS: "wazeer_erp_gateway_sms_v1",
  SMTP: "wazeer_erp_gateway_smtp_v1",
};

export const DEFAULT_SMS_SETTINGS: SmsGatewaySettings = {
  environment: "live",
  defaultLanguage: "english",
  username: "wazeer_sms_gateway",
  password: "••••••••••••",
  apiKey: "sms_live_sec_8849201948291039",
  senderToken: "WazeerElHelw",
  enableSms: true,
};

export const DEFAULT_SMTP_SETTINGS: SmtpEmailSettings = {
  host: "smtp.hostinger.com",
  port: 465,
  username: "notifications@odooteams.com",
  password: "••••••••••••",
  fromName: "وزير الحلو — نظام ERP الذكي",
  fromEmail: "info@odooteams.com",
  useSslTls: true,
  enableEmail: true,
};

export function useGatewaysStore() {
  const [smsSettings, setSmsSettings] = useState<SmsGatewaySettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SMS_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SMS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load SMS settings", e);
    }
    return DEFAULT_SMS_SETTINGS;
  });

  const [smtpSettings, setSmtpSettings] = useState<SmtpEmailSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SMTP_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SMTP);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load SMTP settings", e);
    }
    return DEFAULT_SMTP_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SMS, JSON.stringify(smsSettings));
      localStorage.setItem(STORAGE_KEYS.SMTP, JSON.stringify(smtpSettings));
    } catch (e) {
      console.error("Failed to save gateway settings", e);
    }
  }, [smsSettings, smtpSettings]);

  const updateSmsSettings = useCallback((updates: Partial<SmsGatewaySettings>) => {
    setSmsSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateSmtpSettings = useCallback((updates: Partial<SmtpEmailSettings>) => {
    setSmtpSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    smsSettings,
    smtpSettings,
    updateSmsSettings,
    updateSmtpSettings,
  };
}
