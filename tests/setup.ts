import "dotenv/config";

// Explicit disposable database only; never run tests against the application database.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://fitness:local-development-only@127.0.0.1:55432/fitness_test";
const target = new URL(process.env.DATABASE_URL);
if (
  !["127.0.0.1", "localhost"].includes(target.hostname) ||
  target.pathname !== "/fitness_test"
)
  throw new Error("Tests require the local fitness_test database");
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.BETTER_AUTH_SECRET = "test-only-not-a-production-secret-".repeat(3);
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_PORT = "51025";
process.env.SMTP_FROM = "Fitness tests <no-reply@fitness.local>";
process.env.SMTP_SECURE = "false";
