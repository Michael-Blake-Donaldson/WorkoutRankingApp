import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeEach, expect, it } from "vitest";
import { PrismaClient } from "../../src/generated/prisma/client";
import { mutateProfile } from "../../src/modules/profile/service";
import { addDays, localDate } from "../../src/modules/programs/calendar";
import type { ProgramChange } from "../../src/modules/programs/contracts";
import { programsHttp } from "../../src/modules/programs/http";
import {
  getProgramBundle,
  getProgramVersion,
} from "../../src/modules/programs/repository";
import { seedProgramRules } from "../../src/modules/programs/rules";
import { mutateProgram } from "../../src/modules/programs/service";
import type { ProgramBundle } from "../../src/modules/programs/types";
import { db } from "../../src/server/db";
import { authenticatedUser, origin } from "../fixtures/auth";
import { planningBundle, planningSettings } from "../fixtures/programs";

config({ path: ".env.runtime", quiet: true });
const target = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost"].includes(target.hostname))
  throw new Error("Local restricted database required");
target.pathname = "/fitness_test";
const restricted = new PrismaClient({
  adapter: new PrismaPg({ connectionString: target.toString() }),
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
async function setup() {
  const user = await authenticatedUser("program"),
    fixture = planningBundle().profile;
  if (!fixture) throw new Error();
  const {
    displayName,
    experience,
    primaryGoal,
    secondaryGoals,
    trainingDays,
    durationMinutes,
    timezone,
    likes,
    dislikes,
    limitations,
    calorieTarget,
    proteinTargetG,
  } = fixture;
  const basics = {
    displayName,
    experience,
    primaryGoal,
    secondaryGoals,
    trainingDays,
    durationMinutes,
    timezone,
    likes,
    dislikes,
    limitations,
    calorieTarget,
    proteinTargetG,
  };
  await mutateProfile(user.id, {
    clientMutationId: randomUUID(),
    expectedVersion: 0,
    change: { operation: "save-profile", basics },
  });
  const withEquipment = await mutateProfile(user.id, {
    clientMutationId: randomUUID(),
    expectedVersion: 1,
    change: {
      operation: "save-equipment",
      id: null,
      name: "Home weights",
      location: "home",
      isDefault: true,
      items: planningBundle().equipment[0].items,
    },
  });
  await mutateProfile(user.id, {
    clientMutationId: randomUUID(),
    expectedVersion: 2,
    change: {
      operation: "save-exercise-preferences",
      reviewed: true,
      restrictions: [],
      choices: [],
    },
  });
  const effectiveFrom = addDays(localDate(new Date(), basics.timezone), 1);
  return {
    ...user,
    basics,
    settings: {
      ...planningSettings,
      equipmentProfileId: withEquipment.equipment[0].id,
      effectiveFrom,
    },
    state: await getProgramBundle(user.id),
  };
}
const apply = (id: string, state: ProgramBundle, change: ProgramChange) =>
  mutateProgram(id, {
    clientMutationId: randomUUID(),
    expectedRevision: state.revision,
    expectedProfileVersion: state.profileVersion,
    change,
  });
async function proposal() {
  const user = await setup();
  user.state = await apply(user.id, user.state, {
    operation: "check-in",
    fatigue: 1,
    soreness: 1,
    pain: false,
    notes: "PRIVATE check-in detail",
  });
  user.state = await apply(user.id, user.state, {
    operation: "generate",
    settings: user.settings,
  });
  if (!user.state.latest) throw new Error("Missing real proposal");
  return user;
}
it("requires explicit current check-in, then approves exactly once with immutable prescriptions", async () => {
  const user = await setup();
  await expect(
    apply(user.id, user.state, {
      operation: "generate",
      settings: user.settings,
    }),
  ).rejects.toThrow("check-in");
  expect(await db.programVersion.count()).toBe(0);
  user.state = await apply(user.id, user.state, {
    operation: "check-in",
    fatigue: 1,
    soreness: 1,
    pain: false,
    notes: "Private",
  });
  user.state = await apply(user.id, user.state, {
    operation: "generate",
    settings: user.settings,
  });
  const draft = user.state.latest;
  if (!draft) throw new Error();
  expect(user.state.schedule).toHaveLength(0);
  expect(JSON.stringify(draft.plan.inputs)).not.toContain("Private");
  const approval = {
    clientMutationId: randomUUID(),
    expectedRevision: user.state.revision,
    expectedProfileVersion: user.state.profileVersion,
    change: {
      operation: "approve" as const,
      proposalId: draft.id,
      acknowledge: true as const,
    },
  };
  const saved = await mutateProgram(user.id, approval);
  expect(saved.schedule).toHaveLength(12);
  await mutateProgram(user.id, approval);
  expect(await db.programSession.count()).toBe(12);
  expect(await db.prescribedExercise.count()).toBe(60);
  expect(await db.programDecision.count()).toBe(1);
  await expect(
    mutateProgram(user.id, {
      ...approval,
      change: { operation: "reject", proposalId: draft.id },
    }),
  ).rejects.toThrow("different data");
  await expect(
    db.programVersion.update({
      where: { id: draft.id },
      data: { kind: "pause" },
    }),
  ).rejects.toThrow();
  await expect(
    db.prescribedExercise.updateMany({ data: { ordinal: 99 } }),
  ).rejects.toThrow();
});
it("rejects drafts without altering schedules and preserves old versions during future replacement and pause", async () => {
  const user = await proposal();
  const original = user.state.latest;
  if (!original) throw new Error();
  user.state = await apply(user.id, user.state, {
    operation: "approve",
    proposalId: original.id,
    acknowledge: true,
  });
  const originalIds = user.state.schedule.map((s) => s.id);
  user.state = await apply(user.id, user.state, {
    operation: "generate",
    settings: { ...user.settings, workingSets: 1 },
  });
  const declined = user.state.latest;
  if (!declined) throw new Error();
  user.state = await apply(user.id, user.state, {
    operation: "reject",
    proposalId: declined.id,
  });
  expect(user.state.schedule.map((s) => s.id)).toEqual(originalIds);
  const from = addDays(user.settings.effectiveFrom, 7);
  user.state = await apply(user.id, user.state, {
    operation: "generate",
    settings: { ...user.settings, effectiveFrom: from, workingSets: 1 },
  });
  const replacement = user.state.latest;
  if (!replacement) throw new Error();
  expect(replacement.plan.diff.removed).toHaveLength(9);
  user.state = await apply(user.id, user.state, {
    operation: "approve",
    proposalId: replacement.id,
    acknowledge: true,
  });
  expect(await db.programSession.count()).toBe(24);
  expect(
    await db.scheduleEvent.count({ where: { reason: "superseded" } }),
  ).toBe(9);
  expect(user.state.schedule.slice(0, 3).map((s) => s.id)).toEqual(
    originalIds.slice(0, 3),
  );
  expect(
    (await getProgramVersion(user.id, original.id))?.plan.sessions[0]
      .exercises[0].target.workingSets,
  ).toBe(2);
  user.state = await apply(user.id, user.state, {
    operation: "pause",
    effectiveFrom: from,
    effectiveUntil: addDays(from, 6),
    reason: "Private travel recovery",
    rulesAcknowledged: true,
  });
  const pause = user.state.latest;
  if (!pause) throw new Error();
  expect(pause.plan.diff.removed).toHaveLength(3);
  user.state = await apply(user.id, user.state, {
    operation: "approve",
    proposalId: pause.id,
    acknowledge: true,
  });
  expect(await db.scheduleEvent.count({ where: { reason: "paused" } })).toBe(3);
  expect(await db.programSession.count()).toBe(24);
  expect(user.state.schedule).toHaveLength(12);
});
it("serializes competing approvals, invalidates changed check-ins/profile and rolls back conflicting slots", async () => {
  const user = await proposal();
  const draft = user.state.latest;
  if (!draft) throw new Error();
  const attempts = await Promise.allSettled([
    apply(user.id, user.state, {
      operation: "approve",
      proposalId: draft.id,
      acknowledge: true,
    }),
    apply(user.id, user.state, {
      operation: "approve",
      proposalId: draft.id,
      acknowledge: true,
    }),
  ]);
  expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
  expect(await db.programSession.count()).toBe(12);
  user.state = await getProgramBundle(user.id);
  user.state = await apply(user.id, user.state, {
    operation: "generate",
    settings: user.settings,
  });
  const stale = user.state.latest;
  if (!stale) throw new Error();
  user.state = await apply(user.id, user.state, {
    operation: "check-in",
    fatigue: 3,
    soreness: 1,
    pain: false,
    notes: "",
  });
  await expect(
    apply(user.id, user.state, {
      operation: "approve",
      proposalId: stale.id,
      acknowledge: true,
    }),
  ).rejects.toThrow("stale");
  await mutateProfile(user.id, {
    clientMutationId: randomUUID(),
    expectedVersion: user.state.profileVersion,
    change: {
      operation: "save-profile",
      basics: { ...user.basics, primaryGoal: "muscle" },
    },
  });
  await expect(
    apply(user.id, user.state, {
      operation: "generate",
      settings: user.settings,
    }),
  ).rejects.toThrow("configuration changed");
  const session = await db.programSession.findFirstOrThrow();
  await expect(
    db.$transaction(async (tx) => {
      const { id, ...fields } = session;
      void id;
      const duplicate = await tx.programSession.create({
        data: { ...fields, id: randomUUID() },
      });
      await tx.programSlot.create({
        data: {
          userId: user.id,
          sessionId: duplicate.id,
          startsAt: session.scheduledAt,
          endsAt: session.endsAt,
        },
      });
    }),
  ).rejects.toThrow();
  expect(await db.programSession.count()).toBe(12);
});
it("enforces real owner RLS, composite ownership and read-only planning rules", async () => {
  const user = await proposal();
  const other = await authenticatedUser("foreign-program");
  expect(
    await getProgramVersion(other.id, user.state.latest?.id ?? ""),
  ).toBeNull();
  await restricted.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${other.id}, true)`;
    expect(await tx.programVersion.findMany()).toEqual([]);
    expect(await tx.fatigueCheckIn.findMany()).toEqual([]);
  });
  await expect(
    restricted.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${other.id}, true)`;
      await tx.programDecision.create({
        data: {
          userId: other.id,
          programVersionId: user.state.latest?.id ?? "",
          decision: "accepted",
        },
      });
    }),
  ).rejects.toThrow();
  await expect(
    restricted.programRuleVersion.updateMany({
      data: { reviewedBy: "forged" },
    }),
  ).rejects.toThrow();
  await seedProgramRules(db);
  await seedProgramRules(db);
  await expect(
    db.programRuleVersion.updateMany({ data: { reviewedBy: "rewritten" } }),
  ).rejects.toThrow();
});
it("protects HTTP auth, origin, stale account intent, bounded schemas and private responses", async () => {
  const user = await setup();
  const input = {
    clientMutationId: randomUUID(),
    expectedRevision: 0,
    expectedProfileVersion: 3,
    change: {
      operation: "check-in",
      fatigue: 1,
      soreness: 1,
      pain: false,
      notes: "",
    },
  };
  const request = (
    cookie = user.cookie,
    owner = user.id,
    body: unknown = input,
    requestOrigin = origin,
  ) =>
    programsHttp(
      new Request(`${origin}/api/programs`, {
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
  expect((await request("")).status).toBe(401);
  expect(
    (await request(user.cookie, user.id, input, "https://attacker.example"))
      .status,
  ).toBe(403);
  expect((await request(user.cookie, "another-account")).status).toBe(409);
  expect(
    (await request(user.cookie, user.id, { ...input, userId: user.id })).status,
  ).toBe(400);
  const response = await request();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
});
