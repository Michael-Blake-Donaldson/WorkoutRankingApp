import "dotenv/config";
import { db } from "../src/server/db";

// Capacity is initialized by the migration. Never reset the counter on seed reruns.
try {
  await db.capacity.upsert({
    where: { id: 1 },
    create: { id: 1, occupied: 0 },
    update: {},
  });
  console.log(
    "Reference seed verified. No accounts, credentials, invitations or health data seeded.",
  );
} finally {
  await db.$disconnect();
}
