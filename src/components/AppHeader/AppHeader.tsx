import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";
import styles from "./AppHeader.module.scss";
import { APP_NAME } from "../../lib/navigation";

interface AppHeaderProps {
  /** Which surface the header belongs to; sets the context tag and the brand target. */
  surface: "operator" | "public";
  /** The surface navigation, rendered next to the brand. */
  children: ReactNode;
}

/**
 * Shell header shared by the operator and public layouts (issue #380).
 *
 * The operator brand is plain text so the first Tab stops after the skip link are the
 * navigation links. The public brand links to the product overview.
 */
const AppHeader = ({ surface, children }: AppHeaderProps) => {
  const brandContent = (
    <>
      <span className={styles.mark} aria-hidden="true">
        <ArrowLeftRight className={styles.markIcon} />
      </span>
      <span className={styles.name}>{APP_NAME}</span>
      {surface === "operator" && <span className={styles.tag}>Operator</span>}
    </>
  );

  return (
    <header className={`${styles.header} ${styles[surface]}`}>
      <div className={styles.inner}>
        {surface === "public" ? (
          <Link to="/product" className={styles.brand}>
            {brandContent}
          </Link>
        ) : (
          <span className={styles.brand}>{brandContent}</span>
        )}
        {children}
      </div>
    </header>
  );
};

export default AppHeader;
