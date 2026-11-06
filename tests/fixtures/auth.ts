import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { handleAuth } from "../../src/modules/auth/http";
import { createInvitation } from "../../src/modules/auth/invitations";
import { db } from "../../src/server/db";

export const origin = "http://localhost:3000";
export async function authenticatedUser(prefix: string) {
  const email = `${prefix}-${randomUUID()}@example.test`;
  const invitationToken = await createInvitation(email);
  const invoke = (path: string, body: unknown) =>
    handleAuth(
      new Request(`${origin}/api/auth${path}`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  expect(
    (await invoke("/sign-in/magic-link", { email, invitationToken })).status,
  ).toBe(200);
  const list = await (
    await fetch("http://127.0.0.1:58025/api/v1/messages")
  ).json();
  const message = list.messages.find((m: { To: { Address: string }[] }) =>
    m.To.some((to) => to.Address === email),
  );
  if (!message) throw new Error("Local SMTP message was not delivered");
  const detail = await (
    await fetch(`http://127.0.0.1:58025/api/v1/message/${message.ID}`)
  ).json();
  const link = detail.Text.match(
    /http:\/\/localhost:3000\/verify#token=[^\s]+/,
  )?.[0];
  if (!link) throw new Error("No email proof link found");
  const token = new URLSearchParams(new URL(link).hash.slice(1)).get("token");
  const verified = await invoke("/verify-link", { token });
  expect(verified.status).toBe(200);
  const cookie = verified.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  return { id: user.id, email, cookie };
}
