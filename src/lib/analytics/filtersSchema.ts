import { z } from "zod";
import { DEFAULT_FILTERS, type DashboardFilters } from "./types";

const dateRangeSchema = z.object({
  preset: z.enum(["all", "today", "this_week", "this_month", "custom"]),
  from: z.string().nullable(),
  to: z.string().nullable(),
});

const filtersSchema = z.object({
  dateRange: dateRangeSchema,
  assigneeIds: z.array(z.string()),
  sectionIds: z.array(z.string()),
  statuses: z.array(z.enum(["completed", "open", "overdue", "due_today", "upcoming", "unassigned"])),
  customFields: z.record(z.array(z.string())),
  search: z.string(),
});

/** Parses untrusted filter JSON from a query param or request body, falling back to defaults on any mismatch. */
export function parseFilters(raw: unknown): DashboardFilters {
  const result = filtersSchema.safeParse(raw);
  return result.success ? (result.data as DashboardFilters) : DEFAULT_FILTERS;
}

export function parseFiltersFromString(raw: string | null): DashboardFilters {
  if (!raw) return DEFAULT_FILTERS;
  try {
    return parseFilters(JSON.parse(raw));
  } catch {
    return DEFAULT_FILTERS;
  }
}
