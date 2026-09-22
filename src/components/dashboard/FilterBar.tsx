"use client";

import { useMemo } from "react";
import { useLocale } from "@/context/LocaleProvider";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { DashboardFilters, DateRangePreset, StatusFilterValue } from "@/lib/analytics/types";
import type { CustomFieldDefinition, DashboardUser, Section } from "@/lib/models";

const STATUS_OPTIONS: { value: StatusFilterValue; labelKey: string }[] = [
  { value: "completed", labelKey: "filters.statusCompleted" },
  { value: "open", labelKey: "filters.statusOpen" },
  { value: "overdue", labelKey: "filters.statusOverdue" },
  { value: "due_today", labelKey: "filters.statusDueToday" },
  { value: "upcoming", labelKey: "filters.statusUpcoming" },
  { value: "unassigned", labelKey: "filters.statusUnassigned" },
];

export function FilterBar({
  filters,
  onChange,
  onReset,
  users,
  sections,
  customFieldDefinitions,
}: {
  filters: DashboardFilters;
  onChange: (patch: Partial<DashboardFilters>) => void;
  onReset: () => void;
  users: DashboardUser[];
  sections: Section[];
  customFieldDefinitions: CustomFieldDefinition[];
}) {
  const { t } = useLocale();

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.dateRange.preset !== "all") n++;
    n += filters.assigneeIds.length > 0 ? 1 : 0;
    n += filters.sectionIds.length > 0 ? 1 : 0;
    n += filters.statuses.length > 0 ? 1 : 0;
    n += Object.values(filters.customFields).filter((v) => v.length > 0).length;
    n += filters.search.trim() ? 1 : 0;
    return n;
  }, [filters]);

  const filterableCustomFields = customFieldDefinitions.filter(
    (f) => (f.type === "enum" || f.type === "multi_enum") && f.options.length > 0
  );

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[220px] flex-1">
            <Input
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder={t("filters.searchPlaceholder")}
              aria-label={t("common.search")}
            />
          </div>

          <Select
            value={filters.dateRange.preset}
            onChange={(e) => onChange({ dateRange: { ...filters.dateRange, preset: e.target.value as DateRangePreset } })}
            aria-label={t("filters.dateRange")}
          >
            <option value="all">{t("filters.dateRange")}: {t("common.all")}</option>
            <option value="today">{t("filters.today")}</option>
            <option value="this_week">{t("filters.thisWeek")}</option>
            <option value="this_month">{t("filters.thisMonth")}</option>
            <option value="custom">{t("filters.custom")}</option>
          </Select>

          {filters.dateRange.preset === "custom" && (
            <div className="flex items-center gap-1">
              <Input
                type="date"
                className="h-8 w-36 text-xs"
                value={filters.dateRange.from ?? ""}
                onChange={(e) => onChange({ dateRange: { ...filters.dateRange, from: e.target.value || null } })}
                aria-label={t("filters.from")}
              />
              <span className="text-xs text-muted-foreground">{t("filters.to")}</span>
              <Input
                type="date"
                className="h-8 w-36 text-xs"
                value={filters.dateRange.to ?? ""}
                onChange={(e) => onChange({ dateRange: { ...filters.dateRange, to: e.target.value || null } })}
                aria-label={t("filters.to")}
              />
            </div>
          )}

          <MultiSelect
            label={t("filters.assignee")}
            className="w-48"
            options={users.map((u) => ({ value: u.id, label: u.name }))}
            selected={filters.assigneeIds}
            onChange={(assigneeIds) => onChange({ assigneeIds })}
            placeholder={t("common.all")}
          />

          <MultiSelect
            label={t("filters.section")}
            className="w-48"
            options={sections.map((s) => ({ value: s.id, label: s.name }))}
            selected={filters.sectionIds}
            onChange={(sectionIds) => onChange({ sectionIds })}
            placeholder={t("common.all")}
          />

          <MultiSelect
            label={t("filters.status")}
            className="w-48"
            options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            selected={filters.statuses}
            onChange={(statuses) => onChange({ statuses: statuses as StatusFilterValue[] })}
            placeholder={t("common.all")}
          />

          {filterableCustomFields.map((field) => (
            <MultiSelect
              key={field.id}
              label={field.name}
              className="w-48"
              options={field.options.map((opt) => ({ value: opt, label: opt }))}
              selected={filters.customFields[field.id] ?? []}
              onChange={(values) => onChange({ customFields: { ...filters.customFields, [field.id]: values } })}
              placeholder={t("common.all")}
            />
          ))}

          {activeCount > 0 && (
            <Button size="sm" variant="ghost" onClick={onReset}>
              {t("common.clearAll")} ({activeCount})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
