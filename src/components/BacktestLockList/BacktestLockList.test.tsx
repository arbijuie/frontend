import { fireEvent, render, screen } from "@testing-library/react";
import BacktestLockList from "./BacktestLockList";
import { useBacktestLocks } from "../../hooks/useBacktest";

vi.mock("../../hooks/useBacktest", () => ({
  useBacktestLocks: vi.fn(),
}));

vi.mock("../BacktestLockCard/BacktestLockCard", () => ({
  default: ({ lock }: { lock: { lock_id: string } }) => (
    <div data-testid="lock-card">{lock.lock_id}</div>
  ),
}));

const mockedUseBacktestLocks = vi.mocked(useBacktestLocks);

describe("BacktestLockList", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.clear();
  });

  it("sorts by newest created_at by default", () => {
    mockedUseBacktestLocks.mockReturnValue({
      data: {
        count: 2,
        items: [
          {
            lock_id: "older",
            created_at: "2026-09-10T00:00:00Z",
            strategy_profile_id: "baseline-v1",
            strategy_id: "baseline-v1",
            gate_passed: true,
            total_pnl_bps: 10,
            max_drawdown_bps: 5,
            funding_carry_pnl_bps: 8,
            basis_carry_pnl_bps: 1,
            entry_cost_bps: 2,
            entries: 3,
            exits: 3,
          },
          {
            lock_id: "newer",
            created_at: "2026-09-12T00:00:00Z",
            strategy_profile_id: "baseline-v1",
            strategy_id: "baseline-v1",
            gate_passed: true,
            total_pnl_bps: 8,
            max_drawdown_bps: 4,
            funding_carry_pnl_bps: 6,
            basis_carry_pnl_bps: 0,
            entry_cost_bps: 1,
            entries: 2,
            exits: 2,
          },
        ],
      },
      error: null,
      loading: false,
    } as never);

    render(<BacktestLockList onSelectLock={vi.fn()} />);

    const cards = screen.getAllByTestId("lock-card").map((node) => node.textContent);
    expect(cards).toEqual(["newer", "older"]);
  });

  it("sorts by funding carry when selected", () => {
    mockedUseBacktestLocks.mockReturnValue({
      data: {
        count: 2,
        items: [
          {
            lock_id: "low-funding",
            created_at: "2026-09-12T00:00:00Z",
            strategy_profile_id: "baseline-v1",
            strategy_id: "baseline-v1",
            gate_passed: true,
            total_pnl_bps: 8,
            max_drawdown_bps: 4,
            funding_carry_pnl_bps: 6,
            basis_carry_pnl_bps: 1,
            entry_cost_bps: 1,
            entries: 2,
            exits: 2,
          },
          {
            lock_id: "high-funding",
            created_at: "2026-09-10T00:00:00Z",
            strategy_profile_id: "baseline-v1",
            strategy_id: "baseline-v1",
            gate_passed: true,
            total_pnl_bps: 8,
            max_drawdown_bps: 4,
            funding_carry_pnl_bps: 18,
            basis_carry_pnl_bps: 0,
            entry_cost_bps: 1,
            entries: 2,
            exits: 2,
          },
        ],
      },
      error: null,
      loading: false,
    } as never);

    render(<BacktestLockList onSelectLock={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/sort locks by/i), {
      target: { value: "funding_carry_pnl_bps" },
    });

    const cards = screen.getAllByTestId("lock-card").map((node) => node.textContent);
    expect(cards).toEqual(["high-funding", "low-funding"]);
    expect(window.localStorage.getItem("backtest-lock-list-sort")).toBe("funding_carry_pnl_bps");
  });

  it("restores saved sort from localStorage", () => {
    window.localStorage.setItem("backtest-lock-list-sort", "basis_carry_pnl_bps");

    mockedUseBacktestLocks.mockReturnValue({
      data: {
        count: 2,
        items: [
          {
            lock_id: "high-basis",
            created_at: "2026-09-10T00:00:00Z",
            strategy_profile_id: "baseline-v1",
            strategy_id: "baseline-v1",
            gate_passed: true,
            total_pnl_bps: 8,
            max_drawdown_bps: 4,
            funding_carry_pnl_bps: 6,
            basis_carry_pnl_bps: 10,
            entry_cost_bps: 1,
            entries: 2,
            exits: 2,
          },
          {
            lock_id: "low-basis",
            created_at: "2026-09-12T00:00:00Z",
            strategy_profile_id: "baseline-v1",
            strategy_id: "baseline-v1",
            gate_passed: true,
            total_pnl_bps: 8,
            max_drawdown_bps: 4,
            funding_carry_pnl_bps: 6,
            basis_carry_pnl_bps: 1,
            entry_cost_bps: 1,
            entries: 2,
            exits: 2,
          },
        ],
      },
      error: null,
      loading: false,
    } as never);

    render(<BacktestLockList onSelectLock={vi.fn()} />);

    const cards = screen.getAllByTestId("lock-card").map((node) => node.textContent);
    expect(cards).toEqual(["high-basis", "low-basis"]);
    expect((screen.getByLabelText(/sort locks by/i) as HTMLSelectElement).value).toBe(
      "basis_carry_pnl_bps"
    );
  });
});
