import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/inventory-results.json" }],
  ],
  use: {
    baseURL:
      process.env.BACKEND_BASE_URL ??
      "https://json-backend-staging-9413d4381c05.herokuapp.com",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
});
