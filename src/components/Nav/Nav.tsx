import styles from "./Nav.module.scss";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../lib/navigation";

const Nav = () => {
  return (
    <nav className={styles.nav} aria-label="Primary">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
        >
          <Icon className={styles.icon} aria-hidden="true" />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default Nav;
