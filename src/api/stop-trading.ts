import { API_URL, authFetch } from "./config";
import { parseApiError } from "../lib/api-errors";
import type { StopTradingAckRequest, StopTradingResponse } from "./types";

// Canonical stop-trading paths (issue #341): no `/api` prefix and no fallback alias.
export const STOP_TRADING_PATH = "/risk/stop-trading";
export const STOP_TRADING_ACK_PATH = `${STOP_TRADING_PATH}/ack`;

/** Latch state, recovery gate, latched reasons, and the audit log. */
export async function fetchStopTrading(): Promise<StopTradingResponse> {
  const res = await authFetch(`${API_URL}${STOP_TRADING_PATH}`);
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

/**
 * Operator acknowledgment of the latched stop. The runtime records it, then releases the stop
 * at once only if cooldown and health checks already pass; the answer is the new latch state.
 */
export async function postStopTradingAck(
  payload: StopTradingAckRequest
): Promise<StopTradingResponse> {
  const res = await authFetch(`${API_URL}${STOP_TRADING_ACK_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}
