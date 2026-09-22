import type { Task } from "../models";

/**
 * Shared task status predicates. Split out from engine.ts so both the core
 * analytics engine and the outputs module (lib/analytics/outputs.ts) can use
 * the same definitions without importing each other.
 */

export function isOverdue(task: Task, today: string): boolean {
  return !task.completed && !!task.dueOn && task.dueOn < today;
}

export function isDueToday(task: Task, today: string): boolean {
  return !task.completed && task.dueOn === today;
}

export function isUpcoming(task: Task, today: string): boolean {
  return !task.completed && !!task.dueOn && task.dueOn > today;
}
