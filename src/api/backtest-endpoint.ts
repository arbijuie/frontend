import { API_URL, authFetch } from "./config";
import type {
  BacktestSummaryResponse,
  BacktestReplayRequest,
  BacktestReplayResponse,
  BacktestLock,
  BacktestLockListResponse,
  BacktestGateResponse,
} from "./types";
import { parseApiError } from "../lib/api-errors";

export async function fetchBacktestSummary(): Promise<BacktestSummaryResponse> {
  const res = await authFetch(`${API_URL}/backtest/summary`);
  if (!res.ok) throw new Error(`GET /backtest/summary failed: ${res.status}`);
  return res.json();
}

export async function fetchBacktestGate(): Promise<BacktestGateResponse> {
  const res = await authFetch(`${API_URL}/backtest/gate`);
  if (!res.ok) throw new Error(`GET /backtest/gate failed: ${res.status}`);
  return res.json();
}

export async function fetchBacktestLocks(limit = 50): Promise<BacktestLockListResponse> {
  const res = await authFetch(`${API_URL}/backtest/locks?limit=${limit}`);
  if (!res.ok) throw new Error(`GET /backtest/locks failed: ${res.status}`);
  return res.json();
}

export async function fetchBacktestLock(lockId: string): Promise<BacktestLock> {
  const res = await authFetch(`${API_URL}/backtest/locks/${encodeURIComponent(lockId)}`);
  if (!res.ok) throw new Error(`GET /backtest/locks/${lockId} failed: ${res.status}`);
  return res.json();
}

export async function runBacktestReplay(
  payload: BacktestReplayRequest
): Promise<BacktestReplayResponse> {
  const res = await authFetch(`${API_URL}/backtest/replay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

export async function createBacktestLock(payload: BacktestReplayRequest): Promise<BacktestLock> {
  const res = await authFetch(`${API_URL}/backtest/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}
