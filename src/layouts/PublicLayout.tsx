import { Outlet } from "react-router-dom";
import PublicNav from "../components/PublicNav/PublicNav";
import SkipLink from "../components/SkipLink/SkipLink";
import MainLandmark from "../components/MainLandmark/MainLandmark";
import RouteAnnouncer from "../components/RouteAnnouncer/RouteAnnouncer";
import RouteErrorBoundary from "../components/RouteErrorBoundary/RouteErrorBoundary";

const PublicLayout = () => {
  return (
    <>
      <SkipLink />
      <PublicNav />
      <MainLandmark>
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </MainLandmark>
      <RouteAnnouncer />
    </>
  );
};

export default PublicLayout;
