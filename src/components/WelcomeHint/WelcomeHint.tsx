import { useState } from "react";
import { Link } from "react-router-dom";
import { hasRuntimeAuth } from "../../api/config";
import { useMePreferences } from "../../hooks/useMePreferences";
import { useUpdateMePreferences } from "../../hooks/useUpdateMePreferences";
import styles from "./WelcomeHint.module.scss";

export const WELCOME_HINT_KEY = "arbijuie.welcomeHintDismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(WELCOME_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

/** First-visit card on Deals pointing new traders to the guided checks. */
export default function WelcomeHint() {
  const profileSyncEnabled = hasRuntimeAuth();
  const [dismissedLocal, setDismissedLocal] = useState(readDismissed);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { data: mePreferences } = useMePreferences({ enabled: profileSyncEnabled });
  const updateMePreferences = useUpdateMePreferences();
  const dismissed = mePreferences
    ? mePreferences.tutorial.welcome_hint_dismissed || dismissedLocal
    : dismissedLocal;

  if (dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(WELCOME_HINT_KEY, "1");
    } catch {
      // storage unavailable: hide for this session only
    }
    setDismissedLocal(true);
    setSyncError(null);
    if (profileSyncEnabled) {
      updateMePreferences.mutate(
        { tutorial: { welcome_hint_dismissed: true } },
        {
          onError: (error) => {
            setSyncError(error.message);
          },
        }
      );
    }
  };

  return (
    <section className={styles.card} aria-label="Welcome">
      <div className={styles.title}>New here?</div>
      <p className={styles.text}>
        The app finds pairs of exchanges that pay you to hold opposite positions. Green numbers are
        income. Open a deal only when it says Ready — that means today's checks pass, but you can
        still lose money.
      </p>
      <div className={styles.actions}>
        <Link to="/welcome" className={styles.primary}>
          Getting started
        </Link>
        <Link to="/learn/how-it-works" className={styles.secondary}>
          How it works
        </Link>
        <button type="button" className={styles.secondary} onClick={dismiss}>
          Got it
        </button>
      </div>
      {syncError && <p className={styles.text}>Could not sync the hint state yet: {syncError}</p>}
    </section>
  );
}
