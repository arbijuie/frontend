import { API_URL, authHeaders } from "./config";
import type { CorrelationResponse } from "./types";

export async function fetchCorrelation(): Promise<CorrelationResponse> {
  const res = await fetch(`${API_URL}/correlation`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GET /correlation failed: ${res.status}`);
  }
  return res.json();
}
