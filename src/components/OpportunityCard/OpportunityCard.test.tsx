import { fireEvent, render, screen } from '@testing-library/react';

import OpportunityCard from './OpportunityCard';
import { type OpportunityItem, TEST_TAKER_FEE_BY_EXCHANGE } from '../../api/types';

function makeItem(): OpportunityItem {
  return {
    symbol: 'BTC',
    long_exchange: 'hyperliquid',
    short_exchange: 'lighter',
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
      hyperliquid: 'real',
      lighter: 'real',
    },
    effective_taker_fee_by_exchange: TEST_TAKER_FEE_BY_EXCHANGE,
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
    liquidity_tier: 'M',
    recommended_size_usd: 1000,
    depth_quality: 'B',
    status: 'watching',
    reasons: [
      {
        code: 'score_below_min',
        message: 'score 4.00bps < min score 5.00bps',
        severity: 'watching',
      },
      {
        code: 'funding_flips',
        message: 'funding direction flipped 1x in last 0.1h',
        severity: 'watching',
      },
    ],
  };
}

describe('OpportunityCard', () => {
  it('renders structured reason messages', () => {
    render(<OpportunityCard item={makeItem()} updatedAt={'2026-01-01T00:00:00Z'} now={new Date()} />);

    expect(screen.getByText(/score 4.00bps < min score 5.00bps/i)).toBeTruthy();
    expect(screen.getByText(/funding direction flipped 1x/i)).toBeTruthy();
  });

  it('includes basis divergence penalty in score breakdown', () => {
    const item = makeItem();
    item.basis_expansion_penalty_bps = 1;
    item.combined_score = 12;

    render(<OpportunityCard item={item} updatedAt={'2026-01-01T00:00:00Z'} now={new Date()} />);

    fireEvent.click(screen.getByRole('button', { name: /more details/i }));

    expect(screen.getByText(/basis divergence penalty/i)).toBeTruthy();
    expect(screen.getByText(/-1\.00/)).toBeTruthy();
  });
});
