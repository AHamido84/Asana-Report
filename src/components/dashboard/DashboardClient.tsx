"use client";

import { useCallback } from "react";
import { useLocale } from "@/context/LocaleProvider";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Header } from "./Header";
import { SyncOverlay } from "./SyncOverlay";
import { FilterBar } from "./FilterBar";
import { KpiSection } from "./KpiSection";
import { WorkflowOverview } from "./WorkflowOverview";
import { ProductivitySection } from "./ProductivitySection";
import { TeamWorkload } from "./TeamWorkload";
import { AgingChart, TaskHealthStats } from "./TaskHealth";
import { OverdueTable } from "./OverdueTable";
import { UpcomingWork } from "./UpcomingWork";
import { TaskTable } from "./TaskTable";
import { InsightsSection } from "./InsightsSection";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { EmptyState } from "./EmptyState";
import { SetupRequired } from "./SetupRequired";
import { ErrorState } from "./ErrorState";
import { DashboardLoadingSkeleton } from "./LoadingSkeleton";

export function DashboardClient({ title, companyName }: { title: string; companyName: string }) {
  const { locale, t } = useLocale();
  const {
    filters,
    updateFilters,
    resetFilters,
    payload,
    isLoading,
    isSyncing,
    syncStage,
    fetchError,
    refresh,
    sync,
    autoRefresh,
    setAutoRefresh,
    trendGranularity,
    setTrendGranularity,
  } = useDashboardData();

  const exportUrl = useCallback(
    (format: "csv" | "report") => {
      const query = new URLSearchParams({ filters: JSON.stringify(filters), locale, format });
      return `/api/asana/export?${query.toString()}`;
    },
    [filters, locale]
  );

  const handleExportCsv = useCallback(() => {
    window.open(exportUrl("csv"), "_blank");
  }, [exportUrl]);

  const handleExportReport = useCallback(() => {
    window.open(exportUrl("report"), "_blank");
  }, [exportUrl]);

  const toggleSection = useCallback(
    (id: string) => {
      updateFilters({
        sectionIds: filters.sectionIds.includes(id)
          ? filters.sectionIds.filter((s) => s !== id)
          : [...filters.sectionIds, id],
      });
    },
    [filters.sectionIds, updateFilters]
  );

  const toggleAssignee = useCallback(
    (id: string) => {
      updateFilters({
        assigneeIds: filters.assigneeIds.includes(id)
          ? filters.assigneeIds.filter((a) => a !== id)
          : [...filters.assigneeIds, id],
      });
    },
    [filters.assigneeIds, updateFilters]
  );

  if (payload?.status === "setup_required") {
    return <SetupRequired missingEnvVars={payload.missingEnvVars ?? []} />;
  }

  if (!payload && fetchError) {
    return <ErrorState kind="network" message={fetchError} onRetry={refresh} />;
  }

  if (payload?.status === "error" && payload.error) {
    return <ErrorState kind={payload.error.kind} message={payload.error.message} onRetry={refresh} />;
  }

  return (
    <div className="min-h-screen">
      <Header
        title={title}
        companyName={companyName}
        projectName={payload?.dataset?.project.name ?? null}
        projectUrl={payload?.dataset?.project.url ?? null}
        lastSyncedAt={payload?.meta.fetchedAt ?? null}
        isSyncing={isSyncing}
        onRefresh={refresh}
        onSync={sync}
        onExportCsv={handleExportCsv}
        onExportReport={handleExportReport}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
      />
      <SyncOverlay stage={syncStage} visible={isSyncing} />

      {payload?.dataset && (
        <FilterBar
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          users={payload.dataset.users}
          sections={payload.dataset.sections}
          customFieldDefinitions={payload.dataset.customFieldDefinitions}
        />
      )}

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {isLoading && !payload ? (
          <DashboardLoadingSkeleton />
        ) : payload?.status === "empty" ? (
          <EmptyState />
        ) : payload?.analytics && payload.dataset ? (
          <div className="space-y-6">
            <ExecutiveSummary summary={payload.analytics.executiveSummary} />

            <KpiSection kpis={payload.analytics.kpis} filters={filters} onChange={updateFilters} />

            <WorkflowOverview
              sections={payload.analytics.sections}
              activeSectionIds={filters.sectionIds}
              onToggleSection={toggleSection}
            />

            <ProductivitySection
              sections={payload.analytics.sections}
              trend={payload.analytics.trend}
              granularity={trendGranularity}
              onGranularityChange={setTrendGranularity}
            />

            <TeamWorkload
              workload={payload.analytics.workload}
              activeAssigneeIds={filters.assigneeIds}
              onToggleAssignee={toggleAssignee}
            />

            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">{t("health.title")}</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AgingChart aging={payload.analytics.aging} />
                <TaskHealthStats
                  missingDueDateCount={payload.analytics.missingDueDateCount}
                  unassignedCount={payload.analytics.kpis.unassigned}
                  onClickMissingDueDate={() => updateFilters({ statuses: ["open"] })}
                  onClickUnassigned={() => updateFilters({ statuses: ["unassigned"] })}
                />
              </div>
              <div className="mt-4">
                <OverdueTable rows={payload.analytics.overdueRows} />
              </div>
            </section>

            <UpcomingWork rows={payload.analytics.upcomingRows} />

            <TaskTable
              tasks={payload.analytics.tasks}
              customFieldDefinitions={payload.dataset.customFieldDefinitions}
              referenceDate={payload.analytics.referenceDate}
              onExportCsv={handleExportCsv}
            />

            <InsightsSection insights={payload.analytics.insights} />
          </div>
        ) : (
          <DashboardLoadingSkeleton />
        )}
      </main>
    </div>
  );
}
