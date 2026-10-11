import { Outlet } from "react-router-dom";
import Nav from "../components/Nav/Nav";
import AppHeader from "../components/AppHeader/AppHeader";
import SkipLink from "../components/SkipLink/SkipLink";
import MainLandmark from "../components/MainLandmark/MainLandmark";
import RouteAnnouncer from "../components/RouteAnnouncer/RouteAnnouncer";
import RouteErrorBoundary from "../components/RouteErrorBoundary/RouteErrorBoundary";
import OperatorSessionGate from "../components/OperatorSessionGate/OperatorSessionGate";
import OpportunitiesSocketProvider from "../components/OpportunitiesSocketProvider/OpportunitiesSocketProvider";
import styles from "./Layout.module.scss";

const OperatorLayout = () => {
  return (
    <OperatorSessionGate>
      <OpportunitiesSocketProvider>
        <div className={styles.operatorShell}>
          <SkipLink />
          <AppHeader surface="operator">
            <Nav />
          </AppHeader>
          <MainLandmark>
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </MainLandmark>
          <RouteAnnouncer />
        </div>
      </OpportunitiesSocketProvider>
    </OperatorSessionGate>
  );
};

export default OperatorLayout;
