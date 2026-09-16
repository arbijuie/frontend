import { render, screen } from "@testing-library/react";
import RecoveryHealthCard from "./RecoveryHealthCard";
import type { StatusResponse } from "../../api/types";

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
          snapshot_continuity: {
            recovery_result: "completed",
            recovery_max_rows: 1234,
            last_recovery_scanned_rows: 987,
            last_recovery_duration_ms: 88.4,
          },
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
    render(<RecoveryHealthCard status={makeStatus({ snapshot_continuity: null })} />);

    expect(screen.getByText("not_attempted")).toBeTruthy();
    expect(screen.getByText("Recovery Scanned Rows")).toBeTruthy();
    expect(screen.getByText("Recovery Duration")).toBeTruthy();
    expect(screen.getByText("Recovery Max Rows")).toBeTruthy();
    expect(screen.getByText("-")).toBeTruthy();
  });
});
