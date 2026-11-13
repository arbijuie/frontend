/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_ARB_API_URL: string;
  readonly VITE_ARB_WS_URL?: string;
  readonly VITE_ARB_TELEGRAM_SESSION_HEADER_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface TelegramBackButton {
  show?: () => void;
  hide?: () => void;
  onClick?: (callback: () => void) => void;
  offClick?: (callback: () => void) => void;
}

interface TelegramWebApp {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  BackButton?: TelegramBackButton;
  isVersionAtLeast?: (version: string) => boolean;
}

interface TelegramGlobal {
  WebApp?: TelegramWebApp;
}

interface Window {
  Telegram?: TelegramGlobal;
}
