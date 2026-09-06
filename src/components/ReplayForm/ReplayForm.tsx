import { useState, type SubmitEvent } from "react";
import type { BacktestReplayRequest } from "../../api/types";
import styles from "./ReplayForm.module.scss";

interface ReplayFormProps {
  onSubmit: (request: BacktestReplayRequest) => void;
  submitting: boolean;
}

const ReplayForm = ({ onSubmit, submitting }: ReplayFormProps) => {
  const [symbols, setSymbols] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [cycleHours, setCycleHours] = useState("");
  const [entryScoreBps, setEntryScoreBps] = useState("");
  const [exitScoreBps, setExitScoreBps] = useState("");
  const [minSamples, setMinSamples] = useState("");
  const [strategyId, setStrategyId] = useState("baseline-v1");

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const request: BacktestReplayRequest = { strategy_id: strategyId || "baseline-v1" };
    if (symbols.trim()) {
      request.symbols = symbols
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (start) request.start = new Date(start).toISOString();
    if (end) request.end = new Date(end).toISOString();
    if (cycleHours) request.cycle_hours = Number(cycleHours);
    if (entryScoreBps) request.entry_score_bps = Number(entryScoreBps);
    if (exitScoreBps) request.exit_score_bps = Number(exitScoreBps);
    if (minSamples) request.min_samples_per_symbol = Number(minSamples);
    onSubmit(request);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Symbols (comma-separated, blank = all)</span>
        <input
          className={styles.input}
          type="text"
          value={symbols}
          onChange={(e) => setSymbols(e.target.value)}
          placeholder="AERO, KAITO"
        />
      </label>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Start</span>
          <input
            className={styles.input}
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>End</span>
          <input
            className={styles.input}
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Entry Score (bps)</span>
          <input
            className={styles.input}
            type="number"
            step="any"
            value={entryScoreBps}
            onChange={(e) => setEntryScoreBps(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Exit Score (bps)</span>
          <input
            className={styles.input}
            type="number"
            step="any"
            value={exitScoreBps}
            onChange={(e) => setExitScoreBps(e.target.value)}
          />
        </label>
      </div>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Cycle Hours</span>
          <input
            className={styles.input}
            type="number"
            step="any"
            value={cycleHours}
            onChange={(e) => setCycleHours(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Min Samples / Symbol</span>
          <input
            className={styles.input}
            type="number"
            step="1"
            value={minSamples}
            onChange={(e) => setMinSamples(e.target.value)}
          />
        </label>
      </div>
      <label className={styles.field}>
        <span className={styles.label}>Strategy ID</span>
        <input
          className={styles.input}
          type="text"
          value={strategyId}
          onChange={(e) => setStrategyId(e.target.value)}
        />
      </label>
      <button className={styles.submitButton} type="submit" disabled={submitting}>
        {submitting ? "Running..." : "Run Replay"}
      </button>
    </form>
  );
};

export default ReplayForm;
