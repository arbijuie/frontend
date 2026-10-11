import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import pageStyles from "../../styles/Page.module.scss";
import styles from "./OnboardingPage.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import RecheckButton from "./RecheckButton";
import { CheckList, StepStatusBadge, StepSummary, VenueList } from "./OnboardingChecks";
import { API_URL } from "../../api/config";
import { isFinalPublicError } from "../../api/public";
import { useHealthz, usePublicOpportunities, usePublicStatus } from "../../hooks/usePublicData";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { usePageTitle } from "../../hooks/usePageTitle";
import {
  SIGNAL_POLL_MS,
  STEP_STATUS_LABEL,
  channelCheck,
  healthCheck,
  isBlocked,
  networkCheck,
  opportunitiesHaveSignal,
  rateLimitRetryAt,
  runtimeSignal,
  statusHasSignal,
  stepHeadline,
  stepStatus,
  venueCheck,
  type StepStatus,
} from "../../lib/onboarding";

const STEPS = [
  {
    title: "Prerequisites",
    intro:
      "Check that this device can reach the screener API. Every check on this page only reads public, read-only endpoints; nothing is changed.",
  },
  {
    title: "Access and connectivity",
    intro:
      "Check that this deployment shares its public data and that the screener is connected to the exchanges (venues).",
  },
  {
    title: "First runtime signal",
    intro:
      "Wait for the screener to produce its first result. A fresh deployment needs a minute or two for its first pass.",
  },
] as const;

const LAST_STEP = STEPS.length - 1;

const NEXT_LINKS = [
  {
    to: "/statistics",
    label: "Public statistics",
    text: "Live counts of screened and ready routes, and venue health.",
  },
  { to: "/journal", label: "Daily journal", text: "What the screener found, day by day." },
  { to: "/product", label: "Product modes", text: "How strict each mode is and what it shows." },
];

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/**
 * Guided onboarding (issue #306): prerequisites, public access and venue connectivity, then
 * the first runtime signal. Reads only `GET /healthz`, `/public/status` and
 * `/public/opportunities`; it never calls operator, control or WebSocket ticket endpoints.
 */
const OnboardingPage = () => {
  usePageTitle("Onboarding");
  const [current, setCurrent] = useState(0);
  const [reached, setReached] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const navigatedRef = useRef(false);
  const nextHintId = useId();

  const apiUrl = (API_URL ?? "").trim();
  const apiAddress = apiUrl || window.location.origin;

  // Step 3 polls until each source shows its first result; other steps re-check on demand.
  const waitingForSignal = current === LAST_STEP;
  const online = useOnlineStatus();
  const healthz = useHealthz();
  const status = usePublicStatus({
    enabled: reached >= 1,
    refetchIntervalMs: (data, error) =>
      waitingForSignal && !isFinalPublicError(error) && !statusHasSignal(data)
        ? SIGNAL_POLL_MS
        : false,
  });
  const opportunities = usePublicOpportunities({
    enabled: reached >= 2,
    refetchIntervalMs: (data, error) =>
      waitingForSignal && !isFinalPublicError(error) && !opportunitiesHaveSignal(data)
        ? SIGNAL_POLL_MS
        : false,
  });

  const venues = venueCheck(status.error ? null : status.data);
  const signal = runtimeSignal(status, opportunities, apiAddress);
  const stepChecks = [
    [networkCheck(online), healthCheck(healthz, apiAddress)],
    [channelCheck(status, apiAddress), venues.check],
    signal.checks,
  ];
  const statuses: StepStatus[] = stepChecks.map((checks, index) =>
    index > reached ? "not_started" : stepStatus(checks)
  );
  const stepReads = [[healthz], [status], [status, opportunities]][current];

  const checks = stepChecks[current];
  const currentStatus = statuses[current];
  const blocked = isBlocked(checks);
  const canContinue = !blocked && currentStatus !== "checking";
  const retryTimes = stepReads
    .map((read) => rateLimitRetryAt(read.error, read.errorAt))
    .filter((value): value is number => value !== null);
  const retryAt = retryTimes.length ? Math.max(...retryTimes) : null;

  let announcement: string;
  if (currentStatus === "passed") {
    announcement = (current === LAST_STEP && signal.summary) || "All checks passed.";
  } else {
    announcement = `${STEP_STATUS_LABEL[currentStatus]}. ${sentence(stepHeadline(checks))}`;
  }

  useEffect(() => {
    // Move focus to the new step's heading after Back/Next, not on the first render.
    if (navigatedRef.current) headingRef.current?.focus();
  }, [current]);

  const goTo = (index: number) => {
    navigatedRef.current = true;
    setCurrent(index);
    setReached((value) => Math.max(value, index));
  };

  const recheck = () => {
    for (const read of stepReads) void read.refetch();
  };

  const step = STEPS[current];

  return (
    <div className={pageStyles.page}>
      <PageHeader
        title="Onboarding"
        subtitle="Three short checks, from prerequisites to the first live signal. Read-only: nothing is changed."
      />

      <ol className={styles.steps} aria-label="Onboarding progress">
        {STEPS.map(({ title }, index) => (
          <li
            key={title}
            className={styles.step}
            aria-current={index === current ? "step" : undefined}
          >
            <span className={styles.stepNumber}>Step {index + 1}</span>
            <span className={styles.stepTitle}>{title}</span>
            <StepStatusBadge status={statuses[index]} />
          </li>
        ))}
      </ol>

      <section className={styles.panel} aria-labelledby="onboarding-step-title">
        <div className={styles.panelHeader}>
          <p className={styles.eyebrow}>
            Step {current + 1} of {STEPS.length}
          </p>
          <h2 id="onboarding-step-title" ref={headingRef} tabIndex={-1} className={styles.title}>
            {step.title}
          </h2>
          <p className={styles.intro}>{step.intro}</p>
        </div>

        <StepSummary status={currentStatus} text={announcement} />

        {current === 0 && (
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>Browser</dt>
              <dd>A current Chrome, Edge, Firefox or Safari with JavaScript on.</dd>
            </div>
            <div className={styles.fact}>
              <dt>API address</dt>
              <dd>
                {apiUrl ? (
                  <code className={styles.address}>{apiUrl}</code>
                ) : (
                  <>
                    Not configured. Requests go to this site&apos;s own address,{" "}
                    <code className={styles.address}>{apiAddress}</code>.
                  </>
                )}
              </dd>
            </div>
            <div className={styles.fact}>
              <dt>Account</dt>
              <dd>None. The public view needs no sign-in.</dd>
            </div>
          </dl>
        )}

        <CheckList
          checks={checks}
          extras={current === 1 ? { venues: <VenueList rows={venues.rows} /> } : undefined}
        />

        {current === 1 && (
          <div className={styles.note}>
            <p className={styles.noteTitle}>Live streaming and tickets</p>
            <p>
              Operators get live updates over a WebSocket. Each connection needs a short-lived
              ticket, and tickets are rate-limited, so a client that reconnects too often is refused
              for a while. This public view never asks for a ticket: it reads the public endpoints
              every few seconds instead, so a degraded stream or a ticket limit does not stop it.
            </p>
          </div>
        )}

        {current === LAST_STEP && (
          <div className={styles.nextSteps}>
            <h3 className={styles.nextTitle}>Next steps</h3>
            <ul className={styles.nextLinks}>
              {NEXT_LINKS.map(({ to, label, text }) => (
                <li key={to} className={styles.nextItem}>
                  <Link to={to} className={styles.nextLink}>
                    {label}
                  </Link>
                  <p className={styles.nextText}>{text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.actions}>
          <div className={styles.recheck}>
            <RecheckButton
              retryAt={retryAt}
              fetching={stepReads.some((read) => read.fetching)}
              onRecheck={recheck}
            />
          </div>
          <div className={styles.navButtons}>
            {current > 0 && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => goTo(current - 1)}
              >
                Back
              </button>
            )}
            {current < LAST_STEP && (
              <button
                type="button"
                className={styles.primaryButton}
                aria-disabled={!canContinue || undefined}
                aria-describedby={canContinue ? undefined : nextHintId}
                onClick={() => {
                  if (canContinue) goTo(current + 1);
                }}
              >
                {currentStatus === "passed" || !canContinue ? "Next" : "Continue anyway"}
              </button>
            )}
          </div>
          {current < LAST_STEP && !canContinue && (
            <p id={nextHintId} className={styles.actionHint}>
              {blocked
                ? "Fix the problem above, then run the checks again to continue."
                : "Next unlocks when the checks finish."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default OnboardingPage;
