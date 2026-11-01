import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getMe } from "../../src/app/api/me/route";
import { handleAuth } from "../../src/modules/auth/http";
import {
  createInvitation,
  hashToken,
} from "../../src/modules/auth/invitations";
import { db } from "../../src/server/db";
import { consumeBucket } from "../../src/server/rate-limit";

const origin = "http://localhost:3000";
const post = (
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  handleAuth(
    new Request(`${origin}/api/auth${path}`, {
      method: "POST",
      headers: { origin, "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );

async function requestLink(email: string, invitationToken?: string) {
  const response = await post("/sign-in/magic-link", {
    email,
    ...(invitationToken ? { invitationToken } : {}),
  });
  expect(response.status).toBe(200);
  const messages = await (
    await fetch("http://127.0.0.1:58025/api/v1/messages")
  ).json();
  const message = messages.messages.find((m: { To: { Address: string }[] }) =>
    m.To.some((t) => t.Address === email),
  );
  expect(message, "Expected a real SMTP message in local Mailpit").toBeTruthy();
  const detail = await (
    await fetch(`http://127.0.0.1:58025/api/v1/message/${message.ID}`)
  ).json();
  const link = detail.Text.match(
    /http:\/\/localhost:3000\/verify#token=[^\s]+/,
  )?.[0];
  expect(link).toBeTruthy();
  const token = new URLSearchParams(new URL(link).hash.slice(1)).get("token");
  if (!token) throw new Error("Missing magic-link token in test email");
  return token;
}
async function join(email: string) {
  const invite = await createInvitation(email);
  const token = await requestLink(email, invite);
  const response = await post("/verify-link", { token });
  expect(response.status).toBe(200);
  const cookies = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(cookies).toContain("session_token");
  return { cookies, response, token };
}

beforeEach(async () => {
  // tests/setup.ts verifies this database is exactly loopback/fitness_test.
  await db.$executeRawUnsafe(
    "TRUNCATE users, invitations, sessions, accounts, verifications, audit_events, request_buckets CASCADE",
  );
  await db.capacity.update({ where: { id: 1 }, data: { occupied: 0 } });
});
afterAll(async () => {
  await db.$disconnect();
});

describe("real PostgreSQL invitation and session security", () => {
  it("lets an existing account sign in again without reusing an invitation", async () => {
    const email = `returning-${randomUUID()}@example.test`;
    await join(email);
    const token = await requestLink(email);
    expect((await post("/verify-link", { token })).status).toBe(200);
    expect(await db.user.count()).toBe(1);
    expect(
      await db.auditEvent.count({ where: { eventType: "session.created" } }),
    ).toBe(2);
  });
  it("denies expired email proofs and invalidates reissued invitation tokens", async () => {
    const email = `expiry-${randomUUID()}@example.test`;
    const old = await createInvitation(email);
    const fresh = await createInvitation(email);
    await post("/sign-in/magic-link", { email, invitationToken: old });
    expect(await db.verification.count()).toBe(0);
    const token = await requestLink(email, fresh);
    await db.verification.updateMany({ data: { expiresAt: new Date(0) } });
    expect((await post("/verify-link", { token })).status).toBe(400);
    expect(await db.user.count()).toBe(0);
  });
  it("completes an invited email proof, consumes invitation, sets HttpOnly cookie and returns only own identity", async () => {
    const email = `owner-${randomUUID()}@example.test`;
    const { cookies, response } = await join(email);
    expect(response.headers.get("set-cookie")).toMatch(/httponly/i);
    expect(response.headers.get("set-cookie")).toMatch(/samesite=lax/i);
    expect(await response.json()).toEqual({ message: "Signed in" });
    expect(
      (await db.invitation.findUniqueOrThrow({ where: { email } })).usedAt,
    ).not.toBeNull();
    const own = await getMe(
      new Request(`${origin}/api/me?userId=someone-else`, {
        headers: { cookie: cookies },
      }),
    );
    expect((await own.json()).email).toBe(email);
    const session = await handleAuth(
      new Request(`${origin}/api/auth/get-session`, {
        headers: { cookie: cookies },
      }),
    );
    const body = await session.json();
    expect(body.user.email).toBe(email);
    expect(body.session).toBeUndefined();
    expect(body.token).toBeUndefined();
    expect(session.headers.get("cache-control")).toBe("no-store");
  });
  it("denies unauthenticated identity reads and protected library endpoints", async () => {
    expect((await getMe(new Request(`${origin}/api/me`))).status).toBe(401);
    for (const path of [
      "/sign-up/email",
      "/update-user",
      "/change-email",
      "/magic-link/verify",
    ]) {
      expect((await post(path, {})).status).toBe(404);
    }
    expect(
      (
        await handleAuth(
          new Request(`${origin}/api/auth/magic-link/verify?token=anything`),
        )
      ).status,
    ).toBe(404);
  });
  it("returns generic responses for unknown account, wrong invite and wrong invited email without creating users", async () => {
    const token = await createInvitation("invited@example.test");
    const unknown = await post("/sign-in/magic-link", {
      email: "unknown@example.test",
    });
    const wrong = await post("/sign-in/magic-link", {
      email: "invited@example.test",
      invitationToken: "0".repeat(64),
    });
    const mismatch = await post("/sign-in/magic-link", {
      email: "other@example.test",
      invitationToken: token,
    });
    expect(await unknown.json()).toEqual(await wrong.json());
    expect(await mismatch.json()).toHaveProperty("message");
    expect(await db.user.count()).toBe(0);
    expect(await db.verification.count()).toBe(0);
  });
  it("blocks expired and revoked invitations both at request and database insertion", async () => {
    for (const mode of ["expired", "revoked"]) {
      const email = `${mode}@example.test`;
      const token = await createInvitation(email);
      await db.invitation.update({
        where: { email },
        data:
          mode === "expired"
            ? { expiresAt: new Date(0) }
            : { revokedAt: new Date() },
      });
      expect(
        (await post("/sign-in/magic-link", { email, invitationToken: token }))
          .status,
      ).toBe(200);
      await expect(
        db.user.create({ data: { id: randomUUID(), name: "Test", email } }),
      ).rejects.toThrow();
    }
    expect(
      (await db.capacity.findUniqueOrThrow({ where: { id: 1 } })).occupied,
    ).toBe(0);
  });
  it("rejects a pending email proof if invitation is revoked before confirmation", async () => {
    const email = `revoked-${randomUUID()}@example.test`;
    const invite = await createInvitation(email);
    const token = await requestLink(email, invite);
    await db.invitation.update({
      where: { email },
      data: { revokedAt: new Date() },
    });
    expect((await post("/verify-link", { token })).status).not.toBe(200);
    expect(await db.user.count()).toBe(0);
    expect(
      (await db.capacity.findUniqueOrThrow({ where: { id: 1 } })).occupied,
    ).toBe(0);
  });
  it("allows exactly one of two simultaneous redemptions for the final slot", async () => {
    await join(`first-${randomUUID()}@example.test`);
    const emails = [
      `a-${randomUUID()}@example.test`,
      `b-${randomUUID()}@example.test`,
    ];
    const tokens = await Promise.all(
      emails.map(async (email) =>
        requestLink(email, await createInvitation(email)),
      ),
    );
    const results = await Promise.all(
      tokens.map((token) => post("/verify-link", { token })),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await db.user.count()).toBe(2);
    expect(
      (await db.capacity.findUniqueOrThrow({ where: { id: 1 } })).occupied,
    ).toBe(2);
    expect(
      await db.invitation.count({ where: { usedAt: { not: null } } }),
    ).toBe(2);
    await expect(createInvitation("third@example.test")).rejects.toThrow(
      "capacity",
    );
  });
  it("atomically consumes login links once even under simultaneous replay", async () => {
    const email = `replay-${randomUUID()}@example.test`;
    const invite = await createInvitation(email);
    const token = await requestLink(email, invite);
    const results = await Promise.all([
      post("/verify-link", { token }),
      post("/verify-link", { token }),
    ]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await db.user.count()).toBe(1);
    expect(await db.session.count()).toBe(1);
  });
  it("revokes sign-out session immediately and rejects expired server sessions", async () => {
    const { cookies } = await join(`session-${randomUUID()}@example.test`);
    expect((await post("/sign-out", {}, { cookie: cookies })).status).toBe(200);
    expect(
      (
        await getMe(
          new Request(`${origin}/api/me`, { headers: { cookie: cookies } }),
        )
      ).status,
    ).toBe(401);
    const second = await join(`expiry-${randomUUID()}@example.test`);
    await db.session.updateMany({ data: { expiresAt: new Date(0) } });
    expect(
      (
        await getMe(
          new Request(`${origin}/api/me`, {
            headers: { cookie: second.cookies },
          }),
        )
      ).status,
    ).toBe(401);
  });
  it("blocks foreign and absent origins on mutations including sign-out and confirmation", async () => {
    expect(
      (
        await post(
          "/sign-in/magic-link",
          { email: "test@example.test" },
          { origin: "https://evil.test" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await post(
          "/verify-link",
          { token: "a".repeat(64) },
          { "sec-fetch-site": "cross-site" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handleAuth(
          new Request(`${origin}/api/auth/sign-out`, { method: "POST" }),
        )
      ).status,
    ).toBe(403);
  });
  it("limits concurrent requests atomically, and applies per-email limits before eligibility", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => consumeBucket("race", 3, 600)),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
    for (let i = 0; i < 3; i++)
      expect(
        (await post("/sign-in/magic-link", { email: "limited@example.test" }))
          .status,
      ).toBe(200);
    expect(
      (await post("/sign-in/magic-link", { email: "limited@example.test" }))
        .status,
    ).toBe(429);
  });
  it("rejects callback injection and oversized or malformed payloads", async () => {
    expect(
      (
        await post("/sign-in/magic-link", {
          email: "test@example.test",
          callbackURL: "https://evil.test",
        })
      ).status,
    ).toBe(400);
    expect(
      (await post("/sign-in/magic-link", { email: "x".repeat(5000) })).status,
    ).toBe(400);
  });
  it("stores only invitation and magic-link hashes, and never changes account identity", async () => {
    const email = `storage-${randomUUID()}@example.test`;
    const invite = await createInvitation(email);
    expect(
      (await db.invitation.findUniqueOrThrow({ where: { email } })).tokenHash,
    ).toBe(hashToken(invite));
    const token = await requestLink(email, invite);
    const verification = await db.verification.findFirstOrThrow();
    expect(JSON.stringify(verification)).not.toContain(token);
    expect((await post("/verify-link", { token })).status).toBe(200);
    await expect(
      db.user.update({
        where: { email },
        data: { email: "changed@example.test" },
      }),
    ).rejects.toThrow();
  });
});
