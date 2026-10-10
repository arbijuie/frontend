import { Outlet } from "react-router-dom";
import Nav from "../components/Nav/Nav";
import SkipLink from "../components/SkipLink/SkipLink";
import MainLandmark from "../components/MainLandmark/MainLandmark";
import RouteAnnouncer from "../components/RouteAnnouncer/RouteAnnouncer";
import RouteErrorBoundary from "../components/RouteErrorBoundary/RouteErrorBoundary";
import OperatorSessionGate from "../components/OperatorSessionGate/OperatorSessionGate";
import OpportunitiesSocketProvider from "../components/OpportunitiesSocketProvider/OpportunitiesSocketProvider";

const OperatorLayout = () => {
  return (
    <OperatorSessionGate>
      <OpportunitiesSocketProvider>
        <SkipLink />
        <Nav />
        <MainLandmark>
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </MainLandmark>
        <RouteAnnouncer />
      </OpportunitiesSocketProvider>
    </OperatorSessionGate>
  );
};

export default OperatorLayout;
