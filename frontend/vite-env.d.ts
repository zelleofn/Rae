/// <reference types="vite/client" />
/// <reference types="chrome" />

declare module 'pdfjs-dist';

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
