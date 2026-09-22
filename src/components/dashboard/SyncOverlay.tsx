"use client";

import { useLocale } from "@/context/LocaleProvider";
import { cn } from "@/lib/utils";

const STAGES = [
  "connecting",
  "fetching_project",
  "fetching_sections",
  "fetching_tasks",
  "fetching_custom_fields",
  "calculating",
  "done",
] as const;

export function SyncOverlay({ stage, visible }: { stage: string; visible: boolean }) {
  const { t } = useLocale();
  if (!visible) return null;

  const currentIndex = STAGES.indexOf(stage as (typeof STAGES)[number]);

  return (
    <div className="fixed inset-x-0 top-14 z-40 flex justify-center px-4 animate-slide-up">
      <div className="flex w-full max-w-md items-center gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3 shadow-raised">
        <svg className="h-4 w-4 shrink-0 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
          <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{t("sync.title")}</p>
          <p className="truncate text-xs text-muted-foreground">{t(`sync.${stage}`)}</p>
        </div>
        <div className="flex gap-1">
          {STAGES.slice(0, -1).map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1 w-4 rounded-full transition-colors",
                i <= currentIndex ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
