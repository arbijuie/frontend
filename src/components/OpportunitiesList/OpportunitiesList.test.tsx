import { fireEvent, render, screen } from "@testing-library/react";
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
    strategy_type: "funding_arbitrage",
    strategy_profile_id: "baseline-v1",
    legs: [
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
    ],
    persistence_hours: 2,
    long_rate_apr: 5,
    short_rate_apr: 20,
    funding_diff_apr: 15,
    funding_edge_bps: 12,
    basis_bps: 8,
    basis_bonus_bps: 4,
    fee_impact_bps: 2,
    slippage_impact_bps: 1,
    source_penalty_bps: 0,
    total_cost_bps: 3,
    depth_source_state_by_exchange: {
      hyperliquid: "real_rest",
      lighter: "real_rest",
    },
    fee_source_state_by_exchange: {
      hyperliquid: "real_rest",
      lighter: "real_rest",
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
    negative_funding_penalty_bps: 0,
    min_profitable_hours: 10,
    hours_to_breakeven: null,
    effective_hold_hours: 72,
    signal_score_bps: 16,
    execution_adjusted_score_bps: 13,
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

type OpportunitiesListProps = Parameters<typeof OpportunitiesList>[0];

function renderList(items: OpportunityItem[], overrides: Partial<OpportunitiesListProps> = {}) {
  return render(
    <OpportunitiesList
      items={items}
      updatedAt={null}
      now={new Date("2026-01-01T00:00:00Z")}
      sortKey="priority"
      onSortKeyChange={vi.fn()}
      statusFilter="all"
      onStatusFilterChange={vi.fn()}
      search=""
      onSearchChange={vi.fn()}
      {...overrides}
    />
  );
}

describe("OpportunitiesList", () => {
  it("sorts ready items by fewer correlations first when sort is Priority", () => {
    const items: OpportunityItem[] = [
      makeItem({
        symbol: "AAA",
        status: "ready",
        combined_score: 100,
        correlated_with: ["X", "Y"],
      }),
      makeItem({ symbol: "BBB", status: "ready", combined_score: 50, correlated_with: [] }),
      makeItem({ symbol: "CCC", status: "watching", combined_score: 999 }),
    ];

    renderList(items);

    const cards = screen.getAllByTestId("opportunity-card").map((item) => item.textContent);
    expect(cards).toEqual(["BBB", "AAA", "CCC"]);
  });

  it("falls back to score when ready items have equal correlated counts", () => {
    const items: OpportunityItem[] = [
      makeItem({ symbol: "AAA", status: "ready", combined_score: 40, correlated_with: ["X"] }),
      makeItem({ symbol: "BBB", status: "ready", combined_score: 90, correlated_with: ["Y"] }),
    ];

    renderList(items);

    const cards = screen.getAllByTestId("opportunity-card").map((item) => item.textContent);
    expect(cards).toEqual(["BBB", "AAA"]);
  });

  it("calls onSortKeyChange when the sort select changes", () => {
    const onSortKeyChange = vi.fn();
    renderList([makeItem({})], { onSortKeyChange });

    fireEvent.change(screen.getByLabelText("Sort opportunities by"), {
      target: { value: "combined_score" },
    });

    expect(onSortKeyChange).toHaveBeenCalledWith("combined_score");
  });

  it("calls onStatusFilterChange when a status tab is clicked", () => {
    const onStatusFilterChange = vi.fn();
    renderList([makeItem({ status: "ready" }), makeItem({ status: "watching" })], {
      onStatusFilterChange,
    });

    fireEvent.click(screen.getByRole("button", { name: /^watching/i }));

    expect(onStatusFilterChange).toHaveBeenCalledWith("watching");
  });

  it("filters the list instantly as you type, without waiting for the debounce", () => {
    renderList([makeItem({ symbol: "AERO" }), makeItem({ symbol: "DOGE" })]);

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "aer" } });

    const cards = screen.getAllByTestId("opportunity-card").map((item) => item.textContent);
    expect(cards).toEqual(["AERO"]);
  });

  it("debounces the onSearchChange call to the parent instead of firing per keystroke", () => {
    vi.useFakeTimers();
    const onSearchChange = vi.fn();
    renderList([makeItem({})], { onSearchChange });

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "a" } });
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "ae" } });
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "aer" } });

    expect(onSearchChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith("aer");

    vi.useRealTimers();
  });

  it("resyncs the visible search value when the search prop changes externally", () => {
    const { rerender } = renderList([makeItem({})], { search: "aero" });

    rerender(
      <OpportunitiesList
        items={[makeItem({})]}
        updatedAt={null}
        now={new Date("2026-01-01T00:00:00Z")}
        sortKey="priority"
        onSortKeyChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
      />
    );

    expect((screen.getByPlaceholderText(/search/i) as HTMLInputElement).value).toBe("");
  });

  it('shows a "Show all" hint when a status filter hides every item, and resets on click', () => {
    const onStatusFilterChange = vi.fn();
    renderList([makeItem({ status: "watching" })], {
      statusFilter: "ready",
      onStatusFilterChange,
    });

    expect(screen.getByText(/none in the ready filter/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /show all/i }));

    expect(onStatusFilterChange).toHaveBeenCalledWith("all");
  });

  it("shows an empty state with no hint when there are no items at all", () => {
    renderList([]);

    expect(screen.getByText("No opportunities")).toBeTruthy();
    expect(screen.queryByText(/show all/i)).toBeNull();
  });

  it("filters by search term across the symbol", () => {
    renderList([makeItem({ symbol: "AERO" }), makeItem({ symbol: "DOGE" })], {
      search: "aer",
    });

    const cards = screen.getAllByTestId("opportunity-card").map((item) => item.textContent);
    expect(cards).toEqual(["AERO"]);
  });
});
