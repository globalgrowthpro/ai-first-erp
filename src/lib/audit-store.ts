import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AuditSeverity = "low" | "medium" | "high" | "critical";
export type AuditResult = "success" | "denied" | "flagged" | "warning";
export type AuditCategory = "billing" | "inventory" | "manufacturing" | "auth" | "security" | "settings" | "hr";
export type AuditActorType = "human" | "ai_agent";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorType: AuditActorType;
  user: {
    ar: string;
    en: string;
    role: string;
    ip: string;
  };
  agent?: {
    ar: string;
    en: string;
    model: string;
    provider: string;
  };
  action: {
    ar: string;
    en: string;
  };
  category: AuditCategory;
  result: AuditResult;
  severity: AuditSeverity;
  targetResource: string;
  securityRationale?: {
    ar: string;
    en: string;
  };
  payload: Record<string, any>;
  durationMs: number;
}

export function useAuditStore() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false });
    if (data) {
      setLogs(data.map((l: any) => {
        const customPayload = (l.payload as any) || {};
        return {
          id: l.id,
          timestamp: l.created_at,
          actorType: (l.source === 'ai_agent' ? 'ai_agent' : 'human') as AuditActorType,
          user: {
            ar: l.actor_name || 'مستخدم',
            en: l.actor_name || 'User',
            role: customPayload.role || 'user',
            ip: customPayload.ip || '127.0.0.1'
          },
          agent: l.source === 'ai_agent' ? {
            ar: 'مساعد ذكي', en: 'AI Assistant', model: 'unknown', provider: 'unknown'
          } : undefined,
          action: {
            ar: l.action || '',
            en: l.action || ''
          },
          category: (l.entity as any) || 'system',
          result: customPayload.result || 'success',
          severity: customPayload.severity || 'low',
          targetResource: l.entity_id || '',
          securityRationale: customPayload.securityRationale,
          payload: customPayload,
          durationMs: customPayload.durationMs || 0
        } as AuditEntry;
      }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const addLog = useCallback(async (entry: Omit<AuditEntry, "id" | "timestamp">) => {
    await supabase.from('audit_log').insert({
      action: entry.action.en || entry.action.ar,
      actor_name: entry.user.en,
      entity: entry.category,
      entity_id: entry.targetResource,
      source: entry.actorType,
      payload: {
        ...entry.payload,
        result: entry.result,
        severity: entry.severity,
        durationMs: entry.durationMs,
        ip: entry.user.ip,
        role: entry.user.role,
        securityRationale: entry.securityRationale
      }
    });
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    addLog,
    loading
  };
}
