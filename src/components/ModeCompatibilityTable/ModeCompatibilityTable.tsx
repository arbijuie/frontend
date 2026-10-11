import styles from "./ModeCompatibilityTable.module.scss";
import { PRODUCT_MODES, RISK_LABEL } from "../../lib/productModes";

/**
 * Explicit mode -> runtime preset mapping (issue #303). Preset keys are the stable API
 * contract (`PATCH /config` `preset`); mode names are presentation only.
 */
const ModeCompatibilityTable = () => {
  return (
    <div className={styles.wrap} tabIndex={0} role="region" aria-label="Mode to preset mapping">
      <table className={styles.table}>
        <caption className={styles.caption}>
          Each mode applies one runtime preset. Preset keys are unchanged.
        </caption>
        <thead>
          <tr>
            <th scope="col">Mode</th>
            <th scope="col">Runtime preset</th>
            <th scope="col">Risk</th>
          </tr>
        </thead>
        <tbody>
          {PRODUCT_MODES.map((mode) => (
            <tr key={mode.key}>
              <th scope="row">{mode.label}</th>
              <td>
                <code>{mode.preset}</code>
              </td>
              <td>{RISK_LABEL[mode.risk]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ModeCompatibilityTable;
