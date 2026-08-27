import type { StatusResponse } from '../../api/types';
import styles from './ExchangeHealthList.module.scss';

interface ExchangeHealthListProps {
  exchangeStatus: StatusResponse['exchange_last_ok'];
}

const ExchangeHealthList = ({ exchangeStatus }: ExchangeHealthListProps) => {
  const entries = Object.entries(exchangeStatus);

  if (entries.length === 0) {
    return <div className={styles.empty}>No exchange health data</div>;
  }

  return (
    <div className={styles.card}>
      {entries.map(([exchange, isOk]) => (
        <div key={exchange} className={styles.row}>
          <span className={styles.exchangeName}>{exchange}</span>
          <span className={`${styles.dot} ${isOk ? styles.ok : styles.notOk}`} />
        </div>
      ))}
    </div>
  );
};

export default ExchangeHealthList;
