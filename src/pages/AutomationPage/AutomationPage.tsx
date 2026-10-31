import { useState } from "react";
import pageStyles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";
import styles from "./AutomationPage.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import EmptyState from "../../components/EmptyState/EmptyState";
import FloatingRefreshButton from "../../components/FloatingRefreshButton/FloatingRefreshButton";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAutomation, useAutomationControl } from "../../hooks/useAutomation";
import AutomationDecisionLogs from "./AutomationDecisionLogs";
import RealMoneyConfirm from "../../components/RealMoneyConfirm/RealMoneyConfirm";
import AutoSummaryCard from "../../components/AutoSummary/AutoSummaryCard";
import { autoSummary } from "../../lib/autoSummary";
import { plainCode } from "../../lib/plainReasons";
import type { AutomationModeItem, AutomationOverviewResponse } from "../../api/types";

const MODE_TITLE: Record<AutomationModeItem["kind"], string> = {
  entry: "Auto-entry",
  exit: "Auto-exit",
};

const STATE_LABEL: Record<AutomationModeItem["state"], string> = {
  armed: "Ready to act",
  blocked: "Held back",
  paused: "Paused",
  disabled: "Turned off",
};

const STATE_HELP: Record<AutomationModeItem["state"], string> = {
  armed: "The next pass may act.",
  blocked: "Configured and not paused, but the blockers below stop it.",
  paused: "Held by an operator; passes are skipped until resumed.",
  disabled: "Not enabled in configuration.",
};

const formatTime = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleString() : "-";

function postureWarnings(data: AutomationOverviewResponse): string[] {
  const { posture } = data;
  const warnings: string[] = [];
  if (!posture.exec_enabled) {
    warnings.push("Trading is turned off in settings, so the bot cannot open or close deals.");
  }
  if (!posture.gate_passed) {
    warnings.push(
      `A safety check is not passing yet: ${posture.gate_reason ? plainCode(posture.gate_reason).toLowerCase() : "reason unknown"}.`
    );
  }
  if (posture.entries_stopped) {
    warnings.push(
      `New deals are stopped after ${posture.consecutive_rollbacks} failed openings in a row.`
    );
  }
  for (const guardrail of posture.guardrail_entry_blocks ?? []) {
    warnings.push(`Safety rule "${plainCode(guardrail)}" stops new deals.`);
  }
  return warnings;
}

interface ModeCardProps {
  mode: AutomationModeItem;
  pending: boolean;
  realMoney: boolean;
  onControl: (action: "pause" | "resume", reason: string) => void;
}

const ModeCard = ({ mode, pending, realMoney, onControl }: ModeCardProps) => {
  const [reason, setReason] = useState("");
  const [realMoneyOk, setRealMoneyOk] = useState(false);
  const needsRealMoneyOk = realMoney && mode.kind === "entry";
  const title = MODE_TITLE[mode.kind];
  const canPause = reason.trim().length >= 3;

  return (
    <section className={styles.card} aria-label={title}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <span
          className={`${styles.state} ${styles[mode.state]}`}
          title={STATE_HELP[mode.state]}
          data-testid={`${mode.kind}-state`}
        >
          {STATE_LABEL[mode.state]}
        </span>
      </div>
      <ul className={styles.facts}>
        <li>Turned on: {mode.enabled ? "Yes" : "No"}</li>
        {mode.paused && (
          <li>
            Paused {formatTime(mode.paused_at)} by {mode.paused_by ?? "-"}: {mode.pause_reason}
          </li>
        )}
        <li>Last run: {formatTime(mode.last_run_at)}</li>
        <li>
          Actions: {mode.actions_total ?? 0} (failures {mode.failures_total ?? 0})
        </li>
        <li>
          Last action: {mode.last_action_symbol ?? "-"} {plainCode(mode.last_action_outcome)}
        </li>
        {(mode.blockers ?? []).length > 0 && (
          <li>Held back by: {(mode.blockers ?? []).map(plainCode).join("; ")}</li>
        )}
      </ul>
      <div className={styles.controls}>
        {mode.state === "disabled" && !mode.paused ? (
          <span className={styles.decisionReasons}>Turned off in settings — nothing to pause.</span>
        ) : mode.paused ? (
          <div>
            {needsRealMoneyOk && (
              <RealMoneyConfirm
                action="let the bot open deals"
                checked={realMoneyOk}
                onChange={setRealMoneyOk}
              />
            )}
            <button
              type="button"
              className={styles.button}
              disabled={pending || (needsRealMoneyOk && !realMoneyOk)}
              onClick={() => {
                onControl("resume", "");
                setRealMoneyOk(false);
              }}
            >
              Resume {title.toLowerCase()}
            </button>
          </div>
        ) : (
          <>
            <input
              className={styles.reasonInput}
              aria-label={`${title} pause reason`}
              placeholder="Reason (required to pause)"
              value={reason}
              maxLength={200}
              onChange={(event) => setReason(event.target.value)}
            />
            <button
              type="button"
              className={styles.button}
              disabled={pending || !canPause}
              onClick={() => {
                onControl("pause", reason.trim());
                setReason("");
              }}
            >
              Pause {title.toLowerCase()}
            </button>
          </>
        )}
      </div>
    </section>
  );
};

const AutomationPage = () => {
  usePageTitle("Auto");
  const { data, error, loading, fetching, refetch } = useAutomation();
  const control = useAutomationControl();

  const handleControl =
    (kind: AutomationModeItem["kind"]) => (action: "pause" | "resume", reason: string) => {
      control.mutate({ target: kind, action, reason });
    };

  const warnings = data ? postureWarnings(data) : [];

  return (
    <div className={pageStyles.page}>
      <PageHeader
        title="Auto"
        subtitle="Let the bot open and close deals for you, and pause it any time"
      />

      {error && (
        <div className={pageStyles.errorBox} role="alert">
          Could not load auto-trading: {error}
        </div>
      )}
      {control.error && (
        <div className={pageStyles.errorBox} role="alert">
          Pause / resume failed: {control.error.message}
        </div>
      )}
      {loading && !data && <div role="status">Loading auto-trading…</div>}
      {!loading && !data && !error && (
        <EmptyState
          title="No auto-trading data yet"
          description="The server has not answered yet. Try refreshing in a moment."
        />
      )}

      {data && (
        <>
          <AutoSummaryCard summary={autoSummary(data)} />
          <div className={pageStyles.summaryRow}>
            <span className={pageStyles.summaryPill}>
              {data.posture.exec_dry_run ? "Practice mode" : "Real money"}
            </span>
            <span className={pageStyles.summaryPill}>
              open positions: {data.posture.open_positions ?? 0}
            </span>
            <span className={pageStyles.summaryPill}>
              checked: {new Date(data.checked_at).toLocaleTimeString()}
            </span>
          </div>

          {warnings.length > 0 && (
            <div className={styles.banner} role="alert">
              Safety checks are holding the bot back:
              <ul className={styles.bannerList}>
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.modes}>
            {[data.entry, data.exit].map((mode) => (
              <ModeCard
                key={mode.kind}
                mode={mode}
                pending={control.isPending}
                realMoney={data.posture.exec_enabled && !data.posture.exec_dry_run}
                onControl={handleControl(mode.kind)}
              />
            ))}
          </div>

          <h2 className={pageStyles.sectionTitle}>Recent automated entries</h2>
          {(data.recent_entries ?? []).length === 0 ? (
            <div>No automated entries yet.</div>
          ) : (
            <ul>
              {(data.recent_entries ?? []).map((item) => (
                <li key={`${item.evaluated_at}-${item.symbol}`}>
                  {formatTime(item.evaluated_at)} {item.symbol} {item.long_exchange}/
                  {item.short_exchange}, expected edge {(item.score_bps / 100).toFixed(2)}% →{" "}
                  {item.outcome ? plainCode(item.outcome) : "Pending"}
                </li>
              ))}
            </ul>
          )}

          <h2 className={pageStyles.sectionTitle}>Recent automated exits</h2>
          {(data.recent_exits ?? []).length === 0 ? (
            <div>No automated exits yet.</div>
          ) : (
            <ul>
              {(data.recent_exits ?? []).map((item) => (
                <li key={`${item.evaluated_at}-${item.attempt_id}`}>
                  {formatTime(item.evaluated_at)} {item.symbol}, reason:{" "}
                  {item.trigger ? plainCode(item.trigger) : "-"} →{" "}
                  {item.outcome ? plainCode(item.outcome) : "Pending"}
                </li>
              ))}
            </ul>
          )}

          <h2 className={pageStyles.sectionTitle}>Control log</h2>
          {(data.control_log ?? []).length === 0 ? (
            <div>No operator actions yet.</div>
          ) : (
            <ul>
              {(data.control_log ?? []).map((event) => (
                <li key={`${event.at}-${event.kind}-${event.action}`}>
                  {formatTime(event.at)} {event.actor} {event.action}d auto-{event.kind}
                  {event.reason ? `: ${event.reason}` : ""}
                  {event.changed ? "" : " (no change)"}
                </li>
              ))}
            </ul>
          )}

          <AutomationDecisionLogs />
        </>
      )}

      <FloatingRefreshButton
        fetching={fetching}
        onClick={() => void refetch()}
        label="Refresh automation"
      />
    </div>
  );
};

export default AutomationPage;
