/**
 * Central Date & Time formatting utility for Wazeer El-Helw ERP.
 * Guarantees standard Arabic (ص / م) and English (AM / PM) 12-hour formatting
 * with ISO-clean dates (YYYY-MM-DD).
 */

export function formatDateTime(raw: string | Date | null | undefined, lang: "ar" | "en" = "ar"): {
  date: string;
  time: string;
  full: string;
} {
  if (!raw) return { date: "-", time: "-", full: "-" };

  try {
    const d = typeof raw === "string" ? new Date(raw) : raw;
    if (isNaN(d.getTime())) {
      const str = String(raw);
      return { date: str.slice(0, 10), time: str.slice(11, 16), full: str };
    }

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const isPm = hours >= 12;
    hours = hours % 12 || 12;
    const period = lang === "ar" ? (isPm ? "م" : "ص") : isPm ? "PM" : "AM";
    const timeStr = `${String(hours).padStart(2, "0")}:${minutes} ${period}`;

    return {
      date: dateStr,
      time: timeStr,
      full: `${dateStr} — ${timeStr}`,
    };
  } catch {
    const str = String(raw);
    return { date: str, time: "", full: str };
  }
}

export function formatDateOnly(raw: string | Date | null | undefined): string {
  if (!raw) return "-";
  try {
    const d = typeof raw === "string" ? new Date(raw) : raw;
    if (isNaN(d.getTime())) return String(raw).slice(0, 10);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return String(raw).slice(0, 10);
  }
}
