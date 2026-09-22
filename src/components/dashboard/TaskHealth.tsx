"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { useLocale } from "@/context/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { AgingBucket } from "@/lib/analytics/types";

function ChartTooltip({ active, payload, locale }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2 text-xs shadow-raised">
      <p className="font-medium text-foreground">{p.payload.label}</p>
      <p style={{ color: p.color }}>
        {formatNumber(p.value, locale)} ({formatPercent(p.payload.share, locale)})
      </p>
    </div>
  );
}

export function AgingChart({ aging }: { aging: AgingBucket[] }) {
  const { locale, t } = useLocale();
  const total = aging.reduce((s, b) => s + b.count, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("health.agingTitle")}</CardTitle>
          <CardSubtitle>{t("health.agingSubtitle")}</CardSubtitle>
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("workload.empty")}</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RechartsTooltip content={<ChartTooltip locale={locale} />} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="count" fill="var(--chart-4)" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TaskHealthStats({
  missingDueDateCount,
  unassignedCount,
  onClickMissingDueDate,
  onClickUnassigned,
}: {
  missingDueDateCount: number;
  unassignedCount: number;
  onClickMissingDueDate: () => void;
  onClickUnassigned: () => void;
}) {
  const { locale, t } = useLocale();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <button
        onClick={onClickMissingDueDate}
        className="rounded-lg border border-border bg-surface p-4 text-start shadow-card transition-transform hover:-translate-y-0.5 hover:shadow-raised"
      >
        <p className="text-xs font-medium text-muted-foreground">{t("health.missingDueDateTitle")}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{formatNumber(missingDueDateCount, locale)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("health.missingDueDateBody", { count: missingDueDateCount })}</p>
      </button>
      <button
        onClick={onClickUnassigned}
        className="rounded-lg border border-border bg-surface p-4 text-start shadow-card transition-transform hover:-translate-y-0.5 hover:shadow-raised"
      >
        <p className="text-xs font-medium text-muted-foreground">{t("health.unassignedTitle")}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{formatNumber(unassignedCount, locale)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("health.unassignedBody", { count: unassignedCount })}</p>
      </button>
    </div>
  );
}
