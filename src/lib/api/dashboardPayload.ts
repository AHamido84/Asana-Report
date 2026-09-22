import "server-only";
import { getDataset, getSyncState } from "../cache/store";
import { listSnapshots } from "../snapshot/store";
import { getConfigStatus, getDashboardConfig } from "../config";
import { computeAnalytics } from "../analytics/engine";
import type { DashboardFilters, TrendGranularity, AnalyticsResult } from "../analytics/types";
import type { CustomFieldDefinition, DashboardUser, Project, Section, Tag } from "../models";
import { getTodayKey } from "../utils";
import { AsanaApiError } from "../asana/repository";

export type DashboardStatus = "setup_required" | "ready" | "empty" | "error";

export interface DashboardMeta {
  fetchedAt: string | null;
  fromCache: boolean;
  isSyncing: boolean;
  syncStage: string;
  timezone: string;
  locale: string;
}

export interface DashboardDatasetSummary {
  project: Project;
  sections: Section[];
  users: DashboardUser[];
  customFieldDefinitions: CustomFieldDefinition[];
  tags: Tag[];
  taskCount: number;
}

export interface DashboardPayload {
  status: DashboardStatus;
  missingEnvVars?: string[];
  error?: { kind: string; message: string };
  meta: DashboardMeta;
  dataset?: DashboardDatasetSummary;
  analytics?: AnalyticsResult;
}

export interface GetDashboardPayloadOptions {
  filters: DashboardFilters;
  force: boolean;
  locale: "en" | "ar";
  trendGranularity?: TrendGranularity;
}

export async function getDashboardPayload(options: GetDashboardPayloadOptions): Promise<DashboardPayload> {
  const { filters, force, locale, trendGranularity = "daily" } = options;
  const configStatus = getConfigStatus();
  const dashboardConfig = getDashboardConfig();
  const syncState = getSyncState();

  const baseMeta: DashboardMeta = {
    fetchedAt: syncState.lastSyncedAt,
    fromCache: false,
    isSyncing: syncState.isSyncing,
    syncStage: syncState.stage,
    timezone: dashboardConfig.timezone,
    locale,
  };

  if (!configStatus.isConfigured) {
    return { status: "setup_required", missingEnvVars: configStatus.missing, meta: baseMeta };
  }

  let datasetResult;
  try {
    datasetResult = await getDataset(force);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const kind = err instanceof AsanaApiError ? err.kind : "unknown";
    return { status: "error", error: { kind, message }, meta: baseMeta };
  }

  const { dataset, fromCache, fetchedAt } = datasetResult;
  if (!dataset) {
    return { status: "error", error: { kind: "unknown", message: "No data returned from Asana" }, meta: baseMeta };
  }

  const today = getTodayKey(dashboardConfig.timezone);
  const snapshots = await listSnapshots();
  const analytics = computeAnalytics({ dataset, filters, today, snapshots, trendGranularity, locale });

  const datasetSummary: DashboardDatasetSummary = {
    project: dataset.project,
    sections: dataset.sections,
    users: dataset.users,
    customFieldDefinitions: dataset.customFieldDefinitions,
    tags: dataset.tags,
    taskCount: dataset.tasks.filter((t) => !t.isSubtask).length,
  };

  return {
    status: datasetSummary.taskCount === 0 ? "empty" : "ready",
    meta: { ...baseMeta, fetchedAt, fromCache, isSyncing: getSyncState().isSyncing, syncStage: getSyncState().stage },
    dataset: datasetSummary,
    analytics,
  };
}
