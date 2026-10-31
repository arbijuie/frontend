/**
 * Wrong-token / odd price check for a deal pair (no AI, fixed rules).
 *
 * The same perpetual on two exchanges normally trades within well under 1% of
 * each other; the screener's own basis knobs live in the 0.15%–0.8% range
 * (basis_entry_bps 15, divergence 40, bonus cap 80). So:
 * - gap above 20%: almost certainly two different coins sharing a ticker → "danger".
 * - gap of 2%–20%: unusual for one coin, check before trading → "warning".
 * - prices off by a power of ten (1000PEPE vs PEPE): contract-size difference → "warning".
 */
export type PriceCheckLevel = "ok" | "warning" | "danger";

export interface PriceCheck {
  level: PriceCheckLevel;
  /** Relative gap between the two prices, as a fraction (0.05 = 5%). */
  gap: number | null;
  title: string;
  text: string;
}

export const DANGER_GAP = 0.2;
export const WARNING_GAP = 0.02;
const UNIT_TOLERANCE = 0.05;
const MAX_SYMMETRIC_BASIS = 1.99;
const CASH_AND_CARRY = "cash_and_carry";

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isPowerOfTenRatio(ratio: number): boolean {
  if (ratio < 9) return false;
  const power = Math.round(Math.log10(ratio));
  return power >= 1 && Math.abs(ratio / 10 ** power - 1) <= UNIT_TOLERANCE;
}

function gapFromBasis(basisBps: number, strategyType?: string | null): number {
  const basis = Math.abs(basisBps) / 10_000;
  if (strategyType === CASH_AND_CARRY) return basis;
  const capped = Math.min(basis, MAX_SYMMETRIC_BASIS);
  return (2 * capped) / (2 - capped);
}

export function checkPrices(
  longPrice: string | number | null | undefined,
  shortPrice: string | number | null | undefined,
  basisBps?: number | null,
  strategyType?: string | null
): PriceCheck {
  const a = toNumber(longPrice);
  const b = toNumber(shortPrice);
  let gap: number | null = null;
  if (a != null && b != null) {
    const ratio = Math.max(a, b) / Math.min(a, b);
    if (isPowerOfTenRatio(ratio)) {
      return {
        level: "warning",
        gap: ratio - 1,
        title: "Prices use different contract sizes",
        text: "One exchange quotes this coin in bundles (for example 1000 coins). Check the contract size before opening.",
      };
    }
    gap = ratio - 1;
  } else if (basisBps != null && Number.isFinite(basisBps)) {
    gap = gapFromBasis(basisBps, strategyType);
  }
  if (gap == null) return { level: "ok", gap: null, title: "", text: "" };
  const pct = `${(gap * 100).toFixed(gap >= 1 ? 0 : 1)}%`;
  if (gap > DANGER_GAP) {
    return {
      level: "danger",
      gap,
      title: "Probably not the same coin",
      text: `Prices differ by ${pct}. Two exchanges may use the same name for different coins. Do not open this deal.`,
    };
  }
  if (gap >= WARNING_GAP) {
    return {
      level: "warning",
      gap,
      title: "Unusual price gap",
      text: `Prices differ by ${pct}, which is rare for one coin. Check both exchanges before opening.`,
    };
  }
  return { level: "ok", gap, title: "", text: "" };
}
