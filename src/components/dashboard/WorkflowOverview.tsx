"use client";

import { useLocale } from "@/context/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import type { SectionBreakdown } from "@/lib/analytics/types";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function WorkflowOverview({
  sections,
  activeSectionIds,
  onToggleSection,
}: {
  sections: SectionBreakdown[];
  activeSectionIds: string[];
  onToggleSection: (sectionId: string) => void;
}) {
  const { locale, t } = useLocale();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("workflow.title")}</CardTitle>
          <CardSubtitle>{t("workflow.subtitle")}</CardSubtitle>
        </div>
      </CardHeader>
      <CardContent>
        {sections.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("workflow.empty")}</p>
        ) : (
          <>
            {/* Pipeline visualization */}
            <div className="mb-6 flex items-stretch gap-1 overflow-x-auto pb-2">
              {sections.map((section, i) => (
                <div key={section.id} className="flex items-center">
                  <button
                    onClick={() => onToggleSection(section.id)}
                    className={cn(
                      "flex min-w-[136px] flex-col gap-1 rounded-md border border-border px-3 py-2 text-start transition-all hover:-translate-y-0.5",
                      activeSectionIds.includes(section.id) && "ring-2 ring-primary"
                    )}
                    style={{ borderTopColor: CHART_COLORS[i % CHART_COLORS.length], borderTopWidth: 3 }}
                  >
                    <span className="truncate text-xs font-medium text-foreground">{section.name}</span>
                    <span className="text-lg font-semibold tabular-nums">{formatNumber(section.taskCount, locale)}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {t("common.tasks")} · {formatNumber(section.outputCount, locale)} {t("outputs.unit")}
                    </span>
                  </button>
                  {i < sections.length - 1 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" className="mx-0.5 shrink-0 rtl:rotate-180">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  )}
                </div>
              ))}
            </div>

            {/* Outputs by Type — Type | Tasks | Outputs | Completed Outputs | Pending Outputs | Completion Rate */}
            <Table>
              <THead>
                <TR>
                  <TH>{t("workflow.colType")}</TH>
                  <TH>{t("workflow.colTasks")}</TH>
                  <TH>{t("workflow.colOutputs")}</TH>
                  <TH>{t("workflow.colCompletedOutputs")}</TH>
                  <TH>{t("workflow.colPendingOutputs")}</TH>
                  <TH>{t("workflow.colCompletionRate")}</TH>
                </TR>
              </THead>
              <TBody>
                {sections.map((section, i) => (
                  <TR
                    key={section.id}
                    className={cn("cursor-pointer", activeSectionIds.includes(section.id) && "bg-muted")}
                    onClick={() => onToggleSection(section.id)}
                  >
                    <TD className="font-medium text-foreground">
                      <span
                        className="me-2 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      {section.name}
                    </TD>
                    <TD className="tabular-nums">{formatNumber(section.taskCount, locale)}</TD>
                    <TD className="tabular-nums font-medium">{formatNumber(section.outputCount, locale)}</TD>
                    <TD className="tabular-nums text-[var(--success-text)]">{formatNumber(section.completedOutputCount, locale)}</TD>
                    <TD className="tabular-nums">{formatNumber(section.pendingOutputCount, locale)}</TD>
                    <TD className="w-36">
                      <div className="flex items-center gap-2">
                        <Progress value={section.outputCompletionRate} className="h-1.5 w-16" color={CHART_COLORS[i % CHART_COLORS.length]} />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatPercent(section.outputCompletionRate, locale)}
                        </span>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
