import { useState } from "react";
import styles from "../OperationsPage.module.scss";
import EmptyState from "../../../components/EmptyState/EmptyState";
import StatCard from "../../../components/StatCard/StatCard";
import FloatingRefreshButton from "../../../components/FloatingRefreshButton/FloatingRefreshButton";
import { useParityArtifacts, useParityReport } from "../../../hooks/useOperations";
import { ApiRequestError, describeApiError } from "../../../lib/api-errors";
import { formatDateTime } from "../../../lib/format";
import type { MigrationParityArtifactItem } from "../../../api/types";

const WINDOW_OPTIONS = [
  { value: 3600, label: "1 hour" },
  { value: 21600, label: "6 hours" },
  { value: 86400, label: "24 hours" },
  { value: 604800, label: "7 days" },
] as const;

function parityTone(status: MigrationParityArtifactItem["parity_status"]): string {
  if (status === "pass") return styles.badgeSuccess;
  if (status === "fail") return styles.badgeDanger;
  if (status === "watching") return styles.badgeWarning;
  return styles.badge;
}

/** A 404 means no shadow run produced artifacts in the window, not a failure. */
function isEmptyWindow(error: Error | null): boolean {
  return error instanceof ApiRequestError && error.status === 404;
}

const ArtifactRow = ({ artifact }: { artifact: MigrationParityArtifactItem }) => {
  const [expanded, setExpanded] = useState(false);
  const diffs = artifact.diffs ?? [];
  const blocked = diffs.filter((diff) => diff.severity === "blocked").length;
  return (
    <>
      <tr>
        <td>{formatDateTime(artifact.generated_at)}</td>
        <td>
          <code>{artifact.attempt_id}</code>
        </td>
        <td>
          <span className={parityTone(artifact.parity_status)}>{artifact.parity_status}</span>
          {!artifact.joinable && <span className={styles.badgeWarning}>not joinable</span>}
        </td>
        <td>
          {artifact.legacy_event_count}/{artifact.shadow_event_count}
        </td>
        <td>
          {artifact.legacy_conflict_count}/{artifact.shadow_conflict_count}
        </td>
        <td>
          {diffs.length === 0 ? (
            "none"
          ) : (
            <button
              type="button"
              className={styles.button}
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {diffs.length} diffs{blocked ? ` (${blocked} blocked)` : ""}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6}>
            <ul className={styles.events} aria-label={`Diffs of ${artifact.attempt_id}`}>
              {diffs.map((diff) => (
                <li key={`${diff.dimension}-${diff.code}`}>
                  <span className={diff.severity === "blocked" ? styles.badgeDanger : styles.badge}>
                    {diff.severity}
                  </span>{" "}
                  {diff.dimension}/{diff.code}: {diff.message}
                  {diff.legacy_value != null || diff.shadow_value != null
                    ? ` (legacy ${diff.legacy_value ?? "-"}, shadow ${diff.shadow_value ?? "-"})`
                    : ""}
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
};

const ParityPanel = () => {
  const [windowS, setWindowS] = useState<number>(3600);
  const report = useParityReport(windowS);
  const artifacts = useParityArtifacts(50);
  const counts: { ok?: number; watching?: number; blocked?: number } =
    report.data?.severity_counts ?? {};
  const reasonCounts = report.data?.reason_counts ?? {};
  const artifactItems = artifacts.data?.items ?? [];

  return (
    <>
      <div className={styles.toolbar}>
        <label className={styles.toolbarLabel} htmlFor="parity-window">
          Report window
        </label>
        <select
          id="parity-window"
          className={styles.select}
          value={windowS}
          onChange={(event) => setWindowS(Number(event.target.value))}
        >
          {WINDOW_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <h2 className={styles.sectionTitle}>Parity report</h2>
      {report.error && !isEmptyWindow(report.errorObject) && (
        <div className={styles.errorBox} role="alert">
          {describeApiError(report.errorObject)}
        </div>
      )}
      {isEmptyWindow(report.errorObject) && (
        <EmptyState
          title="No parity data in this window"
          description="No shadow-compared attempt produced an artifact. Widen the window or wait for the next attempt."
        />
      )}
      {report.loading && !report.data && <div role="status">Loading parity report...</div>}
      {report.data && (
        <>
          <div
            className={report.data.parity_passed ? styles.okNote : styles.dangerNote}
            role="status"
          >
            Parity {report.data.parity_passed ? "passed" : "FAILED"} over{" "}
            {report.data.attempts_analyzed} attempts ({formatDateTime(report.data.window_start)} to{" "}
            {formatDateTime(report.data.window_end)})
            {(report.data.not_evaluated_count ?? 0) > 0
              ? `, ${report.data.not_evaluated_count} not evaluated`
              : ""}
            .
          </div>
          <div className={styles.stats}>
            <StatCard label="OK" value={counts.ok ?? 0} color="green" />
            <StatCard
              label="Watching"
              value={counts.watching ?? 0}
              color={(counts.watching ?? 0) > 0 ? "yellow" : undefined}
            />
            <StatCard
              label="Blocked"
              value={counts.blocked ?? 0}
              color={(counts.blocked ?? 0) > 0 ? "red" : undefined}
            />
          </div>
          {Object.keys(reasonCounts).length > 0 && (
            <ul aria-label="Parity reason counts">
              {Object.entries(reasonCounts).map(([reason, count]) => (
                <li key={reason}>
                  {reason}: {count}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <h2 className={styles.sectionTitle}>Artifacts</h2>
      {artifacts.error && (
        <div className={styles.errorBox} role="alert">
          {describeApiError(artifacts.errorObject)}
        </div>
      )}
      {artifacts.loading && !artifacts.data && <div role="status">Loading artifacts...</div>}
      {artifacts.data && artifactItems.length === 0 && (
        <EmptyState
          title="No parity artifacts"
          description="Artifacts are written per shadow-compared attempt."
        />
      )}
      {artifacts.data && artifactItems.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Parity artifacts">
            <thead>
              <tr>
                <th>Generated</th>
                <th>Attempt</th>
                <th>Parity</th>
                <th>Events legacy/shadow</th>
                <th>Conflicts legacy/shadow</th>
                <th>Diffs</th>
              </tr>
            </thead>
            <tbody>
              {artifactItems.map((artifact) => (
                <ArtifactRow
                  key={`${artifact.attempt_id}-${artifact.generated_at}`}
                  artifact={artifact}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FloatingRefreshButton
        fetching={report.fetching || artifacts.fetching}
        onClick={() => void Promise.all([report.refetch(), artifacts.refetch()])}
        label="Refresh parity"
      />
    </>
  );
};

export default ParityPanel;
