import "dotenv/config";
import { seedExercises } from "../src/modules/exercises/seed";
import { seedProgramRules } from "../src/modules/programs/rules";
import { db } from "../src/server/db";

// Capacity is initialized by the migration. Never reset the counter on seed reruns.
try {
  await db.capacity.upsert({
    where: { id: 1 },
    create: { id: 1, occupied: 0 },
    update: {},
  });
  await seedExercises(db);
  await seedProgramRules(db);
  console.log(
    "Reference seed verified. No accounts, credentials, invitations or health data seeded.",
  );
} finally {
  await db.$disconnect();
}
