import en from "./locales/en.json";
import ar from "./locales/ar.json";

export type Locale = "en" | "ar";

export const LOCALES: Record<Locale, typeof en> = { en, ar };

type Messages = typeof en;

function getPath(obj: unknown, path: string[]): unknown {
  return path.reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Translation lookup by dot-path key (e.g. "kpi.total") with optional
 * `{{variable}}` interpolation. Falls back to English, then to the key
 * itself, so a missing translation never crashes the UI.
 */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const path = key.split(".");
  let value = getPath(LOCALES[locale], path);
  if (typeof value !== "string") value = getPath(LOCALES.en, path);
  if (typeof value !== "string") return key;

  if (!vars) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{{${name}}}`
  );
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export type { Messages };
