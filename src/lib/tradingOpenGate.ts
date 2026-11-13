import type { StatusResponse } from "../api/types";

export type TradingOpenBlockReason =
  | "status_loading"
  | "execution_disabled"
  | "stop_trading_latched"
  | "entries_stopped"
  | "vooi_route_unavailable";

export interface TradingOpenGateInput {
  status: Pick<
    StatusResponse,
    "execution_entries_stopped" | "stop_trading" | "vooi_route"
  > | null;
  /** From /config — StatusResponse does not always expose exec_enabled. */
  execEnabled: boolean | null;
  statusLoading?: boolean;
}

export interface TradingOpenGate {
  allowed: boolean;
  reason: TradingOpenBlockReason | null;
  message: string | null;
}

/**
 * Whether the Open position CTA should be interactive.
 * Mirrors ExecutionSheet blockers so traders never tap into a dead sheet on MVP live.
 */
export function tradingOpenGate({
  status,
  execEnabled,
  statusLoading = false,
}: TradingOpenGateInput): TradingOpenGate {
  if (statusLoading || status == null || execEnabled == null) {
    return {
      allowed: false,
      reason: "status_loading",
      message: "Checking whether trading is available…",
    };
  }
  if (!execEnabled) {
    return {
      allowed: false,
      reason: "execution_disabled",
      message: "Opening is turned off in settings.",
    };
  }
  if (status.stop_trading?.state === "stopped") {
    return {
      allowed: false,
      reason: "stop_trading_latched",
      message: "Trading was stopped for safety. Opening stays locked until it is released.",
    };
  }
  if (status.execution_entries_stopped) {
    return {
      allowed: false,
      reason: "entries_stopped",
      message: "New deals are paused after several failed attempts.",
    };
  }
  const route = status.vooi_route;
  if (route?.enabled && (route.state === "degraded" || route.state === "not_configured")) {
    return {
      allowed: false,
      reason: "vooi_route_unavailable",
      message: "The order connection is not ready, so deals cannot be opened.",
    };
  }
  return { allowed: true, reason: null, message: null };
}
