/**
 * Minimal typings for the subset of the Asana REST API (v1.0) this app uses.
 * These mirror Asana's actual response shapes — see
 * https://developers.asana.com/reference/rest-api-reference
 * They are intentionally partial: only fields requested via `opt_fields`
 * are typed as present.
 */

export interface AsanaPage<T> {
  data: T[];
  next_page: { offset: string; path: string; uri: string } | null;
}

export interface AsanaCompact {
  gid: string;
  name?: string;
}

export interface AsanaUserCompact extends AsanaCompact {
  email?: string;
}

export interface AsanaProjectRaw {
  gid: string;
  name: string;
  notes?: string | null;
  permalink_url?: string;
  archived?: boolean;
  created_at?: string;
  modified_at?: string;
  due_on?: string | null;
  color?: string | null;
  workspace?: AsanaCompact;
  owner?: AsanaCompact | null;
}

export interface AsanaSectionRaw {
  gid: string;
  name: string;
  created_at?: string;
}

export type AsanaCustomFieldType =
  | "text"
  | "number"
  | "enum"
  | "multi_enum"
  | "date"
  | "people";

export interface AsanaCustomFieldRaw {
  gid: string;
  name: string;
  type: AsanaCustomFieldType;
  display_value?: string | null;
  text_value?: string | null;
  number_value?: number | null;
  enum_value?: { gid: string; name: string } | null;
  multi_enum_values?: { gid: string; name: string }[] | null;
  date_value?: { date?: string; date_time?: string } | null;
}

export interface AsanaCustomFieldSettingRaw {
  gid: string;
  custom_field: {
    gid: string;
    name: string;
    type: AsanaCustomFieldType;
    enum_options?: { gid: string; name: string; enabled?: boolean }[];
  };
}

export interface AsanaMembershipRaw {
  project?: AsanaCompact;
  section?: AsanaCompact | null;
}

export interface AsanaTaskRaw {
  gid: string;
  name: string;
  notes?: string | null;
  completed: boolean;
  completed_at?: string | null;
  due_on?: string | null;
  due_at?: string | null;
  created_at: string;
  modified_at: string;
  permalink_url: string;
  assignee?: AsanaUserCompact | null;
  memberships?: AsanaMembershipRaw[];
  tags?: AsanaCompact[];
  custom_fields?: AsanaCustomFieldRaw[];
  parent?: AsanaCompact | null;
  num_subtasks?: number;
}

export interface AsanaErrorResponse {
  errors: { message: string; help?: string }[];
}
