import "server-only";

export type Locale = "en" | "ar";
export type ThemeMode = "light" | "dark";

export interface AsanaEnvConfig {
  accessToken: string | null;
  projectGid: string | null;
  workspaceGid: string | null;
  boardGid: string | null;
  cacheTtlSeconds: number;
  /** Whether to fetch per-task attachment counts (drives Output Count). Default true. */
  fetchAttachments: boolean;
}

export interface DashboardEnvConfig {
  defaultLocale: Locale;
  defaultTheme: ThemeMode;
  title: string;
  companyName: string;
  timezone: string;
}

function readTtl(raw: string | undefined, fallback: number): number {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readLocale(raw: string | undefined): Locale {
  return raw === "ar" ? "ar" : "en";
}

function readTheme(raw: string | undefined): ThemeMode {
  return raw === "dark" ? "dark" : "light";
}

function readBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === "") return fallback;
  return raw.trim().toLowerCase() !== "false" && raw.trim() !== "0";
}

/**
 * Reads Asana + dashboard configuration from server-side environment
 * variables. Never import this module from client components — it is
 * guarded by `server-only` and will fail the build if bundled client-side.
 */
export function getAsanaConfig(): AsanaEnvConfig {
  return {
    accessToken: process.env.ASANA_ACCESS_TOKEN?.trim() || null,
    projectGid: process.env.ASANA_PROJECT_GID?.trim() || null,
    workspaceGid: process.env.ASANA_WORKSPACE_GID?.trim() || null,
    boardGid: process.env.ASANA_BOARD_GID?.trim() || null,
    cacheTtlSeconds: readTtl(process.env.ASANA_CACHE_TTL_SECONDS, 300),
    fetchAttachments: readBoolean(process.env.ASANA_FETCH_ATTACHMENTS, true),
  };
}

export function getDashboardConfig(): DashboardEnvConfig {
  return {
    defaultLocale: readLocale(process.env.DASHBOARD_DEFAULT_LOCALE),
    defaultTheme: readTheme(process.env.DASHBOARD_DEFAULT_THEME),
    title: process.env.DASHBOARD_TITLE?.trim() || "Executive Project Dashboard",
    companyName: process.env.DASHBOARD_COMPANY_NAME?.trim() || "",
    timezone: process.env.DASHBOARD_TIMEZONE?.trim() || "UTC",
  };
}

export interface ConfigStatus {
  isConfigured: boolean;
  missing: string[];
}

/** Determines whether the minimum required env vars are present. */
export function getConfigStatus(): ConfigStatus {
  const cfg = getAsanaConfig();
  const missing: string[] = [];
  if (!cfg.accessToken) missing.push("ASANA_ACCESS_TOKEN");
  if (!cfg.projectGid) missing.push("ASANA_PROJECT_GID");
  return { isConfigured: missing.length === 0, missing };
}
