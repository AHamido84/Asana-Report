"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_FILTERS, type DashboardFilters, type TrendGranularity } from "@/lib/analytics/types";
import type { DashboardPayload } from "@/lib/api/dashboardPayload";
import { useLocale } from "@/context/LocaleProvider";

export type AutoRefreshInterval = 0 | 5 | 15 | 30 | 60;

async function fetchJson(url: string, init?: RequestInit): Promise<DashboardPayload> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return (await res.json()) as DashboardPayload;
}

export function useDashboardData() {
  const { locale } = useLocale();
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshInterval>(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [syncStage, setSyncStage] = useState<string>("idle");
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("daily");
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const trendRef = useRef(trendGranularity);
  trendRef.current = trendGranularity;

  const load = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const query = new URLSearchParams({
        filters: JSON.stringify(filtersRef.current),
        locale,
        trend: trendRef.current,
      });
      const data = await fetchJson(`/api/asana/data?${query.toString()}`);
      setPayload(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setSyncStage("connecting");
    setFetchError(null);

    const pollId = setInterval(async () => {
      try {
        const res = await fetch("/api/asana/status");
        if (res.ok) {
          const status = await res.json();
          if (status?.sync?.stage) setSyncStage(status.sync.stage);
        }
      } catch {
        // best-effort progress polling only
      }
    }, 350);

    try {
      const data = await fetchJson("/api/asana/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: filtersRef.current, locale, trend: trendRef.current }),
      });
      setPayload(data);
      setSyncStage("done");
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to sync with Asana");
      setSyncStage("error");
    } finally {
      clearInterval(pollId);
      setIsSyncing(false);
    }
  }, [locale]);

  // Initial load + reload whenever filters, trend granularity, or locale change.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, locale, trendGranularity]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefresh === 0) return;
    const id = setInterval(() => {
      sync();
    }, autoRefresh * 60 * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, sync]);

  const updateFilters = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return {
    filters,
    updateFilters,
    resetFilters,
    payload,
    isLoading,
    isSyncing,
    syncStage,
    fetchError,
    refresh: load,
    sync,
    autoRefresh,
    setAutoRefresh,
    trendGranularity,
    setTrendGranularity,
  };
}
