import { NextRequest, NextResponse } from "next/server";
import { getDashboardPayload } from "@/lib/api/dashboardPayload";
import { parseFiltersFromString } from "@/lib/analytics/filtersSchema";
import { buildTasksCsv } from "@/lib/export/csv";
import { buildExecutiveReportHtml } from "@/lib/export/report";
import { getDashboardConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filters = parseFiltersFromString(searchParams.get("filters"));
  const locale = searchParams.get("locale") === "ar" ? "ar" : "en";
  const format = searchParams.get("format") === "report" ? "report" : "csv";

  const payload = await getDashboardPayload({ filters, force: false, locale });

  if (payload.status !== "ready" && payload.status !== "empty") {
    return NextResponse.json({ error: "Dashboard data is not available for export yet." }, { status: 409 });
  }

  if (!payload.analytics || !payload.dataset) {
    return NextResponse.json({ error: "No data available." }, { status: 409 });
  }

  const projectName = payload.dataset.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  if (format === "report") {
    const html = buildExecutiveReportHtml({
      project: payload.dataset.project,
      analytics: payload.analytics,
      locale,
      companyName: getDashboardConfig().companyName,
    });
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${projectName}-executive-report.html"`,
      },
    });
  }

  const csv = buildTasksCsv(payload.analytics.tasks, payload.dataset.customFieldDefinitions, locale);
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${projectName}-tasks.csv"`,
    },
  });
}
