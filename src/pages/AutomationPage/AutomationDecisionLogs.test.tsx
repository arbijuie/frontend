import { fireEvent, render, screen } from "@testing-library/react";
import AutomationDecisionLogs from "./AutomationDecisionLogs";
import { useAutomationDecisions } from "../../hooks/useAutomationDecisions";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("../../hooks/useAutomationDecisions", async () => {
  const actual = await vi.importActual<typeof import("../../hooks/useAutomationDecisions")>(
    "../../hooks/useAutomationDecisions"
  );
  return { ...actual, useAutomationDecisions: vi.fn() };
});

const mocked = vi.mocked(useAutomationDecisions);

const entryItems = [
  {
    symbol: "BTC",
    strategy_type: "funding_arbitrage",
    long_exchange: "hyperliquid",
    short_exchange: "lighter",
    score_bps: 42.5,
    action: "skip",
    reasons: ["gate_not_passed"],
    evaluated_at: "2026-10-16T09:00:00Z",
    outcome: null,
    attempt_id: null,
  },
];

const exitItems = [
  {
    attempt_id: "att-1",
    symbol: "ETH",
    action: "exit",
    trigger: "funding_flip",
    conditions: ["funding_flip"],
    reason: "net funding -2% APR",
    net_funding_apr: -2,
    entry_score_bps: 30,
    current_score_bps: 5,
    held_hours: 6.5,
    evaluated_at: "2026-10-16T09:00:00Z",
    strategy_type: "funding_arbitrage",
    funding_samples: [],
    funding_breakeven: false,
    min_hold_gated: false,
    outcome: "closed",
  },
];

function view(items: unknown[]) {
  return {
    data: { count: items.length, status: {}, items },
    error: null,
    loading: false,
    fetching: false,
    refetch: vi.fn(),
  } as never;
}

describe("AutomationDecisionLogs", () => {
  it("lists entry decisions with reasons and fetches only the selected kind and page size", () => {
    mocked.mockImplementation((kind) => view(kind === "entry" ? entryItems : exitItems));
    render(<AutomationDecisionLogs />);

    expect(mocked).toHaveBeenLastCalledWith("entry", 50);
    const list = screen.getByRole("list", { name: "entry decisions" });
    expect(list?.textContent ?? "").toContain("BTC");
    expect(list?.textContent ?? "").toContain("42.50 bps");
    expect(list?.textContent ?? "").toContain("gate_not_passed");

    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "20" } });
    expect(mocked).toHaveBeenLastCalledWith("entry", 20);

    fireEvent.click(screen.getByRole("tab", { name: "Exit decisions" }));
    expect(mocked).toHaveBeenLastCalledWith("exit", 20);
    const exits = screen.getByRole("list", { name: "exit decisions" });
    expect(exits?.textContent ?? "").toContain("ETH (att-1)");
    expect(exits?.textContent ?? "").toContain("exit on funding_flip → closed");
    expect(exits?.textContent ?? "").toContain("held 6.5 h");
  });

  it("shows empty and error states", () => {
    mocked.mockReturnValue(view([]));
    const { unmount } = render(<AutomationDecisionLogs />);
    expect(screen.getByText("No entry decisions yet")).toBeTruthy();
    unmount();

    mocked.mockReturnValue({
      data: null,
      error: "GET failed: 500",
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    } as never);
    render(<AutomationDecisionLogs />);
    expect(screen.getByRole("alert")?.textContent ?? "").toContain(
      "Decision log error: GET failed: 500"
    );
  });
});
