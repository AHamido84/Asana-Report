import type { DashboardUser, NormalizedDataset, Section, Task, DailySnapshot } from "../models";
import {
  addDaysToKey,
  diffInDays,
  endOfMonthKey,
  formatNumber,
  formatPercent,
  pct,
  startOfMonthKey,
  startOfWeekKey,
} from "../utils";
import { isDueToday, isOverdue, isUpcoming } from "./status";
import { computeOutputTotals, getOutputCount } from "./outputs";
import type {
  AgingBucket,
  AgingBucketKey,
  AnalyticsResult,
  AssigneeWorkload,
  DashboardFilters,
  Insight,
  Kpis,
  OutputTotals,
  OverdueRow,
  SectionBreakdown,
  StatusFilterValue,
  TrendGranularity,
  TrendPoint,
  UpcomingHorizon,
  UpcomingRow,
} from "./types";

type Locale = "en" | "ar";

export { isDueToday, isOverdue, isUpcoming };

function matchesDateRange(task: Task, filters: DashboardFilters, today: string): boolean {
  const { dateRange } = filters;
  if (dateRange.preset === "all") return true;
  if (!task.dueOn) return false;

  if (dateRange.preset === "today") return task.dueOn === today;
  if (dateRange.preset === "this_week") {
    const start = startOfWeekKey(today);
    const end = addDaysToKey(start, 6);
    return task.dueOn >= start && task.dueOn <= end;
  }
  if (dateRange.preset === "this_month") {
    return task.dueOn >= startOfMonthKey(today) && task.dueOn <= endOfMonthKey(today);
  }
  if (dateRange.preset === "custom") {
    if (dateRange.from && task.dueOn < dateRange.from) return false;
    if (dateRange.to && task.dueOn > dateRange.to) return false;
    return true;
  }
  return true;
}

function matchesCustomFields(task: Task, selections: Record<string, string[]>): boolean {
  const entries = Object.entries(selections).filter(([, values]) => values.length > 0);
  if (entries.length === 0) return true;

  return entries.every(([fieldId, selectedValues]) => {
    const field = task.customFields.find((f) => f.id === fieldId);
    if (!field) return false;
    if (Array.isArray(field.value)) {
      return field.value.some((v) => selectedValues.includes(v));
    }
    if (field.value === null || field.value === undefined) return false;
    return selectedValues.includes(String(field.value));
  });
}

function matchesSearch(task: Task, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  if (task.name.toLowerCase().includes(q)) return true;
  if (task.assigneeName?.toLowerCase().includes(q)) return true;
  if (task.sectionName?.toLowerCase().includes(q)) return true;
  if (task.customFields.some((f) => f.displayValue?.toLowerCase().includes(q))) return true;
  if (task.tags.some((t) => t.name.toLowerCase().includes(q))) return true;
  return false;
}

/** Applies every filter except status (status is layered on separately since KPI cards drive it). */
export function applyFilters(tasks: Task[], filters: DashboardFilters, today: string): Task[] {
  return tasks.filter((task) => {
    if (task.isSubtask) return false;
    if (filters.assigneeIds.length > 0) {
      if (!task.assigneeId || !filters.assigneeIds.includes(task.assigneeId)) return false;
    }
    if (filters.sectionIds.length > 0) {
      if (!task.sectionId || !filters.sectionIds.includes(task.sectionId)) return false;
    }
    if (!matchesDateRange(task, filters, today)) return false;
    if (!matchesCustomFields(task, filters.customFields)) return false;
    if (!matchesSearch(task, filters.search)) return false;
    return true;
  });
}

function matchesStatus(task: Task, status: StatusFilterValue, today: string): boolean {
  switch (status) {
    case "completed":
      return task.completed;
    case "open":
      return !task.completed;
    case "overdue":
      return isOverdue(task, today);
    case "due_today":
      return isDueToday(task, today);
    case "upcoming":
      return isUpcoming(task, today);
    case "unassigned":
      return !task.assigneeId;
  }
}

export function applyStatusFilter(tasks: Task[], statuses: StatusFilterValue[], today: string): Task[] {
  if (statuses.length === 0) return tasks;
  return tasks.filter((task) => statuses.some((s) => matchesStatus(task, s, today)));
}

/**
 * `outputCompletionRate` is threaded in from `computeOutputTotals()` rather
 * than computed here — per the Output Counting Business Rule, Completion
 * Rate is always Completed Outputs / Total Outputs, never a task ratio.
 */
export function computeKpis(tasks: Task[], today: string, outputCompletionRate: number): Kpis {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const overdue = tasks.filter((t) => isOverdue(t, today)).length;
  const dueToday = tasks.filter((t) => isDueToday(t, today)).length;
  const weekEnd = addDaysToKey(today, 7);
  const dueThisWeek = tasks.filter((t) => !t.completed && t.dueOn && t.dueOn >= today && t.dueOn <= weekEnd).length;
  const unassigned = tasks.filter((t) => !t.assigneeId).length;

  return {
    total,
    completed,
    inProgress: total - completed,
    overdue,
    dueToday,
    dueThisWeek,
    completionRate: outputCompletionRate,
    unassigned,
  };
}

/** Builds one SectionBreakdown row — sections double as Deliverable Types. */
function buildSectionBreakdown(id: string, name: string, position: number, sectionTasks: Task[], totalTasks: number, totalOutputs: number): SectionBreakdown {
  const completedCount = sectionTasks.filter((t) => t.completed).length;
  let outputCount = 0;
  let completedOutputCount = 0;
  for (const task of sectionTasks) {
    const count = getOutputCount(task);
    outputCount += count;
    if (task.completed) completedOutputCount += count;
  }

  return {
    id,
    name,
    position,
    taskCount: sectionTasks.length,
    shareOfTotal: pct(sectionTasks.length, totalTasks),
    completedCount,
    completionRate: pct(completedCount, sectionTasks.length),
    outputCount,
    outputShareOfTotal: pct(outputCount, totalOutputs),
    completedOutputCount,
    pendingOutputCount: outputCount - completedOutputCount,
    outputCompletionRate: pct(completedOutputCount, outputCount),
  };
}

export function computeSections(tasks: Task[], sections: Section[]): SectionBreakdown[] {
  const total = tasks.length;
  const totalOutputs = tasks.reduce((sum, t) => sum + getOutputCount(t), 0);
  const grouped = new Map<string, Task[]>();
  const noSectionKey = "__no_section__";

  for (const task of tasks) {
    const key = task.sectionId ?? noSectionKey;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(task);
  }

  const result: SectionBreakdown[] = sections.map((section) =>
    buildSectionBreakdown(section.id, section.name, section.position, grouped.get(section.id) ?? [], total, totalOutputs)
  );

  const orphanTasks = grouped.get(noSectionKey);
  if (orphanTasks && orphanTasks.length > 0) {
    result.push(buildSectionBreakdown(noSectionKey, "No Section", sections.length, orphanTasks, total, totalOutputs));
  }

  return result.sort((a, b) => a.position - b.position);
}

export function computeWorkload(tasks: Task[], users: DashboardUser[], today: string): AssigneeWorkload[] {
  const grouped = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.assigneeId) continue;
    if (!grouped.has(task.assigneeId)) grouped.set(task.assigneeId, []);
    grouped.get(task.assigneeId)!.push(task);
  }

  return users
    .map((user) => {
      const userTasks = grouped.get(user.id) ?? [];
      const completed = userTasks.filter((t) => t.completed).length;

      let outputCount = 0;
      let completedOutputCount = 0;
      let overdueOutputCount = 0;
      for (const task of userTasks) {
        const count = getOutputCount(task);
        outputCount += count;
        if (task.completed) completedOutputCount += count;
        if (isOverdue(task, today)) overdueOutputCount += count;
      }

      return {
        id: user.id,
        name: user.name,
        total: userTasks.length,
        completed,
        open: userTasks.length - completed,
        overdue: userTasks.filter((t) => isOverdue(t, today)).length,
        dueToday: userTasks.filter((t) => isDueToday(t, today)).length,
        completionRate: pct(completed, userTasks.length),
        outputCount,
        completedOutputCount,
        pendingOutputCount: outputCount - completedOutputCount,
        overdueOutputCount,
        outputCompletionRate: pct(completedOutputCount, outputCount),
      };
    })
    .filter((w) => w.total > 0)
    .sort((a, b) => b.outputCount - a.outputCount);
}

const AGING_BUCKETS: { key: AgingBucketKey; label: string; min: number; max: number }[] = [
  { key: "0-2", label: "0–2 days", min: 0, max: 2 },
  { key: "3-7", label: "3–7 days", min: 3, max: 7 },
  { key: "8-14", label: "8–14 days", min: 8, max: 14 },
  { key: "15-30", label: "15–30 days", min: 15, max: 30 },
  { key: "30+", label: "30+ days", min: 31, max: Infinity },
];

export function computeAging(tasks: Task[], today: string): AgingBucket[] {
  const openTasks = tasks.filter((t) => !t.completed);
  const counts = new Map<AgingBucketKey, number>(AGING_BUCKETS.map((b) => [b.key, 0]));

  for (const task of openTasks) {
    const age = Math.max(0, diffInDays(task.createdAt.slice(0, 10), today));
    const bucket =
      AGING_BUCKETS.find((b) => age >= b.min && age <= b.max) ?? AGING_BUCKETS[AGING_BUCKETS.length - 1]!;
    counts.set(bucket.key, (counts.get(bucket.key) ?? 0) + 1);
  }

  const total = openTasks.length;
  return AGING_BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    count: counts.get(b.key) ?? 0,
    share: pct(counts.get(b.key) ?? 0, total),
  }));
}

export function computeOverdueRows(tasks: Task[], today: string): OverdueRow[] {
  return tasks
    .filter((t) => isOverdue(t, today))
    .map((t) => ({
      taskId: t.id,
      taskName: t.name,
      assigneeName: t.assigneeName,
      sectionName: t.sectionName,
      dueOn: t.dueOn as string,
      daysOverdue: diffInDays(t.dueOn as string, today),
      permalinkUrl: t.permalinkUrl,
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export function computeUpcomingRows(tasks: Task[], today: string, maxDays = 30): UpcomingRow[] {
  const horizon = addDaysToKey(today, maxDays);
  return tasks
    .filter((t) => isUpcoming(t, today) && (t.dueOn as string) <= horizon)
    .map((t) => ({
      taskId: t.id,
      taskName: t.name,
      assigneeName: t.assigneeName,
      sectionName: t.sectionName,
      dueOn: t.dueOn as string,
      daysRemaining: diffInDays(today, t.dueOn as string),
      permalinkUrl: t.permalinkUrl,
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function filterUpcomingByHorizon(rows: UpcomingRow[], horizon: UpcomingHorizon): UpcomingRow[] {
  switch (horizon) {
    case "today":
      return rows.filter((r) => r.daysRemaining === 0);
    case "tomorrow":
      return rows.filter((r) => r.daysRemaining === 1);
    case "next_7":
      return rows.filter((r) => r.daysRemaining <= 7);
    case "next_14":
      return rows.filter((r) => r.daysRemaining <= 14);
    case "next_30":
      return rows.filter((r) => r.daysRemaining <= 30);
  }
}

export function computeMissingDueDateCount(tasks: Task[]): number {
  return tasks.filter((t) => !t.completed && !t.dueOn).length;
}

export function computeInsights(params: {
  kpis: Kpis;
  sections: SectionBreakdown[];
  workload: AssigneeWorkload[];
  outputs: OutputTotals;
  missingDueDateCount: number;
  locale: Locale;
}): Insight[] {
  const { kpis, sections, workload, outputs, missingDueDateCount, locale } = params;
  const insights: Insight[] = [];
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);

  if (kpis.total === 0) return insights;

  const openSections = sections.filter((s) => s.outputCount - s.completedOutputCount > 0);
  const busiestSection = [...openSections].sort(
    (a, b) => b.outputCount - b.completedOutputCount - (a.outputCount - a.completedOutputCount)
  )[0];
  if (busiestSection) {
    const openOutputs = busiestSection.outputCount - busiestSection.completedOutputCount;
    insights.push({
      id: "busiest-section",
      tone: "neutral",
      text: t(
        `There is a high concentration of pending outputs in "${busiestSection.name}" (${openOutputs} pending, ${formatNumber(busiestSection.outputShareOfTotal, locale)}% of all outputs).`,
        `يوجد تركّز مرتفع للمخرجات المعلّقة في قسم "${busiestSection.name}" (${formatNumber(openOutputs, locale)} مخرج معلّق، يمثل ${formatNumber(busiestSection.outputShareOfTotal, locale)}% من إجمالي المخرجات).`
      ),
    });
  }

  if (workload.length > 0) {
    const busiest = [...workload].sort((a, b) => b.pendingOutputCount - a.pendingOutputCount)[0]!;
    if (busiest.pendingOutputCount > 0) {
      insights.push({
        id: "busiest-assignee",
        tone: "neutral",
        text: t(
          `${busiest.name} currently holds the largest pending output workload (${busiest.pendingOutputCount} pending outputs).`,
          `يحمل ${busiest.name} حاليًا أكبر عدد من المخرجات المعلّقة (${formatNumber(busiest.pendingOutputCount, locale)} مخرج).`
        ),
      });
    }
  }

  if (outputs.overdueOutputs > 0) {
    insights.push({
      id: "overdue-count",
      tone: "attention",
      text: t(
        `${outputs.overdueOutputs} output${outputs.overdueOutputs === 1 ? "" : "s"} across ${kpis.overdue} task${kpis.overdue === 1 ? "" : "s"} ${kpis.overdue === 1 ? "is" : "are"} past due and require follow-up.`,
        `توجد ${formatNumber(outputs.overdueOutputs, locale)} مخرج متأخر عبر ${formatNumber(kpis.overdue, locale)} مهمة متأخرة تحتاج إلى متابعة.`
      ),
    });
  }

  if (kpis.total > 0 && kpis.unassigned > 0) {
    insights.push({
      id: "unassigned-share",
      tone: kpis.unassigned / kpis.total > 0.2 ? "attention" : "neutral",
      text: t(
        `${formatPercent(pct(kpis.unassigned, kpis.total), locale)} of tasks (${kpis.unassigned}) have no assignee.`,
        `${formatPercent(pct(kpis.unassigned, kpis.total), locale)} من المهام (${formatNumber(kpis.unassigned, locale)}) بدون مسؤول مُسند.`
      ),
    });
  }

  if (missingDueDateCount > 0) {
    insights.push({
      id: "missing-due-dates",
      tone: "neutral",
      text: t(
        `${missingDueDateCount} open task${missingDueDateCount === 1 ? "" : "s"} do not have a due date set.`,
        `توجد ${formatNumber(missingDueDateCount, locale)} مهمة مفتوحة بدون تاريخ استحقاق محدد.`
      ),
    });
  }

  if (outputs.tasksWithoutAttachments > 0) {
    insights.push({
      id: "attachment-coverage",
      tone: "neutral",
      text: t(
        `${outputs.tasksWithoutAttachments} task${outputs.tasksWithoutAttachments === 1 ? "" : "s"} (${formatPercent(100 - outputs.attachmentRatio, locale)} of all tasks) have no file attached yet — each still counts as one expected output.`,
        `توجد ${formatNumber(outputs.tasksWithoutAttachments, locale)} مهمة (${formatPercent(100 - outputs.attachmentRatio, locale)} من إجمالي المهام) بدون ملف مرفق بعد — وتُحتسب كل واحدة كمخرج متوقع واحد.`
      ),
    });
  }

  return insights;
}

/**
 * Executive summary text is generated entirely from computed numbers —
 * Total/Completed/Pending/Overdue Outputs and the output-based Completion
 * Rate — never invented. See lib/analytics/outputs.ts for how each figure
 * is derived.
 */
export function generateExecutiveSummary(kpis: Kpis, outputs: OutputTotals, locale: Locale): string {
  if (kpis.total === 0) {
    return locale === "ar"
      ? "لا توجد بيانات كافية لعرض ملخص تنفيذي حاليًا."
      : "There is not enough data yet to generate an executive summary.";
  }

  if (locale === "ar") {
    return (
      `يوجد حاليًا ${formatNumber(kpis.total, locale)} مهمة تمثل ${formatNumber(outputs.totalOutputs, locale)} مخرج، ` +
      `تم إنجاز ${formatNumber(outputs.completedOutputs, locale)} مخرج منها (نسبة الإنجاز ${formatPercent(kpis.completionRate, locale)} من إجمالي المخرجات)، ` +
      `بينما يوجد ${formatNumber(outputs.pendingOutputs, locale)} مخرج معلّق. ` +
      `${formatNumber(outputs.overdueOutputs, locale)} مخرج متأخر (عبر ${formatNumber(kpis.overdue, locale)} مهمة) و${formatNumber(kpis.dueToday, locale)} مهمة مستحقة اليوم` +
      `${kpis.unassigned > 0 ? `، و${formatNumber(kpis.unassigned, locale)} مهمة بدون مسؤول مُسند.` : "."}`
    );
  }

  return (
    `There are currently ${formatNumber(kpis.total, locale)} tasks representing ${formatNumber(outputs.totalOutputs, locale)} outputs, ` +
    `with ${formatNumber(outputs.completedOutputs, locale)} outputs completed (${formatPercent(kpis.completionRate, locale)} completion rate based on outputs) ` +
    `and ${formatNumber(outputs.pendingOutputs, locale)} outputs pending. ` +
    `${formatNumber(outputs.overdueOutputs, locale)} output${outputs.overdueOutputs === 1 ? " is" : "s are"} overdue (across ${formatNumber(kpis.overdue, locale)} task${kpis.overdue === 1 ? "" : "s"}) and ${formatNumber(kpis.dueToday, locale)} task${kpis.dueToday === 1 ? " is" : "s are"} due today` +
    `${kpis.unassigned > 0 ? `, with ${formatNumber(kpis.unassigned, locale)} unassigned.` : "."}`
  );
}

function snapshotBucketKey(dateKey: string, granularity: TrendGranularity): string {
  if (granularity === "daily") return dateKey;
  if (granularity === "weekly") return startOfWeekKey(dateKey);
  return startOfMonthKey(dateKey);
}

export function computeTrend(snapshots: DailySnapshot[], granularity: TrendGranularity): AnalyticsResult["trend"] {
  if (snapshots.length < 2) {
    return { hasEnoughData: false, points: [], granularity };
  }

  const buckets = new Map<string, DailySnapshot>();
  for (const snap of snapshots) {
    const key = snapshotBucketKey(snap.date, granularity);
    // Keep the latest snapshot within each bucket (bucket represents period-end state).
    const existing = buckets.get(key);
    if (!existing || snap.date > existing.date) buckets.set(key, snap);
  }

  const points: TrendPoint[] = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucketKey, snap]) => ({
      label: bucketKey,
      date: snap.date,
      completedTasks: snap.completedTasks,
      totalTasks: snap.totalTasks,
      openTasks: snap.openTasks,
      completedOutputs: snap.completedOutputs,
      totalOutputs: snap.totalOutputs,
    }));

  return { hasEnoughData: points.length >= 2, points, granularity };
}

export interface ComputeAnalyticsParams {
  dataset: NormalizedDataset;
  filters: DashboardFilters;
  today: string;
  snapshots: DailySnapshot[];
  trendGranularity: TrendGranularity;
  locale: Locale;
}

/**
 * Single entry point that runs the full analytics pipeline over an already
 * fetched + normalized dataset. Pure and synchronous — no Asana API calls
 * happen here, so it's cheap to re-run whenever filters change.
 */
export function computeAnalytics(params: ComputeAnalyticsParams): AnalyticsResult {
  const { dataset, filters, today, snapshots, trendGranularity, locale } = params;

  const preStatusTasks = applyFilters(dataset.tasks, filters, today);
  const finalTasks = applyStatusFilter(preStatusTasks, filters.statuses, today);

  // Outputs are computed first — Kpis.completionRate and the executive
  // summary/insights are derived from these, per the Output Counting
  // Business Rule (lib/analytics/outputs.ts), not from task counts.
  const outputs = computeOutputTotals(preStatusTasks, today);
  const kpis = computeKpis(preStatusTasks, today, outputs.completionRate);
  const sections = computeSections(preStatusTasks, dataset.sections);
  const workload = computeWorkload(preStatusTasks, dataset.users, today);
  const aging = computeAging(preStatusTasks, today);
  const overdueRows = computeOverdueRows(preStatusTasks, today);
  const upcomingRows = computeUpcomingRows(preStatusTasks, today);
  const missingDueDateCount = computeMissingDueDateCount(preStatusTasks);
  const insights = computeInsights({ kpis, sections, workload, outputs, missingDueDateCount, locale });
  const executiveSummary = generateExecutiveSummary(kpis, outputs, locale);
  const trend = computeTrend(snapshots, trendGranularity);

  return {
    referenceDate: today,
    filteredTaskCount: finalTasks.length,
    kpis,
    sections,
    workload,
    aging,
    overdueRows,
    upcomingRows,
    missingDueDateCount,
    insights,
    executiveSummary,
    trend,
    tasks: finalTasks,
    outputs,
  };
}
