import { ackOutcome, describeBlocker, describeBlockers } from "./stopTrading";
import type { StopTradingResponse } from "../api/types";

type Gate = StopTradingResponse["gate"];

function gate(overrides: Partial<Gate> = {}): Gate {
  return {
    stopped: true,
    cooldown_s: 900,
    cooldown_elapsed: false,
    cooldown_remaining_s: 90,
    health_checks: [{ name: "market_data_fresh", ok: false, detail: "last cycle 400s ago" }],
    health_green: false,
    ack_required: true,
    acknowledged: false,
    ready: false,
    blockers: [],
    ...overrides,
  };
}

function answer(overrides: Partial<StopTradingResponse> = {}): StopTradingResponse {
  return {
    checked_at: "2026-11-02T10:00:00Z",
    state: "stopped",
    active: [],
    acknowledgment: null,
    gate: gate(),
    require_manual_ack: true,
    ...overrides,
  } as StopTradingResponse;
}

describe("describeBlocker", () => {
  it("puts the cooldown left into words", () => {
    expect(describeBlocker("cooldown_pending", gate())).toBe("cooldown (1m left)");
  });

  it("names a failing health check with its detail", () => {
    expect(describeBlocker("health:market_data_fresh", gate())).toBe(
      "health check market_data_fresh (last cycle 400s ago)"
    );
  });

  it("names a health check without a matching detail", () => {
    expect(describeBlocker("health:accounts_readable", gate())).toBe(
      "health check accounts_readable"
    );
  });

  it("names the manual acknowledgment and keeps an unknown code as is", () => {
    expect(describeBlocker("manual_ack_required", gate())).toBe("manual acknowledgment");
    expect(describeBlocker("something_new", gate())).toBe("something_new");
  });

  it("joins several blockers", () => {
    expect(describeBlockers(["cooldown_pending", "manual_ack_required"], gate())).toBe(
      "cooldown (1m left); manual acknowledgment"
    );
  });
});

describe("ackOutcome", () => {
  it("reports a released stop", () => {
    expect(ackOutcome(answer({ state: "running" }))).toEqual({
      ok: true,
      text: "Stop released. New entries can open again.",
    });
  });

  it("reports a passed gate that waits for the next runtime pass", () => {
    const outcome = ackOutcome(answer({ gate: gate({ blockers: [], ready: true }) }));

    expect(outcome.ok).toBe(true);
    expect(outcome.text).toContain("releases the stop on its next pass");
  });

  it("reports what still keeps the stop latched", () => {
    const outcome = ackOutcome(
      answer({
        acknowledgment: {
          at: "2026-11-02T10:00:00Z",
          actor: "telegram:42",
          reason: "ok!",
          triggers: [],
        },
        gate: gate({ blockers: ["cooldown_pending"] }),
      })
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.text).toBe(
      "Acknowledged by telegram:42, but entries stay stopped until these clear: cooldown (1m left)."
    );
  });
});
