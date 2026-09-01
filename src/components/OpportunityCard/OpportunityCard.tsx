import styles from './OpportunityCard.module.scss';
import { useState } from 'react';
import type { OpportunityItem, FundingTrend } from '../../api/types';
import StatusBadge from '../StatusBadge/StatusBadge';
import ExchangeBadge from '../ExchangeBadge/ExchangeBadge';
import { signColor, getFundingTargetTime, formatCountdown } from '../../lib/format';

const trendIcon: Record<FundingTrend, string> = { rising: '↑', falling: '↓', stable: '→' };
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

const OpportunityCard = ({ item, updatedAt, now }: OpportunityCardProps) => {
  const [expanded, setExpanded] = useState(false);
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
          <div className={styles.metricLabel}>Funding Edge</div>
          <div className={`${styles.metricValue} ${styles[signColor(item.funding_edge_bps)]}`}>
            {item.funding_edge_bps.toFixed(1)} bps
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Score</div>
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
            {item.hours_to_breakeven != null ? `${item.hours_to_breakeven.toFixed(1)}h` : '—'}
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Next funding (L)</div>
          <div className={`${styles.metricValue} ${longCountdown?.urgent ? styles.negative : ''}`}>
            {longCountdown ? longCountdown.text : '—'}
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Next funding (S)</div>
          <div className={`${styles.metricValue} ${shortCountdown?.urgent ? styles.negative : ''}`}>
            {shortCountdown ? shortCountdown.text : '—'}
          </div>
        </div>
      </div>

      {(item.long_forecast?.is_unstable || item.short_forecast?.is_unstable) && (
        <div className={styles.instabilityBadge}>⚠ Funding unstable</div>
      )}

      {item.reasons.length > 0 && <div className={styles.reasons}>{item.reasons.join(', ')}</div>}

      <button className={styles.expandButton} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide details' : 'More details'}
      </button>

      {expanded && (
        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span>Persistence</span>
            <span>
              {item.persistence_hours != null ? `${item.persistence_hours.toFixed(1)}h` : '—'}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span>Timing penalty</span>
            <span>{item.funding_timing_penalty_bps.toFixed(1)} bps</span>
          </div>
          <div className={styles.detailRow}>
            <span>Basis trend</span>
            <span>{item.basis_trend != null ? item.basis_trend.toFixed(2) : '—'}</span>
          </div>
          <div className={styles.detailRow}>
            <span>Fee impact</span>
            <span>{item.fee_impact_bps.toFixed(1)} bps</span>
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
                <span>Predicted APR (long)</span>
                <span>{item.long_forecast.predicted_apr.toFixed(2)}%</span>
              </div>
              <div className={styles.detailRow}>
                <span>Avg 24h / 72h (long)</span>
                <span>
                  {item.long_forecast.avg_24h_apr?.toFixed(2) ?? '—'} /{' '}
                  {item.long_forecast.avg_72h_apr?.toFixed(2) ?? '—'}
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
                <span>Predicted APR (short)</span>
                <span>{item.short_forecast.predicted_apr.toFixed(2)}%</span>
              </div>
              <div className={styles.detailRow}>
                <span>Avg 24h / 72h (short)</span>
                <span>
                  {item.short_forecast.avg_24h_apr?.toFixed(2) ?? '—'} /{' '}
                  {item.short_forecast.avg_72h_apr?.toFixed(2) ?? '—'}
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
