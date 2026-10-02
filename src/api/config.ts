export const API_URL = import.meta.env.VITE_ARB_API_URL as string;
export const API_TOKEN = import.meta.env.VITE_ARB_API_TOKEN as string | undefined;
export const POLL_INTERVAL_MS = 32_000;
const TELEGRAM_SESSION_HEADER_NAME =
  (import.meta.env.VITE_ARB_TELEGRAM_SESSION_HEADER_NAME as string | undefined) ||
  "X-Arb-Telegram-Session";

let telegramSessionToken: string | null = null;

export const setTelegramSessionToken = (token: string | null): void => {
  telegramSessionToken = token && token.trim() ? token.trim() : null;
};

export const getTelegramSessionToken = (): string | null => telegramSessionToken;

export const hasRuntimeAuth = (): boolean =>
  Boolean((API_TOKEN && API_TOKEN.trim()) || telegramSessionToken);

export const authHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {};
  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  }
  if (telegramSessionToken) {
    headers[TELEGRAM_SESSION_HEADER_NAME] = telegramSessionToken;
  }
  return headers;
};

export async function authFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const mergedHeaders = new Headers(init.headers ?? {});
  const auth = authHeaders();
  for (const [key, value] of Object.entries(auth)) {
    mergedHeaders.set(key, value);
  }
  return fetch(input, { ...init, headers: mergedHeaders });
}

export const WS_URL_OVERRIDE = import.meta.env.VITE_ARB_WS_URL as string | undefined;
