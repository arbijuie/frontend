import { render, screen } from "@testing-library/react";
import ExecutionPage from "./ExecutionPage";
import { useExecutionPreflight } from "../../hooks/useExecutionPreflight";
import { useCorrelation } from "../../hooks/useCorrelation";
import type { CorrelationResponse, ExecutionPreflightResponse } from "../../api/types";

vi.mock("../../hooks/useExecutionPreflight", () => ({
  useExecutionPreflight: vi.fn(),
}));

vi.mock("../../hooks/useCorrelation", () => ({
  useCorrelation: vi.fn(),
}));

vi.mock("../../components/FloatingRefreshButton/FloatingRefreshButton", () => ({
  default: ({ label }: { label: string }) => <button type="button">{label}</button>,
}));

const mockedUseExecutionPreflight = vi.mocked(useExecutionPreflight);
const mockedUseCorrelation = vi.mocked(useCorrelation);

function makePreflight(overrides: Partial<ExecutionPreflightResponse> = {}): ExecutionPreflightResponse {
  return {
    ready: false,
    decision: "watching",
    checked_at: "2026-01-01T00:00:10Z",
    mode: {
      exec_enabled: true,
      exec_dry_run: true,
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
        level: "watching",
        ready_count: 2,
        largest_cluster_size: 2,
        largest_cluster_ratio: 1,
        largest_cluster_symbols: ["BTC", "ETH"],
      },
      consecutive_rollbacks: 0,
      entries_stopped: false,
    },
    candidate: {
      symbol: "BTC",
      long_exchange: "hyperliquid",
      short_exchange: "lighter",
      combined_score: 12,
      correlated_ready_count: 1,
      status: "ready",
      reasons: [
        {
          code: "dry_run_mode",
          severity: "watching",
          message: "Execution dry-run mode is enabled.",
        },
      ],
    },
    blockers: [
      {
        code: "dry_run_mode",
        severity: "watching",
        source: "runtime",
        message: "Execution dry-run mode is enabled.",
      },
    ],
    lock_metrics: null,
    lock_detail_url: null,
    ...overrides,
  };
}

function makeCorrelation(overrides: Partial<CorrelationResponse> = {}): CorrelationResponse {
  return {
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
    ...overrides,
  };
}

describe("ExecutionPage", () => {
  beforeEach(() => {
    mockedUseExecutionPreflight.mockReturnValue({
      data: makePreflight(),
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    mockedUseCorrelation.mockReturnValue({
      data: makeCorrelation(),
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
  });

  it("shows empty state when preflight has no data", () => {
    mockedUseExecutionPreflight.mockReturnValue({
      data: null,
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });

    render(<ExecutionPage />);

    expect(screen.getByText(/no preflight data/i)).toBeTruthy();
  });

  it("renders preflight and correlation details", () => {
    render(<ExecutionPage />);

    expect(screen.getByText(/final decision: WATCHING/i)).toBeTruthy();
    expect(screen.getByText(/correlated_ready_count: 1/i)).toBeTruthy();
    expect(screen.getByText(/pairs above threshold: 1/i)).toBeTruthy();
    expect(screen.getByText(/runtime::dry_run_mode/i)).toBeTruthy();
  });
});
