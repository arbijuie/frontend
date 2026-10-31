import type { OpportunityItem } from "../api/types";

/** 1 bps = 0.01%. */
export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatPayoff(hours: number | null | undefined): string {
  if (hours == null) return "Unknown";
  if (hours < 48) return `${Math.max(1, Math.round(hours))} h`;
  return `${Math.round(hours / 24)} days`;
}

export function dealVenues(item: Pick<OpportunityItem, "legs">) {
  return {
    long: item.legs?.find((leg) => leg.side === "long")?.venue ?? "unknown",
    short: item.legs?.find((leg) => leg.side === "short")?.venue ?? "unknown",
  };
}

/** Stable address of one deal: /deals/BTC/binance/lighter. */
export function dealPath(item: Pick<OpportunityItem, "symbol" | "legs">): string {
  const { long, short } = dealVenues(item);
  return `/deals/${encodeURIComponent(item.symbol)}/${encodeURIComponent(long)}/${encodeURIComponent(short)}`;
}

export interface DealEstimate {
  incomePerDay: number;
  costs: number;
  after7Days: number;
  after30Days: number;
}

/** What a deal of `sizeUsd` would earn if payout rates stay where they are now. */
export function estimateDeal(
  sizeUsd: number,
  item: Pick<OpportunityItem, "funding_diff_apr" | "total_cost_bps">
): DealEstimate {
  const size = Number.isFinite(sizeUsd) && sizeUsd > 0 ? sizeUsd : 0;
  const incomePerDay = (size * item.funding_diff_apr) / 100 / 365;
  const costs = (size * item.total_cost_bps) / 10_000;
  return {
    incomePerDay,
    costs,
    after7Days: incomePerDay * 7 - costs,
    after30Days: incomePerDay * 30 - costs,
  };
}

export function formatUsd(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}
