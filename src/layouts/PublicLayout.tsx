import { Outlet } from "react-router-dom";
import AppHeader from "../components/AppHeader/AppHeader";
import PublicNav from "../components/PublicNav/PublicNav";
import SkipLink from "../components/SkipLink/SkipLink";
import MainLandmark from "../components/MainLandmark/MainLandmark";
import RouteAnnouncer from "../components/RouteAnnouncer/RouteAnnouncer";
import RouteErrorBoundary from "../components/RouteErrorBoundary/RouteErrorBoundary";
import styles from "./Layout.module.scss";

const PublicLayout = () => {
  return (
    <div className={styles.publicShell}>
      <SkipLink />
      <AppHeader surface="public">
        <PublicNav />
      </AppHeader>
      <MainLandmark>
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </MainLandmark>
      <RouteAnnouncer />
    </div>
  );
};

export default PublicLayout;
