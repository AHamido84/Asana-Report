"use client";

import { useLocale } from "@/context/LocaleProvider";
import { KpiCard } from "./KpiCard";
import { Progress } from "@/components/ui/Progress";
import type { Kpis, DashboardFilters } from "@/lib/analytics/types";
import { formatNumber, formatPercent } from "@/lib/utils";

const Icon = {
  total: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
    </svg>
  ),
  completed: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  inProgress: (
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
  dueToday: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  ),
  dueThisWeek: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  ),
  unassigned: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" strokeDasharray="2 2" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" strokeDasharray="2 2" />
    </svg>
  ),
  rate: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-6 4 3 5-8" />
    </svg>
  ),
};

export function KpiSection({
  kpis,
  filters,
  onChange,
}: {
  kpis: Kpis;
  filters: DashboardFilters;
  onChange: (patch: Partial<DashboardFilters>) => void;
}) {
  const { locale, t } = useLocale();
  const num = (n: number) => formatNumber(n, locale);
  const isActive = (status: string) => filters.statuses.includes(status as never);
  const setOnlyStatus = (status: string | null) => onChange({ statuses: status ? [status as never] : [] });

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      <KpiCard
        label={t("kpi.total")}
        value={num(kpis.total)}
        icon={Icon.total}
        accent="primary"
        active={filters.statuses.length === 0 && filters.dateRange.preset === "all"}
        onClick={() => onChange({ statuses: [], dateRange: { preset: "all", from: null, to: null } })}
      />
      <KpiCard
        label={t("kpi.completed")}
        value={num(kpis.completed)}
        icon={Icon.completed}
        accent="success"
        active={isActive("completed")}
        onClick={() => setOnlyStatus(isActive("completed") ? null : "completed")}
      />
      <KpiCard
        label={t("kpi.inProgress")}
        value={num(kpis.inProgress)}
        icon={Icon.inProgress}
        accent="info"
        active={isActive("open")}
        onClick={() => setOnlyStatus(isActive("open") ? null : "open")}
      />
      <KpiCard
        label={t("kpi.overdue")}
        value={num(kpis.overdue)}
        icon={Icon.overdue}
        accent="danger"
        active={isActive("overdue")}
        onClick={() => setOnlyStatus(isActive("overdue") ? null : "overdue")}
      />
      <KpiCard
        label={t("kpi.dueToday")}
        value={num(kpis.dueToday)}
        icon={Icon.dueToday}
        accent="warning"
        active={isActive("due_today")}
        onClick={() => setOnlyStatus(isActive("due_today") ? null : "due_today")}
      />
      <KpiCard
        label={t("kpi.dueThisWeek")}
        value={num(kpis.dueThisWeek)}
        icon={Icon.dueThisWeek}
        accent="warning"
        active={filters.dateRange.preset === "this_week" && isActive("open")}
        onClick={() =>
          filters.dateRange.preset === "this_week"
            ? onChange({ dateRange: { preset: "all", from: null, to: null }, statuses: [] })
            : onChange({ dateRange: { preset: "this_week", from: null, to: null }, statuses: ["open"] })
        }
      />
      <KpiCard
        label={t("kpi.unassigned")}
        value={num(kpis.unassigned)}
        icon={Icon.unassigned}
        accent="neutral"
        active={isActive("unassigned")}
        onClick={() => setOnlyStatus(isActive("unassigned") ? null : "unassigned")}
      />
      <KpiCard
        label={t("kpi.completionRate")}
        value={formatPercent(kpis.completionRate, locale)}
        icon={Icon.rate}
        accent="primary"
        suffix={
          <div className="mt-2 w-full">
            <Progress value={kpis.completionRate} className="h-1" />
          </div>
        }
      />
    </section>
  );
}
