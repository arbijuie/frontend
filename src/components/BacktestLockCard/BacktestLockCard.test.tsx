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
});
