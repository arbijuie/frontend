import styles from "./RecoveryHealthCard.module.scss";
import type { StatusResponse } from "../../api/types";
import StatCard from "../StatCard/StatCard";

interface RecoveryHealthCardProps {
  status: StatusResponse;
}

function severityFromResult(result: string): "green" | "yellow" | "red" {
  if (result === "completed") {
    return "green";
  }
  if (result === "failed") {
    return "red";
  }
  if (result === "not_attempted") {
    return "yellow";
  }
  return "yellow";
}

const RecoveryHealthCard = ({ status }: RecoveryHealthCardProps) => {
  const continuity = status.snapshot_continuity;
  const result = continuity?.recovery_result ?? "not_attempted";
  const durationMs = continuity?.last_recovery_duration_ms;

  return (
    <div className={styles.grid}>
      <StatCard label="Startup Recovery" value={result} color={severityFromResult(result)} />
      <StatCard
        label="Recovery Scanned Rows"
        value={String(continuity?.last_recovery_scanned_rows ?? 0)}
      />
      <StatCard
        label="Recovery Duration"
        value={durationMs != null ? `${Math.round(durationMs)} ms` : "-"}
      />
      <StatCard label="Recovery Max Rows" value={String(continuity?.recovery_max_rows ?? 0)} />
    </div>
  );
};

export default RecoveryHealthCard;
