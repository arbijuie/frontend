/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_ARB_API_URL: string;
  readonly VITE_ARB_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
