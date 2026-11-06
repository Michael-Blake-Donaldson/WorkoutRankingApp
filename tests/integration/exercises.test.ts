import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, expect, it } from "vitest";
import { catalogue } from "../../src/modules/exercises/catalogue";
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

beforeEach(async () => {
  await db.$executeRawUnsafe(
    "TRUNCATE users, invitations, sessions, accounts, verifications, audit_events, request_buckets CASCADE",
  );
  await db.capacity.update({ where: { id: 1 }, data: { occupied: 0 } });
});
afterAll(() => db.$disconnect());
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
