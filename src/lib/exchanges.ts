export const KNOWN_EXCHANGES = [
  "hyperliquid",
  "lighter",
  "aster",
  "binance",
  "bybit",
  "dydx",
  "extended",
] as const;

export type KnownExchange = (typeof KNOWN_EXCHANGES)[number];
