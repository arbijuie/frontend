import { Link, useLocation } from 'react-router-dom';
import styles from '../../pages/OpportunitiesPage/OpportunitiesPage.module.scss';
import PageHeader from '../../components/PageHeader/PageHeader';
import EmptyState from '../../components/EmptyState/EmptyState';
import { usePageTitle } from '../../hooks/usePageTitle';

const NotFoundPage = () => {
  usePageTitle('Not found');
  const { pathname } = useLocation();

  return (
    <div className={styles.page}>
      <PageHeader title="Page not found" />
      <EmptyState
        title={`No section matches "${pathname}"`}
        description="Use the navigation below to pick a section."
      />
      <p className={styles.hint}>
        <Link to="/">Go to Opportunities</Link>
      </p>
    </div>
  );
};

export default NotFoundPage;
