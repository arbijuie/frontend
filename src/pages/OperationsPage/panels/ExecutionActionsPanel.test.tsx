import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ExecutionActionsPanel from "./ExecutionActionsPanel";
import { useExecutionPreflight } from "../../../hooks/useExecutionPreflight";
import {
  useExecutionAttempts,
  useExecutionClose,
  useExecutionOpen,
} from "../../../hooks/useOperations";
import { ApiRequestError } from "../../../lib/api-errors";
import type { ExecutionAttemptItem } from "../../../api/types";

vi.mock("../../../hooks/useExecutionPreflight", () => ({ useExecutionPreflight: vi.fn() }));
vi.mock("../../../hooks/useOperations", () => ({
  useExecutionAttempts: vi.fn(),
  useExecutionOpen: vi.fn(),
  useExecutionClose: vi.fn(),
}));

const mockedPreflight = vi.mocked(useExecutionPreflight);
const mockedAttempts = vi.mocked(useExecutionAttempts);
const mockedOpen = vi.mocked(useExecutionOpen);
const mockedClose = vi.mocked(useExecutionClose);

function preflight(execEnabled: boolean, dryRun = true, decision?: string) {
  return {
    data: {
      mode: { exec_enabled: execEnabled, exec_dry_run: dryRun, strategy_profile_id: "baseline-v1" },
      decision: decision ?? (execEnabled ? "watching" : "blocked"),
      blockers: execEnabled
        ? []
        : [{ code: "execution_disabled", severity: "blocked", source: "gate", message: "" }],
    },
    error: null,
    loading: false,
    fetching: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useExecutionPreflight>;
}

function preflightPending() {
  return {
    data: null,
    error: null,
    loading: true,
    fetching: true,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useExecutionPreflight>;
}

function attempt(overrides: Partial<ExecutionAttemptItem> = {}): ExecutionAttemptItem {
  return {
    attempt_id: "att-1",
    created_at: "2026-10-16T08:00:00Z",
    symbol: "BTC",
    long_exchange: "hyperliquid",
    short_exchange: "lighter",
    quantity: "1",
    size_usd: 100,
    status: "active",
    dry_run: true,
    first_leg: {} as ExecutionAttemptItem["first_leg"],
    second_leg: {} as ExecutionAttemptItem["second_leg"],
    second_leg_attempts: 1,
    rollback_attempts: 0,
    consecutive_rollbacks: 0,
    residual_exposure: false,
    error: null,
    events: ["pending_first_leg", "active"],
    ...overrides,
  } as ExecutionAttemptItem;
}

function attemptsView(items: ExecutionAttemptItem[]) {
  return {
    data: { count: items.length, consecutive_rollbacks: 0, entries_stopped: false, items },
    error: null,
    errorObject: null,
    loading: false,
    fetching: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useExecutionAttempts>;
}

function mutation(overrides: Record<string, unknown> = {}) {
  return {
    mutateAsync: vi.fn().mockResolvedValue(attempt()),
    isPending: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useExecutionOpen>;
}

function renderPanel() {
  return render(
    <MemoryRouter>
      <ExecutionActionsPanel />
    </MemoryRouter>
  );
}

function reviewOpen(symbol = "eth") {
  fireEvent.change(screen.getByLabelText("Symbol"), { target: { value: symbol } });
  fireEvent.click(screen.getByRole("button", { name: "Review open request" }));
}

function confirmOpenButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Confirm open" }) as HTMLButtonElement;
}

describe("ExecutionActionsPanel", () => {
  beforeEach(() => {
    mockedPreflight.mockReturnValue(preflight(true));
    mockedAttempts.mockReturnValue(attemptsView([attempt()]));
    mockedOpen.mockReturnValue(mutation());
    mockedClose.mockReturnValue(mutation() as never);
  });

  it("shows the mode banner and the attempt timeline with transitions and failures", () => {
    mockedAttempts.mockReturnValue(
      attemptsView([
        attempt(),
        attempt({
          attempt_id: "att-2",
          status: "rolled_back",
          error: "second leg rejected",
          events: ["pending_first_leg", "rolled_back"],
        }),
      ])
    );
    renderPanel();

    expect(screen.getByRole("status")?.textContent ?? "").toContain("Mode: dry-run");
    expect(screen.getByRole("region", { name: "Execution attempts table" })).toBeTruthy();
    const table = screen.getByRole("table", { name: "Execution attempts" });
    expect(table?.textContent ?? "").toContain("rolled_back");
    expect(table?.textContent ?? "").toContain("second leg rejected");
    expect(screen.getByRole("list", { name: "Transitions of att-2" })?.textContent ?? "").toContain(
      "pending_first_leg"
    );
  });

  it("disables both action buttons while execution is disabled", () => {
    mockedPreflight.mockReturnValue(preflight(false));
    renderPanel();

    expect(screen.getByRole("status")?.textContent ?? "").toContain("execution disabled");
    expect(
      screen.getByRole("button", { name: "Review open request" }).hasAttribute("disabled")
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Review close request" }).hasAttribute("disabled")
    ).toBe(true);
  });

  it("requires an explicit confirmation before an open is sent and validates the form first", async () => {
    const open = mutation();
    mockedOpen.mockReturnValue(open);
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Review open request" }));
    expect(screen.getByRole("alert")?.textContent ?? "").toContain("Enter a symbol.");
    expect(open.mutateAsync).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Symbol"), { target: { value: "eth" } });
    fireEvent.change(screen.getByLabelText("Size in USD (optional, default from config)"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review open request" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog?.textContent ?? "").toContain(
      "Open ETH: long hyperliquid, short lighter, 150 USD"
    );
    expect(dialog?.textContent ?? "").toContain("Dry-run mode");
    expect(open.mutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm open" }));
    await waitFor(() =>
      expect(open.mutateAsync).toHaveBeenCalledWith({
        symbol: "ETH",
        long_exchange: "hyperliquid",
        short_exchange: "lighter",
        size_usd: 150,
      })
    );
    expect(await screen.findByText(/Attempt att-1 is/)).toBeTruthy();
  });

  it("rejects a pair on one venue and lets the operator cancel a close", () => {
    const close = mutation();
    mockedClose.mockReturnValue(close as never);
    renderPanel();

    fireEvent.change(screen.getByLabelText("Symbol"), { target: { value: "BTC" } });
    fireEvent.change(screen.getByLabelText("Short venue"), { target: { value: "hyperliquid" } });
    fireEvent.click(screen.getByRole("button", { name: "Review open request" }));
    expect(screen.getByRole("alert")?.textContent ?? "").toContain(
      "Long and short venues must differ."
    );

    fireEvent.change(screen.getByLabelText("Attempt id"), { target: { value: "att-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Review close request" }));
    expect(screen.getByRole("alertdialog")?.textContent ?? "").toContain(
      "Close attempt att-1 (manual close)"
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(close.mutateAsync).not.toHaveBeenCalled();
  });

  it("explains runtime refusals and auth failures differently", () => {
    mockedOpen.mockReturnValue(
      mutation({
        error: new ApiRequestError("Execution gate is closed", 409, "acceptance_evidence_missing"),
      })
    );
    renderPanel();
    expect(screen.getByRole("alert")?.textContent ?? "").toContain(
      "Runtime refused (acceptance_evidence_missing): Execution gate is closed"
    );

    mockedOpen.mockReturnValue(mutation({ error: new ApiRequestError("Unauthorized", 401, null) }));
    renderPanel();
    expect(screen.getAllByRole("alert").at(-1)?.textContent ?? "").toContain("Not authorized");
  });

  it("shows an empty state when there are no attempts", () => {
    mockedAttempts.mockReturnValue(attemptsView([]));
    renderPanel();
    expect(screen.getByText("No attempts yet")).toBeTruthy();
  });

  it("needs the real-money box before a live open can be confirmed", async () => {
    mockedPreflight.mockReturnValue(preflight(true, false));
    const open = mutation();
    mockedOpen.mockReturnValue(open);
    renderPanel();

    reviewOpen();
    expect(screen.getByRole("region", { name: "Real money warning" })).toBeTruthy();
    expect(confirmOpenButton().disabled).toBe(true);

    fireEvent.click(confirmOpenButton());
    expect(open.mutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: /I understand the risks/ }));
    expect(confirmOpenButton().disabled).toBe(false);

    fireEvent.click(confirmOpenButton());
    await waitFor(() => expect(open.mutateAsync).toHaveBeenCalledTimes(1));
  });

  it("asks for the real-money box again after every confirm and after a cancel", async () => {
    mockedPreflight.mockReturnValue(preflight(true, false));
    renderPanel();

    reviewOpen();
    fireEvent.click(screen.getByRole("checkbox", { name: /I understand the risks/ }));
    fireEvent.click(confirmOpenButton());
    await screen.findByText(/Attempt att-1 is/);

    fireEvent.click(screen.getByRole("button", { name: "Review open request" }));
    const box = screen.getByRole("checkbox", {
      name: /I understand the risks/,
    }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(confirmOpenButton().disabled).toBe(true);

    fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Review open request" }));
    expect(
      (screen.getByRole("checkbox", { name: /I understand the risks/ }) as HTMLInputElement).checked
    ).toBe(false);
  });

  it("does not show the real-money box in practice mode", () => {
    renderPanel();
    reviewOpen();
    expect(screen.queryByRole("region", { name: "Real money warning" })).toBeNull();
    expect(confirmOpenButton().disabled).toBe(false);
  });

  it("closes a pair in live mode without the real-money box", () => {
    mockedPreflight.mockReturnValue(preflight(true, false));
    renderPanel();

    fireEvent.change(screen.getByLabelText("Attempt id"), { target: { value: "att-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Review close request" }));

    expect(screen.queryByRole("region", { name: "Real money warning" })).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Confirm close" }) as HTMLButtonElement).disabled
    ).toBe(false);
  });

  it("disables the open review while the preflight decision is blocked", () => {
    mockedPreflight.mockReturnValue(preflight(true, true, "blocked"));
    renderPanel();

    expect(
      (screen.getByRole("button", { name: "Review open request" }) as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByText("The safety check blocks opening right now.")).toBeTruthy();
  });

  it("disables the open review before the preflight has answered", () => {
    mockedPreflight.mockReturnValue(preflightPending());
    renderPanel();

    expect(
      (screen.getByRole("button", { name: "Review open request" }) as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByText("Waiting for the safety check to answer.")).toBeTruthy();
  });

  it("explains why opening is off when trading is turned off", () => {
    mockedPreflight.mockReturnValue(preflight(false));
    renderPanel();
    expect(screen.getByText("Trading is turned off, so deals cannot be opened.")).toBeTruthy();
  });

  it("says the safety check could not be reached when the preflight fails", () => {
    mockedPreflight.mockReturnValue({
      data: null,
      error: "network down",
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useExecutionPreflight>);
    renderPanel();

    expect(screen.getByText("The safety check could not be reached.")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Review open request" }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});
