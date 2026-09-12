import styles from './ExchangeBadge.module.scss';

const KNOWN_EXCHANGES = [
  'hyperliquid',
  'lighter',
  'aster',
  'binance',
  'bybit',
  'dydx',
  'extended',
] as const;

type ExchangeKey = (typeof KNOWN_EXCHANGES)[number] | 'unknown';

function resolveExchangeKey(exchange: string): ExchangeKey {
  const normalized = exchange.toLowerCase();
  const match = KNOWN_EXCHANGES.find((key) => key === normalized);
  return match ?? 'unknown';
}

const ExchangeBadge = ({ exchange }: { exchange: string }) => {
  const key = resolveExchangeKey(exchange);
  return <span className={`${styles.badge} ${styles[key]}`}>{exchange}</span>;
};

export default ExchangeBadge;
