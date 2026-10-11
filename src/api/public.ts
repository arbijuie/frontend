import { API_URL, authFetch } from "./config";
import type {
  PublicCorrelationResponse,
  PublicJournalResponse,
  PublicOpportunitiesResponse,
  PublicStatusResponse,
} from "./types";

/**
 * Failed read of a public endpoint. Public pages turn the status into a plain explanation:
 * 401/403 (public channel not opened), 404 (older backend), 429 (rate limited) or 5xx.
 * `status` is null when the API could not be reached at all.
 */
export class PublicApiError extends Error {
  readonly status: number | null;
  readonly retryAfterSeconds: number | null;

  constructor(path: string, status: number | null, retryAfterSeconds: number | null = null) {
    super(status === null ? `GET ${path} failed: network error` : `GET ${path} failed: ${status}`);
    this.name = "PublicApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

// Auth, missing-route and rate-limit answers will not change on an immediate retry.
const FINAL_STATUSES = new Set([401, 403, 404, 429]);

/** True for a failed public read that retrying or polling right away cannot fix. */
export function isFinalPublicError(error: unknown): boolean {
  return (
    error instanceof PublicApiError && error.status !== null && FINAL_STATUSES.has(error.status)
  );
}

// Public reads go through `authFetch` so an operator build still works while the public
// channel is closed; the public-channel proxy strips any credentials it receives.
async function getResponse(path: string): Promise<Response> {
  let res: Response;
  try {
    res = await authFetch(`${API_URL}${path}`);
  } catch {
    throw new PublicApiError(path, null);
  }
  if (!res.ok) {
    throw new PublicApiError(path, res.status, parseRetryAfter(res.headers.get("Retry-After")));
  }
  return res;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await getResponse(path);
  return res.json() as Promise<T>;
}

export const fetchPublicStatus = () => getJson<PublicStatusResponse>("/public/status");

export const fetchPublicOpportunities = () =>
  getJson<PublicOpportunitiesResponse>("/public/opportunities");

export const fetchPublicCorrelation = () =>
  getJson<PublicCorrelationResponse>("/public/correlation");

export const fetchPublicJournal = (days: number) =>
  getJson<PublicJournalResponse>(`/public/journal?days=${encodeURIComponent(days)}`);

/**
 * Process liveness from `GET /healthz`, which never requires auth. The public-channel proxy
 * answers it itself with a plain-text `ok`, so `started_at` and `uptime_s` can be missing.
 */
export interface HealthzResponse {
  ok: boolean;
  started_at: string | null;
  uptime_s: number | null;
}

export async function fetchHealthz(): Promise<HealthzResponse> {
  const body = await (await getResponse("/healthz")).text();
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object") return parsed as HealthzResponse;
  } catch {
    // Plain-text answer from a proxy: reachable, without process details.
  }
  return { ok: true, started_at: null, uptime_s: null };
}
