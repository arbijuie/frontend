import { expect, test } from "@playwright/test";

type Decision = "ready" | "watching" | "blocked";

type CandidateLeg = {
  instrument_kind: "perp";
  venue: string;
  venue_native_symbol: string;
  normalized_symbol: string;
  side: "long" | "short";
  mark_price: string;
  index_price: string;
  funding_rate: number;
  borrow_rate: null;
  fee_taker: number;
  fee_maker: null;
  margin_mode: null;
  settlement_ccy: "USDC";
  quote_asset: "USDC";
};

const BASE_LEGS: CandidateLeg[] = [
  {
    instrument_kind: "perp",
    venue: "hyperliquid",
    venue_native_symbol: "BTC",
    normalized_symbol: "BTC",
    side: "long",
    mark_price: "100",
    index_price: "100",
    funding_rate: 5,
    borrow_rate: null,
    fee_taker: 0.035,
    fee_maker: null,
    margin_mode: null,
    settlement_ccy: "USDC",
    quote_asset: "USDC",
  },
  {
    instrument_kind: "perp",
    venue: "lighter",
    venue_native_symbol: "BTC",
    normalized_symbol: "BTC",
    side: "short",
    mark_price: "101",
    index_price: "101",
    funding_rate: 20,
    borrow_rate: null,
    fee_taker: 0.001,
    fee_maker: null,
    margin_mode: null,
    settlement_ccy: "USDC",
    quote_asset: "USDC",
  },
];

function buildCandidate(decision: Decision) {
  return {
    symbol: "BTC",
    strategy_type: "funding_arbitrage",
    strategy_profile_id: "baseline-v1",
    legs: BASE_LEGS,
    signal_score_bps: 16,
    execution_adjusted_score_bps: 12,
    combined_score: 12,
    correlated_ready_count: 1,
    status: decision,
    reasons: [],
  };
}

const correlationPayload = {
  threshold: 0.7,
  max_correlated_positions: 3,
  window_hours: 24,
  bucket_s: 300,
  min_samples: 30,
  updated_at: "2026-01-01T00:00:10Z",
  symbols: ["BTC", "ETH"],
  count: 1,
  pairs: [
    {
      symbol_a: "BTC",
      symbol_b: "ETH",
      correlation: 0.8,
      samples: 100,
      above_threshold: true,
    },
  ],
};

function preflightPayload(decision: Decision) {
  const blockerByDecision = {
    ready: [],
    watching: [
      {
        code: "dry_run_mode",
        severity: "watching",
        source: "runtime",
        message: "Execution dry-run mode is enabled.",
      },
    ],
    blocked: [
      {
        code: "stale_runtime_snapshot",
        severity: "blocked",
        source: "runtime",
        message: "Latest screener snapshot is stale.",
      },
    ],
  } as const;

  const ready = decision === "ready";

  return {
    ready,
    decision,
    checked_at: "2026-01-01T00:00:10Z",
    mode: {
      exec_enabled: true,
      exec_dry_run: decision !== "ready",
      strategy_profile_id: "baseline-v1",
    },
    gate: {
      passed: true,
      reason: null,
      strategy_profile_id: "baseline-v1",
      strategy_id: "baseline-v1",
      lock_id: "lock-1",
    },
    runtime: {
      last_updated_at: "2026-01-01T00:00:09Z",
      poll_count_success: 12,
      exchange_last_ok: {
        hyperliquid: true,
        lighter: true,
      },
      screener_ready_candidates: 2,
      correlation_concentration: {
        level: decision === "blocked" ? "blocked" : decision === "watching" ? "watching" : "ok",
        ready_count: 2,
        largest_cluster_size: 2,
        largest_cluster_ratio: 1,
        largest_cluster_symbols: ["BTC", "ETH"],
      },
      consecutive_rollbacks: 0,
      entries_stopped: false,
    },
    candidate: {
      ...buildCandidate(decision),
    },
    blockers: blockerByDecision[decision],
    lock_metrics: null,
    lock_detail_url: null,
  };
}

async function mockReadinessEndpoints(decision: Decision, page: import("@playwright/test").Page) {
  await page.route("http://127.0.0.1:8000/execution/preflight**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(preflightPayload(decision)),
    });
  });

  await page.route("http://127.0.0.1:8000/correlation**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(correlationPayload),
    });
  });
}

test.describe("Execution preflight readiness center", () => {
  test("renders ready decision", async ({ page }) => {
    await mockReadinessEndpoints("ready", page);
    await page.goto("/execution/preflight");

    await expect(page.getByRole("heading", { name: "Execution Preflight" })).toBeVisible();
    await expect(page.getByText("final decision: READY")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mode" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gate" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Runtime" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Blockers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Candidate" })).toBeVisible();
  });

  test("renders watching decision", async ({ page }) => {
    await mockReadinessEndpoints("watching", page);
    await page.goto("/execution/preflight");

    await expect(page.getByText("final decision: WATCHING")).toBeVisible();
    await expect(
      page.getByText("[watching] runtime::dry_run_mode - Execution dry-run mode is enabled.")
    ).toBeVisible();
  });

  test("renders blocked decision", async ({ page }) => {
    await mockReadinessEndpoints("blocked", page);
    await page.goto("/execution/preflight");

    await expect(page.getByText("final decision: BLOCKED")).toBeVisible();
    await expect(
      page.getByText(
        "[blocked] runtime::stale_runtime_snapshot - Latest screener snapshot is stale."
      )
    ).toBeVisible();
  });
});
