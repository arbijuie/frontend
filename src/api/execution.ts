import { API_URL, authFetch } from "./config";
import type { ExecutionPreflightResponse } from "./types";

export async function fetchExecutionPreflight(): Promise<ExecutionPreflightResponse> {
  const res = await authFetch(`${API_URL}/execution/preflight`);
  if (!res.ok) {
    throw new Error(`GET /execution/preflight failed: ${res.status}`);
  }
  return res.json();
}
