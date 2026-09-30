import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { aiModules as initialAiModules, type AiModuleItem } from "@/lib/demo-data";

export type { AiModuleItem };

export function useAiModulesStore() {
  const [modules, setModules] = useState<AiModuleItem[]>(initialAiModules);
  const [loading, setLoading] = useState(false);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('ai_modules').select('*');
      if (data && data.length > 0) {
        const defaultFallback: AiModuleItem = initialAiModules[0] ?? {
          id: "default",
          name: { ar: "حافظ", en: "Hafez" },
          provider: "openai",
          model: "gpt-4o",
          apiKey: "",
          agentRole: "orchestrator",
          roleLabel: { ar: "المنسق", en: "Orchestrator" },
          systemPrompt: "",
          allowedTools: [],
          temperature: 0.2,
          status: "active",
          totalRuns: 0
        };
        setModules(data.map((m: any) => {
          const fallback = initialAiModules.find(im => im.id === m.id) ?? defaultFallback;
          return {
            id: m.id,
            name: { ar: m.name_ar || fallback.name.ar, en: m.name_en || fallback.name.en },
            provider: (m.provider || fallback.provider) as AiModuleItem["provider"],
            model: m.model || fallback.model,
            apiKey: m.api_key || fallback.apiKey,
            agentRole: (m.agent_role || fallback.agentRole) as AiModuleItem["agentRole"],
            roleLabel: { ar: m.role_label_ar || fallback.roleLabel.ar, en: m.role_label_en || fallback.roleLabel.en },
            systemPrompt: m.system_prompt || fallback.systemPrompt,
            allowedTools: m.allowed_tools || fallback.allowedTools,
            temperature: typeof m.temperature === 'number' ? m.temperature : fallback.temperature,
            status: (m.status || (m.is_enabled ? 'active' : 'idle')) as AiModuleItem["status"],
            totalRuns: m.total_runs || fallback.totalRuns || 0
          };
        }));
      }
    } catch (err) {
      console.error("Failed to fetch AI modules from Supabase", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const addModule = useCallback(async (module: Omit<AiModuleItem, "id">) => {
    const newMod: AiModuleItem = { ...module, id: `mod-${Date.now()}` };
    setModules(prev => [newMod, ...prev]);
    try {
      await supabase.from('ai_modules').insert({
        code: `AI-${newMod.id.slice(-4)}`,
        name_ar: module.name.ar,
        name_en: module.name.en,
        description_ar: module.roleLabel.ar,
        description_en: module.roleLabel.en,
        scope: module.agentRole,
        is_enabled: module.status === 'active',
        requires_approval: true,
      });
    } catch (err) {
      console.error("Failed to insert AI module into Supabase", err);
    }
    return newMod;
  }, []);

  const updateModule = useCallback(async (id: string, updates: Partial<AiModuleItem>) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    try {
      const payload: any = {};
      if (updates.name?.ar !== undefined) payload.name_ar = updates.name.ar;
      if (updates.name?.en !== undefined) payload.name_en = updates.name.en;
      if (updates.status !== undefined) payload.is_enabled = updates.status === 'active';
      if (updates.agentRole !== undefined) payload.scope = updates.agentRole;

      if (Object.keys(payload).length > 0) {
        await supabase.from('ai_modules').update(payload).eq('id', id);
      }
    } catch (err) {
      console.error("Failed to update AI module in Supabase", err);
    }
  }, []);

  const deleteModule = useCallback(async (id: string) => {
    setModules(prev => prev.filter(m => m.id !== id));
    try {
      await supabase.from('ai_modules').delete().eq('id', id);
    } catch (err) {
      console.error("Failed to delete AI module from Supabase", err);
    }
  }, []);

  return {
    modules,
    addModule,
    updateModule,
    deleteModule,
    loading
  };
}
