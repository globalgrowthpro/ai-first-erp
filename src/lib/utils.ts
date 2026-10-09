import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatShortShiftId(id: string): string {
  if (!id) return "";
  const parts = id.split("-");
  if (parts.length > 3) {
    const prefix = parts[0] || "SHIFT";
    const middle = parts[1]?.slice(0, 4)?.toUpperCase() || "";
    const suffix = parts[parts.length - 1] || "";
    return `${prefix}-${middle}-${suffix}`;
  }
  if (id.length > 18) {
    return `${id.slice(0, 8)}…${id.slice(-4)}`;
  }
  return id;
}

