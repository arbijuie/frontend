import { API_URL, WS_URL_OVERRIDE, authHeaders } from "./config";
import type { WsAuthTicketResponse } from "./types";

export async function fetchWsAuthTicket(): Promise<WsAuthTicketResponse> {
  const res = await fetch(`${API_URL}/ws/auth-ticket`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`POST /ws/auth-ticket failed: ${res.status}`);
  }
  return res.json();
}

export function getWsUrl(): string {
  if (WS_URL_OVERRIDE) {
    return WS_URL_OVERRIDE;
  }
  return `${API_URL.replace(/^http/, "ws")}/ws/opportunities`;
}
