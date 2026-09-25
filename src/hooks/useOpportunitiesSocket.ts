import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWsAuthTicket, getWsUrl } from "../api/ws";
import { API_TOKEN } from "../api/config";
import { getBackoffDelayMs, shouldGiveUp } from "../lib/wsBackoff";
import type { OpportunitiesResponse } from "../api/types";

export type TransportState = "connecting" | "connected" | "reconnecting" | "polling-fallback";

const STALL_TIMEOUT_MS = 60000;

type UseOpportunitiesSocketOptions = {
  queryKey?: readonly unknown[];
  enabled?: boolean;
};

export function useOpportunitiesSocket(options?: UseOpportunitiesSocketOptions) {
  const queryKey = options?.queryKey ?? ["opportunities"];
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();
  const [transportState, setTransportState] = useState<TransportState>(
    enabled ? "connecting" : "polling-fallback"
  );
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const generationRef = useRef(0);

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

  const connect = async () => {
    const myGeneration = ++generationRef.current;
    if (stoppedRef.current) return;
    setTransportState(attemptRef.current === 0 ? "connecting" : "reconnecting");

    try {
      let ticket: string | undefined;
      if (API_TOKEN) {
        const ticketResponse = await fetchWsAuthTicket();
        ticket = ticketResponse.ticket;
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
        if (ticket) {
          ws.send(JSON.stringify({ type: "auth", ticket }));
        }
        attemptRef.current = 0;
        setReconnectAttempt(0);
        armStallTimer(ws);
      };

      ws.onmessage = (event) => {
        if (myGeneration !== generationRef.current) return;
        armStallTimer(ws);

        try {
          const frame: OpportunitiesResponse = JSON.parse(event.data);
          const cached = queryClient.getQueryData<OpportunitiesResponse>(queryKey);
          if (cached?.updated_at && frame.updated_at) {
            const cachedTime = new Date(cached.updated_at).getTime();
            const frameTime = new Date(frame.updated_at).getTime();
            if (frameTime < cachedTime) return;
          }
          queryClient.setQueryData(queryKey, frame);
          setTransportState("connected");
        } catch (error) {
          // Malformed WS frame — log for visibility, keep the connection alive.
          console.warn("Failed to parse opportunities WS frame:", error);
        }
      };

      ws.onclose = () => {
        if (myGeneration !== generationRef.current) return;
        wsRef.current = null;
        clearStallTimer();
        if (!stoppedRef.current) {
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
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    generationRef.current += 1;
    wsRef.current?.close();
    wsRef.current = null;
    clearStallTimer();
    attemptRef.current = 0;
    setReconnectAttempt(0);
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
      setReconnectAttempt(0);
      setTransportState("polling-fallback");
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

  return { transportState, reconnectAttempt, retryNow };
}
