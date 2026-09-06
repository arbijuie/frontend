import styles from "./GateStatusBanner.module.scss";
import type { BacktestGateResponse } from "../../api/types";

interface GateStatusBannerProps {
  gate: BacktestGateResponse;
}

const GateStatusBanner = ({ gate }: GateStatusBannerProps) => {
  return (
    <div className={`${styles.banner} ${gate.passed ? styles.pass : styles.fail}`}>
      <span className={`${styles.badge} ${gate.passed ? styles.passBadge : styles.failBadge}`}>
        {gate.passed ? "Gate: Passed" : "Gate: Not Passed"}
      </span>
      <span>
        {gate.passed
          ? `Strategy ${gate.strategy_id ?? "unknown"} is cleared (lock ${gate.lock_id ?? "—"}).`
          : (gate.reason ?? "No passing strategy lock yet — execution stays disabled.")}
      </span>
    </div>
  );
};

export default GateStatusBanner;
