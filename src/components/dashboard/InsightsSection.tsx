"use client";

import { useLocale } from "@/context/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/analytics/types";

const toneStyles: Record<Insight["tone"], string> = {
  neutral: "border-s-4 border-s-[var(--info)]",
  positive: "border-s-4 border-s-[var(--success)]",
  attention: "border-s-4 border-s-[var(--warning)]",
};

export function InsightsSection({ insights }: { insights: Insight[] }) {
  const { t } = useLocale();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("insights.title")}</CardTitle>
          <CardSubtitle>{t("insights.subtitle")}</CardSubtitle>
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("insights.empty")}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {insights.map((insight) => (
              <li key={insight.id} className={cn("rounded-md bg-muted/50 p-3 text-sm text-foreground", toneStyles[insight.tone])}>
                {insight.text}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
