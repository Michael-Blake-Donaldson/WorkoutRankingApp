import "dotenv/config";
import { emailSchema } from "../src/modules/auth/invitations";
import { db } from "../src/server/db";

try {
  const email = emailSchema.parse(process.argv[2]?.trim());
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  await db.$transaction([
    db.session.deleteMany({ where: { userId: user.id } }),
    db.auditEvent.create({
      data: { eventType: "sessions.revoked", entityId: user.id },
    }),
  ]);
  console.log("All sessions revoked.");
} catch {
  console.error(
    "Session revocation failed. Check email and database configuration.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
