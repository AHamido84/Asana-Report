"use client";

import { useLocale } from "@/context/LocaleProvider";

export function SetupRequired({ missingEnvVars }: { missingEnvVars: string[] }) {
  const { t } = useLocale();

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-8 text-center shadow-raised animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--warning)_20%,transparent)] text-[#8a5a00]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-foreground">{t("setup.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("setup.body")}</p>

        <ul className="mt-4 space-y-2 text-start">
          {missingEnvVars.map((name) => (
            <li key={name} className="rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground">
              {name}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-muted-foreground">{t("setup.help")}</p>
      </div>
    </div>
  );
}
