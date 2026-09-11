import type { ReactNode } from "react";
import styles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";

interface PageHeaderProps {
  title: string;
  /** Optional secondary line under the title (status, timestamps, hints). */
  subtitle?: ReactNode;
}

/** Shared page title block so every section uses the same header layout. */
const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <div className={styles.liveRow}>{subtitle}</div>}
    </div>
  );
};

export default PageHeader;
