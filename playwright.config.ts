import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the a11y + smoke tests.
 *
 * Assumes the production build already exists (`pnpm build`); `webServer`
 * starts `pnpm start` on port 3000 and reuses an already-running instance
 * in local dev. The tests hit only *public* pages (`/`, `/frameworks`) so
 * they need neither a database nor an IdP.
 *
 * Run: `pnpm build && pnpm test:e2e`
 *
 * @see tests/e2e/smoke.spec.ts
 * @see .github/workflows/ci.yml (a11y job)
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
