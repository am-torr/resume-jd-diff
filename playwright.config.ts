import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  // Two servers, each gated on its own readiness URL. Gating only on Vite let the first test
  // race the API cold start (tsx compile), which intermittently failed the first happy-path test.
  webServer: [
    {
      command: 'npx tsx server/index.ts',
      url: 'http://127.0.0.1:4274/api/health',
      env: {
        PORT: '4274',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npx vite --host 127.0.0.1 --port 5373 --strictPort',
      url: 'http://127.0.0.1:5373',
      env: {
        VITE_API_TARGET: 'http://127.0.0.1:4274',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:5373',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
