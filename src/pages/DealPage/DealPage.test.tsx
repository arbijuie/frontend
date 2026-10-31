import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DealPage from "./DealPage";
import { useOpportunities } from "../../hooks/useOpportunities";

vi.mock("../../hooks/useOpportunities", () => ({ useOpportunities: vi.fn() }));
vi.mock("../../components/ExecutionSheet/ExecutionSheet", () => ({
  default: () => <div>Execution sheet</div>,
}));

const mocked = vi.mocked(useOpportunities);

function deal(overrides: Record<string, unknown> = {}) {
  return {
    symbol: "ETH",
    status: "blocked",
    legs: [
      { side: "long", venue: "binance" },
      { side: "short", venue: "lighter" },
    ],
    funding_diff_apr: 18.25,
    total_cost_bps: 20,
    hours_to_breakeven: 96,
    long_rate_apr: 2,
    short_rate_apr: 20.25,
    basis_bps: 5,
    combined_score: 12,
    funding_edge_bps: 4,
    fee_impact_bps: 15,
    slippage_impact_bps: 5,
    strategy_type: "funding_arbitrage",
    strategy_profile_id: "baseline-v1",
    recommended_size_usd: 1000,
    reasons: [{ code: "execution_disabled", message: "x" }],
    microstructure_by_exchange: { binance: { mid: "2500" }, lighter: { mid: "2501" } },
    ...overrides,
  };
}

function renderAt(path: string, items: unknown[]) {
  mocked.mockReturnValue({
    data: { opportunities: items, updated_at: "2026-10-19T12:00:00Z" },
    loading: false,
    error: null,
  } as never);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/deals/:symbol/:long/:short" element={<DealPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DealPage", () => {
  it("shows the plain summary, both sides and the reasons", () => {
    renderAt("/deals/ETH/binance/lighter", [deal()]);
    expect(screen.getByRole("heading", { level: 1, name: "ETH" })).toBeTruthy();
    expect(screen.getByText("+18.3% / year")).toBeTruthy();
    expect(screen.getByText("0.20%")).toBeTruthy();
    expect(screen.getByText("4 days")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Buy on binance" }).textContent).toContain(
      "$2500.00"
    );
    expect(screen.getByText("Why it is blocked")).toBeTruthy();
    expect(screen.getByText("Trading is turned off in settings")).toBeTruthy();
  });

  it("estimates income for the chosen deal size", () => {
    renderAt("/deals/ETH/binance/lighter", [deal()]);
    const estimate = screen.getByRole("region", { name: "Try a deal size" });
    expect(estimate.textContent).toContain("$0.50");
    expect(estimate.textContent).toContain("−$2.00");
    expect(estimate.textContent).toContain("$13.00");
    fireEvent.click(screen.getByRole("button", { name: "$5,000" }));
    expect(estimate.textContent).toContain("$65.00");
  });

  it("turns off opening when it is probably not the same coin", () => {
    renderAt("/deals/ETH/binance/lighter", [
      deal({ microstructure_by_exchange: { binance: { mid: "1.98" }, lighter: { mid: "0.087" } } }),
    ]);
    expect(screen.getByRole("alert").textContent).toContain("Probably not the same coin");
    expect(screen.queryByRole("button", { name: /Open position/ })).toBeNull();
  });

  it("opens the trade sheet only for a Ready deal", () => {
    const { unmount } = renderAt("/deals/ETH/binance/lighter", [deal()]);
    expect(screen.queryByRole("button", { name: /Open position/ })).toBeNull();
    expect(screen.getByText(/once it is Ready/)).toBeTruthy();
    unmount();
    renderAt("/deals/ETH/binance/lighter", [deal({ status: "ready", reasons: [] })]);
    fireEvent.click(screen.getByRole("button", { name: /Open position/ }));
    expect(screen.getByText("Execution sheet")).toBeTruthy();
  });

  it("explains when the deal has left the list", () => {
    renderAt("/deals/BTC/binance/lighter", [deal()]);
    expect(screen.getByText("This deal is no longer in the list")).toBeTruthy();
  });
});
