import styles from "./ReplayResultPanel.module.scss";
import HelpTooltip from "../HelpTooltip/HelpTooltip";
import type {
  BacktestMetrics,
  BacktestReplayRequest,
  ReplaySourceDiagnostics,
  ReplaySourceKind,
} from "../../api/types";
import { signColor } from "../../lib/format";

type CoverageTone = "good" | "warn" | "poor";

const coverageTone = (coveragePct: number): CoverageTone => {
  if (coveragePct >= 95) return "good";
  if (coveragePct >= 60) return "warn";
  return "poor";
};

interface ReplayResultPanelProps {
  metrics: BacktestMetrics;
  replaySource?: ReplaySourceKind;
  replayDiagnostics?: ReplaySourceDiagnostics;
  usedRequest?: BacktestReplayRequest | null;
  onCreateLock?: () => void;
  creatingLock?: boolean;
  lockCreated?: boolean;
}

const ReplayResultPanel = ({
  metrics,
  replaySource,
  replayDiagnostics,
  usedRequest,
  onCreateLock,
  creatingLock,
  lockCreated,
}: ReplayResultPanelProps) => {
  const entriesByStrategy = Object.entries(metrics.entries_by_strategy_type ?? {});
  const exitsByStrategy = Object.entries(metrics.exits_by_strategy_type ?? {});
  const source = replaySource ?? replayDiagnostics?.replay_source ?? "runtime_capture";
  const symbolCoverage = Object.entries(replayDiagnostics?.symbol_coverage ?? {}).sort(
    ([symbolA, statsA], [symbolB, statsB]) => {
      if (statsA.coverage_pct !== statsB.coverage_pct) {
        return statsA.coverage_pct - statsB.coverage_pct;
      }
      return symbolA.localeCompare(symbolB);
    }
  );
  const matched = replayDiagnostics?.overlay_matched ?? 0;
  const overlayTotal = replayDiagnostics?.overlay_total ?? 0;
  const overlayCoveragePct = overlayTotal > 0 ? (matched / overlayTotal) * 100 : 0;
  const overlayTone = coverageTone(overlayCoveragePct);
  const lockButtonBusy = Boolean(creatingLock || lockCreated);

  return (
    <section className={styles.panel} aria-label="Replay result">
      {usedRequest && (
        <div className={styles.usedParams}>
          Symbols: {usedRequest.symbols?.length ? usedRequest.symbols.join(", ") : "All"}
          {usedRequest.start && ` · from ${new Date(usedRequest.start).toLocaleDateString()}`}
          {usedRequest.end && ` · to ${new Date(usedRequest.end).toLocaleDateString()}`}
        </div>
      )}
      <div className={styles.grid}>
        <div>
          <div className={styles.metricLabel}>Strategy ID</div>
          <div className={styles.metricValue}>{metrics.strategy_id}</div>
        </div>
        <div>
          <div className={styles.metricLabel}>Total Samples</div>
          <div className={styles.metricValue}>{metrics.total_samples}</div>
        </div>
        <div>
          <div className={styles.metricLabel}>Symbols Covered</div>
          <div className={styles.metricValue}>{metrics.symbols_covered}</div>
        </div>
        <div>
          <div className={styles.metricLabel}>Entries / Exits</div>
          <div className={styles.metricValue}>
            {metrics.entries} / {metrics.exits}
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Closed Trades</div>
          <div className={styles.metricValue}>{metrics.closed_trades}</div>
        </div>
        {metrics.wins != null && (
          <div>
            <div className={styles.metricLabel}>Wins</div>
            <div className={styles.metricValue}>{metrics.wins}</div>
          </div>
        )}
        <div>
          <div className={styles.metricLabel}>Win Rate</div>
          <div className={styles.metricValue}>{(metrics.win_rate * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className={styles.metricLabel}>Total PnL</div>
          <div className={`${styles.metricValue} ${styles[signColor(metrics.total_pnl_bps)]}`}>
            {metrics.total_pnl_bps.toFixed(1)} bps
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Median Trade PnL</div>
          <div
            className={`${styles.metricValue} ${styles[signColor(metrics.median_trade_pnl_bps)]}`}
          >
            {metrics.median_trade_pnl_bps.toFixed(1)} bps
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Max Drawdown</div>
          <div className={styles.metricValue}>{metrics.max_drawdown_bps.toFixed(1)} bps</div>
        </div>
      </div>

      {metrics.exit_reasons && Object.keys(metrics.exit_reasons).length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Exit Reasons</div>
          {Object.entries(metrics.exit_reasons).map(([reason, count]) => (
            <div key={reason} className={styles.row}>
              <span>{reason}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionLabel}>PnL Diagnostics</div>
        <div className={styles.row}>
          <span>Funding Carry</span>
          <span className={styles[signColor(metrics.funding_carry_pnl_bps)]}>
            {metrics.funding_carry_pnl_bps.toFixed(1)} bps
          </span>
        </div>
        <div className={styles.row}>
          <span>Basis Carry</span>
          <span className={styles[signColor(metrics.basis_carry_pnl_bps)]}>
            {metrics.basis_carry_pnl_bps.toFixed(1)} bps
          </span>
        </div>
        <div className={styles.row}>
          <span>Entry Costs</span>
          <span className={styles.negative}>-{metrics.entry_cost_bps.toFixed(1)} bps</span>
        </div>
      </div>

      {(entriesByStrategy.length > 0 || exitsByStrategy.length > 0) && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Strategy Type Breakdown</div>
          {entriesByStrategy.map(([strategyType, count]) => (
            <div key={`entries-${strategyType}`} className={styles.row}>
              <span>{strategyType} entries</span>
              <span>{count}</span>
            </div>
          ))}
          {exitsByStrategy.map(([strategyType, count]) => (
            <div key={`exits-${strategyType}`} className={styles.row}>
              <span>{strategyType} exits</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.metricLabelWithHelp}>
          <div className={styles.sectionLabel}>Replay Source Diagnostics</div>
          <HelpTooltip
            label="Replay Source Diagnostics"
            text="Coverage badges use: good >=95%, warn 60-94.9%, poor <60%. Overlay matched/total shows how many replay snapshots were successfully overlaid by VOOI seed history."
          />
        </div>
        <div className={styles.coverageLegend} role="group" aria-label="Coverage legend">
          <span className={`${styles.coverageBadge} ${styles.good}`}>good &gt;=95%</span>
          <span className={`${styles.coverageBadge} ${styles.warn}`}>warn 60-94.9%</span>
          <span className={`${styles.coverageBadge} ${styles.poor}`}>poor &lt;60%</span>
        </div>
        <div className={styles.row}>
          <span>Source</span>
          <span>{source}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.metricInlineHelp}>
            Overlay Matched / Total
            <HelpTooltip
              label="Overlay Matched / Total"
              text="Coverage percent is matched / total * 100. Missing means one or both legs had no seed row for the hour bucket; parse means a seed row existed but could not be converted into a valid funding edge."
            />
          </span>
          <span className={styles.coverageValue}>
            {matched} / {overlayTotal}
            <span className={`${styles.coverageBadge} ${styles[overlayTone]}`}>
              {overlayCoveragePct.toFixed(1)}%
            </span>
          </span>
        </div>
        <div className={styles.row}>
          <span>Overlay Missing</span>
          <span>{replayDiagnostics?.overlay_missing ?? 0}</span>
        </div>
        <div className={styles.row}>
          <span>Overlay Parse Errors</span>
          <span>{replayDiagnostics?.overlay_parse_errors ?? 0}</span>
        </div>
        <div className={styles.row}>
          <span>History Rows Loaded</span>
          <span>{replayDiagnostics?.history_rows_loaded ?? 0}</span>
        </div>
        <div className={styles.row}>
          <span>Symbols Complete / Partial / Missing</span>
          <span>
            {replayDiagnostics?.overlay_symbols_complete ?? 0} /{" "}
            {replayDiagnostics?.overlay_symbols_partial ?? 0} /{" "}
            {replayDiagnostics?.overlay_symbols_missing ?? 0}
          </span>
        </div>

        {symbolCoverage.length > 0 && (
          <div className={styles.coverageSection}>
            <div className={styles.sectionSubLabel}>Per-Symbol Coverage</div>
            {symbolCoverage.map(([symbol, stats]) => (
              <div key={`coverage-${symbol}`} className={styles.row}>
                <span>{symbol}</span>
                <span className={styles.coverageDetail}>
                  <span
                    className={`${styles.coverageBadge} ${styles[coverageTone(stats.coverage_pct)]}`}
                  >
                    {stats.coverage_pct.toFixed(1)}%
                  </span>{" "}
                  ({stats.matched}/{stats.snapshots_total}) L-{stats.missing_long} S-
                  {stats.missing_short} P-{stats.parse_errors}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {onCreateLock && (
        <button
          className={styles.createLockButton}
          onClick={() => {
            if (!lockButtonBusy) onCreateLock();
          }}
          aria-disabled={lockButtonBusy}
        >
          {creatingLock
            ? "Locking..."
            : lockCreated
              ? "Lock Created ✓"
              : "Create Strategy Lock from this Result"}
        </button>
      )}
    </section>
  );
};

export default ReplayResultPanel;
