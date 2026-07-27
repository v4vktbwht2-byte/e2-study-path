import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import packageMetadata from "./package.json";

export function normalizeBasePath(basePath: string | undefined) {
  if (basePath === undefined || basePath.trim() === "") {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const basePath = normalizeBasePath(env.VITE_BASE_PATH);

  return {
    base: basePath,
    define: {
      __APP_VERSION__: JSON.stringify(packageMetadata.version),
    },
    plugins: [
      react(),
      VitePWA({
        base: basePath,
        scope: basePath,
        strategies: "injectManifest",
        srcDir: "src/infrastructure/pwa",
        filename: "service-worker.ts",
        injectRegister: false,
        registerType: "prompt",
        manifestFilename: "manifest.webmanifest",
        includeAssets: ["offline.html", "icons/app-icon-source.svg"],
        manifest: {
          id: basePath,
          name: "E2 Study Path — 基礎から続ける英語学習",
          short_name: "E2 Study Path",
          description: "英語初学者が基礎から段階的に学べる、非公式の自己学習PWA",
          lang: "ja",
          categories: ["education"],
          display: "standalone",
          orientation: "any",
          background_color: "#f6f8fc",
          theme_color: "#365fc7",
          start_url: basePath,
          scope: basePath,
          icons: [
            {
              src: "icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "icons/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,png,svg,webmanifest,json}"],
          globIgnores: [
            "**/content/**",
            "**/audio/**",
            "**/assets/audio/**",
            "offline.html",
            "manifest.webmanifest",
            "icons/**",
            "**/*.map",
          ],
          additionalManifestEntries: [
            {
              url: `${basePath}content/pilot-core-ja-original/0.7.0/index.json`,
              revision: "0.7.0",
            },
          ],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/**/*.d.ts",
          "src/**/*.test.{ts,tsx}",
          "src/**/*.spec.{ts,tsx}",
          "src/main.tsx",
        ],
      },
    },
  };
});
