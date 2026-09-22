import "server-only";
import { AsanaClient } from "./client";
import { mapWithConcurrency } from "./concurrency";
import type {
  AsanaAttachmentRaw,
  AsanaCustomFieldSettingRaw,
  AsanaProjectRaw,
  AsanaSectionRaw,
  AsanaTaskRaw,
} from "./types";

/**
 * API Discovery layer. Nothing here assumes section names, custom field
 * names, or user identities — everything is read live from Asana.
 */

const PROJECT_FIELDS = [
  "name",
  "notes",
  "permalink_url",
  "archived",
  "created_at",
  "modified_at",
  "due_on",
  "color",
  "workspace.gid",
  "workspace.name",
  "owner.name",
];

const SECTION_FIELDS = ["name", "created_at"];

const TASK_FIELDS = [
  "name",
  "notes",
  "completed",
  "completed_at",
  "due_on",
  "due_at",
  "created_at",
  "modified_at",
  "permalink_url",
  "assignee.gid",
  "assignee.name",
  "assignee.email",
  "memberships.project.gid",
  "memberships.section.gid",
  "memberships.section.name",
  "tags.gid",
  "tags.name",
  "custom_fields.gid",
  "custom_fields.name",
  "custom_fields.type",
  "custom_fields.display_value",
  "custom_fields.text_value",
  "custom_fields.number_value",
  "custom_fields.enum_value.name",
  "custom_fields.multi_enum_values.name",
  "parent.gid",
  "parent.name",
  "num_subtasks",
];

const CUSTOM_FIELD_SETTING_FIELDS = [
  "custom_field.name",
  "custom_field.type",
  "custom_field.enum_options.name",
  "custom_field.enum_options.enabled",
];

const SUBTASK_FIELDS = [
  "name",
  "completed",
  "assignee.name",
  "due_on",
  "permalink_url",
];

export async function discoverProject(
  client: AsanaClient,
  projectGid: string
): Promise<AsanaProjectRaw> {
  return client.get<AsanaProjectRaw>(`/projects/${projectGid}`, PROJECT_FIELDS);
}

export async function discoverSections(
  client: AsanaClient,
  projectGid: string
): Promise<AsanaSectionRaw[]> {
  return client.getAllPages<AsanaSectionRaw>(`/projects/${projectGid}/sections`, SECTION_FIELDS);
}

/**
 * Fetches every task in the project with all fields needed for the full
 * dashboard in a single paginated call — including section membership,
 * assignee, tags, and custom fields — to avoid N+1 requests per task.
 * Subtasks are intentionally not expanded here (would require one request
 * per parent task); they are fetched on-demand via `discoverSubtasks`.
 */
export async function discoverTasks(
  client: AsanaClient,
  projectGid: string
): Promise<AsanaTaskRaw[]> {
  return client.getAllPages<AsanaTaskRaw>(`/projects/${projectGid}/tasks`, TASK_FIELDS);
}

export async function discoverCustomFieldSettings(
  client: AsanaClient,
  projectGid: string
): Promise<AsanaCustomFieldSettingRaw[]> {
  return client.getAllPages<AsanaCustomFieldSettingRaw>(
    `/projects/${projectGid}/custom_field_settings`,
    CUSTOM_FIELD_SETTING_FIELDS
  );
}

export interface SubtaskSummary {
  id: string;
  name: string;
  completed: boolean;
  assigneeName: string | null;
  dueOn: string | null;
  permalinkUrl: string;
}

/** Lazily fetches subtasks for a single task — called on-demand for drill-down. */
export async function discoverSubtasks(
  client: AsanaClient,
  taskGid: string
): Promise<SubtaskSummary[]> {
  const raw = await client.getAllPages<AsanaTaskRaw>(`/tasks/${taskGid}/subtasks`, SUBTASK_FIELDS);
  return raw.map((t) => ({
    id: t.gid,
    name: t.name,
    completed: t.completed,
    assigneeName: t.assignee?.name ?? null,
    dueOn: t.due_on ?? null,
    permalinkUrl: t.permalink_url,
  }));
}

// Asana has no bulk "attachment count per task" field on the task list
// endpoint — attachments are only reachable one task at a time via
// GET /tasks/:gid/attachments. This concurrency limit keeps a large project
// from firing hundreds of simultaneous requests at Asana in one sync.
const ATTACHMENT_FETCH_CONCURRENCY = 8;

/**
 * Fetches the attachment count for every given task GID. This is the only
 * per-task (N+1) call in the app — required because Output Count is driven
 * by attachment count (see lib/analytics/outputs.ts). A single task's
 * failure (e.g. a permissions edge case on one item) does not fail the
 * whole sync — that task's count falls back to 0.
 */
export async function discoverAttachmentCounts(
  client: AsanaClient,
  taskGids: string[]
): Promise<Map<string, number>> {
  const counts = await mapWithConcurrency(taskGids, ATTACHMENT_FETCH_CONCURRENCY, async (taskGid) => {
    try {
      const attachments = await client.getAllPages<AsanaAttachmentRaw>(`/tasks/${taskGid}/attachments`, []);
      return [taskGid, attachments.length] as const;
    } catch {
      return [taskGid, 0] as const;
    }
  });

  return new Map(counts);
}
