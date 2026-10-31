import type { AutomationOverviewResponse } from "../api/types";

export interface AutoSummary {
  level: "ok" | "warning" | "danger";
  title: string;
  text: string;
}

/** Plain answer to "Is the bot trading for me right now, and with real money?". */
export function autoSummary(
  data: Pick<AutomationOverviewResponse, "entry" | "posture">
): AutoSummary {
  const { entry, posture } = data;
  const practice = posture.exec_dry_run
    ? " Practice mode: trades are only simulated, no real money is used."
    : " Real money mode: trades use your exchange balances.";

  if (!posture.exec_enabled || entry.state === "disabled") {
    return {
      level: "warning",
      title: "Auto-trading is off",
      text: "The bot will not open any deal by itself. You can still open deals by hand on the Deals screen.",
    };
  }
  if (entry.state === "paused") {
    const who = entry.paused_by ? ` by ${entry.paused_by}` : "";
    const why = entry.pause_reason ? `: "${entry.pause_reason}"` : "";
    return {
      level: "warning",
      title: "Auto-trading is paused",
      text: `Paused${who}${why}. Press Resume to let the bot open deals again.${practice}`,
    };
  }
  if (entry.state === "blocked") {
    return {
      level: "danger",
      title: "Auto-trading is on, but held back",
      text: `Safety checks stop the bot from opening deals. See the reasons below.${practice}`,
    };
  }
  return {
    level: "ok",
    title: "Auto-trading is on",
    text: `The bot watches the market and opens the next deal that passes every check.${practice}`,
  };
}
