import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PositionsPanel from "./PositionsPanel";
import GuardrailsPanel from "./GuardrailsPanel";
import ParityPanel from "./ParityPanel";
import ContinuityPanel from "./ContinuityPanel";
import { GUARDRAIL_NEXT_STEP, continuityHealth, formatUsd } from "../../../lib/operations";
import {
  useDailyPnl,
  useParityArtifacts,
  useParityReport,
  usePositions,
  useRiskGuardrails,
  useSnapshotContinuity,
} from "../../../hooks/useOperations";
import { ApiRequestError } from "../../../lib/api-errors";
import type { SnapshotContinuityResponse } from "../../../api/types";

vi.mock("../../../hooks/useOperations", () => ({
  usePositions: vi.fn(),
  useDailyPnl: vi.fn(),
  useRiskGuardrails: vi.fn(),
  useParityReport: vi.fn(),
  useParityArtifacts: vi.fn(),
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
    expect(screen.getByText("No ledger days yet")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Window"), { target: { value: "30" } });
    expect(dailyPnl).toHaveBeenLastCalledWith(30);
    expect(formatUsd(null)).toBe("-");
    expect(formatUsd(-2)).toBe("-$2.00");
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
    expect(screen.getByText(/margin guardrail has no input/)).toBeTruthy();
    expect(screen.getByText(/Capital-aware sizing is off/)).toBeTruthy();
  });
});

describe("ParityPanel", () => {
  it("treats a 404 report as an empty window and lists artifacts with expandable diffs", () => {
    vi.mocked(useParityReport).mockReturnValue(
      view(null, new ApiRequestError("no artifacts", 404, "parity_window_empty"))
    );
    vi.mocked(useParityArtifacts).mockReturnValue(
      view({
        count: 1,
        items: [
          {
            schema_version: "1",
            generated_at: "2026-10-16T09:00:00Z",
            attempt_id: "att-1",
            shadow_correlation_version: "v1",
            shadow_correlation_group_id: null,
            evaluation_status: "evaluated",
            joinable: true,
            parity_status: "fail",
            legacy_event_count: 4,
            shadow_event_count: 3,
            legacy_conflict_count: 0,
            shadow_conflict_count: 1,
            diffs: [
              {
                dimension: "events",
                code: "count_mismatch",
                severity: "blocked",
                message: "4 vs 3",
                legacy_value: "4",
                shadow_value: "3",
              },
            ],
          },
        ],
      })
    );
    render(<ParityPanel />);

    expect(screen.getByText("No parity data in this window")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    const table = screen.getByRole("table", { name: "Parity artifacts" });
    expect(table?.textContent ?? "").toContain("fail");
    fireEvent.click(screen.getByRole("button", { name: "1 diffs (1 blocked)" }));
    expect(screen.getByRole("list", { name: "Diffs of att-1" })?.textContent ?? "").toContain(
      "events/count_mismatch: 4 vs 3 (legacy 4, shadow 3)"
    );
  });

  it("shows a non-404 report error as an alert", () => {
    vi.mocked(useParityReport).mockReturnValue(view(null, new ApiRequestError("boom", 500, null)));
    vi.mocked(useParityArtifacts).mockReturnValue(view({ count: 0, items: [] }));
    render(<ParityPanel />);
    expect(screen.getByRole("alert")?.textContent ?? "").toContain("Runtime error: boom");
    expect(screen.getByText("No parity artifacts")).toBeTruthy();
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
  });

  it("classifies health deterministically", () => {
    expect(continuityHealth(CONTINUITY)).toBe("gaps");
    expect(continuityHealth({ ...CONTINUITY, gap_count: 0 })).toBe("healthy");
    expect(continuityHealth({ ...CONTINUITY, write_failures: 1 })).toBe("write_failures");
    expect(continuityHealth({ ...CONTINUITY, rows_total: 0 })).toBe("empty");
  });
});
