import { Link } from "react-router-dom";
import styles from "../OperationsPage.module.scss";
import EmptyState from "../../../components/EmptyState/EmptyState";
import StatCard from "../../../components/StatCard/StatCard";
import FloatingRefreshButton from "../../../components/FloatingRefreshButton/FloatingRefreshButton";
import { useRiskGuardrails } from "../../../hooks/useOperations";
import { describeApiError } from "../../../lib/api-errors";
import { formatDateTime } from "../../../lib/format";
import { GUARDRAIL_NEXT_STEP } from "../../../lib/operations";
import type { GuardrailDecisionItem } from "../../../api/types";

function severityTone(severity: string): string {
  if (severity === "critical") return styles.badgeDanger;
  if (severity === "warning") return styles.badgeWarning;
  return styles.badgeInfo;
}

const DecisionRow = ({ decision }: { decision: GuardrailDecisionItem }) => (
  <tr>
    <td>{formatDateTime(decision.evaluated_at)}</td>
    <td>{decision.guardrail}</td>
    <td>
      <span className={severityTone(decision.severity)}>{decision.severity}</span>
    </td>
    <td>{decision.action}</td>
    <td>
      {decision.exchange ?? "-"}
      {decision.symbol ? ` ${decision.symbol}` : ""}
    </td>
    <td className={styles.wrap}>
      {decision.reason}
      {decision.observed != null && decision.threshold != null
        ? ` (observed ${decision.observed}, threshold ${decision.threshold})`
        : ""}
    </td>
    <td className={styles.wrap}>{GUARDRAIL_NEXT_STEP[decision.guardrail] ?? "See the runbook."}</td>
  </tr>
);

const GuardrailsPanel = () => {
  const guardrails = useRiskGuardrails();
  const data = guardrails.data;
  const blocking = data?.blocking_guardrails ?? [];
  const accountSources = data?.account_sources ?? [];
  const decisions = data?.decisions ?? [];
  const closeRecords = data?.close_records ?? [];
  const thresholds = data?.thresholds ?? {};
  const capital = data?.capital;

  return (
    <>
      {guardrails.error && (
        <div className={styles.errorBox} role="alert">
          {describeApiError(guardrails.errorObject)}
        </div>
      )}
      {guardrails.loading && !data && <div role="status">Loading guardrails...</div>}
      {data && (
        <>
          <div className={data.entries_blocked ? styles.dangerNote : styles.okNote} role="status">
            {data.entries_blocked
              ? `New entries are blocked by: ${blocking.join(", ")}.`
              : "No guardrail blocks new entries."}
            {" Readiness context: "}
            <Link className={styles.link} to="/execution/preflight">
              execution preflight
            </Link>
            .
          </div>
          <div className={styles.stats}>
            <StatCard
              label="Last pass"
              value={data.last_evaluated_at ? formatDateTime(data.last_evaluated_at) : "never"}
            />
            <StatCard label="Monitored positions" value={data.monitored_positions ?? 0} />
            <StatCard
              label="Entry blocks"
              value={data.entry_blocks_total ?? 0}
              color={(data.entry_blocks_total ?? 0) > 0 ? "yellow" : undefined}
            />
            <StatCard
              label="Recent closes"
              value={data.recent_closes ?? 0}
              sub={`${data.recent_close_failures ?? 0} failed`}
              color={(data.recent_close_failures ?? 0) > 0 ? "red" : undefined}
            />
          </div>
          {data.last_error && (
            <div className={styles.errorBox} role="alert">
              Last guardrail pass failed: {data.last_error}
            </div>
          )}
          {accountSources.length === 0 && (
            <p className={styles.hint}>
              No venue account is configured, so the margin guardrail has no input and is skipped.
            </p>
          )}

          <h2 className={styles.sectionTitle}>Current decisions</h2>
          {decisions.length === 0 ? (
            <EmptyState title="No guardrail decisions in the last pass" />
          ) : (
            <div
              className={styles.tableWrap}
              role="region"
              aria-label="Guardrail decisions table"
              tabIndex={0}
            >
              <table className={styles.table} aria-label="Guardrail decisions">
                <thead>
                  <tr>
                    <th>Evaluated</th>
                    <th>Guardrail</th>
                    <th>Severity</th>
                    <th>Action</th>
                    <th>Subject</th>
                    <th>Reason</th>
                    <th>Next step</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((decision, index) => (
                    <DecisionRow key={`${decision.evaluated_at}-${index}`} decision={decision} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className={styles.sectionTitle}>Guardrail closes</h2>
          {closeRecords.length === 0 ? (
            <p className={styles.hint}>No guardrail has closed a position.</p>
          ) : (
            <div
              className={styles.tableWrap}
              role="region"
              aria-label="Guardrail closes table"
              tabIndex={0}
            >
              <table className={styles.table} aria-label="Guardrail closes">
                <thead>
                  <tr>
                    <th>At</th>
                    <th>Attempt</th>
                    <th>Guardrail</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {closeRecords.map((record) => (
                    <tr key={`${record.at}-${record.attempt_id}`}>
                      <td>{formatDateTime(record.at)}</td>
                      <td>
                        <code>{record.attempt_id}</code>
                      </td>
                      <td>{record.guardrail}</td>
                      <td>
                        <span
                          className={
                            record.status === "closed" ? styles.badgeSuccess : styles.badgeDanger
                          }
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className={styles.wrap}>{record.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className={styles.sectionTitle}>Thresholds</h2>
          <div
            className={styles.tableWrap}
            role="region"
            aria-label="Guardrail thresholds table"
            tabIndex={0}
          >
            <table className={styles.table} aria-label="Guardrail thresholds">
              <tbody>
                {Object.entries(thresholds).map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className={styles.sectionTitle}>Capital limits</h2>
          {!capital?.enabled ? (
            <p className={styles.hint}>
              Capital-aware sizing is off (ARB_EXEC_MAX_CAPITAL_USD is 0).
            </p>
          ) : (
            <div className={styles.stats}>
              <StatCard
                label="Committed capital"
                value={`$${(capital.committed_capital_usd ?? 0).toFixed(2)}`}
              />
              <StatCard label="Daily PnL" value={`$${(capital.daily_pnl_usd ?? 0).toFixed(2)}`} />
              <StatCard
                label="Daily loss limit"
                value={`$${(capital.daily_loss_limit_usd ?? 0).toFixed(2)}`}
              />
              <StatCard
                label="Rejections"
                value={Object.values(capital.rejections ?? {}).reduce(
                  (sum, count) => sum + count,
                  0
                )}
              />
            </div>
          )}
        </>
      )}
      <FloatingRefreshButton
        fetching={guardrails.fetching}
        onClick={() => void guardrails.refetch()}
        label="Refresh guardrails"
      />
    </>
  );
};

export default GuardrailsPanel;
