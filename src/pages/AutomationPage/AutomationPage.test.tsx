import { fireEvent, render, screen } from "@testing-library/react";
import AutomationPage from "./AutomationPage";
import { useAutomation, useAutomationControl } from "../../hooks/useAutomation";
import type { AutomationModeItem, AutomationOverviewResponse } from "../../api/types";

vi.mock("../../hooks/useAutomation", () => ({
  useAutomation: vi.fn(),
  useAutomationControl: vi.fn(),
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
    expect(screen.getByTestId("entry-state").textContent).toBe("armed");
    expect(screen.getByText(/score 42.50 bps/)).toBeTruthy();
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
    expect(banner.textContent).toContain("acceptance_evidence_missing");
    expect(banner.textContent).toContain("3 consecutive rollbacks");
    expect(banner.textContent).toContain('Guardrail "margin" blocks new entries.');
    expect(screen.getByText("blockers: guardrail_margin")).toBeTruthy();
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

    expect(screen.getByText("No automation data")).toBeTruthy();
  });
});
