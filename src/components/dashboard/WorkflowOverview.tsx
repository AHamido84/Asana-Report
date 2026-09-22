"use client";

import { useLocale } from "@/context/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
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
                      "flex min-w-[128px] flex-col gap-1 rounded-md border border-border px-3 py-2 text-start transition-all hover:-translate-y-0.5",
                      activeSectionIds.includes(section.id) && "ring-2 ring-primary"
                    )}
                    style={{ borderTopColor: CHART_COLORS[i % CHART_COLORS.length], borderTopWidth: 3 }}
                  >
                    <span className="truncate text-xs font-medium text-foreground">{section.name}</span>
                    <span className="text-lg font-semibold tabular-nums">{formatNumber(section.taskCount, locale)}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatPercent(section.shareOfTotal, locale)} {t("common.of")} {t("common.tasks")}
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

            {/* Detailed breakdown */}
            <div className="space-y-3">
              {sections.map((section, i) => (
                <button
                  key={section.id}
                  onClick={() => onToggleSection(section.id)}
                  className={cn(
                    "block w-full rounded-md p-2 text-start transition-colors hover:bg-muted",
                    activeSectionIds.includes(section.id) && "bg-muted"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{section.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatNumber(section.taskCount, locale)} {t("common.tasks")} · {t("workflow.completion")}{" "}
                      {formatPercent(section.completionRate, locale)}
                    </span>
                  </div>
                  <Progress value={section.completionRate} color={CHART_COLORS[i % CHART_COLORS.length]} />
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
