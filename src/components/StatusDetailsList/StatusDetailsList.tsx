import styles from "./StatusDetailsList.module.scss";
import type { StatusResponse } from "../../api/types";
import { formatDateTime } from "../../lib/format";

interface StatusDetailsListProps {
  status: StatusResponse;
}

const StatusDetailsList = ({ status }: StatusDetailsListProps) => {
  const rows = [
    { label: "Started at", value: formatDateTime(status.started_at) },
    { label: "Last updated", value: formatDateTime(status.last_updated_at ?? null) },
    { label: "Last poll started", value: formatDateTime(status.last_poll_started_at ?? null) },
    { label: "Last poll finished", value: formatDateTime(status.last_poll_finished_at ?? null) },
    { label: "Screener raw candidates", value: String(status.screener_raw_candidates) },
    { label: "Screener after cost", value: String(status.screener_post_cost_candidates) },
    {
      label: "Screener validated candidates",
      value: String(status.screener_validated_candidates),
    },
    { label: "Screener ready candidates", value: String(status.screener_ready_candidates) },
  ];

  return (
    <div className={styles.card}>
      {rows.map((row) => (
        <div key={row.label} className={styles.row}>
          <span className={styles.label}>{row.label}</span>
          <span className={styles.value}>{row.value}</span>
        </div>
      ))}
    </div>
  );
};

export default StatusDetailsList;
