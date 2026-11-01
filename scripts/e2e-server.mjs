import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createServer } from "node:https";
import { config } from "dotenv";
import next from "next";

// This entry point binds only loopback, always uses an isolated DB, and serves the real production build.
process.env.NODE_ENV = "production";
config({ path: ".env.runtime", quiet: true });
if (!process.env.RUNTIME_DATABASE_URL)
  throw new Error("Run npm run db:runtime first");
const database = new URL(process.env.RUNTIME_DATABASE_URL);
if (!["127.0.0.1", "localhost"].includes(database.hostname))
  throw new Error("E2E server requires local database");
database.pathname = "/fitness_e2e";
process.env.DATABASE_URL = database.toString();
process.env.BETTER_AUTH_URL = "https://localhost:3443";
process.env.BETTER_AUTH_SECRET = "e2e-only-not-a-production-secret-".repeat(3);
process.env.SMTP_HOST = "localhost";
process.env.SMTP_PORT = "51465";
process.env.SMTP_SECURE = "true";
process.env.SMTP_USER = "test";
process.env.SMTP_PASSWORD = "test-only-local";
const app = next({ dev: false, hostname: "localhost", port: 3443 });
await app.prepare();
const server = createServer(
  {
    key: await readFile(".local-tls/key.pem"),
    cert: await readFile(".local-tls/cert.pem"),
  },
  app.getRequestHandler(),
);
server.listen(3443, "127.0.0.1", () =>
  console.log("Production E2E server on https://localhost:3443"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
