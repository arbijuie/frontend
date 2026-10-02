import { useState } from "react";
import pageStyles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";
import styles from "./AutomationPage.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import EmptyState from "../../components/EmptyState/EmptyState";
import FloatingRefreshButton from "../../components/FloatingRefreshButton/FloatingRefreshButton";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAutomation, useAutomationControl } from "../../hooks/useAutomation";
import type { AutomationModeItem, AutomationOverviewResponse } from "../../api/types";

const MODE_TITLE: Record<AutomationModeItem["kind"], string> = {
  entry: "Auto-entry",
  exit: "Auto-exit",
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
    warnings.push("Execution is disabled: automation cannot open or close pairs.");
  }
  if (!posture.gate_passed) {
    warnings.push(`Execution gate is not passed (${posture.gate_reason ?? "unknown reason"}).`);
  }
  if (posture.entries_stopped) {
    warnings.push(
      `New entries are stopped after ${posture.consecutive_rollbacks} consecutive rollbacks.`
    );
  }
  for (const guardrail of posture.guardrail_entry_blocks ?? []) {
    warnings.push(`Guardrail "${guardrail}" blocks new entries.`);
  }
  return warnings;
}

interface ModeCardProps {
  mode: AutomationModeItem;
  pending: boolean;
  onControl: (action: "pause" | "resume", reason: string) => void;
}

const ModeCard = ({ mode, pending, onControl }: ModeCardProps) => {
  const [reason, setReason] = useState("");
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
          {mode.state}
        </span>
      </div>
      <ul className={styles.facts}>
        <li>enabled: {String(mode.enabled)}</li>
        {mode.paused && (
          <li>
            paused {formatTime(mode.paused_at)} by {mode.paused_by ?? "-"}: {mode.pause_reason}
          </li>
        )}
        <li>last run: {formatTime(mode.last_run_at)}</li>
        <li>
          actions: {mode.actions_total ?? 0} (failures {mode.failures_total ?? 0})
        </li>
        <li>
          last action: {mode.last_action_symbol ?? "-"} {mode.last_action_outcome ?? ""}
        </li>
        {(mode.blockers ?? []).length > 0 && <li>blockers: {(mode.blockers ?? []).join(", ")}</li>}
      </ul>
      <div className={styles.controls}>
        {mode.paused ? (
          <button
            type="button"
            className={styles.button}
            disabled={pending}
            onClick={() => onControl("resume", "")}
          >
            Resume {title.toLowerCase()}
          </button>
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
  usePageTitle("Automation");
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
        title="Automation"
        subtitle="Autonomous entry and exit: state, guardrails, and operator controls"
      />

      {error && <div className={pageStyles.errorBox}>Automation error: {error}</div>}
      {control.error && (
        <div className={pageStyles.errorBox}>Control failed: {control.error.message}</div>
      )}
      {loading && !data && <div>Loading automation...</div>}
      {!loading && !data && !error && (
        <EmptyState title="No automation data" description="The runtime has not answered yet." />
      )}

      {data && (
        <>
          <div className={pageStyles.summaryRow}>
            <span className={pageStyles.summaryPill}>
              mode: {data.posture.exec_dry_run ? "dry-run" : "live"}
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
              Guardrails are holding automation back:
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
                  {item.short_exchange} score {item.score_bps.toFixed(2)} bps →{" "}
                  {item.outcome ?? "pending"}
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
                  {formatTime(item.evaluated_at)} {item.symbol} on {item.trigger ?? "-"} →{" "}
                  {item.outcome ?? "pending"}
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
