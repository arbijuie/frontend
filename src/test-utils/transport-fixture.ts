import type { OpportunitiesTransportValue } from "../lib/opportunitiesTransportContext";

export function makeTransport(
  overrides: Partial<OpportunitiesTransportValue> = {}
): OpportunitiesTransportValue {
  return {
    transportState: "connected",
    reconnectAttempt: 0,
    authRetryAttempt: 0,
    authStatus: "ok",
    authRetryAfterSeconds: null,
    authDetail: null,
    lastMessageAtMs: null,
    transitions: [],
    retryNow: vi.fn(),
    ...overrides,
  };
}
