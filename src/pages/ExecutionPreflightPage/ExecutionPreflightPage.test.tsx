import { render, screen } from "@testing-library/react";
import ExecutionPreflightPage from "./ExecutionPreflightPage";
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

function makePreflight(
  overrides: Partial<ExecutionPreflightResponse> = {}
): ExecutionPreflightResponse {
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

describe("ExecutionPreflightPage", () => {
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

  it("shows loading state", () => {
    mockedUseExecutionPreflight.mockReturnValue({
      data: null,
      error: null,
      loading: true,
      fetching: true,
      refetch: vi.fn(),
    });

    render(<ExecutionPreflightPage />);

    expect(screen.getByText(/loading execution preflight/i)).toBeTruthy();
  });

  it("shows empty state when preflight has no data", () => {
    mockedUseExecutionPreflight.mockReturnValue({
      data: null,
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });

    render(<ExecutionPreflightPage />);

    expect(screen.getByText(/no preflight data/i)).toBeTruthy();
  });

  it("shows error state", () => {
    mockedUseExecutionPreflight.mockReturnValue({
      data: null,
      error: "GET /execution/preflight failed: 500",
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });

    render(<ExecutionPreflightPage />);

    expect(screen.getByText(/preflight error/i)).toBeTruthy();
  });

  it("renders ready decision", () => {
    mockedUseExecutionPreflight.mockReturnValue({
      data: makePreflight({
        decision: "ready",
        ready: true,
        blockers: [],
      }),
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });

    render(<ExecutionPreflightPage />);

    expect(screen.getByText(/final decision: READY/i)).toBeTruthy();
    expect(screen.getByText(/no blockers\./i)).toBeTruthy();
  });

  it("renders watching decision", () => {
    render(<ExecutionPreflightPage />);

    expect(screen.getByText(/final decision: WATCHING/i)).toBeTruthy();
    expect(screen.getByText(/runtime::dry_run_mode/i)).toBeTruthy();
  });

  it("renders blocked decision", () => {
    mockedUseExecutionPreflight.mockReturnValue({
      data: makePreflight({
        decision: "blocked",
        blockers: [
          {
            code: "stale_runtime_snapshot",
            severity: "blocked",
            source: "runtime",
            message: "Latest screener snapshot is stale.",
          },
        ],
      }),
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });

    render(<ExecutionPreflightPage />);

    expect(screen.getByText(/final decision: BLOCKED/i)).toBeTruthy();
    expect(screen.getByText(/\[blocked\] runtime::stale_runtime_snapshot/i)).toBeTruthy();
  });

  it("renders candidate null branch", () => {
    mockedUseExecutionPreflight.mockReturnValue({
      data: makePreflight({ candidate: null }),
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });

    render(<ExecutionPreflightPage />);

    expect(screen.getByText(/no candidate selected\./i)).toBeTruthy();
  });

  it("renders required sections and candidate fields", () => {
    render(<ExecutionPreflightPage />);

    expect(screen.getByRole("heading", { level: 2, name: "Mode" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Gate" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Runtime" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Blockers" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Candidate" })).toBeTruthy();
    expect(screen.getByText(/symbol: BTC/i)).toBeTruthy();
    expect(screen.getByText(/route: hyperliquid \/ lighter/i)).toBeTruthy();
    expect(screen.getByText(/combined_score: 12\.00/i)).toBeTruthy();
    expect(screen.getByText(/status: ready/i)).toBeTruthy();
    expect(screen.getByText(/reasons: dry_run_mode/i)).toBeTruthy();
  });

  it("renders blockers with required fields", () => {
    mockedUseExecutionPreflight.mockReturnValue({
      data: makePreflight({
        blockers: [
          {
            code: "execution_disabled",
            severity: "watching",
            source: "gate",
            message: "Execution mode is disabled by configuration.",
          },
          {
            code: "stale_runtime_snapshot",
            severity: "blocked",
            source: "runtime",
            message: "Latest screener snapshot is stale.",
          },
        ],
      }),
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });

    render(<ExecutionPreflightPage />);

    expect(
      screen.getByText(
        "[watching] gate::execution_disabled - Execution mode is disabled by configuration."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "[blocked] runtime::stale_runtime_snapshot - Latest screener snapshot is stale."
      )
    ).toBeTruthy();
  });

  it.each([
    {
      severity: "watching",
      source: "gate",
      code: "execution_disabled",
      message: "Execution mode is disabled by configuration.",
      expected:
        "[watching] gate::execution_disabled - Execution mode is disabled by configuration.",
    },
    {
      severity: "blocked",
      source: "candidate",
      code: "symbol_not_found",
      message: "No validated candidate found for symbol ETH.",
      expected:
        "[blocked] candidate::symbol_not_found - No validated candidate found for symbol ETH.",
    },
    {
      severity: "blocked",
      source: "runtime",
      code: "stale_runtime_snapshot",
      message: "Latest screener snapshot is stale.",
      expected: "[blocked] runtime::stale_runtime_snapshot - Latest screener snapshot is stale.",
    },
  ] as const)(
    "blockers snapshot row for $severity/$source",
    ({ severity, source, code, message, expected }) => {
      mockedUseExecutionPreflight.mockReturnValue({
        data: makePreflight({
          blockers: [{ severity, source, code, message }],
        }),
        error: null,
        loading: false,
        fetching: false,
        refetch: vi.fn(),
      });

      render(<ExecutionPreflightPage />);

      expect(screen.getByRole("heading", { level: 2, name: "Blockers" })).toBeTruthy();
      expect(screen.getByText(expected).textContent).toMatchSnapshot(
        `${severity}-${source}-${code}`
      );
    }
  );
});
