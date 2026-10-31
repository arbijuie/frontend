import { fireEvent, render, screen } from "@testing-library/react";
import AutomationPage from "./AutomationPage";
import { useAutomation, useAutomationControl } from "../../hooks/useAutomation";
import type { AutomationModeItem, AutomationOverviewResponse } from "../../api/types";

vi.mock("../../hooks/useAutomation", () => ({
  useAutomation: vi.fn(),
  useAutomationControl: vi.fn(),
}));

vi.mock("./AutomationDecisionLogs", () => ({
  default: () => <section aria-label="Decision logs">Decision logs mock</section>,
}));

vi.mock("../../components/FloatingRefreshButton/FloatingRefreshButton", () => ({
  default: ({ label }: { label: string }) => <button type="button">{label}</button>,
}));

const mockedUseAutomation = vi.mocked(useAutomation);
const mockedUseAutomationControl = vi.mocked(useAutomationControl);

function makeMode(overrides: Partial<AutomationModeItem> = {}): AutomationModeItem {
  return {
    kind: "entry",
    enabled: true,
    paused: false,
    paused_at: null,
    pause_reason: null,
    paused_by: null,
    state: "armed",
    blockers: [],
    last_run_at: "2026-10-02T12:00:00Z",
    actions_total: 2,
    failures_total: 0,
    last_action_at: "2026-10-02T11:59:00Z",
    last_action_symbol: "BTC",
    last_action_outcome: "active",
    ...overrides,
  };
}

function makeOverview(
  overrides: Partial<AutomationOverviewResponse> = {}
): AutomationOverviewResponse {
  return {
    checked_at: "2026-10-02T12:00:05Z",
    entry: makeMode(),
    exit: makeMode({ kind: "exit", last_action_symbol: null, last_action_outcome: null }),
    posture: {
      exec_enabled: true,
      exec_dry_run: true,
      gate_passed: true,
      gate_reason: "",
      entries_stopped: false,
      consecutive_rollbacks: 0,
      guardrail_entry_blocks: [],
      guardrail_last_evaluated_at: null,
      open_positions: 1,
    },
    recent_entries: [
      {
        symbol: "BTC",
        strategy_type: "funding_arbitrage",
        long_exchange: "hyperliquid",
        short_exchange: "lighter",
        score_bps: 42.5,
        action: "enter",
        reasons: [],
        evaluated_at: "2026-10-02T11:59:00Z",
        outcome: "active",
        attempt_id: "a1",
      },
    ],
    recent_exits: [],
    control_log: [],
    ...overrides,
  };
}

function mockHooks(data: AutomationOverviewResponse | null, mutate = vi.fn()) {
  mockedUseAutomation.mockReturnValue({
    data,
    error: null,
    loading: false,
    fetching: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAutomation>);
  mockedUseAutomationControl.mockReturnValue({
    mutate,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useAutomationControl>);
  return mutate;
}

describe("AutomationPage", () => {
  it("shows both capabilities with their state and recent activity", () => {
    mockHooks(makeOverview());

    render(<AutomationPage />);

    expect(screen.getByRole("heading", { level: 2, name: "Auto-entry" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Auto-exit" })).toBeTruthy();
    expect(screen.getByTestId("entry-state").textContent).toBe("Ready to act");
    expect(document.body.textContent).toMatch(/expected edge 0\.4[23]%/);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("explains guardrails that hold automation back", () => {
    const overview = makeOverview({
      entry: makeMode({ state: "blocked", blockers: ["guardrail_margin"] }),
    });
    overview.posture = {
      ...overview.posture,
      gate_passed: false,
      gate_reason: "acceptance_evidence_missing",
      entries_stopped: true,
      consecutive_rollbacks: 3,
      guardrail_entry_blocks: ["margin"],
    };
    mockHooks(overview);

    render(<AutomationPage />);

    const banner = screen.getByRole("alert");
    expect(banner.textContent).toContain("acceptance evidence missing");
    expect(banner.textContent).toContain("3 failed openings in a row");
    expect(banner.textContent).toContain('Safety rule "Margin" stops new deals.');
    expect(screen.getByText("Held back by: Guardrail margin")).toBeTruthy();
  });

  it("pauses only with a reason and sends the control", () => {
    const mutate = mockHooks(makeOverview());
    render(<AutomationPage />);

    const pause = screen.getByRole("button", { name: "Pause auto-entry" }) as HTMLButtonElement;
    expect(pause.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Auto-entry pause reason"), {
      target: { value: "  incident review " },
    });
    expect(pause.disabled).toBe(false);
    fireEvent.click(pause);

    expect(mutate).toHaveBeenCalledWith({
      target: "entry",
      action: "pause",
      reason: "incident review",
    });
  });

  it("resumes a paused capability and shows who paused it", () => {
    const mutate = mockHooks(
      makeOverview({
        exit: makeMode({
          kind: "exit",
          paused: true,
          state: "paused",
          paused_at: "2026-10-02T11:00:00Z",
          paused_by: "10.0.0.1",
          pause_reason: "hold positions",
        }),
      })
    );
    render(<AutomationPage />);

    expect(screen.getByText(/by 10.0.0.1: hold positions/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Resume auto-exit" }));

    expect(mutate).toHaveBeenCalledWith({ target: "exit", action: "resume", reason: "" });
  });

  it("renders an empty state before the first answer", () => {
    mockHooks(null);

    render(<AutomationPage />);

    expect(screen.getByText("No auto-trading data yet")).toBeTruthy();
  });

  it("asks for real-money confirmation before resuming auto-entry in live mode", () => {
    const overview = makeOverview({
      entry: makeMode({ paused: true, state: "paused", paused_by: "op", pause_reason: "news" }),
    });
    overview.posture = { ...overview.posture, exec_enabled: true, exec_dry_run: false };
    const mutate = mockHooks(overview);
    render(<AutomationPage />);

    const resume = screen.getByRole("button", { name: "Resume auto-entry" }) as HTMLButtonElement;
    expect(resume.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /I understand the risks/ }));
    fireEvent.click(resume);
    expect(mutate).toHaveBeenCalledWith({ target: "entry", action: "resume", reason: "" });
  });

  it("uses plain words for every state", () => {
    const states: [AutomationModeItem["state"], string][] = [
      ["armed", "Ready to act"],
      ["blocked", "Held back"],
      ["paused", "Paused"],
      ["disabled", "Turned off"],
    ];
    for (const [state, label] of states) {
      mockHooks(makeOverview({ entry: makeMode({ state }) }));
      const { unmount } = render(<AutomationPage />);
      expect(screen.getByTestId("entry-state").textContent).toBe(label);
      unmount();
    }
  });

  it("shows whether a capability is turned on as Yes or No", () => {
    mockHooks(makeOverview({ entry: makeMode({ enabled: false, state: "disabled" }) }));
    render(<AutomationPage />);

    expect(screen.getByText("Turned on: No")).toBeTruthy();
    expect(screen.getByText("Turned on: Yes")).toBeTruthy();
    expect(screen.queryByText(/enabled:/)).toBeNull();
  });

  it("names the mode as practice or real money", () => {
    mockHooks(makeOverview());
    const { unmount } = render(<AutomationPage />);
    expect(screen.getByText("Practice mode")).toBeTruthy();
    expect(screen.queryByText(/mode: dry-run/)).toBeNull();
    unmount();

    const live = makeOverview();
    live.posture = { ...live.posture, exec_dry_run: false };
    mockHooks(live);
    render(<AutomationPage />);
    expect(screen.getByText("Real money")).toBeTruthy();
    expect(screen.queryByText(/mode: live/)).toBeNull();
  });

  it("capitalises every fact label in the mode card", () => {
    mockHooks(makeOverview());
    render(<AutomationPage />);

    expect(screen.getAllByText(/^Last run:/).length).toBe(2);
    expect(screen.getAllByText(/^Actions:/).length).toBe(2);
    expect(screen.getAllByText(/^Last action:/).length).toBe(2);
    expect(screen.queryByText(/^last run:/)).toBeNull();
    expect(screen.queryByText(/^actions:/)).toBeNull();
    expect(screen.queryByText(/^last action:/)).toBeNull();
  });
});
