import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { OPERATOR_HOME_PATH } from "../lib/navigation";
import { useHistoryPosition } from "./useHistoryPosition";

type LocationReturnState = { from?: string };

const MIN_BACK_BUTTON_VERSION = "6.1";

/**
 * Wire the Telegram Mini App BackButton to the same history as the header Back button.
 * Hidden on Deals with no earlier entry so Telegram's native close action remains there.
 * Clients older than Bot API 6.1 have no BackButton, so it is not touched.
 */
export function useTelegramBackButton(homePath: string = OPERATOR_HOME_PATH): void {
  const navigate = useNavigate();
  const location = useLocation();
  const { index } = useHistoryPosition();
  const from = (location.state as LocationReturnState | null)?.from;
  const onRoot = location.pathname === homePath && index === 0;

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const backButton = webApp?.BackButton;
    if (!backButton || !webApp?.isVersionAtLeast?.(MIN_BACK_BUTTON_VERSION)) {
      return;
    }

    if (onRoot) {
      backButton.hide?.();
      return;
    }

    const handleClick = () => {
      if (index > 0) {
        navigate(-1);
        return;
      }
      if (typeof from === "string" && from.startsWith("/")) {
        navigate(from, { replace: true });
        return;
      }
      navigate(homePath, { replace: true });
    };

    backButton.show?.();
    backButton.onClick?.(handleClick);
    return () => {
      backButton.offClick?.(handleClick);
      backButton.hide?.();
    };
  }, [from, homePath, index, navigate, onRoot]);
}
