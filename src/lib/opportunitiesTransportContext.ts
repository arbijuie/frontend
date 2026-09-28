import { createContext } from "react";
import type { useOpportunitiesSocket } from "../hooks/useOpportunitiesSocket";

export type OpportunitiesTransportValue = ReturnType<typeof useOpportunitiesSocket>;

export const OpportunitiesTransportContext = createContext<OpportunitiesTransportValue | null>(
  null
);
