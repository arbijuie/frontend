// Public projection payloads (issues #304, #305) for the public pages.
const NOW = "2026-10-10T12:00:00+00:00";

export const publicStatus = {
  started_at: "2026-10-10T09:00:00+00:00",
  uptime_s: 10_800,
  last_updated_at: NOW,
  poll_count_total: 340,
  poll_count_success: 336,
  poll_count_failed: 4,
  active_exchanges: ["hyperliquid", "lighter", "binance", "bybit"],
  exchanges: {
    hyperliquid: { last_poll_ok: true, ws_connected: true, ws_healthy: true },
    lighter: { last_poll_ok: true, ws_connected: true, ws_healthy: false },
    binance: { last_poll_ok: true, ws_connected: true, ws_healthy: true },
    bybit: { last_poll_ok: false, ws_connected: false, ws_healthy: false },
  },
  screener_raw_candidates: 120,
  screener_post_cost_candidates: 64,
  screener_validated_candidates: 18,
  screener_ready_candidates: 3,
  screener_reason_severity_counts: { watching: 11, blocked: 4 },
};

const leg = (venue: string, side: "long" | "short") => ({
  venue,
  side,
  instrument_kind: "perp" as const,
});

export const publicOpportunities = {
  count: 4,
  ready_count: 2,
  updated_at: NOW,
  opportunities: [
    {
      symbol: "BTC",
      status: "ready",
      strategy_type: "funding_arbitrage",
      legs: [leg("hyperliquid", "long"), leg("binance", "short")],
      long_rate_apr: 0.05,
      short_rate_apr: 0.21,
      funding_diff_apr: 0.16,
      funding_edge_bps: 14.2,
      basis_bps: 3.1,
      total_cost_bps: 4.4,
      signal_score_bps: 12.9,
      execution_adjusted_score_bps: 11.8,
      persistence_hours: 6,
      hours_to_breakeven: 9.5,
      liquidity_tier: "H",
      depth_quality: "A",
      reasons: [],
    },
    {
      symbol: "ETH",
      status: "ready",
      strategy_type: "funding_arbitrage",
      legs: [leg("lighter", "long"), leg("hyperliquid", "short")],
      long_rate_apr: 0.02,
      short_rate_apr: 0.12,
      funding_diff_apr: 0.1,
      funding_edge_bps: 9.4,
      basis_bps: -1.2,
      total_cost_bps: 3.9,
      signal_score_bps: 8.1,
      execution_adjusted_score_bps: 7.6,
      persistence_hours: 3,
      hours_to_breakeven: 14,
      liquidity_tier: "H",
      depth_quality: "B",
      reasons: [],
    },
    {
      symbol: "SOL",
      status: "watching",
      strategy_type: "basis_convergence",
      legs: [leg("binance", "long"), leg("lighter", "short")],
      long_rate_apr: 0.01,
      short_rate_apr: 0.06,
      funding_diff_apr: 0.05,
      funding_edge_bps: 4.2,
      basis_bps: 18,
      total_cost_bps: 5,
      signal_score_bps: 3.4,
      execution_adjusted_score_bps: 2.9,
      persistence_hours: 1,
      hours_to_breakeven: null,
      liquidity_tier: "M",
      depth_quality: "C",
      reasons: [{ code: "persistence_insufficient", severity: "watching" }],
    },
    {
      symbol: "DOGE",
      status: "blocked",
      strategy_type: "funding_arbitrage",
      legs: [leg("bybit", "long"), leg("hyperliquid", "short")],
      long_rate_apr: 0.03,
      short_rate_apr: 0.04,
      funding_diff_apr: 0.01,
      funding_edge_bps: 1.1,
      basis_bps: 0.4,
      total_cost_bps: 6.2,
      signal_score_bps: -5.1,
      execution_adjusted_score_bps: -5.6,
      persistence_hours: 0,
      hours_to_breakeven: null,
      liquidity_tier: "L",
      depth_quality: "D",
      reasons: [
        { code: "stale_data", severity: "blocked" },
        { code: "depth_quality_below_min", severity: "blocked" },
      ],
    },
  ],
};

export const publicCorrelation = {
  updated_at: NOW,
  window_hours: 24,
  threshold: 0.7,
  count: 2,
  symbols: ["BTC", "ETH", "SOL"],
  pairs: [
    { symbol_a: "BTC", symbol_b: "ETH", correlation: 0.86, above_threshold: true },
    { symbol_a: "BTC", symbol_b: "SOL", correlation: 0.52, above_threshold: false },
  ],
};

const counters = (
  snapshots: number,
  routes: number,
  symbols: number,
  ready: number,
  readyRoutes: number,
  median: number | null,
  byStrategy: Record<string, number>
) => ({
  snapshots,
  distinct_routes: routes,
  distinct_symbols: symbols,
  ready_observations: ready,
  distinct_ready_routes: readyRoutes,
  median_ready_score_bps: median,
  ready_by_strategy: byStrategy,
});

export function publicJournal(days: number) {
  return {
    capture_enabled: true,
    window_days: days,
    window_start: "2026-09-27T00:00:00+00:00",
    generated_at: NOW,
    first_snapshot_at: "2026-10-08T00:05:00+00:00",
    last_snapshot_at: "2026-10-10T11:55:00+00:00",
    totals: counters(5_420, 212, 61, 148, 19, 9.3, {
      funding_arbitrage: 131,
      basis_convergence: 17,
    }),
    days: [
      { day: "2026-10-10", ...counters(1_610, 150, 52, 41, 9, 9.8, { funding_arbitrage: 41 }) },
      {
        day: "2026-10-09",
        ...counters(2_020, 171, 57, 63, 12, 8.9, { funding_arbitrage: 50, basis_convergence: 13 }),
      },
      {
        day: "2026-10-08",
        ...counters(1_790, 160, 55, 44, 8, 9.1, { funding_arbitrage: 40, basis_convergence: 4 }),
      },
    ],
  };
}

export const healthz = { ok: true, started_at: "2026-10-10T09:00:00+00:00", uptime_s: 10_800 };
