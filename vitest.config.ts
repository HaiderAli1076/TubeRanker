import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./vitest-setup.ts",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/app/dashboard/page.tsx",
        "src/app/onboarding/page.tsx",
        "src/app/login/page.tsx",
      ],
      exclude: [
        "node_modules/**",
        ".next/**",
        "vitest.config.ts",
        "vitest-setup.ts",
        "playwright.config.ts",
        "src/scratch/**",
        "src/types/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
