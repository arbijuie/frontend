import styles from "./ConfigRow.module.scss";

interface ConfigRowProps {
  label: string;
  value: number | boolean | string;
  unit?: string;
  prefix?: string;
}

const ConfigRow = ({ label, value, unit, prefix }: ConfigRowProps) => {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      {typeof value === "boolean" ? (
        <span className={`${styles.pill} ${value ? styles.on : styles.off}`}>
          {value ? "On" : "Off"}
        </span>
      ) : (
        <span className={styles.value}>
          {prefix}
          {typeof value === "number" ? value.toLocaleString() : value}
          {unit ? ` ${unit}` : ""}
        </span>
      )}
    </div>
  );
};

export default ConfigRow;
