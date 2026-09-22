"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  active,
  onClick,
  accent,
  icon,
  suffix,
}: {
  label: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
  accent?: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
  icon?: ReactNode;
  suffix?: ReactNode;
}) {
  const accentColor: Record<NonNullable<typeof accent>, string> = {
    primary: "var(--primary)",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
    info: "var(--info)",
    neutral: "var(--muted-foreground)",
  };

  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={cn(
        "group flex flex-col justify-between rounded-lg border border-border bg-surface p-4 text-start shadow-card transition-all duration-150 animate-slide-up",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-raised",
        active && "ring-2 ring-offset-0"
      )}
      style={active ? ({ "--tw-ring-color": accentColor[accent ?? "primary"] } as React.CSSProperties) : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: `color-mix(in srgb, ${accentColor[accent ?? "primary"]} 14%, transparent)`, color: accentColor[accent ?? "primary"] }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2">
        <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      </div>
      {suffix}
    </Comp>
  );
}
