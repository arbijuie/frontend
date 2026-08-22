import styles from './StatCard.module.scss';

type StatColor = 'green' | 'yellow' | 'red' | 'purple';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: StatColor;
}

const StatCard = ({ label, value, sub, color }: StatCardProps) => {
  return (
    <div className={styles.card}>
      <p className={styles.label}>{label}</p>
      <div className={`${styles.value} ${color ? styles[color] : ''}`}>{value}</div>
      {sub && <span className={styles.sub}>{sub}</span>}
    </div>
  );
};

export default StatCard;
