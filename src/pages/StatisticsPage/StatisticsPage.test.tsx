import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StatisticsPage from "./StatisticsPage";
import { PublicApiError } from "../../api/public";
import {
  usePublicCorrelation,
  usePublicOpportunities,
  usePublicStatus,
} from "../../hooks/usePublicData";

vi.mock("../../hooks/usePublicData", () => ({
  usePublicStatus: vi.fn(),
  usePublicOpportunities: vi.fn(),
  usePublicCorrelation: vi.fn(),
}));

const mockedStatus = vi.mocked(usePublicStatus);
const mockedOpportunities = vi.mocked(usePublicOpportunities);
const mockedCorrelation = vi.mocked(usePublicCorrelation);

function result<T>(data: T | null, error: PublicApiError | null = null) {
  return {
    data,
    error,
    loading: false,
    fetching: false,
    refetch: vi.fn(),
    fetchedAt: 0,
  } as never;
}

const status = {
  started_at: "2026-10-10T09:00:00+00:00",
  uptime_s: 7200,
  last_updated_at: new Date().toISOString(),
  poll_count_total: 100,
  poll_count_success: 98,
  poll_count_failed: 2,
  active_exchanges: ["hyperliquid", "lighter", "bybit"],
  exchanges: {
    hyperliquid: { last_poll_ok: true, ws_connected: true, ws_healthy: true },
    lighter: { last_poll_ok: true, ws_connected: true, ws_healthy: false },
    bybit: { last_poll_ok: false, ws_connected: false, ws_healthy: false },
  },
  screener_raw_candidates: 120,
  screener_post_cost_candidates: 60,
  screener_validated_candidates: 12,
  screener_ready_candidates: 2,
  screener_reason_severity_counts: { watching: 7, blocked: 3 },
};

const opportunity = (status: string, extra: Record<string, unknown> = {}) => ({
  symbol: "BTC",
  status,
  strategy_type: "funding_arbitrage",
  legs: [],
  liquidity_tier: "H",
  depth_quality: "A",
  reasons: [],
  ...extra,
});

const opportunities = {
  count: 3,
  ready_count: 1,
  updated_at: null,
  opportunities: [
    opportunity("ready"),
    opportunity("watching", {
      liquidity_tier: "M",
      reasons: [{ code: "persistence_insufficient", severity: "watching" }],
    }),
    opportunity("blocked", {
      liquidity_tier: "L",
      depth_quality: "D",
      reasons: [{ code: "stale_data", severity: "blocked" }],
    }),
  ],
};

const correlation = {
  count: 2,
  threshold: 0.7,
  window_hours: 24,
  pairs: [
    { symbol_a: "BTC", symbol_b: "ETH", correlation: 0.91, above_threshold: true },
    { symbol_a: "BTC", symbol_b: "SOL", correlation: 0.4, above_threshold: false },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <StatisticsPage />
    </MemoryRouter>
  );
}

describe("StatisticsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedStatus.mockReturnValue(result(status));
    mockedOpportunities.mockReturnValue(result(opportunities));
    mockedCorrelation.mockReturnValue(result(correlation));
  });

  it("shows venue sources with their state spelled out", () => {
    renderPage();

    const venues = within(screen.getByRole("list", { name: "Venue data sources" }));
    expect(venues.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "BybitUnavailable",
      "HyperliquidLive stream",
      "LighterREST fallback",
    ]);
    expect(screen.getByText("1 of 3")).toBeTruthy();
    expect(screen.getByText("1 on REST fallback")).toBeTruthy();
  });

  it("shows the screening funnel and held-back counts", () => {
    renderPage();

    const funnel = within(screen.getByRole("list", { name: "Screening funnel" }));
    expect(funnel.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Candidates found120",
      "Positive after costs60",
      "Validated12",
      "Ready2",
    ]);
    expect(screen.getByText(/7 watching, 3 blocked/)).toBeTruthy();
  });

  it("grades current routes and names the most common reasons in plain language", () => {
    renderPage();

    const decision = within(screen.getByRole("list", { name: "Routes by decision" }));
    expect(decision.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Ready1 33%",
      "Watching1 33%",
      "Blocked1 33%",
    ]);
    const reasons = within(screen.getByRole("list", { name: "Most common reasons" }));
    expect(reasons.getByText("Market data is stale")).toBeTruthy();
    expect(reasons.getByText("Edge has not persisted long enough")).toBeTruthy();
  });

  it("summarises correlated pairs", () => {
    renderPage();

    expect(screen.getByText(/1 of 2 symbol pairs move together/)).toBeTruthy();
    expect(screen.getByText("BTC / ETH")).toBeTruthy();
    expect(screen.queryByText("BTC / SOL")).toBeNull();
  });

  it("explains a closed public channel instead of showing raw errors", () => {
    mockedStatus.mockReturnValue(result(null, new PublicApiError("/public/status", 401)));
    mockedOpportunities.mockReturnValue(
      result(null, new PublicApiError("/public/opportunities", 401))
    );
    mockedCorrelation.mockReturnValue(result(null, new PublicApiError("/public/correlation", 401)));
    renderPage();

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(3);
    expect(alerts[0].textContent).toContain("Public data is not open on this deployment");
    expect(screen.getByRole("heading", { level: 1, name: "Statistics" })).toBeTruthy();
    expect(screen.queryByText(/401/)).toBeNull();
  });
});
