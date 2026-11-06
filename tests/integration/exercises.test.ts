import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeEach, expect, it } from "vitest";
import { PrismaClient } from "../../src/generated/prisma/client";
import { catalogue, contentHash } from "../../src/modules/exercises/catalogue";
import { alternativesHttp } from "../../src/modules/exercises/http";
import { seedExercises } from "../../src/modules/exercises/seed";
import {
  getAlternatives,
  getCatalogue,
} from "../../src/modules/exercises/service";
import {
  getProfileBundle,
  mutateProfile,
} from "../../src/modules/profile/service";
import { db } from "../../src/server/db";
import { authenticatedUser, origin } from "../fixtures/auth";

config({ path: ".env.runtime", quiet: true });
const restrictedUrl = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(restrictedUrl.hostname))
  throw new Error("Local runtime DB required");
restrictedUrl.pathname = "/fitness_test";
const restricted = new PrismaClient({
  adapter: new PrismaPg({ connectionString: restrictedUrl.toString() }),
});
beforeEach(async () => {
  await db.$executeRawUnsafe(
    "TRUNCATE users, invitations, sessions, accounts, verifications, audit_events, request_buckets CASCADE",
  );
  await db.capacity.update({ where: { id: 1 }, data: { occupied: 0 } });
});
afterAll(async () => {
  await restricted.$disconnect();
  await db.$disconnect();
});
const basics = {
  displayName: "Trainee",
  experience: "beginner" as const,
  primaryGoal: "strength" as const,
  secondaryGoals: [],
  trainingDays: [1, 3],
  durationMinutes: 30,
  timezone: "UTC",
  likes: "",
  dislikes: "",
  limitations: "",
  calorieTarget: null,
  proteinTargetG: null,
};
async function setup() {
  const user = await authenticatedUser("exercise");
  await mutateProfile(user.id, {
    clientMutationId: randomUUID(),
    expectedVersion: 0,
    change: { operation: "save-profile", basics },
  });
  const bundle = await mutateProfile(user.id, {
    clientMutationId: randomUUID(),
    expectedVersion: 1,
    change: {
      operation: "save-equipment",
      id: null,
      name: "Home",
      location: "home",
      isDefault: true,
      items: [],
    },
  });
  return { ...user, bundle };
}
it("seeds transactionally twice without rewriting versions and prevents history updates", async () => {
  await seedExercises(db);
  await seedExercises(db);
  expect(await getCatalogue()).toHaveLength(16);
  expect(await db.exerciseVersion.count()).toBe(16);
  await expect(
    db.exerciseVersion.update({
      where: { id: catalogue[0].versionId },
      data: { name: "Rewritten" },
    }),
  ).rejects.toThrow();
});
it("persists aggregate preferences with receipts, private revisions, stale rejection and qualified-note blocking", async () => {
  const u = await setup();
  const mutation = {
    clientMutationId: randomUUID(),
    expectedVersion: 2,
    change: {
      operation: "save-exercise-preferences" as const,
      reviewed: true,
      restrictions: [],
      choices: [{ exerciseId: catalogue[0].id, preference: "like" as const }],
    },
  };
  const saved = await mutateProfile(u.id, mutation);
  await mutateProfile(u.id, mutation);
  expect(saved.profile?.version).toBe(3);
  expect(saved.exercisePreferences.choices[catalogue[0].id]).toBe("like");
  await expect(
    mutateProfile(u.id, { ...mutation, clientMutationId: randomUUID() }),
  ).rejects.toThrow("another page");
  const request = {
    exerciseId:
      catalogue.find((e) => e.slug === "dumbbell-goblet-squat")?.id ?? "",
    equipmentProfileId: u.bundle.equipment[0].id,
    expectedProfileVersion: 3,
  };
  expect(
    (await getAlternatives(u.id, request)).alternatives[0].exercise.slug,
  ).toBe("bodyweight-squat");
  await mutateProfile(u.id, {
    clientMutationId: randomUUID(),
    expectedVersion: 3,
    change: {
      operation: "save-profile",
      basics: { ...basics, limitations: "Private pain note" },
    },
  });
  const blocked = await getAlternatives(u.id, {
    ...request,
    expectedProfileVersion: 4,
  });
  expect(blocked.status).toBe("review_required");
  expect(blocked.alternatives).toEqual([]);
  expect(JSON.stringify(blocked)).not.toContain("Private pain note");
  expect((await getProfileBundle(u.id)).exercisePreferences.reviewed).toBe(
    true,
  );
});
it("authenticates comparisons and rejects foreign environments, stale owners and forged context", async () => {
  const u = await setup();
  const other = await authenticatedUser("other");
  const input = {
    exerciseId: catalogue[0].id,
    equipmentProfileId: u.bundle.equipment[0].id,
    expectedProfileVersion: 2,
  };
  const send = (
    cookie: string,
    owner: string,
    body: unknown = input,
    requestOrigin = origin,
  ) =>
    alternativesHttp(
      new Request(`${origin}/api/exercises/alternatives`, {
        method: "POST",
        headers: {
          cookie,
          origin: requestOrigin,
          "content-type": "application/json",
          "x-profile-owner": owner,
        },
        body: JSON.stringify(body),
      }),
    );
  expect((await send("", u.id)).status).toBe(401);
  expect(
    (await send(u.cookie, u.id, input, "https://attacker.example")).status,
  ).toBe(403);
  expect((await send(u.cookie, other.id)).status).toBe(409);
  expect(
    (await send(u.cookie, u.id, { ...input, restrictions: [] })).status,
  ).toBe(400);
  await mutateProfile(other.id, {
    clientMutationId: randomUUID(),
    expectedVersion: 0,
    change: { operation: "save-profile", basics },
  });
  expect(
    (
      await send(other.cookie, other.id, {
        ...input,
        expectedProfileVersion: 1,
      })
    ).status,
  ).toBe(404);
  const response = await send(u.cookie, u.id);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect((await response.json()).status).toBe("review_required");
});

it("preserves old versions on publication and aborts conflicting seed content", async () => {
  const prior = catalogue[0];
  try {
    catalogue[0] = { ...prior, contentHash: "0".repeat(64) };
    await expect(seedExercises(db)).rejects.toThrow("Publish a new version");
    expect(
      (
        await db.exerciseVersion.findUniqueOrThrow({
          where: { id: prior.versionId },
        })
      ).contentHash,
    ).toBe(prior.contentHash);
    const { contentHash: oldHash, ...fields } = prior;
    void oldHash;
    const next = {
      ...fields,
      version: 2,
      versionId: randomUUID(),
      reviewStatus: "unreviewed",
    };
    catalogue[0] = { ...next, contentHash: contentHash(next) };
    await seedExercises(db);
    expect(
      await db.exerciseVersion.count({ where: { exerciseId: prior.id } }),
    ).toBe(2);
    expect((await getCatalogue()).some((e) => e.id === prior.id)).toBe(false);
    expect(
      (
        await db.exerciseVersion.findUniqueOrThrow({
          where: { id: prior.versionId },
        })
      ).contentHash,
    ).toBe(prior.contentHash);
  } finally {
    catalogue[0] = prior;
    // Tests/setup.ts restricts this connection to disposable local fitness_test.
    // TRUNCATE resets only reference fixtures; production seed never removes versions.
    await db.$executeRawUnsafe("TRUNCATE exercise_versions CASCADE");
    await seedExercises(db);
  }
});

it("isolates new preference rows under the actual restricted runtime role", async () => {
  const u = await setup();
  const other = await authenticatedUser("restriction-owner");
  await mutateProfile(u.id, {
    clientMutationId: randomUUID(),
    expectedVersion: 2,
    change: {
      operation: "save-exercise-preferences",
      reviewed: true,
      restrictions: ["impact"],
      choices: [{ exerciseId: catalogue[0].id, preference: "exclude" }],
    },
  });
  await restricted.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${other.id}, true)`;
    expect(
      await tx.userExerciseChoice.findMany({ where: { userId: u.id } }),
    ).toEqual([]);
    expect(
      await tx.userExerciseRestriction.findMany({ where: { userId: u.id } }),
    ).toEqual([]);
  });
  await restricted.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${u.id}, true)`;
    expect((await tx.userExerciseChoice.findMany())[0].preference).toBe(
      "exclude",
    );
    expect((await tx.userExerciseRestriction.findMany())[0].code).toBe(
      "impact",
    );
  });
  await expect(
    restricted.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${other.id}, true)`;
      await tx.userExerciseRestriction.create({
        data: { userId: u.id, code: "overhead" },
      });
    }),
  ).rejects.toThrow();
});
