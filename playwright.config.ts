import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  use: { baseURL: 'http://127.0.0.1:4173/word-grid-solver/' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort --base /word-grid-solver/',
    url: 'http://127.0.0.1:4173/word-grid-solver/',
    reuseExistingServer: false,
  },
});
