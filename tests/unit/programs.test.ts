import { describe, expect, it } from "vitest";
import { catalogue } from "../../src/modules/exercises/catalogue";
import { addDays, localInstant } from "../../src/modules/programs/calendar";
import {
  ensureCalendar,
  generateTraining,
} from "../../src/modules/programs/engine";
import { programRules } from "../../src/modules/programs/rules";
import {
  planningBundle,
  planningNow,
  planningSettings,
  readyCheckIn,
} from "../fixtures/programs";

const generate = (
  bundle = planningBundle(),
  settings = planningSettings,
  checkIn = readyCheckIn,
) =>
  generateTraining(
    bundle,
    settings,
    catalogue,
    checkIn,
    programRules,
    planningNow,
  );
describe("program-v1 independent planning cases", () => {
  it("generates 12 full-body sessions, exact weighted muscle volumes and no invented loads", () => {
    const plan = generate();
    expect(plan.sessions).toHaveLength(12);
    expect(plan.sessions[0].startsAt).toBe("2026-11-09T23:00:00.000Z");
    expect(plan.sessions[0].exercises.map((e) => e.exercise.slug)).toEqual([
      "bodyweight-squat",
      "glute-bridge",
      "kneeling-push-up",
      "supported-dumbbell-row",
      "forearm-plank",
    ]);
    expect(plan.weeklyVolumes[0].glutes).toBe(12);
    expect(plan.weeklyVolumes[0].abdominals).toBe(12);
    expect(plan.sessions[0].estimatedMinutes).toBe(36);
    expect(
      plan.sessions.every((s) =>
        s.exercises.every((e) => e.target.loadKg === null),
      ),
    ).toBe(true);
  });
  it("defaults four days to upper/lower and requires an explicit 5+ day map", () => {
    const bundle = planningBundle();
    if (!bundle.profile) throw new Error();
    bundle.profile.trainingDays = [1, 2, 4, 5];
    expect(
      generate(bundle)
        .sessions.slice(0, 4)
        .map((s) => s.kind),
    ).toEqual(["upper", "lower", "upper", "lower"]);
    bundle.profile.trainingDays = [1, 2, 3, 4, 5];
    expect(() => generate(bundle)).toThrow("individualized");
    bundle.equipment[0].items.push({
      equipmentType: "treadmill",
      minLoadKg: null,
      maxLoadKg: null,
      incrementKg: null,
    });
    const custom = generate(bundle, {
      ...planningSettings,
      split: "custom",
      customDays: [
        { day: 1, type: "upper" },
        { day: 2, type: "lower" },
        { day: 3, type: "conditioning" },
        { day: 4, type: "upper" },
        { day: 5, type: "lower" },
      ],
    });
    expect(custom.sessions).toHaveLength(20);
    expect(custom.sessions[2].exercises[0].exercise.slug).toBe(
      "treadmill-walk",
    );
  });
  it("rejects missing equipment, notes, exclusion gates and incomplete movement coverage", () => {
    const bundle = planningBundle();
    bundle.equipment[0].items = [];
    expect(() => generate(bundle)).toThrow("No eligible horizontal_pull");
    const blocked = planningBundle();
    if (!blocked.profile) throw new Error();
    blocked.profile.limitations = "Private restriction";
    expect(() => generate(blocked)).toThrow("qualified review");
    expect(() =>
      generate(planningBundle(), {
        ...planningSettings,
        split: "custom",
        customDays: [1, 3, 5].map((day) => ({ day, type: "upper" })),
      }),
    ).toThrow("coverage");
  });
  it("refuses excessive volume and time instead of silently shrinking prescriptions", () => {
    expect(() =>
      generate(planningBundle(), { ...planningSettings, workingSets: 3 }),
    ).toThrow("volume");
    expect(() =>
      generate(planningBundle(), { ...planningSettings, weeklyCap: 18 }),
    ).toThrow("experience-level");
    const short = planningBundle();
    if (!short.profile) throw new Error();
    short.profile.durationMinutes = 15;
    expect(() => generate(short)).toThrow("budget");
  });
  it("uses cautious explicit check-ins and never infers readiness from missing or expired fields", () => {
    for (const change of [
      { pain: null },
      { fatigue: null },
      { soreness: null },
      { pain: true },
      { fatigue: 4 },
      { soreness: 5 },
      { createdAt: "2026-11-03T12:00:00Z" },
    ])
      expect(() =>
        generate(planningBundle(), planningSettings, {
          ...readyCheckIn,
          ...change,
        }),
      ).toThrow();
    const reduced = generate(planningBundle(), planningSettings, {
      ...readyCheckIn,
      fatigue: 3,
    });
    expect(reduced.sessions[0].exercises[0].target.workingSets).toBe(1);
    expect(reduced.reasons.join(" ")).toContain("reduces");
  });
  it("enforces recovery across weeks, retained sessions and overlapping instants", () => {
    const adjacent = planningBundle();
    if (!adjacent.profile) throw new Error();
    adjacent.profile.trainingDays = [0, 1];
    expect(() => generate(adjacent)).toThrow("Recovery");
    const session = generate().sessions[0];
    const prior = {
      ...session,
      id: "prior",
      exercises: session.exercises.map((e) => ({
        name: e.exercise.name,
        versionId: e.exercise.versionId,
        muscles: e.exercise.muscles,
      })),
    };
    expect(() => ensureCalendar([session], [prior], programRules)).toThrow(
      "overlap",
    );
  });
  it("handles calendar days without UTC drift and rejects DST gaps and folds", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(
      localInstant("2026-03-07", "18:00", "America/New_York").toISOString(),
    ).toBe("2026-03-07T23:00:00.000Z");
    expect(
      localInstant("2026-03-09", "18:00", "America/New_York").toISOString(),
    ).toBe("2026-03-09T22:00:00.000Z");
    expect(() =>
      localInstant("2026-03-08", "02:30", "America/New_York"),
    ).toThrow("nonexistent");
    expect(() =>
      localInstant("2026-11-01", "01:30", "America/New_York"),
    ).toThrow("ambiguous");
  });
});
