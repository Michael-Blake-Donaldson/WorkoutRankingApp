import { describe, expect, it } from "vitest";
import { catalogue } from "../../src/modules/exercises/catalogue";
import {
  eligibility,
  rankAlternatives,
  scoreComponents,
  weightedScore,
} from "../../src/modules/exercises/engine";
import { validateCatalogue } from "../../src/modules/exercises/seed";
import type { FilterContext } from "../../src/modules/exercises/types";

const context: FilterContext = {
  equipment: [],
  restrictions: [],
  reviewed: true,
  unresolvedNotes: false,
  experience: 1,
  choices: {},
};
const find = (slug: string) => {
  const value = catalogue.find((e) => e.slug === slug);
  if (!value) throw new Error(slug);
  return value;
};
describe("substitution-v1 golden cases", () => {
  it("validates original attributed seed identities and metadata", () => {
    expect(validateCatalogue()).toBeUndefined();
    expect(catalogue).toHaveLength(16);
  });
  it("requires every equipment item, not just one of them", () => {
    const press = find("single-arm-dumbbell-chest-press");
    expect(
      eligibility(press, { ...context, equipment: ["dumbbell"] }).eligible,
    ).toBe(false);
    expect(
      eligibility(press, { ...context, equipment: ["dumbbell", "bench"] })
        .eligible,
    ).toBe(true);
  });
  it("hard gates outrank preferences and fail closed for notes, review and unknown metadata", () => {
    const push = find("push-up");
    for (const change of [
      { reviewed: false },
      { unresolvedNotes: true },
      { restrictions: ["wrist_extension"] as const },
      { choices: { [push.id]: "exclude" as const } },
    ])
      expect(
        eligibility(push, {
          ...context,
          ...change,
          restrictions: change.restrictions ? [...change.restrictions] : [],
        }).eligible,
      ).toBe(false);
    expect(
      eligibility({ ...push, demands: ["unknown" as never] }, context).eligible,
    ).toBe(false);
  });
  it("has an independently specified exact score and deterministic ordering", () => {
    const source = find("push-up"),
      target = find("kneeling-push-up");
    const parts = scoreComponents(source, target, context);
    expect(parts).toEqual({
      muscle: 1,
      pattern: 1,
      equipment: 1,
      difficulty: 1,
      preference: 0.5,
    });
    expect(weightedScore(parts)).toBeCloseTo(0.95, 12);
    const ranked = rankAlternatives(
      source,
      [target, { ...target, id: "a-tie" }],
      context,
    ).alternatives;
    expect(ranked.map((x) => x.exercise.id)).toEqual(["a-tie", target.id]);
  });
  it("offers home bodyweight changes with explicit loading and metric differences", () => {
    const source = find("dumbbell-goblet-squat");
    const result = rankAlternatives(source, catalogue, context);
    expect(result.alternatives.map((x) => x.exercise.slug)).toEqual([
      "bodyweight-squat",
    ]);
    expect(result.alternatives[0].differences.join(" ")).toContain(
      "external loading is not reproduced",
    );
  });
  it("has no invented no-equipment vertical pull and excludes impact before scoring", () => {
    expect(
      rankAlternatives(find("pull-up"), catalogue, context).alternatives,
    ).toEqual([]);
    expect(
      rankAlternatives(find("treadmill-walk"), catalogue, {
        ...context,
        equipment: ["treadmill"],
        restrictions: ["impact"],
      }).alternatives,
    ).toEqual([]);
  });
  it("labels related movement separately and never merges identities", () => {
    const result = rankAlternatives(
      find("dumbbell-romanian-deadlift"),
      catalogue,
      context,
    );
    expect(result.alternatives[0].exercise.slug).toBe("glute-bridge");
    expect(result.alternatives[0].relationship).toBe("related_movement");
    expect(result.alternatives[0].components.pattern).toBe(0.5);
    expect(new Set(catalogue.map((e) => e.id)).size).toBe(16);
  });
});
