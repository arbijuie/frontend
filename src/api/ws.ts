import { API_URL, WS_URL_OVERRIDE, authHeaders } from "./config";
import type { WsAuthTicketResponse } from "./types";

export class WsAuthTicketRequestError extends Error {
  status: number;
  retryAfterSeconds: number | null;

  constructor(status: number, retryAfterSeconds: number | null) {
    super(`POST /ws/auth-ticket failed: ${status}`);
    this.name = "WsAuthTicketRequestError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function parseRetryAfterSeconds(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function fetchWsAuthTicket(): Promise<WsAuthTicketResponse> {
  const res = await fetch(`${API_URL}/ws/auth-ticket`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new WsAuthTicketRequestError(
      res.status,
      parseRetryAfterSeconds(res.headers.get("Retry-After"))
    );
  }
  return res.json();
}

export function getWsUrl(): string {
  if (WS_URL_OVERRIDE) {
    return WS_URL_OVERRIDE;
  }
  return `${API_URL.replace(/^http/, "ws")}/ws/opportunities`;
}
