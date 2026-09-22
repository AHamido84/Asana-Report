import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { DailySnapshot, NormalizedDataset } from "../models";
import { getOutputCount } from "../analytics/outputs";

/**
 * Snapshot system: persists one JSON file per day summarizing dataset
 * state, so trend charts (completion/workload/overdue over time) can be
 * built once enough history accumulates. Asana's API does not expose
 * historical task-state timeseries, so trends can only be derived from
 * snapshots captured going forward — see README "Historical data" section.
 *
 * This is a pluggable, file-based implementation suitable for local dev or
 * a persistent server. On ephemeral serverless filesystems (e.g. Vercel),
 * writes only last for the lifetime of the instance — swap `SnapshotStore`
 * for a KV/Redis/DB-backed implementation for durable production use
 * without changing any caller.
 */

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function computeSnapshot(dataset: NormalizedDataset): DailySnapshot {
  const today = todayKey();
  const tasksBySection: Record<string, number> = {};
  const tasksByAssignee: Record<string, number> = {};
  let completed = 0;
  let overdue = 0;
  let unassigned = 0;
  let totalOutputs = 0;
  let completedOutputs = 0;

  for (const task of dataset.tasks) {
    const sectionKey = task.sectionName ?? "No Section";
    tasksBySection[sectionKey] = (tasksBySection[sectionKey] ?? 0) + 1;

    const assigneeKey = task.assigneeName ?? "Unassigned";
    tasksByAssignee[assigneeKey] = (tasksByAssignee[assigneeKey] ?? 0) + 1;

    const outputCount = getOutputCount(task);
    totalOutputs += outputCount;
    if (task.completed) {
      completed += 1;
      completedOutputs += outputCount;
    }
    if (!task.assigneeId) unassigned += 1;
    if (!task.completed && task.dueOn && task.dueOn < today) overdue += 1;
  }

  return {
    date: today,
    totalTasks: dataset.tasks.length,
    completedTasks: completed,
    openTasks: dataset.tasks.length - completed,
    overdueTasks: overdue,
    unassignedTasks: unassigned,
    tasksBySection,
    tasksByAssignee,
    totalOutputs,
    completedOutputs,
  };
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
}

/** Writes today's snapshot, overwriting any prior snapshot from the same day. */
export async function recordSnapshotIfNeeded(dataset: NormalizedDataset): Promise<void> {
  try {
    await ensureDir();
    const snapshot = computeSnapshot(dataset);
    const filePath = path.join(SNAPSHOT_DIR, `${snapshot.date}.json`);
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
  } catch {
    // Non-fatal: snapshot persistence is a best-effort enhancement.
    // A read-only filesystem (common on serverless) must never break sync.
  }
}

export async function listSnapshots(): Promise<DailySnapshot[]> {
  try {
    await ensureDir();
    const files = (await fs.readdir(SNAPSHOT_DIR)).filter((f) => f.endsWith(".json"));
    const snapshots = await Promise.all(
      files.map(async (file) => {
        const raw = await fs.readFile(path.join(SNAPSHOT_DIR, file), "utf-8");
        return JSON.parse(raw) as DailySnapshot;
      })
    );
    return snapshots.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}
