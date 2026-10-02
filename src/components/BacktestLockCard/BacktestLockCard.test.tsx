import { render, screen, fireEvent } from "@testing-library/react";
import BacktestLockCard from "./BacktestLockCard";

const mockLock = {
  lock_id: "baseline-v1-123",
  created_at: "2026-09-13T09:00:00Z",
  strategy_profile_id: "baseline-v1",
  strategy_id: "baseline-v1",
  gate_passed: false,
  total_pnl_bps: 0,
  max_drawdown_bps: 0,
  funding_carry_pnl_bps: 0,
  basis_carry_pnl_bps: 0,
  entry_cost_bps: 0,
  entries: 0,
  exits: 0,
};

describe("BacktestLockCard", () => {
  it("calls onSelect with the lock id when View details is clicked", () => {
    const onSelect = vi.fn();
    render(<BacktestLockCard lock={mockLock} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /view details/i }));

    expect(onSelect).toHaveBeenCalledWith("baseline-v1-123");
  });

  it("shows the Gate Failed badge when gate_passed is false", () => {
    render(<BacktestLockCard lock={mockLock} onSelect={vi.fn()} />);
    expect(screen.getByText(/gate failed/i)).not.toBeNull();
  });

  it("shows the Gate Passed badge when gate_passed is true", () => {
    render(<BacktestLockCard lock={{ ...mockLock, gate_passed: true }} onSelect={vi.fn()} />);
    expect(screen.getByText(/gate passed/i)).not.toBeNull();
  });

  it("shows compact carry and trades diagnostics", () => {
    render(
      <BacktestLockCard
        lock={{
          ...mockLock,
          funding_carry_pnl_bps: 12.5,
          basis_carry_pnl_bps: 3.4,
          entry_cost_bps: 2.1,
          entries: 4,
          exits: 3,
        }}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText(/carry \(funding \/ basis\)/i)).not.toBeNull();
    expect(screen.getByText(/12.5 \/ 3.4 bps/i)).not.toBeNull();
    expect(screen.getByText(/-2.1 bps · 4\/3/i)).not.toBeNull();
  });
});
