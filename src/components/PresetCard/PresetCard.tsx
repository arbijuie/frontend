import type { Preset } from "../../lib/presets";
import styles from "./PresetCard.module.scss";

interface PresetCardProps {
  preset: Preset;
  isActive: boolean;
  isApplying: boolean;
  isDisabled: boolean;
  onApply: (preset: Preset) => void;
}

const PresetCard = ({ preset, isActive, isApplying, isDisabled, onApply }: PresetCardProps) => {
  return (
    <button
      type="button"
      className={`${styles.card} ${isActive ? styles.active : ""}`}
      onClick={() => onApply(preset)}
      disabled={isDisabled}
    >
      <div className={styles.topRow}>
        <span className={styles.name}>{preset.name}</span>
        {isApplying ? (
          <span className={styles.badge}>Applying...</span>
        ) : isActive ? (
          <span className={styles.badge}>Currently active</span>
        ) : (
          <span className={styles.badge}>Apply</span>
        )}
      </div>
      <div className={styles.description}>{preset.description}</div>
      <div className={styles.grid}>
        <span className={styles.rowLabel}>Min Score</span>
        <span className={styles.rowValue}>{preset.values.min_score_bps} bps</span>
        <span className={styles.rowLabel}>Min Volume 24h</span>
        <span className={styles.rowValue}>${preset.values.min_volume_24h.toLocaleString()}</span>
        <span className={styles.rowLabel}>Min Open Interest</span>
        <span className={styles.rowValue}>${preset.values.min_open_interest.toLocaleString()}</span>
        <span className={styles.rowLabel}>Min Persistence</span>
        <span className={styles.rowValue}>{preset.values.min_persistence_hours}h</span>
        <span className={styles.rowLabel}>Anti-Churn Cooldown</span>
        <span className={styles.rowValue}>{preset.values.anti_churn_cooldown_s}s</span>
      </div>
    </button>
  );
};

export default PresetCard;
