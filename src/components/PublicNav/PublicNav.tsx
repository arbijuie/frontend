import { NavLink } from "react-router-dom";
import styles from "./PublicNav.module.scss";
import { PUBLIC_NAV_ITEMS } from "../../lib/navigation";

const PublicNav = () => {
  return (
    <nav className={styles.nav} aria-label="Public">
      {PUBLIC_NAV_ITEMS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
};

export default PublicNav;
