import { getCatalogue } from "../exercises/service";
import { load as loadProfile } from "../profile/service";
import { addDays, localDate } from "./calendar";
import type { ProgramMutationInput } from "./contracts";
import {
  ensureCalendar,
  generateTraining,
  readiness,
  validateRange,
} from "./engine";
import { ProgramError } from "./errors";
import {
  getProgramBundle,
  latestCheckIn,
  rulesFor,
  scheduleFor,
  type Tx,
  withOwner,
} from "./repository";
import { hashValue } from "./rules";
import type { Plan, ScheduleSummary } from "./types";

function replaced(
  schedule: ScheduleSummary[],
  plan: Pick<Plan, "kind" | "timezone" | "effectiveFrom" | "effectiveUntil">,
  now: Date,
) {
  return schedule.filter(
    (s) =>
      Date.parse(s.startsAt) > now.getTime() &&
      localDate(new Date(s.startsAt), plan.timezone) >= plan.effectiveFrom &&
      (plan.kind === "training" ||
        localDate(new Date(s.startsAt), plan.timezone) <= plan.effectiveUntil),
  );
}
async function approve(
  tx: Tx,
  userId: string,
  id: string,
  revision: number,
  profileVersion: number,
  now: Date,
) {
  const proposal = await tx.programVersion.findFirst({
    where: { id, userId },
    include: { decision: true },
  });
  if (!proposal) throw new ProgramError(404, "Proposal not found.");
  if (proposal.decision)
    throw new ProgramError(409, "This proposal already has a decision.");
  if (
    proposal.baseRevision !== revision ||
    proposal.profileVersion !== profileVersion
  )
    throw new ProgramError(
      409,
      "This proposal is stale. Generate a new proposal from current saved configuration.",
    );
  // Reference publishers use the same advisory lock as the exercise seed.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(38614003)`;
  const rules = await rulesFor(tx),
    plan = proposal.planJson as unknown as Plan;
  if (plan.rulesVersion !== rules.id || plan.rulesHash !== rules.hash)
    throw new ProgramError(
      409,
      "Planning rules changed. Generate a new proposal.",
    );
  validateRange(plan.effectiveFrom, plan.effectiveUntil, plan.timezone, now);
  const schedule = await scheduleFor(tx, userId, now);
  const removed = replaced(schedule, plan, now);
  if (hashValue(removed) !== hashValue(plan.diff.removed))
    throw new ProgramError(
      409,
      "The schedule diff changed. Review a new proposal.",
    );
  if (plan.kind === "training") {
    const checkIn = await latestCheckIn(tx, userId);
    readiness(checkIn, rules.config, now);
    if (checkIn?.id !== plan.checkInId || !plan.settings)
      throw new ProgramError(409, "Check-in changed. Generate a new proposal.");
    const regenerated = generateTraining(
      await loadProfile(tx, userId),
      plan.settings,
      await getCatalogue(tx),
      checkIn,
      rules.config,
      now,
    );
    if (
      hashValue(regenerated.sessions) !== hashValue(plan.sessions) ||
      hashValue(regenerated.weeklyVolumes) !== hashValue(plan.weeklyVolumes)
    )
      throw new ProgramError(
        409,
        "Exercise content or planning inputs changed. Generate a new proposal.",
      );
    ensureCalendar(
      plan.sessions,
      schedule.filter((s) => !removed.some((r) => r.id === s.id)),
      rules.config,
    );
  }
  const decision = await tx.programDecision.create({
    data: { userId, programVersionId: id, decision: "accepted" },
  });
  for (const prior of removed) {
    await tx.scheduleEvent.create({
      data: {
        userId,
        sessionId: prior.id,
        decisionId: decision.id,
        reason: plan.kind === "pause" ? "paused" : "superseded",
      },
    });
    await tx.programSlot.delete({ where: { sessionId: prior.id, userId } });
  }
  for (const session of plan.sessions) {
    const row = await tx.programSession.create({
      data: {
        userId,
        programVersionId: id,
        localDate: session.localDate,
        localStart: session.localStart,
        timezone: session.timezone,
        scheduledAt: new Date(session.startsAt),
        endsAt: new Date(session.endsAt),
        kind: session.kind,
        estimatedMinutes: session.estimatedMinutes,
      },
    });
    await tx.prescribedExercise.createMany({
      data: session.exercises.map((e, ordinal) => ({
        userId,
        sessionId: row.id,
        exerciseVersionId: e.exercise.versionId,
        ordinal,
        targetJson: JSON.parse(JSON.stringify(e.target)),
        snapshotJson: JSON.parse(JSON.stringify(e.exercise)),
      })),
    });
    await tx.programSlot.create({
      data: {
        userId,
        sessionId: row.id,
        startsAt: new Date(session.startsAt),
        endsAt: new Date(session.endsAt),
      },
    });
  }
}
export async function mutateProgram(
  userId: string,
  input: ProgramMutationInput,
) {
  const payloadHash = hashValue(input);
  await withOwner(userId, async (tx) => {
    const owner = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM users WHERE id=${userId} FOR UPDATE`;
    if (!owner.length) throw new ProgramError(401, "Sign in again.");
    const receipt = await tx.programMutation.findUnique({
      where: {
        userId_clientMutationId: {
          userId,
          clientMutationId: input.clientMutationId,
        },
      },
    });
    if (receipt) {
      if (receipt.payloadHash !== payloadHash)
        throw new ProgramError(
          409,
          "This request identifier was already used with different data.",
        );
      return;
    }
    const state = await tx.programState.findUnique({ where: { userId } });
    const revision = state?.revision ?? 0;
    const bundle = await loadProfile(tx, userId),
      profile = bundle.profile;
    if (!profile)
      throw new ProgramError(409, "Save your profile basics first.");
    if (
      revision !== input.expectedRevision ||
      profile.version !== input.expectedProfileVersion
    )
      throw new ProgramError(
        409,
        "Saved program or profile configuration changed. Reload before trying again.",
      );
    const now = new Date(),
      change = input.change;
    if (change.operation === "check-in") {
      const { operation, ...fields } = change;
      void operation;
      await tx.fatigueCheckIn.create({ data: { userId, ...fields } });
    }
    if (change.operation === "generate" || change.operation === "pause") {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(38614003)`;
      const rules = await rulesFor(tx),
        checkIn = await latestCheckIn(tx, userId);
      const schedule = await scheduleFor(tx, userId, now);
      const effectiveFrom =
        change.operation === "generate"
          ? change.settings.effectiveFrom
          : change.effectiveFrom;
      const effectiveUntil =
        change.operation === "generate"
          ? addDays(effectiveFrom, 27)
          : change.effectiveUntil;
      validateRange(effectiveFrom, effectiveUntil, profile.timezone, now);
      const generated =
        change.operation === "generate"
          ? generateTraining(
              bundle,
              change.settings,
              await getCatalogue(tx),
              checkIn,
              rules.config,
              now,
            )
          : {
              sessions: [],
              weeklyVolumes: [],
              reasons: [
                "Explicit pause: only future sessions inside this date range will be cancelled after approval. Earlier prescriptions and the approved schedule outside this range remain unchanged.",
              ],
            };
      const plan: Plan = {
        schemaVersion: 1,
        kind: change.operation === "generate" ? "training" : "pause",
        effectiveFrom,
        effectiveUntil,
        timezone: profile.timezone,
        rulesVersion: rules.id,
        rulesHash: rules.hash,
        profileVersion: profile.version,
        checkInId: checkIn?.id ?? null,
        settings: change.operation === "generate" ? change.settings : null,
        reason: change.operation === "pause" ? change.reason : null,
        inputs: {
          profile: {
            experience: profile.experience,
            primaryGoal: profile.primaryGoal,
            secondaryGoals: profile.secondaryGoals,
            trainingDays: profile.trainingDays,
            durationMinutes: profile.durationMinutes,
            timezone: profile.timezone,
          },
          equipment:
            change.operation === "generate"
              ? bundle.equipment.find(
                  (e) => e.id === change.settings.equipmentProfileId,
                )
              : null,
          filters: bundle.exercisePreferences,
          checkIn: checkIn
            ? {
                id: checkIn.id,
                fatigue: checkIn.fatigue,
                soreness: checkIn.soreness,
                pain: checkIn.pain,
                createdAt: checkIn.createdAt,
              }
            : null,
        },
        ...generated,
        diff: { removed: [], added: generated.sessions },
      };
      plan.diff.removed = replaced(schedule, plan, now);
      ensureCalendar(
        plan.sessions,
        schedule.filter((s) => !plan.diff.removed.some((r) => r.id === s.id)),
        rules.config,
      );
      const latest = await tx.programVersion.findFirst({
        where: { userId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      await tx.programVersion.create({
        data: {
          userId,
          version: (latest?.version ?? 0) + 1,
          kind: plan.kind,
          profileVersion: profile.version,
          baseRevision: revision + 1,
          rulesVersionId: rules.id,
          planJson: JSON.parse(JSON.stringify(plan)),
        },
      });
    }
    if (change.operation === "approve")
      await approve(
        tx,
        userId,
        change.proposalId,
        revision,
        profile.version,
        now,
      );
    if (change.operation === "reject") {
      const proposal = await tx.programVersion.findFirst({
        where: { id: change.proposalId, userId },
        include: { decision: true },
      });
      if (!proposal) throw new ProgramError(404, "Proposal not found.");
      if (proposal.decision)
        throw new ProgramError(409, "This proposal already has a decision.");
      await tx.programDecision.create({
        data: { userId, programVersionId: proposal.id, decision: "rejected" },
      });
    }
    await tx.programState.upsert({
      where: { userId },
      create: { userId, revision: revision + 1 },
      update: { revision: revision + 1 },
    });
    await tx.programMutation.create({
      data: {
        userId,
        clientMutationId: input.clientMutationId,
        payloadHash,
        appliedRevision: revision + 1,
      },
    });
  });
  return getProgramBundle(userId);
}
