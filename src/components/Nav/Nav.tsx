import styles from "./Nav.module.scss";
import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "../../lib/navigation";

const startsWithPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

const Nav = () => {
  const { pathname } = useLocation();

  return (
    <nav className={styles.nav} aria-label="Primary">
      {NAV_ITEMS.map(({ to, label, icon: Icon, matchPrefixes }) => {
        const active =
          to === "/"
            ? pathname === "/"
            : startsWithPath(pathname, to) ||
              (matchPrefixes ?? []).some((prefix) => startsWithPath(pathname, prefix));
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={`${styles.item} ${active ? styles.active : ""}`}
          >
            <Icon className={styles.icon} aria-hidden="true" />
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default Nav;
