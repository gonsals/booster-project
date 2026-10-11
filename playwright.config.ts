import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/browser",
    timeout: 120_000,
    expect: { timeout: 15_000 },
    workers: 1,
    use: { baseURL: "http://127.0.0.1:4321", browserName: "chromium", trace: "retain-on-failure" },
    webServer: { command: "pnpm dev --host 127.0.0.1 --port 4321", url: "http://127.0.0.1:4321", timeout: 60_000, reuseExistingServer: !process.env.CI },
});
