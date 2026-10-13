import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * User UI preferences backed directly by Supabase profiles and company_settings.
 * Eliminates all localStorage reliance.
 */
export const CURRENT_USER_ID = "usr-1";

const EVENT = "hafez-erp:sidebar-visible-change";

let sidebarVisible = true;
let isHydrated = false;

async function hydrateFromSupabase() {
  if (isHydrated) return;
  isHydrated = true;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("sidebar_visible")
      .limit(1)
      .maybeSingle();

    if (data && typeof data.sidebar_visible === "boolean") {
      sidebarVisible = data.sidebar_visible;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(EVENT, { detail: sidebarVisible }));
      }
    }
  } catch (err) {
    console.warn("[UI Prefs] Could not load preference from Supabase:", err);
  }
}

export function getSidebarVisible(): boolean {
  if (!isHydrated) {
    hydrateFromSupabase();
  }
  return sidebarVisible;
}

export async function setSidebarVisible(next: boolean) {
  sidebarVisible = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  }

  try {
    // Persist to Supabase profiles table
    await supabase
      .from("profiles")
      .update({ sidebar_visible: next })
      .not("id", "is", null);
  } catch (err) {
    console.warn("[UI Prefs] Failed to save sidebar preference to Supabase:", err);
  }
}

/** Reads the preference from Supabase state and stays in sync across components. */
export function useSidebarVisible(): [boolean, (next: boolean) => void] {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(getSidebarVisible());
    hydrateFromSupabase().then(() => {
      setVisible(sidebarVisible);
    });

    const handler = (event: Event) => {
      setVisible((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  return [visible, setSidebarVisible];
}
