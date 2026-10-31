import { API_URL, authFetch } from "./config";
import { parseApiError } from "../lib/api-errors";
import type {
  ExecutionAttemptItem,
  ExecutionAttemptListResponse,
  ExecutionCloseRequest,
  ExecutionOpenRequest,
  ExecutionPreflightResponse,
} from "./types";

export async function fetchExecutionPreflight(): Promise<ExecutionPreflightResponse> {
  const res = await authFetch(`${API_URL}/execution/preflight`);
  if (!res.ok) {
    throw new Error(`GET /execution/preflight failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchExecutionAttempts(limit = 50): Promise<ExecutionAttemptListResponse> {
  const res = await authFetch(`${API_URL}/execution/attempts?limit=${limit}`);
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

/** `POST /execution/open`: the runtime applies gate, guardrails, and mode; a 409 is a refusal. */
export async function postExecutionOpen(
  payload: ExecutionOpenRequest
): Promise<ExecutionAttemptItem> {
  const res = await authFetch(`${API_URL}/execution/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

export async function postExecutionClose(
  payload: ExecutionCloseRequest
): Promise<ExecutionAttemptItem> {
  const res = await authFetch(`${API_URL}/execution/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}
