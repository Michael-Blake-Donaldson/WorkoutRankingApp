import type { ProfileBundle } from "../../src/modules/profile/contracts";
import type {
  CheckIn,
  GenerationSettings,
} from "../../src/modules/programs/types";
export const planningNow = new Date("2026-11-05T12:00:00Z");
export const readyCheckIn: CheckIn = {
  id: "00000000-0000-4000-8000-000000000001",
  fatigue: 1,
  soreness: 1,
  pain: false,
  notes: "",
  createdAt: planningNow.toISOString(),
};
export const planningSettings: GenerationSettings = {
  effectiveFrom: "2026-11-09",
  localStart: "18:00",
  equipmentProfileId: "00000000-0000-4000-8000-000000000002",
  split: "default",
  customDays: [],
  workingSets: null,
  weeklyCap: null,
  rulesAcknowledged: true,
};
export function planningBundle(): ProfileBundle {
  return {
    accountId: "unit-owner",
    profile: {
      displayName: "Trainee",
      experience: "beginner",
      primaryGoal: "general_fitness",
      secondaryGoals: [],
      trainingDays: [1, 3, 5],
      durationMinutes: 60,
      timezone: "America/New_York",
      likes: "",
      dislikes: "",
      limitations: "",
      calorieTarget: null,
      proteinTargetG: null,
      weightUnit: "kg",
      lengthUnit: "cm",
      shareCompetitionSummary: false,
      audioEnabled: false,
      hapticsEnabled: false,
      motionPreference: "system",
      version: 1,
      heightCm: null,
      onboardingCompletedAt: null,
    },
    exercisePreferences: { reviewed: true, restrictions: [], choices: {} },
    equipment: [
      {
        id: planningSettings.equipmentProfileId,
        name: "Home weights",
        location: "home",
        isDefault: true,
        items: ["dumbbell", "bench"].map((equipmentType) => ({
          equipmentType: equipmentType as "dumbbell" | "bench",
          minLoadKg: null,
          maxLoadKg: null,
          incrementKg: null,
        })),
      },
    ],
    measurements: [],
    hasMoreMeasurements: false,
    nextMeasurementCursor: null,
    baselineHeight: null,
    measurementStatus: { height: false, weight: false },
  };
}
