import styles from "./SkipLink.module.scss";
import { MAIN_CONTENT_ID } from "../../lib/landmarks";

const SkipLink = () => {
  return (
    <a
      className={styles.skipLink}
      href={`#${MAIN_CONTENT_ID}`}
      onClick={(event) => {
        const target = document.getElementById(MAIN_CONTENT_ID);
        if (target) {
          event.preventDefault();
          target.focus();
        }
      }}
    >
      Skip to main content
    </a>
  );
};

export default SkipLink;
