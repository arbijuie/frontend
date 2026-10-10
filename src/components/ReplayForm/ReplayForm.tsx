import styles from "./ReplayForm.module.scss";
import { useId, useState, type ReactNode, type SubmitEvent } from "react";
import type { BacktestReplayRequest } from "../../api/types";

interface ReplayFormProps {
  onSubmit: (request: BacktestReplayRequest) => void;
  submitting: boolean;
  fieldErrors?: Record<string, string>;
}

function parseDateOrNull(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

const ReplayForm = ({ onSubmit, submitting, fieldErrors }: ReplayFormProps) => {
  const baseId = useId();
  const [symbols, setSymbols] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [cycleHours, setCycleHours] = useState("");
  const [entryScoreBps, setEntryScoreBps] = useState("");
  const [exitScoreBps, setExitScoreBps] = useState("");
  const [minSamples, setMinSamples] = useState("");
  const [strategyId, setStrategyId] = useState("baseline-v1");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const errorFor = (field: string): string | undefined =>
    localErrors[field] || fieldErrors?.[field];
  const inputId = (field: string) => `${baseId}-${field}`;
  const errorId = (field: string) => `${baseId}-${field}-error`;

  const inputA11yProps = (field: string) => {
    const hasError = Boolean(errorFor(field));
    return {
      id: inputId(field),
      "aria-invalid": hasError || undefined,
      "aria-describedby": hasError ? errorId(field) : undefined,
    };
  };

  const renderField = (field: string, label: string, input: ReactNode) => {
    const error = errorFor(field);
    return (
      <div className={styles.field}>
        <label className={styles.label} htmlFor={inputId(field)}>
          {label}
        </label>
        {input}
        {error && (
          <span id={errorId(field)} className={styles.fieldError} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  };

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextLocalErrors: Record<string, string> = {};
    const request: BacktestReplayRequest = { strategy_id: strategyId || "baseline-v1" };

    if (symbols.trim()) {
      request.symbols = symbols
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (start) {
      const parsedStart = parseDateOrNull(start);
      if (parsedStart === null) {
        nextLocalErrors.start = "Enter a valid start date/time.";
      } else {
        request.start = parsedStart;
      }
    }

    if (end) {
      const parsedEnd = parseDateOrNull(end);
      if (parsedEnd === null) {
        nextLocalErrors.end = "Enter a valid end date/time.";
      } else {
        request.end = parsedEnd;
      }
    }

    setLocalErrors(nextLocalErrors);
    if (Object.keys(nextLocalErrors).length > 0) return;

    if (cycleHours) request.cycle_hours = Number(cycleHours);
    if (entryScoreBps) request.entry_score_bps = Number(entryScoreBps);
    if (exitScoreBps) request.exit_score_bps = Number(exitScoreBps);
    if (minSamples) request.min_samples_per_symbol = Number(minSamples);
    onSubmit(request);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {renderField(
        "symbols",
        "Symbols (comma-separated, blank = all)",
        <input
          {...inputA11yProps("symbols")}
          className={styles.input}
          type="text"
          value={symbols}
          onChange={(e) => setSymbols(e.target.value)}
          placeholder="AERO, KAITO"
        />
      )}

      {renderField(
        "start",
        "Start",
        <input
          {...inputA11yProps("start")}
          className={styles.input}
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      )}

      {renderField(
        "end",
        "End",
        <input
          {...inputA11yProps("end")}
          className={styles.input}
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      )}

      <div className={styles.row}>
        {renderField(
          "entry_score_bps",
          "Entry Score (bps)",
          <input
            {...inputA11yProps("entry_score_bps")}
            className={styles.input}
            type="number"
            step="any"
            value={entryScoreBps}
            onChange={(e) => setEntryScoreBps(e.target.value)}
          />
        )}
        {renderField(
          "exit_score_bps",
          "Exit Score (bps)",
          <input
            {...inputA11yProps("exit_score_bps")}
            className={styles.input}
            type="number"
            step="any"
            value={exitScoreBps}
            onChange={(e) => setExitScoreBps(e.target.value)}
          />
        )}
      </div>

      <div className={styles.row}>
        {renderField(
          "cycle_hours",
          "Cycle Hours",
          <input
            {...inputA11yProps("cycle_hours")}
            className={styles.input}
            type="number"
            step="any"
            value={cycleHours}
            onChange={(e) => setCycleHours(e.target.value)}
          />
        )}
        {renderField(
          "min_samples_per_symbol",
          "Min Samples / Symbol",
          <input
            {...inputA11yProps("min_samples_per_symbol")}
            className={styles.input}
            type="number"
            step="1"
            value={minSamples}
            onChange={(e) => setMinSamples(e.target.value)}
          />
        )}
      </div>

      {renderField(
        "strategy_id",
        "Strategy ID",
        <input
          {...inputA11yProps("strategy_id")}
          className={styles.input}
          type="text"
          value={strategyId}
          onChange={(e) => setStrategyId(e.target.value)}
        />
      )}

      <button className={styles.submitButton} type="submit" disabled={submitting}>
        {submitting ? "Running..." : "Run Replay"}
      </button>
    </form>
  );
};

export default ReplayForm;
