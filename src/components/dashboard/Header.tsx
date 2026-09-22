"use client";

import { useState } from "react";
import { useLocale } from "@/context/LocaleProvider";
import { useTheme } from "@/context/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatDateTime } from "@/lib/utils";
import type { AutoRefreshInterval } from "@/hooks/useDashboardData";

export function Header({
  title,
  companyName,
  projectName,
  projectUrl,
  lastSyncedAt,
  isSyncing,
  onRefresh,
  onSync,
  onExportCsv,
  onExportReport,
  autoRefresh,
  onAutoRefreshChange,
}: {
  title: string;
  companyName: string;
  projectName: string | null;
  projectUrl: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  onRefresh: () => void;
  onSync: () => void;
  onExportCsv: () => void;
  onExportReport: () => void;
  autoRefresh: AutoRefreshInterval;
  onAutoRefreshChange: (value: AutoRefreshInterval) => void;
}) {
  const { locale, setLocale, t } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
            {companyName ? companyName.slice(0, 1).toUpperCase() : "A"}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight text-foreground sm:text-base">{title}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {projectName && (
                <span className="truncate">
                  {t("header.asanaProject")}:{" "}
                  {projectUrl ? (
                    <a href={projectUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {projectName}
                    </a>
                  ) : (
                    projectName
                  )}
                </span>
              )}
              <span aria-hidden className="hidden sm:inline">
                ·
              </span>
              <span className="whitespace-nowrap">
                {t("header.lastSynced")}: {lastSyncedAt ? formatDateTime(lastSyncedAt, locale) : t("header.neverSynced")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={autoRefresh}
            onChange={(e) => onAutoRefreshChange(Number(e.target.value) as AutoRefreshInterval)}
            aria-label={t("header.autoRefresh")}
            title={t("header.autoRefresh")}
          >
            <option value={0}>{t("header.autoRefresh")}: {t("header.autoRefreshOff")}</option>
            <option value={5}>{t("header.autoRefresh")}: 5m</option>
            <option value={15}>{t("header.autoRefresh")}: 15m</option>
            <option value={30}>{t("header.autoRefresh")}: 30m</option>
            <option value={60}>{t("header.autoRefresh")}: 60m</option>
          </Select>

          <Button size="sm" variant="outline" onClick={onRefresh} disabled={isSyncing}>
            {t("header.refresh")}
          </Button>
          <Button size="sm" variant="primary" onClick={onSync} disabled={isSyncing}>
            {isSyncing ? t("header.syncing") : t("header.syncNow")}
          </Button>

          <div className="relative">
            <Button size="sm" variant="secondary" onClick={() => setExportOpen((v) => !v)}>
              {t("header.export")}
            </Button>
            {exportOpen && (
              <div
                className="absolute end-0 z-40 mt-1 w-56 rounded-md border border-border bg-surface-raised p-1 shadow-raised animate-slide-up"
                onMouseLeave={() => setExportOpen(false)}
              >
                <button
                  className="block w-full rounded-sm px-3 py-2 text-start text-sm hover:bg-muted"
                  onClick={() => {
                    onExportCsv();
                    setExportOpen(false);
                  }}
                >
                  {t("header.exportCsv")}
                </button>
                <button
                  className="block w-full rounded-sm px-3 py-2 text-start text-sm hover:bg-muted"
                  onClick={() => {
                    onExportReport();
                    setExportOpen(false);
                  }}
                >
                  {t("header.exportExecutive")}
                </button>
              </div>
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            title={t("header.language")}
            aria-label={t("header.language")}
          >
            <span className="text-xs font-semibold">{locale === "en" ? "AR" : "EN"}</span>
          </Button>

          <Button size="icon" variant="ghost" onClick={toggleTheme} title={t("header.theme")} aria-label={t("header.theme")}>
            {theme === "light" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
