import styles from "./StatCard.module.scss";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

const StatCard = ({ label, value, sub }: StatCardProps) => {
  return (
    <div className={styles.card}>
      <p className={styles.label}>{label}</p>
      <div className={styles.value}>{value}</div>
      {sub && <span className={styles.sub}>{sub}</span>}
    </div>
  );
};

export default StatCard;
