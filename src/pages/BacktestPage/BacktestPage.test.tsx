import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BacktestPage from "./BacktestPage";
import {
  useBacktestSummary,
  useBacktestGate,
  useBacktestLocks,
  useBacktestLock,
  useRunBacktestReplay,
  useCreateBacktestLock,
} from "../../hooks/useBacktest";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("../../hooks/useBacktest", () => ({
  useBacktestSummary: vi.fn(),
  useBacktestGate: vi.fn(),
  useBacktestLocks: vi.fn(),
  useBacktestLock: vi.fn(),
  useRunBacktestReplay: vi.fn(),
  useCreateBacktestLock: vi.fn(),
}));

const mockedUseBacktestSummary = vi.mocked(useBacktestSummary);
const mockedUseBacktestGate = vi.mocked(useBacktestGate);
const mockedUseBacktestLocks = vi.mocked(useBacktestLocks);
const mockedUseBacktestLock = vi.mocked(useBacktestLock);
const mockedUseRunBacktestReplay = vi.mocked(useRunBacktestReplay);
const mockedUseCreateBacktestLock = vi.mocked(useCreateBacktestLock);

function renderBacktestPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BacktestPage />
    </QueryClientProvider>
  );
}

const mockSummary = {
  total_snapshots: 100,
  symbols_covered: 5,
  first_snapshot_at: "2026-08-01T00:00:00Z",
  last_snapshot_at: "2026-09-01T00:00:00Z",
};

const mockGate = {
  passed: false,
  reason: "No passing strategy lock yet",
  strategy_id: null,
  strategy_profile_id: null,
  lock_id: null,
};

const mockMetrics = {
  total_samples: 50,
  symbols_covered: 3,
  entries: 10,
  exits: 10,
  closed_trades: 10,
  win_rate: 0.6,
  wins: 6,
  total_pnl_bps: 120,
  median_trade_pnl_bps: 15,
  max_drawdown_bps: 30,
  strategy_id: "baseline-v1",
  exit_reasons: { funding_decay: 6, time_stop: 4 },
};

const mockLock = {
  schema_version: 1,
  lock_id: "baseline-v1-123",
  created_at: "2026-09-08T00:00:00Z",
  strategy_profile_id: "baseline-v1",
  strategy_id: "baseline-v1",
  metrics: mockMetrics,
  min_win_rate: 0.55,
  min_total_pnl_bps: 0,
  max_drawdown_bps: 50,
  gate_passed: true,
};

const mockLockListItem = {
  lock_id: "baseline-v1-123",
  created_at: "2026-09-08T00:00:00Z",
  strategy_id: "baseline-v1",
  strategy_profile_id: "baseline-v1",
  gate_passed: true,
  total_pnl_bps: 120,
  max_drawdown_bps: 50,
};

describe("BacktestPage", () => {
  const refetchSummary = vi.fn();
  const refetchGate = vi.fn();
  const runReplayMutateAsync = vi.fn();
  const createLockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    mockedUseBacktestSummary.mockReturnValue({
      data: mockSummary,
      error: null,
      loading: false,
      fetching: false,
      refetch: refetchSummary,
    });
    mockedUseBacktestGate.mockReturnValue({
      data: mockGate,
      error: null,
      loading: false,
      refetch: refetchGate,
    });
    mockedUseBacktestLocks.mockReturnValue({
      data: { count: 1, items: [mockLockListItem] },
      error: null,
      loading: false,
    });
    mockedUseBacktestLock.mockReturnValue({
      data: mockLock,
      error: null,
      loading: false,
    });
    mockedUseRunBacktestReplay.mockReturnValue({
      mutateAsync: runReplayMutateAsync,
      isPending: false,
    } as never);
    mockedUseCreateBacktestLock.mockReturnValue({
      mutateAsync: createLockMutateAsync,
      isPending: false,
    } as never);
  });

  it("loads summary on the Summary tab", () => {
    renderBacktestPage();
    expect(screen.getByText("100")).not.toBeNull();
  });

  it("sets the document title", () => {
    renderBacktestPage();
    expect(document.title).toBe("Backtest · Arbijuie");
  });

  it("shows a hint when there are no snapshots yet", () => {
    mockedUseBacktestSummary.mockReturnValue({
      data: { ...mockSummary, total_snapshots: 0 },
      error: null,
      loading: false,
      fetching: false,
      refetch: refetchSummary,
    });
    renderBacktestPage();
    expect(screen.getByText(/no snapshot data captured yet/i)).not.toBeNull();
  });

  it("happy path: replay -> shows used params -> create lock -> hint shown", async () => {
    runReplayMutateAsync.mockResolvedValue({ metrics: mockMetrics });
    createLockMutateAsync.mockResolvedValue(mockLock);

    renderBacktestPage();
    fireEvent.click(screen.getByRole("tab", { name: /^replay$/i }));

    fireEvent.change(screen.getByLabelText(/symbols/i), { target: { value: "AERO" } });
    fireEvent.click(screen.getByRole("button", { name: /run replay/i }));

    await waitFor(() => expect(runReplayMutateAsync).toHaveBeenCalled());
    expect(screen.getByText(/symbols: aero/i)).not.toBeNull();

    fireEvent.click(await screen.findByRole("button", { name: /create strategy lock/i }));

    await waitFor(() => expect(createLockMutateAsync).toHaveBeenCalled());
    expect(await screen.findByText(/lock created/i)).not.toBeNull();
  });

  it("shows exit reasons after a successful replay", async () => {
    runReplayMutateAsync.mockResolvedValue({ metrics: mockMetrics });

    renderBacktestPage();
    fireEvent.click(screen.getByRole("tab", { name: /^replay$/i }));
    fireEvent.click(screen.getByRole("button", { name: /run replay/i }));

    await waitFor(() => expect(runReplayMutateAsync).toHaveBeenCalled());
    expect(await screen.findByText("funding_decay")).not.toBeNull();
    expect(await screen.findByText("time_stop")).not.toBeNull();
  });

  it("error path: 422 shows field-aware error message", async () => {
    const { ApiValidationError } = await import("../../lib/api-errors");
    runReplayMutateAsync.mockRejectedValue(
      new ApiValidationError("Validation failed", { end: "end must be after start" })
    );

    renderBacktestPage();
    fireEvent.click(screen.getByRole("tab", { name: /^replay$/i }));
    fireEvent.click(screen.getByRole("button", { name: /run replay/i }));

    expect(await screen.findByText("end must be after start")).not.toBeNull();
  });

  it("resets the lock-created state when a new replay is run", async () => {
    runReplayMutateAsync.mockResolvedValue({ metrics: mockMetrics });
    createLockMutateAsync.mockResolvedValue(mockLock);

    renderBacktestPage();
    fireEvent.click(screen.getByRole("tab", { name: /^replay$/i }));
    fireEvent.click(screen.getByRole("button", { name: /run replay/i }));
    await waitFor(() => expect(runReplayMutateAsync).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole("button", { name: /create strategy lock/i }));
    await waitFor(() => expect(createLockMutateAsync).toHaveBeenCalled());
    expect(await screen.findByText(/lock created/i)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /run replay/i }));
    await waitFor(() => expect(runReplayMutateAsync).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: /create strategy lock/i })).not.toBeNull();
  });

  it("selecting a lock switches to the Detail tab with matching data", async () => {
    renderBacktestPage();
    fireEvent.click(screen.getByRole("tab", { name: /^locks$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /view details/i }));

    expect(await screen.findByText(mockLock.lock_id, { exact: false })).not.toBeNull();
  });

  it("Detail tab shows an empty state before any lock is selected", () => {
    renderBacktestPage();
    fireEvent.click(screen.getByRole("tab", { name: /^detail$/i }));

    expect(screen.getByText(/no lock selected/i)).not.toBeNull();
  });

  it("refresh button re-fetches summary and gate", async () => {
    renderBacktestPage();
    fireEvent.click(screen.getByRole("button", { name: /refresh backtest data/i }));

    expect(refetchSummary).toHaveBeenCalled();
    expect(refetchGate).toHaveBeenCalled();
    expect(await screen.findByText(/last refreshed/i)).not.toBeNull();
  });
});
