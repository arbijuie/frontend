import { render, screen } from "@testing-library/react";
import RecoveryHealthCard from "./RecoveryHealthCard";
import type { StatusResponse } from "../../api/types";

function makeContinuity(
  overrides: Partial<NonNullable<StatusResponse["snapshot_continuity"]>> = {}
): NonNullable<StatusResponse["snapshot_continuity"]> {
  return {
    enabled: true,
    exchanges_covered: 2,
    gap_count: 0,
    largest_gap_s: 0,
    last_pruned_at: null,
    last_recovered_at: null,
    last_recovery_duration_ms: null,
    last_recovery_scanned_rows: 0,
    recover_on_startup: true,
    recovery_attempted: true,
    recovery_max_rows: 0,
    recovery_result: "not_attempted",
    recovery_warning: false,
    retention_days: 7,
    rows_total: 0,
    symbols_covered: 0,
    write_failures: 0,
    ...overrides,
  };
}

function makeStatus(overrides: Partial<StatusResponse> = {}): StatusResponse {
  return {
    uptime_s: 10,
    last_updated_at: "2026-01-01T00:00:10Z",
    exchange_last_ok: {
      hyperliquid: true,
      lighter: true,
    },
    ...overrides,
  } as StatusResponse;
}

describe("RecoveryHealthCard", () => {
  it("renders completed recovery metrics", () => {
    render(
      <RecoveryHealthCard
        status={makeStatus({
          snapshot_continuity: makeContinuity({
            recovery_result: "completed",
            recovery_max_rows: 1234,
            last_recovery_scanned_rows: 987,
            last_recovery_duration_ms: 88.4,
          }),
        })}
      />
    );

    expect(screen.getByText("Startup Recovery")).toBeTruthy();
    expect(screen.getByText("completed")).toBeTruthy();
    expect(screen.getByText("987")).toBeTruthy();
    expect(screen.getByText("88 ms")).toBeTruthy();
    expect(screen.getByText("1234")).toBeTruthy();
  });

  it("falls back to safe defaults when continuity is absent", () => {
    render(<RecoveryHealthCard status={makeStatus({ snapshot_continuity: undefined })} />);

    expect(screen.getByText("not_attempted")).toBeTruthy();
    expect(screen.getByText("Recovery Scanned Rows")).toBeTruthy();
    expect(screen.getByText("Recovery Duration")).toBeTruthy();
    expect(screen.getByText("Recovery Max Rows")).toBeTruthy();
    expect(screen.getByText("-")).toBeTruthy();
  });
});
