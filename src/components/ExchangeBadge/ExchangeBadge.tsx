import styles from './ExchangeBadge.module.scss';

type ExchangeKey = 'hyperliquid' | 'lighter' | 'unknown';

function resolveExchangeKey(exchange: string): ExchangeKey {
  const normalized = exchange.toLowerCase();
  if (normalized === 'hyperliquid') return 'hyperliquid';
  if (normalized === 'lighter') return 'lighter';
  return 'unknown';
}

const ExchangeBadge = ({ exchange }: { exchange: string }) => {
  const key = resolveExchangeKey(exchange);
  return <span className={`${styles.badge} ${styles[key]}`}>{exchange}</span>;
};

export default ExchangeBadge;
