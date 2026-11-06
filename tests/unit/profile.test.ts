import { describe, expect, it } from "vitest";
import type { MeasurementDto } from "../../src/modules/profile/contracts";
import {
  basicsSchema,
  mutationSchema,
} from "../../src/modules/profile/contracts";
import { bmi, bmiHistory, fromSi, toSi } from "../../src/modules/profile/units";

const basics = {
  displayName: "Test",
  experience: "beginner",
  primaryGoal: "strength",
  secondaryGoals: [],
  trainingDays: [1, 3, 5],
  durationMinutes: 45,
  timezone: "America/New_York",
  likes: "",
  dislikes: "",
  limitations: "",
  calorieTarget: null,
  proteinTargetG: null,
};
describe("profile validation and body metric arithmetic", () => {
  it("accepts optional private fields without inventing nutrition targets or DOB", () => {
    expect(basicsSchema.parse(basics).calorieTarget).toBeNull();
    expect(
      basicsSchema.safeParse({ ...basics, dateOfBirth: "2000-01-01" }).success,
    ).toBe(false);
  });
  it("rejects empty/duplicate schedules, invalid timezone and repeated goals", () => {
    for (const patch of [
      { trainingDays: [] },
      { trainingDays: [1, 1] },
      { timezone: "not-a-timezone" },
      { secondaryGoals: ["strength"] },
      { calorieTarget: "0" },
      { proteinTargetG: "Infinity" },
    ])
      expect(basicsSchema.safeParse({ ...basics, ...patch }).success).toBe(
        false,
      );
  });
  it("rejects owner injection and malformed mutation identifiers", () => {
    expect(
      mutationSchema.safeParse({
        clientMutationId: "not-a-uuid",
        expectedVersion: 0,
        change: { operation: "save-profile", basics },
      }).success,
    ).toBe(false);
    expect(
      mutationSchema.safeParse({
        clientMutationId: crypto.randomUUID(),
        expectedVersion: 0,
        userId: "someone-else",
        change: { operation: "save-profile", basics },
      }).success,
    ).toBe(false);
  });
  it("uses exact SI conversion factors and consistent display conversion", () => {
    expect(toSi("100", "lb")).toBe("45.359237");
    expect(toSi("70", "in")).toBe("1.778000");
    expect(fromSi("45.359237", "lb")).toBe("100");
    expect(fromSi("1.778", "cm")).toBe("177.8");
  });
  it("calculates BMI without categories or demographic benchmark claims", () => {
    expect(bmi("80", "1.8")).toBe("24.7");
    expect(bmi("80", "0")).toBeNull();
  });
  it("uses chronological height and excludes corrected originals from BMI history", () => {
    const entry = (
      id: string,
      metric: "height" | "weight",
      valueSi: string,
      day: string,
      current = true,
    ): MeasurementDto => ({
      id,
      metric,
      valueSi,
      recordedAt: `2026-01-${day}T00:00:00.000Z`,
      createdAt: `2026-01-${day}T00:00:00.000Z`,
      correctsId: null,
      correctionReason: null,
      current,
    });
    const result = bmiHistory([
      entry("old", "height", "1.5", "01", false),
      entry("early", "weight", "80", "01"),
      entry("height", "height", "1.8", "02"),
      entry("weight", "weight", "80", "03"),
    ]);
    expect(result.map((p) => p.value)).toEqual([null, "24.7"]);
  });
});
