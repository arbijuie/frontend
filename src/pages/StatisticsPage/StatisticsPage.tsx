import { Link } from "react-router-dom";
import pageStyles from "../../styles/Page.module.scss";
import styles from "./StatisticsPage.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import StatCard from "../../components/StatCard/StatCard";
import BarList, { type BarListItem } from "../../components/BarList/BarList";
import EmptyState from "../../components/EmptyState/EmptyState";
import PublicDataNotice from "../../components/PublicDataNotice/PublicDataNotice";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useNow } from "../../hooks/useNow";
import {
  usePublicCorrelation,
  usePublicOpportunities,
  usePublicStatus,
} from "../../hooks/usePublicData";
import {
  VENUE_SOURCE_LABEL,
  countBy,
  dataFreshness,
  formatAge,
  formatVenue,
  reasonLabel,
  topReasons,
  venueRows,
  type VenueSourceState,
} from "../../lib/publicStats";
import { formatUptime } from "../../lib/format";

const SOURCE_TONE: Record<VenueSourceState, string> = {
  live: styles.toneSuccess,
  rest_fallback: styles.toneWarning,
  down: styles.toneDanger,
  unknown: styles.toneNeutral,
};

const LIQUIDITY_LABEL: Record<string, string> = { H: "High", M: "Medium", L: "Low" };

function share(part: number, total: number): string | undefined {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : undefined;
}

/** Public transparency page (issue #305): coverage, provenance, confidence, fallback. */
const StatisticsPage = () => {
  usePageTitle("Statistics");
  const now = useNow(5000).getTime();
  const status = usePublicStatus();
  const opportunities = usePublicOpportunities();
  const correlation = usePublicCorrelation();

  const statusData = status.data;
  const opportunityItems = opportunities.data?.opportunities ?? [];
  const venues = statusData ? venueRows(statusData) : [];
  const venueStates = countBy(venues.map((venue) => venue.state));
  const freshness = dataFreshness(statusData?.last_updated_at, now);

  const byStatus = countBy(opportunityItems.map((item) => item.status));
  const byLiquidity = countBy(opportunityItems.map((item) => item.liquidity_tier ?? "unknown"));
  const byDepth = countBy(opportunityItems.map((item) => item.depth_quality ?? "unknown"));
  const total = opportunityItems.length;
  const reasons = topReasons(opportunityItems);
  const correlatedPairs = (correlation.data?.pairs ?? []).filter((pair) => pair.above_threshold);

  const decisionCounts: BarListItem[] = [
    { label: "Ready", value: byStatus.ready ?? 0, tone: "success" },
    { label: "Watching", value: byStatus.watching ?? 0, tone: "warning" },
    { label: "Blocked", value: byStatus.blocked ?? 0, tone: "danger" },
  ];
  const statusItems = decisionCounts.map((item) => ({ ...item, note: share(item.value, total) }));
  const liquidityItems: BarListItem[] = (["H", "M", "L"] as const).map((tier) => ({
    label: LIQUIDITY_LABEL[tier],
    value: byLiquidity[tier] ?? 0,
  }));
  const depthItems: BarListItem[] = (["A", "B", "C", "D"] as const).map((grade) => ({
    label: `Grade ${grade}`,
    value: byDepth[grade] ?? 0,
  }));

  return (
    <div className={pageStyles.page}>
      <PageHeader
        title="Statistics"
        subtitle={
          statusData ? (
            <>
              <span
                className={`${styles.dot} ${freshness.state === "fresh" ? styles.dotFresh : styles.dotStale}`}
                aria-hidden="true"
              />
              <span>
                {freshness.state === "fresh" ? "Live" : "Data may be stale"} · updated{" "}
                {formatAge(freshness.ageSeconds)}
              </span>
            </>
          ) : (
            "Coverage, data sources and signal quality of the screener, updated continuously."
          )
        }
      />

      {status.error && (
        <PublicDataNotice
          subject="Runtime status"
          error={status.error}
          onRetry={() => void status.refetch()}
        />
      )}
      {status.loading && !statusData && <p className={styles.loading}>Loading statistics...</p>}

      {statusData && (
        <>
          <div className={styles.kpis}>
            <StatCard
              label="Venues streaming live"
              value={`${venueStates.live ?? 0} of ${venues.length}`}
              sub={
                venueStates.rest_fallback
                  ? `${venueStates.rest_fallback} on REST fallback`
                  : "No venue on fallback"
              }
            />
            <StatCard
              label="Routes screened now"
              value={opportunities.data?.count ?? "—"}
              sub={opportunities.data ? `${opportunities.data.ready_count} ready` : "Not available"}
            />
            <StatCard
              label="Ready after validation"
              value={statusData.screener_ready_candidates}
              sub={`of ${statusData.screener_validated_candidates} validated`}
            />
            <StatCard
              label="Uptime"
              value={formatUptime(statusData.uptime_s)}
              sub={`${share(statusData.poll_count_success, statusData.poll_count_total) ?? "—"} of ${statusData.poll_count_total.toLocaleString("en-US")} polls succeeded`}
            />
          </div>

          <h2 className={pageStyles.sectionTitle}>Venue coverage and data sources</h2>
          <p className={styles.lead}>
            The screener streams market data over WebSocket first. When a stream degrades it keeps
            screening on REST polling (fallback) until the stream recovers.
          </p>
          {venues.length === 0 ? (
            <EmptyState title="No venues reported yet" />
          ) : (
            <ul className={styles.venues} aria-label="Venue data sources">
              {venues.map(({ venue, state }) => (
                <li key={venue} className={styles.venue}>
                  <span className={styles.venueName}>{formatVenue(venue)}</span>
                  <span className={`${styles.sourceBadge} ${SOURCE_TONE[state]}`}>
                    {VENUE_SOURCE_LABEL[state]}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 className={pageStyles.sectionTitle}>Screening funnel (latest pass)</h2>
          <div className={styles.panel}>
            <BarList
              label="Screening funnel"
              items={[
                { label: "Candidates found", value: statusData.screener_raw_candidates },
                { label: "Positive after costs", value: statusData.screener_post_cost_candidates },
                { label: "Validated", value: statusData.screener_validated_candidates },
                { label: "Ready", value: statusData.screener_ready_candidates },
              ]}
            />
            {statusData.screener_reason_severity_counts && (
              <p className={styles.panelNote}>
                Held back by a rule this pass: {statusData.screener_reason_severity_counts.watching}{" "}
                watching, {statusData.screener_reason_severity_counts.blocked} blocked.
              </p>
            )}
          </div>
        </>
      )}

      <h2 className={pageStyles.sectionTitle}>Signal confidence</h2>
      {opportunities.error ? (
        <PublicDataNotice
          subject="Opportunities"
          error={opportunities.error}
          onRetry={() => void opportunities.refetch()}
        />
      ) : total === 0 ? (
        <EmptyState
          title={opportunities.loading ? "Loading routes..." : "No routes to grade right now"}
        />
      ) : (
        <div className={styles.confidence}>
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Decision</h3>
            <BarList label="Routes by decision" items={statusItems} />
          </div>
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Liquidity tier</h3>
            <BarList label="Routes by liquidity tier" items={liquidityItems} />
          </div>
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Order-book depth</h3>
            <BarList label="Routes by depth quality" items={depthItems} />
          </div>
        </div>
      )}

      {reasons.length > 0 && (
        <>
          <h2 className={pageStyles.sectionTitle}>Why routes are held back</h2>
          <ul className={styles.reasons} aria-label="Most common reasons">
            {reasons.map((reason) => (
              <li key={`${reason.severity}:${reason.code}`} className={styles.reason}>
                <span className={styles.reasonLabel}>{reasonLabel(reason.code)}</span>
                <span
                  className={`${styles.sourceBadge} ${
                    reason.severity === "blocked" ? styles.toneDanger : styles.toneWarning
                  }`}
                >
                  {reason.severity}
                </span>
                <span className={styles.reasonCount}>
                  {reason.count} {reason.count === 1 ? "route" : "routes"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className={pageStyles.sectionTitle}>Market correlation</h2>
      {correlation.error ? (
        <PublicDataNotice
          subject="Correlation"
          error={correlation.error}
          onRetry={() => void correlation.refetch()}
        />
      ) : correlation.data ? (
        <div className={styles.panel}>
          <p className={styles.panelNote}>
            {correlatedPairs.length} of {correlation.data.count} symbol pairs move together above a
            correlation of {correlation.data.threshold} over the last{" "}
            {correlation.data.window_hours} h. Correlated routes are capped so one market move
            cannot hit many positions at once.
          </p>
          {correlatedPairs.length > 0 && (
            <ul className={styles.pairs} aria-label="Strongly correlated pairs">
              {correlatedPairs.slice(0, 6).map((pair) => (
                <li key={`${pair.symbol_a}-${pair.symbol_b}`}>
                  <span>
                    {pair.symbol_a} / {pair.symbol_b}
                  </span>
                  <span className={styles.pairValue}>{pair.correlation.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <EmptyState
          title={correlation.loading ? "Loading correlation..." : "No correlation data"}
        />
      )}

      <h2 className={pageStyles.sectionTitle}>Methodology</h2>
      <div className={styles.prose}>
        <p>
          Numbers on this page are aggregates of the live screener. A route goes long on one venue
          and short on another; it is <strong>ready</strong> when its funding edge still clears the
          minimum score after fees, slippage and timing costs and passes every risk rule. It is{" "}
          <strong>watching</strong> when a soft rule holds it back and <strong>blocked</strong> when
          a hard rule does.
        </p>
        <p>
          Liquidity tiers grade 24h volume and open interest; depth grades A to D grade the order
          book against the order size. Venue data sources come from the runtime's own feed health.
          See the <Link to="/journal">Journal</Link> for daily history and the{" "}
          <Link to="/product">Product</Link> page for the modes that set these thresholds.
        </p>
      </div>

      <h2 className={pageStyles.sectionTitle}>Disclaimer</h2>
      <p className={styles.disclaimer}>
        Statistics describe what the screener observes, not trades or returns. Funding rates change
        every hour and past signals do not predict future ones. Nothing here is investment advice.
      </p>
    </div>
  );
};

export default StatisticsPage;
