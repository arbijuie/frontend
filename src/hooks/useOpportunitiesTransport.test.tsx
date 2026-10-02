import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { useOpportunitiesTransport } from "./useOpportunitiesTransport";
import { OpportunitiesTransportContext } from "../lib/opportunitiesTransportContext";
import { makeTransport } from "../test-utils/transport-fixture";

describe("useOpportunitiesTransport", () => {
  it("throws a clear error when used outside the provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useOpportunitiesTransport())).toThrow(
      /OpportunitiesSocketProvider/
    );

    consoleError.mockRestore();
  });

  it("returns the value supplied by the provider", () => {
    const value = makeTransport({ transportState: "connected" });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <OpportunitiesTransportContext.Provider value={value}>
        {children}
      </OpportunitiesTransportContext.Provider>
    );

    const { result } = renderHook(() => useOpportunitiesTransport(), { wrapper });

    expect(result.current).toBe(value);
  });
});
