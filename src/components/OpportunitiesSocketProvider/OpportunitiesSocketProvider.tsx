import type { ReactNode } from "react";
import { useMemo } from "react";
import { OPPORTUNITIES_QUERY_KEY } from "../../api/opportunities";
import { useOpportunitiesSocket } from "../../hooks/useOpportunitiesSocket";
import { OpportunitiesTransportContext } from "../../lib/opportunitiesTransportContext";

interface OpportunitiesSocketProviderProps {
  children: ReactNode;
}

const OpportunitiesSocketProvider = ({ children }: OpportunitiesSocketProviderProps) => {
  const socket = useOpportunitiesSocket({ queryKey: OPPORTUNITIES_QUERY_KEY });
  const value = useMemo(() => socket, [socket]);

  return (
    <OpportunitiesTransportContext.Provider value={value}>
      {children}
    </OpportunitiesTransportContext.Provider>
  );
};

export default OpportunitiesSocketProvider;
