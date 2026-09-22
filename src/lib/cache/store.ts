import "server-only";
import type { NormalizedDataset } from "../models";
import { AsanaApiError, createRepositoryFromEnv } from "../asana/repository";
import { getAsanaConfig } from "../config";
import { recordSnapshotIfNeeded } from "../snapshot/store";

export type SyncStage =
  | "idle"
  | "connecting"
  | "fetching_project"
  | "fetching_sections"
  | "fetching_tasks"
  | "fetching_custom_fields"
  | "calculating"
  | "done"
  | "error";

export interface SyncState {
  stage: SyncStage;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastError: { kind: string; message: string } | null;
}

interface CacheEntry {
  dataset: NormalizedDataset | null;
  fetchedAt: number | null;
}

/**
 * Process-local cache. On a long-running Node server (local dev, a
 * container, or a persistent host) this survives across requests for the
 * configured TTL. On stateless serverless platforms (e.g. Vercel functions)
 * each cold start resets it — the interface is intentionally narrow so the
 * backing store can later be swapped for Redis/Upstash/KV without touching
 * callers. See README "Caching" section for details.
 */
const globalKey = "__asana_dashboard_cache__";
const globalSyncKey = "__asana_dashboard_sync_state__";

type GlobalWithCache = typeof globalThis & {
  [globalKey]?: CacheEntry;
  [globalSyncKey]?: SyncState;
};

function getStore(): GlobalWithCache {
  return globalThis as GlobalWithCache;
}

function getCacheEntry(): CacheEntry {
  const store = getStore();
  if (!store[globalKey]) {
    store[globalKey] = { dataset: null, fetchedAt: null };
  }
  return store[globalKey]!;
}

export function getSyncState(): SyncState {
  const store = getStore();
  if (!store[globalSyncKey]) {
    store[globalSyncKey] = {
      stage: "idle",
      isSyncing: false,
      lastSyncedAt: null,
      lastError: null,
    };
  }
  return store[globalSyncKey]!;
}

function setSyncState(patch: Partial<SyncState>) {
  const store = getStore();
  store[globalSyncKey] = { ...getSyncState(), ...patch };
}

export interface GetDatasetResult {
  dataset: NormalizedDataset | null;
  fromCache: boolean;
  fetchedAt: string | null;
}

let inFlight: Promise<NormalizedDataset> | null = null;

async function runSync(): Promise<NormalizedDataset> {
  const { repository, missingEnvVars } = createRepositoryFromEnv();
  if (!repository) {
    throw new AsanaApiError(
      "invalid_token",
      `Missing required environment variables: ${missingEnvVars.join(", ")}`
    );
  }

  setSyncState({ isSyncing: true, stage: "connecting", lastError: null });
  await Promise.resolve();

  setSyncState({ stage: "fetching_project" });
  setSyncState({ stage: "fetching_sections" });
  setSyncState({ stage: "fetching_tasks" });
  setSyncState({ stage: "fetching_custom_fields" });

  const dataset = await repository.fetchDataset();

  setSyncState({ stage: "calculating" });

  const entry = getCacheEntry();
  entry.dataset = dataset;
  entry.fetchedAt = Date.now();

  recordSnapshotIfNeeded(dataset);

  setSyncState({
    stage: "done",
    isSyncing: false,
    lastSyncedAt: dataset.fetchedAt,
  });

  return dataset;
}

/**
 * Returns the cached dataset if fresh, otherwise fetches from Asana.
 * `force: true` (Sync Now / Refresh) always bypasses the TTL.
 * Concurrent callers share a single in-flight fetch.
 */
export async function getDataset(force = false): Promise<GetDatasetResult> {
  const entry = getCacheEntry();
  const { cacheTtlSeconds } = getAsanaConfig();
  const ageMs = entry.fetchedAt ? Date.now() - entry.fetchedAt : Infinity;
  const isFresh = entry.dataset && ageMs < cacheTtlSeconds * 1000;

  if (isFresh && !force) {
    return { dataset: entry.dataset, fromCache: true, fetchedAt: new Date(entry.fetchedAt!).toISOString() };
  }

  if (!inFlight) {
    inFlight = runSync().finally(() => {
      inFlight = null;
    });
  }

  try {
    const dataset = await inFlight;
    return { dataset, fromCache: false, fetchedAt: dataset.fetchedAt };
  } catch (err) {
    setSyncState({
      isSyncing: false,
      stage: "error",
      lastError: {
        kind: err instanceof AsanaApiError ? err.kind : "unknown",
        message: err instanceof Error ? err.message : "Unknown error",
      },
    });
    // Fall back to stale cache if we have one, so a transient API failure
    // doesn't take down an already-working dashboard.
    if (entry.dataset) {
      return { dataset: entry.dataset, fromCache: true, fetchedAt: new Date(entry.fetchedAt!).toISOString() };
    }
    throw err;
  }
}

export function peekCachedDataset(): GetDatasetResult {
  const entry = getCacheEntry();
  return {
    dataset: entry.dataset,
    fromCache: true,
    fetchedAt: entry.fetchedAt ? new Date(entry.fetchedAt).toISOString() : null,
  };
}
