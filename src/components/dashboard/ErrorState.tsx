"use client";

import { useLocale } from "@/context/LocaleProvider";
import { Button } from "@/components/ui/Button";

const KNOWN_KINDS = [
  "invalid_token",
  "forbidden",
  "not_found",
  "rate_limited",
  "timeout",
  "network",
  "server_error",
  "unknown",
];

export function ErrorState({ kind, message, onRetry }: { kind: string; message: string; onRetry: () => void }) {
  const { t } = useLocale();
  const key = KNOWN_KINDS.includes(kind) ? kind : "unknown";

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-raised animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-[var(--danger)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-foreground">{t("error.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t(`error.${key}`)}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">{message}</p>
        <Button className="mt-5" variant="primary" onClick={onRetry}>
          {t("error.retry")}
        </Button>
      </div>
    </div>
  );
}
