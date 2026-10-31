import { useId, useState } from "react";
import pageStyles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";
import styles from "./AutomationPage.module.scss";
import Tabs from "../../components/Tabs/Tabs";
import EmptyState from "../../components/EmptyState/EmptyState";
import { tabId, tabPanelId } from "../../lib/tabIds";
import {
  DECISION_LIMITS,
  useAutomationDecisions,
  type DecisionKind,
  type DecisionLimit,
} from "../../hooks/useAutomationDecisions";
import type { AutoEntryDecisionItem, AutoExitDecisionItem } from "../../api/types";

const KIND_TABS = [
  { key: "entry", label: "Entry decisions" },
  { key: "exit", label: "Exit decisions" },
];

const formatTime = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleString() : "-";

const EntryRow = ({ item }: { item: AutoEntryDecisionItem }) => (
  <li className={styles.decision}>
    <span className={styles.decisionTime}>{formatTime(item.evaluated_at)}</span>{" "}
    <strong>{item.symbol}</strong> {item.long_exchange}/{item.short_exchange} ·{" "}
    {item.score_bps.toFixed(2)} bps ·{" "}
    <span className={item.action === "enter" ? styles.armed : styles.disabled}>{item.action}</span>
    {item.outcome ? ` → ${item.outcome}` : ""}
    {item.attempt_id ? ` (${item.attempt_id})` : ""}
    {(item.reasons ?? []).length > 0 && (
      <span className={styles.decisionReasons}> · {(item.reasons ?? []).join("; ")}</span>
    )}
  </li>
);

const ExitRow = ({ item }: { item: AutoExitDecisionItem }) => (
  <li className={styles.decision}>
    <span className={styles.decisionTime}>{formatTime(item.evaluated_at)}</span>{" "}
    <strong>{item.symbol}</strong> ({item.attempt_id}) · held {item.held_hours.toFixed(1)} h ·{" "}
    <span className={item.action === "exit" ? styles.blocked : styles.armed}>{item.action}</span>
    {item.trigger ? ` on ${item.trigger}` : ""}
    {item.outcome ? ` → ${item.outcome}` : ""}
    {item.reason && <span className={styles.decisionReasons}> · {item.reason}</span>}
  </li>
);

/**
 * Entry and exit evaluator logs (issue #510). These are decision-engine outputs, kept apart
 * from the operator control log above them; only the selected kind and page size is fetched.
 */
const AutomationDecisionLogs = () => {
  const tabsId = useId();
  const [kind, setKind] = useState<DecisionKind>("entry");
  const [limit, setLimit] = useState<DecisionLimit>(50);
  const decisions = useAutomationDecisions(kind, limit);
  const items = decisions.data?.items ?? [];

  return (
    <section aria-labelledby={`${tabsId}-title`}>
      <h2 id={`${tabsId}-title`} className={pageStyles.sectionTitle}>
        Decision logs
      </h2>
      <p className={pageStyles.hint}>
        What the evaluators decided on each pass. Operator pauses and resumes are in the control
        log, not here.
      </p>
      <div className={styles.controls}>
        <Tabs
          tabs={KIND_TABS}
          activeKey={kind}
          onChange={(key) => setKind(key as DecisionKind)}
          label="Decision kind"
          idPrefix={tabsId}
        />
        <label className={pageStyles.filterLabel} htmlFor={`${tabsId}-limit`}>
          Show
        </label>
        <select
          id={`${tabsId}-limit`}
          className={pageStyles.filterSelect}
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value) as DecisionLimit)}
        >
          {DECISION_LIMITS.map((option) => (
            <option key={option} value={option}>
              last {option}
            </option>
          ))}
        </select>
      </div>
      <div role="tabpanel" id={tabPanelId(tabsId, kind)} aria-labelledby={tabId(tabsId, kind)}>
        {decisions.error && (
          <div className={pageStyles.errorBox} role="alert">
            Decision log error: {decisions.error}
          </div>
        )}
        {decisions.loading && !decisions.data && <div role="status">Loading decisions...</div>}
        {decisions.data && items.length === 0 && (
          <EmptyState
            title={`No ${kind} decisions yet`}
            description="The evaluator records one decision per candidate per pass once it runs."
          />
        )}
        {items.length > 0 && (
          <ul className={styles.decisionList} aria-label={`${kind} decisions`}>
            {kind === "entry"
              ? (items as AutoEntryDecisionItem[]).map((item) => (
                  <EntryRow key={`${item.evaluated_at}-${item.symbol}`} item={item} />
                ))
              : (items as AutoExitDecisionItem[]).map((item) => (
                  <ExitRow key={`${item.evaluated_at}-${item.attempt_id}`} item={item} />
                ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default AutomationDecisionLogs;
