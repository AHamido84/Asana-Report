/**
 * Internal normalized data model.
 * Everything here is derived from live Asana API responses — nothing is
 * hardcoded. Field values are `null`/`undefined`-safe because Asana tasks
 * frequently have missing assignees, due dates, sections, or custom fields.
 */

export type CustomFieldType =
  | "text"
  | "number"
  | "enum"
  | "multi_enum"
  | "date"
  | "people"
  | "unknown";

export interface CustomFieldValue {
  id: string;
  name: string;
  type: CustomFieldType;
  /** Raw value (string | number | string[] | null) depending on type. */
  value: string | number | string[] | null;
  /** Human-readable rendering supplied by Asana (`display_value`). */
  displayValue: string | null;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  /** For enum/multi_enum fields: the full set of possible options. */
  options: string[];
}

export interface Tag {
  id: string;
  name: string;
}

export interface DashboardUser {
  id: string;
  name: string;
  email: string | null;
}

export interface Section {
  id: string;
  name: string;
  position: number;
}

export interface Task {
  id: string;
  name: string;
  notes: string | null;
  sectionId: string | null;
  sectionName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  completed: boolean;
  completedAt: string | null;
  dueOn: string | null;
  dueAt: string | null;
  createdAt: string;
  modifiedAt: string;
  permalinkUrl: string;
  customFields: CustomFieldValue[];
  tags: Tag[];
  parentId: string | null;
  parentName: string | null;
  numSubtasks: number;
  isSubtask: boolean;
}

export interface Project {
  id: string;
  name: string;
  notes: string | null;
  url: string;
  workspaceId: string | null;
  workspaceName: string | null;
  color: string | null;
  archived: boolean;
  createdAt: string | null;
  modifiedAt: string | null;
  dueOn: string | null;
  ownerName: string | null;
}

export interface NormalizedDataset {
  project: Project;
  sections: Section[];
  tasks: Task[];
  users: DashboardUser[];
  customFieldDefinitions: CustomFieldDefinition[];
  tags: Tag[];
  fetchedAt: string;
}

export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
  unassignedTasks: number;
  tasksBySection: Record<string, number>;
  tasksByAssignee: Record<string, number>;
}
