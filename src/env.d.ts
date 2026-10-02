/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_ARB_API_URL: string;
  readonly VITE_ARB_WS_URL?: string;
  readonly VITE_ARB_API_TOKEN?: string;
  readonly VITE_ARB_TELEGRAM_SESSION_HEADER_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface TelegramWebApp {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
}

interface TelegramGlobal {
  WebApp?: TelegramWebApp;
}

interface Window {
  Telegram?: TelegramGlobal;
}
