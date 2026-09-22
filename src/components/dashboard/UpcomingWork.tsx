"use client";

import { useState } from "react";
import { useLocale } from "@/context/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { filterUpcomingByHorizon } from "@/lib/analytics/engine";
import type { UpcomingHorizon, UpcomingRow } from "@/lib/analytics/types";

const HORIZONS: { value: UpcomingHorizon; labelKey: string }[] = [
  { value: "today", labelKey: "upcoming.today" },
  { value: "tomorrow", labelKey: "upcoming.tomorrow" },
  { value: "next_7", labelKey: "upcoming.next7" },
  { value: "next_14", labelKey: "upcoming.next14" },
  { value: "next_30", labelKey: "upcoming.next30" },
];

export function UpcomingWork({ rows }: { rows: UpcomingRow[] }) {
  const { locale, t } = useLocale();
  const [horizon, setHorizon] = useState<UpcomingHorizon>("next_7");
  const filtered = filterUpcomingByHorizon(rows, horizon);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("upcoming.title")}</CardTitle>
          <CardSubtitle>{t("upcoming.subtitle")}</CardSubtitle>
        </div>
        <div className="flex flex-wrap gap-1">
          {HORIZONS.map((h) => (
            <Button
              key={h.value}
              size="sm"
              variant={horizon === h.value ? "primary" : "outline"}
              onClick={() => setHorizon(h.value)}
            >
              {t(h.labelKey)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("upcoming.empty")}</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <THead>
                <TR>
                  <TH>{t("upcoming.colTask")}</TH>
                  <TH>{t("upcoming.colAssignee")}</TH>
                  <TH>{t("upcoming.colSection")}</TH>
                  <TH>{t("upcoming.colDueDate")}</TH>
                  <TH>{t("upcoming.colDaysRemaining")}</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((row) => (
                  <TR key={row.taskId}>
                    <TD className="max-w-[240px] truncate font-medium">
                      <a href={row.permalinkUrl} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">
                        {row.taskName}
                      </a>
                    </TD>
                    <TD className="text-muted-foreground">{row.assigneeName ?? t("common.unassigned")}</TD>
                    <TD className="text-muted-foreground">{row.sectionName ?? t("common.noSection")}</TD>
                    <TD>{formatDate(row.dueOn, locale)}</TD>
                    <TD className={cn(row.daysRemaining <= 1 && "font-medium text-[var(--warning)]")}>
                      {formatNumber(row.daysRemaining, locale)} {t("common.days")}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
