import { OPPORTUNITY_STRATEGY_LABEL } from "../api/opportunities";
import type { PublicApiError } from "../api/public";
import type {
  OpportunityReasonCode,
  OpportunityStrategyType,
  PublicExchangeStatus,
  PublicOpportunityItem,
  PublicStatusResponse,
} from "../api/types";

/**
 * Where a venue's market data comes from, derived from the public liveness flags only:
 * - `live`: the WebSocket feed is connected and healthy (WS-first runtime).
 * - `rest_fallback`: the WS feed is degraded but REST polling still succeeds.
 * - `down`: neither source is currently healthy.
 * - `unknown`: the runtime has not reported this venue yet.
 */
export type VenueSourceState = "live" | "rest_fallback" | "down" | "unknown";

export const VENUE_SOURCE_LABEL: Record<VenueSourceState, string> = {
  live: "Live stream",
  rest_fallback: "REST fallback",
  down: "Unavailable",
  unknown: "Not reported",
};

export function venueSourceState(item: PublicExchangeStatus | undefined): VenueSourceState {
  if (!item) return "unknown";
  const { last_poll_ok: pollOk, ws_healthy: wsHealthy } = item;
  if (wsHealthy === true) return "live";
  if (pollOk === true) return "rest_fallback";
  if (pollOk === false || wsHealthy === false) return "down";
  return "unknown";
}

export interface VenueRow {
  venue: string;
  state: VenueSourceState;
}

export function venueRows(status: PublicStatusResponse): VenueRow[] {
  const exchanges = status.exchanges ?? {};
  const names = new Set([...(status.active_exchanges ?? []), ...Object.keys(exchanges)]);
  return [...names].sort().map((venue) => ({ venue, state: venueSourceState(exchanges[venue]) }));
}

export function countBy<T extends string>(values: T[]): Partial<Record<T, number>> {
  const counts: Partial<Record<T, number>> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

export type DataFreshness = "fresh" | "stale" | "unknown";

/** Fresh while the last runtime update is younger than `staleAfterS` seconds. */
export function dataFreshness(
  lastUpdatedAt: string | null | undefined,
  now: number,
  staleAfterS = 120
): { state: DataFreshness; ageSeconds: number | null } {
  if (!lastUpdatedAt) return { state: "unknown", ageSeconds: null };
  const updated = Date.parse(lastUpdatedAt);
  if (Number.isNaN(updated)) return { state: "unknown", ageSeconds: null };
  const ageSeconds = Math.max(0, Math.round((now - updated) / 1000));
  return { state: ageSeconds <= staleAfterS ? "fresh" : "stale", ageSeconds };
}

export function formatAge(seconds: number | null): string {
  if (seconds === null) return "unknown";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86_400)} d ago`;
}

export interface ReasonCount {
  code: OpportunityReasonCode;
  severity: "watching" | "blocked";
  count: number;
}

/** Most frequent (code, severity) pairs across the current opportunities. */
export function topReasons(items: PublicOpportunityItem[], limit = 5): ReasonCount[] {
  const counts = new Map<string, ReasonCount>();
  for (const item of items) {
    for (const reason of item.reasons ?? []) {
      const key = `${reason.severity}:${reason.code}`;
      const entry = counts.get(key) ?? { code: reason.code, severity: reason.severity, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
    .slice(0, limit);
}

// Plain-language names for the stable reason taxonomy (`ReasonCode`). The public API drops
// the free-text messages, so the UI owns this copy.
export const REASON_LABEL: Record<OpportunityReasonCode, string> = {
  persistence_insufficient: "Edge has not persisted long enough",
  historical_win_rate_low: "Low historical win rate",
  historical_win_rate_unavailable: "No trade history for this route yet",
  break_even_window: "Break-even takes too long",
  score_below_min: "Score below the minimum",
  net_pnl_below_min: "Expected net profit below the minimum",
  funding_flips: "Funding direction keeps flipping",
  basis_limit: "Price gap between venues too wide",
  basis_trend_unstable: "Price gap trend is unstable",
  basis_divergence_hard: "Price gap is diverging",
  basis_divergence_window: "Price gap diverging for too long",
  funding_timing_asymmetry: "Funding payments are out of sync",
  funding_unstable: "Funding rate is unstable",
  funding_trend_thin_edge: "Edge is thin for the funding trend",
  stale_data: "Market data is stale",
  real_depth_unavailable: "Order-book depth unavailable",
  depth_quality_below_min: "Order-book depth too shallow",
  real_fee_unavailable: "Venue fees unavailable",
  margin_mode_unknown: "Margin mode unknown",
  adl_limit: "Auto-deleverage risk too high",
  margin_mode_cross: "Cross margin not allowed",
  anti_churn_cooldown: "Re-entry cooldown active",
  correlation_limit: "Too many correlated routes",
  executable_spread_below_entry: "Executable spread below entry level",
  executable_spread_unconfirmed: "Executable spread not confirmed",
};

export function reasonLabel(code: string): string {
  return REASON_LABEL[code as OpportunityReasonCode] ?? code.replace(/_/g, " ");
}

export function strategyLabel(strategy: string): string {
  return (
    OPPORTUNITY_STRATEGY_LABEL[strategy as OpportunityStrategyType] ?? strategy.replace(/_/g, " ")
  );
}

export function formatVenue(venue: string): string {
  if (venue === "dydx") return "dYdX";
  return venue.charAt(0).toUpperCase() + venue.slice(1);
}

/** Plain-language explanation of a failed public read, keyed on the HTTP status. */
export function describePublicError(error: PublicApiError): { title: string; detail: string } {
  if (error.status === null) {
    return {
      title: "The API cannot be reached",
      detail: "Check your connection. The service may also be restarting; try again shortly.",
    };
  }
  if (error.status === 401 || error.status === 403) {
    return {
      title: "Public data is not open on this deployment",
      detail:
        "This server only shares data with signed-in operators. Ask the operator to open the public channel, or sign in through the operator console.",
    };
  }
  if (error.status === 404) {
    return {
      title: "Public data is not available on this server version",
      detail: "The server does not provide this public view yet.",
    };
  }
  if (error.status === 429) {
    const wait =
      error.retryAfterSeconds !== null ? ` Try again in ${error.retryAfterSeconds} s.` : "";
    return {
      title: "Too many requests",
      detail: `The public channel is rate-limited.${wait}`,
    };
  }
  return {
    title: "The server could not answer",
    detail: `The request failed with HTTP ${error.status}. Try again shortly.`,
  };
}
