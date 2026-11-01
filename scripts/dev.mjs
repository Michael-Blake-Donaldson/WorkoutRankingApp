import "dotenv/config";
import { spawn } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.runtime", quiet: true });
if (!process.env.RUNTIME_DATABASE_URL)
  throw new Error("Run npm run db:runtime first");
const origin = new URL(process.env.BETTER_AUTH_URL ?? "");
if (origin.protocol !== "http:" || origin.hostname !== "127.0.0.1")
  throw new Error("Local dev requires BETTER_AUTH_URL=http://127.0.0.1:<port>");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    origin.hostname,
    "--port",
    origin.port || "80",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.RUNTIME_DATABASE_URL },
  },
);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
