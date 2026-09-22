import type { CustomFieldDefinition, Task } from "../models";
import { formatDate, formatDateTime } from "../utils";
import { getOutputCount } from "../analytics/outputs";

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function row(cells: string[]): string {
  return cells.map(escapeCsvCell).join(",");
}

/** Builds a CSV export of the currently filtered tasks, including one column per discovered custom field. */
export function buildTasksCsv(tasks: Task[], customFieldDefinitions: CustomFieldDefinition[], locale: string): string {
  const headers = [
    "Task",
    "Status",
    "Assignee",
    "Section",
    "Due Date",
    "Created",
    "Last Modified",
    "Tags",
    "Parent Task",
    "Attachments",
    "Output Count",
    ...customFieldDefinitions.map((f) => f.name),
    "Asana Link",
  ];

  const lines = [row(headers)];

  for (const task of tasks) {
    const customFieldCells = customFieldDefinitions.map((def) => {
      const field = task.customFields.find((f) => f.id === def.id);
      if (!field) return "";
      if (field.displayValue) return field.displayValue;
      if (Array.isArray(field.value)) return field.value.join("; ");
      return field.value?.toString() ?? "";
    });

    lines.push(
      row([
        task.name,
        task.completed ? "Completed" : "Open",
        task.assigneeName ?? "Unassigned",
        task.sectionName ?? "No Section",
        formatDate(task.dueOn, locale),
        formatDateTime(task.createdAt, locale),
        formatDateTime(task.modifiedAt, locale),
        task.tags.map((t) => t.name).join("; "),
        task.parentName ?? "",
        String(task.attachmentCount ?? 0),
        String(getOutputCount(task)),
        ...customFieldCells,
        task.permalinkUrl,
      ])
    );
  }

  return lines.join("\n");
}
