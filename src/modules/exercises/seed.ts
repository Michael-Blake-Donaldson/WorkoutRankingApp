import type { PrismaClient } from "../../generated/prisma/client";
import { equipmentTypes } from "../profile/options";
import { catalogue, muscles } from "./catalogue";
import { modalities, patterns, restrictionCodes } from "./options";
export function validateCatalogue() {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const e of catalogue) {
    if (
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
