import { NextRequest, NextResponse } from "next/server";
import { getDashboardPayload } from "@/lib/api/dashboardPayload";
import { parseFilters } from "@/lib/analytics/filtersSchema";
import { DEFAULT_FILTERS, type TrendGranularity } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/asana/sync — forces a fresh fetch from the Asana API,
 * bypassing the cache TTL entirely. Used by both "Refresh Data" and
 * "Sync Now" in the header (identical behavior; two labels for clarity).
 */
export async function POST(request: NextRequest) {
  let body: { filters?: unknown; locale?: string; trend?: TrendGranularity } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine — use defaults
  }

  const filters = body.filters ? parseFilters(body.filters) : DEFAULT_FILTERS;
  const locale = body.locale === "ar" ? "ar" : "en";
  const trendGranularity: TrendGranularity =
    body.trend === "weekly" || body.trend === "monthly" ? body.trend : "daily";

  const payload = await getDashboardPayload({ filters, force: true, locale, trendGranularity });
  return NextResponse.json(payload);
}
