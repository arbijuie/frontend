import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import ConfigPage from "./ConfigPage";
import {
  type ConfigResponse,
  TEST_HYPERLIQUID_TAKER_FEE,
  TEST_LIGHTER_TAKER_FEE,
  TEST_TAKER_FEE_BY_EXCHANGE,
} from "../../api/types";
import { useConfig } from "../../hooks/useConfig";
import { useUpdateConfig } from "../../hooks/useUpdateConfig";
import { useUpdateMePreferences } from "../../hooks/useUpdateMePreferences";
import { useMePreferences } from "../../hooks/useMePreferences";
import type { MePreferencesResponse } from "../../api/me-preferences";

vi.mock("../../hooks/useConfig", () => ({
  useConfig: vi.fn(),
}));

vi.mock("../../hooks/useUpdateConfig", () => ({
  useUpdateConfig: vi.fn(),
}));

vi.mock("../../hooks/useMePreferences", () => ({
  useMePreferences: vi.fn(),
}));

vi.mock("../../hooks/useUpdateMePreferences", () => ({
  useUpdateMePreferences: vi.fn(),
}));

vi.mock("../../components/ProductModes/ProductModes", () => ({
  default: ({
    selectedPreset,
    hasOverrides,
    onApplyPreset,
    applyingPresetKey,
    disableAll,
  }: {
    selectedPreset: string | null;
    hasOverrides: boolean;
    onApplyPreset: (preset: { key: string; name: string; values: Record<string, number> }) => void;
    applyingPresetKey: string | null;
    disableAll: boolean;
  }) => (
    <div>
      <span data-testid="modes-selected">{selectedPreset ?? "none"}</span>
      <span data-testid="modes-overrides">{hasOverrides ? "overrides" : "no-overrides"}</span>
      <span data-testid="modes-applying">{applyingPresetKey ?? "idle"}</span>
      <button
        type="button"
        disabled={disableAll}
        onClick={() =>
          onApplyPreset({ key: "balanced", name: "Balanced", values: { min_score_bps: 8 } })
        }
      >
        Apply Standard mode
      </button>
    </div>
  ),
}));

vi.mock("../../components/ConfigAccordion/ConfigAccordion", () => ({
  default: () => <div>Config accordion mock</div>,
}));

const mockedUseConfig = vi.mocked(useConfig);
const mockedUseUpdateConfig = vi.mocked(useUpdateConfig);
const mockedUseMePreferences = vi.mocked(useMePreferences);
const mockedUseUpdateMePreferences = vi.mocked(useUpdateMePreferences);

function makeConfig(overrides: Partial<ConfigResponse> = {}): ConfigResponse {
  return {
    api_host: "127.0.0.1",
    api_port: 8000,
    min_score_bps: 5,
    min_volume_24h: 100000,
    min_open_interest: 0,
    min_persistence_hours: 0,
    anti_churn_cooldown_s: 14400,
    anti_churn_score_multiplier: 1.5,
    hl_taker_fee_per_side: TEST_HYPERLIQUID_TAKER_FEE,
    hl_maker_fee_per_side: 0,
    lighter_taker_fee_per_side: TEST_LIGHTER_TAKER_FEE,
    lighter_maker_fee_per_side: 0,
    taker_fee_per_side_by_exchange: TEST_TAKER_FEE_BY_EXCHANGE,
    default_order_size_usd: 1000,
    max_entry_slippage_bps: 10,
    min_depth_quality: "B",
    portfolio_usd: 0,
    max_position_pct: 0.2,
    max_volume_fraction: 0.01,
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
    correlation_threshold: 0.7,
    max_correlated_positions: 3,
    correlation_window_hours: 24,
    correlation_bucket_s: 300,
    correlation_min_samples: 30,
    loop_interval_s: 30,
    stale_data_s: 35,
    exec_enabled: false,
    exec_dry_run: true,
    exec_strategy_profile_id: "baseline-v1",
    exec_leg_retry_attempts: 2,
    exec_leg_retry_interval_s: 1,
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
    active_exchanges: ["hyperliquid", "lighter"],
    binance_base_url: "https://fapi.binance.com",
    aster_base_url: "https://fapi.asterdex.com",
    bybit_base_url: "https://api.bybit.com",
    extended_base_url: "https://api.starknet.extended.exchange",
    backtest_capture_enabled: false,
    backtest_db_path: "data/backtest.sqlite3",
    backtest_entry_score_bps: 10,
    backtest_exit_score_bps: 3,
    backtest_replay_cycle_hours: 1,
    backtest_min_samples_per_symbol: 24,
    backtest_funding_decay_exit_ratio: 0.5,
    backtest_basis_reversal_exit: true,
    backtest_liquidity_drain_exit_ratio: 0.7,
    backtest_time_stop_hold_multiplier: 2,
    backtest_strategy_lock_path: "data/backtest_strategy_lock.json",
    backtest_gate_require_lock_for_execution: true,
    backtest_gate_min_win_rate: 0.55,
    backtest_gate_min_total_pnl_bps: 0,
    backtest_gate_max_drawdown_bps: 50,
    durable_snapshots_enabled: true,
    durable_snapshots_db_path: "data/market_snapshots.sqlite3",
    durable_snapshots_retention_days: 2,
    durable_snapshots_prune_interval_s: 300,
    durable_snapshots_recover_on_startup: true,
    durable_snapshots_recover_max_rows: 100000,
    backtest_history_gate_enabled: false,
    backtest_history_lookback_days: 90,
    backtest_history_min_win_rate: 0.6,
    backtest_history_min_closed_trades: 10,
    backtest_history_refresh_s: 300,
    runbook_config_fields: ["min_score_bps"],
    runbook_presets: {
      balanced: {
        min_score_bps: 8,
      },
    },
    ...overrides,
  } as unknown as ConfigResponse;
}

describe("ConfigPage", () => {
  const refetch = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseMePreferences.mockReturnValue({
      data: null,
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    mockedUseUpdateMePreferences.mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isPending: false,
    } as never);
  });

  it("does not send legacy fee alias keys in PATCH payload", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(makeConfig());

    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);

    render(<ConfigPage />);

    const input = screen.getByLabelText("Min Score (bps)");
    fireEvent.change(input, { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm & save/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.persist).toBe(true);
    expect(payload.min_score_bps).toBe(9);
    expect("hl_fee_per_side" in payload).toBe(false);
    expect("lighter_fee_per_side" in payload).toBe(false);
  });

  it("saves manual personal profile overrides via /me/preferences", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      selected_preset: null,
      runbook_overrides: { min_score_bps: 9 },
      effective_runbook_values: { min_score_bps: 9 },
      runbook_config_fields: ["min_score_bps"],
      runbook_presets: {},
      tutorial: {
        welcome_hint_dismissed: false,
        welcome_completed: false,
        onboarding_completed: false,
      },
      updated_at: null,
    });

    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    mockedUseMePreferences.mockReturnValue({
      data: {
        selected_preset: null,
        runbook_overrides: {},
        effective_runbook_values: { min_score_bps: 5 },
        runbook_config_fields: ["min_score_bps"],
        runbook_presets: {},
        tutorial: {
          welcome_hint_dismissed: false,
          welcome_completed: false,
          onboarding_completed: false,
        },
        updated_at: null,
      },
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    mockedUseUpdateMePreferences.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<ConfigPage />);

    fireEvent.change(screen.getAllByLabelText("Min Score (bps)")[0], { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Save personal profile" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        preset: null,
        runbook_overrides: { min_score_bps: 9 },
      });
    });
  });

  it("allows saving runtime defaults when current profile stores manual overrides", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      selected_preset: null,
      runbook_overrides: {},
      effective_runbook_values: { min_score_bps: 5 },
      runbook_config_fields: ["min_score_bps"],
      runbook_presets: { balanced: { min_score_bps: 8 } },
      tutorial: {
        welcome_hint_dismissed: false,
        welcome_completed: false,
        onboarding_completed: false,
      },
      updated_at: null,
    });

    mockedUseConfig.mockReturnValue({
      data: makeConfig({ min_score_bps: 5 }),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    mockedUseMePreferences.mockReturnValue({
      data: {
        selected_preset: null,
        runbook_overrides: { min_score_bps: 9 },
        effective_runbook_values: { min_score_bps: 9 },
        runbook_config_fields: ["min_score_bps"],
        runbook_presets: { balanced: { min_score_bps: 8 } },
        tutorial: {
          welcome_hint_dismissed: false,
          welcome_completed: false,
          onboarding_completed: false,
        },
        updated_at: null,
      },
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    mockedUseUpdateMePreferences.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<ConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: "Use runtime defaults" }));
    fireEvent.click(screen.getByRole("button", { name: "Save personal profile" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        preset: null,
        runbook_overrides: {},
      });
    });
  });

  it("rebuilds runtime-based personal draft from refreshed config values", () => {
    const staleProfile = {
      selected_preset: null,
      runbook_overrides: {},
      effective_runbook_values: { min_score_bps: 5 },
      runbook_config_fields: ["min_score_bps"],
      runbook_presets: {},
      tutorial: {
        welcome_hint_dismissed: false,
        welcome_completed: false,
        onboarding_completed: false,
      },
      updated_at: null,
    };

    mockedUseConfig.mockReturnValue({
      data: makeConfig({ min_score_bps: 5 }),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    mockedUseMePreferences.mockReturnValue({
      data: staleProfile,
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });

    const { rerender } = render(<ConfigPage />);
    expect((screen.getAllByLabelText("Min Score (bps)")[0] as HTMLInputElement).value).toBe("5");

    mockedUseConfig.mockReturnValue({
      data: makeConfig({ min_score_bps: 7 }),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseMePreferences.mockReturnValue({
      data: staleProfile,
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    rerender(<ConfigPage />);

    expect((screen.getAllByLabelText("Min Score (bps)")[0] as HTMLInputElement).value).toBe("7");
  });

  it("saves selected personal preset as profile base", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      selected_preset: "balanced",
      runbook_overrides: {},
      effective_runbook_values: { min_score_bps: 8 },
      runbook_config_fields: ["min_score_bps"],
      runbook_presets: { balanced: { min_score_bps: 8 } },
      tutorial: {
        welcome_hint_dismissed: false,
        welcome_completed: false,
        onboarding_completed: false,
      },
      updated_at: null,
    });

    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    mockedUseMePreferences.mockReturnValue({
      data: {
        selected_preset: null,
        runbook_overrides: {},
        effective_runbook_values: { min_score_bps: 5 },
        runbook_config_fields: ["min_score_bps"],
        runbook_presets: { balanced: { min_score_bps: 8 } },
        tutorial: {
          welcome_hint_dismissed: false,
          welcome_completed: false,
          onboarding_completed: false,
        },
        updated_at: null,
      },
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    mockedUseUpdateMePreferences.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<ConfigPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "balanced" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save personal profile" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        preset: "balanced",
        runbook_overrides: {},
      });
    });
  });

  it("keeps saved overrides when reloading the already selected personal preset", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      selected_preset: "balanced",
      runbook_overrides: { min_score_bps: 9 },
      effective_runbook_values: { min_score_bps: 9 },
      runbook_config_fields: ["min_score_bps"],
      runbook_presets: { balanced: { min_score_bps: 8 } },
      tutorial: {
        welcome_hint_dismissed: false,
        welcome_completed: false,
        onboarding_completed: false,
      },
      updated_at: null,
    });

    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    mockedUseMePreferences.mockReturnValue({
      data: {
        selected_preset: "balanced",
        runbook_overrides: { min_score_bps: 9 },
        effective_runbook_values: { min_score_bps: 9 },
        runbook_config_fields: ["min_score_bps"],
        runbook_presets: { balanced: { min_score_bps: 8 } },
        tutorial: {
          welcome_hint_dismissed: false,
          welcome_completed: false,
          onboarding_completed: false,
        },
        updated_at: null,
      },
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    mockedUseUpdateMePreferences.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<ConfigPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "balanced" })[0]);
    expect((screen.getAllByLabelText("Min Score (bps)")[0] as HTMLInputElement).value).toBe("9");
    fireEvent.click(screen.getByRole("button", { name: "Save personal profile" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        preset: "balanced",
        runbook_overrides: { min_score_bps: 9 },
      });
    });
  });

  it("disables an active personal profile", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);

    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    mockedUseMePreferences.mockReturnValue({
      data: {
        selected_preset: "balanced",
        runbook_overrides: { min_score_bps: 9 },
        effective_runbook_values: { min_score_bps: 9 },
        runbook_config_fields: ["min_score_bps"],
        runbook_presets: { balanced: { min_score_bps: 8 } },
        tutorial: {
          welcome_hint_dismissed: false,
          welcome_completed: false,
          onboarding_completed: false,
        },
        updated_at: null,
      },
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    mockedUseUpdateMePreferences.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<ConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: "Disable profile" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        preset: null,
        runbook_overrides: {},
      });
    });
  });

  it("allows clearing an invalid stored profile even when it is inactive", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);

    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    mockedUseMePreferences.mockReturnValue({
      data: {
        selected_preset: null,
        runbook_overrides: {},
        effective_runbook_values: { min_score_bps: 5 },
        runbook_config_fields: ["min_score_bps"],
        runbook_presets: { balanced: { min_score_bps: 8 } },
        tutorial: {
          welcome_hint_dismissed: false,
          welcome_completed: false,
          onboarding_completed: false,
        },
        updated_at: null,
        invalid_profile: true,
      },
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    mockedUseUpdateMePreferences.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<ConfigPage />);

    expect(screen.getByText("Profile status: invalid")).toBeTruthy();
    expect(screen.getByText(/stored personal profile is invalid/i)).toBeTruthy();
    const disableButton = screen.getByRole("button", { name: "Disable profile" }) as HTMLButtonElement;
    expect(disableButton.disabled).toBe(false);

    fireEvent.click(disableButton);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        preset: null,
        runbook_overrides: {},
      });
    });
  });

  it("disables the preview button until a field actually changes", () => {
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    render(<ConfigPage />);

    expect(screen.getByRole("button", { name: /preview changes \(0\)/i })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Min Score (bps)"), { target: { value: "9" } });

    expect(screen.getByRole("button", { name: /preview changes \(1\)/i })).toBeTruthy();
  });

  it("shows a diff preview with old/new values and the persist flag before saving", () => {
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    render(<ConfigPage />);

    fireEvent.change(screen.getByLabelText("Min Score (bps)"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));

    expect(screen.getByRole("dialog", { name: /preview config changes/i })).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
    expect(screen.getByText(/persist:/i).textContent).toContain("true");
  });

  it("reflects persist: false in the preview and in the submitted payload", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(makeConfig());
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync, isPending: false } as never);

    render(<ConfigPage />);

    fireEvent.click(screen.getByLabelText(/persist to \.env/i));
    fireEvent.change(screen.getByLabelText("Min Score (bps)"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));

    expect(screen.getByText(/persist:/i).textContent).toContain("false");

    fireEvent.click(screen.getByRole("button", { name: /confirm & save/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ persist: false, min_score_bps: 9 });
    });
  });

  it("loads preset values into the draft without submitting on revert-to-preset", () => {
    const mutateAsync = vi.fn();
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync, isPending: false } as never);

    render(<ConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: /^balanced$/i }));

    expect(mutateAsync).not.toHaveBeenCalled();
    const scoreInput = screen.getByLabelText("Min Score (bps)") as HTMLInputElement;
    expect(scoreInput.value).toBe("8");
    expect(screen.getByRole("button", { name: /preview changes \(1\)/i })).toBeTruthy();
  });

  it("shows a conflict banner when the live config changes after the draft started", () => {
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });

    const { rerender } = render(<ConfigPage />);

    fireEvent.change(screen.getByLabelText("Min Score (bps)"), { target: { value: "9" } });

    mockedUseConfig.mockReturnValue({
      data: makeConfig({ min_score_bps: 7 }),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    rerender(<ConfigPage />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/live config changed while you were editing/i)).toBeTruthy();
  });

  it("resets the draft and clears the conflict banner on Reset", () => {
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });

    const { rerender } = render(<ConfigPage />);

    fireEvent.change(screen.getByLabelText("Min Score (bps)"), { target: { value: "9" } });
    mockedUseConfig.mockReturnValue({
      data: makeConfig({ min_score_bps: 7 }),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    rerender(<ConfigPage />);
    expect(screen.getByRole("alert")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^reset$/i }));

    expect(screen.queryByRole("alert")).toBeNull();
    const scoreInput = screen.getByLabelText("Min Score (bps)") as HTMLInputElement;
    expect(scoreInput.value).toBe("7");
  });

  it("renders a checkbox for a boolean runbook field and submits its toggled value", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(makeConfig());
    mockedUseConfig.mockReturnValue({
      data: makeConfig({
        runbook_config_fields: ["min_score_bps", "require_isolated_margin"],
      }),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync, isPending: false } as never);

    render(<ConfigPage />);

    const marginCheckbox = screen.getByLabelText(/require isolated margin/i) as HTMLInputElement;
    expect(marginCheckbox.type).toBe("checkbox");
    expect(marginCheckbox.checked).toBe(true);

    fireEvent.click(marginCheckbox);
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));

    expect(screen.getByText("true")).toBeTruthy();
    expect(screen.getByText("false")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /confirm & save/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        persist: true,
        require_isolated_margin: false,
      });
    });
  });

  it("shows an invalid-value error and does not open the preview when a numeric field is cleared", () => {
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    render(<ConfigPage />);

    fireEvent.change(screen.getByLabelText("Min Score (bps)"), {
      target: { value: "not-a-number" },
    });
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));

    expect(screen.queryByRole("dialog", { name: /preview config changes/i })).toBeNull();
    expect(screen.getByText(/invalid value for: min score \(bps\)/i)).toBeTruthy();
  });

  it("shows a hint instead of opening the preview when there are no changes to save", () => {
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    render(<ConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));

    expect(screen.queryByRole("dialog", { name: /preview config changes/i })).toBeNull();
    expect(screen.getByText(/no changes to save/i)).toBeTruthy();
  });

  it("closes the preview and keeps the draft unsaved when Cancel is clicked", () => {
    const mutateAsync = vi.fn();
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync, isPending: false } as never);

    render(<ConfigPage />);

    fireEvent.change(screen.getByLabelText("Min Score (bps)"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.queryByRole("dialog", { name: /preview config changes/i })).toBeNull();
    expect(mutateAsync).not.toHaveBeenCalled();
    const scoreInput = screen.getByLabelText("Min Score (bps)") as HTMLInputElement;
    expect(scoreInput.value).toBe("9");
  });

  it("shows a local error and keeps the draft when the save request fails", async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error("Network error"));
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync, isPending: false } as never);

    render(<ConfigPage />);

    fireEvent.change(screen.getByLabelText("Min Score (bps)"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm & save/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeTruthy();
    });
    const scoreInput = screen.getByLabelText("Min Score (bps)") as HTMLInputElement;
    expect(scoreInput.value).toBe("9");
    expect(screen.getByRole("alert").textContent).toContain("Network error");
  });

  it("re-closes an open preview when the draft changes again after it was opened", () => {
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    render(<ConfigPage />);

    fireEvent.change(screen.getByLabelText("Min Score (bps)"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));
    expect(screen.getByRole("dialog", { name: /preview config changes/i })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Min Score (bps)"), { target: { value: "11" } });

    expect(screen.queryByRole("dialog", { name: /preview config changes/i })).toBeNull();
  });

  it("calls refetch when Refresh Live is clicked", () => {
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    render(<ConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: /refresh live/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("returns focus to the Preview button when the preview is cancelled", () => {
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    render(<ConfigPage />);

    fireEvent.change(screen.getByLabelText("Min Score (bps)"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: /preview changes/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(document.activeElement).toBe(screen.getByRole("button", { name: /preview changes/i }));
  });

  it("keeps the help button out of a checkbox's accessible name", () => {
    mockedUseConfig.mockReturnValue({
      data: makeConfig({
        runbook_config_fields: ["min_score_bps", "allow_unknown_margin_mode"],
        allow_unknown_margin_mode: false,
      }),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    render(<ConfigPage />);

    expect(screen.getByRole("checkbox", { name: "Allow Unknown Margin Mode" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Help: Allow Unknown Margin Mode" })).toBeTruthy();
  });

  it("announces the reset confirmation politely via role=status", () => {
    mockedUseConfig.mockReturnValue({
      data: makeConfig(),
      error: null,
      loading: false,
      fetching: false,
      refetch,
    });
    mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    render(<ConfigPage />);

    fireEvent.change(screen.getByLabelText("Min Score (bps)"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: /^reset$/i }));

    expect(screen.getByRole("status").textContent).toBe("Draft reset to live config");
  });

  describe("product modes (issue #714)", () => {
    const preferences: MePreferencesResponse = {
      selected_preset: null,
      runbook_overrides: {},
      effective_runbook_values: { min_score_bps: 5 },
      runbook_config_fields: ["min_score_bps"],
      runbook_presets: { balanced: { min_score_bps: 8 } },
      tutorial: {
        welcome_hint_dismissed: false,
        welcome_completed: false,
        onboarding_completed: false,
      },
      updated_at: null,
    };

    function renderWithProfile(
      profile: Partial<MePreferencesResponse> = {},
      mutateAsync = vi.fn()
    ) {
      const configMutateAsync = vi.fn();
      mockedUseConfig.mockReturnValue({
        data: makeConfig(),
        error: null,
        loading: false,
        fetching: false,
        refetch,
      });
      mockedUseUpdateConfig.mockReturnValue({
        mutateAsync: configMutateAsync,
        isPending: false,
      } as never);
      mockedUseMePreferences.mockReturnValue({
        data: { ...preferences, ...profile },
        error: null,
        loading: false,
        fetching: false,
        refetch: vi.fn(),
      });
      mockedUseUpdateMePreferences.mockReturnValue({
        mutateAsync,
        mutate: vi.fn(),
        isPending: false,
      } as never);
      render(<ConfigPage />);
      return { configMutateAsync };
    }

    it("titles the page Settings, like the menu item", () => {
      renderWithProfile();

      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Settings");
      expect(document.title).toBe("Settings · Arbijuie");
      expect(screen.queryByRole("heading", { level: 1, name: "Config" })).toBeNull();
    });

    it("derives the active mode and the overrides flag from the personal profile", () => {
      renderWithProfile({ selected_preset: "balanced", runbook_overrides: { min_score_bps: 9 } });

      expect(screen.getByTestId("modes-selected").textContent).toBe("balanced");
      expect(screen.getByTestId("modes-overrides").textContent).toBe("overrides");
      expect(screen.getByText(/a mode is your personal choice/i)).toBeTruthy();
    });

    it("applies a mode to the personal profile and never to the shared config", async () => {
      const mutateAsync = vi.fn().mockResolvedValue({
        ...preferences,
        selected_preset: "balanced",
        effective_runbook_values: { min_score_bps: 8 },
      });
      const { configMutateAsync } = renderWithProfile({}, mutateAsync);

      expect(screen.getByTestId("modes-selected").textContent).toBe("none");
      fireEvent.click(screen.getByRole("button", { name: "Apply Standard mode" }));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({ preset: "balanced", runbook_overrides: {} });
      });
      expect(configMutateAsync).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByRole("status").textContent).toBe(
          "Standard mode applied to your Deals profile (preset balanced)"
        );
      });
      expect(screen.getByTestId("modes-applying").textContent).toBe("idle");
    });

    it("shows the error when applying a mode fails", async () => {
      const mutateAsync = vi.fn().mockRejectedValue(new Error("preferences store unavailable"));
      renderWithProfile({}, mutateAsync);

      fireEvent.click(screen.getByRole("button", { name: "Apply Standard mode" }));

      await waitFor(() => {
        expect(screen.getByRole("alert").textContent).toBe(
          "Error: preferences store unavailable"
        );
      });
      expect(screen.getByTestId("modes-applying").textContent).toBe("idle");
      expect(screen.queryByText(/mode applied/i)).toBeNull();
    });

    it("explains that the modes wait for the personal profile to load", () => {
      mockedUseConfig.mockReturnValue({
        data: makeConfig(),
        error: null,
        loading: false,
        fetching: false,
        refetch,
      });
      mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
      mockedUseMePreferences.mockReturnValue({
        data: null,
        error: null,
        loading: true,
        fetching: true,
        refetch: vi.fn(),
      });
      mockedUseUpdateMePreferences.mockReturnValue({
        mutateAsync: vi.fn(),
        mutate: vi.fn(),
        isPending: false,
      } as never);

      render(<ConfigPage />);

      expect(screen.queryByRole("button", { name: "Apply Standard mode" })).toBeNull();
      expect(screen.getByText(/loading your personal profile before the modes/i)).toBeTruthy();
    });

    it("explains that no mode can be applied when the personal profile failed to load", () => {
      mockedUseConfig.mockReturnValue({
        data: makeConfig(),
        error: null,
        loading: false,
        fetching: false,
        refetch,
      });
      mockedUseUpdateConfig.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
      mockedUseMePreferences.mockReturnValue({
        data: null,
        error: "session expired",
        loading: false,
        fetching: false,
        refetch: vi.fn(),
      });
      mockedUseUpdateMePreferences.mockReturnValue({
        mutateAsync: vi.fn(),
        mutate: vi.fn(),
        isPending: false,
      } as never);

      render(<ConfigPage />);

      expect(screen.queryByRole("button", { name: "Apply Standard mode" })).toBeNull();
      expect(screen.getByText(/no mode can be applied right now/i)).toBeTruthy();
      expect(screen.getByRole("alert").textContent).toBe("Error: session expired");
    });
  });
});
