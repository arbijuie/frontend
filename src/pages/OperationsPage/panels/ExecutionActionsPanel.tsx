import { useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import styles from "../OperationsPage.module.scss";
import EmptyState from "../../../components/EmptyState/EmptyState";
import FloatingRefreshButton from "../../../components/FloatingRefreshButton/FloatingRefreshButton";
import RealMoneyConfirm from "../../../components/RealMoneyConfirm/RealMoneyConfirm";
import { useExecutionPreflight } from "../../../hooks/useExecutionPreflight";
import {
  useExecutionAttempts,
  useExecutionClose,
  useExecutionOpen,
} from "../../../hooks/useOperations";
import { KNOWN_EXCHANGES } from "../../../lib/exchanges";
import { describeApiError } from "../../../lib/api-errors";
import { formatDateTime } from "../../../lib/format";
import type { ExecutionAttemptItem, ExecutionOpenRequest } from "../../../api/types";

type Pending =
  | { kind: "open"; payload: ExecutionOpenRequest }
  | { kind: "close"; payload: { attempt_id: string; reason: string } };

const TERMINAL_FAILURES = new Set(["rejected", "rolled_back", "rollback_failed", "close_failed"]);

function attemptTone(status: string): string {
  if (status === "active" || status === "closed") return styles.badgeSuccess;
  if (TERMINAL_FAILURES.has(status)) return styles.badgeDanger;
  if (status.includes("pending") || status.includes("closing") || status === "submitted") {
    return styles.badgeWarning;
  }
  return styles.badge;
}

function modeLabel(execEnabled: boolean | undefined, dryRun: boolean | undefined): string {
  if (!execEnabled) return "execution disabled";
  return dryRun ? "dry-run" : "LIVE";
}

const AttemptRow = ({ attempt }: { attempt: ExecutionAttemptItem }) => {
  const failure = attempt.error ?? attempt.abort_reason ?? null;
  return (
    <tr>
      <td>{formatDateTime(attempt.created_at)}</td>
      <td>
        <code>{attempt.attempt_id}</code>
      </td>
      <td>
        {attempt.symbol} {attempt.long_exchange}/{attempt.short_exchange}
      </td>
      <td>
        <span className={attemptTone(attempt.status)}>{attempt.status}</span>
        {attempt.dry_run ? <span className={styles.badgeInfo}>dry-run</span> : null}
      </td>
      <td className={styles.wrap}>
        {failure ? <span className={styles.badgeDanger}>{failure}</span> : "-"}
        {attempt.residual_exposure ? (
          <span className={styles.badgeDanger}>residual exposure</span>
        ) : null}
        {(attempt.events ?? []).length > 0 && (
          <ul className={styles.events} aria-label={`Transitions of ${attempt.attempt_id}`}>
            {(attempt.events ?? []).map((event, index) => (
              <li key={`${attempt.attempt_id}-${index}`}>{event}</li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
};

const ExecutionActionsPanel = () => {
  const ids = useId();
  const { data: preflight, error: preflightError } = useExecutionPreflight();
  const attempts = useExecutionAttempts(50);
  const open = useExecutionOpen();
  const close = useExecutionClose();

  const [symbol, setSymbol] = useState("");
  const [longExchange, setLongExchange] = useState<string>("hyperliquid");
  const [shortExchange, setShortExchange] = useState<string>("lighter");
  const [sizeUsd, setSizeUsd] = useState("");
  const [closeAttemptId, setCloseAttemptId] = useState("");
  const [closeReason, setCloseReason] = useState("manual close");
  const [pending, setPending] = useState<Pending | null>(null);
  const [realMoneyOk, setRealMoneyOk] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ExecutionAttemptItem | null>(null);

  const execEnabled = preflight?.mode.exec_enabled;
  const dryRun = preflight?.mode.exec_dry_run;
  const blockers = preflight?.blockers ?? [];
  const blocked = preflight?.decision === "blocked";
  const busy = open.isPending || close.isPending;
  const realMoney = execEnabled === true && dryRun === false;

  let openDisabledReason: string | null = null;
  if (!preflight) {
    openDisabledReason = preflightError
      ? "The safety check could not be reached."
      : "Waiting for the safety check to answer.";
  } else if (!execEnabled) {
    openDisabledReason = "Trading is turned off, so deals cannot be opened.";
  } else if (blocked) {
    openDisabledReason = "The safety check blocks opening right now.";
  }
  const canOpen = openDisabledReason === null;

  const closePending = () => {
    setPending(null);
    setRealMoneyOk(false);
  };

  const requestOpen = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!canOpen) return;
    const trimmed = symbol.trim().toUpperCase();
    if (!trimmed) {
      setFormError("Enter a symbol.");
      return;
    }
    if (longExchange === shortExchange) {
      setFormError("Long and short venues must differ.");
      return;
    }
    const payload: ExecutionOpenRequest = {
      symbol: trimmed,
      long_exchange: longExchange,
      short_exchange: shortExchange,
    };
    if (sizeUsd.trim()) {
      const parsed = Number(sizeUsd);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setFormError("Size must be a positive number of USD.");
        return;
      }
      payload.size_usd = parsed;
    }
    setRealMoneyOk(false);
    setPending({ kind: "open", payload });
  };

  const requestClose = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const attemptId = closeAttemptId.trim();
    if (!attemptId) {
      setFormError("Enter the attempt id to close.");
      return;
    }
    setRealMoneyOk(false);
    setPending({
      kind: "close",
      payload: { attempt_id: attemptId, reason: closeReason.trim() || "manual close" },
    });
  };

  const confirmBlocked = pending?.kind === "open" && (!canOpen || (realMoney && !realMoneyOk));

  const confirm = async () => {
    if (!pending || confirmBlocked) return;
    try {
      const result =
        pending.kind === "open"
          ? await open.mutateAsync(pending.payload)
          : await close.mutateAsync(pending.payload);
      setLastResult(result);
      closePending();
    } catch {
      // The mutation keeps the error; the banner below renders it.
      closePending();
    }
  };

  const mutationError = open.error ?? close.error;
  const attemptItems = attempts.data?.items ?? [];

  return (
    <>
      <div className={blocked || !execEnabled ? styles.dangerNote : styles.infoNote} role="status">
        Mode: <strong>{modeLabel(execEnabled, dryRun)}</strong>
        {preflight ? ` · preflight ${preflight.decision}` : " · preflight unknown"}
        {blockers.length > 0 && (
          <>
            {" · blockers: "}
            {blockers.map((item) => item.code).join(", ")}
          </>
        )}
        {" · "}
        <Link className={styles.link} to="/execution/preflight">
          preflight details
        </Link>
      </div>

      <div className={styles.cards}>
        <section className={styles.card} aria-labelledby={`${ids}-open-title`}>
          <h2 id={`${ids}-open-title`} className={styles.cardTitle}>
            Open a two-leg pair
          </h2>
          <form className={styles.form} onSubmit={requestOpen}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${ids}-symbol`}>
                Symbol
              </label>
              <input
                id={`${ids}-symbol`}
                className={styles.input}
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder="BTC"
                autoComplete="off"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${ids}-long`}>
                Long venue
              </label>
              <select
                id={`${ids}-long`}
                className={styles.select}
                value={longExchange}
                onChange={(event) => setLongExchange(event.target.value)}
              >
                {KNOWN_EXCHANGES.map((venue) => (
                  <option key={venue} value={venue}>
                    {venue}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${ids}-short`}>
                Short venue
              </label>
              <select
                id={`${ids}-short`}
                className={styles.select}
                value={shortExchange}
                onChange={(event) => setShortExchange(event.target.value)}
              >
                {KNOWN_EXCHANGES.map((venue) => (
                  <option key={venue} value={venue}>
                    {venue}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${ids}-size`}>
                Size in USD (optional, default from config)
              </label>
              <input
                id={`${ids}-size`}
                className={styles.input}
                inputMode="decimal"
                value={sizeUsd}
                onChange={(event) => setSizeUsd(event.target.value)}
                placeholder="100"
              />
            </div>
            {openDisabledReason && <p className={styles.hint}>{openDisabledReason}</p>}
            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton} disabled={busy || !canOpen}>
                Review open request
              </button>
            </div>
          </form>
        </section>

        <section className={styles.card} aria-labelledby={`${ids}-close-title`}>
          <h2 id={`${ids}-close-title`} className={styles.cardTitle}>
            Close a pair
          </h2>
          <form className={styles.form} onSubmit={requestClose}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${ids}-attempt`}>
                Attempt id
              </label>
              <input
                id={`${ids}-attempt`}
                className={styles.input}
                value={closeAttemptId}
                onChange={(event) => setCloseAttemptId(event.target.value)}
                placeholder="attempt id from the list below"
                autoComplete="off"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${ids}-reason`}>
                Reason
              </label>
              <input
                id={`${ids}-reason`}
                className={styles.input}
                value={closeReason}
                maxLength={200}
                onChange={(event) => setCloseReason(event.target.value)}
              />
            </div>
            <div className={styles.actions}>
              <button type="submit" className={styles.button} disabled={busy || !execEnabled}>
                Review close request
              </button>
            </div>
          </form>
        </section>
      </div>

      {formError && (
        <div className={styles.errorBox} role="alert">
          {formError}
        </div>
      )}

      {pending && (
        <div className={styles.dangerNote} role="alertdialog" aria-labelledby={`${ids}-confirm`}>
          <strong id={`${ids}-confirm`}>
            {pending.kind === "open"
              ? `Open ${pending.payload.symbol}: long ${pending.payload.long_exchange}, short ${pending.payload.short_exchange}${
                  pending.payload.size_usd ? `, ${pending.payload.size_usd} USD` : ""
                }`
              : `Close attempt ${pending.payload.attempt_id} (${pending.payload.reason})`}
          </strong>
          <p>
            {dryRun
              ? "Dry-run mode: the runtime simulates the orders and records the attempt."
              : "LIVE mode: this sends real orders if the gate, guardrails, and live switches allow it."}
          </p>
          {pending.kind === "open" && realMoney && (
            <RealMoneyConfirm
              action="open this deal"
              checked={realMoneyOk}
              onChange={setRealMoneyOk}
            />
          )}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void confirm()}
              disabled={busy || confirmBlocked}
            >
              {busy ? "Sending..." : `Confirm ${pending.kind}`}
            </button>
            <button type="button" className={styles.button} onClick={closePending} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mutationError && (
        <div className={styles.errorBox} role="alert">
          {describeApiError(mutationError)}
        </div>
      )}

      {lastResult && (
        <div className={styles.okNote} role="status">
          Attempt {lastResult.attempt_id} is <strong>{lastResult.status}</strong>
          {lastResult.error ? `: ${lastResult.error}` : "."}
        </div>
      )}

      <h2 className={styles.sectionTitle}>Attempt timeline</h2>
      {attempts.error && (
        <div className={styles.errorBox} role="alert">
          {describeApiError(attempts.errorObject)}
        </div>
      )}
      {attempts.loading && !attempts.data && <div role="status">Loading attempts...</div>}
      {attempts.data && attemptItems.length === 0 && (
        <EmptyState
          title="No attempts yet"
          description="Opens and closes appear here newest first."
        />
      )}
      {attempts.data && attemptItems.length > 0 && (
        <>
          <p className={styles.hint}>
            {attempts.data.count} attempts · consecutive rollbacks{" "}
            {attempts.data.consecutive_rollbacks}
            {attempts.data.entries_stopped ? " · entries stopped" : ""}
          </p>
          <div
            className={styles.tableWrap}
            role="region"
            aria-label="Execution attempts table"
            tabIndex={0}
          >
            <table className={styles.table} aria-label="Execution attempts">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Attempt</th>
                  <th>Pair</th>
                  <th>Status</th>
                  <th>Failure and transitions</th>
                </tr>
              </thead>
              <tbody>
                {attemptItems.map((attempt) => (
                  <AttemptRow key={attempt.attempt_id} attempt={attempt} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <FloatingRefreshButton
        fetching={attempts.fetching}
        onClick={() => void attempts.refetch()}
        label="Refresh attempts"
      />
    </>
  );
};

export default ExecutionActionsPanel;
