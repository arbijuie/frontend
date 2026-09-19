import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWsAuthTicket, getWsUrl } from "../api/ws";
import { API_TOKEN } from "../api/config";
import { getBackoffDelayMs, shouldGiveUp } from "../lib/wsBackoff";
import type { OpportunitiesResponse } from "../api/types";

export type TransportState = "connecting" | "connected" | "reconnecting" | "polling-fallback";

const STALL_TIMEOUT_MS = 60000;

export function useOpportunitiesSocket() {
  const queryClient = useQueryClient();

  const [transportState, setTransportState] = useState<TransportState>("connecting");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const connectRef = useRef<() => Promise<void>>(async () => {});

  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  const armStallTimer = useCallback(
    (ws: WebSocket) => {
      clearStallTimer();

      stallTimerRef.current = setTimeout(() => {
        if (wsRef.current === ws) {
          ws.close();
        }
      }, STALL_TIMEOUT_MS);
    },
    [clearStallTimer]
  );

  const scheduleReconnect = useCallback(() => {
    attemptRef.current += 1;
    setReconnectAttempt(attemptRef.current);

    if (shouldGiveUp(attemptRef.current)) {
      setTransportState("polling-fallback");
      return;
    }

    setTransportState("reconnecting");

    const delay = getBackoffDelayMs(attemptRef.current);

    reconnectTimerRef.current = setTimeout(() => {
      void connectRef.current();
    }, delay);
  }, []);

  const connect = useCallback(async () => {
    if (stoppedRef.current) {
      return;
    }

    setTransportState(attemptRef.current === 0 ? "connecting" : "reconnecting");

    try {
      let ticket: string | undefined;

      if (API_TOKEN) {
        const ticketResponse = await fetchWsAuthTicket();
        ticket = ticketResponse.ticket;
      }

      if (stoppedRef.current) {
        return;
      }

      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        if (ticket) {
          ws.send(JSON.stringify({ type: "auth", ticket }));
        }

        attemptRef.current = 0;
        setReconnectAttempt(0);
        setTransportState("connected");

        armStallTimer(ws);
      };

      ws.onmessage = (event) => {
        armStallTimer(ws);

        try {
          const frame: OpportunitiesResponse = JSON.parse(event.data);

          const cached = queryClient.getQueryData<OpportunitiesResponse>(["opportunities"]);

          if (cached?.updated_at && frame.updated_at && frame.updated_at < cached.updated_at) {
            return;
          }

          queryClient.setQueryData(["opportunities"], frame);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }

        clearStallTimer();

        if (!stoppedRef.current) {
          scheduleReconnect();
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("WebSocket connection failed:", error);

      if (!stoppedRef.current) {
        scheduleReconnect();
      }
    }
  }, [armStallTimer, clearStallTimer, queryClient, scheduleReconnect]);

  const retryNow = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    attemptRef.current = 0;
    setReconnectAttempt(0);
    setTransportState("connecting");

    void connect();
  }, [connect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    stoppedRef.current = false;

    void connect();

    return () => {
      stoppedRef.current = true;

      wsRef.current?.close();
      wsRef.current = null;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      clearStallTimer();
    };
  }, [clearStallTimer, connect]);

  return {
    transportState,
    reconnectAttempt,
    retryNow,
  };
}
