import { equipmentTypes } from "../profile/options";
import { modalities, patterns, restrictionCodes } from "./options";
import type {
  Alternative,
  Components,
  ExerciseDto,
  FilterContext,
} from "./types";
export const substitutionRulesVersion = "substitution-v1";

export function eligibility(exercise: ExerciseDto, context: FilterContext) {
  const reasons: string[] = [];
  if (
    !patterns.includes(exercise.pattern as (typeof patterns)[number]) ||
    !modalities.includes(exercise.modality as (typeof modalities)[number]) ||
    exercise.demands.some((d) => !restrictionCodes.includes(d)) ||
    exercise.equipment.some((e) => !equipmentTypes.includes(e)) ||
    !Number.isInteger(exercise.difficulty) ||
    exercise.difficulty < 1 ||
    exercise.difficulty > 3
  )
    reasons.push("Unsupported movement metadata.");
  if (exercise.reviewStatus !== "editorial")
    reasons.push(
      "Exercise metadata has not passed the catalogue's editorial checks.",
    );
  if (!context.reviewed)
    reasons.push(
      "Review your movement filters before requesting alternatives.",
    );
  if (context.unresolvedNotes)
    reasons.push(
      "Free-text limitations cannot be interpreted by these filters. Personalized alternatives need a qualified review of those notes.",
    );
  if (
    !exercise.instructions.length ||
    !exercise.safetyNotes.length ||
    !exercise.muscles.some((m) => m.role === "primary")
  )
    reasons.push("Required instruction or movement metadata is missing.");
  const missing = exercise.equipment.filter(
    (e) => !context.equipment.includes(e),
  );
  if (missing.length)
    reasons.push(`Requires unavailable equipment: ${missing.join(", ")}.`);
  const blocked = exercise.demands.filter((d) =>
    context.restrictions.includes(d),
  );
  if (blocked.length)
    reasons.push(
      `Conflicts with selected movement filters: ${blocked.join(", ")}.`,
    );
  if (context.choices[exercise.id] === "exclude")
    reasons.push("You explicitly excluded this exercise.");
  return { eligible: reasons.length === 0, reasons };
}
const families: Record<string, string> = {
  squat: "knee",
  lunge: "knee",
  hinge: "hip",
  hip_extension: "hip",
  horizontal_push: "push",
  vertical_push: "push",
  horizontal_pull: "pull",
  vertical_pull: "pull",
  trunk_brace: "core",
  locomotion: "locomotion",
};
export function scoreComponents(
  source: ExerciseDto,
  target: ExerciseDto,
  context: FilterContext,
): Components {
  const a = new Set(
    source.muscles.filter((m) => m.role === "primary").map((m) => m.id),
  );
  const b = new Set(
    target.muscles.filter((m) => m.role === "primary").map((m) => m.id),
  );
  const intersection = [...a].filter((id) => b.has(id)).length;
  const union = new Set([...a, ...b]).size;
  const sourceEquipment = new Set(source.equipment);
  const targetEquipment = new Set(target.equipment);
  const equipmentUnion = new Set([...sourceEquipment, ...targetEquipment]).size;
  const preference = context.choices[target.id];
  return {
    muscle: union ? intersection / union : 0,
    pattern:
      source.pattern === target.pattern
        ? 1
        : families[source.pattern] &&
            families[source.pattern] === families[target.pattern]
          ? 0.5
          : 0,
    equipment: equipmentUnion
      ? [...sourceEquipment].filter((e) => targetEquipment.has(e)).length /
        equipmentUnion
      : 1,
    difficulty: Math.max(
      0,
      1 - Math.abs(target.difficulty - context.experience) / 2,
    ),
    preference: preference === "like" ? 1 : preference === "dislike" ? 0 : 0.5,
  };
}
export function weightedScore(c: Components) {
  return (
    0.35 * c.muscle +
    0.25 * c.pattern +
    0.2 * c.equipment +
    0.1 * c.difficulty +
    0.1 * c.preference
  );
}
export function rankAlternatives(
  source: ExerciseDto,
  library: ExerciseDto[],
  context: FilterContext,
) {
  const alternatives: Alternative[] = [];
  let excludedCount = 0;
  for (const exercise of library) {
    if (exercise.id === source.id) continue;
    if (!eligibility(exercise, context).eligible) {
      excludedCount++;
      continue;
    }
    const components = scoreComponents(source, exercise, context);
    // Relevance is separate from eligibility. Never offer an unrelated high soft score.
    if (components.muscle === 0 || components.pattern === 0) continue;
    const differences: string[] = [];
    if (source.pattern !== exercise.pattern)
      differences.push(
        `Movement changes from ${source.pattern} to ${exercise.pattern}.`,
      );
    if (source.resistance !== exercise.resistance)
      differences.push(
        `Resistance changes from ${source.resistance} to ${exercise.resistance}; external loading is not reproduced.`,
      );
    if (source.modality !== exercise.modality)
      differences.push(
        `Tracking modality changes from ${source.modality} to ${exercise.modality}.`,
      );
    if (source.laterality !== exercise.laterality)
      differences.push(
        `Laterality changes from ${source.laterality} to ${exercise.laterality}.`,
      );
    if (
      [...source.metrics].sort().join(",") !==
      [...exercise.metrics].sort().join(",")
    )
      differences.push(
        "Different metrics are recorded; compare each movement separately.",
      );
    differences.push(
      "Matching filters does not establish equivalent stimulus. PRs stay separate for this exercise identity.",
    );
    alternatives.push({
      exercise,
      components,
      score: weightedScore(components),
      relationship:
        source.pattern === exercise.pattern
          ? "same_pattern"
          : "related_movement",
      differences,
    });
  }
  alternatives.sort(
    (a, b) => b.score - a.score || a.exercise.id.localeCompare(b.exercise.id),
  );
  return { alternatives, excludedCount };
}
