import styles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import EmptyState from "../../components/EmptyState/EmptyState";
import { usePageTitle } from "../../hooks/usePageTitle";

const ExecutionPage = () => {
  usePageTitle("Execution");

  return (
    <div className={styles.page}>
      <PageHeader title="Execution" subtitle="Readiness, preflight checks, and execution state" />
      <EmptyState
        title="Execution UI is not available yet"
        description="The runtime is currently read-only. Execution readiness and preflight views will appear here once the execution engine ships."
      />
    </div>
  );
};

export default ExecutionPage;
