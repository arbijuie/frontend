/**
 * Plain-English text for screener reason codes, so new traders never see raw codes.
 * Unknown codes fall back to the server message.
 */
const PLAIN_REASON_TEXT: Record<string, string> = {
  venue_fee_source_not_integrated: "Real fee data is missing for this exchange",
  real_fee_unavailable: "Real fee data is missing for this exchange",
  score_below_min: "Income too small to enter",
  break_even_window: "Takes too long to pay off",
  funding_flips: "Payout rate keeps changing direction",
  funding_unstable: "Payout rate is jumping around",
  executable_spread_below_entry: "Price gap too small to enter right now",
  depth_quality_below_min: "Not enough buyers and sellers",
  basis_trend_unstable: "Price gap between exchanges is unstable",
  execution_disabled: "Trading is turned off in settings",
};

export interface ReasonLike {
  code: string;
  message: string;
}

export function plainReason(reason: ReasonLike): string {
  return PLAIN_REASON_TEXT[reason.code] ?? reason.message;
}

/**
 * Plain text for a bare code (gate reason, blocker, outcome, trigger): dictionary first,
 * otherwise "snake_case_code" becomes "Snake case code" so raw identifiers never show.
 */
export function plainCode(code: string | null | undefined): string {
  if (!code) return "";
  const known = PLAIN_REASON_TEXT[code];
  if (known) return known;
  const words = code.replace(/[_:.-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : code;
}

/** Plain text for a list of reasons, with duplicates removed. */
export function plainReasons(reasons: readonly ReasonLike[]): string[] {
  return Array.from(new Set(reasons.map(plainReason)));
}
