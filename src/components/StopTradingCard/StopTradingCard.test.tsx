import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StopTradingCard from "./StopTradingCard";
import type { StopTradingResponse } from "../../api/types";

type Gate = StopTradingResponse["gate"];

function makeGate(overrides: Partial<Gate> = {}): Gate {
  return {
    stopped: false,
    cooldown_s: 900,
    cooldown_elapsed: true,
    cooldown_remaining_s: 0,
    health_checks: [
      { name: "market_data_fresh", ok: true, detail: "last cycle 4s ago" },
      { name: "venue_api_errors", ok: true, detail: "all venues below the limit" },
    ],
    health_green: true,
    ack_required: false,
    acknowledged: false,
    ready: false,
    blockers: [],
    ...overrides,
  };
}

function running(overrides: Partial<StopTradingResponse> = {}): StopTradingResponse {
  return {
    checked_at: "2026-11-02T10:00:00Z",
    state: "running",
    latched_at: null,
    last_tripped_at: null,
    released_at: null,
    active: [],
    acknowledgment: null,
    gate: makeGate(),
    require_manual_ack: true,
    last_evaluated_at: "2026-11-02T10:00:00Z",
    last_hits: [],
    api_error_counts: {},
    fill_slippage_samples: [],
    data_ages_s: {},
    thresholds: {},
    restore_error: null,
    events: [],
    ...overrides,
  };
}

/** Latched by a critical trigger; `blockers` defaults to the manual acknowledgment only. */
function latched(gate: Partial<Gate> = {}, overrides: Partial<StopTradingResponse> = {}) {
  return running({
    state: "stopped",
    latched_at: "2026-11-02T09:00:00Z",
    last_tripped_at: "2026-11-02T09:30:00Z",
    active: [
      {
        trigger: "risk_breach",
        reason: "lighter margin below force-close",
        observed: 1.05,
        threshold: 1.1,
        subject: "lighter",
        critical: true,
        first_tripped_at: "2026-11-02T09:00:00Z",
        last_tripped_at: "2026-11-02T09:30:00Z",
        trips: 3,
      },
    ],
    gate: makeGate({
      stopped: true,
      ack_required: true,
      blockers: ["manual_ack_required"],
      ...gate,
    }),
    ...overrides,
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Stubs `fetch`: GET answers `state`, POST to the ack path answers `ack` (a body or a Response). */
function stubApi(state: StopTradingResponse | Response, ack?: StopTradingResponse | Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/risk/stop-trading/ack") && init?.method === "POST") {
      if (ack instanceof Response) return ack;
      return jsonResponse(ack ?? running());
    }
    if (url.endsWith("/risk/stop-trading")) {
      return state instanceof Response ? state : jsonResponse(state);
    }
    return jsonResponse({ detail: `unexpected ${url}` }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function ackCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/ack"));
}

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <StopTradingCard />
    </QueryClientProvider>
  );
  return queryClient;
}

/** Answers the next GET with `state` and refetches, like the 32 s poll would. */
async function poll(queryClient: QueryClient, state: StopTradingResponse | Response) {
  const fetchMock = stubApi(state);
  await act(async () => {
    await queryClient.refetchQueries({ queryKey: ["stop-trading"] });
    // React Query notifies its observers on the next macrotask.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return fetchMock;
}

async function reviewWithReason(reason: string) {
  fireEvent.change(
    await screen.findByLabelText("Acknowledgment reason (what you checked or fixed)"),
    { target: { value: reason } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Review acknowledgment" }));
}

describe("StopTradingCard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the running state without an acknowledgment control", async () => {
    stubApi(running({ released_at: "2026-11-01T08:00:00Z" }));

    renderCard();

    expect(await screen.findByText("Running")).toBeTruthy();
    expect(screen.getByText(/no stop-trading trigger is latched/)).toBeTruthy();
    expect(screen.getByText(/Last released/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review acknowledgment" })).toBeNull();
  });

  it("shows the latched reasons, the recovery gate, and that an ack is required", async () => {
    stubApi(latched());

    renderCard();

    expect(await screen.findByText("Stopped")).toBeTruthy();
    const triggers = screen.getByRole("list", { name: "Latched triggers" });
    expect(triggers.textContent).toContain("risk_breach");
    expect(triggers.textContent).toContain("critical");
    expect(triggers.textContent).toContain("observed 1.05, threshold 1.1");
    expect(screen.getByText("required")).toBeTruthy();
    expect(screen.getByText("blocked by manual acknowledgment")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review acknowledgment" })).toBeTruthy();
  });

  it("asks for a reason before the review step and never posts a short one", async () => {
    const fetchMock = stubApi(latched());

    renderCard();
    await reviewWithReason("ok");

    expect(screen.getByRole("alert").textContent).toContain("at least 3 characters");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(ackCalls(fetchMock)).toHaveLength(0);
  });

  it("acknowledges after the explicit confirm and shows the released state", async () => {
    const fetchMock = stubApi(latched(), running({ checked_at: "2026-11-02T10:01:00Z" }));

    renderCard();
    await reviewWithReason("  margin topped up  ");

    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("Acknowledge the stop for risk_breach?");
    expect(dialog.textContent).toContain("releases the stop at once");
    expect(ackCalls(fetchMock)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Confirm acknowledgment" }));

    expect((await screen.findByRole("status")).textContent).toContain("Stop released");
    expect(screen.getByText("Running")).toBeTruthy();
    const calls = ackCalls(fetchMock);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0][1]?.body))).toEqual({ reason: "margin topped up" });
  });

  it("keeps the stop visible when cooldown and health still block the release", async () => {
    const blockedGate: Partial<Gate> = {
      cooldown_elapsed: false,
      cooldown_remaining_s: 120,
      health_green: false,
      health_checks: [{ name: "market_data_fresh", ok: false, detail: "last cycle 400s ago" }],
    };
    const fetchMock = stubApi(
      latched({
        ...blockedGate,
        blockers: ["cooldown_pending", "health:market_data_fresh", "manual_ack_required"],
      }),
      latched(
        {
          ...blockedGate,
          acknowledged: true,
          blockers: ["cooldown_pending", "health:market_data_fresh"],
        },
        {
          checked_at: "2026-11-02T10:01:00Z",
          acknowledgment: {
            at: "2026-11-02T10:01:00Z",
            actor: "telegram:42",
            reason: "margin topped up",
            triggers: ["risk_breach"],
          },
        }
      )
    );

    renderCard();
    await reviewWithReason("margin topped up");

    expect(screen.getByRole("alertdialog").textContent).toContain(
      "stays latched until these clear: cooldown (2m left); health check market_data_fresh (last cycle 400s ago)"
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm acknowledgment" }));

    const outcome = await screen.findByRole("status");
    expect(outcome.textContent).toContain("Acknowledged by telegram:42, but entries stay stopped");
    expect(outcome.textContent).toContain("cooldown (2m left)");
    expect(screen.getByText("Stopped")).toBeTruthy();
    expect(screen.getByText(/given by telegram:42/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review acknowledgment" })).toBeNull();
    expect(ackCalls(fetchMock)).toHaveLength(1);
  });

  it("shows a refused acknowledgment as an alert", async () => {
    stubApi(
      latched(),
      jsonResponse(
        {
          detail: {
            code: "stop_trading_not_latched",
            message: "trading is not stopped; nothing to acknowledge",
          },
        },
        409
      )
    );

    renderCard();
    await reviewWithReason("margin topped up");
    fireEvent.click(screen.getByRole("button", { name: "Confirm acknowledgment" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Acknowledgment failed.");
    expect(alert.textContent).toContain("stop_trading_not_latched");
  });

  it("cancels the review without sending anything", async () => {
    const fetchMock = stubApi(latched());

    renderCard();
    await reviewWithReason("margin topped up");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Review acknowledgment" })).toBeTruthy();
    expect(ackCalls(fetchMock)).toHaveLength(0);
  });

  it("offers no acknowledgment when manual ack is turned off", async () => {
    stubApi(
      latched(
        {
          ack_required: false,
          blockers: ["cooldown_pending"],
          cooldown_elapsed: false,
          cooldown_remaining_s: 30,
        },
        { require_manual_ack: false }
      )
    );

    renderCard();

    expect(await screen.findByText("not needed: manual acknowledgment is turned off")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review acknowledgment" })).toBeNull();
  });

  it("says when no critical trigger is latched", async () => {
    stubApi(latched({ ack_required: false, blockers: [], ready: true }));

    renderCard();

    expect(await screen.findByText("not needed: no critical trigger is latched")).toBeTruthy();
    expect(
      screen.getByText(
        "passed: the runtime releases the stop on its next pass while execution is enabled"
      )
    ).toBeTruthy();
  });

  it("keeps the last answer on screen but flags a failed refresh", async () => {
    stubApi(latched());

    const queryClient = renderCard();
    expect(await screen.findByText("Stopped")).toBeTruthy();
    await poll(queryClient, jsonResponse({ detail: "upstream timeout" }, 503));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not refresh the latch state"
    );
    expect(screen.getByText("Stopped")).toBeTruthy();
  });

  it("drops an open review when the stop is released and a new one latches", async () => {
    const fetchMock = stubApi(latched());

    const queryClient = renderCard();
    await reviewWithReason("margin topped up");
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    await poll(queryClient, running({ checked_at: "2026-11-02T10:05:00Z" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    const relatched = await poll(
      queryClient,
      latched({}, { checked_at: "2026-11-02T10:10:00Z", latched_at: "2026-11-02T10:09:00Z" })
    );

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Review acknowledgment" })).toBeTruthy();
    expect(ackCalls(fetchMock)).toHaveLength(0);
    expect(ackCalls(relatched)).toHaveLength(0);
  });

  it("warns when the saved latch could not be restored", async () => {
    stubApi(running({ restore_error: "OperationalError: database is locked" }));

    renderCard();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "could not be restored at startup (OperationalError: database is locked)"
    );
  });

  it("shows an alert when the latch state cannot be read", async () => {
    stubApi(jsonResponse({ detail: "Not authenticated" }, 401));

    renderCard();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Stop-trading state is unavailable.");
    expect(alert.textContent).toContain("Not authorized");
  });
});
