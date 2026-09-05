import { render, screen } from '@testing-library/react';
import PipelineDiagnosticsHint from './PipelineDiagnosticsHint';
import type { StatusResponse } from '../../api/types';

function makeDropCounters(
  overrides: Partial<NonNullable<StatusResponse['screener_drop_counters']>> = {},
): NonNullable<StatusResponse['screener_drop_counters']> {
  return {
    stale: 0,
    persistence: 0,
    min_volume: 0,
    min_open_interest: 0,
    apr_cap: 0,
    non_positive_funding_edge: 0,
    basis_gate: 0,
    min_score: 0,
    basis_bonus_capped: 0,
    adaptive_hold_applied: 0,
    basis_divergence_penalty: 0,
    strict_depth: 0,
    strict_depth_by_exchange_hyperliquid: 0,
    strict_depth_by_exchange_lighter: 0,
    l2_book_fetch_error_hyperliquid: 0,
    missing_real_depth: 0,
    missing_real_depth_hyperliquid: 0,
    missing_real_depth_lighter: 0,
    missing_real_fee: 0,
    missing_real_fee_hyperliquid: 0,
    missing_real_fee_lighter: 0,
    ...overrides,
  };
}

function makeStatus(overrides: Partial<StatusResponse> = {}): StatusResponse {
  return {
    uptime_s: 10,
    started_at: '2026-01-01T00:00:00Z',
    last_updated_at: '2026-01-01T00:00:10Z',
    last_poll_started_at: '2026-01-01T00:00:09Z',
    last_poll_finished_at: '2026-01-01T00:00:10Z',
    last_poll_duration_ms: 100,
    poll_count_total: 1,
    poll_count_success: 1,
    poll_count_failed: 0,

    exchange_last_ok: {
      hyperliquid: true,
      lighter: true,
    },

    execution_backtest_gate_passed: true,

    screener_raw_candidates: 10,
    screener_post_cost_candidates: 5,
    screener_validated_candidates: 5,
    screener_ready_candidates: 1,
    screener_drop_counters: makeDropCounters(),

    ...overrides,
  };
}

describe('PipelineDiagnosticsHint', () => {
  it('shows warn when strict depth checks suppress readiness', () => {
    render(
      <PipelineDiagnosticsHint
        status={makeStatus({
          screener_raw_candidates: 12,
          screener_post_cost_candidates: 12,
          screener_validated_candidates: 12,
          screener_ready_candidates: 0,
          screener_drop_counters: makeDropCounters({
            strict_depth: 12,
            strict_depth_by_exchange_hyperliquid: 10,
            strict_depth_by_exchange_lighter: 2,
            l2_book_fetch_error_hyperliquid: 8,
          }),
        })}
      />,
    );

    expect(screen.getByText(/suppressing readiness/i)).toBeTruthy();
  });

  it('shows warn when no raw candidates and exchange is down', () => {
    render(
      <PipelineDiagnosticsHint
        status={makeStatus({
          screener_raw_candidates: 0,
          exchange_last_ok: { hyperliquid: false, lighter: true },
        })}
      />,
    );

    expect(screen.getByText(/health flag\(s\) are degraded/i)).toBeTruthy();
  });

  it('shows info when no raw candidates and health is unknown', () => {
    render(
      <PipelineDiagnosticsHint
        status={makeStatus({
          screener_raw_candidates: 0,
          exchange_last_ok: { hyperliquid: null, lighter: true },
        })}
      />,
    );

    expect(screen.getByText(/still unknown/i)).toBeTruthy();
  });

  it('shows drop counters when no raw candidates are mainly volume/score filtered', () => {
    render(
      <PipelineDiagnosticsHint
        status={makeStatus({
          screener_raw_candidates: 0,
          exchange_last_ok: { hyperliquid: true, lighter: true },
          screener_drop_counters: makeDropCounters({
            min_volume: 11,
            min_score: 4,
          }),
        })}
      />,
    );

    expect(screen.getByText(/main drops: min volume 11, min score 4/i)).toBeTruthy();
  });

  it('shows generic no-raw info when no specific drop counters dominate', () => {
    render(
      <PipelineDiagnosticsHint
        status={makeStatus({
          screener_raw_candidates: 0,
          exchange_last_ok: { hyperliquid: true, lighter: true },
          screener_drop_counters: makeDropCounters({
            min_volume: 0,
            min_score: 0,
          }),
        })}
      />,
    );

    expect(screen.getByText(/usually market-state dependent/i)).toBeTruthy();
  });

  it('shows ok when ready opportunities exist', () => {
    render(<PipelineDiagnosticsHint status={makeStatus({ screener_ready_candidates: 2 })} />);

    expect(screen.getByText(/ready opportunities are currently available/i)).toBeTruthy();
  });

  it('shows info when candidates are validated but none are ready', () => {
    render(
      <PipelineDiagnosticsHint
        status={makeStatus({
          screener_raw_candidates: 7,
          screener_post_cost_candidates: 4,
          screener_validated_candidates: 4,
          screener_ready_candidates: 0,
        })}
      />,
    );

    expect(screen.getByText(/none are ready yet/i)).toBeTruthy();
  });

  it('shows source-gap diagnostics when validated candidates miss real data', () => {
    render(
      <PipelineDiagnosticsHint
        status={makeStatus({
          screener_raw_candidates: 7,
          screener_post_cost_candidates: 4,
          screener_validated_candidates: 4,
          screener_ready_candidates: 0,
          screener_drop_counters: makeDropCounters({
            missing_real_depth: 3,
            missing_real_fee: 2,
          }),
        })}
      />,
    );

    expect(screen.getByText(/real-source gaps/i)).toBeTruthy();
  });

  it('shows basis dampener diagnostics when validated but no ready candidates', () => {
    render(
      <PipelineDiagnosticsHint
        status={makeStatus({
          screener_raw_candidates: 7,
          screener_post_cost_candidates: 4,
          screener_validated_candidates: 4,
          screener_ready_candidates: 0,
          screener_drop_counters: makeDropCounters({
            basis_bonus_capped: 3,
            adaptive_hold_applied: 2,
            basis_divergence_penalty: 1,
          }),
        })}
      />,
    );

    expect(screen.getByText(/risk dampeners active/i)).toBeTruthy();
  });

  it('uses zero defaults when drop counters are absent', () => {
    render(
      <PipelineDiagnosticsHint
        status={makeStatus({
          screener_raw_candidates: 7,
          screener_post_cost_candidates: 4,
          screener_validated_candidates: 4,
          screener_ready_candidates: 0,
          screener_drop_counters: undefined,
        })}
      />,
    );

    expect(screen.getByText(/monitor score\/cost thresholds/i)).toBeTruthy();
  });

  it('renders nothing when no diagnostic message applies', () => {
    const { container } = render(
      <PipelineDiagnosticsHint
        status={makeStatus({
          screener_raw_candidates: 5,
          screener_post_cost_candidates: 3,
          screener_validated_candidates: 0,
          screener_ready_candidates: 0,
        })}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});