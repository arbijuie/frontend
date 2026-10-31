import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ExecutionSheet from "./ExecutionSheet";
import type {
  OpportunityItem,
  ExecutionPreflightResponse,
  ExecutionAttemptItem,
} from "../../api/types";

const mockMutateAsync = vi.fn();
vi.mock("../../hooks/useOperations", () => ({
  useExecutionOpen: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const mockPreflight = {
  decision: "ready",
  ready: true,
  blockers: [],
  candidate: null,
  gate: {
    criteria_strategy_lock_satisfied: true,
    criteria_acceptance_evidence_satisfied: true,
    criteria_overall_satisfied: true,
    live_execution_allowed: false,
    reason: null,
  },
  mode: {
    exec_enabled: true,
    exec_dry_run: true,
    auto_execute: false,
  },
  runtime: {
    status_stale: false,
    config_stale: false,
    runtime_running: true,
  },
  venues: {},
};

let preflightState: { data: ExecutionPreflightResponse | null; error: string | null } = {
  data: mockPreflight as unknown as ExecutionPreflightResponse,
  error: null,
};
vi.mock("../../hooks/useExecutionPreflight", () => ({
  useExecutionPreflight: () => ({
    ...preflightState,
    loading: preflightState.data === null && preflightState.error === null,
    refetch: vi.fn(),
  }),
}));

function makeOpportunity(overrides: Partial<OpportunityItem> = {}): OpportunityItem {
  return {
    symbol: "ETH",
    strategy_type: "funding_arbitrage",
    strategy_profile_id: "baseline-v1",
    legs: [
      {
        instrument_kind: "perp",
        venue: "binance",
        venue_native_symbol: "ETHUSDT",
        normalized_symbol: "ETH",
        side: "long",
        mark_price: "2500",
        index_price: "2500",
        funding_rate: 2,
        borrow_rate: null,
        fee_taker: 0.0004,
        fee_maker: null,
        margin_mode: null,
        settlement_ccy: "USDT",
        quote_asset: "USDT",
        effective_fill_price: 2500,
        market_depth_usd: 1000000,
      },
      {
        instrument_kind: "perp",
        venue: "hyperliquid",
        venue_native_symbol: "ETH",
        normalized_symbol: "ETH",
        side: "short",
        mark_price: "2502",
        index_price: "2500",
        funding_rate: 18,
        borrow_rate: null,
        fee_taker: 0.00035,
        fee_maker: null,
        margin_mode: null,
        settlement_ccy: "USDC",
        quote_asset: "USDC",
        effective_fill_price: 2502,
        market_depth_usd: 800000,
      },
    ],
    funding_diff_apr: 16.5,
    funding_edge_bps: 12.0,
    total_cost_bps: 4.5,
    combined_score: 7.5,
    basis_bps: 2.0,
    basis_bonus_bps: 1.0,
    hours_to_breakeven: 4.2,
    long_hours_to_next_funding: 3.5,
    short_hours_to_next_funding: 1.2,
    liquidity_tier: "H",
    status: "ready",
    recommended_size_usd: 1000,
    expected_hold_hours: 12.0,
    long_taker_fee_bps: 2.0,
    short_taker_fee_bps: 2.0,
    long_slippage_bps: 0.25,
    short_slippage_bps: 0.25,
    funding_timing_penalty_bps: 0,
    basis_expansion_penalty_bps: 0,
    basis_divergence_hours: 0,
    effective_hold_hours: 12.0,
    net_yield_8h: 0.015,
    ...overrides,
  } as unknown as OpportunityItem;
}

function openButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Open Both Legs" }) as HTMLButtonElement;
}

describe("ExecutionSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when opportunity is null", () => {
    const { container } = render(
      <MemoryRouter>
        <ExecutionSheet opportunity={null} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders symbol, APR badge, and size presets", () => {
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Open Arbitrage Position" })).toBeTruthy();
    expect(screen.getByText("ETH")).toBeTruthy();
    expect(screen.getByText("+16.50% APR")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^\$1(?:,|\u00A0)000$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Both Legs" })).toBeTruthy();
  });

  it("calls open mutation with correct parameters on submit", async () => {
    const attempt = {
      attempt_id: "att-12345",
      symbol: "ETH",
      status: "submitted",
      created_at: new Date().toISOString(),
      events: ["Order long submitted", "Order short submitted"],
    };
    mockMutateAsync.mockResolvedValueOnce(attempt as unknown as ExecutionAttemptItem);

    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={vi.fn()} />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole("button", { name: "Open Both Legs" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        symbol: "ETH",
        long_exchange: "binance",
        short_exchange: "hyperliquid",
        size_usd: 1000,
        strategy_type: "funding_arbitrage",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Position submitted successfully!")).toBeTruthy();
      expect(screen.getByText("att-12345")).toBeTruthy();
    });
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={onClose} />
      </MemoryRouter>
    );

    const closeBtn = screen.getByRole("button", { name: "Close execution sheet" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("requires an explicit real-money confirmation before opening a live deal", () => {
    mockPreflight.mode.exec_dry_run = false;
    try {
      render(
        <MemoryRouter>
          <ExecutionSheet opportunity={makeOpportunity()} onClose={vi.fn()} />
        </MemoryRouter>
      );
      const open = openButton();
      expect(screen.getByRole("region", { name: "Real money warning" }).textContent).toContain(
        "You can lose money"
      );
      expect(open.disabled).toBe(true);
      fireEvent.click(screen.getByRole("checkbox", { name: /I understand the risks/ }));
      expect(open.disabled).toBe(false);
    } finally {
      mockPreflight.mode.exec_dry_run = true;
    }
  });

  it("shows no real-money step in practice mode", () => {
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByRole("region", { name: "Real money warning" })).toBeNull();
  });
});

describe("ExecutionSheet safety", () => {
  beforeEach(() => {
    preflightState = { data: mockPreflight as unknown as ExecutionPreflightResponse, error: null };
  });

  it("keeps Open disabled until the safety check has answered", () => {
    preflightState = { data: null, error: null };
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByRole("status").textContent).toContain("Running the safety check");
    expect(openButton().disabled).toBe(true);
  });

  it("keeps Open disabled and explains when the safety check fails", () => {
    preflightState = { data: null, error: "network down" };
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Could not run the safety check/)).toBeTruthy();
    expect(openButton().disabled).toBe(true);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={onClose} />
      </MemoryRouter>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Open disabled when trading is turned off", () => {
    preflightState = {
      data: {
        ...mockPreflight,
        decision: "watching",
        mode: { ...mockPreflight.mode, exec_enabled: false },
        blockers: [{ code: "execution_disabled", message: "Execution is disabled" }],
      } as unknown as ExecutionPreflightResponse,
      error: null,
    };
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(openButton().disabled).toBe(true);
    expect(
      screen.getByText("Trading is turned off, so deals cannot be opened right now.")
    ).toBeTruthy();
  });

  it("shows a single alert when trading is turned off", () => {
    preflightState = {
      data: {
        ...mockPreflight,
        decision: "watching",
        mode: { ...mockPreflight.mode, exec_enabled: false },
        blockers: [{ code: "execution_disabled", message: "Execution is disabled" }],
      } as unknown as ExecutionPreflightResponse,
      error: null,
    };
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.queryByText("Preflight notice:")).toBeNull();
  });

  it("still lists other server notices when trading is turned off", () => {
    preflightState = {
      data: {
        ...mockPreflight,
        decision: "watching",
        mode: { ...mockPreflight.mode, exec_enabled: false },
        blockers: [
          { code: "execution_disabled", message: "Execution is disabled" },
          { code: "correlation_concentration_watching", message: "Correlated positions" },
        ],
      } as unknown as ExecutionPreflightResponse,
      error: null,
    };
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText("Correlated positions")).toBeTruthy();
    expect(screen.queryByText("Execution is disabled")).toBeNull();
  });

  it("shows the exchange route message when the route blocker blocks the decision", () => {
    preflightState = {
      data: {
        ...mockPreflight,
        decision: "blocked",
        blockers: [
          {
            code: "vooi_route_unavailable",
            severity: "blocked",
            message: "VOOI route is unavailable",
          },
        ],
      } as unknown as ExecutionPreflightResponse,
      error: null,
    };
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(openButton().disabled).toBe(true);
    expect(screen.getByText("The exchange connection is not ready yet.")).toBeTruthy();
    expect(screen.queryByText("The safety check blocks opening right now.")).toBeNull();
  });

  it("shows the general safety message when another blocker blocks the decision", () => {
    preflightState = {
      data: {
        ...mockPreflight,
        decision: "blocked",
        blockers: [{ code: "stop_trading_latched", severity: "blocked", message: "Stopped" }],
      } as unknown as ExecutionPreflightResponse,
      error: null,
    };
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(openButton().disabled).toBe(true);
    expect(screen.getByText("The safety check blocks opening right now.")).toBeTruthy();
  });

  it("keeps Open disabled for a deal that is not ready", () => {
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity({ status: "watching" })} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(openButton().disabled).toBe(true);
    expect(screen.getByText("Only deals marked Ready can be opened.")).toBeTruthy();
  });

  it("keeps Open disabled for a probable wrong-coin deal", () => {
    render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity({ basis_bps: 2500 })} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(openButton().disabled).toBe(true);
    expect(
      screen.getByText("The prices look like two different coins, so this deal cannot be opened.")
    ).toBeTruthy();
  });

  it("keeps the focus where the user put it when the parent passes a new onClose", () => {
    const { rerender } = render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={() => {}} />
      </MemoryRouter>
    );
    const input = screen.getByLabelText("Position Size (USD)");
    input.focus();
    expect(document.activeElement).toBe(input);
    rerender(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(document.activeElement).toBe(input);
  });

  it("closes with the latest onClose after a re-render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={first} />
      </MemoryRouter>
    );
    rerender(
      <MemoryRouter>
        <ExecutionSheet opportunity={makeOpportunity()} onClose={second} />
      </MemoryRouter>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
