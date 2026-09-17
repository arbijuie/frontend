import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWsAuthTicket, getWsUrl } from "../api/ws";
import { API_TOKEN } from "../api/config";
import { getBackoffDelayMs, shouldGiveUp } from "../lib/wsBackoff";
import type { OpportunitiesResponse } from "../api/types";

export type TransportState = "connecting" | "connected" | "reconnecting" | "polling-fallback";

export function useOpportunitiesSocket() {
  const queryClient = useQueryClient();
  const [transportState, setTransportState] = useState<TransportState>("connecting");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  const scheduleReconnect = () => {
    attemptRef.current += 1;
    setReconnectAttempt(attemptRef.current);

    if (shouldGiveUp(attemptRef.current)) {
      setTransportState("polling-fallback");
      return;
    }

    setTransportState("reconnecting");
    const delay = getBackoffDelayMs(attemptRef.current);
    reconnectTimerRef.current = setTimeout(connect, delay);
  };

  const connect = async () => {
    if (stoppedRef.current) return;
    setTransportState(attemptRef.current === 0 ? "connecting" : "reconnecting");

    try {
      let ticket: string | undefined;
      if (API_TOKEN) {
        const ticketResponse = await fetchWsAuthTicket();
        ticket = ticketResponse.ticket;
      }

      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        if (ticket) {
          ws.send(JSON.stringify({ type: "auth", ticket }));
        }
        attemptRef.current = 0;
        setReconnectAttempt(0);
        setTransportState("connected");
      };

      ws.onmessage = (event) => {
        try {
          const frame: OpportunitiesResponse = JSON.parse(event.data);
          const cached = queryClient.getQueryData<OpportunitiesResponse>(["opportunities"]);
          if (cached?.updated_at && frame.updated_at && frame.updated_at < cached.updated_at) {
            return;
          }
          queryClient.setQueryData(["opportunities"], frame);
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!stoppedRef.current) {
          scheduleReconnect();
        }
      };

      wsRef.current = ws;
    } catch {
      scheduleReconnect();
    }
  };

  const retryNow = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    attemptRef.current = 0;
    setReconnectAttempt(0);
    void connect();
  };

  useEffect(() => {
    stoppedRef.current = false;
    void connect();
    return () => {
      stoppedRef.current = true;
      wsRef.current?.close();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  return { transportState, reconnectAttempt, retryNow };
}
