import { useBacktestLocks } from "../../hooks/useBacktest";
import BacktestLockCard from "../BacktestLockCard/BacktestLockCard";
import EmptyState from "../EmptyState/EmptyState";

const BacktestLockList = () => {
  const { data, error, loading } = useBacktestLocks();

  if (loading) return <div>Loading locks...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data || !data.items || data.items.length === 0) {
    return (
      <EmptyState
        title="No strategy locks yet"
        description="Run a replay and create a lock to see it here."
      />
    );
  }

  return (
    <div>
      {data.items.map((lock) => (
        <BacktestLockCard key={lock.lock_id} lock={lock} />
      ))}
    </div>
  );
};

export default BacktestLockList;
