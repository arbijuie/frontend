import { useId, useState, type FormEvent } from "react";
import styles from "./StopTradingCard.module.scss";
import { useStopTrading, useStopTradingAck } from "../../hooks/useStopTrading";
import { describeApiError } from "../../lib/api-errors";
import { formatDateTime, formatUptime } from "../../lib/format";
import { ackOutcome, describeBlockers } from "../../lib/stopTrading";
import type { StopTradingResponse } from "../../api/types";

/** The backend requires at least 3 characters (`StopTradingAckRequest`). */
const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 200;

/**
 * Stop-trading latch on Health (issue #669): latched reasons, the recovery gate, and the
 * manual acknowledgment behind an explicit review step. Uses `GET /risk/stop-trading` and
 * `POST /risk/stop-trading/ack`; the runbook curl path stays valid.
 */
const StopTradingCard = () => {
  const ids = useId();
  const { data, error, loading } = useStopTrading();
  const ack = useStopTradingAck();
  const [reason, setReason] = useState("");
  // The latch a review was opened for: a release and a new latch never reuse an old review.
  const [reviewLatch, setReviewLatch] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastAck, setLastAck] = useState<StopTradingResponse | null>(null);

  if (!data) {
    if (error) {
      return (
        <div className={styles.errorBox} role="alert">
          Stop-trading state is unavailable. {describeApiError(error)}
        </div>
      );
    }
    return loading ? <div role="status">Loading stop-trading state…</div> : null;
  }

  const gate = data.gate;
  const stopped = data.state === "stopped";
  const active = data.active ?? [];
  const blockers = gate.blockers ?? [];
  const otherBlockers = blockers.filter((code) => code !== "manual_ack_required");
  const ackNeeded = stopped && gate.ack_required && !gate.acknowledged;
  const latchKey = data.latched_at ?? "latched";
  const reviewing = ackNeeded && reviewLatch === latchKey;
  const triggerNames = active.map((item) => item.trigger).join(", ");
  const busy = ack.isPending;

  const review = (event: FormEvent) => {
    event.preventDefault();
    setLastAck(null);
    if (reason.trim().length < MIN_REASON_LENGTH) {
      setFormError(`Write a reason of at least ${MIN_REASON_LENGTH} characters.`);
      return;
    }
    setFormError(null);
    setReviewLatch(latchKey);
  };

  const confirm = async () => {
    try {
      const result = await ack.mutateAsync({ reason: reason.trim() });
      setLastAck(result);
      setReason("");
    } catch {
      // The mutation keeps the error; the alert below renders it.
    } finally {
      setReviewLatch(null);
    }
  };

  // The message belongs to the answered state; a newer poll shows the card's own state instead.
  const outcome = lastAck && lastAck.checked_at === data.checked_at ? ackOutcome(lastAck) : null;

  return (
    <div className={styles.card}>
      {stopped ? (
        <p className={styles.text}>
          <span className={styles.badgeDanger}>Stopped</span>{" "}
          {`New entries are refused; closes, rollbacks and position monitoring keep running. Latched since ${formatDateTime(data.latched_at)}, last trigger hit ${formatDateTime(data.last_tripped_at)}.`}
        </p>
      ) : (
        <p className={styles.text}>
          <span className={styles.badgeSuccess}>Running</span>{" "}
          {`Entries are allowed: no stop-trading trigger is latched.${
            data.released_at ? ` Last released ${formatDateTime(data.released_at)}.` : ""
          }`}
        </p>
      )}

      {error && (
        <div className={styles.warningNote} role="alert">
          Could not refresh the latch state ({describeApiError(error)}). Showing the answer from{" "}
          {formatDateTime(data.checked_at)}.
        </div>
      )}

      {data.restore_error && (
        <div className={styles.warningNote} role="alert">
          The saved latch state could not be restored at startup ({data.restore_error}). A stop
          latched before the restart may be missing; check the execution lifecycle database.
        </div>
      )}

      {stopped && active.length > 0 && (
        <ul className={styles.list} aria-label="Latched triggers">
          {active.map((item) => (
            <li key={`${item.trigger}-${item.subject ?? ""}`}>
              <code>{item.trigger}</code>
              {item.critical && <span className={styles.badgeWarning}>critical</span>} {item.reason}
              {item.observed != null && item.threshold != null
                ? ` (observed ${item.observed}, threshold ${item.threshold})`
                : ""}
            </li>
          ))}
        </ul>
      )}

      {stopped && (
        <dl className={styles.facts}>
          <dt>Cooldown</dt>
          <dd>
            {gate.cooldown_elapsed
              ? "elapsed"
              : `${formatUptime(gate.cooldown_remaining_s)} left of ${formatUptime(gate.cooldown_s)}`}
          </dd>
          <dt>Health checks</dt>
          <dd>
            {gate.health_green
              ? "all green"
              : describeBlockers(
                  blockers.filter((code) => code.startsWith("health:")),
                  gate
                ) || "not green"}
          </dd>
          <dt>Manual acknowledgment</dt>
          <dd>
            {gate.acknowledged && data.acknowledgment
              ? `given by ${data.acknowledgment.actor} at ${formatDateTime(data.acknowledgment.at)}: ${data.acknowledgment.reason}`
              : gate.ack_required
                ? "required"
                : data.require_manual_ack
                  ? "not needed: no critical trigger is latched"
                  : "not needed: manual acknowledgment is turned off"}
          </dd>
          <dt>Recovery gate</dt>
          <dd>
            {gate.ready
              ? "passed: the runtime releases the stop on its next pass while execution is enabled"
              : `blocked by ${describeBlockers(blockers, gate)}`}
          </dd>
        </dl>
      )}

      {ackNeeded && !reviewing && (
        <form className={styles.form} onSubmit={review}>
          <label className={styles.label} htmlFor={`${ids}-reason`}>
            Acknowledgment reason (what you checked or fixed)
          </label>
          <input
            id={`${ids}-reason`}
            className={styles.input}
            value={reason}
            maxLength={MAX_REASON_LENGTH}
            onChange={(event) => setReason(event.target.value)}
            placeholder="lighter margin topped up, ADL back to 1"
            autoComplete="off"
          />
          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={busy}>
              Review acknowledgment
            </button>
          </div>
        </form>
      )}

      {reviewing && (
        <div className={styles.warningNote} role="alertdialog" aria-labelledby={`${ids}-confirm`}>
          <strong id={`${ids}-confirm`}>Acknowledge the stop for {triggerNames}?</strong>
          <p className={styles.text}>Reason: {reason.trim()}</p>
          <p className={styles.text}>
            {otherBlockers.length === 0
              ? "No other blocker is left: with execution enabled, this releases the stop at once and new entries can open again."
              : `The stop stays latched until these clear: ${describeBlockers(otherBlockers, gate)}. It then releases on its own, without another acknowledgment.`}{" "}
            A critical trigger that latches after this acknowledgment voids it.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void confirm()}
              disabled={busy}
            >
              {busy ? "Sending…" : "Confirm acknowledgment"}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => setReviewLatch(null)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {formError && (
        <div className={styles.errorBox} role="alert">
          {formError}
        </div>
      )}

      {ack.error && !reviewing && (
        <div className={styles.errorBox} role="alert">
          Acknowledgment failed. {describeApiError(ack.error)}
        </div>
      )}

      {outcome && (
        <div className={outcome.ok ? styles.okNote : styles.warningNote} role="status">
          {outcome.text}
        </div>
      )}
    </div>
  );
};

export default StopTradingCard;
