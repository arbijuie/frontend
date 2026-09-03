import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ConfigPage from './ConfigPage';
import type { ConfigResponse } from '../../api/types';
import { useConfig } from '../../hooks/useConfig';
import { useUpdateConfig } from '../../hooks/useUpdateConfig';

vi.mock('../../hooks/useConfig', () => ({
  useConfig: vi.fn(),
}));

vi.mock('../../hooks/useUpdateConfig', () => ({
  useUpdateConfig: vi.fn(),
}));

vi.mock('../../components/PresetComparison/PresetComparison', () => ({
  default: () => <div>Preset comparison mock</div>,
}));

vi.mock('../../components/ConfigAccordion/ConfigAccordion', () => ({
  default: () => <div>Config accordion mock</div>,
}));

const mockedUseConfig = vi.mocked(useConfig);
const mockedUseUpdateConfig = vi.mocked(useUpdateConfig);

function makeConfig(): ConfigResponse {
  return {
    api_host: '127.0.0.1',
    api_port: 8000,
    min_score_bps: 5,
    min_volume_24h: 100000,
    min_open_interest: 0,
    min_persistence_hours: 0,
    anti_churn_cooldown_s: 14400,
    anti_churn_score_multiplier: 1.5,
    hl_taker_fee_per_side: 0.035,
    hl_maker_fee_per_side: 0,
    lighter_taker_fee_per_side: 0.001,
    lighter_maker_fee_per_side: 0,
    default_order_size_usd: 1000,
    slippage_volume_depth_ratio: 0.5,
    require_real_depth: true,
    real_depth_proxy_floor_ratio: 0.25,
    expected_hold_hours: 72,
    basis_weight: 0.5,
    basis_bonus_cap_bps: 80,
    basis_divergence_threshold_bps: 40,
    max_basis_divergence_hours: 0,
    basis_expansion_penalty_bps_per_hour: 0,
    hold_window_instability_scale: 0.35,
    liquidity_weight: 0,
    timing_penalty_bps_per_hour: 0,
    max_funding_timing_asymmetry_hours: 0,
    max_basis_bps: 0,
    max_basis_trend_bps_per_tick: 3,
    funding_ema_span_hours: 12,
    funding_avg_short_hours: 24,
    funding_avg_long_hours: 72,
    funding_instability_threshold: 1,
    funding_instability_min_std_apr: 5,
    funding_instability_multiplier: 0.5,
    max_reasonable_apr: 500,
    max_entry_adl_level: 3,
    require_isolated_margin: true,
    allow_unknown_margin_mode: false,
    loop_interval_s: 30,
    stale_data_s: 35,
    exec_enabled: false,
    exec_dry_run: true,
    exec_strategy_profile_id: 'baseline-v1',
    exec_stop_on_consecutive_rollbacks: 3,
    exec_stop_on_api_errors_per_window: 5,
    exec_api_error_window_s: 600,
    exec_stop_on_median_slippage_bps: 12,
    exec_slippage_sample_size: 5,
    exec_stop_on_stale_data_s: 60,
    exec_margin_alert_pct: 15,
    exec_margin_force_close_pct: 8,
    exec_adl_warn_quantile: 3,
    exec_adl_critical_quantile: 4,
    exec_recovery_cooldown_s: 900,
    exec_recovery_require_manual_ack: true,
    backtest_capture_enabled: false,
    backtest_db_path: 'data/backtest.sqlite3',
    backtest_entry_score_bps: 10,
    backtest_exit_score_bps: 3,
    backtest_replay_cycle_hours: 1,
    backtest_min_samples_per_symbol: 24,
    backtest_strategy_lock_path: 'data/backtest_strategy_lock.json',
    backtest_gate_require_lock_for_execution: true,
    backtest_gate_min_win_rate: 0.55,
    backtest_gate_min_total_pnl_bps: 0,
    backtest_gate_max_drawdown_bps: 50,
    runbook_config_fields: ['min_score_bps', 'require_real_depth'],
    runbook_presets: {
      balanced: {
        min_score_bps: 8,
        require_real_depth: true,
      },
    },
  };
}

describe('ConfigPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('does not send legacy fee alias keys in PATCH payload', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(makeConfig());

    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    mockedUseUpdateConfig.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);

    render(<ConfigPage />);

    const input = screen.getByLabelText('Min Score (bps)');
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: /save \(/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.persist).toBe(true);
    expect(payload.min_score_bps).toBe(9);
    expect('hl_fee_per_side' in payload).toBe(false);
    expect('lighter_fee_per_side' in payload).toBe(false);
  });
});
