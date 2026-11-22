import { defineConfig, devices } from '@playwright/test';

// Tests run against the production build served by `astro preview` under the real
// GitHub Pages base path, so base-path bugs show up here rather than after deployment.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx astro preview --host 127.0.0.1 --port 4321 --ignore-lock',
    url: 'http://127.0.0.1:4321/Saad-Shaikh-Analytics-Portfolio/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
