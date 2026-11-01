import "dotenv/config";
import { createHash, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Trust only this local test key for Chromium service-worker fetches. Context-level
// ignoreHTTPSErrors alone does not apply to its separate service-worker process.
const certificate = new X509Certificate(readFileSync(".local-tls/cert.pem"));
const fingerprint = createHash("sha256")
  .update(certificate.publicKey.export({ type: "spki", format: "der" }))
  .digest("base64");

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "https://localhost:3443",
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [`--ignore-certificate-errors-spki-list=${fingerprint}`],
        },
      },
    },
    { name: "webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "https://localhost:3443/sign-in",
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { NODE_EXTRA_CA_CERTS: resolve(".local-tls/cert.pem") },
  },
});
