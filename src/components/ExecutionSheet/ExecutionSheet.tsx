import { useState, useId, useRef } from "react";
import { Link } from "react-router-dom";
import { X, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import RealMoneyConfirm from "../RealMoneyConfirm/RealMoneyConfirm";
import styles from "./ExecutionSheet.module.scss";
import type { OpportunityItem, ExecutionAttemptItem, ExecutionOpenRequest } from "../../api/types";
import { useExecutionPreflight } from "../../hooks/useExecutionPreflight";
import { useExecutionOpen } from "../../hooks/useOperations";
import { useModalKeyboard } from "../../hooks/useModalKeyboard";
import ExchangeBadge from "../ExchangeBadge/ExchangeBadge";
import { describeApiError } from "../../lib/api-errors";
import { formatUsd } from "../../lib/operations";
import { checkPrices } from "../../lib/priceCheck";

interface ExecutionSheetProps {
  opportunity: OpportunityItem | null;
  onClose: () => void;
}

const PRESET_SIZES = [250, 500, 1000, 2500, 5000];
const VOOI_BLOCKER_CODE = "vooi_route_unavailable";
const EXECUTION_DISABLED_BLOCKER_CODE = "execution_disabled";

export default function ExecutionSheet({ opportunity, onClose }: ExecutionSheetProps) {
  if (!opportunity) return null;
  return (
    <ExecutionSheetContent
      key={`${opportunity.symbol}_${opportunity.strategy_type}`}
      opportunity={opportunity}
      onClose={onClose}
    />
  );
}

function ExecutionSheetContent({
  opportunity,
  onClose,
}: {
  opportunity: OpportunityItem;
  onClose: () => void;
}) {
  const dialogId = useId();
  const inputId = useId();
  const {
    data: preflight,
    error: preflightError,
    loading: preflightLoading,
    refetch: refetchPreflight,
  } = useExecutionPreflight();
  const sheetRef = useRef<HTMLDivElement>(null);
  const { backdropProps } = useModalKeyboard({ containerRef: sheetRef, onClose });
  const openMutation = useExecutionOpen();

  const defaultSize = opportunity.recommended_size_usd ?? 500;
  const [sizeUsd, setSizeUsd] = useState<string>(String(defaultSize));
  const [attemptResult, setAttemptResult] = useState<ExecutionAttemptItem | null>(null);
  const [executionStep, setExecutionStep] = useState<
    "idle" | "validating" | "submitting" | "done" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const longLeg = opportunity.legs?.find((leg) => leg.side === "long");
  const shortLeg = opportunity.legs?.find((leg) => leg.side === "short");
  const longVenue = longLeg?.venue ?? "unknown";
  const shortVenue = shortLeg?.venue ?? "unknown";
  const microstructure = opportunity.microstructure_by_exchange ?? {};

  const execEnabled = preflight?.mode.exec_enabled;
  const dryRun = preflight?.mode.exec_dry_run;
  const blockers = preflight?.blockers ?? [];
  const isPreflightBlocked = preflight?.decision === "blocked";
  const isRealMoney = execEnabled === true && dryRun === false;
  const [realMoneyOk, setRealMoneyOk] = useState(false);
  // Fail closed: never allow submitting before the safety check has answered.
  const preflightReady = preflight !== null;
  const hasVooiBlocker = blockers.some((b) => b.code === VOOI_BLOCKER_CODE);
  const wrongCoin =
    checkPrices(
      microstructure[longVenue]?.mid,
      microstructure[shortVenue]?.mid,
      opportunity.basis_bps,
      opportunity.strategy_type
    ).level === "danger";

  let disabledReason: string | null = null;
  if (preflightReady) {
    if (execEnabled !== true) {
      disabledReason = "Trading is turned off, so deals cannot be opened right now.";
    } else if (hasVooiBlocker) {
      disabledReason = "The exchange connection is not ready yet.";
    } else if (isPreflightBlocked) {
      disabledReason = "The safety check blocks opening right now.";
    } else if (opportunity.status !== "ready") {
      disabledReason = "Only deals marked Ready can be opened.";
    } else if (wrongCoin) {
      disabledReason = "The prices look like two different coins, so this deal cannot be opened.";
    }
  }
  const listedBlockers =
    execEnabled !== true
      ? blockers.filter((b) => b.code !== EXECUTION_DISABLED_BLOCKER_CODE)
      : blockers;
  const canSubmit = preflightReady && disabledReason === null && (!isRealMoney || realMoneyOk);

  const parsedSize = Number(sizeUsd) || 0;
  // Estimated 8h funding payout: notional * (funding_diff_apr / 100) * (8 / 8760)
  const estFundingPayout = parsedSize * (opportunity.funding_diff_apr / 100) * (8 / 8760);
  // Estimated roundtrip fees & slippage
  const estFees = parsedSize * (opportunity.total_cost_bps / 10000);
  const estNetProfit = estFundingPayout - estFees;

  const handleOpen = async () => {
    if (parsedSize <= 0) {
      setErrorMessage("Please enter a valid positive position size.");
      return;
    }
    if (!canSubmit) {
      setErrorMessage("This deal cannot be opened right now. Check the notices above.");
      return;
    }
    setErrorMessage(null);
    setExecutionStep("validating");

    const payload: ExecutionOpenRequest = {
      symbol: opportunity.symbol,
      long_exchange: longVenue,
      short_exchange: shortVenue,
      size_usd: parsedSize,
      strategy_type: opportunity.strategy_type ?? "funding_arbitrage",
    };

    try {
      setExecutionStep("submitting");
      const result = await openMutation.mutateAsync(payload);
      setAttemptResult(result);
      setExecutionStep("done");
    } catch (err: unknown) {
      setExecutionStep("error");
      setErrorMessage(describeApiError(err instanceof Error ? err : null));
    }
  };

  return (
    <div
      className={styles.overlay}
      {...backdropProps}
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogId}
    >
      <div className={styles.sheet} ref={sheetRef}>
        <div className={styles.handleBar} aria-hidden="true" />

        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <Zap className={styles.iconZap} size={20} color="var(--color-accent-text, #3b82f6)" />
            <h2 id={dialogId} className={styles.title}>
              Open Arbitrage Position
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close execution sheet"
          >
            <X size={20} />
          </button>
        </div>

        {/* Opportunity Card Summary */}
        <div className={styles.opportunitySummary}>
          <div className={styles.summaryTop}>
            <span className={styles.symbol}>{opportunity.symbol}</span>
            <div className={styles.routeGroup}>
              <ExchangeBadge exchange={longVenue} />
              <ArrowRight size={14} aria-hidden="true" />
              <ExchangeBadge exchange={shortVenue} />
            </div>
            <div className={styles.aprBadge}>+{opportunity.funding_diff_apr.toFixed(2)}% APR</div>
          </div>
        </div>

        {/* Preflight Mode Banner */}
        <div className={styles.modeBanner}>
          <span>Execution mode:</span>
          {execEnabled ? (
            dryRun ? (
              <span className={styles.modeDryRun}>Dry-Run (Simulated)</span>
            ) : (
              <span className={styles.modeLive}>LIVE Execution</span>
            )
          ) : (
            <span className={styles.modeDisabled}>Execution Disabled</span>
          )}
        </div>

        {preflightLoading && !preflightReady && (
          <div className={styles.modeBanner} role="status">
            Running the safety check…
          </div>
        )}
        {preflightError && !preflightReady && (
          <div className={styles.blockerBox} role="alert">
            <AlertCircle size={16} />
            <span>Could not run the safety check, so this deal cannot be opened right now.</span>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => refetchPreflight()}
            >
              Try again
            </button>
          </div>
        )}

        {disabledReason && (
          <div className={styles.blockerBox} role="alert">
            <AlertCircle size={16} />
            <span>{disabledReason}</span>
          </div>
        )}

        {/* Blockers alert if any */}
        {listedBlockers.length > 0 && (
          <div className={styles.blockerBox} role="alert">
            <strong>Preflight notice:</strong>
            <ul>
              {listedBlockers.map((b, i) => (
                <li key={i}>{b.message ?? b.code}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className={styles.blockerBox} role="alert">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success View */}
        {executionStep === "done" && attemptResult && (
          <div className={styles.successBox}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle2 size={20} />
              <strong>Position submitted successfully!</strong>
            </div>
            <div>
              Attempt ID: <code>{attemptResult.attempt_id}</code> ({attemptResult.status})
            </div>
            {attemptResult.events && attemptResult.events.length > 0 && (
              <ul style={{ fontSize: "0.75rem", margin: "0.25rem 0 0.5rem 1rem" }}>
                {attemptResult.events.map((ev, idx) => (
                  <li key={idx}>{ev}</li>
                ))}
              </ul>
            )}
            <Link to="/positions" className={styles.viewPositionsLink} onClick={onClose}>
              View in My Positions →
            </Link>
          </div>
        )}

        {/* Form and PnL calculation */}
        {executionStep !== "done" && (
          <>
            <div className={styles.section}>
              <div className={styles.inputGroup}>
                <div className={styles.inputLabel}>
                  <label htmlFor={inputId}>Position Size (USD)</label>
                  <span>Min: $100</span>
                </div>
                <input
                  id={inputId}
                  type="number"
                  min="1"
                  step="50"
                  className={styles.sizeInput}
                  value={sizeUsd}
                  onChange={(e) => setSizeUsd(e.target.value)}
                  disabled={openMutation.isPending}
                />
              </div>

              <div className={styles.chipsRow} style={{ marginTop: "0.5rem" }}>
                {PRESET_SIZES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`${styles.chip} ${parsedSize === preset ? styles.chipActive : ""}`}
                    onClick={() => setSizeUsd(String(preset))}
                    disabled={openMutation.isPending}
                  >
                    ${preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated PnL breakdown in real USD */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Expected 8h Settlement Return</div>
              <div className={styles.pnlGrid}>
                <div className={styles.pnlItem}>
                  <span className={styles.pnlLabel}>Funding income</span>
                  <span className={`${styles.pnlValue} ${styles.pnlPositive}`}>
                    +{formatUsd(Math.max(0, estFundingPayout))}
                  </span>
                </div>
                <div className={styles.pnlItem}>
                  <span className={styles.pnlLabel}>Est. roundtrip fees</span>
                  <span className={`${styles.pnlValue} ${styles.pnlNegative}`}>
                    -{formatUsd(estFees)}
                  </span>
                </div>
                <div className={styles.pnlItem}>
                  <span className={styles.pnlLabel}>Est. net cycle PnL</span>
                  <span
                    className={`${styles.pnlValue} ${estNetProfit >= 0 ? styles.pnlNet : styles.pnlNegative}`}
                  >
                    {estNetProfit >= 0 ? "+" : ""}
                    {formatUsd(estNetProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Step-by-step Execution Progress */}
            {openMutation.isPending && (
              <div className={styles.progressList}>
                <div className={`${styles.progressItem} ${styles.progressItemDone}`}>
                  <ShieldCheck size={16} /> Preflight & risk guardrails passed
                </div>
                <div className={`${styles.progressItem} ${styles.progressItemActive}`}>
                  <Zap size={16} /> Submitting Long ({longVenue}) & Short ({shortVenue}) legs...
                </div>
              </div>
            )}

            {isRealMoney && (
              <RealMoneyConfirm
                action="open this deal"
                checked={realMoneyOk}
                onChange={setRealMoneyOk}
              />
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.submitButton}
                onClick={handleOpen}
                disabled={openMutation.isPending || !canSubmit}
              >
                {openMutation.isPending ? "Executing arbitrage..." : "Open Both Legs"}
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={openMutation.isPending}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}