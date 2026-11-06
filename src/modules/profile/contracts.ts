import { z } from "zod";
import {
  type ExercisePreference,
  preferenceOptions,
  type Restriction,
  restrictionOptions,
} from "../exercises/options";

import { equipmentTypes, goals, metrics } from "./options";

export { equipmentTypes, goals, metrics } from "./options";

const numeric = z
  .string()
  .regex(
    /^\d{1,6}(\.\d{1,6})?$/,
    "Use a positive number with up to six decimal places.",
  );
const optionalNumber = z
  .string()
  .regex(/^\d{1,6}(\.\d{1,2})?$/, "Use at most two decimal places.")
  .nullable();
const optionalLoad = z
  .string()
  .regex(
    /^\d{1,6}(\.\d{1,3})?$/,
    "Use at most three decimal places for kg loads.",
  )
  .nullable();
const timezone = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return !/^[+-]/.test(value);
    } catch {
      return false;
    }
  }, "Choose a valid IANA timezone, such as America/New_York.");
export const basicsSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    experience: z.enum(["beginner", "intermediate", "advanced"]),
    primaryGoal: z.enum(goals),
    secondaryGoals: z.array(z.enum(goals)).max(3),
    trainingDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    durationMinutes: z.number().int().min(10).max(240),
    timezone,
    likes: z.string().trim().max(1000),
    dislikes: z.string().trim().max(1000),
    limitations: z.string().trim().max(2000),
    calorieTarget: optionalNumber,
    proteinTargetG: optionalNumber,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.trainingDays).size !== value.trainingDays.length)
      ctx.addIssue({
        code: "custom",
        path: ["trainingDays"],
        message: "Choose each day once.",
      });
    if (
      new Set(value.secondaryGoals).size !== value.secondaryGoals.length ||
      value.secondaryGoals.includes(value.primaryGoal)
    )
      ctx.addIssue({
        code: "custom",
        path: ["secondaryGoals"],
        message: "Secondary goals must be distinct from the primary goal.",
      });
    if (
      value.calorieTarget !== null &&
      (+value.calorieTarget <= 0 || +value.calorieTarget > 20000)
    )
      ctx.addIssue({
        code: "custom",
        path: ["calorieTarget"],
        message: "Enter a target above zero and at most 20000, or leave blank.",
      });
    if (
      value.proteinTargetG !== null &&
      (+value.proteinTargetG <= 0 || +value.proteinTargetG > 1000)
    )
      ctx.addIssue({
        code: "custom",
        path: ["proteinTargetG"],
        message: "Enter a target above zero and at most 1000, or leave blank.",
      });
  });
export const preferencesSchema = z
  .object({
    weightUnit: z.enum(["kg", "lb"]),
    lengthUnit: z.enum(["cm", "in"]),
    shareCompetitionSummary: z.boolean(),
    audioEnabled: z.boolean(),
    hapticsEnabled: z.boolean(),
    motionPreference: z.enum(["system", "reduce"]),
  })
  .strict();
const itemSchema = z
  .object({
    equipmentType: z.enum(equipmentTypes),
    minLoadKg: optionalLoad,
    maxLoadKg: optionalLoad,
    incrementKg: optionalLoad,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      [v.minLoadKg, v.maxLoadKg, v.incrementKg].some(
        (n) => n !== null && (+n <= 0 || +n > 2000),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Load values must be above zero and at most 2000 kg.",
      });
    if (
      v.minLoadKg !== null &&
      v.maxLoadKg !== null &&
      +v.minLoadKg > +v.maxLoadKg
    )
      ctx.addIssue({
        code: "custom",
        message: "Minimum load exceeds maximum load.",
      });
  });
const exercisePreferencesSchema = z
  .object({
    operation: z.literal("save-exercise-preferences"),
    reviewed: z.boolean(),
    restrictions: z.array(z.enum(restrictionOptions.map((x) => x.code))).max(8),
    choices: z
      .array(
        z
          .object({
            exerciseId: z.uuid(),
            preference: z.enum(preferenceOptions),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      new Set(v.restrictions).size !== v.restrictions.length ||
      new Set(v.choices.map((c) => c.exerciseId)).size !== v.choices.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Choose each restriction and exercise once.",
      });
  });
export const changeSchema = z.discriminatedUnion("operation", [
  exercisePreferencesSchema,
  z
    .object({ operation: z.literal("save-profile"), basics: basicsSchema })
    .strict(),
  z.object({ operation: z.literal("complete-onboarding") }).strict(),
  z
    .object({
      operation: z.literal("save-settings"),
      settings: preferencesSchema,
    })
    .strict(),
  z
    .object({
      operation: z.literal("record-measurement"),
      metric: z.enum(metrics),
      value: numeric,
      unit: z.enum(["kg", "lb", "cm", "in"]),
      recordedAt: z.iso.datetime({ offset: true }),
      correctsId: z.uuid().nullable(),
      correctionReason: z.string().trim().max(500),
    })
    .strict(),
  z
    .object({
      operation: z.literal("save-equipment"),
      id: z.uuid().nullable(),
      name: z.string().trim().min(1).max(80),
      location: z.enum(["home", "gym", "travel"]),
      isDefault: z.boolean(),
      items: z.array(itemSchema).max(11),
    })
    .strict(),
  z
    .object({ operation: z.literal("archive-equipment"), id: z.uuid() })
    .strict(),
]);
export const mutationSchema = z
  .object({
    clientMutationId: z.uuid(),
    expectedVersion: z.number().int().min(0),
    change: changeSchema,
  })
  .strict();
export type Basics = z.infer<typeof basicsSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type ProfileChange = z.infer<typeof changeSchema>;
export type ProfileMutationInput = z.infer<typeof mutationSchema>;
export type MeasurementDto = {
  id: string;
  metric: (typeof metrics)[number];
  valueSi: string;
  recordedAt: string;
  createdAt: string;
  correctsId: string | null;
  correctionReason: string | null;
  current: boolean;
};
export type EquipmentDto = {
  id: string;
  name: string;
  location: "home" | "gym" | "travel";
  isDefault: boolean;
  items: {
    equipmentType: (typeof equipmentTypes)[number];
    minLoadKg: string | null;
    maxLoadKg: string | null;
    incrementKg: string | null;
  }[];
};
export type ProfileBundle = {
  accountId: string;
  profile:
    | (Basics &
        Preferences & {
          version: number;
          heightCm: string | null;
          onboardingCompletedAt: string | null;
        })
    | null;
  exercisePreferences: {
    reviewed: boolean;
    restrictions: Restriction[];
    choices: Record<string, ExercisePreference>;
  };
  measurements: MeasurementDto[];
  equipment: EquipmentDto[];
  hasMoreMeasurements: boolean;
  nextMeasurementCursor: string | null;
  baselineHeight: MeasurementDto | null;
  measurementStatus: { height: boolean; weight: boolean };
};
