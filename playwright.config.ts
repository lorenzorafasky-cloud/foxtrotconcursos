import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "corepack pnpm --filter @foxtrot/aluno exec next start -p 3100",
      url: "http://localhost:3100",
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "corepack pnpm --filter @foxtrot/admin exec next start -p 3101",
      url: "http://localhost:3101",
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "corepack pnpm --filter @foxtrot/professor exec next start -p 3102",
      url: "http://localhost:3102",
      reuseExistingServer: true,
      timeout: 120_000
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] }
    }
  ]
});
