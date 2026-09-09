import { useEffect, useState } from "react";

/**
 * Mock "signed-in user" UI preferences.
 * The demo app has no auth session yet, so the current user is fixed to usr-1
 * (Hafez Rahim / admin). Preferences persist in localStorage.
 */
export const CURRENT_USER_ID = "usr-1";

const STORAGE_KEY = "hafez-erp:sidebar-visible";
const EVENT = "hafez-erp:sidebar-visible-change";

let sidebarVisible = true;
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "false") sidebarVisible = false;
  if (raw === "true") sidebarVisible = true;
}

export function getSidebarVisible() {
  hydrate();
  return sidebarVisible;
}

export function setSidebarVisible(next: boolean) {
  sidebarVisible = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  }
}

/** Reads the preference after hydration and stays in sync with other components. */
export function useSidebarVisible(): [boolean, (next: boolean) => void] {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(getSidebarVisible());
    const handler = (event: Event) => {
      setVisible((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  return [visible, setSidebarVisible];
}
