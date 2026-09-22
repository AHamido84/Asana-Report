import { NextRequest, NextResponse } from "next/server";
import { getDashboardPayload } from "@/lib/api/dashboardPayload";
import { parseFiltersFromString } from "@/lib/analytics/filtersSchema";
import type { TrendGranularity } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filters = parseFiltersFromString(searchParams.get("filters"));
  const locale = searchParams.get("locale") === "ar" ? "ar" : "en";
  const trendParam = searchParams.get("trend");
  const trendGranularity: TrendGranularity =
    trendParam === "weekly" || trendParam === "monthly" ? trendParam : "daily";

  const payload = await getDashboardPayload({ filters, force: false, locale, trendGranularity });
  return NextResponse.json(payload);
}
