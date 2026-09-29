import type { TransportState } from "../hooks/useOpportunitiesSocket";

export type TransportHealth = "connected" | "reconnecting" | "degraded";

export function transportHealthFromState(state: TransportState): TransportHealth {
  if (state === "connected") return "connected";
  if (state === "polling-fallback") return "degraded";
  return "reconnecting";
}

export function transportStateLabel(state: TransportState): string {
  if (state === "connected") return "connected (live)";
  if (state === "connecting") return "connecting";
  if (state === "reconnecting") return "reconnecting (retrying WS)";
  return "degraded (polling fallback)";
}

export function formatMessageAge(lastMessageAtMs: number | null, nowMs: number): string {
  if (lastMessageAtMs == null) return "no message yet";
  const seconds = Math.max(0, Math.round((nowMs - lastMessageAtMs) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
}

export function operatorHint(health: TransportHealth, pollIntervalSeconds: number): string | null {
  if (health === "degraded") {
    return `Live updates are unavailable. The Opportunities page falls back to REST polling every ${pollIntervalSeconds}s, so data can lag by up to that interval. Use Retry to reconnect.`;
  }
  if (health === "reconnecting") {
    return "Live connection is being re-established. The Opportunities page keeps refreshing by REST polling in the meantime.";
  }
  return null;
}
