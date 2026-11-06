import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "../../src/generated/prisma/client";
import type {
  ProfileBundle,
  ProfileChange,
} from "../../src/modules/profile/contracts";
import { profileHttp } from "../../src/modules/profile/http";
import { db } from "../../src/server/db";
import { authenticatedUser, origin } from "../fixtures/auth";

const basics = {
  displayName: "Private trainee",
  experience: "beginner" as const,
  primaryGoal: "strength" as const,
  secondaryGoals: [],
  trainingDays: [1, 3, 5],
  durationMinutes: 45,
  timezone: "America/New_York",
  likes: "Squats",
  dislikes: "",
  limitations: "PRIVATE restriction",
  calorieTarget: null,
  proteinTargetG: null,
};
const settings = {
  weightUnit: "kg" as const,
  lengthUnit: "cm" as const,
  shareCompetitionSummary: false,
  audioEnabled: false,
  hapticsEnabled: false,
  motionPreference: "system" as const,
};
const send = (
  cookie: string,
  expectedVersion: number,
  change: ProfileChange,
  id = randomUUID(),
  extra: object = {},
) =>
  profileHttp(
    new Request(`${origin}/api/profile`, {
      method: "POST",
      headers: { cookie, origin, "content-type": "application/json" },
      body: JSON.stringify({
        clientMutationId: id,
        expectedVersion,
        change,
        ...extra,
      }),
    }),
  );
const read = (cookie: string, query = "") =>
  profileHttp(
    new Request(`${origin}/api/profile${query}`, { headers: { cookie } }),
  );
async function save(cookie: string, version: number, change: ProfileChange) {
  const result = await send(cookie, version, change);
  expect(result.status, JSON.stringify(await result.clone().json())).toBe(200);
  return (await result.json()) as ProfileBundle;
}
const measurement = (
  metric: "height" | "weight",
  value: string,
  unit: "kg" | "lb" | "cm" | "in",
  date = "2026-01-01T12:00:00.000Z",
): ProfileChange => ({
  operation: "record-measurement",
  metric,
  value,
  unit,
  recordedAt: date,
  correctsId: null,
  correctionReason: "",
});
const location = (name: string, isDefault = false): ProfileChange => ({
  operation: "save-equipment",
  id: null,
  name,
  location: "home",
  isDefault,
  items: [],
});

config({ path: ".env.runtime", quiet: true });
const restrictedUrl = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost"].includes(restrictedUrl.hostname))
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

describe("private profile API with real database and email authentication", () => {
  it("paginates all history and includes the earlier height needed for BMI", async () => {
    const a = await authenticatedUser("history");
    await save(a.cookie, 0, { operation: "save-profile", basics });
    await save(a.cookie, 1, measurement("height", "180", "cm"));
    await db.bodyMeasurement.createMany({
      data: Array.from({ length: 501 }, (_, i) => ({
        userId: a.id,
        metric: "weight",
        valueSi: "80",
        recordedAt: new Date(Date.UTC(2026, 0, 2, 0, 0, i)),
      })),
    });
    const first = (await (await read(a.cookie)).json()) as ProfileBundle;
    expect(first.measurements).toHaveLength(500);
    expect(first.baselineHeight?.valueSi).toBe("1.8");
    expect(first.measurementStatus).toEqual({ height: true, weight: true });
    expect(first.nextMeasurementCursor).toBeTruthy();
    const second = (await (
      await read(a.cookie, `?cursor=${first.nextMeasurementCursor}`)
    ).json()) as ProfileBundle;
    expect(second.measurements).toHaveLength(2);
    expect(second.hasMoreMeasurements).toBe(false);
    expect(
      new Set([...first.measurements, ...second.measurements].map((m) => m.id))
        .size,
    ).toBe(502);
    expect((await read(a.cookie, `?cursor=${randomUUID()}`)).status).toBe(404);
  });
  it("requires authentication, checks origin and rejects account selectors or injected ownership", async () => {
    expect((await read("")).status).toBe(401);
    const a = await authenticatedUser("owner");
    expect((await read(a.cookie, "?userId=someone-else")).status).toBe(400);
    expect(
      (
        await send(
          a.cookie,
          0,
          { operation: "save-profile", basics },
          randomUUID(),
          { userId: "other" },
        )
      ).status,
    ).toBe(400);
    const foreign = new Request(`${origin}/api/profile`, {
      method: "POST",
      headers: {
        cookie: a.cookie,
        origin: "https://foreign.test",
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect((await profileHttp(foreign)).status).toBe(403);
  });
  it("persists private defaults and editable goals in immutable snapshots", async () => {
    const a = await authenticatedUser("profile");
    let result = await save(a.cookie, 0, { operation: "save-profile", basics });
    expect(result.profile).toMatchObject({
      version: 1,
      shareCompetitionSummary: false,
      calorieTarget: null,
      proteinTargetG: null,
    });
    result = await save(a.cookie, 1, {
      operation: "save-profile",
      basics: { ...basics, primaryGoal: "endurance", durationMinutes: 60 },
    });
    expect(result.profile?.primaryGoal).toBe("endurance");
    const revisions = await db.profileRevision.findMany({
      where: { userId: a.id },
      orderBy: { version: "asc" },
    });
    expect(revisions).toHaveLength(2);
    expect(JSON.stringify(revisions[0].snapshotJson)).toContain(
      '"primaryGoal":"strength"',
    );
    expect((await read(a.cookie)).headers.get("cache-control")).toContain(
      "no-store",
    );
  });
  it("rejects stale concurrent edits and replays an identical committed request exactly once", async () => {
    const a = await authenticatedUser("concurrent");
    const id = randomUUID();
    const change: ProfileChange = { operation: "save-profile", basics };
    expect((await send(a.cookie, 0, change, id)).status).toBe(200);
    expect((await send(a.cookie, 0, change, id)).status).toBe(200);
    expect(await db.profileRevision.count()).toBe(1);
    expect(
      (
        await send(
          a.cookie,
          0,
          {
            operation: "save-profile",
            basics: { ...basics, displayName: "Different" },
          },
          id,
        )
      ).status,
    ).toBe(409);
    const results = await Promise.all([
      send(a.cookie, 1, {
        operation: "save-settings",
        settings: { ...settings, audioEnabled: true },
      }),
      send(a.cookie, 1, {
        operation: "save-settings",
        settings: { ...settings, hapticsEnabled: true },
      }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await db.profileRevision.count()).toBe(2);
  });
  it("keeps SI values immutable across display-unit switches and linked corrections", async () => {
    const a = await authenticatedUser("measurement");
    await save(a.cookie, 0, { operation: "save-profile", basics });
    let result = await save(a.cookie, 1, measurement("weight", "100", "lb"));
    const entry = result.measurements[0];
    expect(entry.valueSi).toBe("45.359237");
    result = await save(a.cookie, 2, {
      operation: "save-settings",
      settings: { ...settings, weightUnit: "lb" },
    });
    expect(result.measurements[0].valueSi).toBe(entry.valueSi);
    const correction = {
      ...measurement("weight", "101", "lb"),
      correctsId: entry.id,
      correctionReason: "Mistyped original",
    } as ProfileChange;
    result = await save(a.cookie, 3, correction);
    expect(result.measurements).toHaveLength(2);
    expect(result.measurements.find((m) => m.id === entry.id)).toMatchObject({
      valueSi: "45.359237",
      current: false,
    });
    await expect(
      db.bodyMeasurement.update({
        where: { id: entry.id },
        data: { valueSi: "50" },
      }),
    ).rejects.toThrow("immutable");
    expect((await send(a.cookie, 4, correction)).status).toBe(409);
  });
  it("validates units, times and correction ownership without partial writes", async () => {
    const a = await authenticatedUser("invalid");
    await save(a.cookie, 0, { operation: "save-profile", basics });
    for (const change of [
      measurement("height", "180", "kg"),
      measurement("weight", "0", "kg"),
      measurement("weight", "80", "kg", "2099-01-01T00:00:00.000Z"),
      {
        ...measurement("weight", "80", "kg"),
        correctsId: randomUUID(),
        correctionReason: "missing",
      },
    ]) {
      expect(
        (await send(a.cookie, 1, change as ProfileChange)).status,
      ).toBeGreaterThanOrEqual(400);
    }
    expect(await db.bodyMeasurement.count()).toBe(0);
    expect(await db.profileRevision.count()).toBe(1);
  });
  it("maintains one default location and prevents completing empty onboarding", async () => {
    const a = await authenticatedUser("setup");
    await save(a.cookie, 0, { operation: "save-profile", basics });
    expect(
      (await send(a.cookie, 1, { operation: "complete-onboarding" })).status,
    ).toBe(400);
    let result = await save(a.cookie, 1, location("Home"));
    expect(result.equipment[0].isDefault).toBe(true);
    result = await save(a.cookie, 2, location("Travel", true));
    expect(result.equipment.filter((e) => e.isDefault)).toHaveLength(1);
    await save(a.cookie, 3, measurement("height", "180", "cm"));
    await save(
      a.cookie,
      4,
      measurement("weight", "80", "kg", "2026-01-02T00:00:00.000Z"),
    );
    result = await save(a.cookie, 5, { operation: "complete-onboarding" });
    expect(result.profile?.onboardingCompletedAt).toBeTruthy();
    const travel = result.equipment.find((e) => e.name === "Travel");
    if (!travel) throw new Error("Missing travel location");
    result = await save(a.cookie, 6, {
      operation: "archive-equipment",
      id: travel.id,
    });
    expect(result.equipment[0].isDefault).toBe(true);
    expect(
      (
        await send(a.cookie, 7, {
          operation: "archive-equipment",
          id: result.equipment[0].id,
        })
      ).status,
    ).toBe(400);
  });
  it("isolates both users even with sharing enabled and rejects foreign entity references", async () => {
    const a = await authenticatedUser("alice");
    const b = await authenticatedUser("bob");
    await save(a.cookie, 0, { operation: "save-profile", basics });
    const aEquipment = await save(a.cookie, 1, location("Private home"));
    await save(a.cookie, 2, {
      operation: "save-settings",
      settings: { ...settings, shareCompetitionSummary: true },
    });
    await save(b.cookie, 0, {
      operation: "save-profile",
      basics: { ...basics, displayName: "Bob", limitations: "" },
    });
    const body = await (await read(b.cookie)).text();
    expect(body).not.toContain("PRIVATE restriction");
    expect(body).not.toContain("Private home");
    expect(
      (
        await send(b.cookie, 1, {
          operation: "archive-equipment",
          id: aEquipment.equipment[0].id,
        })
      ).status,
    ).toBe(404);
    await restricted.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${b.id}, true)`;
      expect(
        await tx.fitnessProfile.findUnique({ where: { userId: a.id } }),
      ).toBeNull();
      expect(
        await tx.equipmentProfile.findMany({ where: { userId: a.id } }),
      ).toEqual([]);
    });
    expect(await restricted.fitnessProfile.findMany()).toEqual([]);
  });
});
