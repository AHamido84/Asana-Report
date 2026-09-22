"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale } from "@/context/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { SectionBreakdown, TrendGranularity, TrendMetric, AnalyticsResult } from "@/lib/analytics/types";
import { formatDate, formatNumber } from "@/lib/utils";

function ChartTooltip({ active, payload, label, locale }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2 text-xs shadow-raised">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatNumber(p.value, locale)}
        </p>
      ))}
    </div>
  );
}

export function ProductivitySection({
  sections,
  trend,
  granularity,
  onGranularityChange,
}: {
  sections: SectionBreakdown[];
  trend: AnalyticsResult["trend"];
  granularity: TrendGranularity;
  onGranularityChange: (g: TrendGranularity) => void;
}) {
  const { locale, t } = useLocale();
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("outputs");

  const sectionData = sections.map((s) => ({ name: s.name, [t("common.tasks")]: s.taskCount, [t("outputs.unit")]: s.outputCount }));
  const trendData = trend.points.map((p) => ({
    label: formatDate(p.date, locale),
    completed: trendMetric === "outputs" ? p.completedOutputs : p.completedTasks,
    total: trendMetric === "outputs" ? p.totalOutputs : p.totalTasks,
  }));

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("productivity.trendTitle")}</CardTitle>
            <CardSubtitle>{t("productivity.title")}</CardSubtitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Button size="sm" variant={trendMetric === "tasks" ? "primary" : "outline"} onClick={() => setTrendMetric("tasks")}>
                {t("productivity.viewTasks")}
              </Button>
              <Button size="sm" variant={trendMetric === "outputs" ? "primary" : "outline"} onClick={() => setTrendMetric("outputs")}>
                {t("productivity.viewOutputs")}
              </Button>
            </div>
            <Select value={granularity} onChange={(e) => onGranularityChange(e.target.value as TrendGranularity)}>
              <option value="daily">{t("productivity.daily")}</option>
              <option value="weekly">{t("productivity.weekly")}</option>
              <option value="monthly">{t("productivity.monthly")}</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {trend.hasEnoughData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip content={<ChartTooltip locale={locale} />} />
                  <Line type="monotone" dataKey="completed" name={t("productivity.completedSeries")} stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="total" name={t("productivity.totalSeries")} stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md bg-muted/40 px-6 text-center text-sm text-muted-foreground">
              {t("productivity.noHistory")}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("productivity.sectionChartTitle")}</CardTitle>
            <CardSubtitle>{t("workflow.subtitle")}</CardSubtitle>
          </div>
        </CardHeader>
        <CardContent>
          {sectionData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("workflow.empty")}</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<ChartTooltip locale={locale} />} />
                  <Bar dataKey={t("common.tasks")} fill="var(--chart-2)" radius={[0, 4, 4, 0]} maxBarSize={14} />
                  <Bar dataKey={t("outputs.unit")} fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
