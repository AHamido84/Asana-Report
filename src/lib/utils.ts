import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Percentage of `part` over `total`, safe against division by zero, capped at 100. */
export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

/** Returns today's date as YYYY-MM-DD in the given IANA timezone. */
export function getTodayKey(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function dateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00Z`);
}

export function dateKeyFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const d = dateFromKey(dateKey);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKeyFromDate(d);
}

export function diffInDays(fromKey: string, toKey: string): number {
  const from = dateFromKey(fromKey).getTime();
  const to = dateFromKey(toKey).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function startOfWeekKey(dateKey: string): string {
  const d = dateFromKey(dateKey);
  const day = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() - day);
  return dateKeyFromDate(d);
}

export function startOfMonthKey(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

export function endOfMonthKey(dateKey: string): string {
  const d = dateFromKey(startOfMonthKey(dateKey));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return dateKeyFromDate(d);
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(value);
}

export function formatPercent(value: number, locale: string): string {
  return `${new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 0 }).format(value)}%`;
}

export function formatDate(dateKey: string | null, locale: string): string {
  if (!dateKey) return "—";
  const d = dateFromKey(dateKey);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
