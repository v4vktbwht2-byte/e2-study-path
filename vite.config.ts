import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function normalizeBasePath(basePath: string | undefined) {
  if (basePath === undefined || basePath.trim() === "") {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: normalizeBasePath(env.VITE_BASE_PATH),
    plugins: [react()],
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
