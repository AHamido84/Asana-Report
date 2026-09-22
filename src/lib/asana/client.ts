import "server-only";
import type { AsanaErrorResponse, AsanaPage } from "./types";

const ASANA_BASE_URL = "https://app.asana.com/api/1.0";
const MAX_RETRIES = 4;
const PAGE_LIMIT = 100;

export type AsanaErrorKind =
  | "invalid_token"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "timeout"
  | "network"
  | "server_error"
  | "unknown";

export class AsanaApiError extends Error {
  readonly kind: AsanaErrorKind;
  readonly status: number | null;

  constructor(kind: AsanaErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = "AsanaApiError";
    this.kind = kind;
    this.status = status;
  }
}

function classifyStatus(status: number): AsanaErrorKind {
  if (status === 401) return "invalid_token";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "unknown";
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface AsanaClientOptions {
  accessToken: string;
  /** Aborts a single request after this many ms. Default 20s. */
  timeoutMs?: number;
}

/**
 * Thin, resilient HTTP client for the Asana REST API.
 * Responsible for: auth header injection, timeout handling, retry with
 * exponential backoff on 429/5xx/network errors, and cursor-based pagination.
 * Contains no business logic — see `discovery.ts` / `normalize.ts` for that.
 */
export class AsanaClient {
  private readonly accessToken: string;
  private readonly timeoutMs: number;

  constructor(options: AsanaClientOptions) {
    this.accessToken = options.accessToken;
    this.timeoutMs = options.timeoutMs ?? 20_000;
  }

  private async request<T>(path: string, searchParams?: Record<string, string>): Promise<T> {
    const url = new URL(`${ASANA_BASE_URL}${path}`);
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (value !== undefined && value !== "") url.searchParams.set(key, value);
      }
    }

    let lastError: AsanaApiError | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: "application/json",
          },
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeout);

        if (res.ok) {
          return (await res.json()) as T;
        }

        const kind = classifyStatus(res.status);
        let message = `Asana API request failed with status ${res.status}`;
        try {
          const body = (await res.json()) as AsanaErrorResponse;
          if (body.errors?.[0]?.message) message = body.errors[0].message;
        } catch {
          // response body wasn't JSON — keep default message
        }

        const error = new AsanaApiError(kind, message, res.status);

        // Non-retryable: auth/permission/not-found errors fail fast.
        if (kind === "invalid_token" || kind === "forbidden" || kind === "not_found") {
          throw error;
        }

        lastError = error;

        if (kind === "rate_limited") {
          const retryAfter = Number.parseInt(res.headers.get("retry-after") ?? "", 10);
          const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 2 ** attempt * 1000;
          await sleep(Math.min(delay, 30_000));
          continue;
        }

        // 5xx: exponential backoff
        await sleep(2 ** attempt * 500);
        continue;
      } catch (err) {
        clearTimeout(timeout);
        if (err instanceof AsanaApiError) throw err;

        const isAbort = err instanceof Error && err.name === "AbortError";
        lastError = new AsanaApiError(
          isAbort ? "timeout" : "network",
          isAbort
            ? "Asana API request timed out"
            : `Network error while contacting Asana: ${(err as Error).message}`
        );
        await sleep(2 ** attempt * 500);
      }
    }

    throw lastError ?? new AsanaApiError("unknown", "Unknown Asana API error");
  }

  /** Fetches a single resource (no pagination). */
  async get<T>(path: string, optFields?: string[]): Promise<T> {
    const params = optFields?.length ? { opt_fields: optFields.join(",") } : undefined;
    const response = await this.request<{ data: T }>(path, params);
    return response.data;
  }

  /** Fetches all pages of a collection endpoint, following `next_page` cursors. */
  async getAllPages<T>(path: string, optFields?: string[]): Promise<T[]> {
    const results: T[] = [];
    let offset: string | undefined;

    do {
      const params: Record<string, string> = { limit: String(PAGE_LIMIT) };
      if (optFields?.length) params.opt_fields = optFields.join(",");
      if (offset) params.offset = offset;

      const page = await this.request<AsanaPage<T>>(path, params);
      results.push(...page.data);
      offset = page.next_page?.offset;
    } while (offset);

    return results;
  }
}
