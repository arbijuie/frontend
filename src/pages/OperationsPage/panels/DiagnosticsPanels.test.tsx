import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PositionsPanel from "./PositionsPanel";
import GuardrailsPanel from "./GuardrailsPanel";
import ContinuityPanel from "./ContinuityPanel";
import { GUARDRAIL_NEXT_STEP, continuityHealth, formatUsd } from "../../../lib/operations";
import {
  useDailyPnl,
  usePositions,
  useRiskGuardrails,
  useSnapshotContinuity,
} from "../../../hooks/useOperations";
import type { SnapshotContinuityResponse } from "../../../api/types";

vi.mock("../../../hooks/useOperations", () => ({
  usePositions: vi.fn(),
  useDailyPnl: vi.fn(),
  useRiskGuardrails: vi.fn(),
  useSnapshotContinuity: vi.fn(),
}));

const view = (data: unknown, errorObject: Error | null = null) =>
  ({
    data,
    error: errorObject ? errorObject.message : null,
    errorObject,
    loading: false,
    fetching: false,
    refetch: vi.fn(),
  }) as never;

const CONTINUITY: SnapshotContinuityResponse = {
  generated_at: "2026-10-16T09:05:00Z",
  expected_interval_s: 60,
  retention_days: 30,
  rows_total: 1200,
  symbols_covered: 10,
  exchanges_covered: 2,
  window_start_at: "2026-10-15T09:05:00Z",
  window_end_at: "2026-10-16T09:05:00Z",
  oldest_retained_at: null,
  distinct_timestamps: 600,
  gap_count: 2,
  largest_gap_s: 900,
  write_failures: 0,
  last_write_error: null,
  last_write_at: "2026-10-16T09:05:00Z",
  last_pruned_at: null,
  pruned_rows_total: 0,
  last_pruned_rows: 0,
  last_recovered_at: null,
  recovered_rows: 0,
  recovered_symbols: 0,
  recovery_attempted: false,
  recovery_result: "not_attempted",
  recovery_max_rows: 0,
  last_recovery_scanned_rows: 0,
  last_recovery_duration_ms: null,
};

function expectFocusableRegion(name: string) {
  const region = screen.getByRole("region", { name });
  expect(region.getAttribute("tabindex")).toBe("0");
}

describe("PositionsPanel", () => {
  it("shows the PnL split, accounts, positions, and a window selector", () => {
    vi.mocked(usePositions).mockReturnValue(
      view({
        updated_at: "2026-10-16T09:05:00Z",
        count: 1,
        notional_usd: 100,
        unrealized_pnl_usd: 0.4,
        realized_pnl_usd: -1.25,
        funding_accrued_usd: 0.05,
        net_pnl_usd: -0.8,
        accounts: {
          hyperliquid: {
            equity: "1000",
            available: "900",
            free_margin_pct: 90,
            error: null,
            updated_at: null,
          },
        },
        positions: [
          {
            attempt_id: "att-1",
            symbol: "BTC",
            status: "active",
            long_exchange: "hyperliquid",
            short_exchange: "lighter",
            opened_at: "2026-10-16T08:00:00Z",
            age_s: 10,
            long_open_quantity: "1",
            short_open_quantity: "1",
            long_entry_price: "100",
            short_entry_price: "100",
            notional_usd: 100,
            net_funding_apr: 19,
            realized_pnl_usd: 0,
            unrealized_pnl_usd: 0.4,
            funding_accrued_usd: 0.05,
            net_pnl_usd: 0.45,
            health_flags: ["margin_low"],
            updated_at: "2026-10-16T09:05:00Z",
          },
        ],
      })
    );
    const dailyPnl = vi.mocked(useDailyPnl);
    dailyPnl.mockReturnValue(
      view({ days: [], realized_pnl_usd: 0, funding_pnl_usd: 0, total_pnl_usd: 0 })
    );
    render(<PositionsPanel />);

    expect(screen.getByText("Realized PnL").nextSibling?.textContent ?? "").toContain("-$1.25");
    expect(screen.getByRole("table", { name: "Venue accounts" })?.textContent ?? "").toContain(
      "90.0%"
    );
    expect(screen.getByRole("table", { name: "Open positions" })?.textContent ?? "").toContain(
      "margin_low"
    );
    expectFocusableRegion("Venue accounts table");
    expectFocusableRegion("Open positions table");
    expect(screen.getByText("No ledger days yet")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Window"), { target: { value: "30" } });
    expect(dailyPnl).toHaveBeenLastCalledWith(30);
    expect(formatUsd(null)).toBe("-");
    expect(formatUsd(-2)).toBe("-$2.00");
  });

  it("makes the daily PnL table keyboard-focusable when there are ledger days", () => {
    vi.mocked(usePositions).mockReturnValue(
      view({
        updated_at: null,
        count: 0,
        notional_usd: 0,
        unrealized_pnl_usd: 0,
        realized_pnl_usd: 0,
        funding_accrued_usd: 0,
        net_pnl_usd: 0,
        accounts: {},
        positions: [],
      })
    );
    vi.mocked(useDailyPnl).mockReturnValue(
      view({
        days: [
          {
            day: "2026-10-16",
            realized_pnl_usd: 0,
            funding_pnl_usd: 0.05,
            unrealized_pnl_usd: 0.4,
            unrealized_change_usd: 0.4,
            total_pnl_usd: 0.45,
            positions_open: 1,
            positions_closed: 0,
          },
        ],
        realized_pnl_usd: 0,
        funding_pnl_usd: 0.05,
        total_pnl_usd: 0.45,
      })
    );
    render(<PositionsPanel />);

    expect(screen.getByRole("table", { name: "Daily PnL" })).toBeTruthy();
    expectFocusableRegion("Daily PnL table");
  });
});

describe("GuardrailsPanel", () => {
  it("names blocking guardrails, decisions with next steps, and links to preflight", () => {
    vi.mocked(useRiskGuardrails).mockReturnValue(
      view({
        last_evaluated_at: "2026-10-16T09:05:00Z",
        last_error: null,
        account_sources: [],
        monitored_positions: 1,
        entries_blocked: true,
        blocking_guardrails: ["margin", "adl"],
        decision_counts: {},
        decisions: [
          {
            guardrail: "margin",
            action: "block_entry",
            severity: "warning",
            reason: "lighter free margin 12% < alert 15%",
            observed: 12,
            threshold: 15,
            exchange: "lighter",
            symbol: null,
            attempt_id: null,
            evaluated_at: "2026-10-16T09:05:00Z",
          },
        ],
        entry_blocks_total: 3,
        entry_blocks_by_guardrail: {},
        last_entry_block: null,
        recent_closes: 1,
        recent_close_failures: 1,
        closed_attempts: 1,
        last_close: null,
        thresholds: { margin_alert_pct: 15 },
        closed_attempt_ids: [],
        close_records: [
          {
            attempt_id: "att-9",
            guardrail: "adl",
            reason: "critical",
            status: "failed",
            orders: [],
            at: "2026-10-16T09:00:00Z",
          },
        ],
        capital: {
          enabled: false,
          limits: {},
          committed_capital_usd: 0,
          venue_committed_usd: {},
          daily_pnl_usd: 0,
          daily_loss_limit_usd: 0,
          rejections: {},
          last_decision: null,
        },
      })
    );
    render(
      <MemoryRouter>
        <GuardrailsPanel />
      </MemoryRouter>
    );

    expect(screen.getByRole("status")?.textContent ?? "").toContain("blocked by: margin, adl");
    expect(screen.getByRole("link", { name: "execution preflight" }).getAttribute("href")).toBe(
      "/execution/preflight"
    );
    const decisions = screen.getByRole("table", { name: "Guardrail decisions" });
    expect(decisions?.textContent ?? "").toContain("observed 12, threshold 15");
    expect(decisions?.textContent ?? "").toContain(GUARDRAIL_NEXT_STEP.margin);
    expect(screen.getByRole("table", { name: "Guardrail closes" })?.textContent ?? "").toContain(
      "failed"
    );
    expectFocusableRegion("Guardrail decisions table");
    expectFocusableRegion("Guardrail closes table");
    expectFocusableRegion("Guardrail thresholds table");
    expect(screen.getByText(/margin guardrail has no input/)).toBeTruthy();
    expect(screen.getByText(/Capital-aware sizing is off/)).toBeTruthy();
  });
});

describe("ContinuityPanel", () => {
  it("summarizes capture health and highlights gaps", () => {
    vi.mocked(useSnapshotContinuity).mockReturnValue(view(CONTINUITY));
    render(<ContinuityPanel />);

    expect(screen.getByRole("status")?.textContent ?? "").toContain("Capture has gaps");
    expect(screen.getByText("Gaps").nextSibling?.textContent ?? "").toContain("2");
    expect(screen.getByText("largest 15m")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Capture window" })?.textContent ?? "").toContain(
      "not_attempted"
    );
    expectFocusableRegion("Capture window table");
  });

  it("classifies health deterministically", () => {
    expect(continuityHealth(CONTINUITY)).toBe("gaps");
    expect(continuityHealth({ ...CONTINUITY, gap_count: 0 })).toBe("healthy");
    expect(continuityHealth({ ...CONTINUITY, write_failures: 1 })).toBe("write_failures");
    expect(continuityHealth({ ...CONTINUITY, rows_total: 0 })).toBe("empty");
  });
});
