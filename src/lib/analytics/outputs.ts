import type { Task } from "../models";
import { pct } from "../utils";
import { isOverdue } from "./status";

/**
 * ============================================================================
 * FINAL OUTPUT COUNTING BUSINESS RULE — single source of truth.
 *
 *   Attachments > 0  →  Output Count = number of attachments
 *   Attachments = 0  →  Output Count = 1
 *
 * A task always represents at least one expected deliverable, even before a
 * final file has been attached to it. This function is the ONLY place this
 * logic is implemented — every KPI, breakdown, chart, and export that shows
 * "Outputs" (or Deliverables/Production/Produced) must go through it rather
 * than re-deriving the number from `task.attachmentCount` directly.
 * ============================================================================
 */
export function getOutputCount(task: Task): number {
  const attachmentCount = task.attachmentCount ?? 0;
  return attachmentCount > 0 ? attachmentCount : 1;
}

export interface TaskOutputAnalytics {
  taskId: string;
  taskName: string;
  /** The Asana section a task belongs to, treated as its deliverable type. */
  deliverableType: string;
  attachmentCount: number;
  outputCount: number;
  completed: boolean;
  completedOutputCount: number;
  pendingOutputCount: number;
  overdueOutputCount: number;
}

export function computeTaskOutputAnalytics(task: Task, today: string): TaskOutputAnalytics {
  const outputCount = getOutputCount(task);
  const overdue = isOverdue(task, today);

  return {
    taskId: task.id,
    taskName: task.name,
    deliverableType: task.sectionName ?? "No Section",
    attachmentCount: task.attachmentCount ?? 0,
    outputCount,
    completed: task.completed,
    completedOutputCount: task.completed ? outputCount : 0,
    pendingOutputCount: task.completed ? 0 : outputCount,
    overdueOutputCount: overdue ? outputCount : 0,
  };
}

export interface OutputTotals {
  totalOutputs: number;
  completedOutputs: number;
  pendingOutputs: number;
  overdueOutputs: number;
  dueTodayOutputs: number;
  /** Completed Outputs / Total Outputs × 100 — the canonical Completion Rate. */
  completionRate: number;
  averageOutputsPerTask: number;
  tasksWithAttachments: number;
  tasksWithoutAttachments: number;
  /** Tasks With Attachments / Total Tasks × 100 — operational metric, not a primary KPI. */
  attachmentRatio: number;
}

/**
 * Computes every aggregate Output metric from a task list in a single pass.
 * All figures here derive exclusively from `getOutputCount()` — never from
 * `tasks.length` — per the Output Counting Business Rule.
 */
export function computeOutputTotals(tasks: Task[], today: string): OutputTotals {
  let totalOutputs = 0;
  let completedOutputs = 0;
  let pendingOutputs = 0;
  let overdueOutputs = 0;
  let dueTodayOutputs = 0;
  let tasksWithAttachments = 0;

  for (const task of tasks) {
    const outputCount = getOutputCount(task);
    totalOutputs += outputCount;

    if (task.completed) {
      completedOutputs += outputCount;
    } else {
      pendingOutputs += outputCount;
    }

    if (isOverdue(task, today)) {
      overdueOutputs += outputCount;
    }
    if (!task.completed && task.dueOn === today) {
      dueTodayOutputs += outputCount;
    }
    if ((task.attachmentCount ?? 0) > 0) {
      tasksWithAttachments += 1;
    }
  }

  const totalTasks = tasks.length;
  const tasksWithoutAttachments = totalTasks - tasksWithAttachments;

  return {
    totalOutputs,
    completedOutputs,
    pendingOutputs,
    overdueOutputs,
    dueTodayOutputs,
    completionRate: pct(completedOutputs, totalOutputs),
    averageOutputsPerTask: totalTasks > 0 ? Math.round((totalOutputs / totalTasks) * 10) / 10 : 0,
    tasksWithAttachments,
    tasksWithoutAttachments,
    attachmentRatio: pct(tasksWithAttachments, totalTasks),
  };
}
