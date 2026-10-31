import type { StatusResponse } from "../api/types";

export type HealthLevel = "ok" | "warning" | "danger";

export interface HealthSummary {
  level: HealthLevel;
  title: string;
  details: string[];
}

/** Prices older than this are worth a heads-up; older than STALE_DANGER_MS stop being trustworthy. */
export const STALE_WARNING_MS = 60_000;
export const STALE_DANGER_MS = 5 * 60_000;

const titleCase = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

/** One traffic light for the whole system, in plain words, so a trader knows whether to trust the Deals screen. */
export function healthSummary(
  status: Pick<
    StatusResponse,
    | "exchange_last_ok"
    | "active_exchanges"
    | "last_updated_at"
    | "stop_trading"
    | "execution_entries_stopped"
    | "vooi_route"
  >,
  nowMs: number
): HealthSummary {
  const danger: string[] = [];
  const warning: string[] = [];

  if (status.stop_trading?.state === "stopped") {
    danger.push(
      "Trading was stopped for safety. No new deals will be opened until it is released."
    );
  }
  if (status.execution_entries_stopped) {
    warning.push("New deals are paused after several failed attempts in a row.");
  }

  const route = status.vooi_route;
  if (route?.enabled && route.state === "degraded") {
    const venues = (route.degraded_venues ?? []).map(titleCase);
    warning.push(
      venues.length > 0
        ? `Deals on ${venues.join(", ")} cannot be opened right now: the order connection is failing.`
        : "Deals on some exchanges cannot be opened right now: the order connection is failing."
    );
  } else if (route?.enabled && route.state === "not_configured") {
    warning.push("The order connection is turned on but not set up, so deals cannot be opened.");
  }

  const watched = status.active_exchanges?.length
    ? status.active_exchanges
    : Object.keys(status.exchange_last_ok ?? {});
  const down = watched.filter((name) => status.exchange_last_ok?.[name] !== true);
  if (watched.length > 0 && down.length === watched.length) {
    danger.push("No exchange is answering. Prices on the Deals screen are not live.");
  } else if (down.length > 0) {
    warning.push(
      `${down.length} of ${watched.length} exchanges are not answering: ${down.map(titleCase).join(", ")}. Deals on them may be out of date.`
    );
  }

  if (status.last_updated_at) {
    const ageMs = nowMs - new Date(status.last_updated_at).getTime();
    const minutes = Math.round(ageMs / 60_000);
    if (ageMs > STALE_DANGER_MS) {
      danger.push(
        `Prices were last updated ${minutes} minutes ago. Do not trust the Deals screen right now.`
      );
    } else if (ageMs > STALE_WARNING_MS) {
      warning.push(
        `Prices were last updated ${Math.max(1, minutes)} min ago. Updates are slower than usual.`
      );
    }
  } else {
    warning.push("Prices have not been updated yet since the app started.");
  }

  if (danger.length > 0) {
    return { level: "danger", title: "Something is wrong", details: [...danger, ...warning] };
  }
  if (warning.length > 0) {
    return { level: "warning", title: "Working, with problems", details: warning };
  }
  return {
    level: "ok",
    title: "Everything is working",
    details: [`All ${watched.length} exchanges answer and prices are fresh.`],
  };
}
