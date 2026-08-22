import styles from './OpportunityCardSkeleton.module.scss';

const OpportunityCardSkeleton = () => {
  return (
    <div className={styles.card}>
      <div className={styles.line} style={{ width: '40%' }} />
      <div className={styles.line} style={{ width: '60%', marginTop: 10 }} />
      <div className={styles.metricsRow}>
        <div className={styles.line} style={{ width: '100%' }} />
        <div className={styles.line} style={{ width: '100%' }} />
        <div className={styles.line} style={{ width: '100%' }} />
        <div className={styles.line} style={{ width: '100%' }} />
      </div>
    </div>
  );
}

export default OpportunityCardSkeleton;