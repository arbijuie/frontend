import type { ReactNode } from "react";
import styles from "./ConfigSection.module.scss";

interface ConfigSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

const ConfigSection = ({ title, isOpen, onToggle, children }: ConfigSectionProps) => {
  return (
    <div className={styles.section}>
      <button className={styles.header} onClick={onToggle} aria-expanded={isOpen}>
        <span>{title}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}>▾</span>
      </button>
      {isOpen && <div className={styles.body}>{children}</div>}
    </div>
  );
};

export default ConfigSection;
