import { render, screen } from "@testing-library/react";
import OpportunitiesList from "./OpportunitiesList";
import type { OpportunityItem } from "../../api/types";

vi.mock("../OpportunityCard/OpportunityCard", () => ({
  default: ({ item }: { item: OpportunityItem }) => (
    <div data-testid="opportunity-card">{item.symbol}</div>
  ),
}));

function makeItem(overrides: Partial<OpportunityItem>): OpportunityItem {
  return {
    symbol: "BTC",
    long_exchange: "hyperliquid",
    short_exchange: "lighter",
    persistence_hours: 2,
    long_rate_apr: 5,
    short_rate_apr: 20,
    funding_diff_apr: 15,
    funding_edge_bps: 12,
    basis_bps: 8,
    basis_bonus_bps: 4,
    fee_impact_bps: 2,
    slippage_impact_bps: 1,
    total_cost_bps: 3,
    depth_source_by_exchange: {
      hyperliquid: "real",
      lighter: "real",
    },
    effective_taker_fee_by_exchange: {
      hyperliquid: 0.035,
      lighter: 0.001,
    },
    long_hours_to_next_funding: 0.5,
    short_hours_to_next_funding: 0.2,
    funding_timing_asymmetry_hours: 0.3,
    funding_timing_penalty_bps: 0.0,
    basis_expansion_penalty_bps: 0,
    min_profitable_hours: 10,
    hours_to_breakeven: null,
    effective_hold_hours: 72,
    combined_score: 13,
    long_forecast: null,
    short_forecast: null,
    funding_instability_multiplier: 1,
    basis_trend: null,
    basis_divergence_hours: null,
    liquidity_tier: "M",
    recommended_size_usd: 1000,
    depth_quality: "B",
    status: "ready",
    reasons: [],
    ...overrides,
  };
}

describe("OpportunitiesList", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("sorts ready items by fewer correlations first when sort is Priority", () => {
    const items: OpportunityItem[] = [
      makeItem({ symbol: "AAA", status: "ready", combined_score: 100, correlated_with: ["X", "Y"] }),
      makeItem({ symbol: "BBB", status: "ready", combined_score: 50, correlated_with: [] }),
      makeItem({ symbol: "CCC", status: "watching", combined_score: 999 }),
    ];

    render(<OpportunitiesList items={items} updatedAt={null} now={now} />);

    const cards = screen.getAllByTestId("opportunity-card").map((item) => item.textContent);
    expect(cards).toEqual(["BBB", "AAA", "CCC"]);
  });

  it("falls back to score when ready items have equal correlated counts", () => {
    const items: OpportunityItem[] = [
      makeItem({ symbol: "AAA", status: "ready", combined_score: 40, correlated_with: ["X"] }),
      makeItem({ symbol: "BBB", status: "ready", combined_score: 90, correlated_with: ["Y"] }),
    ];

    render(<OpportunitiesList items={items} updatedAt={null} now={now} />);

    const cards = screen.getAllByTestId("opportunity-card").map((item) => item.textContent);
    expect(cards).toEqual(["BBB", "AAA"]);
  });
});
