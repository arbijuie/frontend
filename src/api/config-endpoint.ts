import { API_URL, authHeaders } from "./config";
import type { ConfigResponse, ConfigUpdateRequest } from "./types";

export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch(`${API_URL}/config`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GET /config failed: ${res.status}`);
  }
  return res.json();
}

export async function patchConfig(payload: ConfigUpdateRequest): Promise<ConfigResponse> {
  const res = await fetch(`${API_URL}/config`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res
      .json()
      .then((body) => (body?.detail ? `: ${JSON.stringify(body.detail)}` : ""))
      .catch(() => "");
    throw new Error(`PATCH /config failed: ${res.status}${detail}`);
  }

  return res.json();
}
