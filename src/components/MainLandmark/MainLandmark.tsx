import type { ReactNode } from "react";
import styles from "./MainLandmark.module.scss";
import { MAIN_CONTENT_ID } from "../../lib/landmarks";

interface MainLandmarkProps {
  children: ReactNode;
}

const MainLandmark = ({ children }: MainLandmarkProps) => {
  return (
    <main id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.main}>
      {children}
    </main>
  );
};

export default MainLandmark;
