import type {
  AsanaCustomFieldRaw,
  AsanaCustomFieldSettingRaw,
  AsanaCustomFieldType,
  AsanaProjectRaw,
  AsanaSectionRaw,
  AsanaTaskRaw,
} from "./types";
import type {
  CustomFieldDefinition,
  CustomFieldType,
  CustomFieldValue,
  DashboardUser,
  NormalizedDataset,
  Project,
  Section,
  Tag,
  Task,
} from "../models";

function mapFieldType(type: AsanaCustomFieldType | undefined): CustomFieldType {
  switch (type) {
    case "text":
    case "number":
    case "enum":
    case "multi_enum":
    case "date":
    case "people":
      return type;
    default:
      return "unknown";
  }
}

function normalizeCustomFieldValue(raw: AsanaCustomFieldRaw): CustomFieldValue {
  const type = mapFieldType(raw.type);
  let value: string | number | string[] | null = null;

  if (type === "number") value = raw.number_value ?? null;
  else if (type === "text") value = raw.text_value ?? null;
  else if (type === "enum") value = raw.enum_value?.name ?? null;
  else if (type === "multi_enum") value = raw.multi_enum_values?.map((v) => v.name) ?? [];
  else if (type === "date") value = raw.date_value?.date ?? raw.date_value?.date_time ?? null;

  return {
    id: raw.gid,
    name: raw.name,
    type,
    value,
    displayValue: raw.display_value ?? null,
  };
}

export function normalizeProject(raw: AsanaProjectRaw): Project {
  return {
    id: raw.gid,
    name: raw.name,
    notes: raw.notes ?? null,
    url: raw.permalink_url ?? `https://app.asana.com/0/${raw.gid}`,
    workspaceId: raw.workspace?.gid ?? null,
    workspaceName: raw.workspace?.name ?? null,
    color: raw.color ?? null,
    archived: raw.archived ?? false,
    createdAt: raw.created_at ?? null,
    modifiedAt: raw.modified_at ?? null,
    dueOn: raw.due_on ?? null,
    ownerName: raw.owner?.name ?? null,
  };
}

export function normalizeSections(raw: AsanaSectionRaw[]): Section[] {
  return raw.map((s, index) => ({ id: s.gid, name: s.name, position: index }));
}

export function normalizeTask(raw: AsanaTaskRaw, projectGid: string, attachmentCount = 0): Task {
  const membership = raw.memberships?.find((m) => m.project?.gid === projectGid);

  return {
    id: raw.gid,
    name: raw.name,
    notes: raw.notes ?? null,
    sectionId: membership?.section?.gid ?? null,
    sectionName: membership?.section?.name ?? null,
    assigneeId: raw.assignee?.gid ?? null,
    assigneeName: raw.assignee?.name ?? null,
    completed: raw.completed,
    completedAt: raw.completed_at ?? null,
    dueOn: raw.due_on ?? null,
    dueAt: raw.due_at ?? null,
    createdAt: raw.created_at,
    modifiedAt: raw.modified_at,
    permalinkUrl: raw.permalink_url,
    customFields: (raw.custom_fields ?? []).map(normalizeCustomFieldValue),
    tags: (raw.tags ?? []).map((t) => ({ id: t.gid, name: t.name ?? "Untitled tag" })),
    parentId: raw.parent?.gid ?? null,
    parentName: raw.parent?.name ?? null,
    numSubtasks: raw.num_subtasks ?? 0,
    isSubtask: Boolean(raw.parent),
    attachmentCount,
  };
}

export function normalizeTasks(
  raw: AsanaTaskRaw[],
  projectGid: string,
  attachmentCounts: Map<string, number> = new Map()
): Task[] {
  return raw.map((t) => normalizeTask(t, projectGid, attachmentCounts.get(t.gid) ?? 0));
}

/** Derives the distinct set of users from task assignees — no separate roster call needed. */
export function deriveUsers(tasks: Task[]): DashboardUser[] {
  const byId = new Map<string, DashboardUser>();
  for (const task of tasks) {
    if (task.assigneeId && !byId.has(task.assigneeId)) {
      byId.set(task.assigneeId, { id: task.assigneeId, name: task.assigneeName ?? "Unknown", email: null });
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function deriveTags(tasks: Task[]): Tag[] {
  const byId = new Map<string, Tag>();
  for (const task of tasks) {
    for (const tag of task.tags) {
      if (!byId.has(tag.id)) byId.set(tag.id, tag);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Prefers the project's `custom_field_settings` (authoritative list of
 * fields configured on the project, including unused enum options) and
 * falls back to whatever fields actually appear on tasks if that endpoint
 * is unavailable or empty (e.g. insufficient permissions).
 */
export function deriveCustomFieldDefinitions(
  settings: AsanaCustomFieldSettingRaw[],
  tasks: Task[]
): CustomFieldDefinition[] {
  if (settings.length > 0) {
    return settings.map((s) => ({
      id: s.custom_field.gid,
      name: s.custom_field.name,
      type: mapFieldType(s.custom_field.type),
      options: (s.custom_field.enum_options ?? [])
        .filter((o) => o.enabled !== false)
        .map((o) => o.name),
    }));
  }

  const byId = new Map<string, CustomFieldDefinition>();
  for (const task of tasks) {
    for (const field of task.customFields) {
      if (!byId.has(field.id)) {
        byId.set(field.id, { id: field.id, name: field.name, type: field.type, options: [] });
      }
      const def = byId.get(field.id)!;
      if (field.type === "enum" && typeof field.value === "string" && !def.options.includes(field.value)) {
        def.options.push(field.value);
      }
      if (field.type === "multi_enum" && Array.isArray(field.value)) {
        for (const v of field.value) if (!def.options.includes(v)) def.options.push(v);
      }
    }
  }
  return [...byId.values()];
}

export function buildDataset(params: {
  project: AsanaProjectRaw;
  sections: AsanaSectionRaw[];
  rawTasks: AsanaTaskRaw[];
  customFieldSettings: AsanaCustomFieldSettingRaw[];
  projectGid: string;
  attachmentCounts?: Map<string, number>;
}): NormalizedDataset {
  const project = normalizeProject(params.project);
  const sections = normalizeSections(params.sections);
  const tasks = normalizeTasks(params.rawTasks, params.projectGid, params.attachmentCounts);
  const users = deriveUsers(tasks);
  const tags = deriveTags(tasks);
  const customFieldDefinitions = deriveCustomFieldDefinitions(params.customFieldSettings, tasks);

  return {
    project,
    sections,
    tasks,
    users,
    tags,
    customFieldDefinitions,
    fetchedAt: new Date().toISOString(),
  };
}
