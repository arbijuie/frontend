import { API_URL, authHeaders } from "./config";
import type { ConfigResponse } from "./types";

export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch(`${API_URL}/config`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GET /config failed: ${res.status}`);
  }
  return res.json();
}
