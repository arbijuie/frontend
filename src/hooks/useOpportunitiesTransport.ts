import { useContext } from "react";
import { OpportunitiesTransportContext } from "../lib/opportunitiesTransportContext";

export function useOpportunitiesTransport() {
  const value = useContext(OpportunitiesTransportContext);
  if (!value) {
    throw new Error("useOpportunitiesTransport must be used within OpportunitiesSocketProvider");
  }
  return value;
}
