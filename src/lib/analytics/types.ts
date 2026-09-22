import type { Task } from "../models";
import type { OutputTotals } from "./outputs";

export type { OutputTotals, TaskOutputAnalytics } from "./outputs";

export type StatusFilterValue = "completed" | "open" | "overdue" | "due_today" | "upcoming" | "unassigned";
export type DateRangePreset = "all" | "today" | "this_week" | "this_month" | "custom";

export interface DateRangeFilter {
  preset: DateRangePreset;
  from: string | null; // YYYY-MM-DD, used when preset === "custom"
  to: string | null;
}

export interface DashboardFilters {
  dateRange: DateRangeFilter;
  assigneeIds: string[]; // empty = all assignees
  sectionIds: string[]; // empty = all sections
  statuses: StatusFilterValue[]; // empty = all statuses
  customFields: Record<string, string[]>; // customFieldId -> selected values
  search: string;
}

export const DEFAULT_FILTERS: DashboardFilters = {
  dateRange: { preset: "all", from: null, to: null },
  assigneeIds: [],
  sectionIds: [],
  statuses: [],
  customFields: {},
  search: "",
};

export interface Kpis {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  /**
   * 0-100. Per the Output Counting Business Rule, this is
   * Completed Outputs / Total Outputs — NOT completed tasks / total tasks.
   * See lib/analytics/outputs.ts.
   */
  completionRate: number;
  unassigned: number;
}

export interface SectionBreakdown {
  id: string;
  name: string;
  position: number;
  taskCount: number;
  shareOfTotal: number; // 0-100
  completedCount: number;
  /** @deprecated task-based rate, kept for internal use — UI should read outputCompletionRate */
  completionRate: number; // 0-100
  /** Section treated as Deliverable Type — output totals per the Output Counting Business Rule. */
  outputCount: number;
  outputShareOfTotal: number; // 0-100
  completedOutputCount: number;
  pendingOutputCount: number;
  outputCompletionRate: number; // 0-100
}

export interface AssigneeWorkload {
  id: string;
  name: string;
  total: number;
  completed: number;
  open: number;
  overdue: number;
  dueToday: number;
  /** @deprecated task-based rate, kept for internal use — UI should read outputCompletionRate */
  completionRate: number;
  /** Output totals per the Output Counting Business Rule (see lib/analytics/outputs.ts). */
  outputCount: number;
  completedOutputCount: number;
  pendingOutputCount: number;
  overdueOutputCount: number;
  outputCompletionRate: number;
}

export type AgingBucketKey = "0-2" | "3-7" | "8-14" | "15-30" | "30+";

export interface AgingBucket {
  key: AgingBucketKey;
  label: string;
  count: number;
  share: number; // 0-100
}

export interface OverdueRow {
  taskId: string;
  taskName: string;
  assigneeName: string | null;
  sectionName: string | null;
  dueOn: string;
  daysOverdue: number;
  permalinkUrl: string;
}

export type UpcomingHorizon = "today" | "tomorrow" | "next_7" | "next_14" | "next_30";

export interface UpcomingRow {
  taskId: string;
  taskName: string;
  assigneeName: string | null;
  sectionName: string | null;
  dueOn: string;
  daysRemaining: number;
  permalinkUrl: string;
}

export interface Insight {
  id: string;
  tone: "neutral" | "positive" | "attention";
  text: string;
}

export type TrendGranularity = "daily" | "weekly" | "monthly";

export interface TrendPoint {
  label: string;
  date: string;
  completedTasks: number;
  totalTasks: number;
  openTasks: number;
  /** Output-counted equivalents, per the Output Counting Business Rule. */
  completedOutputs: number;
  totalOutputs: number;
}

export type TrendMetric = "tasks" | "outputs";

export interface AnalyticsResult {
  referenceDate: string;
  filteredTaskCount: number;
  kpis: Kpis;
  /** Sections doubling as Deliverable Types — see SectionBreakdown's output fields. */
  sections: SectionBreakdown[];
  /** Outputs by Assignee — see AssigneeWorkload's output fields. */
  workload: AssigneeWorkload[];
  aging: AgingBucket[];
  overdueRows: OverdueRow[];
  upcomingRows: UpcomingRow[];
  missingDueDateCount: number;
  insights: Insight[];
  executiveSummary: string;
  trend: { hasEnoughData: boolean; points: TrendPoint[]; granularity: TrendGranularity };
  tasks: Task[];
  /** Global Output Counting Business Rule totals — see lib/analytics/outputs.ts. */
  outputs: OutputTotals;
}
