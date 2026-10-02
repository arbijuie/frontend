import { API_URL, setTelegramSessionToken, authFetch } from "./config";
import type { TelegramSessionResponse } from "./types";

export class TelegramSessionBootstrapError extends Error {
  status: number;
  detail: string | null;

  constructor(status: number, message: string, detail: string | null = null) {
    super(message);
    this.name = "TelegramSessionBootstrapError";
    this.status = status;
    this.detail = detail;
  }
}

export function formatTelegramBootstrapErrorForDisplay(
  error: TelegramSessionBootstrapError,
): string {
  if (error.status === 400 && error.detail?.includes("initData is missing")) {
    return "Open this app from Telegram to authenticate.";
  }
  if (error.status === 401) {
    return "Telegram authorization failed. Reopen the app from the bot and try again.";
  }
  if (error.status >= 500) {
    return "Telegram authentication service is temporarily unavailable.";
  }
  return `Unable to authenticate in Telegram mode (HTTP ${error.status}).`;
}

function getTelegramInitData(): string | null {
  const tg = window.Telegram?.WebApp;
  if (!tg?.initData || !tg.initData.trim()) {
    return null;
  }
  return tg.initData;
}

export function hasTelegramWebAppContext(): boolean {
  return Boolean(getTelegramInitData());
}

export async function bootstrapTelegramSession(): Promise<TelegramSessionResponse> {
  const initData = getTelegramInitData();
  if (!initData) {
    throw new TelegramSessionBootstrapError(400, "Telegram WebApp initData is missing");
  }

  const res = await authFetch(`${API_URL}/auth/telegram/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ init_data: initData }),
  });

  if (!res.ok) {
    const detail = await res
      .json()
      .then((body) => (typeof body?.detail === "string" ? body.detail : ""))
      .catch(() => "");
    throw new TelegramSessionBootstrapError(
      res.status,
      `POST /auth/telegram/session failed: ${res.status}`,
      detail || null,
    );
  }

  const payload: TelegramSessionResponse = await res.json();
  setTelegramSessionToken(payload.session_token);
  return payload;
}
