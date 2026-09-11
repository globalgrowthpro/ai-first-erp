import { useState, useEffect, useCallback } from "react";
import { aiModules as INITIAL_AI_MODULES, type AiModuleItem } from "@/lib/demo-data";

export type { AiModuleItem };

const STORAGE_KEY = "wazeer_erp_ai_modules_v1";

export function useAiModulesStore() {
  const [modules, setModules] = useState<AiModuleItem[]>(() => {
    if (typeof window === "undefined") return INITIAL_AI_MODULES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse AI modules store", e);
    }
    return INITIAL_AI_MODULES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
    } catch (e) {
      console.error("Failed to save AI modules store", e);
    }
  }, [modules]);

  const addModule = useCallback((module: Omit<AiModuleItem, "id">) => {
    const created: AiModuleItem = {
      ...module,
      id: `mod-${Date.now()}`,
    };
    setModules((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateModule = useCallback((id: string, updates: Partial<AiModuleItem>) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const deleteModule = useCallback((id: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return {
    modules,
    addModule,
    updateModule,
    deleteModule,
  };
}
