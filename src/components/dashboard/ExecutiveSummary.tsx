"use client";

import { useLocale } from "@/context/LocaleProvider";

export function ExecutiveSummary({ summary }: { summary: string }) {
  const { t } = useLocale();

  return (
    <div className="rounded-lg border border-border bg-gradient-to-br from-[color-mix(in_srgb,var(--primary)_6%,var(--surface))] to-surface p-5 shadow-card animate-fade-in">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">{t("summary.title")}</p>
      <p className="text-sm leading-relaxed text-foreground">{summary}</p>
    </div>
  );
}
