import type { ConfigResponse } from '../../api/types';
import styles from './RuntimeKnobsCard.module.scss';

interface RuntimeKnobsCardProps {
  config: ConfigResponse;
}

const RuntimeKnobsCard = ({ config }: RuntimeKnobsCardProps) => {
  return (
    <div className={styles.card}>
      <div className={styles.title}>Runtime Knobs</div>
      <div className={styles.row}>
        <span className={styles.pill}>score: {config.min_score_bps} bps</span>
        <span className={styles.pill}>hold: {config.expected_hold_hours} h</span>
        <span className={styles.pill}>order: ${config.default_order_size_usd.toLocaleString()}</span>
        <span className={styles.pill}>real depth: {config.require_real_depth ? 'on' : 'off'}</span>
        <span className={styles.pill}>max diff APR: {config.max_reasonable_apr}%</span>
      </div>
    </div>
  );
};

export default RuntimeKnobsCard;