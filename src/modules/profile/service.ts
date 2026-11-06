import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import type { Prisma } from "../../generated/prisma/client";
import { db } from "../../server/db";
import type {
  Basics,
  EquipmentDto,
  MeasurementDto,
  Preferences,
  ProfileBundle,
  ProfileMutationInput,
} from "./contracts";
import { toSi } from "./units";

type Tx = Prisma.TransactionClient;
export class ProfileError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function owned<T>(userId: string, run: (tx: Tx) => Promise<T>) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return run(tx);
  });
}
export const getProfileBundle = (userId: string, cursor?: string) =>
  owned(userId, async (tx) => {
    if (
      cursor &&
      !(await tx.bodyMeasurement.findFirst({
        where: { id: cursor, userId },
        select: { id: true },
      }))
    )
      throw new ProfileError(404, "Measurement cursor not found.");
    return load(tx, userId, cursor);
  });
export const getMotionPreference = (userId: string) =>
  owned(
    userId,
    async (tx) =>
      (
        await tx.fitnessProfile.findUnique({
          where: { userId },
          select: { motionPreference: true },
        })
      )?.motionPreference ?? "system",
  );

async function load(
  tx: Tx,
  userId: string,
  cursor?: string,
): Promise<ProfileBundle> {
  const profile = await tx.fitnessProfile.findUnique({ where: { userId } });
  const rows = await tx.bodyMeasurement.findMany({
    where: { userId },
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 501,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { correctedBy: { select: { id: true } } },
  });
  const earliestWeight = rows
    .slice(0, 500)
    .filter((m) => m.metric === "weight" && !m.correctedBy.length)
    .at(-1);
  const baseline = earliestWeight
    ? await tx.bodyMeasurement.findFirst({
        where: {
          userId,
          metric: "height",
          recordedAt: { lte: earliestWeight.recordedAt },
          correctedBy: { none: {} },
        },
        orderBy: [
          { recordedAt: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
      })
    : null;
  const hasWeight = !!(await tx.bodyMeasurement.findFirst({
    where: { userId, metric: "weight", correctedBy: { none: {} } },
    select: { id: true },
  }));
  const equipment = await tx.equipmentProfile.findMany({
    where: { userId, archivedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { items: { orderBy: { equipmentType: "asc" } } },
  });
  return {
    profile: profile
      ? {
          displayName: profile.displayName,
          experience: profile.experience as Basics["experience"],
          primaryGoal: profile.primaryGoal as Basics["primaryGoal"],
          secondaryGoals: profile.secondaryGoals as Basics["secondaryGoals"],
          trainingDays: profile.trainingDays,
          durationMinutes: profile.durationMinutes,
          timezone: profile.timezone,
          likes: profile.likes,
          dislikes: profile.dislikes,
          limitations: profile.limitations,
          calorieTarget: profile.calorieTarget?.toString() ?? null,
          proteinTargetG: profile.proteinTargetG?.toString() ?? null,
          weightUnit: profile.weightUnit as Preferences["weightUnit"],
          lengthUnit: profile.lengthUnit as Preferences["lengthUnit"],
          shareCompetitionSummary: profile.shareCompetitionSummary,
          audioEnabled: profile.audioEnabled,
          hapticsEnabled: profile.hapticsEnabled,
          motionPreference:
            profile.motionPreference as Preferences["motionPreference"],
          version: profile.version,
          heightCm: profile.heightCm?.toString() ?? null,
          onboardingCompletedAt:
            profile.onboardingCompletedAt?.toISOString() ?? null,
        }
      : null,
    measurements: rows.slice(0, 500).map((m) => ({
      id: m.id,
      metric: m.metric as MeasurementDto["metric"],
      valueSi: m.valueSi.toString(),
      recordedAt: m.recordedAt.toISOString(),
      createdAt: m.createdAt.toISOString(),
      correctsId: m.correctsId,
      correctionReason: m.correctionReason,
      current: m.correctedBy.length === 0,
    })),
    equipment: equipment.map((e) => ({
      id: e.id,
      name: e.name,
      location: e.location as EquipmentDto["location"],
      isDefault: e.isDefault,
      items: e.items.map((item) => ({
        equipmentType:
          item.equipmentType as EquipmentDto["items"][number]["equipmentType"],
        minLoadKg: item.minLoadKg?.toString() ?? null,
        maxLoadKg: item.maxLoadKg?.toString() ?? null,
        incrementKg: item.incrementKg?.toString() ?? null,
      })),
    })),
    hasMoreMeasurements: rows.length > 500,
    nextMeasurementCursor: rows.length > 500 ? rows[499].id : null,
    baselineHeight: baseline
      ? {
          id: baseline.id,
          metric: "height",
          valueSi: baseline.valueSi.toString(),
          recordedAt: baseline.recordedAt.toISOString(),
          createdAt: baseline.createdAt.toISOString(),
          correctsId: baseline.correctsId,
          correctionReason: baseline.correctionReason,
          current: true,
        }
      : null,
    measurementStatus: {
      height: profile?.heightCm !== null && profile?.heightCm !== undefined,
      weight: hasWeight,
    },
  };
}

export async function mutateProfile(
  userId: string,
  input: ProfileMutationInput,
) {
  const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  await owned(userId, async (tx) => {
    // Serialize the whole aggregate, including the first profile creation.
    const owner = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM users WHERE id=${userId} FOR UPDATE`;
    if (!owner.length) throw new ProfileError(401, "Sign in again.");
    const receipt = await tx.profileMutation.findUnique({
      where: {
        userId_clientMutationId: {
          userId,
          clientMutationId: input.clientMutationId,
        },
      },
    });
    if (receipt) {
      if (receipt.payloadHash !== hash)
        throw new ProfileError(
          409,
          "This request identifier was already used with different data.",
        );
      return;
    }
    const profile = await tx.fitnessProfile.findUnique({ where: { userId } });
    if ((profile?.version ?? 0) !== input.expectedVersion)
      throw new ProfileError(
        409,
        "Your profile changed on another page or device. Reload the latest saved data before trying again.",
      );
    const change = input.change;
    if (!profile && change.operation !== "save-profile")
      throw new ProfileError(409, "Save your profile basics first.");
    if (change.operation === "save-profile") {
      const data = {
        ...change.basics,
        trainingDays: [...change.basics.trainingDays].sort((a, b) => a - b),
      };
      if (profile) await tx.fitnessProfile.update({ where: { userId }, data });
      else await tx.fitnessProfile.create({ data: { userId, ...data } });
    }
    if (change.operation === "save-settings")
      await tx.fitnessProfile.update({
        where: { userId },
        data: change.settings,
      });
    if (change.operation === "record-measurement") {
      if ((change.metric === "weight") !== ["kg", "lb"].includes(change.unit))
        throw new ProfileError(
          400,
          "The measurement unit does not match its metric.",
        );
      const valueSi = toSi(change.value, change.unit);
      const value = new Decimal(valueSi);
      const min =
        change.metric === "weight"
          ? "0.1"
          : change.metric === "height"
            ? "0.2"
            : "0.01";
      const max =
        change.metric === "weight"
          ? "1000"
          : change.metric === "height"
            ? "3"
            : "5";
      if (value.lt(min) || value.gt(max))
        throw new ProfileError(
          400,
          "Measurement is outside supported input bounds. Check the value and unit.",
        );
      const recordedAt = new Date(change.recordedAt);
      if (
        recordedAt.getTime() > Date.now() + 300_000 ||
        recordedAt.getUTCFullYear() < 1900
      )
        throw new ProfileError(
          400,
          "Choose a measurement time from 1900 through the present.",
        );
      if (change.correctsId) {
        const prior = await tx.bodyMeasurement.findFirst({
          where: { id: change.correctsId, userId, metric: change.metric },
          include: { correctedBy: { select: { id: true } } },
        });
        if (!prior) throw new ProfileError(404, "Measurement not found.");
        if (prior.correctedBy.length)
          throw new ProfileError(
            409,
            "That entry already has a correction. Correct its latest replacement instead.",
          );
        if (!change.correctionReason)
          throw new ProfileError(400, "A correction requires a reason.");
      }
      await tx.bodyMeasurement.create({
        data: {
          userId,
          metric: change.metric,
          valueSi,
          recordedAt,
          correctsId: change.correctsId,
          correctionReason: change.correctsId ? change.correctionReason : null,
        },
      });
      if (change.metric === "height") {
        const latest = await tx.bodyMeasurement.findFirst({
          where: { userId, metric: "height", correctedBy: { none: {} } },
          orderBy: [
            { recordedAt: "desc" },
            { createdAt: "desc" },
            { id: "desc" },
          ],
        });
        await tx.fitnessProfile.update({
          where: { userId },
          data: {
            heightCm: latest
              ? latest.valueSi.mul(100).toDecimalPlaces(3)
              : null,
          },
        });
      }
    }
    if (change.operation === "save-equipment") {
      if (
        new Set(change.items.map((i) => i.equipmentType)).size !==
        change.items.length
      )
        throw new ProfileError(
          400,
          "Each equipment type may appear once per location.",
        );
      if (
        change.id &&
        !(await tx.equipmentProfile.findFirst({
          where: { id: change.id, userId, archivedAt: null },
        }))
      )
        throw new ProfileError(404, "Equipment location not found.");
      const count = await tx.equipmentProfile.count({
        where: { userId, archivedAt: null },
      });
      if (!change.id && count >= 8)
        throw new ProfileError(
          400,
          "At most eight active equipment locations are supported.",
        );
      const isDefault =
        change.isDefault ||
        count === 0 ||
        !!(
          change.id &&
          (await tx.equipmentProfile.findUnique({ where: { id: change.id } }))
            ?.isDefault
        );
      if (isDefault)
        await tx.equipmentProfile.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      const data = { name: change.name, location: change.location, isDefault };
      const location = change.id
        ? await tx.equipmentProfile.update({
            where: { id: change.id, userId },
            data,
          })
        : await tx.equipmentProfile.create({ data: { userId, ...data } });
      await tx.equipmentItem.deleteMany({
        where: { profileId: location.id, userId },
      });
      if (change.items.length)
        await tx.equipmentItem.createMany({
          data: change.items.map((i) => ({
            profileId: location.id,
            userId,
            ...i,
          })),
        });
    }
    if (change.operation === "archive-equipment") {
      const location = await tx.equipmentProfile.findFirst({
        where: { id: change.id, userId, archivedAt: null },
      });
      if (!location)
        throw new ProfileError(404, "Equipment location not found.");
      const remaining = await tx.equipmentProfile.findFirst({
        where: { userId, archivedAt: null, id: { not: change.id } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      if (profile?.onboardingCompletedAt && !remaining)
        throw new ProfileError(
          400,
          "Keep at least one equipment location. A no-equipment home location is supported.",
        );
      await tx.equipmentProfile.update({
        where: { id: location.id },
        data: { isDefault: false, archivedAt: new Date() },
      });
      if (location.isDefault && remaining)
        await tx.equipmentProfile.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
    }
    if (change.operation === "complete-onboarding") {
      const current = await load(tx, userId);
      if (
        !current.equipment.length ||
        !(await tx.bodyMeasurement.findFirst({
          where: { userId, metric: "height", correctedBy: { none: {} } },
        })) ||
        !(await tx.bodyMeasurement.findFirst({
          where: { userId, metric: "weight", correctedBy: { none: {} } },
        }))
      )
        throw new ProfileError(
          400,
          "Add an equipment location, height and weight before completing setup.",
        );
      if (!profile?.onboardingCompletedAt)
        await tx.fitnessProfile.update({
          where: { userId },
          data: { onboardingCompletedAt: new Date() },
        });
    }
    const version = (profile?.version ?? 0) + 1;
    await tx.fitnessProfile.update({ where: { userId }, data: { version } });
    const snapshot = await load(tx, userId);
    await tx.profileRevision.create({
      data: {
        userId,
        version,
        snapshotJson: JSON.parse(
          JSON.stringify({
            profile: snapshot.profile,
            equipment: snapshot.equipment,
          }),
        ),
      },
    });
    await tx.profileMutation.create({
      data: {
        userId,
        clientMutationId: input.clientMutationId,
        payloadHash: hash,
        appliedVersion: version,
      },
    });
  });
  return getProfileBundle(userId);
}
