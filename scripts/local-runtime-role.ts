import "dotenv/config";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { config } from "dotenv";
import { Client } from "pg";

// Local development helper only. Production role setup is an operator action.
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const owner = new URL(process.env.DATABASE_URL);
if (
  !["127.0.0.1", "localhost"].includes(owner.hostname) ||
  owner.pathname !== "/fitness"
)
  throw new Error("Only local fitness database configuration is supported");
if (!existsSync(".env.runtime")) {
  const runtime = new URL(owner);
  runtime.username = "fitness_runtime";
  runtime.password = randomBytes(32).toString("hex");
  await writeFile(
    ".env.runtime",
    `RUNTIME_DATABASE_URL=${runtime.toString()}\n`,
    { mode: 0o600 },
  );
}
config({ path: ".env.runtime", quiet: true });
const runtime = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (
  runtime.username !== "fitness_runtime" ||
  runtime.hostname !== owner.hostname ||
  runtime.port !== owner.port ||
  runtime.pathname !== "/fitness" ||
  !runtime.password
)
  throw new Error("Invalid local runtime role configuration");
const admin = new URL(owner);
admin.pathname = "/postgres";
const client = new Client({ connectionString: admin.toString() });
try {
  await client.connect();
  const exists = (
    await client.query(
      "SELECT 1 FROM pg_roles WHERE rolname = 'fitness_runtime'",
    )
  ).rowCount;
  // PostgreSQL formats a password literal safely; the raw statement is never logged.
  const sql = await client.query("SELECT format($1, $2::text) AS statement", [
    exists
      ? "ALTER ROLE fitness_runtime LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS"
      : "CREATE ROLE fitness_runtime LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS",
    decodeURIComponent(runtime.password),
  ]);
  await client.query(sql.rows[0].statement);
} finally {
  await client.end();
}
for (const database of ["fitness", "fitness_test", "fitness_e2e"]) {
  const target = new URL(owner);
  target.pathname = `/${database}`;
  const connection = new Client({ connectionString: target.toString() });
  try {
    await connection.connect();
    await connection.query(
      "REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO fitness_runtime",
    );
    await connection.query(
      "GRANT SELECT, INSERT, UPDATE ON users TO fitness_runtime",
    );
    await connection.query(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON sessions, accounts, verifications, request_buckets TO fitness_runtime",
    );
    await connection.query(
      "GRANT SELECT ON invitations, account_capacity TO fitness_runtime",
    );
    await connection.query(
      "GRANT SELECT ON muscles, exercises, exercise_versions, exercise_muscles, exercise_equipment TO fitness_runtime",
    );
    await connection.query(
      "GRANT SELECT, INSERT, DELETE ON user_exercise_restrictions, user_exercise_choices TO fitness_runtime",
    );
    // No audit mutation or invitation/capacity writes granted to the web process.
    await connection.query(
      "GRANT SELECT, INSERT, UPDATE ON fitness_profiles, equipment_profiles TO fitness_runtime",
    );
    await connection.query(
      "GRANT SELECT, INSERT, DELETE ON equipment_items TO fitness_runtime",
    );
    await connection.query(
      "GRANT SELECT, INSERT ON body_measurements, profile_revisions, profile_mutations TO fitness_runtime",
    );
  } finally {
    await connection.end();
  }
}
console.log(
  "Local runtime role configured for application and disposable test databases. Secret saved in ignored .env.runtime.",
);
