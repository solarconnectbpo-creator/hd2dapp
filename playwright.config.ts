import { defineConfig } from "@playwright/test";

/**
 * Run against local Expo web: `npm run web` then
 * `npx playwright install` (once) and `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.PW_BASE_URL ?? "http://127.0.0.1:8081",
    trace: "on-first-retry",
  },
});
