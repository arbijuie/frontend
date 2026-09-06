import { API_URL, authHeaders } from "./config";
import type {
  BacktestSummaryResponse,
  BacktestReplayRequest,
  BacktestReplayResponse,
  BacktestLock,
  BacktestLockListResponse,
  BacktestGateResponse,
} from "./types";

export async function fetchBacktestSummary(): Promise<BacktestSummaryResponse> {
  const res = await fetch(`${API_URL}/backtest/summary`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /backtest/summary failed: ${res.status}`);
  return res.json();
}

export async function fetchBacktestGate(): Promise<BacktestGateResponse> {
  const res = await fetch(`${API_URL}/backtest/gate`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /backtest/gate failed: ${res.status}`);
  return res.json();
}

export async function fetchBacktestLocks(limit = 50): Promise<BacktestLockListResponse> {
  const res = await fetch(`${API_URL}/backtest/locks?limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /backtest/locks failed: ${res.status}`);
  return res.json();
}

export async function fetchBacktestLock(lockId: string): Promise<BacktestLock> {
  const res = await fetch(`${API_URL}/backtest/locks/${encodeURIComponent(lockId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /backtest/locks/${lockId} failed: ${res.status}`);
  return res.json();
}

export async function runBacktestReplay(
  payload: BacktestReplayRequest
): Promise<BacktestReplayResponse> {
  const res = await fetch(`${API_URL}/backtest/replay`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`POST /backtest/replay failed: ${res.status}`);
  return res.json();
}

export async function createBacktestLock(payload: BacktestReplayRequest): Promise<BacktestLock> {
  const res = await fetch(`${API_URL}/backtest/lock`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`POST /backtest/lock failed: ${res.status}`);
  return res.json();
}
