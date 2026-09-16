import { fireEvent, render, screen } from "@testing-library/react";
import type { StatusResponse } from "../../api/types";
import DeepPipelineDiagnostics from "./DeepPipelineDiagnostics";

function makeDropCounters(): NonNullable<StatusResponse["screener_drop_counters"]> {
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
  };
}

function makeStatus(overrides: Partial<StatusResponse> = {}): StatusResponse {
  return {
    uptime_s: 10,
    started_at: "2026-01-01T00:00:00Z",
    poll_count_total: 1,
    poll_count_success: 1,
    poll_count_failed: 0,
    exchange_last_ok: {
      hyperliquid: true,
      lighter: true,
    },
    screener_drop_counters: makeDropCounters(),
    screener_reason_code_counts: {},
    screener_reason_severity_counts: {
      watching: 0,
      blocked: 0,
    },
    exchange_diagnostics: {
      hyperliquid: {
        missing_real_depth: 0,
        strict_depth: 0,
        missing_real_fee: 0,
        book_fetch_error: 0,
      },
      lighter: {
        missing_real_depth: 0,
        strict_depth: 0,
        missing_real_fee: 0,
        book_fetch_error: 0,
      },
    },
    ...overrides,
  } as StatusResponse;
}

describe("DeepPipelineDiagnostics", () => {
  it("renders empty-state messaging when there are no diagnostics events", () => {
    render(<DeepPipelineDiagnostics status={makeStatus()} />);

    expect(screen.getByText(/no drop or reason events in the latest cycle/i)).toBeTruthy();
    expect(screen.getByText(/no dominant blockers/i)).toBeTruthy();
  });

  it("renders low-volume guidance when cycle counts are sparse", () => {
    render(
      <DeepPipelineDiagnostics
        status={makeStatus({
          screener_drop_counters: {
            ...makeDropCounters(),
            stale: 1,
            min_score: 1,
          },
          screener_reason_code_counts: {
            score_below_min: 2,
          },
          screener_reason_severity_counts: {
            blocked: 0,
            watching: 2,
          },
        })}
      />
    );

    expect(screen.getByText(/low-volume cycle/i)).toBeTruthy();
  });

  it("shows Top 8 reasons by default and reveals all on toggle", () => {
    const reasons: Record<string, number> = {};
    for (let i = 1; i <= 11; i += 1) {
      reasons[`reason_${i}`] = 20 - i;
    }

    render(
      <DeepPipelineDiagnostics
        status={makeStatus({
          screener_reason_code_counts: reasons,
          screener_reason_severity_counts: { blocked: 3, watching: 7 },
        })}
      />
    );

    expect(screen.getAllByText("reason 1").length).toBeGreaterThan(0);
    expect(screen.queryByText("reason 11")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /show all/i }));

    expect(screen.getByText("reason 11")).toBeTruthy();
  });

  it("renders high-volume guidance when diagnostic cardinality is large", () => {
    const reasons: Record<string, number> = {};
    for (let i = 1; i <= 14; i += 1) {
      reasons[`reason_${i}`] = 20 - i;
    }

    render(
      <DeepPipelineDiagnostics
        status={makeStatus({
          screener_reason_code_counts: reasons,
          screener_reason_severity_counts: { blocked: 20, watching: 20 },
        })}
      />
    );

    expect(screen.getByText(/high-volume cycle detected/i)).toBeTruthy();
  });

  it("treats boundary totals as normal state", () => {
    render(
      <DeepPipelineDiagnostics
        status={makeStatus({
          screener_drop_counters: {
            ...makeDropCounters(),
            min_score: 6,
          },
          screener_reason_code_counts: {
            score_below_min: 4,
          },
          screener_reason_severity_counts: {
            blocked: 1,
            watching: 3,
          },
        })}
      />
    );

    expect(screen.getByText(/diagnostics stable/i)).toBeTruthy();
  });

  it("does not include severity aggregates in top blockers", () => {
    render(
      <DeepPipelineDiagnostics
        status={makeStatus({
          screener_drop_counters: {
            ...makeDropCounters(),
            strict_depth: 1,
          },
          screener_reason_code_counts: {
            real_depth_unavailable: 2,
          },
          screener_reason_severity_counts: {
            blocked: 900,
            watching: 700,
          },
        })}
      />
    );

    expect(screen.queryByText(/blocked reasons/i)).toBeNull();
    expect(screen.queryByText(/watching reasons/i)).toBeNull();
  });

  it("renders exchange split and top blockers with counts", () => {
    render(
      <DeepPipelineDiagnostics
        status={makeStatus({
          screener_drop_counters: {
            ...makeDropCounters(),
            missing_real_depth: 9,
            strict_depth: 4,
            stale: 1,
          },
          screener_reason_code_counts: {
            real_depth_unavailable: 5,
            score_below_min: 2,
          },
          screener_reason_severity_counts: {
            blocked: 4,
            watching: 3,
          },
          exchange_diagnostics: {
            hyperliquid: {
              missing_real_depth: 4,
              strict_depth: 2,
              missing_real_fee: 1,
              book_fetch_error: 2,
            },
            lighter: {
              missing_real_depth: 5,
              strict_depth: 2,
              missing_real_fee: 1,
              book_fetch_error: 0,
            },
          },
        })}
      />
    );

    expect(screen.getByRole("heading", { level: 3, name: "Top Blockers" })).toBeTruthy();
    expect(screen.getAllByText(/missing real depth/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 3, name: "Exchange Split" })).toBeTruthy();
    expect(screen.getByText("hyperliquid")).toBeTruthy();
    expect(screen.getByText("lighter")).toBeTruthy();
  });
});
