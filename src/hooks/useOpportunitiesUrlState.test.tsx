import type { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HistoryPositionProvider from "../components/HistoryPositionProvider/HistoryPositionProvider";
import { useHistoryPosition } from "./useHistoryPosition";
import { useOpportunitiesUrlState } from "./useOpportunitiesUrlState";

function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={["/?status=ready&q=aero"]}>{children}</MemoryRouter>;
}

function DefaultWrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter>;
}

function historyWrapper(initial: string) {
  return function HistoryWrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initial]}>
        <HistoryPositionProvider>{children}</HistoryPositionProvider>
      </MemoryRouter>
    );
  };
}

function renderWithHistory(initial = "/") {
  return renderHook(() => ({ url: useOpportunitiesUrlState(), position: useHistoryPosition() }), {
    wrapper: historyWrapper(initial),
  });
}

describe("useOpportunitiesUrlState", () => {
  it("reads the initial state from the URL", () => {
    const { result } = renderHook(() => useOpportunitiesUrlState(), { wrapper: Wrapper });

    expect(result.current.statusFilter).toBe("ready");
    expect(result.current.search).toBe("aero");
    expect(result.current.sortKey).toBe("priority");
  });

  it("setSortKey updates the sort key while preserving other state", () => {
    const { result } = renderHook(() => useOpportunitiesUrlState(), { wrapper: Wrapper });

    act(() => {
      result.current.setSortKey("combined_score");
    });

    expect(result.current.sortKey).toBe("combined_score");
    expect(result.current.statusFilter).toBe("ready");
    expect(result.current.search).toBe("aero");
  });

  it("resetToDefaults clears every field back to its default", () => {
    const { result } = renderHook(() => useOpportunitiesUrlState(), { wrapper: Wrapper });

    act(() => {
      result.current.resetToDefaults();
    });

    expect(result.current.statusFilter).toBe("all");
    expect(result.current.search).toBe("");
    expect(result.current.sortKey).toBe("priority");
    expect(result.current.strategyFilter).toBe("all");
  });

  it("applies two sequential updates (separate clicks) without the second clobbering the first", () => {
    const { result } = renderHook(() => useOpportunitiesUrlState(), { wrapper: Wrapper });

    act(() => {
      result.current.setSortKey("combined_score");
    });
    act(() => {
      result.current.setStrategyFilter("basis_convergence");
    });

    expect(result.current.sortKey).toBe("combined_score");
    expect(result.current.strategyFilter).toBe("basis_convergence");
  });

  it("exposes isDefault correctly before and after a change", () => {
    const { result } = renderHook(() => useOpportunitiesUrlState(), {
      wrapper: DefaultWrapper,
    });

    expect(result.current.isDefault).toBe(true);

    act(() => {
      result.current.setStatusFilter("ready");
    });

    expect(result.current.isDefault).toBe(false);
  });
});

describe("useOpportunitiesUrlState history", () => {
  it("adds a history entry when a filter changes", () => {
    const { result } = renderWithHistory();

    act(() => result.current.url.setStatusFilter("ready"));

    expect(result.current.url.statusFilter).toBe("ready");
    expect(result.current.position.index).toBe(1);
  });

  it("replaces the current entry when the search changes", () => {
    const { result } = renderWithHistory();

    act(() => result.current.url.setSearch("btc"));

    expect(result.current.url.search).toBe("btc");
    expect(result.current.position.index).toBe(0);
  });

  it("does not add an entry when the active value is selected again", () => {
    const { result } = renderWithHistory("/?status=ready");

    act(() => result.current.url.setStatusFilter("ready"));
    act(() => result.current.url.setSortKey("priority"));
    act(() => result.current.url.setStrategyFilter("all"));

    expect(result.current.position.index).toBe(0);
  });

  it("does not add an entry when resetting at defaults", () => {
    const { result } = renderWithHistory();

    act(() => result.current.url.resetToDefaults());

    expect(result.current.position.index).toBe(0);
  });

  it("adds one entry when resetting from a changed state", () => {
    const { result } = renderWithHistory("/?status=ready");

    act(() => result.current.url.resetToDefaults());

    expect(result.current.url.statusFilter).toBe("all");
    expect(result.current.position.index).toBe(1);
  });
});
