import styles from "./Nav.module.scss";
import { NavLink } from "react-router-dom";
import { LineChart, Activity, Settings } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Opportunities", icon: LineChart },
  { to: "/status", label: "Status", icon: Activity },
  { to: "/config", label: "Config", icon: Settings },
];

const Nav = () => {
  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
        >
          <Icon className={styles.icon} />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default Nav;
