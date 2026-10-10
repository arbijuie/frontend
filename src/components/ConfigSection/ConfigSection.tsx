import styles from "./ConfigSection.module.scss";
import type { ReactNode } from "react";
import { useId } from "react";

interface ConfigSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

const ConfigSection = ({ title, isOpen, onToggle, children }: ConfigSectionProps) => {
  const panelId = useId();

  return (
    <div className={styles.section}>
      <button
        className={styles.header}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span>{title}</span>
        <span
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {isOpen && (
        <div id={panelId} className={styles.body} role="region" aria-label={title}>
          {children}
        </div>
      )}
    </div>
  );
};

export default ConfigSection;
