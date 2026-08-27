import { API_URL, authHeaders } from './config';
import type { StatusResponse } from './types';

export async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch(`${API_URL}/status`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GET /status failed: ${res.status}`);
  }
  return res.json();
}
