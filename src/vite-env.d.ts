/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Глобальная константа версии, проброшенная через define в vite.config.js
declare const __APP_VERSION__: string;