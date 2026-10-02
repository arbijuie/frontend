import { fireEvent, render, screen } from "@testing-library/react";
import OpportunitiesPage from "./OpportunitiesPage";

const mockUseOpportunities = vi.fn();

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
  useStatus: () => ({ data: null }),
}));

vi.mock("../../hooks/useConfig", () => ({
  useConfig: () => ({ data: null }),
}));

vi.mock("../../hooks/useOpportunities", () => ({
  useOpportunities: (options?: unknown) => mockUseOpportunities(options),
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

describe("OpportunitiesPage", () => {
  beforeEach(() => {
    mockUseOpportunities.mockReset();
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
    render(<OpportunitiesPage />);

    expect(mockUseOpportunities).toHaveBeenNthCalledWith(1, { strategyTypes: undefined });
    expect(screen.getByText("strategy: all")).toBeTruthy();
  });

  it("applies selected strategy filter via hook options", () => {
    render(<OpportunitiesPage />);

    fireEvent.change(screen.getByLabelText("Filter opportunities by strategy"), {
      target: { value: "cash_and_carry" },
    });

    const lastCall = mockUseOpportunities.mock.calls[mockUseOpportunities.mock.calls.length - 1];
    expect(lastCall[0]).toEqual({ strategyTypes: ["cash_and_carry"] });
    expect(screen.getByText("strategy: cash_and_carry")).toBeTruthy();
  });
});
