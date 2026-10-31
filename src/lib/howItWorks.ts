/**
 * Content of the public How-it-works page (issue #515). Pipeline steps are in runtime order and
 * kept in step with docs/architecture/system-architecture.md
 * (connectors -> shared market state -> screener -> output/API).
 */
export const PIPELINE_STEPS = [
  {
    title: "Ingest",
    text: "WebSocket feeds from each venue stream marks, funding, and order books into memory; periodic REST refreshes fill gaps and cover venues without a feed.",
  },
  {
    title: "Share one market state",
    text: "Every venue writes into one in-memory market state with a timestamp per update, so staleness is measured the same way everywhere.",
  },
  {
    title: "Pair and price routes",
    text: "For every symbol on two venues the screener forms a route: long where funding is paid to you, short where it is charged. Fees, slippage from live depth, basis, and funding timing come off the edge.",
  },
  {
    title: "Rank and validate",
    text: "Routes are scored in basis points after costs and checked against thresholds: minimum score, volume, open interest, persistence, data freshness, and anti-churn cooldowns.",
  },
  {
    title: "Explain the verdict",
    text: "Each route is READY, WATCHING, or BLOCKED and carries the reasons, so a signal is never a bare number.",
  },
  {
    title: "Publish",
    text: "The API and WebSocket broadcast serve the ranked routes; the public pages show read-only projections of the same data.",
  },
] as const;

export const VERDICTS = [
  {
    key: "ready",
    label: "READY",
    text: "Passes every check: the edge after costs clears the threshold and the data is fresh.",
  },
  {
    key: "watching",
    label: "WATCHING",
    text: "Close, but one or more soft checks fail: the edge is thin, the route is new, or a cooldown is active.",
  },
  {
    key: "blocked",
    label: "BLOCKED",
    text: "A hard check fails: stale data, missing depth or fees, too little volume, or a risk guardrail.",
  },
] as const;

export const COST_ITEMS = [
  "Taker fees on both legs, entry and exit.",
  "Slippage walked through the live order book for the intended size.",
  "Basis between the two venues, which can help or hurt the exit.",
  "Funding timing: a payment that lands before the hedge is on is a cost, not an edge.",
] as const;
