import { API_URL, authFetch } from "./config";
import { parseApiError } from "../lib/api-errors";
import type {
  DailyPnlResponse,
  MigrationParityArtifactListResponse,
  MigrationParityReportResponse,
  PositionsResponse,
  RiskGuardrailsResponse,
  SnapshotContinuityResponse,
} from "./types";

async function getJson<T>(path: string): Promise<T> {
  const res = await authFetch(`${API_URL}${path}`);
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

export const fetchPositions = () => getJson<PositionsResponse>("/positions");

export const fetchDailyPnl = (days = 7) =>
  getJson<DailyPnlResponse>(`/positions/pnl/daily?days=${days}`);

export const fetchRiskGuardrails = () => getJson<RiskGuardrailsResponse>("/risk/guardrails");

export const fetchParityArtifacts = (limit = 50) =>
  getJson<MigrationParityArtifactListResponse>(`/migration/parity/artifacts?limit=${limit}`);

export const fetchParityReport = (windowS = 3600, limit = 200) =>
  getJson<MigrationParityReportResponse>(
    `/migration/parity/report?window_s=${windowS}&limit=${limit}`
  );

export const fetchSnapshotContinuity = () =>
  getJson<SnapshotContinuityResponse>("/snapshots/continuity");
