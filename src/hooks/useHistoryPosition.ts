import { createContext, useContext } from "react";

export interface HistoryPosition {
  index: number;
  canGoForward: boolean;
}

export const HistoryPositionContext = createContext<HistoryPosition>({
  index: 0,
  canGoForward: false,
});

export function useHistoryPosition(): HistoryPosition {
  return useContext(HistoryPositionContext);
}
