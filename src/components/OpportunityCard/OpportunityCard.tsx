import styles from "./OpportunityCard.module.scss";
import { useState } from "react";
import { SOURCE_STATE_SET, type OpportunityItem, type FundingTrend } from "../../api/types";
import StatusBadge from "../StatusBadge/StatusBadge";
import ExchangeBadge from "../ExchangeBadge/ExchangeBadge";
import { signColor, getFundingTargetTime, formatCountdown } from "../../lib/format";
import HelpTooltip from "../HelpTooltip/HelpTooltip";

const trendIcon: Record<FundingTrend, string> = { rising: "↑", falling: "↓", stable: "→" };
const trendClass: Record<FundingTrend, string> = {
  rising: styles.positive,
  falling: styles.negative,
  stable: styles.neutral,
};

const RISK_LENS_HELP: Record<string, string> = {
  liquidityTier:
    "24h volume tier of the thinner leg relative to the minimum volume filter (High ≥10×, Medium ≥3×, Low below)",
  fundingTimingAsymmetry:
    "Hours between long and short funding settlement times — larger values mean more exposure risk between payouts",
  basisDivergence: "Consecutive hours the basis has stayed above the divergence threshold",
  effectiveHold:
    "Expected holding window, shortened when funding/basis instability is detected (expected_hold_hours × (1 − hold_window_instability_scale))",
  minProfitableHours: "Minimum hold time needed to cover costs at current rates",
};

interface OpportunityCardProps {
  item: OpportunityItem;
  updatedAt: string | null;
  now: Date;
}

function formatSigned(value: number, fractionDigits = 2): string {
  const abs = Math.abs(value).toFixed(fractionDigits);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

function normalizeSourceState(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(SOURCE_STATE_SET, normalized)) {
    return normalized;
  }
  if (normalized === "real") {
    return "real_rest";
  }
  if (!normalized || normalized === "none" || normalized === "unknown") {
    return "unavailable";
  }
  return "unavailable";
}

function formatNullableNumber(value: number | null | undefined, fractionDigits: number): string {
  return value != null ? value.toFixed(fractionDigits) : "—";
}

function formatNullablePrice(value: string | null | undefined): string {
  if (value == null) {
    return "—";
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return numeric.toFixed(2);
}

function formatHours(value: number | null | undefined, fallback = "not enough data"): string {
  if (value == null) return fallback;
  return `${value.toFixed(1)}h`;
}

function formatLiquidityTier(tier: "H" | "M" | "L" | null | undefined): string {
  if (tier == null) return "unknown";
  const labels = { H: "High", M: "Medium", L: "Low" };
  return labels[tier];
}

function formatEffectiveFee(
  feesByExchange: Record<string, number> | undefined,
  venue: string
): string {
  const fee = feesByExchange?.[venue];
  return fee != null ? `${(fee * 100).toFixed(3)}%` : "—";
}

const OpportunityCard = ({ item, updatedAt, now }: OpportunityCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const longLeg = item.legs?.find((leg) => leg.side === "long");
  const shortLeg = item.legs?.find((leg) => leg.side === "short");
  const longVenue = longLeg?.venue ?? "unknown";
  const shortVenue = shortLeg?.venue ?? "unknown";
  const depthSourceStateByExchange = item.depth_source_state_by_exchange ?? {};
  const feeSourceStateByExchange = item.fee_source_state_by_exchange ?? {};
  const microstructureByExchange = item.microstructure_by_exchange ?? {};
  const longMicro = microstructureByExchange[longVenue];
  const shortMicro = microstructureByExchange[shortVenue];
  const longPriceSource = normalizeSourceState(longMicro?.price_source);
  const shortPriceSource = normalizeSourceState(shortMicro?.price_source);
  const longDepthSource = normalizeSourceState(
    longMicro?.depth_source ?? depthSourceStateByExchange[longVenue]
  );
  const shortDepthSource = normalizeSourceState(
    shortMicro?.depth_source ?? depthSourceStateByExchange[shortVenue]
  );
  const longFeeSource = normalizeSourceState(
    longMicro?.fee_source ?? feeSourceStateByExchange[longVenue]
  );
  const shortFeeSource = normalizeSourceState(
    shortMicro?.fee_source ?? feeSourceStateByExchange[shortVenue]
  );
  const scoreFromComponents =
    item.funding_edge_bps +
    item.basis_bonus_bps -
    item.total_cost_bps -
    item.funding_timing_penalty_bps -
    item.basis_expansion_penalty_bps;
  const scoreAdjustment = item.combined_score - scoreFromComponents;
  const longCountdown =
    updatedAt && item.long_hours_to_next_funding != null
      ? formatCountdown(getFundingTargetTime(updatedAt, item.long_hours_to_next_funding), now)
      : null;

  const shortCountdown =
    updatedAt && item.short_hours_to_next_funding != null
      ? formatCountdown(getFundingTargetTime(updatedAt, item.short_hours_to_next_funding), now)
      : null;
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.symbol}>{item.symbol}</span>
        <StatusBadge status={item.status} />
      </div>
      <div className={styles.route}>
        <ExchangeBadge exchange={longVenue} />
        <span className={styles.arrow}>→</span>
        <ExchangeBadge exchange={shortVenue} />
      </div>
      <div className={styles.metrics}>
        <div>
          <div className={styles.metricLabel}>Funding Diff APR</div>
          <div className={`${styles.metricValue} ${styles[signColor(item.funding_diff_apr)]}`}>
            {item.funding_diff_apr.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className={styles.metricLabelWithHelp}>
            Funding Edge
            <HelpTooltip
              label="Funding Edge"
              text="Projected funding PnL for expected hold window: funding_diff_apr * hold_hours / 8760 * 100"
            />
          </div>
          <div className={`${styles.metricValue} ${styles[signColor(item.funding_edge_bps)]}`}>
            {item.funding_edge_bps.toFixed(1)} bps
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Total Cost</div>
          <div className={`${styles.metricValue} ${styles.negative}`}>
            {item.total_cost_bps.toFixed(1)} bps
          </div>
        </div>
        <div>
          <div className={styles.metricLabelWithHelp}>
            Score
            <HelpTooltip
              label="Score"
              text="Combined score = Funding Edge + Basis Bonus - Total Cost - Timing Penalty - Basis Divergence Penalty (plus instability/liquidity/rounding adjustment)"
            />
          </div>
          <div className={`${styles.metricValue} ${styles[signColor(item.combined_score)]}`}>
            {item.combined_score.toFixed(1)}
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Basis</div>
          <div className={`${styles.metricValue} ${styles[signColor(item.basis_bps)]}`}>
            {item.basis_bps.toFixed(1)} bps
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Breakeven</div>
          <div className={styles.metricValue}>
            {item.hours_to_breakeven != null ? `${item.hours_to_breakeven.toFixed(1)}h` : "—"}
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Next funding (L)</div>
          <div className={`${styles.metricValue} ${longCountdown?.urgent ? styles.negative : ""}`}>
            {longCountdown ? longCountdown.text : "—"}
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Next funding (S)</div>
          <div className={`${styles.metricValue} ${shortCountdown?.urgent ? styles.negative : ""}`}>
            {shortCountdown ? shortCountdown.text : "—"}
          </div>
        </div>
      </div>

      {(item.long_forecast?.is_unstable || item.short_forecast?.is_unstable) && (
        <div className={styles.instabilityBadge}>⚠ Funding unstable</div>
      )}

      {item.reasons?.length ? (
        <div className={styles.reasons}>
          {item.reasons.map((reason) => reason.message).join(", ")}
        </div>
      ) : null}

      <button className={styles.expandButton} onClick={() => setExpanded(!expanded)}>
        {expanded ? "Hide details" : "More details"}
      </button>

      {expanded && (
        <div className={styles.details}>
          <div className={styles.breakdownCard}>
            <div className={styles.breakdownTitle}>Score breakdown (bps)</div>
            <div className={styles.detailRow}>
              <span>Funding edge</span>
              <span className={styles.positive}>{formatSigned(item.funding_edge_bps)}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Basis bonus</span>
              <span className={styles.positive}>{formatSigned(item.basis_bonus_bps)}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Total cost (fees + slippage + source penalty)</span>
              <span className={styles.negative}>{formatSigned(-item.total_cost_bps)}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Timing penalty</span>
              <span className={styles.negative}>
                {formatSigned(-item.funding_timing_penalty_bps)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span>Basis divergence penalty</span>
              <span className={styles.negative}>
                {formatSigned(-item.basis_expansion_penalty_bps)}
              </span>
            </div>
            {Math.abs(scoreAdjustment) >= 0.1 && (
              <div className={styles.detailRow}>
                <span>Adjustment (instability/liquidity/rounding)</span>
                <span className={styles[signColor(scoreAdjustment)]}>
                  {formatSigned(scoreAdjustment)}
                </span>
              </div>
            )}
            <div className={`${styles.detailRow} ${styles.breakdownTotal}`}>
              <span>Combined score</span>
              <span className={styles[signColor(item.combined_score)]}>
                {formatSigned(item.combined_score)}
              </span>
            </div>
          </div>

          <div className={styles.detailRow}>
            <span>Signal score</span>
            <span>{item.signal_score_bps.toFixed(1)} bps</span>
          </div>
          <div className={styles.detailRow}>
            <span>Execution-adjusted score</span>
            <span>{item.execution_adjusted_score_bps.toFixed(1)} bps</span>
          </div>

          <div className={styles.detailRow}>
            <span>Persistence</span>
            <span>
              {item.persistence_hours != null ? `${item.persistence_hours.toFixed(1)}h` : "—"}
            </span>
          </div>
          {item.correlated_with && item.correlated_with.length > 0 && (
            <div className={styles.detailRow}>
              <span>Correlated with</span>
              <span>{item.correlated_with.join(", ")}</span>
            </div>
          )}
          <div className={styles.detailRow}>
            <span>Historical win rate</span>
            <span>
              {item.historical_win_rate != null
                ? `${(item.historical_win_rate * 100).toFixed(0)}% (${item.historical_closed_trades ?? 0} trades)`
                : "—"}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span>Timing penalty</span>
            <span>{item.funding_timing_penalty_bps.toFixed(1)} bps</span>
          </div>
          <div className={styles.detailRow}>
            <span>Basis trend</span>
            <span>{item.basis_trend != null ? item.basis_trend.toFixed(2) : "—"}</span>
          </div>
          <div className={styles.detailRow}>
            <span>Fee impact</span>
            <span>{item.fee_impact_bps.toFixed(1)} bps</span>
          </div>
          <div className={styles.detailRow}>
            <span>Slippage impact</span>
            <span>{item.slippage_impact_bps.toFixed(1)} bps</span>
          </div>
          <div className={styles.detailRow}>
            <span>Source penalty</span>
            <span>{item.source_penalty_bps.toFixed(1)} bps</span>
          </div>
          <div className={styles.detailRow}>
            <span>Recommended size</span>
            <span>
              {item.recommended_size_usd != null
                ? `$${item.recommended_size_usd.toLocaleString()}`
                : "—"}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span>Depth quality</span>
            <span>{item.depth_quality ?? "—"}</span>
          </div>

          {item.long_forecast && (
            <>
              <div className={styles.detailRow}>
                <span>Trend (long)</span>
                <span className={trendClass[item.long_forecast.trend]}>
                  {trendIcon[item.long_forecast.trend]} {item.long_forecast.trend}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span>Expected APR (long)</span>
                <span>{item.long_forecast.expected_apr.toFixed(2)}%</span>
              </div>
              <div className={styles.detailRow}>
                <span>Avg 24h / 72h (long)</span>
                <span>
                  {item.long_forecast.avg_24h_apr?.toFixed(2) ?? "—"} /{" "}
                  {item.long_forecast.avg_72h_apr?.toFixed(2) ?? "—"}
                </span>
              </div>
            </>
          )}
          {item.short_forecast && (
            <>
              <div className={styles.detailRow}>
                <span>Trend (short)</span>
                <span className={trendClass[item.short_forecast.trend]}>
                  {trendIcon[item.short_forecast.trend]} {item.short_forecast.trend}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span>Expected APR (short)</span>
                <span>{item.short_forecast.expected_apr.toFixed(2)}%</span>
              </div>
              <div className={styles.detailRow}>
                <span>Avg 24h / 72h (short)</span>
                <span>
                  {item.short_forecast.avg_24h_apr?.toFixed(2) ?? "—"} /{" "}
                  {item.short_forecast.avg_72h_apr?.toFixed(2) ?? "—"}
                </span>
              </div>
            </>
          )}
          {item.funding_instability_multiplier < 1.0 && (
            <div className={styles.detailRow}>
              <span>Instability penalty</span>
              <span className={styles.negative}>
                ×{item.funding_instability_multiplier.toFixed(2)}
              </span>
            </div>
          )}

          <div className={styles.sectionLabel}>Risk Lens</div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabelWithHelp}>
              Liquidity tier
              <HelpTooltip label="Liquidity tier" text={RISK_LENS_HELP.liquidityTier} />
            </span>
            <span>{formatLiquidityTier(item.liquidity_tier)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabelWithHelp}>
              Funding timing asymmetry
              <HelpTooltip
                label="Funding timing asymmetry"
                text={RISK_LENS_HELP.fundingTimingAsymmetry}
              />
            </span>
            <span>
              {formatHours(
                item.funding_timing_asymmetry_hours,
                "n/a (different funding intervals)"
              )}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabelWithHelp}>
              Basis divergence
              <HelpTooltip label="Basis divergence" text={RISK_LENS_HELP.basisDivergence} />
            </span>
            <span>{formatHours(item.basis_divergence_hours)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabelWithHelp}>
              Effective hold
              <HelpTooltip label="Effective hold" text={RISK_LENS_HELP.effectiveHold} />
            </span>
            <span>{formatHours(item.effective_hold_hours)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabelWithHelp}>
              Min profitable hours
              <HelpTooltip label="Min profitable hours" text={RISK_LENS_HELP.minProfitableHours} />
            </span>
            <span>{formatHours(item.min_profitable_hours, "not profitable on funding")}</span>
          </div>

          <button
            type="button"
            className={styles.subToggle}
            onClick={() => setShowProvenance(!showProvenance)}
            aria-expanded={showProvenance}
          >
            {showProvenance ? "Hide data provenance" : "Show data provenance"}
          </button>

          {showProvenance && (
            <>
              <div className={styles.sectionLabel}>Provenance</div>
              <div className={styles.detailRow}>
                <span>Depth source (L/S)</span>
                <span>
                  {longDepthSource} / {shortDepthSource}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span>Fee source (L/S)</span>
                <span>
                  {longFeeSource} / {shortFeeSource}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span>Price source (L/S)</span>
                <span>
                  {longPriceSource} / {shortPriceSource}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span>Effective taker fee (L/S)</span>
                <span>
                  {formatEffectiveFee(item.effective_taker_fee_by_exchange, longVenue)} /{" "}
                  {formatEffectiveFee(item.effective_taker_fee_by_exchange, shortVenue)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span>Spread bps (L/S)</span>
                <span>
                  {formatNullableNumber(longMicro?.spread_bps, 2)} /{" "}
                  {formatNullableNumber(shortMicro?.spread_bps, 2)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span>Depth 10bps USD (L/S)</span>
                <span>
                  {formatNullableNumber(longMicro?.depth_band_10bps_usd, 0)} /{" "}
                  {formatNullableNumber(shortMicro?.depth_band_10bps_usd, 0)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span>Depth 20bps USD (L/S)</span>
                <span>
                  {formatNullableNumber(longMicro?.depth_band_20bps_usd, 0)} /{" "}
                  {formatNullableNumber(shortMicro?.depth_band_20bps_usd, 0)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span>Mid price (L/S)</span>
                <span>
                  {formatNullablePrice(longMicro?.mid)} / {formatNullablePrice(shortMicro?.mid)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OpportunityCard;
