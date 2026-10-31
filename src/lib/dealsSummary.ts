import type { OpportunityItem } from "../api/types";

/** One plain sentence summarising the deals list for new traders. */
export function dealsSummary(items: OpportunityItem[]): string {
  const ready = items.filter((i) => i.status === "ready").length;
  const watching = items.filter((i) => i.status === "watching").length;
  const blocked = items.filter((i) => i.status === "blocked").length;
  const lead =
    ready === 0
      ? "No deals are ready to open right now."
      : `${ready} ${ready === 1 ? "deal is" : "deals are"} ready to open.`;
  return `${lead} ${watching} on watch, ${blocked} blocked.`;
}
