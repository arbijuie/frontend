import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OpportunitiesPage from "./OpportunitiesPage";

const mockUseOpportunities = vi.fn();
const mockUseStatus = vi.fn();

vi.mock("../../hooks/usePageTitle", () => ({
  usePageTitle: vi.fn(),
}));

vi.mock("../../hooks/useNow", () => ({
  useNow: () => new Date("2026-01-01T00:00:00Z"),
}));

vi.mock("../../hooks/useTransientFlag", () => ({
  useTransientFlag: () => ({ flag: false, trigger: vi.fn() }),
}));

vi.mock("../../hooks/useStatus", () => ({
  useStatus: () => mockUseStatus(),
}));

vi.mock("../../hooks/useConfig", () => ({
  useConfig: () => ({ data: null }),
}));

vi.mock("../../hooks/useOpportunities", () => ({
  useOpportunities: (options?: unknown) => mockUseOpportunities(options),
}));

vi.mock("../../api/config", async () => {
  const actual = await vi.importActual<typeof import("../../api/config")>("../../api/config");
  return { ...actual, API_TOKEN: "" };
});

vi.mock("../../api/telegram-session", () => ({
  hasTelegramWebAppContext: vi.fn(() => false),
}));

vi.mock("../../api/opportunities", () => ({
  OPPORTUNITY_STRATEGY_TYPES: ["cash_and_carry", "basis_convergence"],
  OPPORTUNITY_STRATEGY_LABEL: {
    cash_and_carry: "Cash and carry",
    basis_convergence: "Basis convergence",
  },
}));
vi.mock("../../components/StatsGrid/StatsGrid", () => ({
  default: () => <div data-testid="stats-grid" />,
}));

vi.mock("../../components/OpportunitiesList/OpportunitiesList", () => ({
  default: () => <div data-testid="opportunities-list" />,
}));

vi.mock("../../components/OpportunityCardSkeleton/OpportunityCardSkeleton", () => ({
  default: () => <div data-testid="skeleton" />,
}));

vi.mock("../../components/EmptyState/EmptyState", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("../../components/FloatingRefreshButton/FloatingRefreshButton", () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} aria-label="Refresh opportunities">
      Refresh opportunities
    </button>
  ),
}));

vi.mock("../../components/RuntimeKnobsCard/RuntimeKnobsCard", () => ({
  default: () => <div data-testid="runtime-knobs" />,
}));

vi.mock("../../components/PipelineDiagnosticsHint/PipelineDiagnosticsHint", () => ({
  default: () => <div data-testid="pipeline-hint" />,
}));

vi.mock("../../components/TransportIndicator/TransportIndicator", () => ({
  default: () => <div data-testid="transport-indicator" />,
}));

function renderPage(initialUrl = "/") {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <OpportunitiesPage />
    </MemoryRouter>
  );
}

describe("OpportunitiesPage", () => {
  beforeEach(() => {
    mockUseOpportunities.mockReset();
    mockUseStatus.mockReset();
    mockUseStatus.mockReturnValue({ data: null });
    mockUseOpportunities.mockReturnValue({
      data: {
        count: 1,
        ready_count: 1,
        updated_at: "2026-01-01T00:00:00Z",
        opportunities: [{}],
      },
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
      transportState: "connected",
      reconnectAttempt: 0,
      authRetryAttempt: 0,
      authStatus: "ok",
      authRetryAfterSeconds: null,
      authDetail: null,
      retryConnection: vi.fn(),
    });
  });

  it("uses unfiltered opportunities by default", () => {
    renderPage();

    expect(mockUseOpportunities).toHaveBeenNthCalledWith(1, { strategyTypes: undefined });
    expect(screen.getByText("strategy: all")).toBeTruthy();
  });

  it("applies selected strategy filter via hook options", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Filter opportunities by strategy"), {
      target: { value: "cash_and_carry" },
    });

    const lastCall = mockUseOpportunities.mock.calls[mockUseOpportunities.mock.calls.length - 1];
    expect(lastCall[0]).toEqual({ strategyTypes: ["cash_and_carry"] });
    expect(screen.getByText("strategy: cash_and_carry")).toBeTruthy();
  });

  it("restores the strategy filter from the URL on load", () => {
    renderPage("/?strategy=basis_convergence");

    expect(mockUseOpportunities).toHaveBeenNthCalledWith(1, {
      strategyTypes: ["basis_convergence"],
    });
    expect(screen.getByText("strategy: basis_convergence")).toBeTruthy();
  });

  it("does not show the Reset filters button when nothing has changed", () => {
    renderPage();

    expect(screen.queryByRole("button", { name: /reset filters/i })).toBeNull();
  });

  it("shows Reset filters once a filter changes, and clears it back to defaults on click", () => {
    renderPage("/?strategy=basis_convergence");

    expect(screen.getByRole("button", { name: /reset filters/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /reset filters/i }));

    expect(screen.getByText("strategy: all")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /reset filters/i })).toBeNull();
  });

  it("shows Telegram launch hint on 401 when no runtime auth context is present", () => {
    mockUseOpportunities.mockReturnValue({
      data: null,
      error: "GET /opportunities failed: 401",
      loading: false,
      fetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
      transportState: "disconnected",
      reconnectAttempt: 0,
      authRetryAttempt: 0,
      authStatus: "failed",
      authRetryAfterSeconds: null,
      authDetail: null,
      retryConnection: vi.fn(),
    });

    renderPage();

    expect(screen.getByText(/requires Telegram session auth/i)).toBeTruthy();
  });

  it("does not show Telegram launch hint on non-401 errors", () => {
    mockUseOpportunities.mockReturnValue({
      data: null,
      error: "GET /opportunities failed: 500",
      loading: false,
      fetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
      transportState: "disconnected",
      reconnectAttempt: 0,
      authRetryAttempt: 0,
      authStatus: "failed",
      authRetryAfterSeconds: null,
      authDetail: null,
      retryConnection: vi.fn(),
    });

    renderPage();

    expect(screen.queryByText(/requires Telegram session auth/i)).toBeNull();
  });

  it("shows active runtime strategy summary when status strategy counters are present", () => {
    mockUseStatus.mockReturnValue({
      data: {
        screener_drop_counters_by_strategy: {
          cash_and_carry: { raw_candidates: 0 },
          basis_convergence: { raw_candidates: 0 },
        },
      },
    });

    renderPage();

    expect(screen.getByText("runtime strategies: Cash and carry, Basis convergence")).toBeTruthy();
  });

  it("warns when selected strategy is not active in runtime", () => {
    mockUseStatus.mockReturnValue({
      data: {
        screener_drop_counters_by_strategy: {
          cash_and_carry: { raw_candidates: 0 },
        },
      },
    });
    mockUseOpportunities.mockReturnValue({
      data: {
        count: 0,
        ready_count: 0,
        updated_at: "2026-01-01T00:00:00Z",
        opportunities: [],
      },
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
      transportState: "connected",
      reconnectAttempt: 0,
      authRetryAttempt: 0,
      authStatus: "ok",
      authRetryAfterSeconds: null,
      authDetail: null,
      retryConnection: vi.fn(),
    });

    renderPage("/?strategy=basis_convergence");

    expect(screen.getByText(/Selected strategy is not active in runtime/i)).toBeTruthy();
  });
});
