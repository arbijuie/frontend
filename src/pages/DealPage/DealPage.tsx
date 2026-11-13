import { useId, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";
import pageStyles from "../../styles/Page.module.scss";
import styles from "./DealPage.module.scss";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import ExchangeBadge from "../../components/ExchangeBadge/ExchangeBadge";
import ExecutionSheet from "../../components/ExecutionSheet/ExecutionSheet";
import EmptyState from "../../components/EmptyState/EmptyState";
import { useOpportunities } from "../../hooks/useOpportunities";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useNow } from "../../hooks/useNow";
import { useStatus } from "../../hooks/useStatus";
import { useConfig } from "../../hooks/useConfig";
import { checkPrices } from "../../lib/priceCheck";
import { plainReasons } from "../../lib/plainReasons";
import { tradingOpenGate } from "../../lib/tradingOpenGate";
import { formatCountdown, getFundingTargetTime } from "../../lib/format";
import {
  bpsToPercent,
  dealVenues,
  estimateDeal,
  formatPayoff,
  formatUsd,
} from "../../lib/dealFormat";
import type { OpportunityItem } from "../../api/types";

const SIZE_PRESETS = [100, 500, 1000, 5000];

const signed = (value: number, digits = 1) => `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;

const formatPrice = (mid: string | null | undefined) => {
  const n = Number(mid);
  if (!mid || !Number.isFinite(n)) return "—";
  return `$${n >= 1 ? n.toFixed(2) : n.toPrecision(3)}`;
};

interface LegProps {
  action: "Buy" | "Sell";
  venue: string;
  rateApr: number;
  mid: string | null | undefined;
  nextPayout: string | null;
  explain: string;
}

const Leg = ({ action, venue, rateApr, mid, nextPayout, explain }: LegProps) => (
  <section className={styles.leg} aria-label={`${action} on ${venue}`}>
    <div className={styles.legHead}>
      <span className={styles.legAction}>{action} on</span>
      <ExchangeBadge exchange={venue} />
    </div>
    <dl className={styles.legFacts}>
      <div>
        <dt>Price now</dt>
        <dd>{formatPrice(mid)}</dd>
      </div>
      <div>
        <dt>Payout rate</dt>
        <dd>{signed(rateApr)}% / year</dd>
      </div>
      <div>
        <dt>Next payout in</dt>
        <dd>{nextPayout ?? "—"}</dd>
      </div>
    </dl>
    <p className={styles.legExplain}>{explain}</p>
  </section>
);

const Estimate = ({ item }: { item: OpportunityItem }) => {
  const inputId = useId();
  const [size, setSize] = useState(String(Math.round(item.recommended_size_usd || 1000)));
  const e = estimateDeal(Number(size), item);
  const rows = [
    { label: "Income per day", value: e.incomePerDay },
    { label: "Costs to enter and exit (once)", value: -e.costs },
    { label: "Result after 7 days", value: e.after7Days, total: true },
    { label: "Result after 30 days", value: e.after30Days, total: true },
  ];
  return (
    <section className={styles.card} aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`} className={styles.cardTitle}>
        Try a deal size
      </h2>
      <label htmlFor={inputId} className={styles.sizeLabel}>
        Deal size in US dollars
      </label>
      <div className={styles.sizeRow}>
        <input
          id={inputId}
          className={styles.sizeInput}
          inputMode="decimal"
          value={size}
          onChange={(event) => setSize(event.target.value.replace(/[^\d.]/g, ""))}
        />
        {SIZE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={styles.preset}
            aria-pressed={Number(size) === preset}
            onClick={() => setSize(String(preset))}
          >
            ${preset.toLocaleString("en-US")}
          </button>
        ))}
      </div>
      <dl className={styles.estimate}>
        {rows.map((row) => (
          <div key={row.label} className={row.total ? styles.totalRow : undefined}>
            <dt>{row.label}</dt>
            <dd className={row.value > 0 ? styles.income : row.value < 0 ? styles.loss : undefined}>
              {formatUsd(row.value)}
            </dd>
          </div>
        ))}
      </dl>
      <p className={styles.footnote}>
        Only if payout rates stay as they are now. They change every few hours.
      </p>
    </section>
  );
};

const DealPage = () => {
  const { symbol = "", long = "", short = "" } = useParams();
  usePageTitle(symbol ? `${symbol} deal` : "Deal");
  const { data, loading, error, personalized } = useOpportunities();
  const { data: status, loading: statusLoading } = useStatus();
  const { data: config } = useConfig();
  const openGate = tradingOpenGate({
    status: status ?? null,
    execEnabled: config?.exec_enabled ?? null,
    statusLoading,
  });
  const now = useNow();
  const [opening, setOpening] = useState<OpportunityItem | null>(null);

  const item = data?.opportunities.find((candidate) => {
    const venues = dealVenues(candidate);
    return candidate.symbol === symbol && venues.long === long && venues.short === short;
  });

  const back = (
    <Link to="/" className={styles.back}>
      <ArrowLeft size={16} aria-hidden="true" /> All deals
    </Link>
  );

  if (!item) {
    return (
      <div className={pageStyles.page}>
        {back}
        {loading ? (
          <div role="status">Loading deal…</div>
        ) : error ? (
          <div role="alert">
            Could not load deals right now: {error}. Check your connection and try again.
          </div>
        ) : (
          <EmptyState
            title="This deal is no longer in the list"
            description={`${symbol} from ${long} to ${short} does not pass the first filters right now. Prices and payout rates change all the time; check again later.`}
          />
        )}
      </div>
    );
  }

  const micro = item.microstructure_by_exchange ?? {};
  const price = checkPrices(
    micro[long]?.mid,
    micro[short]?.mid,
    item.basis_bps,
    item.strategy_type
  );
  const wrongCoin = price.level === "danger";
  const countdown = (hours: number | null | undefined) =>
    data?.updated_at && hours != null
      ? formatCountdown(getFundingTargetTime(data.updated_at, hours), now).text
      : null;
  const reasons = plainReasons(item.reasons ?? []);
  const winRate = item.historical_win_rate;
  const closed = item.historical_closed_trades;

  return (
    <div className={`${pageStyles.page} ${styles.page}`}>
      {back}
      {error && (
        <div role="alert">
          Could not refresh this deal ({error}). The numbers below may be out of date.
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{item.symbol}</h1>
          <StatusBadge status={item.status} />
        </div>
        <p className={styles.subtitle}>
          Buy on <strong>{long}</strong>, sell on <strong>{short}</strong>
        </p>
      </header>

      <section className={styles.hero} aria-label="Deal summary">
        <div className={styles.heroLabel}>Expected income</div>
        <div className={`${styles.heroValue} ${item.funding_diff_apr > 0 ? styles.income : ""}`}>
          {signed(item.funding_diff_apr)}% / year
        </div>
        <dl className={styles.heroFacts}>
          <div>
            <dt>Costs to enter and exit</dt>
            <dd>{bpsToPercent(item.total_cost_bps)}</dd>
          </div>
          <div>
            <dt>Pays off in</dt>
            <dd>{formatPayoff(item.hours_to_breakeven)}</dd>
          </div>
        </dl>
      </section>

      {price.level !== "ok" && (
        <div
          className={wrongCoin ? styles.danger : styles.warning}
          role={wrongCoin ? "alert" : "status"}
        >
          <strong>{price.title}</strong>
          <span>{price.text}</span>
        </div>
      )}

      {reasons.length > 0 && (
        <section className={styles.card} aria-label="Reasons">
          <h2 className={styles.cardTitle}>
            {item.status === "blocked" ? "Why it is blocked" : "Why we are waiting"}
          </h2>
          <ul className={styles.reasons}>
            {reasons.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </section>
      )}

      <h2 className={styles.sectionTitle}>How this deal works</h2>
      <div className={styles.legs}>
        <Leg
          action="Buy"
          venue={long}
          rateApr={item.long_rate_apr}
          mid={micro[long]?.mid}
          nextPayout={countdown(item.long_hours_to_next_funding)}
          explain="You buy (go long) the coin here. A low or negative payout rate is good for this side."
        />
        <Leg
          action="Sell"
          venue={short}
          rateApr={item.short_rate_apr}
          mid={micro[short]?.mid}
          nextPayout={countdown(item.short_hours_to_next_funding)}
          explain="You sell (go short) the same coin here. A high payout rate is good for this side."
        />
      </div>
      <p className={styles.footnote}>
        Your income is the difference between the two payout rates. Price moves on one side are
        cancelled by the other.
      </p>

      {!wrongCoin && <Estimate item={item} />}

      {winRate != null && closed != null && closed > 0 && (
        <section className={styles.card} aria-label="Past results">
          <h2 className={styles.cardTitle}>Past results</h2>
          <p className={styles.plain}>
            {Math.round(winRate * 100)}% of {closed} closed deals like this one made money.
          </p>
        </section>
      )}

      <details className={styles.expert}>
        <summary>Numbers for experts</summary>
        <dl className={styles.expertList}>
          <div>
            <dt>Score</dt>
            <dd>{item.combined_score.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Funding edge</dt>
            <dd>{item.funding_edge_bps.toFixed(1)} bps</dd>
          </div>
          <div>
            <dt>Total cost</dt>
            <dd>{item.total_cost_bps.toFixed(1)} bps</dd>
          </div>
          <div>
            <dt>Fees / slippage</dt>
            <dd>
              {item.fee_impact_bps.toFixed(1)} / {item.slippage_impact_bps.toFixed(1)} bps
            </dd>
          </div>
          <div>
            <dt>Basis</dt>
            <dd>{item.basis_bps.toFixed(1)} bps</dd>
          </div>
          <div>
            <dt>Strategy</dt>
            <dd>
              {item.strategy_type} · {item.strategy_profile_id}
            </dd>
          </div>
        </dl>
      </details>

      <div className={styles.stickyAction}>
        {wrongCoin ? (
          <p className={styles.blockedNote}>
            Opening is turned off: this is probably not the same coin.
          </p>
        ) : item.status !== "ready" ? (
          <p className={styles.waitNote}>
            You can open this deal once it is Ready. The app keeps checking it.
          </p>
        ) : personalized ? (
          <p className={styles.blockedNote}>
            Opening is available only from the runtime feed. Turn off personal profile overrides
            first.
          </p>
        ) : !openGate.allowed ? (
          <p className={styles.blockedNote}>{openGate.message}</p>
        ) : (
          <button type="button" className={styles.openButton} onClick={() => setOpening(item)}>
            <Zap size={16} aria-hidden="true" /> Open position
          </button>
        )}
      </div>

      {opening && <ExecutionSheet opportunity={opening} onClose={() => setOpening(null)} />}
    </div>
  );
};

export default DealPage;
