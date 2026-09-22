"use client";

import { useLocale } from "@/context/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatNumber } from "@/lib/utils";
import type { OverdueRow } from "@/lib/analytics/types";

export function OverdueTable({ rows }: { rows: OverdueRow[] }) {
  const { locale, t } = useLocale();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("health.overdueTitle")}</CardTitle>
          <CardSubtitle>
            {rows.length} {t("common.tasks")}
          </CardSubtitle>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("health.overdueEmpty")}</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <THead>
                <TR>
                  <TH>{t("health.colTask")}</TH>
                  <TH>{t("health.colAssignee")}</TH>
                  <TH>{t("health.colSection")}</TH>
                  <TH>{t("health.colDueDate")}</TH>
                  <TH>{t("health.colDaysOverdue")}</TH>
                  <TH>{t("health.colAsana")}</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <TR key={row.taskId}>
                    <TD className="max-w-[240px] truncate font-medium text-foreground">{row.taskName}</TD>
                    <TD className="text-muted-foreground">{row.assigneeName ?? t("common.unassigned")}</TD>
                    <TD className="text-muted-foreground">{row.sectionName ?? t("common.noSection")}</TD>
                    <TD>{formatDate(row.dueOn, locale)}</TD>
                    <TD>
                      <Badge tone="danger">{formatNumber(row.daysOverdue, locale)} {t("common.days")}</Badge>
                    </TD>
                    <TD>
                      <a
                        href={row.permalinkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                        aria-label={t("common.openInAsana")}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                          <path d="M15 3h6v6M10 14L21 3" />
                        </svg>
                      </a>
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
