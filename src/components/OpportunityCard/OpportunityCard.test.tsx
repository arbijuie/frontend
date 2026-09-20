import { fireEvent, render, screen } from "@testing-library/react";

import OpportunityCard from "./OpportunityCard";
import { type OpportunityItem, TEST_TAKER_FEE_BY_EXCHANGE } from "../../api/types";

function makeItem(): OpportunityItem {
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
    depth_source_by_exchange: {
      hyperliquid: "real",
      lighter: "real",
    },
    effective_taker_fee_by_exchange: TEST_TAKER_FEE_BY_EXCHANGE,
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
    status: "watching",
    reasons: [
      {
        code: "score_below_min",
        message: "score 4.00bps < min score 5.00bps",
        severity: "watching",
      },
      {
        code: "funding_flips",
        message: "funding direction flipped 1x in last 0.1h",
        severity: "watching",
      },
    ],
  };
}

describe("OpportunityCard", () => {
  it("renders structured reason messages", () => {
    render(
      <OpportunityCard item={makeItem()} updatedAt={"2026-01-01T00:00:00Z"} now={new Date()} />
    );

    expect(screen.getByText(/score 4.00bps < min score 5.00bps/i)).toBeTruthy();
    expect(screen.getByText(/funding direction flipped 1x/i)).toBeTruthy();
  });

  it("includes basis divergence penalty in score breakdown", () => {
    const item = makeItem();
    item.basis_expansion_penalty_bps = 1;
    item.combined_score = 12;

    render(<OpportunityCard item={item} updatedAt={"2026-01-01T00:00:00Z"} now={new Date()} />);

    fireEvent.click(screen.getByRole("button", { name: /more details/i }));

    expect(screen.getByText(/basis divergence penalty/i)).toBeTruthy();
    expect(screen.getByText(/-1\.00/)).toBeTruthy();
  });

  it('shows historical win rate with closed trade count when available', () => {
    const item = makeItem();
    item.historical_win_rate = 0.5;
    item.historical_closed_trades = 20;

    render(<OpportunityCard item={item} updatedAt={'2026-01-01T00:00:00Z'} now={new Date()} />);

    fireEvent.click(screen.getByRole('button', { name: /more details/i }));

    expect(screen.getByText(/historical win rate/i)).toBeTruthy();
    expect(screen.getByText('50% (20 trades)')).toBeTruthy();
  });

  it('shows a placeholder when no historical win rate is known', () => {
    render(<OpportunityCard item={makeItem()} updatedAt={'2026-01-01T00:00:00Z'} now={new Date()} />);

    fireEvent.click(screen.getByRole('button', { name: /more details/i }));

    const label = screen.getByText(/historical win rate/i);
    expect(label.nextElementSibling?.textContent).toBe('—');
  });

  it('shows source penalty and canonical source states in details', () => {
    const item = makeItem();
    item.source_penalty_bps = 3;
    item.depth_source_state_by_exchange = {
      hyperliquid: 'real_rest',
      lighter: 'unavailable',
    };
    item.fee_source_state_by_exchange = {
      hyperliquid: 'real_rest',
      lighter: 'config',
    };

    render(<OpportunityCard item={item} updatedAt={'2026-01-01T00:00:00Z'} now={new Date()} />);

    fireEvent.click(screen.getByRole('button', { name: /more details/i }));

    expect(screen.getAllByText(/source penalty/i).length).toBeGreaterThan(0);
    expect(screen.getByText('real_rest / unavailable')).toBeTruthy();
    expect(screen.getByText('real_rest / config')).toBeTruthy();
  });

  it('falls back from legacy source states in details', () => {
    const item = makeItem();
    item.depth_source_state_by_exchange = undefined;
    item.fee_source_state_by_exchange = undefined;
    item.depth_source_by_exchange = {
      hyperliquid: 'real',
      lighter: 'none',
    };
    item.fee_source_by_exchange = {
      hyperliquid: 'config',
      lighter: 'real',
    };

    render(<OpportunityCard item={item} updatedAt={'2026-01-01T00:00:00Z'} now={new Date()} />);

    fireEvent.click(screen.getByRole('button', { name: /more details/i }));

    expect(screen.getByText('real_rest / unavailable')).toBeTruthy();
    expect(screen.getByText('config / real_rest')).toBeTruthy();
  });

  it('shows canonical microstructure values for both legs', () => {
    const item = makeItem();
    item.microstructure_by_exchange = {
      hyperliquid: {
        best_ask: '100.20',
        best_bid: '100.00',
        mid: '100.10',
        spread_bps: 2.0,
        depth_band_5bps_usd: 60000,
        depth_band_10bps_usd: 120000,
        depth_band_20bps_usd: 240000,
        imbalance: 0.1,
        quality: 'A',
        price_source: 'real_rest',
        depth_source: 'real_rest',
        fee_source: 'real_rest',
      },
      lighter: {
        best_ask: '101.40',
        best_bid: '101.00',
        mid: '101.20',
        spread_bps: 3.95,
        depth_band_5bps_usd: 45000,
        depth_band_10bps_usd: 90000,
        depth_band_20bps_usd: 180000,
        imbalance: -0.05,
        quality: 'B',
        price_source: 'real_ws',
        depth_source: 'real_ws',
        fee_source: 'config',
      },
    };

    render(<OpportunityCard item={item} updatedAt={'2026-01-01T00:00:00Z'} now={new Date()} />);

    fireEvent.click(screen.getByRole('button', { name: /more details/i }));

    expect(screen.getByText('2.00 / 3.95')).toBeTruthy();
    expect(screen.getByText('120000 / 90000')).toBeTruthy();
    expect(screen.getByText('240000 / 180000')).toBeTruthy();
    expect(screen.getByText('100.10 / 101.20')).toBeTruthy();
    expect(screen.getAllByText('real_rest / real_ws').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('real_rest / config')).toBeTruthy();
  });

  it('lists correlated symbols when the cluster cap recorded them', () => {
    const item = makeItem();
    item.correlated_with = ['MEME1', 'MEME2', 'MEME3'];

    render(<OpportunityCard item={item} updatedAt={'2026-01-01T00:00:00Z'} now={new Date()} />);

    fireEvent.click(screen.getByRole('button', { name: /more details/i }));

    expect(screen.getByText(/correlated with/i)).toBeTruthy();
    expect(screen.getByText('MEME1, MEME2, MEME3')).toBeTruthy();
  });

  it('omits the correlated row when there are no correlated symbols', () => {
    render(<OpportunityCard item={makeItem()} updatedAt={'2026-01-01T00:00:00Z'} now={new Date()} />);

    fireEvent.click(screen.getByRole('button', { name: /more details/i }));

    expect(screen.queryByText(/correlated with/i)).toBeNull();
  });
});
