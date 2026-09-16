import { API_URL, authHeaders } from "./config";
import type { ExecutionPreflightResponse } from "./types";

export async function fetchExecutionPreflight(): Promise<ExecutionPreflightResponse> {
  const res = await fetch(`${API_URL}/execution/preflight`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GET /execution/preflight failed: ${res.status}`);
  }
  return res.json();
}
