import styles from "./BacktestSummaryCards.module.scss";
import type { BacktestSummaryResponse } from "../../api/types";
import StatCard from "../StatCard/StatCard";
import { formatDateTime } from "../../lib/format";

interface BacktestSummaryCardsProps {
  summary: BacktestSummaryResponse;
}

const BacktestSummaryCards = ({ summary }: BacktestSummaryCardsProps) => {
  return (
    <div className={styles.grid}>
      <StatCard label="Total Snapshots" value={summary.total_snapshots.toLocaleString()} />
      <StatCard label="Symbols Covered" value={summary.symbols_covered} />
      <StatCard label="First Snapshot" value={formatDateTime(summary.first_snapshot_at)} />
      <StatCard label="Last Snapshot" value={formatDateTime(summary.last_snapshot_at)} />
    </div>
  );
};

export default BacktestSummaryCards;
