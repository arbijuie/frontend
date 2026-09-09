import styles from '../../pages/OpportunitiesPage/OpportunitiesPage.module.scss';
import PageHeader from '../../components/PageHeader/PageHeader';
import EmptyState from '../../components/EmptyState/EmptyState';
import { usePageTitle } from '../../hooks/usePageTitle';

const BacktestPage = () => {
  usePageTitle('Backtest');

  return (
    <div className={styles.page}>
      <PageHeader title="Backtest" subtitle="Replay results, strategy locks, and gate status" />
      <EmptyState
        title="Backtest UI is not available yet"
        description="Replay results and strategy locks will appear here. Use the /backtest API endpoints in the meantime."
      />
    </div>
  );
};

export default BacktestPage;
