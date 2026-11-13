import { Link } from "react-router-dom";
import styles from "./StatCard.module.scss";

type StatColor = "green" | "yellow" | "red" | "purple";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: StatColor;
  to?: string;
  toLabel?: string;
}

const StatCard = ({ label, value, sub, color, to, toLabel }: StatCardProps) => {
  const content = (
    <>
      <p className={styles.label}>{label}</p>
      <div className={`${styles.value} ${color ? styles[color] : ""}`}>{value}</div>
      {sub && <span className={styles.sub}>{sub}</span>}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`${styles.card} ${styles.link}`}
        aria-label={toLabel ? `${label}, ${value}. ${toLabel}` : undefined}
      >
        {content}
      </Link>
    );
  }

  return <div className={styles.card}>{content}</div>;
};

export default StatCard;
