import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./OnboardingPage";
import { SIGNAL_POLL_MS } from "../../lib/onboarding";

const API = "http://api.test";

vi.mock("../../api/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/config")>()),
  API_URL: "http://api.test",
}));

const ALLOWED_PATHS = new Set(["/healthz", "/public/status", "/public/opportunities"]);

type Reply =
  "network" | { status?: number; body?: unknown; text?: string; headers?: Record<string, string> };

/** Fetch stub keyed by API path. A list of replies is served in order; the last one repeats. */
function mockFetch(routes: Record<string, Reply | Reply[]>) {
  const queues = new Map(
    Object.entries(routes).map(([path, reply]) => [
      path,
      Array.isArray(reply) ? [...reply] : [reply],
    ])
  );
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    const queue = queues.get(url.startsWith(API) ? url.slice(API.length) : url);
    if (!queue) {
      return new Response(JSON.stringify({ detail: "not mocked" }), { status: 404 });
    }
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    if (reply === "network") throw new TypeError("Failed to fetch");
    return new Response(reply.text ?? JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { "Content-Type": "application/json", ...reply.headers },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function callsTo(fetchMock: ReturnType<typeof mockFetch>, path: string) {
  return fetchMock.mock.calls.filter(([input]) => String(input) === `${API}${path}`).length;
}

const isoSecondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString();

const healthz = { body: { ok: true, started_at: isoSecondsAgo(10_920), uptime_s: 10_920 } };

const live = { last_poll_ok: true, ws_connected: true, ws_healthy: true };

function statusReply(overrides: Record<string, unknown> = {}): Reply {
  return {
    body: {
      started_at: isoSecondsAgo(600),
      uptime_s: 600,
      last_updated_at: isoSecondsAgo(5),
      poll_count_total: 12,
      poll_count_success: 12,
      poll_count_failed: 0,
      active_exchanges: ["hyperliquid", "lighter"],
      exchanges: { hyperliquid: live, lighter: live },
      screener_raw_candidates: 10,
      screener_post_cost_candidates: 6,
      screener_validated_candidates: 4,
      screener_ready_candidates: 2,
      ...overrides,
    },
  };
}

function opportunitiesReply(overrides: Record<string, unknown> = {}): Reply {
  return {
    body: {
      count: 4,
      ready_count: 2,
      updated_at: isoSecondsAgo(5),
      opportunities: [],
      ...overrides,
    },
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/onboarding"]}>
        <OnboardingPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const stepItems = () =>
  within(screen.getByRole("list", { name: "Onboarding progress" })).getAllByRole("listitem");

const stepHeading = (name: string) => screen.getByRole("heading", { level: 2, name });

const nextButton = () => screen.getByRole("button", { name: /^(Next|Continue anyway)$/ });

async function goToStep(index: number) {
  for (let step = 0; step < index; step += 1) {
    await waitFor(() => expect(nextButton().getAttribute("aria-disabled")).toBeNull());
    fireEvent.click(nextButton());
  }
}

describe("OnboardingPage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("step 1: prerequisites", () => {
    it("passes once /healthz answers and reads nothing else", async () => {
      const fetchMock = mockFetch({ "/healthz": healthz });
      renderPage();

      expect(screen.getByRole("heading", { level: 1, name: "Onboarding" })).toBeTruthy();
      expect(document.title).toBe("Onboarding · Arbijuie");
      expect(stepHeading("Prerequisites")).toBeTruthy();
      expect(screen.getByText(API)).toBeTruthy();

      expect(await screen.findByText("Running for 3 h 2 min.")).toBeTruthy();
      expect(screen.getByText("All checks passed.")).toBeTruthy();
      const [first, second, third] = stepItems();
      expect(first.getAttribute("aria-current")).toBe("step");
      expect(within(first).getByText("Passed")).toBeTruthy();
      expect(within(second).getByText("Not started")).toBeTruthy();
      expect(within(third).getByText("Not started")).toBeTruthy();
      expect(nextButton().textContent).toBe("Next");
      expect(nextButton().getAttribute("aria-disabled")).toBeNull();
      expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([`${API}/healthz`]);
    });

    it("explains an unreachable API and does not let the user continue", async () => {
      mockFetch({ "/healthz": "network" });
      renderPage();

      expect(await screen.findByText("The API cannot be reached")).toBeTruthy();
      expect(screen.getByText(/Nothing answered at http:\/\/api\.test/)).toBeTruthy();
      expect(within(stepItems()[0]).getByText("Needs attention")).toBeTruthy();
      expect(nextButton().textContent).toBe("Next");
      expect(nextButton().getAttribute("aria-disabled")).toBe("true");
      expect(screen.getByText(/Fix the problem above/)).toBeTruthy();

      fireEvent.click(nextButton());
      expect(stepHeading("Prerequisites")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Continue anyway" })).toBeNull();
    });

    it("blocks while the device reports that it is offline", async () => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      mockFetch({ "/healthz": healthz });
      renderPage();

      expect(await screen.findByText("Your device is offline")).toBeTruthy();
      await screen.findByText("Running for 3 h 2 min.");
      expect(nextButton().getAttribute("aria-disabled")).toBe("true");
    });

    it("accepts the plain-text health answer of the public proxy", async () => {
      mockFetch({ "/healthz": { text: "ok\n", headers: { "Content-Type": "text/plain" } } });
      renderPage();

      expect(
        await screen.findByText("This host does not report how long the API has been running.")
      ).toBeTruthy();
      expect(nextButton().textContent).toBe("Next");
    });

    it("treats a hidden health check as a warning the user can continue past", async () => {
      mockFetch({ "/healthz": { status: 404 }, "/public/status": statusReply() });
      renderPage();

      expect(await screen.findByText("This host does not expose the health check")).toBeTruthy();
      expect(within(stepItems()[0]).getByText("Passed with warnings")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Continue anyway" }));
      expect(stepHeading("Access and connectivity")).toBeTruthy();
    });
  });

  describe("step 2: access and connectivity", () => {
    it("passes when the public channel is open and every venue streams live", async () => {
      mockFetch({ "/healthz": healthz, "/public/status": statusReply() });
      renderPage();
      await goToStep(1);

      expect(await screen.findByText("Public data is readable.")).toBeTruthy();
      expect(screen.getByText("All 2 venues stream live.")).toBeTruthy();
      const venues = within(screen.getByRole("list", { name: "Venues" }));
      expect(venues.getByText("Hyperliquid")).toBeTruthy();
      expect(venues.getAllByText("Live stream")).toHaveLength(2);
      expect(nextButton().textContent).toBe("Next");
      // The page explains why it needs no WebSocket ticket.
      expect(screen.getByText("Live streaming and tickets")).toBeTruthy();
    });

    it("shows the WS degraded fallback when venues run on REST", async () => {
      mockFetch({
        "/healthz": healthz,
        "/public/status": statusReply({
          active_exchanges: ["hyperliquid", "lighter", "bybit"],
          exchanges: {
            hyperliquid: live,
            lighter: { last_poll_ok: true, ws_connected: true, ws_healthy: false },
            bybit: { last_poll_ok: false, ws_connected: false, ws_healthy: false },
          },
        }),
      });
      renderPage();
      await goToStep(1);

      expect(
        await screen.findByText("Live stream degraded: 1 of 3 venues on REST fallback")
      ).toBeTruthy();
      expect(screen.getByText(/Market data still flows/)).toBeTruthy();
      expect(screen.getByText(/1 venue is unavailable/)).toBeTruthy();
      const venues = within(screen.getByRole("list", { name: "Venues" }));
      expect(venues.getByText("REST fallback")).toBeTruthy();
      expect(venues.getByText("Unavailable")).toBeTruthy();
      expect(within(stepItems()[1]).getByText("Passed with warnings")).toBeTruthy();
      expect(nextButton().textContent).toBe("Continue anyway");
      expect(nextButton().getAttribute("aria-disabled")).toBeNull();
    });

    it("needs attention but can continue when no venue has reported yet", async () => {
      mockFetch({
        "/healthz": healthz,
        "/public/status": statusReply({ active_exchanges: [], exchanges: {} }),
      });
      renderPage();
      await goToStep(1);

      expect(await screen.findByText("No venue has reported yet")).toBeTruthy();
      expect(within(stepItems()[1]).getByText("Needs attention")).toBeTruthy();
      expect(nextButton().textContent).toBe("Continue anyway");
    });

    it.each([401, 403])(
      "explains the auth failure (%i) without asking for credentials",
      async (status) => {
        mockFetch({ "/healthz": healthz, "/public/status": { status } });
        renderPage();
        await goToStep(1);

        expect(await screen.findByText("The public channel is closed")).toBeTruthy();
        const detail = screen.getByText(/only shares data with signed-in operators/);
        expect(detail.textContent).toContain(`HTTP ${status}`);
        expect(detail.textContent).toContain("Telegram Mini App");
        expect(detail.textContent).toContain("API token");
        expect(screen.queryByRole("textbox")).toBeNull();
        expect(screen.getByText("Checked once the public status can be read.")).toBeTruthy();
        expect(nextButton().getAttribute("aria-disabled")).toBe("true");
      }
    );

    it("explains a network failure while reading the public status", async () => {
      mockFetch({ "/healthz": healthz, "/public/status": "network" });
      renderPage();
      await goToStep(1);

      expect(await screen.findByText("The API cannot be reached")).toBeTruthy();
      expect(nextButton().getAttribute("aria-disabled")).toBe("true");
    });

    it("shows the rate-limit fallback and locks the retry until Retry-After passes", async () => {
      const fetchMock = mockFetch({
        "/healthz": healthz,
        "/public/status": { status: 429, headers: { "Retry-After": "30" } },
      });
      renderPage();
      await goToStep(1);

      expect(await screen.findByText("Too many requests")).toBeTruthy();
      expect(screen.getByText(/asked to wait 30 s/)).toBeTruthy();
      expect(screen.getByText(/Rate-limited: available in (29|30) s/)).toBeTruthy();
      const retry = screen.getByRole("button", { name: "Run checks again" });
      expect(retry.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(retry);
      expect(callsTo(fetchMock, "/public/status")).toBe(1);
      expect(nextButton().getAttribute("aria-disabled")).toBe("true");
    });

    it("unlocks the retry when the rate-limit wait ends and recovers", async () => {
      const fetchMock = mockFetch({
        "/healthz": healthz,
        "/public/status": [{ status: 429, headers: { "Retry-After": "1" } }, statusReply()],
      });
      renderPage();
      await goToStep(1);

      await screen.findByText("Too many requests");
      const retry = screen.getByRole("button", { name: "Run checks again" });
      expect(retry.getAttribute("aria-disabled")).toBe("true");
      await waitFor(() => expect(retry.getAttribute("aria-disabled")).toBeNull(), {
        timeout: 3000,
      });
      fireEvent.click(retry);

      expect(await screen.findByText("Public data is readable.")).toBeTruthy();
      expect(callsTo(fetchMock, "/public/status")).toBe(2);
    });
  });

  describe("step 3: first runtime signal", () => {
    it("polls while waiting for the first screener pass and stops once a signal is seen", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const fetchMock = mockFetch({
        "/healthz": healthz,
        "/public/status": [
          statusReply({ poll_count_success: 0, poll_count_total: 0, last_updated_at: null }),
          statusReply({ poll_count_success: 3, poll_count_total: 3 }),
        ],
        "/public/opportunities": [
          opportunitiesReply({ count: 0, ready_count: 0, updated_at: null }),
          opportunitiesReply(),
        ],
      });
      renderPage();
      await goToStep(2);

      expect(await screen.findByText("Waiting for the first screener pass.")).toBeTruthy();
      expect(screen.getByText(/Checking again every 5 seconds/)).toBeTruthy();
      expect(within(stepItems()[2]).getByText("Checking")).toBeTruthy();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(SIGNAL_POLL_MS + 100);
      });

      expect(
        await screen.findByText(
          "Signal observed: the screener has run 3 times; 4 routes screened, 2 ready."
        )
      ).toBeTruthy();
      expect(screen.getByText("The screener has run 3 times.")).toBeTruthy();
      expect(screen.getByText("4 routes screened, 2 ready.")).toBeTruthy();
      expect(within(stepItems()[2]).getByText("Passed")).toBeTruthy();

      const statusCalls = callsTo(fetchMock, "/public/status");
      const opportunityCalls = callsTo(fetchMock, "/public/opportunities");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SIGNAL_POLL_MS * 3);
      });
      expect(callsTo(fetchMock, "/public/status")).toBe(statusCalls);
      expect(callsTo(fetchMock, "/public/opportunities")).toBe(opportunityCalls);
    });

    it("warns when the runtime data is stale", async () => {
      mockFetch({
        "/healthz": healthz,
        "/public/status": statusReply({ last_updated_at: isoSecondsAgo(600) }),
        "/public/opportunities": opportunitiesReply(),
      });
      renderPage();
      await goToStep(2);

      expect(await screen.findByText("Data is stale: last update 10 min ago")).toBeTruthy();
      await screen.findByText("4 routes screened, 2 ready.");
      expect(within(stepItems()[2]).getByText("Passed with warnings")).toBeTruthy();
      expect(screen.getByText(/^Passed with warnings\. Data is stale/)).toBeTruthy();
    });

    it("shows the rate-limit fallback for the screener output without Retry-After", async () => {
      mockFetch({
        "/healthz": healthz,
        "/public/status": statusReply(),
        "/public/opportunities": { status: 429 },
      });
      renderPage();
      await goToStep(2);

      expect(await screen.findByText("Too many requests")).toBeTruthy();
      expect(screen.getByText(/Wait about 10 s before the next check/)).toBeTruthy();
      expect(screen.getByText(/Rate-limited: available in (9|10) s/)).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Run checks again" }).getAttribute("aria-disabled")
      ).toBe("true");
    });
  });

  it("moves between steps with Back and Next and keeps earlier results", async () => {
    mockFetch({
      "/healthz": healthz,
      "/public/status": statusReply(),
      "/public/opportunities": opportunitiesReply(),
    });
    renderPage();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();

    await goToStep(1);
    const heading = stepHeading("Access and connectivity");
    expect(document.activeElement).toBe(heading);
    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    expect(stepItems()[1].getAttribute("aria-current")).toBe("step");
    expect(stepItems()[0].getAttribute("aria-current")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(document.activeElement).toBe(stepHeading("Prerequisites"));
    expect(within(stepItems()[0]).getByText("Passed")).toBeTruthy();

    await goToStep(2);
    expect(stepHeading("First runtime signal")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^(Next|Continue anyway)$/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Public statistics" }).getAttribute("href")).toBe(
      "/statistics"
    );
    expect(screen.getByRole("link", { name: "Daily journal" }).getAttribute("href")).toBe(
      "/journal"
    );
    expect(screen.getByRole("link", { name: "Product modes" }).getAttribute("href")).toBe(
      "/product"
    );
  });

  it("only sends GET requests to /healthz, /public/status and /public/opportunities", async () => {
    const fetchMock = mockFetch({
      "/healthz": healthz,
      "/public/status": statusReply(),
      "/public/opportunities": opportunitiesReply(),
    });
    renderPage();

    await goToStep(1);
    fireEvent.click(await screen.findByRole("button", { name: "Run checks again" }));
    await goToStep(1);
    await screen.findByText(/^Signal observed/);
    fireEvent.click(screen.getByRole("button", { name: "Run checks again" }));
    await waitFor(() => expect(callsTo(fetchMock, "/public/opportunities")).toBe(2));

    const requests = fetchMock.mock.calls.map(([input, init]) => ({
      url: String(input),
      method: (init?.method ?? "GET").toUpperCase(),
    }));
    for (const path of ALLOWED_PATHS) {
      expect(requests.some(({ url }) => url === `${API}${path}`)).toBe(true);
    }
    for (const { url, method } of requests) {
      expect(method).toBe("GET");
      expect(url.startsWith(API)).toBe(true);
      expect(ALLOWED_PATHS.has(url.slice(API.length))).toBe(true);
    }
  });
});
