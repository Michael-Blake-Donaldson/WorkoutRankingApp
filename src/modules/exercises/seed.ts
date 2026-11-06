import type { PrismaClient } from "../../generated/prisma/client";
import { equipmentTypes } from "../profile/options";
import { catalogue, muscles } from "./catalogue";
import { modalities, patterns, restrictionCodes } from "./options";
export function validateCatalogue() {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const versions = new Set<string>();
  const uuid =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
  for (const e of catalogue) {
    if (
      !uuid.test(e.id) ||
      !uuid.test(e.versionId) ||
      versions.has(e.versionId) ||
      !Number.isInteger(e.version) ||
      e.version < 1 ||
      !Number.isInteger(e.difficulty) ||
      !e.name.trim() ||
      !e.license.trim() ||
      !e.reviewedBy.trim() ||
      !Number.isFinite(Date.parse(e.reviewedAt)) ||
      !e.sourceUrls.length ||
      !e.metrics.length ||
      e.metrics.some(
        (m) =>
          ![
            "repetitions",
            "load_kg",
            "duration_seconds",
            "distance_meters",
          ].includes(m),
      ) ||
      !["bilateral", "unilateral"].includes(e.laterality) ||
      !["editorial", "unreviewed"].includes(e.reviewStatus) ||
      !/^[a-f0-9]{64}$/.test(e.contentHash) ||
      e.instructions.some((s) => !s.trim()) ||
      e.safetyNotes.some((s) => !s.trim()) ||
      new Set(e.muscles.map((m) => m.id)).size !== e.muscles.length ||
      new Set(e.equipment).size !== e.equipment.length ||
      new Set(e.demands).size !== e.demands.length ||
      ids.has(e.id) ||
      slugs.has(e.slug) ||
      !e.muscles.some((m) => m.role === "primary") ||
      !e.instructions.length ||
      !e.safetyNotes.length ||
      !modalities.includes(e.modality as (typeof modalities)[number]) ||
      !patterns.includes(e.pattern as (typeof patterns)[number]) ||
      e.equipment.some((x) => !equipmentTypes.includes(x)) ||
      e.demands.some((x) => !restrictionCodes.includes(x)) ||
      e.muscles.some((m) => !muscles.some((x) => x.id === m.id)) ||
      e.sourceUrls.some((url) => new URL(url).protocol !== "https:") ||
      e.difficulty < 1 ||
      e.difficulty > 3
    )
      throw new Error(`Invalid exercise reference: ${e.slug}`);
    ids.add(e.id);
    slugs.add(e.slug);
    versions.add(e.versionId);
  }
}
export async function seedExercises(db: PrismaClient) {
  validateCatalogue();
  await db.$transaction(async (tx) => {
    // Serialize seed processes. A conflicting existing version aborts the whole batch.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(38614003)`;
    for (const muscle of muscles) {
      const prior = await tx.muscle.findUnique({ where: { id: muscle.id } });
      if (
        prior &&
        (prior.name !== muscle.name || prior.category !== muscle.category)
      )
        throw new Error(`Muscle identity changed: ${muscle.id}`);
      if (!prior) await tx.muscle.create({ data: muscle });
    }
    for (const e of catalogue) {
      const identity = await tx.exercise.findUnique({ where: { id: e.id } });
      if (
        identity &&
        (identity.slug !== e.slug || identity.variantGroup !== e.variantGroup)
      )
        throw new Error(`Exercise identity changed: ${e.slug}`);
      if (!identity)
        await tx.exercise.create({
          data: { id: e.id, slug: e.slug, variantGroup: e.variantGroup },
        });
      const prior = await tx.exerciseVersion.findUnique({
        where: { exerciseId_version: { exerciseId: e.id, version: e.version } },
      });
      if (prior) {
        if (prior.contentHash !== e.contentHash)
          throw new Error(`Publish a new version for ${e.slug}`);
        continue;
      }
      const {
        id,
        slug,
        variantGroup,
        versionId,
        muscles: links,
        equipment,
        ...fields
      } = e;
      void slug;
      void variantGroup;
      await tx.exerciseVersion.create({
        data: {
          ...fields,
          id: versionId,
          exerciseId: id,
          reviewedAt: new Date(e.reviewedAt),
          muscles: {
            create: links.map((m) => ({ muscleId: m.id, role: m.role })),
          },
          equipment: {
            create: equipment.map((equipmentType) => ({ equipmentType })),
          },
        },
      });
    }
  });
}
