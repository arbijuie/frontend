import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import VisuallyHidden from "../VisuallyHidden/VisuallyHidden";

const ANNOUNCE_DELAY_MS = 100;

const RouteAnnouncer = () => {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }
    previousPathname.current = pathname;
    const timer = window.setTimeout(() => setMessage(document.title), ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" data-testid="route-announcer">
      <VisuallyHidden>{message}</VisuallyHidden>
    </div>
  );
};

export default RouteAnnouncer;
