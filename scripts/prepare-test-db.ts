import "dotenv/config";
import { spawnSync } from "node:child_process";
import { Client } from "pg";

const mode = process.argv[2];
const name =
  mode === "e2e"
    ? "fitness_e2e"
    : mode === "integration"
      ? "fitness_test"
      : null;
if (!name) throw new Error("Expected integration or e2e");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const base = new URL(process.env.DATABASE_URL);
if (!["127.0.0.1", "localhost"].includes(base.hostname))
  throw new Error("Test preparation is restricted to local PostgreSQL");
const admin = new URL(base);
admin.pathname = "/postgres";
const client = new Client({ connectionString: admin.toString() });
try {
  await client.connect();
  if (
    !(
      await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name])
    ).rowCount
  ) {
    // name is selected from two fixed literals above, never user-provided SQL.
    await client.query(`CREATE DATABASE ${name}`);
  }
} finally {
  await client.end();
}
base.pathname = `/${name}`;
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: base.toString() },
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
const seeded = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "db", "seed"],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: base.toString() } },
);
if (seeded.status !== 0) process.exit(seeded.status ?? 1);
console.log(
  `Disposable ${name} migrations applied. No production data changed.`,
);
