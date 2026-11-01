import { describe, expect, it } from "vitest";
import { readSmallJson } from "../../src/modules/auth/http";
import { hashToken } from "../../src/modules/auth/invitations";
import { readEnv } from "../../src/server/env";

describe("configuration and boundary validation", () => {
  it("rejects missing/short secrets without exposing input values", () => {
    expect(() =>
      readEnv({ ...process.env, BETTER_AUTH_SECRET: "sensitive" }),
    ).toThrow("Invalid configuration fields: BETTER_AUTH_SECRET");
  });
  it("requires HTTPS and authenticated TLS SMTP in production", () => {
    expect(() => readEnv({ ...process.env, NODE_ENV: "production" })).toThrow(
      "Production requires HTTPS",
    );
    expect(() =>
      readEnv({
        ...process.env,
        NODE_ENV: "production",
        BETTER_AUTH_URL: "https://fitness.example",
        SMTP_SECURE: "true",
        SMTP_USER: "test",
        SMTP_PASSWORD: "test",
      }),
    ).not.toThrow();
  });
  it("rejects malformed origins and invalid SMTP ports", () => {
    expect(() =>
      readEnv({
        ...process.env,
        BETTER_AUTH_URL: "https://fitness.example/path",
      }),
    ).toThrow("origin only");
    expect(() => readEnv({ ...process.env, SMTP_PORT: "70000" })).toThrow(
      "SMTP_PORT",
    );
  });
  it("hashes tokens deterministically without retaining plaintext", () => {
    expect(hashToken("test")).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    );
  });
  it("rejects oversized streamed bodies and invalid JSON", async () => {
    expect(
      await readSmallJson(
        new Request("http://localhost", {
          method: "POST",
          body: "x".repeat(5000),
        }),
      ),
    ).toBeNull();
    expect(
      await readSmallJson(
        new Request("http://localhost", { method: "POST", body: "{" }),
      ),
    ).toBeNull();
  });
});
