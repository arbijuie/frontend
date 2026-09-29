import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWsAuthTicket, getWsUrl, WsAuthTicketRequestError } from "../api/ws";
import { API_TOKEN } from "../api/config";
import { getBackoffDelayMs, shouldGiveUp } from "../lib/wsBackoff";
import type { OpportunitiesResponse } from "../api/types";

export type TransportState = "connecting" | "connected" | "reconnecting" | "polling-fallback";
export type AuthStatus = "ok" | "rate-limited" | "ticket-rejected" | "auth-failed";

type WsCloseLike = {
  code: number;
};

const STALL_TIMEOUT_MS = 60000;
const MAX_AUTH_REISSUE_ATTEMPTS = 3;
const DEFAULT_AUTH_RETRY_SECONDS = 5;
const DEFAULT_QUERY_KEY = ["opportunities"] as const;
export type TransportTransition = { state: TransportState; atMs: number };

const MAX_TRANSITIONS = 6;

function isUnauthorizedWsClose(event: WsCloseLike | Event | undefined): boolean {
  return !!event && "code" in event && event.code === 4401;
}

type AuthDiagnostics = {
  status: AuthStatus;
  retryAfterSeconds: number | null;
  detail: string | null;
};

type UseOpportunitiesSocketOptions = {
  enabled?: boolean;
  queryKey?: readonly unknown[];
};

export function useOpportunitiesSocket(options?: UseOpportunitiesSocketOptions) {
  const enabled = options?.enabled ?? true;
  const queryKey = useMemo(() => options?.queryKey ?? DEFAULT_QUERY_KEY, [options?.queryKey]);
  const queryClient = useQueryClient();
  const [transportState, setTransportStateRaw] = useState<TransportState>(
    enabled ? "connecting" : "polling-fallback"
  );
  const [transitions, setTransitions] = useState<TransportTransition[]>([]);
  const [lastMessageAtMs, setLastMessageAtMs] = useState<number | null>(null);
  const lastRecordedStateRef = useRef<TransportState | null>(null);

  const setTransportState = (next: TransportState) => {
    setTransportStateRaw(next);
    if (lastRecordedStateRef.current === next) return;
    lastRecordedStateRef.current = next;
    const atMs = Date.now();
    setTransitions((prev) => [...prev, { state: next, atMs }].slice(-MAX_TRANSITIONS));
  };
  const [authDiagnostics, setAuthDiagnostics] = useState<AuthDiagnostics>({
    status: "ok",
    retryAfterSeconds: null,
    detail: null,
  });
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [authRetryAttempt, setAuthRetryAttempt] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const authReissueAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRejectReasonRef = useRef<"expired" | "reused" | null>(null);
  const queryKeyRef = useRef(queryKey);
  const stoppedRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => {
    queryKeyRef.current = queryKey;
  }, [queryKey]);

  const clearStallTimer = () => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

  const armStallTimer = (ws: WebSocket) => {
    clearStallTimer();
    stallTimerRef.current = setTimeout(() => {
      if (wsRef.current === ws) {
        ws.close();
      }
    }, STALL_TIMEOUT_MS);
  };

  const scheduleReconnect = () => {
    const failureCount = attemptRef.current;
    attemptRef.current += 1;
    setReconnectAttempt(attemptRef.current);

    if (shouldGiveUp(failureCount)) {
      setTransportState("polling-fallback");
      return;
    }

    setTransportState("reconnecting");
    const delay = getBackoffDelayMs(failureCount);
    reconnectTimerRef.current = setTimeout(connect, delay);
  };

  const scheduleAuthRetry = (delayMs: number, authStatus: AuthStatus, detail: string | null) => {
    authReissueAttemptRef.current += 1;
    setAuthRetryAttempt(authReissueAttemptRef.current);
    setAuthDiagnostics({
      status: authStatus,
      retryAfterSeconds: null,
      detail,
    });

    if (authReissueAttemptRef.current > MAX_AUTH_REISSUE_ATTEMPTS) {
      setTransportState("polling-fallback");
      setAuthDiagnostics({
        status: "auth-failed",
        retryAfterSeconds: null,
        detail: "WS auth failed repeatedly; using polling fallback.",
      });
      return;
    }

    setTransportState("reconnecting");
    reconnectTimerRef.current = setTimeout(connect, delayMs);
  };

  const scheduleRateLimitedRetry = (retryAfterSeconds: number | null) => {
    const fallbackRetrySeconds = Math.max(
      DEFAULT_AUTH_RETRY_SECONDS,
      Math.ceil(getBackoffDelayMs(authReissueAttemptRef.current) / 1000)
    );
    const hasValidRetryAfter = !!(retryAfterSeconds && retryAfterSeconds > 0);
    const requestedRetrySeconds = hasValidRetryAfter ? retryAfterSeconds : fallbackRetrySeconds;
    const safeRetrySeconds = Math.max(DEFAULT_AUTH_RETRY_SECONDS, requestedRetrySeconds);
    const retryDetail = !hasValidRetryAfter
      ? "Retry-After missing or invalid; using safe default delay."
      : requestedRetrySeconds < DEFAULT_AUTH_RETRY_SECONDS
        ? "Retry-After below safe minimum; applying minimum delay."
        : null;
    authReissueAttemptRef.current += 1;
    setAuthRetryAttempt(authReissueAttemptRef.current);
    setAuthDiagnostics({
      status: "rate-limited",
      retryAfterSeconds: safeRetrySeconds,
      detail: retryDetail,
    });

    if (authReissueAttemptRef.current > MAX_AUTH_REISSUE_ATTEMPTS) {
      setTransportState("polling-fallback");
      setAuthDiagnostics({
        status: "auth-failed",
        retryAfterSeconds: null,
        detail: "WS ticket request rate-limited repeatedly; using polling fallback.",
      });
      return;
    }

    setTransportState("reconnecting");
    reconnectTimerRef.current = setTimeout(connect, safeRetrySeconds * 1000);
  };

  const connect = async () => {
    const myGeneration = ++generationRef.current;
    if (stoppedRef.current) return;
    if (!enabled) return;
    const isFreshSessionAttempt =
      attemptRef.current === 0 && authReissueAttemptRef.current === 0 && wsRef.current === null;
    if (isFreshSessionAttempt) {
      setReconnectAttempt(0);
      setAuthRetryAttempt(0);
      setAuthDiagnostics({
        status: "ok",
        retryAfterSeconds: null,
        detail: null,
      });
    }
    setTransportState(isFreshSessionAttempt ? "connecting" : "reconnecting");

    try {
      let ticket: string | undefined;
      let waitingForTicketAuth = false;
      let socketOpened = false;
      pendingRejectReasonRef.current = null;
      if (API_TOKEN) {
        try {
          const ticketResponse = await fetchWsAuthTicket();
          ticket = ticketResponse.ticket;
          waitingForTicketAuth = true;
          pendingRejectReasonRef.current = ticketResponse.last_reject_reason ?? null;
        } catch (error) {
          if (error instanceof WsAuthTicketRequestError && error.status === 429) {
            if (myGeneration === generationRef.current && !stoppedRef.current) {
              scheduleRateLimitedRetry(error.retryAfterSeconds);
            }
            return;
          }

          if (myGeneration === generationRef.current && !stoppedRef.current) {
            scheduleAuthRetry(
              getBackoffDelayMs(authReissueAttemptRef.current),
              "auth-failed",
              "Unable to issue WS auth ticket."
            );
          }
          return;
        }
      }

      if (stoppedRef.current || myGeneration !== generationRef.current) {
        return;
      }

      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        if (myGeneration !== generationRef.current) {
          ws.close();
          return;
        }
        socketOpened = true;
        if (ticket) {
          ws.send(JSON.stringify({ type: "auth", ticket }));
        }
        attemptRef.current = 0;
        setReconnectAttempt(0);
        setAuthRetryAttempt(authReissueAttemptRef.current);
        armStallTimer(ws);
      };

      ws.onmessage = (event) => {
        if (myGeneration !== generationRef.current) return;
        armStallTimer(ws);

        // Any frame implies auth handshake completed and we should not classify
        // subsequent closes as ticket-auth rejection.
        setLastMessageAtMs(Date.now());
        waitingForTicketAuth = false;

        try {
          const frame: OpportunitiesResponse = JSON.parse(event.data);
          const cached = queryClient.getQueryData<OpportunitiesResponse>(queryKeyRef.current);
          if (cached?.updated_at && frame.updated_at) {
            const cachedTime = new Date(cached.updated_at).getTime();
            const frameTime = new Date(frame.updated_at).getTime();
            if (frameTime < cachedTime) return;
          }
          queryClient.setQueryData(queryKeyRef.current, frame);
          setTransportState("connected");
          authReissueAttemptRef.current = 0;
          setAuthRetryAttempt(0);
          pendingRejectReasonRef.current = null;
          setAuthDiagnostics({
            status: "ok",
            retryAfterSeconds: null,
            detail: null,
          });
        } catch (error) {
          // Malformed WS frame — log for visibility, keep the connection alive.
          console.warn("Failed to parse opportunities WS frame:", error);
        }
      };

      ws.onclose = (event) => {
        if (myGeneration !== generationRef.current) return;
        wsRef.current = null;
        clearStallTimer();
        if (!stoppedRef.current) {
          if (API_TOKEN && waitingForTicketAuth && socketOpened && isUnauthorizedWsClose(event)) {
            const reason = pendingRejectReasonRef.current;
            pendingRejectReasonRef.current = null;
            const detail =
              reason === "expired"
                ? "WS auth ticket expired; requesting a new ticket."
                : reason === "reused"
                  ? "WS auth ticket was already used; requesting a new ticket."
                  : "WS auth ticket was rejected; requesting a new ticket.";
            scheduleAuthRetry(
              getBackoffDelayMs(authReissueAttemptRef.current),
              "ticket-rejected",
              detail
            );
            return;
          }
          scheduleReconnect();
        }
      };

      wsRef.current = ws;
    } catch {
      if (myGeneration === generationRef.current && !stoppedRef.current) {
        scheduleReconnect();
      }
    }
  };

  const retryNow = () => {
    if (!enabled) {
      return;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    generationRef.current += 1;
    wsRef.current?.close();
    wsRef.current = null;
    clearStallTimer();
    attemptRef.current = 0;
    authReissueAttemptRef.current = 0;
    setReconnectAttempt(0);
    setAuthRetryAttempt(0);
    setAuthDiagnostics({
      status: "ok",
      retryAfterSeconds: null,
      detail: null,
    });
    void connect();
  };

  useEffect(() => {
    if (!enabled) {
      stoppedRef.current = true;
      generationRef.current += 1;
      wsRef.current?.close();
      wsRef.current = null;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      clearStallTimer();
      attemptRef.current = 0;
      authReissueAttemptRef.current = 0;
      return;
    }
    stoppedRef.current = false;
    void connect();
    return () => {
      stoppedRef.current = true;
      generationRef.current += 1;
      wsRef.current?.close();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      clearStallTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const effectiveAuthDiagnostics = enabled
    ? authDiagnostics
    : { status: "ok" as const, retryAfterSeconds: null, detail: null };

  return {
    transportState: enabled ? transportState : "polling-fallback",
    reconnectAttempt: enabled ? reconnectAttempt : 0,
    authRetryAttempt: enabled ? authRetryAttempt : 0,
    authStatus: effectiveAuthDiagnostics.status,
    authRetryAfterSeconds: effectiveAuthDiagnostics.retryAfterSeconds,
    authDetail: effectiveAuthDiagnostics.detail,
    lastMessageAtMs,
    transitions,
    retryNow,
  };
}
