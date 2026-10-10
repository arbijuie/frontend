import styles from "./ExchangeBadge.module.scss";
import { KNOWN_EXCHANGES, type KnownExchange } from "../../lib/exchanges";

type ExchangeKey = KnownExchange | "unknown";

function resolveExchangeKey(exchange: string): ExchangeKey {
  const normalized = exchange.toLowerCase();
  const match = KNOWN_EXCHANGES.find((key) => key === normalized);
  return match ?? "unknown";
}

const ExchangeBadge = ({ exchange }: { exchange: string }) => {
  const key = resolveExchangeKey(exchange);
  return <span className={`${styles.badge} ${styles[key]}`}>{exchange}</span>;
};

export default ExchangeBadge;
