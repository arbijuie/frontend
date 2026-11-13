import { useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { HistoryPositionContext } from "../../hooks/useHistoryPosition";
import { advanceTrack, canGoForward, initialTrack } from "../../lib/historyTrack";

interface HistoryPositionProviderProps {
  children: ReactNode;
}

const HistoryPositionProvider = ({ children }: HistoryPositionProviderProps) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [track, setTrack] = useState(() => initialTrack(location.key));

  const current = advanceTrack(track, navigationType, location.key);
  if (current !== track) {
    setTrack(current);
  }

  const value = useMemo(
    () => ({ index: current.index, canGoForward: canGoForward(current) }),
    [current]
  );

  return (
    <HistoryPositionContext.Provider value={value}>{children}</HistoryPositionContext.Provider>
  );
};

export default HistoryPositionProvider;
