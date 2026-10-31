import { API_URL, authFetch } from "./config";
import { parseApiError } from "../lib/api-errors";
import type {
  AutoEntryDecisionListResponse,
  AutoExitDecisionListResponse,
  AutomationControlRequest,
  AutomationOverviewResponse,
} from "./types";

export async function fetchAutomation(): Promise<AutomationOverviewResponse> {
  const res = await authFetch(`${API_URL}/automation`);
  if (!res.ok) {
    throw new Error(`GET /automation failed: ${res.status}`);
  }
  return res.json();
}

export async function postAutomationControl(
  payload: AutomationControlRequest
): Promise<AutomationOverviewResponse> {
  const res = await authFetch(`${API_URL}/automation/controls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((body) => (body?.detail ? `: ${JSON.stringify(body.detail)}` : ""))
      .catch(() => "");
    throw new Error(`POST /automation/controls failed: ${res.status}${detail}`);
  }
  return res.json();
}

export async function fetchAutoEntryDecisions(limit = 50): Promise<AutoEntryDecisionListResponse> {
  const res = await authFetch(`${API_URL}/automation/entry/decisions?limit=${limit}`);
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

export async function fetchAutoExitDecisions(limit = 50): Promise<AutoExitDecisionListResponse> {
  const res = await authFetch(`${API_URL}/automation/exit/decisions?limit=${limit}`);
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}
