"use client";

import { useLocale } from "@/context/LocaleProvider";
import { KpiCard } from "./KpiCard";
import type { OutputTotals } from "@/lib/analytics/types";
import type { DashboardFilters, StatusFilterValue } from "@/lib/analytics/types";
import { formatNumber, formatPercent } from "@/lib/utils";

const Icon = {
  totalOutputs: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15V6a2 2 0 00-2-2H8L5 7H3a1 1 0 00-1 1v10a2 2 0 002 2h14a2 2 0 002-2z" />
    </svg>
  ),
  completed: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  pending: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  overdue: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  average: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-6 4 3 5-8" />
    </svg>
  ),
  attachment: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  ),
};

export function OutputsOverview({
  outputs,
  filters,
  onChange,
}: {
  outputs: OutputTotals;
  filters: DashboardFilters;
  onChange: (patch: Partial<DashboardFilters>) => void;
}) {
  const { locale, t } = useLocale();
  const num = (n: number) => formatNumber(n, locale);
  const isActive = (status: string) => filters.statuses.includes(status as never);
  const setOnlyStatus = (status: StatusFilterValue | null) => onChange({ statuses: status ? [status] : [] });

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{t("outputs.title")}</h2>
      <p className="mb-3 -mt-2 text-xs text-muted-foreground">{t("outputs.subtitle")}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label={t("outputs.total")}
          value={num(outputs.totalOutputs)}
          icon={Icon.totalOutputs}
          accent="primary"
          active={filters.statuses.length === 0}
          onClick={() => setOnlyStatus(null)}
        />
        <KpiCard
          label={t("outputs.completed")}
          value={num(outputs.completedOutputs)}
          icon={Icon.completed}
          accent="success"
          active={isActive("completed")}
          onClick={() => setOnlyStatus(isActive("completed") ? null : "completed")}
        />
        <KpiCard
          label={t("outputs.pending")}
          value={num(outputs.pendingOutputs)}
          icon={Icon.pending}
          accent="info"
          active={isActive("open")}
          onClick={() => setOnlyStatus(isActive("open") ? null : "open")}
        />
        <KpiCard
          label={t("outputs.overdue")}
          value={num(outputs.overdueOutputs)}
          icon={Icon.overdue}
          accent="danger"
          active={isActive("overdue")}
          onClick={() => setOnlyStatus(isActive("overdue") ? null : "overdue")}
        />
        <KpiCard
          label={t("outputs.averagePerTask")}
          value={num(outputs.averageOutputsPerTask)}
          icon={Icon.average}
          accent="neutral"
        />
        <KpiCard
          label={t("outputs.attachmentRatio")}
          value={formatPercent(outputs.attachmentRatio, locale)}
          icon={Icon.attachment}
          accent="neutral"
          suffix={
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {t("outputs.attachmentRatioDetail", {
                withCount: outputs.tasksWithAttachments,
                withoutCount: outputs.tasksWithoutAttachments,
              })}
            </p>
          }
        />
      </div>
    </section>
  );
}
