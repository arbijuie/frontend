import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JournalPage from "./JournalPage";
import { PublicApiError } from "../../api/public";
import { usePublicJournal } from "../../hooks/usePublicData";

vi.mock("../../hooks/usePublicData", () => ({
  usePublicJournal: vi.fn(),
}));

const mockedJournal = vi.mocked(usePublicJournal);

function result<T>(data: T | null, error: PublicApiError | null = null) {
  return {
    data,
    error,
    loading: false,
    fetching: false,
    refetch: vi.fn(),
    fetchedAt: 0,
  } as never;
}

const counters = (snapshots: number, ready: number, median: number | null) => ({
  snapshots,
  distinct_routes: 40,
  distinct_symbols: 12,
  ready_observations: ready,
  distinct_ready_routes: 3,
  median_ready_score_bps: median,
  ready_by_strategy: ready > 0 ? { funding_arbitrage: ready } : {},
});

const journal = {
  capture_enabled: true,
  window_days: 14,
  window_start: "2026-09-27T00:00:00+00:00",
  generated_at: "2026-10-10T12:00:00+00:00",
  first_snapshot_at: "2026-10-09T00:00:00+00:00",
  last_snapshot_at: "2026-10-10T11:00:00+00:00",
  totals: counters(3000, 90, 9.25),
  days: [
    { day: "2026-10-10", ...counters(1200, 60, 9.8) },
    { day: "2026-10-09", ...counters(1800, 30, null) },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <JournalPage />
    </MemoryRouter>
  );
}

describe("JournalPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedJournal.mockReturnValue(result(journal));
  });

  it("summarises the window and lists each day newest first", () => {
    renderPage();

    expect(screen.getByText("3,000")).toBeTruthy();
    expect(screen.getByText("9.3 bps")).toBeTruthy();
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("Sat, Oct 10");
    expect(rows[0].textContent).toContain("Funding arbitrage 60");
    expect(rows[1].textContent).toContain("—");
  });

  it("charts ready observations per day with values as text", () => {
    renderPage();

    const chart = within(screen.getByRole("list", { name: "Ready observations per day" }));
    expect(chart.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Sat, Oct 1060",
      "Fri, Oct 930",
    ]);
  });

  it("requests a different window from the picker", () => {
    renderPage();
    expect(mockedJournal).toHaveBeenLastCalledWith(14);

    const button = screen.getByRole("button", { name: "30 days" });
    fireEvent.click(button);

    expect(mockedJournal).toHaveBeenLastCalledWith(30);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("explains when capture is off", () => {
    mockedJournal.mockReturnValue(result({ ...journal, capture_enabled: false, days: [] }));
    renderPage();

    expect(screen.getByText("History collection is off on this deployment")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("explains an empty window", () => {
    mockedJournal.mockReturnValue(result({ ...journal, days: [] }));
    renderPage();

    expect(screen.getByText("No history in the last 14 days yet")).toBeTruthy();
  });

  it("explains rate limiting with the wait time", () => {
    mockedJournal.mockReturnValue(result(null, new PublicApiError("/public/journal", 429, 20)));
    renderPage();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Too many requests");
    expect(alert.textContent).toContain("Try again in 20 s.");
  });
});
