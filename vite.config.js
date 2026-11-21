import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

// Версия приложения берётся напрямую из package.json
const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8"));
const APP_VERSION = pkg.version;

// Небольшой Vite-плагин: при каждой сборке автоматически генерирует
// version.json с текущей версией в выходную папку сборки (docs/).
function versionJsonPlugin() {
  const writeVersionJson = () => {
    try {
      mkdirSync(resolve(__dirname, "docs"), { recursive: true });
      writeFileSync(
        resolve(__dirname, "docs", "version.json"),
        JSON.stringify({ version: APP_VERSION }),
        "utf-8"
      );
      console.log(`[vite] docs/version.json сгенерирован (v${APP_VERSION})`);
    } catch (err) {
      console.warn("[vite] Не удалось записать version.json:", err);
    }
  };

  return {
    name: "generate-version-json",
    apply: "build",
    writeBundle: () => writeVersionJson(),
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'manifest.json'],
      manifest: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'custom-sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        swSrc: 'src/custom-sw.ts',
        maximumFileSizeToCacheInBytes: 5000000,
      }
    }),
    versionJsonPlugin(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  base: '/PoopTracker/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
