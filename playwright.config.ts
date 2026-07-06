import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  webServer: {
    command: 'npx.cmd concurrently -k -s first -n api,web "tsx server/index.ts" "vite --host 127.0.0.1 --port 5373 --strictPort"',
    url: 'http://127.0.0.1:5373',
    env: {
      PORT: '4274',
      VITE_API_TARGET: 'http://127.0.0.1:4274',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
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
