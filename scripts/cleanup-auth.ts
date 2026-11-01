import "dotenv/config";
import { db } from "../src/server/db";

try {
  const now = new Date();
  const [sessions, verifications, buckets] = await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.verification.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.requestBucket.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 86400_000) } },
    }),
  ]);
  console.log(
    JSON.stringify({
      event: "auth.cleanup",
      sessions: sessions.count,
      verifications: verifications.count,
      buckets: buckets.count,
    }),
  );
} catch {
  console.error("Auth cleanup failed; no private inputs logged.");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
