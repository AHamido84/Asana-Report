import { NextResponse } from "next/server";
import { getConfigStatus, getDashboardConfig } from "@/lib/config";
import { getSyncState, peekCachedDataset } from "@/lib/cache/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const configStatus = getConfigStatus();
  const dashboardConfig = getDashboardConfig();
  const syncState = getSyncState();
  const cached = peekCachedDataset();

  return NextResponse.json({
    configured: configStatus.isConfigured,
    missingEnvVars: configStatus.missing,
    dashboard: {
      title: dashboardConfig.title,
      companyName: dashboardConfig.companyName,
      timezone: dashboardConfig.timezone,
      defaultLocale: dashboardConfig.defaultLocale,
      defaultTheme: dashboardConfig.defaultTheme,
    },
    sync: {
      stage: syncState.stage,
      isSyncing: syncState.isSyncing,
      lastSyncedAt: syncState.lastSyncedAt,
      lastError: syncState.lastError,
    },
    project: cached.dataset
      ? { id: cached.dataset.project.id, name: cached.dataset.project.name, url: cached.dataset.project.url }
      : null,
  });
}
