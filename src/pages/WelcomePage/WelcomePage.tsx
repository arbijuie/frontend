import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import pageStyles from "../../styles/Page.module.scss";
import styles from "./WelcomePage.module.scss";
import { usePageTitle } from "../../hooks/usePageTitle";
import { WELCOME_HINT_KEY } from "../../components/WelcomeHint/WelcomeHint";
import { WELCOME_STEPS } from "./welcomeSteps";

const LAST = WELCOME_STEPS.length - 1;

function markWelcomeDone() {
  try {
    window.localStorage.setItem(WELCOME_HINT_KEY, "1");
  } catch {
    // storage unavailable: the hint simply shows again next time
  }
}

/** Four short screens that teach a new trader how to read the app before they trade. */
const WelcomePage = () => {
  usePageTitle("Getting started");
  const [current, setCurrent] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const movedRef = useRef(false);
  const navigate = useNavigate();
  const step = WELCOME_STEPS[current];

  useEffect(() => {
    if (movedRef.current) headingRef.current?.focus();
  }, [current]);

  const goTo = (index: number) => {
    movedRef.current = true;
    setCurrent(index);
  };

  const finish = () => {
    markWelcomeDone();
    navigate("/");
  };

  return (
    <div className={`${pageStyles.page} ${styles.page}`}>
      <div className={styles.top}>
        <ol className={styles.dots} aria-label="Guide progress">
          {WELCOME_STEPS.map((item, index) => (
            <li key={item.eyebrow}>
              <button
                type="button"
                className={styles.dot}
                aria-label={`Step ${index + 1}: ${item.eyebrow}`}
                aria-current={index === current ? "step" : undefined}
                onClick={() => goTo(index)}
              />
            </li>
          ))}
        </ol>
        <button type="button" className={styles.skip} onClick={finish}>
          Skip
        </button>
      </div>

      <section className={styles.panel} aria-labelledby="welcome-step-title">
        <p className={styles.eyebrow}>
          {current + 1} of {WELCOME_STEPS.length} · {step.eyebrow}
        </p>
        <h1 id="welcome-step-title" ref={headingRef} tabIndex={-1} className={styles.title}>
          {step.title}
        </h1>
        <p className={styles.intro}>{step.intro}</p>

        <ul className={styles.points}>
          {step.points.map((point) => (
            <li
              key={point.term}
              className={`${styles.point} ${point.tone ? styles[point.tone] : ""}`}
            >
              <span className={styles.term}>{point.term}</span>
              <span className={styles.text}>{point.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.actions}>
        {current > 0 ? (
          <button type="button" className={styles.secondary} onClick={() => goTo(current - 1)}>
            Back
          </button>
        ) : (
          <span />
        )}
        {current < LAST ? (
          <button type="button" className={styles.primary} onClick={() => goTo(current + 1)}>
            Next
          </button>
        ) : (
          <button type="button" className={styles.primary} onClick={finish}>
            Show me the deals
          </button>
        )}
      </div>

      {current === LAST && (
        <p className={styles.more}>
          Want the details? Read <Link to="/how-it-works">How it works</Link> or run the{" "}
          <Link to="/onboarding">system check</Link>.
        </p>
      )}
    </div>
  );
};

export default WelcomePage;
