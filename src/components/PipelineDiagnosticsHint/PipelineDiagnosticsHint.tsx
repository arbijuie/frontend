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
  const unhealthyExchanges = Object.values(status.exchange_last_ok).filter((v) => v !== true).length;

  if (raw > 0 && postCost === 0) {
    return (
      <div className={styles.warnBox}>
        <span className={`${styles.badge} ${styles.warnBadge}`}>warn</span>
        Cost filters are removing all candidates. Try reducing default_order_size_usd and/or
        disabling require_real_depth for local diagnostics.
      </div>
    );
  }

  if (raw === 0 && unhealthyExchanges > 0) {
    return (
      <div className={styles.warnBox}>
        <span className={`${styles.badge} ${styles.warnBadge}`}>warn</span>
        No raw candidates and {unhealthyExchanges} exchange health flag(s) are degraded.
      </div>
    );
  }

  if (raw === 0) {
    return (
      <div className={styles.infoBox}>
        <span className={`${styles.badge} ${styles.infoBadge}`}>info</span>
        No raw candidates in this cycle. This is usually market-state dependent.
      </div>
    );
  }

  if (validated > 0 && ready === 0) {
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