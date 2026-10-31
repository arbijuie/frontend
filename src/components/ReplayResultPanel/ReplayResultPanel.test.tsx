import { fireEvent, render, screen } from "@testing-library/react";
import ReplayResultPanel from "./ReplayResultPanel";
import type { BacktestMetrics, ReplaySourceDiagnostics } from "../../api/types";

const metrics = {
  strategy_id: "baseline-v1",
  total_samples: 1200,
  symbols_covered: 14,
  entries: 9,
  exits: 9,
  closed_trades: 9,
  wins: 4,
  win_rate: 0.44,
  total_pnl_bps: -15.2,
  median_trade_pnl_bps: -1.2,
  max_drawdown_bps: 80,
  funding_carry_pnl_bps: 5,
  basis_carry_pnl_bps: -12,
  entry_cost_bps: 8.2,
} as unknown as BacktestMetrics;

const overlayDiagnostics = {
  replay_source: "vooi_seed_overlay",
  overlay_total: 12,
  overlay_matched: 9,
  overlay_missing: 3,
  overlay_parse_errors: 0,
  history_rows_loaded: 84,
  overlay_symbols_total: 2,
  overlay_symbols_complete: 1,
  overlay_symbols_partial: 1,
  overlay_symbols_missing: 0,
  symbol_coverage: {
    BTC: {
      snapshots_total: 6,
      matched: 6,
      missing_long: 0,
      missing_short: 0,
      parse_errors: 0,
      coverage_pct: 100,
    },
    ETH: {
      snapshots_total: 6,
      matched: 3,
      missing_long: 2,
      missing_short: 1,
      parse_errors: 0,
      coverage_pct: 50,
    },
  },
} as ReplaySourceDiagnostics;

describe("ReplayResultPanel", () => {
  it("is exposed as a named region", () => {
    render(<ReplayResultPanel metrics={metrics} />);

    expect(screen.getByRole("region", { name: "Replay result" })).toBeTruthy();
  });

  it("names the coverage legend through a role that supports aria-label", () => {
    render(<ReplayResultPanel metrics={metrics} />);

    // A bare div with aria-label is not announced (axe aria-prohibited-attr, issue #484).
    expect(screen.getByRole("group", { name: "Coverage legend" })).toBeTruthy();
  });

  it("calls onCreateLock when idle", () => {
    const onCreateLock = vi.fn();
    render(<ReplayResultPanel metrics={metrics} onCreateLock={onCreateLock} />);

    fireEvent.click(screen.getByRole("button", { name: /create strategy lock/i }));

    expect(onCreateLock).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks but stays focusable while the lock is being created", () => {
    const onCreateLock = vi.fn();
    render(<ReplayResultPanel metrics={metrics} onCreateLock={onCreateLock} creatingLock />);

    const button = screen.getByRole("button", { name: "Locking..." });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button);

    expect(onCreateLock).not.toHaveBeenCalled();
  });

  it("ignores clicks after the lock was created", () => {
    const onCreateLock = vi.fn();
    render(<ReplayResultPanel metrics={metrics} onCreateLock={onCreateLock} lockCreated />);

    const button = screen.getByRole("button", { name: /lock created/i });
    expect(button.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(button);

    expect(onCreateLock).not.toHaveBeenCalled();
  });

  it("renders typed replay diagnostics and per-symbol coverage", () => {
    render(
      <ReplayResultPanel
        metrics={metrics}
        replaySource="vooi_seed_overlay"
        replayDiagnostics={overlayDiagnostics}
      />
    );

    expect(screen.getByText(/replay source diagnostics/i)).toBeTruthy();
    expect(screen.getByLabelText(/coverage legend/i)).toBeTruthy();
    expect(screen.getByText("good >=95%")).toBeTruthy();
    expect(screen.getByText("warn 60-94.9%")).toBeTruthy();
    expect(screen.getByText("poor <60%")).toBeTruthy();
    expect(screen.getByText("vooi_seed_overlay")).toBeTruthy();
    expect(screen.getByText("9 / 12")).toBeTruthy();
    expect(screen.getByText("75.0%")).toBeTruthy();
    expect(screen.getByText(/per-symbol coverage/i)).toBeTruthy();
    expect(screen.getByText("ETH")).toBeTruthy();
    expect(screen.getByText("50.0%")).toBeTruthy();
    expect(screen.getByText(/\(3\/6\) L-2 S-1 P-0/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /help: replay source diagnostics/i }));
    expect(screen.getByText(/coverage badges use:/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /help: overlay matched \/ total/i }));
    expect(screen.getByText(/coverage percent is matched \/ total \* 100/i)).toBeTruthy();
  });
});
