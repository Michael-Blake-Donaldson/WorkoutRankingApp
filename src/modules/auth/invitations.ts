import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "../../server/db";

export const emailSchema = z
  .email()
  .max(254)
  .transform((email) => email.trim().toLowerCase());
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createInvitation(rawEmail: string) {
  const email = emailSchema.parse(rawEmail.trim());
  const token = randomBytes(32).toString("hex");
  await db.$transaction(async (tx) => {
    const capacity = await tx.$queryRaw<
      { occupied: number }[]
    >`SELECT occupied FROM account_capacity WHERE id = 1 FOR UPDATE`;
    if (!capacity.length || capacity[0].occupied >= 2)
      throw new Error("Account capacity reached");
    if (await tx.user.findUnique({ where: { email } }))
      throw new Error("Account already exists");
    await tx.invitation.upsert({
      where: { email },
      create: {
        email,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 48 * 3600_000),
      },
      update: {
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 48 * 3600_000),
        usedAt: null,
        revokedAt: null,
      },
    });
    await tx.auditEvent.create({
      data: { eventType: "invitation.issued", entityId: hashToken(email) },
    });
  });
  return token;
}

export async function eligibleForLink(email: string, token?: string) {
  if (await db.user.findUnique({ where: { email }, select: { id: true } }))
    return true;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return !!(await db.invitation.findFirst({
    where: {
      email,
      tokenHash: hashToken(token),
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  }));
}
