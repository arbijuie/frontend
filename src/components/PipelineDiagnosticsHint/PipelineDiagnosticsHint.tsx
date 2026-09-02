import type { StatusResponse } from '../../api/types';
import styles from './PipelineDiagnosticsHint.module.scss';

interface PipelineDiagnosticsHintProps {
  status: StatusResponse;
}

const PipelineDiagnosticsHint = ({ status }: PipelineDiagnosticsHintProps) => {
  const raw = status.screener_raw_candidates;
  const postCost = status.screener_post_cost_candidates;
  const validated = status.screener_validated_candidates;
  const ready = status.screener_ready_candidates;
  const drops = status.screener_drop_counters ?? {};
  const strictDepth = drops.strict_depth ?? 0;
  const strictDepthHl = drops.strict_depth_hyperliquid ?? 0;
  const strictDepthLt = drops.strict_depth_lighter ?? 0;
  const hlL2Errors = drops.hl_l2_book_fetch_error ?? 0;
  const minScoreDrops = drops.min_score ?? 0;
  const minVolumeDrops = drops.min_volume ?? 0;
  const basisBonusCapped = drops.basis_bonus_capped ?? 0;
  const adaptiveHoldApplied = drops.adaptive_hold_applied ?? 0;
  const basisDivergencePenalty = drops.basis_divergence_penalty ?? 0;
  const downExchanges = Object.values(status.exchange_last_ok).filter((v) => v === false).length;
  const unknownExchanges = Object.values(status.exchange_last_ok).filter((v) => v === null).length;

  if (raw > 0 && postCost === 0) {
    if (strictDepth > 0) {
      return (
        <div className={styles.warnBox}>
          <span className={`${styles.badge} ${styles.warnBadge}`}>warn</span>
          All {raw} raw candidates were dropped by strict depth checks ({strictDepth} drops: HL{' '}
          {strictDepthHl}, Lighter {strictDepthLt}).
          {hlL2Errors > 0 && ` HL l2Book fetch errors: ${hlL2Errors}.`}
        </div>
      );
    }
    return (
      <div className={styles.warnBox}>
        <span className={`${styles.badge} ${styles.warnBadge}`}>warn</span>
        Cost filters are removing all candidates. Try reducing default_order_size_usd and/or
        disabling require_real_depth for local diagnostics.
      </div>
    );
  }

  if (raw === 0 && downExchanges > 0) {
    return (
      <div className={styles.warnBox}>
        <span className={`${styles.badge} ${styles.warnBadge}`}>warn</span>
        No raw candidates and {downExchanges} exchange health flag(s) are degraded.
      </div>
    );
  }

  if (raw === 0 && unknownExchanges > 0) {
    return (
      <div className={styles.infoBox}>
        <span className={`${styles.badge} ${styles.infoBadge}`}>info</span>
        No raw candidates while {unknownExchanges} exchange health flag(s) are still unknown.
      </div>
    );
  }

  if (raw === 0) {
    if (minVolumeDrops > 0 || minScoreDrops > 0) {
      return (
        <div className={styles.infoBox}>
          <span className={`${styles.badge} ${styles.infoBadge}`}>info</span>
          No raw candidates in this cycle. Main drops: min volume {minVolumeDrops}, min score{' '}
          {minScoreDrops}.
        </div>
      );
    }
    return (
      <div className={styles.infoBox}>
        <span className={`${styles.badge} ${styles.infoBadge}`}>info</span>
        No raw candidates in this cycle. This is usually market-state dependent.
      </div>
    );
  }

  if (validated > 0 && ready === 0) {
    if (basisBonusCapped > 0 || adaptiveHoldApplied > 0 || basisDivergencePenalty > 0) {
      return (
        <div className={styles.infoBox}>
          <span className={`${styles.badge} ${styles.infoBadge}`}>info</span>
          Candidates are present but none are ready yet. Risk dampeners active: basis bonus capped{' '}
          {basisBonusCapped}, adaptive hold applied {adaptiveHoldApplied}, basis divergence penalty{' '}
          {basisDivergencePenalty}.
        </div>
      );
    }
    return (
      <div className={styles.infoBox}>
        <span className={`${styles.badge} ${styles.infoBadge}`}>info</span>
        Candidates are present but none are ready yet. Monitor score/cost thresholds.
      </div>
    );
  }

  if (ready > 0) {
    return (
      <div className={styles.okBox}>
        <span className={`${styles.badge} ${styles.okBadge}`}>ok</span>
        Pipeline healthy: ready opportunities are currently available.
      </div>
    );
  }

  return null;
};

export default PipelineDiagnosticsHint;