import { tradingOpenGate } from "./tradingOpenGate";

describe("tradingOpenGate", () => {
  const readyStatus = {
    execution_entries_stopped: false,
    stop_trading: { state: "running" as const },
    vooi_route: { enabled: true, state: "ready" as const },
  };

  it("allows open when execution and route are healthy", () => {
    expect(
      tradingOpenGate({ status: readyStatus as never, execEnabled: true }).allowed
    ).toBe(true);
  });

  it("blocks when exec is off", () => {
    const gate = tradingOpenGate({ status: readyStatus as never, execEnabled: false });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toBe("execution_disabled");
  });

  it("blocks when stop-trading is latched", () => {
    const gate = tradingOpenGate({
      status: { ...readyStatus, stop_trading: { state: "stopped" } } as never,
      execEnabled: true,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toBe("stop_trading_latched");
  });

  it("blocks when VOOI route is degraded", () => {
    const gate = tradingOpenGate({
      status: {
        ...readyStatus,
        vooi_route: { enabled: true, state: "degraded" },
      } as never,
      execEnabled: true,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toBe("vooi_route_unavailable");
  });
});
