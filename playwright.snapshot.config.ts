import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
    ...config,
    use: { ...config.use, baseURL: "http://127.0.0.1:4322" },
    webServer: {
        command: "node scripts/snapshot-server.mjs",
        url: "http://127.0.0.1:4322", timeout: 120_000, reuseExistingServer: false,
    },
});
