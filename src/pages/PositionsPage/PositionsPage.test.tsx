import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PositionsPage from "./PositionsPage";
import type { PositionsResponse, DailyPnlResponse } from "../../api/types";

const mockCloseMutateAsync = vi.fn();
let mockPositionsData: PositionsResponse | undefined = undefined;
let mockDailyPnlData: DailyPnlResponse | undefined = undefined;

vi.mock("../../hooks/useOperations", () => ({
  usePositions: () => ({
    data: mockPositionsData,
    loading: false,
    fetching: false,
    error: null,
    errorObject: null,
    refetch: vi.fn(),
  }),
  useDailyPnl: () => ({
    data: mockDailyPnlData,
    loading: false,
    fetching: false,
    error: null,
  }),
  useExecutionClose: () => ({
    mutateAsync: mockCloseMutateAsync,
    isPending: false,
  }),
}));

function makePosition(overrides: Record<string, unknown> = {}) {
  return {
    attempt_id: "att-pos-1",
    symbol: "BTC",
    long_exchange: "binance",
    short_exchange: "hyperliquid",
    status: "open",
    dry_run: true,
    notional_usd: 2500,
    net_pnl_usd: 35.5,
    funding_accrued_usd: 42.0,
    net_funding_apr: 24.5,
    opened_at: new Date(Date.now() - 3600000).toISOString(),
    venue_accounts: [],
    ...overrides,
  };
}

function setPositions(positions: unknown[]) {
  mockPositionsData = {
    positions,
    notional_usd: 2500,
    net_pnl_usd: 35.5,
    funding_accrued_usd: 42.0,
  } as unknown as PositionsResponse;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PositionsPage />
    </MemoryRouter>
  );
}

describe("PositionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDailyPnlData = {
      days: [],
      realized_pnl_usd: 12.5,
      funding_pnl_usd: 40,
      total_pnl_usd: 99,
    } as unknown as DailyPnlResponse;
  });

  it("renders empty state when there are no active positions", () => {
    mockPositionsData = {
      positions: [],
      notional_usd: 0,
      net_pnl_usd: 0,
      funding_accrued_usd: 0,
    } as unknown as PositionsResponse;

    renderPage();

    expect(screen.getByRole("heading", { name: "My Positions" })).toBeTruthy();
    expect(screen.getByText("No active positions")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Explore deals/ })).toBeTruthy();
  });

  it("renders open positions list with metrics and closes after confirming in the dialog", async () => {
    setPositions([makePosition()]);

    renderPage();

    expect(screen.getByText("Open Arbitrage Positions (1)")).toBeTruthy();
    expect(screen.getByText("BTC")).toBeTruthy();
    expect(screen.getByText("+24.50%")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close position" }));
    expect(mockCloseMutateAsync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close both legs" }));

    await waitFor(() => {
      expect(mockCloseMutateAsync).toHaveBeenCalledWith({
        attempt_id: "att-pos-1",
        reason: "trader manual close",
      });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not close the position when the trader keeps it open", () => {
    setPositions([makePosition()]);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Close position" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep open" }));

    expect(mockCloseMutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not close the position when the dialog is dismissed with Escape", () => {
    setPositions([makePosition()]);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Close position" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockCloseMutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves the focus to the page heading after the close is confirmed", async () => {
    setPositions([makePosition()]);
    mockCloseMutateAsync.mockImplementation(() => new Promise(() => {}));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Close position" }));
    fireEvent.click(screen.getByRole("button", { name: "Close both legs" }));

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "My Positions" }));
    });
  });

  it("mentions real money in the dialog only outside practice mode", () => {
    setPositions([makePosition()]);
    const { unmount } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Close position" }));
    expect(screen.queryByText(/use real money/)).toBeNull();
    unmount();

    setPositions([makePosition({ dry_run: false })]);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Close position" }));
    expect(screen.getByText(/use real money/)).toBeTruthy();
  });

  it("shows the realized PnL and not the total PnL in the 7d card", () => {
    setPositions([makePosition()]);
    renderPage();
    expect(screen.getByText(/12\.50/)).toBeTruthy();
    expect(screen.queryByText(/99\.00/)).toBeNull();
  });

  it("shows a dash in the 7d card while the daily PnL is missing", () => {
    setPositions([makePosition()]);
    mockDailyPnlData = undefined;
    renderPage();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("keeps the minus sign for a negative net APR", () => {
    setPositions([makePosition({ net_funding_apr: -4.2 })]);
    renderPage();
    expect(screen.getByText("-4.20%")).toBeTruthy();
    expect(screen.queryByText("+-4.20%")).toBeNull();
  });

  it("does not add a plus sign to a negative funding income", () => {
    setPositions([makePosition({ funding_accrued_usd: -3 })]);
    renderPage();
    expect(screen.getByText(/^-.*3\.00$/)).toBeTruthy();
    expect(screen.queryByText(/^\+.*3\.00$/)).toBeNull();
  });

  it("shows a dash when the net APR is unknown", () => {
    setPositions([makePosition({ net_funding_apr: null })]);
    renderPage();
    expect(screen.getByText("—")).toBeTruthy();
  });
});
