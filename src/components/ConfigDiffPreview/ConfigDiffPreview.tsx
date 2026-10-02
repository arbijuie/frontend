import styles from "./ConfigDiffPreview.module.scss";
import type { DiffRow } from "../../lib/configDraft";

interface ConfigDiffPreviewProps {
  rows: DiffRow[];
  persist: boolean;
  fieldLabels: Record<string, string>;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}

function formatValue(value: number | boolean): string {
  return typeof value === "boolean" ? (value ? "true" : "false") : String(value);
}

const ConfigDiffPreview = ({
  rows,
  persist,
  fieldLabels,
  onConfirm,
  onCancel,
  submitting,
}: ConfigDiffPreviewProps) => {
  return (
    <div className={styles.panel} role="dialog" aria-label="Preview config changes">
      <div className={styles.title}>Preview changes</div>
      <div className={styles.persistRow}>
        Persist: <strong>{persist ? "true (saved to .env)" : "false (session only)"}</strong>
      </div>
      {rows.map((row) => (
        <div key={row.field} className={styles.row}>
          <span>{fieldLabels[row.field] ?? row.field}</span>
          <span className={styles.values}>
            <span className={styles.oldValue}>{formatValue(row.oldValue)}</span>
            <span className={styles.arrow}>→</span>
            <span className={styles.newValue}>{formatValue(row.newValue)}</span>
          </span>
        </div>
      ))}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.buttonPrimary}
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Confirm & Save"}
        </button>
      </div>
    </div>
  );
};

export default ConfigDiffPreview;
