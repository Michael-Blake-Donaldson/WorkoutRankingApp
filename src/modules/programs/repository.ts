import type { Prisma } from "../../generated/prisma/client";
import { db } from "../../server/db";
import { load as loadProfile } from "../profile/service";
import { localDate } from "./calendar";
import { ProgramError } from "./errors";
import { programRulesId } from "./options";
import { hashValue, programRulesHash } from "./rules";
import type {
  CheckIn,
  Plan,
  ProgramBundle,
  Rules,
  ScheduleSummary,
  VersionView,
} from "./types";
export type Tx = Prisma.TransactionClient;
export async function withOwner<T>(
  userId: string,
  run: (tx: Tx) => Promise<T>,
  consistent = false,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
      return run(tx);
    },
    {
      isolationLevel: consistent ? "RepeatableRead" : "ReadCommitted",
      timeout: 20000,
    },
  );
}
export async function rulesFor(tx: Tx) {
  const rule = await tx.programRuleVersion.findUnique({
    where: { id: programRulesId },
  });
  if (
    !rule ||
    rule.contentHash !== programRulesHash ||
    hashValue(rule.configJson) !== programRulesHash
  )
    throw new ProgramError(
      503,
      "Required reviewed planning rules are unavailable. Ask the operator to verify reference data.",
    );
  return {
    id: rule.id,
    hash: rule.contentHash,
    config: rule.configJson as unknown as Rules,
    reviewedBy: rule.reviewedBy,
  };
}
export async function latestCheckIn(
  tx: Tx,
  userId: string,
): Promise<CheckIn | null> {
  const row = await tx.fatigueCheckIn.findFirst({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return row ? { ...row, createdAt: row.createdAt.toISOString() } : null;
}
export async function scheduleFor(
  tx: Tx,
  userId: string,
  now: Date,
): Promise<ScheduleSummary[]> {
  const rows = await tx.programSlot.findMany({
    where: { userId, endsAt: { gte: new Date(now.getTime() - 7 * 86400000) } },
    orderBy: { startsAt: "asc" },
    take: 100,
    include: {
      session: { include: { prescriptions: { orderBy: { ordinal: "asc" } } } },
    },
  });
  return rows.map(({ session: s }) => ({
    id: s.id,
    localDate: s.localDate,
    timezone: s.timezone,
    startsAt: s.scheduledAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    kind: s.kind as ScheduleSummary["kind"],
    estimatedMinutes: s.estimatedMinutes,
    exercises: s.prescriptions.map((e) => {
      const snapshot = e.snapshotJson as unknown as {
        name: string;
        muscles: { id: string; role: string }[];
      };
      return {
        name: snapshot.name,
        muscles: snapshot.muscles,
        versionId: e.exerciseVersionId,
        target: e.targetJson as unknown as import("./types").Target,
      };
    }),
  }));
}
export const viewVersion = (row: {
  id: string;
  version: number;
  kind: string;
  profileVersion: number;
  baseRevision: number;
  createdAt: Date;
  planJson: Prisma.JsonValue;
  decision: { decision: string } | null;
}): VersionView => ({
  id: row.id,
  version: row.version,
  kind: row.kind,
  profileVersion: row.profileVersion,
  baseRevision: row.baseRevision,
  createdAt: row.createdAt.toISOString(),
  decision: (row.decision?.decision as VersionView["decision"]) ?? null,
  plan: row.planJson as unknown as Plan,
});
export async function loadBundle(
  tx: Tx,
  userId: string,
  now = new Date(),
): Promise<ProgramBundle> {
  const bundle = await loadProfile(tx, userId);
  const state = await tx.programState.findUnique({ where: { userId } });
  const latest = await tx.programVersion.findFirst({
    where: { userId },
    orderBy: { version: "desc" },
    include: { decision: true },
  });
  const history = await tx.programVersion.findMany({
    where: { userId },
    orderBy: { version: "desc" },
    take: 20,
    select: {
      id: true,
      version: true,
      kind: true,
      createdAt: true,
      decision: { select: { decision: true } },
    },
  });
  const p = bundle.profile;
  return {
    accountId: userId,
    revision: state?.revision ?? 0,
    profileVersion: p?.version ?? 0,
    profile: p
      ? {
          trainingDays: p.trainingDays,
          timezone: p.timezone,
          durationMinutes: p.durationMinutes,
          experience: p.experience,
          primaryGoal: p.primaryGoal,
        }
      : null,
    equipment: bundle.equipment.map(({ id, name, isDefault }) => ({
      id,
      name,
      isDefault,
    })),
    rules: await rulesFor(tx),
    checkIn: await latestCheckIn(tx, userId),
    latest: latest ? viewVersion(latest) : null,
    history: history.map((h) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
      decision: h.decision?.decision ?? null,
    })),
    schedule: await scheduleFor(tx, userId, now),
    today: localDate(now, p?.timezone ?? "UTC"),
  };
}
export const getProgramBundle = (userId: string) =>
  withOwner(userId, (tx) => loadBundle(tx, userId), true);
export const getProgramVersion = (userId: string, id: string) =>
  withOwner(
    userId,
    async (tx) => {
      const row = await tx.programVersion.findFirst({
        where: { id, userId },
        include: { decision: true },
      });
      return row ? viewVersion(row) : null;
    },
    true,
  );
