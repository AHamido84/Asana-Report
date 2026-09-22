# Executive Project Dashboard — Asana Integration

A production-ready, dynamic executive reporting dashboard that reads a project
directly from the **Asana REST API** (no manual export, no hardcoded data) and
renders it as an interactive, SaaS-grade BI dashboard: KPIs, workflow pipeline,
team workload, aging/overdue analysis, upcoming work, a full task database,
data-driven insights, CSV/HTML exports — in English and Arabic (LTR/RTL), light
and dark themes.

Every number on this dashboard is computed live from Asana. Nothing about
sections, users, statuses, or custom fields is assumed — they're discovered
from the API at sync time.

---

## 1. Project setup

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # http://localhost:3000
```

Requires Node.js 18.18+ (Next.js 14 / App Router).

## 2. Environment variables

All configuration lives in `.env` (never committed — see `.gitignore`). See
`.env.example` for the full annotated list. The two required variables:

| Variable | Required | Description |
|---|---|---|
| `ASANA_ACCESS_TOKEN` | ✅ | Personal Access Token, used **server-side only** |
| `ASANA_PROJECT_GID` | ✅ | The Asana project this dashboard reports on |
| `ASANA_WORKSPACE_GID` | optional | Auto-discovered from the project if omitted |
| `ASANA_BOARD_GID` | optional | Reference only — sections are discovered dynamically |
| `ASANA_CACHE_TTL_SECONDS` | optional | Server cache lifetime, default `300` |
| `ASANA_FETCH_ATTACHMENTS` | optional | Fetch per-task attachment counts to drive Output Count (see §5a below), default `true` |
| `DASHBOARD_DEFAULT_LOCALE` | optional | `en` or `ar`, default `en` |
| `DASHBOARD_DEFAULT_THEME` | optional | `light` or `dark`, default `light` |
| `DASHBOARD_TITLE` | optional | Header title text |
| `DASHBOARD_COMPANY_NAME` | optional | Shown in header/export |
| `DASHBOARD_TIMEZONE` | optional | IANA timezone for due/overdue calculations, default `UTC` |

If `ASANA_ACCESS_TOKEN` or `ASANA_PROJECT_GID` is missing, the app **does not
crash** — it renders a "Setup Required" screen naming exactly which variable
is missing and how to add it (see `src/components/dashboard/SetupRequired.tsx`).

### How to get an Asana Personal Access Token

1. Go to Asana → your profile photo (top right) → **My Settings**.
2. Open the **Apps** tab → **Manage Developer Apps**.
3. Under **Personal Access Tokens**, click **Create new token**, name it, and copy it immediately (it's shown once).
4. Paste it into `.env` as `ASANA_ACCESS_TOKEN`.

The token inherits the permissions of the Asana user who created it — that
user must have at least read access to the target project.

### Finding the Project GID

Open the project in Asana; the URL looks like
`https://app.asana.com/1/<workspace>/project/<PROJECT_GID>/...` — the
project's numeric GID is `ASANA_PROJECT_GID`.

## 3. Running locally

```bash
npm run dev        # dev server with hot reload
npm run typecheck  # tsc --noEmit (strict mode)
npm run lint       # next lint
```

## 4. Building & deploying

```bash
npm run build
npm run start
```

### Deploying to Vercel

1. Push this repository to GitHub/GitLab/Bitbucket and import it in Vercel.
2. In **Project Settings → Environment Variables**, add `ASANA_ACCESS_TOKEN`
   and `ASANA_PROJECT_GID` (and any optional variables) for the environments
   you deploy (Production/Preview/Development). **Never** put the token in
   `NEXT_PUBLIC_*` variables — it must stay server-only.
3. Deploy. The build has no localhost dependencies and no secrets baked into
   the bundle — everything sensitive is read from `process.env` inside
   server-only modules (see "Security" below).

Any Node.js host that supports Next.js server runtimes (Vercel, a container,
a VM running `next start`) works the same way.

---

## 5. Architecture

```
Asana REST API  (https://app.asana.com/api/1.0)
      │  pagination, retry/backoff, typed errors
      ▼
AsanaClient            (src/lib/asana/client.ts)
      │  opt_fields-driven discovery, no assumptions about names
      ▼
Discovery + Normalize  (src/lib/asana/discovery.ts, normalize.ts)
      │  → NormalizedDataset (Project, Section[], Task[], User[], CustomFieldDefinition[])
      ▼
Cache layer            (src/lib/cache/store.ts)
      │  TTL cache + in-flight de-dupe + snapshot recording on each sync
      ▼
Analytics Engine       (src/lib/analytics/engine.ts + outputs.ts)
      │  pure functions: KPIs, sections, workload, aging, overdue, upcoming,
      │  insights, executive summary, trend, and Output Counting (§5a) —
      │  all computed, nothing hardcoded
      ▼
API routes             (src/app/api/asana/*)
      │  status / data / sync / export / task-subtasks
      ▼
Dashboard UI            (src/components/dashboard/*)
```

### Why this layering

- **UI never calls Asana directly.** Every request goes through the cache →
  repository → client chain, so rate limits, retries, and pagination are
  handled in exactly one place.
- **The analytics engine is pure and synchronous.** It takes an already
  fetched `NormalizedDataset` plus the current filters and produces every
  number on the dashboard. This makes it trivial to unit test and means
  changing a filter never triggers a new Asana API call — only a
  recomputation over already-cached data (see `/api/asana/data`).
- **Nothing is hardcoded.** Section names, user names, custom field names and
  options, tags — all come from `discovery.ts` / `normalize.ts`. Add a
  section in Asana and it appears in the pipeline visualization automatically
  on the next sync; delete one and the dashboard simply omits it.

### Data model

See `src/lib/models.ts` for the full normalized shape (`Project`, `Section`,
`Task`, `DashboardUser`, `CustomFieldDefinition`/`CustomFieldValue`, `Tag`).

### 5a. The Output Counting Business Rule

Every "Outputs" figure in the dashboard (KPI cards, the Outputs-by-Type table,
Outputs-by-Assignee, Completion Rate, the executive summary, CSV/HTML exports)
follows one rule, applied consistently everywhere:

```text
Attachments > 0  →  Output Count = number of attachments
Attachments = 0  →  Output Count = 1   (a task still represents one expected
                                         deliverable, even before a file is attached)
```

This is implemented **once**, as the single source of truth, in
`src/lib/analytics/outputs.ts`:

```typescript
export function getOutputCount(task: Task): number {
  const attachmentCount = task.attachmentCount ?? 0;
  return attachmentCount > 0 ? attachmentCount : 1;
}
```

No other file re-derives this number — the analytics engine, the task table,
CSV export, and the HTML executive report all call `getOutputCount()` (or the
aggregate `computeOutputTotals()` built on top of it) rather than counting
attachments or tasks themselves. `computeOutputTotals()` produces every
aggregate in one pass: `totalOutputs`, `completedOutputs`, `pendingOutputs`,
`overdueOutputs`, `averageOutputsPerTask`, and the operational
`tasksWithAttachments` / `tasksWithoutAttachments` / `attachmentRatio` metrics
(the last three are explicitly **not** treated as a "Tasks Without Outputs"
KPI, since a task without attachments is still 1 output, not 0 — see the rule
above).

**Completion Rate** is Completed Outputs ÷ Total Outputs — not completed
tasks ÷ total tasks — per this same rule; `Kpis.completionRate` reflects this
everywhere it's shown.

**Where the attachment count comes from:** Asana's API has no bulk field for
"attachment count per task" — attachments are only reachable one task at a
time via `GET /tasks/:gid/attachments`. This is the one deliberate N+1 call in
the app (see `discoverAttachmentCounts` in `src/lib/asana/discovery.ts`),
run with a concurrency limit of 8 in-flight requests (`src/lib/asana/concurrency.ts`)
so a large project doesn't fire hundreds of simultaneous requests at Asana in
one sync. A single task's attachment fetch failing (e.g. a permissions edge
case) falls back to 0 for that task rather than failing the whole sync. Set
`ASANA_FETCH_ATTACHMENTS=false` to skip this entirely on a very large project
— Output Count then falls back to 1 for every task everywhere.

### Asana API usage

- Base URL: `https://app.asana.com/api/1.0` (`src/lib/asana/client.ts`).
- Every collection endpoint (`/projects/:gid/tasks`, `/sections`,
  `/custom_field_settings`) is paginated via `next_page.offset`, fetched with
  `limit=100`.
- **A single `opt_fields`-heavy call to `/projects/:gid/tasks`** fetches name,
  status, dates, assignee, section membership, tags, custom fields, and
  parent for every task in one paginated pass. Section membership is read
  from `task.memberships` filtered to the configured project, not assumed to
  equal `ASANA_BOARD_GID`.
- Subtasks are **not** bulk-fetched (would cost one request per parent task on
  a large project). They're counted (`num_subtasks`) inline, and fetched
  on-demand via `GET /api/asana/task-subtasks?taskId=...` only when a user
  drills into a specific task.
- **The one deliberate exception** is attachment counts, which drive Output
  Count (see §5a): Asana has no bulk field for this, so it's one
  concurrency-limited request per task, skippable via
  `ASANA_FETCH_ATTACHMENTS=false`.
- 429 responses respect `Retry-After`; 5xx/network/timeout errors retry with
  exponential backoff (`src/lib/asana/client.ts`); 401/403/404 fail fast with
  a typed `AsanaApiError` that the UI renders as a specific, actionable
  message (`src/components/dashboard/ErrorState.tsx`).

### Caching

`src/lib/cache/store.ts` keeps the last fetched dataset in a process-local
cache for `ASANA_CACHE_TTL_SECONDS` (default 5 minutes). "Refresh Data" and
"Sync Now" both force a bypass. Concurrent requests during a sync share one
in-flight fetch instead of hammering Asana.

**Serverless note:** on a stateless platform (e.g. Vercel serverless
functions), this in-memory cache is per-instance and resets on cold start.
The cache is intentionally exposed through a narrow interface
(`getDataset`/`peekCachedDataset`) so it can be swapped for a shared store
(Redis, Upstash, Vercel KV) without touching any caller — no UI or analytics
code depends on the cache's storage mechanism.

### Snapshot system (for trend charts)

Asana's API does not expose historical timeseries of task counts — it only
reflects current state. So "Completion Trend" cannot show history that was
never recorded. Instead, `src/lib/snapshot/store.ts` writes one JSON snapshot
per day (`data/snapshots/YYYY-MM-DD.json`) every time a sync completes. Once
at least two daily snapshots exist, the trend chart renders automatically;
until then it shows an honest "not enough historical data yet" state instead
of fabricating a chart. This is also file-based/local by default — swap
`recordSnapshotIfNeeded`/`listSnapshots` for a database-backed store for
durable multi-instance production use.

### Multi-project readiness

The repository/cache/analytics layers are already parameterized by
`projectGid` (`AsanaRepository` takes it in its constructor). Adding a
project switcher means: (1) storing a list of configured project GIDs, (2)
keying the cache by project GID instead of a single global entry, and (3) a
`<ProjectSelector>` component that changes which GID `useDashboardData` sends
to `/api/asana/data`. No changes are needed to discovery, normalization, or
the analytics engine.

---

## 6. Security

- The Asana access token is **only** read via `process.env.ASANA_ACCESS_TOKEN`
  inside modules marked `import "server-only"` (`src/lib/config.ts`,
  `src/lib/asana/*`, `src/lib/cache/store.ts`). It is never sent to the
  browser, never placed in a `NEXT_PUBLIC_*` variable, and never logged.
- All Asana API calls happen in Next.js API routes / server code — the
  browser only ever talks to `/api/asana/*` on the same origin.
- `.env` / `.env.local` are gitignored; `.env.example` contains no secrets.

## 7. i18n & theming

- `src/lib/i18n/locales/{en,ar}.json` — every UI label is translated; there is
  no hardcoded English string in a component (see `src/lib/i18n/index.ts` for
  the lookup/interpolation helper and `src/context/LocaleProvider.tsx` for the
  React context that also flips `dir="rtl"/"ltr"` on `<html>`).
- `src/context/ThemeProvider.tsx` persists light/dark choice to
  `localStorage` and applies it via a `data-theme` attribute; an inline
  bootstrap script in `layout.tsx` applies the stored theme/locale before
  hydration to avoid a flash of the wrong theme.

## 8. What was tested

Since this environment has no live Asana token, verification was done in two
layers:
1. **Setup-state correctness** against the real (token-less) environment —
   confirmed the app renders the "Setup Required" screen naming the exact
   missing variables instead of crashing, and `/api/asana/status` and
   `/api/asana/data` report `setup_required` correctly.
2. **Full data pipeline** against a temporary local mock server implementing
   the same Asana REST endpoints (project/sections/tasks/custom field
   settings/attachments, with pagination) to exercise the *exact* production
   code path — `AsanaClient → discovery → normalize → cache → analytics
   engine → API routes → UI` — end to end. This confirmed: pagination across
   multiple pages, KPI math, section pipeline, team workload, aging buckets,
   overdue/upcoming lists, CSV export (including auto-discovered custom field
   columns), the HTML executive report, KPI-click-to-filter interactivity,
   global search, dark mode, and Arabic RTL layout, all with dynamically
   computed values (no fixture numbers hardcoded into the UI).
3. **Output Counting Business Rule** specifically: a mock dataset was seeded
   with a deterministic, known attachment count per task (including tasks
   with exactly 0 attachments) and cross-checked against an independent
   hand-computed expectation (Total/Completed/Pending/Overdue Outputs,
   Average Outputs per Task, Attachment Ratio, and the output-based
   Completion Rate) before confirming the dashboard, CSV export, and HTML
   report all produced matching numbers.

Before pointing this at your real Asana project, re-run `npm run typecheck`,
`npm run lint`, and `npm run build`, then verify with your own data using the
checklist in the PR/task description.

## 9. Known limitations (caused by the Asana API / environment)

- **No historical timeseries from Asana.** Trend charts rely on the snapshot
  system above and need a few days of syncs before they render.
- **In-memory cache is per-instance** on serverless deployments (see
  "Caching"). Fine for a single long-running server; needs a shared store for
  multi-instance serverless production use.
- **Subtasks are summarized, not expanded**, to avoid one Asana request per
  parent task on large projects; full subtask lists are fetched on demand.
- **Attachment counts cost one request per task** (Asana has no bulk field for
  this — see §5a), run at a concurrency of 8. On a very large project this
  measurably lengthens a full sync; set `ASANA_FETCH_ATTACHMENTS=false` to
  skip it (Output Count then falls back to 1 per task everywhere).
- Custom field filters currently support `enum`/`multi_enum` types (the
  common case for board-style projects); `text`/`number`/`date` custom
  fields are still discovered and shown as table columns and in CSV export,
  just not as filter dropdowns.

## 10. Suggested next improvements

- Swap the cache and snapshot stores for Redis/Upstash/Vercel KV or a small
  database for durable, multi-instance production use.
- Add a `<ProjectSelector>` and per-project cache keys for true multi-project
  support (the data layer is already parameterized for this).
- Add `text`/`number`/`date` custom field filter UIs.
- Optional: layer an AI-generated narrative summary **on top of** the
  analytics engine's real numbers (never as a replacement for them), behind
  a clearly separated `AnalyticsData → AI Summary` boundary.
