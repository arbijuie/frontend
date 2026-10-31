import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import styles from "./PositionsPage.module.scss";
import { usePositions, useDailyPnl, useExecutionClose } from "../../hooks/useOperations";
import { usePageTitle } from "../../hooks/usePageTitle";
import { formatUsd } from "../../lib/operations";
import { formatDateTime } from "../../lib/format";
import { describeApiError } from "../../lib/api-errors";
import StatCard from "../../components/StatCard/StatCard";
import EmptyState from "../../components/EmptyState/EmptyState";
import ExchangeBadge from "../../components/ExchangeBadge/ExchangeBadge";
import FloatingRefreshButton from "../../components/FloatingRefreshButton/FloatingRefreshButton";
import ClosePositionDialog from "../../components/ClosePositionDialog/ClosePositionDialog";
import type { PositionSnapshotItem } from "../../api/types";

function pnlColor(value: number): "green" | "red" | undefined {
  if (value > 0) return "green";
  if (value < 0) return "red";
  return undefined;
}

function toneClass(value: number | null | undefined): "positive" | "negative" | "neutral" {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

function formatSignedUsd(value: number): string {
  return value > 0 ? `+${formatUsd(value)}` : formatUsd(value);
}

function formatSignedPercent(value: number): string {
  const text = `${Math.abs(value).toFixed(2)}%`;
  if (value > 0) return `+${text}`;
  if (value < 0) return `-${text}`;
  return text;
}

export default function PositionsPage() {
  usePageTitle("My Positions");
  const positionsQuery = usePositions();
  const dailyPnlQuery = useDailyPnl(7);
  const closeMutation = useExecutionClose();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [closingAttemptId, setClosingAttemptId] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [positionToClose, setPositionToClose] = useState<PositionSnapshotItem | null>(null);

  const data = positionsQuery.data;
  const openPositions: PositionSnapshotItem[] = data?.positions ?? [];
  const realizedPnl = dailyPnlQuery.data?.realized_pnl_usd;

  const confirmClose = async () => {
    const position = positionToClose;
    if (!position) return;
    setPositionToClose(null);
    setCloseError(null);
    setClosingAttemptId(position.attempt_id);

    try {
      await closeMutation.mutateAsync({
        attempt_id: position.attempt_id,
        reason: "trader manual close",
      });
    } catch (err: unknown) {
      setCloseError(describeApiError(err instanceof Error ? err : null));
    } finally {
      setClosingAttemptId(null);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title} ref={headingRef} tabIndex={-1}>
          My Positions
        </h1>
        <p className={styles.subtitle}>
          Active arbitrage positions, accrued funding earnings, and 1-click unwind
        </p>
      </header>

      {/* Global Errors */}
      {positionsQuery.error && (
        <div className={styles.errorBox} role="alert">
          {describeApiError(positionsQuery.errorObject)}
        </div>
      )}
      {closeError && (
        <div className={styles.errorBox} role="alert">
          Error closing position: {closeError}
        </div>
      )}

      {/* Portfolio Overview */}
      {data && (
        <div className={styles.statsGrid}>
          <StatCard
            label="Net PnL"
            value={formatUsd(data.net_pnl_usd)}
            color={pnlColor(data.net_pnl_usd)}
            sub="Realized + Funding + Unrealized"
          />
          <StatCard
            label="Funding Accrued"
            value={formatUsd(data.funding_accrued_usd)}
            color={pnlColor(data.funding_accrued_usd)}
            sub="Settlement yield"
          />
          <StatCard
            label="Active Notional"
            value={formatUsd(data.notional_usd)}
            sub={`${openPositions.length} active pair${openPositions.length === 1 ? "" : "s"}`}
          />
          <StatCard
            label="7d Realized"
            value={realizedPnl != null ? formatUsd(realizedPnl) : "—"}
            color={realizedPnl != null ? pnlColor(realizedPnl) : undefined}
            sub="Closed & settled"
          />
        </div>
      )}

      {/* Active Positions */}
      <section>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Open Arbitrage Positions ({openPositions.length})</h2>
        </div>

        {positionsQuery.loading && !data && <div role="status">Loading active positions...</div>}

        {data && openPositions.length === 0 ? (
          <div>
            <EmptyState
              title="No active positions"
              description="You don't have any open arbitrage pairs. Pick a recommended trade from the feed to get started."
            />
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <Link to="/" className={styles.exploreLink}>
                <TrendingUp size={16} /> Explore deals
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.positionsList}>
            {openPositions.map((pos) => {
              const isClosing = closingAttemptId === pos.attempt_id;
              const netPnl = pos.net_pnl_usd ?? 0;
              const fundingAccrued = pos.funding_accrued_usd ?? 0;
              const netApr = pos.net_funding_apr;

              return (
                <article key={pos.attempt_id} className={styles.positionCard}>
                  <div className={styles.cardTop}>
                    <div className={styles.symbolGroup}>
                      <span className={styles.symbol}>{pos.symbol}</span>
                      <div className={styles.routeBadge}>
                        <ExchangeBadge exchange={pos.long_exchange} />
                        <ArrowRight size={12} aria-hidden="true" />
                        <ExchangeBadge exchange={pos.short_exchange} />
                      </div>
                    </div>
                    <span className={styles.statusBadge}>{pos.status}</span>
                  </div>

                  <div className={styles.metricsGrid}>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Net PnL</span>
                      <span className={`${styles.metricValue} ${styles[toneClass(netPnl)]}`}>
                        {formatSignedUsd(netPnl)}
                      </span>
                    </div>

                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Funding Income</span>
                      <span
                        className={`${styles.metricValue} ${styles[toneClass(fundingAccrued)]}`}
                      >
                        {formatSignedUsd(fundingAccrued)}
                      </span>
                    </div>

                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Notional Size</span>
                      <span className={styles.metricValue}>{formatUsd(pos.notional_usd)}</span>
                    </div>

                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Net APR</span>
                      <span className={`${styles.metricValue} ${styles[toneClass(netApr)]}`}>
                        {netApr != null ? formatSignedPercent(netApr) : "—"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.openedTime}>
                      Opened {formatDateTime(pos.opened_at)}
                    </span>
                    <button
                      type="button"
                      className={styles.closeButton}
                      disabled={isClosing}
                      onClick={() => setPositionToClose(pos)}
                    >
                      {isClosing ? "Closing legs..." : "Close position"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <FloatingRefreshButton
        fetching={positionsQuery.fetching}
        onClick={() => positionsQuery.refetch()}
        label="Refresh positions"
      />

      {positionToClose && (
        <ClosePositionDialog
          position={positionToClose}
          live={!positionToClose.dry_run}
          onConfirm={confirmClose}
          onCancel={() => setPositionToClose(null)}
          fallbackFocusRef={headingRef}
        />
      )}
    </div>
  );
}
