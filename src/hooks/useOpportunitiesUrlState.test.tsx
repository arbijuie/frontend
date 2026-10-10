import type { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useOpportunitiesUrlState } from "./useOpportunitiesUrlState";

function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={["/?status=ready&q=aero"]}>{children}</MemoryRouter>;
}

function DefaultWrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter>;
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
