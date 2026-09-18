import { useMemo, useState } from "react";
import styles from "./BacktestLockList.module.scss";
import { useBacktestLocks } from "../../hooks/useBacktest";
import type { BacktestLockListItem } from "../../api/types";
import BacktestLockCard from "../BacktestLockCard/BacktestLockCard";
import EmptyState from "../EmptyState/EmptyState";

type SortKey =
  | "created_at"
  | "total_pnl_bps"
  | "funding_carry_pnl_bps"
  | "basis_carry_pnl_bps"
  | "entry_cost_bps";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "created_at", label: "Newest" },
  { key: "total_pnl_bps", label: "Total PnL" },
  { key: "funding_carry_pnl_bps", label: "Funding Carry" },
  { key: "basis_carry_pnl_bps", label: "Basis Carry" },
  { key: "entry_cost_bps", label: "Entry Costs" },
];

const LOCK_SORT_STORAGE_KEY = "backtest-lock-list-sort";
const DEFAULT_SORT_KEY: SortKey = "created_at";

function isSortKey(value: string): value is SortKey {
  return SORT_OPTIONS.some((item) => item.key === value);
}

function loadSortKey(): SortKey {
  if (typeof window === "undefined") {
    return DEFAULT_SORT_KEY;
  }
  const saved = window.localStorage.getItem(LOCK_SORT_STORAGE_KEY);
  return saved && isSortKey(saved) ? saved : DEFAULT_SORT_KEY;
}

function saveSortKey(value: SortKey): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LOCK_SORT_STORAGE_KEY, value);
}

function sortLocks(items: BacktestLockListItem[], sortKey: SortKey): BacktestLockListItem[] {
  return [...items].sort((a, b) => {
    if (sortKey === "created_at") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortKey === "entry_cost_bps") {
      return a.entry_cost_bps - b.entry_cost_bps;
    }
    return (b[sortKey] ?? 0) - (a[sortKey] ?? 0);
  });
}

interface BacktestLockListProps {
  onSelectLock: (lockId: string) => void;
}

const BacktestLockList = ({ onSelectLock }: BacktestLockListProps) => {
  const { data, error, loading } = useBacktestLocks();
  const [sortKey, setSortKey] = useState<SortKey>(loadSortKey);
  const sortedLocks = useMemo(() => sortLocks(data?.items ?? [], sortKey), [data?.items, sortKey]);

  if (loading) return <div>Loading locks...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data?.items || data.items.length === 0) {
    return (
      <EmptyState
        title="No strategy locks yet"
        description="Run a replay and create a lock to see it here."
      />
    );
  }

  return (
    <div>
      <div className={styles.controls}>
        <select
          className={styles.sortSelect}
          value={sortKey}
          onChange={(event) => {
            const next = event.target.value as SortKey;
            setSortKey(next);
            saveSortKey(next);
          }}
          aria-label="Sort locks by"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              Sort: {option.label}
            </option>
          ))}
        </select>
      </div>
      {sortedLocks.map((lock) => (
        <BacktestLockCard key={lock.lock_id} lock={lock} onSelect={onSelectLock} />
      ))}
    </div>
  );
};

export default BacktestLockList;
