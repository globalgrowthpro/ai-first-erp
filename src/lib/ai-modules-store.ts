import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AiModuleItem {
  id: string;
  code: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  scope: "finance" | "sales" | "inventory" | "hr" | "security" | "manufacturing" | "logistics" | "customer_service" | "general";
  isEnabled: boolean;
  requiresApproval: boolean;
  autoAction: boolean;
  provider?: string;
  model?: string;
  apiKey?: string;
  agentRole?: string;
  roleLabel?: { ar: string; en: string };
  systemPrompt?: string;
  allowedTools?: string[];
  temperature?: number;
  status?: "active" | "idle" | "testing";
  totalRuns?: number;
}

export function useAiModulesStore() {
  const [modules, setModules] = useState<AiModuleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('ai_modules').select('*');
    if (data) {
      setModules(data.map((m: any) => ({
        id: m.id,
        code: m.code || `AI-${m.id.slice(0, 4)}`,
        name: { ar: m.name_ar || '', en: m.name_en || '' },
        description: { ar: m.description_ar || '', en: m.description_en || '' },
        scope: (m.scope as any) || 'general',
        isEnabled: m.is_enabled !== false,
        requiresApproval: m.requires_approval !== false,
        autoAction: !m.requires_approval,
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-...",
        agentRole: "orchestrator",
        roleLabel: { ar: 'مساعد', en: 'Assistant' },
        systemPrompt: "You are a helpful assistant.",
        allowedTools: [],
        temperature: 0.7,
        status: "active",
        totalRuns: 0
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const addModule = useCallback(async (module: Omit<AiModuleItem, "id">) => {
    const { data } = await supabase.from('ai_modules').insert({
      code: module.code,
      name_ar: module.name.ar,
      name_en: module.name.en,
      description_ar: module.description.ar,
      description_en: module.description.en,
      scope: module.scope,
      is_enabled: module.isEnabled,
      requires_approval: module.requiresApproval,
    }).select().single();
    if (data) fetchModules();
    return { ...module, id: data?.id || 'temp' } as AiModuleItem;
  }, [fetchModules]);

  const updateModule = useCallback(async (id: string, updates: Partial<AiModuleItem>) => {
    const payload: any = {};
    if (updates.name?.ar !== undefined) payload.name_ar = updates.name.ar;
    if (updates.name?.en !== undefined) payload.name_en = updates.name.en;
    if (updates.description?.ar !== undefined) payload.description_ar = updates.description.ar;
    if (updates.description?.en !== undefined) payload.description_en = updates.description.en;
    if (updates.scope !== undefined) payload.scope = updates.scope;
    if (updates.isEnabled !== undefined) payload.is_enabled = updates.isEnabled;
    if (updates.requiresApproval !== undefined) payload.requires_approval = updates.requiresApproval;

    if (Object.keys(payload).length > 0) {
      await supabase.from('ai_modules').update(payload).eq('id', id);
    }
    fetchModules();
  }, [fetchModules]);

  const deleteModule = useCallback(async (id: string) => {
    await supabase.from('ai_modules').delete().eq('id', id);
    fetchModules();
  }, [fetchModules]);

  return {
    modules,
    addModule,
    updateModule,
    deleteModule,
    loading
  };
}
