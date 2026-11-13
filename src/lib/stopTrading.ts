import { formatUptime } from "./format";
import type { StopTradingResponse } from "../api/types";

type Gate = StopTradingResponse["gate"];

/** One recovery-gate blocker code in plain words, e.g. `health:market_data_fresh`. */
export function describeBlocker(code: string, gate: Gate): string {
  if (code === "cooldown_pending") {
    return `cooldown (${formatUptime(gate.cooldown_remaining_s)} left)`;
  }
  if (code === "manual_ack_required") {
    return "manual acknowledgment";
  }
  if (code.startsWith("health:")) {
    const name = code.slice("health:".length);
    const check = (gate.health_checks ?? []).find((item) => item.name === name);
    return check?.detail ? `health check ${name} (${check.detail})` : `health check ${name}`;
  }
  return code;
}

export function describeBlockers(codes: string[], gate: Gate): string {
  return codes.map((code) => describeBlocker(code, gate)).join("; ");
}

/** What the answered latch state means for the operator right after an acknowledgment. */
export function ackOutcome(result: StopTradingResponse): { ok: boolean; text: string } {
  if (result.state === "running") {
    return { ok: true, text: "Stop released. New entries can open again." };
  }
  const by = result.acknowledgment ? ` by ${result.acknowledgment.actor}` : "";
  const blockers = result.gate.blockers ?? [];
  if (blockers.length === 0) {
    return {
      ok: true,
      text: `Acknowledged${by}. The recovery gate passed; the runtime releases the stop on its next pass while execution is enabled.`,
    };
  }
  return {
    ok: false,
    text: `Acknowledged${by}, but entries stay stopped until these clear: ${describeBlockers(blockers, result.gate)}.`,
  };
}
