import styles from "./OpportunityCard.module.scss";
import { useState } from "react";
import type { OpportunityItem, FundingTrend } from "../../api/types";
import StatusBadge from "../StatusBadge/StatusBadge";
import ExchangeBadge from "../ExchangeBadge/ExchangeBadge";
import { signColor, getFundingTargetTime, formatCountdown } from "../../lib/format";

const trendIcon: Record<FundingTrend, string> = { rising: "↑", falling: "↓", stable: "→" };
const trendClass: Record<FundingTrend, string> = {
  rising: styles.positive,
  falling: styles.negative,
  stable: styles.neutral,
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

const OpportunityCard = ({ item, updatedAt, now }: OpportunityCardProps) => {
  const [expanded, setExpanded] = useState(false);
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
        <ExchangeBadge exchange={item.long_exchange} />
        <span className={styles.arrow}>→</span>
        <ExchangeBadge exchange={item.short_exchange} />
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
            <span
              className={styles.helpDot}
              title="Projected funding PnL for expected hold window: funding_diff_apr * hold_hours / 8760 * 100"
            >
              ?
            </span>
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
            <span
              className={styles.helpDot}
              title="Combined score = Funding Edge + Basis Bonus - Total Cost - Timing Penalty - Basis Divergence Penalty (plus instability/liquidity/rounding adjustment)"
            >
              ?
            </span>
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
              <span>Total cost (fees + slippage)</span>
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
            <span>Persistence</span>
            <span>
              {item.persistence_hours != null ? `${item.persistence_hours.toFixed(1)}h` : "—"}
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
          <div className={styles.detailRow}>
            <span>Total cost</span>
            <span>{item.total_cost_bps.toFixed(1)} bps</span>
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
        </div>
      )}
    </div>
  );
};

export default OpportunityCard;
