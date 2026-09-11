import { Component, type ErrorInfo, type ReactNode } from "react";
import styles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render errors from a routed page so a single broken section does not
 * blank the whole app. The bottom navigation stays usable to move elsewhere.
 */
export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Route render error", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className={styles.page} role="alert">
          <div className={styles.header}>
            <h1 className={styles.title}>Something went wrong</h1>
          </div>
          <div className={styles.errorBox}>Error: {error.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
