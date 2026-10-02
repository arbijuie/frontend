import { API_URL, authFetch } from "./config";
import type { StatusResponse } from "./types";

export async function fetchStatus(): Promise<StatusResponse> {
  const res = await authFetch(`${API_URL}/status`);
  if (!res.ok) {
    throw new Error(`GET /status failed: ${res.status}`);
  }
  return res.json();
}
