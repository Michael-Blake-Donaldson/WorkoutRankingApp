import { z } from "zod";
import { dayTypes, splitOptions } from "./options";
export const settingsSchema = z
  .object({
    effectiveFrom: z.iso.date(),
    localStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    equipmentProfileId: z.uuid(),
    split: z.enum(splitOptions),
    customDays: z
      .array(
        z
          .object({
            day: z.number().int().min(0).max(6),
            type: z.enum(dayTypes),
          })
          .strict(),
      )
      .max(7),
    workingSets: z.number().int().min(1).max(3).nullable(),
    weeklyCap: z.number().int().min(2).max(18).nullable(),
    rulesAcknowledged: z.literal(true),
  })
  .strict();
export const programMutationSchema = z
  .object({
    clientMutationId: z.uuid(),
    expectedRevision: z.number().int().min(0),
    expectedProfileVersion: z.number().int().min(1),
    change: z.discriminatedUnion("operation", [
      z
        .object({
          operation: z.literal("check-in"),
          fatigue: z.number().int().min(1).max(5).nullable(),
          soreness: z.number().int().min(1).max(5).nullable(),
          pain: z.boolean().nullable(),
          notes: z.string().trim().max(1000),
        })
        .strict(),
      z
        .object({ operation: z.literal("generate"), settings: settingsSchema })
        .strict(),
      z
        .object({
          operation: z.literal("pause"),
          effectiveFrom: z.iso.date(),
          effectiveUntil: z.iso.date(),
          reason: z.string().trim().min(1).max(500),
          rulesAcknowledged: z.literal(true),
        })
        .strict(),
      z
        .object({
          operation: z.literal("approve"),
          proposalId: z.uuid(),
          acknowledge: z.literal(true),
        })
        .strict(),
      z
        .object({ operation: z.literal("reject"), proposalId: z.uuid() })
        .strict(),
    ]),
  })
  .strict();
export type ProgramMutationInput = z.infer<typeof programMutationSchema>;
export type ProgramChange = ProgramMutationInput["change"];
