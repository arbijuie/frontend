// Check evaluation for the guided onboarding (issue #306). Pure functions over the public
// reads (`/healthz`, `/public/status`, `/public/opportunities`) so the page stays declarative.
import type { HealthzResponse, PublicApiError } from "../api/public";
import type { PublicOpportunitiesResponse, PublicStatusResponse } from "../api/types";
import {
  dataFreshness,
  describePublicError,
  formatAge,
  venueRows,
  type VenueRow,
} from "./publicStats";

export type CheckOutcome = "pending" | "checking" | "passed" | "warning" | "failed";

export interface OnboardingCheck {
  id: string;
  label: string;
  outcome: CheckOutcome;
  /** One-line result. */
  summary: string;
  /** Plain-language explanation and what to do next. */
  detail?: string;
  /** A failed check that leaves nothing to continue with (no "Continue anyway"). */
  blocking?: boolean;
}

export const CHECK_OUTCOME_LABEL: Record<CheckOutcome, string> = {
  pending: "Not checked",
  checking: "Checking",
  passed: "Passed",
  warning: "Warning",
  failed: "Needs attention",
};

export type StepStatus = "not_started" | "checking" | "passed" | "warning" | "failed";

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  not_started: "Not started",
  checking: "Checking",
  passed: "Passed",
  warning: "Passed with warnings",
  failed: "Needs attention",
};

/** Step 3 polls this often while it waits for the first runtime signal. */
export const SIGNAL_POLL_MS = 5_000;

/** Wait used when a 429 answer carries no `Retry-After` header. */
export const DEFAULT_RATE_LIMIT_WAIT_S = 10;

/** Latest state of one public read; neither data nor error yet means "in flight". */
export interface PublicRead<T> {
  data: T | null;
  error: PublicApiError | null;
}

export function stepStatus(checks: OnboardingCheck[]): Exclude<StepStatus, "not_started"> {
  const outcomes = new Set(checks.map((check) => check.outcome));
  if (outcomes.has("failed")) return "failed";
  if (outcomes.has("checking") || !outcomes.has("passed")) return "checking";
  if (outcomes.has("warning")) return "warning";
  return "passed";
}

export function isBlocked(checks: OnboardingCheck[]): boolean {
  return checks.some((check) => check.outcome === "failed" && check.blocking);
}

/** The line announced for a step: the first problem, the pending wait, or "all passed". */
export function stepHeadline(checks: OnboardingCheck[]): string {
  for (const outcome of ["failed", "checking", "warning"] as const) {
    const match = checks.find((check) => check.outcome === outcome);
    if (match) return match.summary;
  }
  return "All checks passed.";
}

/** Epoch ms after which a rate-limited read may be retried, or null when not rate-limited. */
export function rateLimitRetryAt(error: PublicApiError | null, errorAt: number): number | null {
  if (error?.status !== 429) return null;
  return errorAt + (error.retryAfterSeconds ?? DEFAULT_RATE_LIMIT_WAIT_S) * 1000;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86_400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
  }
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  return hours ? `${days} d ${hours} h` : `${days} d`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Fallback copy for a failed read: network, auth (401/403), 404, rate limit (429) or 5xx. */
export function readFailureCheck(
  id: string,
  label: string,
  error: PublicApiError,
  apiAddress: string
): OnboardingCheck {
  const failed = { id, label, outcome: "failed" as const, blocking: true };
  if (error.status === null) {
    return {
      ...failed,
      summary: "The API cannot be reached",
      detail: `Nothing answered at ${apiAddress}. The address this site points at may be wrong, the server may be restarting, or your connection dropped. Wait a moment, then run the checks again.`,
    };
  }
  if (error.status === 401 || error.status === 403) {
    return {
      ...failed,
      summary: "The public channel is closed",
      detail: `This deployment only shares data with signed-in operators (HTTP ${error.status}). Operators sign in through the operator console, from the Telegram Mini App or with an API token; this page never asks for either. Ask the operator to open the public channel, then run the checks again.`,
    };
  }
  if (error.status === 429) {
    // `Retry-After` is only readable same-origin or when the API exposes it over CORS.
    const wait =
      error.retryAfterSeconds !== null
        ? `The server asked to wait ${error.retryAfterSeconds} s`
        : `Wait about ${DEFAULT_RATE_LIMIT_WAIT_S} s`;
    return {
      ...failed,
      summary: "Too many requests",
      detail: `The public channel limits how often each visitor can read it (HTTP 429). ${wait} before the next check; the button below unlocks when the wait is over.`,
    };
  }
  const { title, detail } = describePublicError(error);
  if (error.status === 404) {
    return { ...failed, summary: title, detail: `${detail} Ask the operator to update it.` };
  }
  return { ...failed, summary: title, detail: `${detail} The API may be restarting.` };
}

export function networkCheck(online: boolean): OnboardingCheck {
  const base = { id: "network", label: "Network connection" };
  if (online) return { ...base, outcome: "passed", summary: "Your device is online." };
  return {
    ...base,
    outcome: "failed",
    blocking: true,
    summary: "Your device is offline",
    detail: "Connect to a network, then run the checks again.",
  };
}

export function healthCheck(
  read: PublicRead<HealthzResponse>,
  apiAddress: string
): OnboardingCheck {
  const base = { id: "healthz", label: "API health check" };
  const { data, error } = read;
  if (error) {
    // `/healthz` never needs auth on the API itself; a 401/403/404 comes from a proxy that
    // hides it. Step 2 reads the public data directly, so this is not a dead end.
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return {
        ...base,
        outcome: "warning",
        summary: "This host does not expose the health check",
        detail: `The health check answered HTTP ${error.status}. Some proxies hide it; the next step reads the public data directly.`,
      };
    }
    return readFailureCheck(base.id, base.label, error, apiAddress);
  }
  if (!data) return { ...base, outcome: "checking", summary: "Asking the API whether it is up." };
  if (data.ok === false) {
    return {
      ...base,
      outcome: "warning",
      summary: "The API answered but reports a problem",
      detail: "It may be starting up or shutting down. Run the checks again in a moment.",
    };
  }
  return {
    ...base,
    outcome: "passed",
    summary: "The API is up and answering.",
    detail:
      typeof data.uptime_s === "number"
        ? `Running for ${formatDuration(data.uptime_s)}.`
        : "This host does not report how long the API has been running.",
  };
}

export function channelCheck(
  read: PublicRead<PublicStatusResponse>,
  apiAddress: string
): OnboardingCheck {
  const base = { id: "public-channel", label: "Public data channel" };
  if (read.error) return readFailureCheck(base.id, base.label, read.error, apiAddress);
  if (!read.data) return { ...base, outcome: "checking", summary: "Reading the public status." };
  return {
    ...base,
    outcome: "passed",
    summary: "Public data is readable.",
    detail: "This page reads the read-only public status without signing in.",
  };
}

/** Venue connectivity from the public liveness flags: live, WS degraded (REST) or down. */
export function venueCheck(status: PublicStatusResponse | null): {
  check: OnboardingCheck;
  rows: VenueRow[];
} {
  const base = { id: "venues", label: "Venue connectivity" };
  if (!status) {
    return {
      rows: [],
      check: {
        ...base,
        outcome: "pending",
        summary: "Checked once the public status can be read.",
      },
    };
  }
  const rows = venueRows(status);
  const count = (state: VenueRow["state"]) => rows.filter((row) => row.state === state).length;
  const live = count("live");
  const restFallback = count("rest_fallback");
  const down = count("down");
  const total = rows.length;

  if (live + restFallback === 0) {
    const reported = total > 0 && down > 0;
    return {
      rows,
      check: {
        ...base,
        outcome: "failed",
        summary: reported ? "No venue is delivering market data" : "No venue has reported yet",
        detail: reported
          ? "Every venue is unavailable, so the screener has nothing to work with until one recovers. You can continue and watch for the first signal, or run the checks again later."
          : "The runtime may still be starting. You can continue and wait for the first signal, or run the checks again in a moment.",
      },
    };
  }
  if (live === total) {
    return {
      rows,
      check: {
        ...base,
        outcome: "passed",
        summary: `All ${plural(total, "venue")} stream live.`,
      },
    };
  }
  const downNote =
    down > 0
      ? ` ${plural(down, "venue")} ${down === 1 ? "is" : "are"} unavailable and left out for now.`
      : "";
  if (restFallback > 0) {
    return {
      rows,
      check: {
        ...base,
        outcome: "warning",
        summary: `Live stream degraded: ${restFallback} of ${plural(total, "venue")} on REST fallback`,
        detail: `Market data still flows. Venues on REST fallback are polled over HTTP instead of streamed over WebSocket, so their data updates a little more slowly.${downNote}`,
      },
    };
  }
  return {
    rows,
    check: {
      ...base,
      outcome: "warning",
      summary: `${total - live} of ${plural(total, "venue")} not delivering data`,
      detail: "The screener keeps running on the venues that respond.",
    },
  };
}

export const statusHasSignal = (status: PublicStatusResponse | null | undefined): boolean =>
  (status?.poll_count_success ?? 0) > 0;

export const opportunitiesHaveSignal = (
  opportunities: PublicOpportunitiesResponse | null | undefined
): boolean => Boolean(opportunities?.updated_at) || (opportunities?.count ?? 0) > 0;

export interface RuntimeSignal {
  checks: OnboardingCheck[];
  /** The screener has run and published a snapshot. */
  observed: boolean;
  /** Plain summary of the signal ("Screener has run N times; M routes screened, K ready"). */
  summary: string | null;
}

export function runtimeSignal(
  status: PublicRead<PublicStatusResponse> & { fetchedAt: number },
  opportunities: PublicRead<PublicOpportunitiesResponse>,
  apiAddress: string
): RuntimeSignal {
  const pollSeconds = SIGNAL_POLL_MS / 1000;
  const runs = status.data?.poll_count_success ?? 0;
  const failedRuns = status.data?.poll_count_failed ?? 0;

  let runsCheck: OnboardingCheck;
  const runsBase = { id: "screener-runs", label: "Screener runs" };
  if (status.error) {
    runsCheck = readFailureCheck(runsBase.id, runsBase.label, status.error, apiAddress);
  } else if (!status.data) {
    runsCheck = { ...runsBase, outcome: "checking", summary: "Reading the runtime status." };
  } else if (runs > 0) {
    runsCheck = {
      ...runsBase,
      outcome: "passed",
      summary: `The screener has run ${runs === 1 ? "once" : `${runs} times`}.`,
      detail:
        failedRuns > 0
          ? `${failedRuns} of ${runs + failedRuns} runs failed; the screener keeps running.`
          : undefined,
    };
  } else {
    runsCheck = {
      ...runsBase,
      outcome: "checking",
      summary: "Waiting for the first screener pass.",
      detail: `Checking again every ${pollSeconds} seconds. A fresh deployment needs a minute or two.${
        failedRuns > 0 ? ` ${plural(failedRuns, "attempt")} failed so far.` : ""
      }`,
    };
  }

  let freshnessCheck: OnboardingCheck;
  const freshnessBase = { id: "freshness", label: "Data freshness" };
  if (status.error || !status.data) {
    freshnessCheck = {
      ...freshnessBase,
      outcome: "pending",
      summary: "Checked once the runtime status can be read.",
    };
  } else {
    const { state, ageSeconds } = dataFreshness(status.data.last_updated_at, status.fetchedAt);
    if (state === "fresh") {
      freshnessCheck = {
        ...freshnessBase,
        outcome: "passed",
        summary: `Last update ${formatAge(ageSeconds)}.`,
      };
    } else if (state === "stale") {
      freshnessCheck = {
        ...freshnessBase,
        outcome: "warning",
        summary: `Data is stale: last update ${formatAge(ageSeconds)}`,
        detail:
          "The runtime has not refreshed market data for over 2 minutes. It may be paused, restarting or cut off from the venues. Run the checks again in a moment.",
      };
    } else if (runs > 0) {
      freshnessCheck = {
        ...freshnessBase,
        outcome: "warning",
        summary: "The runtime did not report when it last updated",
      };
    } else {
      freshnessCheck = {
        ...freshnessBase,
        outcome: "checking",
        summary: "Waiting for the first market data update.",
      };
    }
  }

  let routesCheck: OnboardingCheck;
  const routesBase = { id: "routes", label: "Screener output" };
  const opp = opportunities.data;
  if (opportunities.error) {
    routesCheck = readFailureCheck(
      routesBase.id,
      routesBase.label,
      opportunities.error,
      apiAddress
    );
  } else if (!opp) {
    routesCheck = { ...routesBase, outcome: "checking", summary: "Reading the screened routes." };
  } else if (opportunitiesHaveSignal(opp)) {
    routesCheck = {
      ...routesBase,
      outcome: "passed",
      summary: `${plural(opp.count, "route")} screened, ${opp.ready_count} ready.`,
      detail:
        opp.count === 0
          ? "No route clears the filters right now. That is normal when funding rates are flat."
          : undefined,
    };
  } else {
    routesCheck = {
      ...routesBase,
      outcome: "checking",
      summary: "Waiting for the first screened routes.",
    };
  }

  const observed =
    !status.error &&
    !opportunities.error &&
    statusHasSignal(status.data) &&
    opportunitiesHaveSignal(opp);
  const summary =
    observed && opp
      ? `Signal observed: the screener has run ${runs === 1 ? "once" : `${runs} times`}; ${plural(
          opp.count,
          "route"
        )} screened, ${opp.ready_count} ready.`
      : null;

  return { checks: [runsCheck, freshnessCheck, routesCheck], observed, summary };
}
