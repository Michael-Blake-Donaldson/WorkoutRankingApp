import type { PrismaClient } from "../../generated/prisma/client";
import { contentHash } from "../exercises/catalogue";
import { programRulesId } from "./options";
import type { Rules } from "./types";
export const programRules: Rules = {
  horizonDays: 28,
  recoveryHours: 48,
  checkInHours: 24,
  secondaryWeight: 0.25,
  defaultSets: { beginner: 2, intermediate: 2, advanced: 3 },
  weeklyCaps: { beginner: 12, intermediate: 16, advanced: 18 },
  goals: {
    strength: { repMin: 6, repMax: 8, restSeconds: 180 },
    muscle: { repMin: 8, repMax: 12, restSeconds: 120 },
    general_fitness: { repMin: 8, repMax: 12, restSeconds: 120 },
    endurance: { repMin: 12, repMax: 15, restSeconds: 90 },
  },
  rir: 3,
  holdMin: 15,
  holdMax: 25,
  conditioningMinutes: 15,
  preparationSeconds: 420,
  setupSeconds: 120,
  secondsPerRep: 4,
};
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, ordered(item)]),
    );
  return value;
}
export const hashValue = (value: unknown) => contentHash(ordered(value));
export const programRulesHash = hashValue(programRules);
export async function seedProgramRules(db: PrismaClient) {
  const existing = await db.programRuleVersion.findUnique({
    where: { id: programRulesId },
  });
  if (existing) {
    if (
      existing.contentHash !== programRulesHash ||
      hashValue(existing.configJson) !== programRulesHash
    )
      throw new Error("Publish a new immutable planning rules version");
    return;
  }
  await db.programRuleVersion.create({
    data: {
      id: programRulesId,
      configJson: JSON.parse(JSON.stringify(programRules)),
      contentHash: programRulesHash,
      reviewedBy: "Codex editorial review; qualified exercise review pending",
    },
  });
}
