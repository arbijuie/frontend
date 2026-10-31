import { useId } from "react";
import styles from "./RealMoneyConfirm.module.scss";

const REAL_MONEY_RISKS = [
  "This uses real money from your exchange accounts. It is not practice mode.",
  "You can lose money. Prices can move against you before both sides are filled.",
  "Payout rates can flip, so expected income is not guaranteed.",
  "An exchange can fail, freeze withdrawals or close your position.",
  "Only use money you can afford to lose.",
];

interface Props {
  /** What the trader is about to do, e.g. "open this deal" or "let the bot open deals". */
  action: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Explicit, un-skippable confirmation shown whenever an action would trade real money. */
const RealMoneyConfirm = ({ action, checked, onChange }: Props) => {
  const id = useId();
  return (
    <section className={styles.box} aria-label="Real money warning">
      <h3 className={styles.title}>Real money — read before you {action}</h3>
      <ul className={styles.list}>
        {REAL_MONEY_RISKS.map((risk) => (
          <li key={risk}>{risk}</li>
        ))}
      </ul>
      <label className={styles.check} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        I understand the risks and want to {action} with real money.
      </label>
    </section>
  );
};

export default RealMoneyConfirm;
