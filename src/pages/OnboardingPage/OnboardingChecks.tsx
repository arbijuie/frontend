import type { ReactNode } from "react";
import { Circle, CircleCheck, CircleX, LoaderCircle, TriangleAlert } from "lucide-react";
import styles from "./OnboardingPage.module.scss";
import {
  CHECK_OUTCOME_LABEL,
  STEP_STATUS_LABEL,
  type CheckOutcome,
  type OnboardingCheck,
  type StepStatus,
} from "../../lib/onboarding";
import {
  VENUE_SOURCE_LABEL,
  formatVenue,
  type VenueRow,
  type VenueSourceState,
} from "../../lib/publicStats";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE: Record<CheckOutcome | StepStatus, Tone> = {
  not_started: "neutral",
  pending: "neutral",
  checking: "info",
  passed: "success",
  warning: "warning",
  failed: "danger",
};

const ICON: Record<Tone, typeof Circle> = {
  neutral: Circle,
  info: LoaderCircle,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
};

const VENUE_TONE: Record<VenueSourceState, Tone> = {
  live: "success",
  rest_fallback: "warning",
  down: "danger",
  unknown: "neutral",
};

/** Text badge with a matching icon; the label always carries the state, never color alone. */
const Badge = ({ tone, label }: { tone: Tone; label: string }) => {
  const Icon = ICON[tone];
  return (
    <span className={`${styles.badge} ${styles[`badge_${tone}`]}`}>
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  );
};

export const StepStatusBadge = ({ status }: { status: StepStatus }) => (
  <Badge tone={TONE[status]} label={STEP_STATUS_LABEL[status]} />
);

/** Polite live region with the current step's result, so check outcomes are announced. */
export const StepSummary = ({ status, text }: { status: StepStatus; text: string }) => (
  <p role="status" className={`${styles.summary} ${styles[`summary_${TONE[status]}`]}`}>
    {text}
  </p>
);

interface CheckListProps {
  checks: OnboardingCheck[];
  /** Extra content under a check, keyed by check id (venue list, ...). */
  extras?: Partial<Record<string, ReactNode>>;
}

export const CheckList = ({ checks, extras = {} }: CheckListProps) => (
  <ul className={styles.checks}>
    {checks.map((check) => (
      <li key={check.id} className={styles.check}>
        <div className={styles.checkHead}>
          <h3 className={styles.checkTitle}>{check.label}</h3>
          <Badge tone={TONE[check.outcome]} label={CHECK_OUTCOME_LABEL[check.outcome]} />
        </div>
        <p className={styles.checkSummary}>{check.summary}</p>
        {check.detail && <p className={styles.checkDetail}>{check.detail}</p>}
        {extras[check.id]}
      </li>
    ))}
  </ul>
);

export const VenueList = ({ rows }: { rows: VenueRow[] }) => {
  if (rows.length === 0) return null;
  return (
    <ul className={styles.venues} aria-label="Venues">
      {rows.map(({ venue, state }) => (
        <li key={venue} className={styles.venue}>
          <span className={styles.venueName}>{formatVenue(venue)}</span>
          <Badge tone={VENUE_TONE[state]} label={VENUE_SOURCE_LABEL[state]} />
        </li>
      ))}
    </ul>
  );
};
