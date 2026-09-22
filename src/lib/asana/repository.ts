import "server-only";
import { AsanaClient, AsanaApiError } from "./client";
import {
  discoverAttachmentCounts,
  discoverCustomFieldSettings,
  discoverProject,
  discoverSections,
  discoverSubtasks,
  discoverTasks,
} from "./discovery";
import { buildDataset } from "./normalize";
import type { NormalizedDataset } from "../models";
import { getAsanaConfig } from "../config";

export type { SubtaskSummary } from "./discovery";

/**
 * AsanaRepository — the single place that talks to the Asana API and
 * produces a fully normalized dataset. UI code and analytics never call
 * the Asana API directly; they go through this repository (via the cache
 * layer in `lib/cache/store.ts`).
 */
export class AsanaRepository {
  private readonly client: AsanaClient;
  private readonly projectGid: string;

  constructor(accessToken: string, projectGid: string) {
    this.client = new AsanaClient({ accessToken });
    this.projectGid = projectGid;
  }

  async fetchDataset(): Promise<NormalizedDataset> {
    const project = await discoverProject(this.client, this.projectGid);

    const [sections, rawTasks, customFieldSettings] = await Promise.all([
      discoverSections(this.client, this.projectGid),
      discoverTasks(this.client, this.projectGid),
      discoverCustomFieldSettings(this.client, this.projectGid).catch(() => []),
    ]);

    // Output Count is derived from attachment count (see lib/analytics/outputs.ts).
    // Asana has no bulk field for this, so it's one request per task — skip
    // entirely via ASANA_FETCH_ATTACHMENTS=false on very large projects.
    const attachmentCounts = getAsanaConfig().fetchAttachments
      ? await discoverAttachmentCounts(
          this.client,
          rawTasks.map((t) => t.gid)
        ).catch(() => new Map<string, number>())
      : new Map<string, number>();

    return buildDataset({
      project,
      sections,
      rawTasks,
      customFieldSettings,
      projectGid: this.projectGid,
      attachmentCounts,
    });
  }

  async fetchSubtasks(taskGid: string) {
    return discoverSubtasks(this.client, taskGid);
  }
}

export interface RepositoryInitResult {
  repository: AsanaRepository | null;
  missingEnvVars: string[];
}

/** Builds a repository from server env config, or reports what's missing. */
export function createRepositoryFromEnv(): RepositoryInitResult {
  const cfg = getAsanaConfig();
  const missing: string[] = [];
  if (!cfg.accessToken) missing.push("ASANA_ACCESS_TOKEN");
  if (!cfg.projectGid) missing.push("ASANA_PROJECT_GID");

  if (missing.length > 0) {
    return { repository: null, missingEnvVars: missing };
  }

  return {
    repository: new AsanaRepository(cfg.accessToken!, cfg.projectGid!),
    missingEnvVars: [],
  };
}

export { AsanaApiError };
