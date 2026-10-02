import { API_URL, authFetch } from "./config";
import type { CorrelationResponse } from "./types";

export async function fetchCorrelation(): Promise<CorrelationResponse> {
  const res = await authFetch(`${API_URL}/correlation`);
  if (!res.ok) {
    throw new Error(`GET /correlation failed: ${res.status}`);
  }
  return res.json();
}
