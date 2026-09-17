import { API_URL, authHeaders } from "./config";
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
  return `${API_URL.replace(/^http/, "ws")}/ws/opportunities`;
}
