import { render, screen } from '@testing-library/react';
import PipelineDiagnosticsHint from './PipelineDiagnosticsHint';
import type { StatusResponse } from '../../api/types';

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
    screener_raw_candidates: 10,
    screener_post_cost_candidates: 5,
    screener_validated_candidates: 5,
    screener_ready_candidates: 1,
    ...overrides,
  };
}

describe('PipelineDiagnosticsHint', () => {
  it('shows warn when cost filters remove all candidates', () => {
    render(
      <PipelineDiagnosticsHint
        status={makeStatus({
          screener_raw_candidates: 12,
          screener_post_cost_candidates: 0,
          screener_validated_candidates: 0,
          screener_ready_candidates: 0,
        })}
      />,
    );

    expect(screen.getByText(/Cost filters are removing all candidates/i)).toBeTruthy();
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