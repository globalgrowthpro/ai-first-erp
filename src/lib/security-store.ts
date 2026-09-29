import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { permissionMatrix as defaultMatrix, highRiskActions as defaultRiskActions } from "./demo-data";

export interface SecurityMatrix {
  permissionMatrix: typeof defaultMatrix;
  highRiskActions: typeof defaultRiskActions;
}

let globalSecurity: SecurityMatrix = {
  permissionMatrix: defaultMatrix,
  highRiskActions: defaultRiskActions
};
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    l();
  }
}

export function useSecurityStore() {
  const [security, setSecurityState] = useState<SecurityMatrix>(globalSecurity);

  useEffect(() => {
    const handleUpdate = () => {
      setSecurityState(globalSecurity);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const fetchSecurity = useCallback(async () => {
    const { data } = (await supabase.from('company_settings').select('security_matrix').limit(1).maybeSingle()) as { data: any };
    if (data && data.security_matrix) {
      const sm = data.security_matrix as any;
      if (sm.permissionMatrix && sm.highRiskActions) {
        globalSecurity = {
          permissionMatrix: sm.permissionMatrix,
          highRiskActions: sm.highRiskActions
        };
        emit();
      }
    }
  }, []);

  useEffect(() => {
    fetchSecurity();
  }, [fetchSecurity]);

  const updateSecurity = async (newSecurity: Partial<SecurityMatrix>) => {
    const merged = { ...globalSecurity, ...newSecurity };
    globalSecurity = merged;
    emit();

    const { data: existing } = (await supabase.from('company_settings').select('id').limit(1).maybeSingle()) as { data: any };
    
    if (existing?.id) {
      await supabase.from('company_settings').update({ security_matrix: merged as any }).eq('id', existing.id);
    } else {
      await supabase.from('company_settings').insert({
        security_matrix: merged as any,
        fiscal_year_start: new Date().toISOString()
      } as any);
    }
  };

  return {
    security,
    updateSecurity
  };
}
