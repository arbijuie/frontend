import { useState } from "react";
import { Link } from "react-router-dom";
import pageStyles from "../../styles/Page.module.scss";
import styles from "./JournalPage.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import StatCard from "../../components/StatCard/StatCard";
import BarList from "../../components/BarList/BarList";
import EmptyState from "../../components/EmptyState/EmptyState";
import PublicDataNotice from "../../components/PublicDataNotice/PublicDataNotice";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePublicJournal } from "../../hooks/usePublicData";
import { strategyLabel } from "../../lib/publicStats";
import type { PublicJournalCounters } from "../../api/types";

const JOURNAL_WINDOWS = [7, 14, 30, 90] as const;
type JournalWindow = (typeof JOURNAL_WINDOWS)[number];

const formatScore = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)} bps` : "—";

const formatCount = (value: number) => value.toLocaleString("en-US");

function formatDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function strategyBreakdown(counters: PublicJournalCounters): string {
  const entries = Object.entries(counters.ready_by_strategy ?? {}).filter(([, count]) => count > 0);
  if (entries.length === 0) return "—";
  return entries.map(([strategy, count]) => `${strategyLabel(strategy)} ${count}`).join(", ");
}

/** Public journal (issue #305): daily aggregate history from the capture store. */
const JournalPage = () => {
  usePageTitle("Journal");
  const [days, setDays] = useState<JournalWindow>(14);
  const journal = usePublicJournal(days);
  const data = journal.data;
  const history = data?.days ?? [];

  return (
    <div className={pageStyles.page}>
      <PageHeader
        title="Journal"
        subtitle="Daily history of what the screener observed. Aggregates only, in UTC days."
      />

      <div className={styles.windowPicker} role="group" aria-label="Journal window">
        {JOURNAL_WINDOWS.map((window) => (
          <button
            key={window}
            type="button"
            className={`${styles.windowButton} ${window === days ? styles.windowActive : ""}`}
            aria-pressed={window === days}
            onClick={() => setDays(window)}
          >
            {window} days
          </button>
        ))}
      </div>

      {journal.error && (
        <PublicDataNotice
          subject="Journal"
          error={journal.error}
          onRetry={() => void journal.refetch()}
        />
      )}
      {journal.loading && !data && <p className={styles.loading}>Loading journal...</p>}

      {data && !data.capture_enabled && (
        <EmptyState
          title="History collection is off on this deployment"
          description="The journal fills in once the operator enables snapshot capture."
        />
      )}

      {data && data.capture_enabled && history.length === 0 && (
        <EmptyState
          title={`No history in the last ${data.window_days} days yet`}
          description="Days appear here once the screener has captured snapshots."
        />
      )}

      {data && data.capture_enabled && history.length > 0 && (
        <>
          <div className={styles.kpis}>
            <StatCard
              label="Snapshots captured"
              value={formatCount(data.totals.snapshots)}
              sub={`over ${history.length} ${history.length === 1 ? "day" : "days"}`}
            />
            <StatCard
              label="Routes seen"
              value={formatCount(data.totals.distinct_routes)}
              sub={`${formatCount(data.totals.distinct_symbols)} symbols`}
            />
            <StatCard
              label="Ready observations"
              value={formatCount(data.totals.ready_observations)}
              sub={`${formatCount(data.totals.distinct_ready_routes)} distinct ready routes`}
            />
            <StatCard
              label="Median ready score"
              value={formatScore(data.totals.median_ready_score_bps)}
              sub="after costs"
            />
          </div>

          <h2 className={pageStyles.sectionTitle}>Ready observations per day</h2>
          <div className={styles.panel}>
            <BarList
              label="Ready observations per day"
              items={history.map((day) => ({
                label: formatDay(day.day),
                value: day.ready_observations,
              }))}
            />
          </div>

          <h2 className={pageStyles.sectionTitle}>Daily detail</h2>
          <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Daily detail">
            <table className={styles.table}>
              <caption className={styles.caption}>
                Newest day first. Days without captured snapshots are not listed.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Day (UTC)</th>
                  <th scope="col">Snapshots</th>
                  <th scope="col">Routes</th>
                  <th scope="col">Symbols</th>
                  <th scope="col">Ready obs.</th>
                  <th scope="col">Ready routes</th>
                  <th scope="col">Median ready score</th>
                  <th scope="col">Ready by strategy</th>
                </tr>
              </thead>
              <tbody>
                {history.map((day) => (
                  <tr key={day.day}>
                    <th scope="row">{formatDay(day.day)}</th>
                    <td>{formatCount(day.snapshots)}</td>
                    <td>{formatCount(day.distinct_routes)}</td>
                    <td>{formatCount(day.distinct_symbols)}</td>
                    <td>{formatCount(day.ready_observations)}</td>
                    <td>{formatCount(day.distinct_ready_routes)}</td>
                    <td>{formatScore(day.median_ready_score_bps)}</td>
                    <td className={styles.breakdown}>{strategyBreakdown(day)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className={pageStyles.sectionTitle}>Methodology</h2>
      <div className={styles.prose}>
        <p>
          Each screener pass can capture a snapshot of every route it evaluated. The journal groups
          those snapshots by UTC day. A <strong>route</strong> is one symbol on one long venue and
          one short venue for one strategy; a <strong>ready observation</strong> is one snapshot in
          which a route was ready. The median ready score is the post-cost score of those ready
          snapshots.
        </p>
        <p>
          The journal shows aggregates only: no individual routes, venues, sizes or account data.
          For the current picture see <Link to="/statistics">Statistics</Link>.
        </p>
      </div>

      <h2 className={pageStyles.sectionTitle}>Disclaimer</h2>
      <p className={styles.disclaimer}>
        The journal records signals the screener observed, not executed trades or realised returns.
        Past observations do not predict future ones. Nothing here is investment advice.
      </p>
    </div>
  );
};

export default JournalPage;
