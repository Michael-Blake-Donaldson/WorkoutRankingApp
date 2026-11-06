import { db } from "../../server/db";
import { getProfileBundle, ProfileError } from "../profile/service";
import {
  eligibility,
  rankAlternatives,
  substitutionRulesVersion,
} from "./engine";
import type { Restriction } from "./options";
import type {
  AlternativesResult,
  EquipmentType,
  ExerciseDto,
  FilterContext,
} from "./types";
export async function getCatalogue(): Promise<ExerciseDto[]> {
  const rows = await db.exercise.findMany({
    where: { archived: false },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        include: {
          muscles: { include: { muscle: true }, orderBy: { muscleId: "asc" } },
          equipment: { orderBy: { equipmentType: "asc" } },
        },
      },
    },
    orderBy: { slug: "asc" },
  });
  return rows.flatMap((e) => {
    const v = e.versions[0];
    // Never fall back to an older approved version when the latest is unavailable.
    if (v?.reviewStatus !== "editorial") return [];
    return [
      {
        id: e.id,
        slug: e.slug,
        variantGroup: e.variantGroup,
        versionId: v.id,
        version: v.version,
        name: v.name,
        aliases: v.aliases,
        modality: v.modality,
        pattern: v.pattern,
        laterality: v.laterality,
        resistance: v.resistance,
        difficulty: v.difficulty,
        metrics: v.metrics,
        demands: v.demands as Restriction[],
        instructions: v.instructions,
        safetyNotes: v.safetyNotes,
        sourceUrls: v.sourceUrls,
        license: v.license,
        reviewedBy: v.reviewedBy,
        reviewedAt: v.reviewedAt.toISOString(),
        contentHash: v.contentHash,
        reviewStatus: v.reviewStatus,
        muscles: v.muscles.map((m) => ({
          id: m.muscleId,
          name: m.muscle.name,
          role: m.role as "primary" | "secondary",
        })),
        equipment: v.equipment.map((i) => i.equipmentType as EquipmentType),
      },
    ];
  });
}
export async function getAlternatives(
  userId: string,
  input: {
    exerciseId: string;
    equipmentProfileId: string;
    expectedProfileVersion: number;
  },
): Promise<AlternativesResult> {
  const bundle = await getProfileBundle(userId);
  if (!bundle.profile)
    throw new ProfileError(409, "Save your profile basics first.");
  if (bundle.profile.version !== input.expectedProfileVersion)
    throw new ProfileError(
      409,
      "Your profile changed. Reload before comparing alternatives.",
    );
  const environment = bundle.equipment.find(
    (e) => e.id === input.equipmentProfileId,
  );
  if (!environment)
    throw new ProfileError(404, "Equipment location not found.");
  const library = await getCatalogue();
  const source = library.find((e) => e.id === input.exerciseId);
  if (!source)
    throw new ProfileError(404, "Exercise not found in the reviewed library.");
  const context: FilterContext = {
    equipment: environment.items.map((i) => i.equipmentType),
    restrictions: bundle.exercisePreferences.restrictions,
    reviewed: bundle.exercisePreferences.reviewed,
    unresolvedNotes: !!bundle.profile.limitations.trim(),
    experience:
      bundle.profile.experience === "beginner"
        ? 1
        : bundle.profile.experience === "intermediate"
          ? 2
          : 3,
    choices: bundle.exercisePreferences.choices,
  };
  const { alternatives, excludedCount } = rankAlternatives(
    source,
    library,
    context,
  );
  const reviewRequired = !context.reviewed || context.unresolvedNotes;
  const status = reviewRequired
    ? "review_required"
    : !alternatives.length
      ? "no_match"
      : alternatives.some((a) => a.relationship === "same_pattern")
        ? "matches"
        : "related_only";
  return {
    rulesVersion: substitutionRulesVersion,
    source,
    sourceGate: eligibility(source, context),
    status,
    message: reviewRequired
      ? "Review movement filters and any limitation notes before personalized alternatives can be shown."
      : status === "no_match"
        ? "No matching alternative in this limited library meets your current filters and equipment. Keep the movement unassigned and review another environment or seek qualified guidance."
        : status === "related_only"
          ? "Only related movements were found. They change the movement pattern and are not equivalent replacements."
          : "Compare the differences before choosing a movement. These filters do not establish medical suitability or equal training stimulus.",
    alternatives,
    excludedCount,
    profileVersion: bundle.profile.version,
  };
}
