export const API_URL = import.meta.env.VITE_ARB_API_URL as string;
export const API_TOKEN = import.meta.env.VITE_ARB_API_TOKEN as string | undefined;
export const POLL_INTERVAL_MS = 32_000;

export const authHeaders = (): HeadersInit =>
  API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};
