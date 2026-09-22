"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { useLocale } from "@/context/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { Progress } from "@/components/ui/Progress";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import type { AssigneeWorkload } from "@/lib/analytics/types";

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

export function TeamWorkload({
  workload,
  activeAssigneeIds,
  onToggleAssignee,
}: {
  workload: AssigneeWorkload[];
  activeAssigneeIds: string[];
  onToggleAssignee: (id: string) => void;
}) {
  const { locale, t } = useLocale();
  const chartData = workload.slice(0, 12).map((w) => ({ name: w.name, [t("workload.completed")]: w.completed, [t("workload.open")]: w.open }));

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("workload.title")}</CardTitle>
          <CardSubtitle>{t("workload.subtitle")}</CardSubtitle>
        </div>
      </CardHeader>
      <CardContent>
        {workload.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("workload.empty")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} stackOffset="sign">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<ChartTooltip locale={locale} />} />
                  <Bar dataKey={t("workload.completed")} stackId="a" fill="var(--chart-3)" radius={[0, 0, 0, 0]} maxBarSize={16} />
                  <Bar dataKey={t("workload.open")} stackId="a" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="max-h-[320px] overflow-y-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>{t("filters.assignee")}</TH>
                    <TH>{t("workload.total")}</TH>
                    <TH>{t("workload.overdue")}</TH>
                    <TH>{t("workload.completionRate")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {workload.map((w) => (
                    <TR
                      key={w.id}
                      className={cn("cursor-pointer", activeAssigneeIds.includes(w.id) && "bg-muted")}
                      onClick={() => onToggleAssignee(w.id)}
                    >
                      <TD className="font-medium text-foreground">{w.name}</TD>
                      <TD className="tabular-nums">{formatNumber(w.total, locale)}</TD>
                      <TD>
                        {w.overdue > 0 ? (
                          <span className="font-medium text-[var(--danger)]">{formatNumber(w.overdue, locale)}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TD>
                      <TD className="w-32">
                        <div className="flex items-center gap-2">
                          <Progress value={w.completionRate} className="h-1.5 w-16" />
                          <span className="text-xs tabular-nums text-muted-foreground">{formatPercent(w.completionRate, locale)}</span>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
