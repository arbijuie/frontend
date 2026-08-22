import { API_URL, authHeaders } from './config';
import type { OpportunitiesResponse } from './types';

export async function fetchOpportunities(): Promise<OpportunitiesResponse> {
  const res = await fetch(`${API_URL}/opportunities`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GET /opportunities failed: ${res.status}`);
  }
  return res.json();
}
