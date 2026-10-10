import { fireEvent, render, screen } from "@testing-library/react";
import ReplayResultPanel from "./ReplayResultPanel";
import type { BacktestMetrics } from "../../api/types";

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

describe("ReplayResultPanel", () => {
  it("is exposed as a named region", () => {
    render(<ReplayResultPanel metrics={metrics} />);

    expect(screen.getByRole("region", { name: "Replay result" })).toBeTruthy();
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
});
