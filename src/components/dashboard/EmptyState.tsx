"use client";

import { useLocale } from "@/context/LocaleProvider";

export function EmptyState() {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-20 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 12h6M9 16h6M9 8h2" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-foreground">{t("empty.title")}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{t("empty.body")}</p>
    </div>
  );
}
