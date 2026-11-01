import "dotenv/config";
import {
  createInvitation,
  emailSchema,
  hashToken,
} from "../src/modules/auth/invitations";
import { db } from "../src/server/db";
import { readEnv } from "../src/server/env";

try {
  const env = readEnv();
  const [action, rawEmail] = process.argv.slice(2);
  const email = emailSchema.parse(rawEmail?.trim());
  if (action === "create") {
    const token = await createInvitation(email);
    // Operator-requested one-time output only. Never log or persist the plaintext token.
    console.log(
      `Share privately with the intended recipient: ${env.BETTER_AUTH_URL}/invite#token=${token}`,
    );
  } else if (action === "revoke") {
    await db.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { email },
        data: { revokedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: { eventType: "invitation.revoked", entityId: hashToken(email) },
      });
    });
    console.log("Invitation revoked. Existing accounts are not removed.");
  } else
    throw new Error("Usage: npm run invite -- create|revoke email@example.com");
} catch {
  console.error(
    "Invitation operation failed. Check arguments, capacity and configuration. No secrets printed.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
