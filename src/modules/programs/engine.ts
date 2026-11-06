import { eligibility } from "../exercises/engine";
import type { ExerciseDto, FilterContext } from "../exercises/types";
import type { ProfileBundle } from "../profile/contracts";
import { addDays, localDate, localInstant, weekday } from "./calendar";
import { ProgramError } from "./errors";
import type { DayType } from "./options";
import type {
  CheckIn,
  GenerationSettings,
  PlannedSession,
  Rules,
  ScheduleSummary,
  Target,
} from "./types";

function fail(message: string): never {
  throw new ProgramError(422, message);
}
export function validateRange(
  from: string,
  until: string,
  timezone: string,
  now: Date,
) {
  const today = localDate(now, timezone);
  if (
    from < today ||
    from > addDays(today, 28) ||
    until < from ||
    until > addDays(from, 27)
  )
    fail(
      "Choose an effective date from today through 28 days ahead, and a range of at most 28 days.",
    );
}
export function readiness(checkIn: CheckIn | null, rules: Rules, now: Date) {
  if (
    !checkIn ||
    checkIn.fatigue === null ||
    checkIn.soreness === null ||
    checkIn.pain === null
  )
    fail(
      "Answer fatigue, soreness and pain explicitly in a current check-in before proposing training.",
    );
  const age = now.getTime() - Date.parse(checkIn.createdAt);
  if (age < 0 || age > rules.checkInHours * 3600000)
    fail(
      "Your check-in expired. Save a new check-in before proposing or approving training.",
    );
  if (checkIn.pain || checkIn.fatigue >= 4 || checkIn.soreness >= 4)
    fail(
      "Pain or high fatigue/soreness blocks a training proposal. Consider an explicit pause and qualified guidance; no override is available here.",
    );
  return checkIn.fatigue === 3 || checkIn.soreness === 3;
}
const slots: Record<DayType, string[][]> = {
  full: [
    ["squat", "lunge"],
    ["hinge", "hip_extension"],
    ["horizontal_push", "vertical_push"],
    ["horizontal_pull", "vertical_pull"],
    ["trunk_brace"],
  ],
  upper: [
    ["horizontal_push", "vertical_push"],
    ["horizontal_pull", "vertical_pull"],
  ],
  lower: [["squat", "lunge"], ["hinge", "hip_extension"], ["trunk_brace"]],
  conditioning: [["locomotion"]],
};
function dayMap(
  days: number[],
  settings: GenerationSettings,
): Map<number, DayType> {
  let split = settings.split;
  if (split === "default") {
    if (days.length >= 5)
      fail(
        "Five or more training days need an explicit individualized day-type map.",
      );
    split = days.length === 4 ? "upper_lower" : "full";
  }
  if (split !== "custom" && settings.customDays.length)
    fail("Custom day types require the custom split.");
  if (split === "custom") {
    if (
      settings.customDays.length !== days.length ||
      new Set(settings.customDays.map((d) => d.day)).size !== days.length ||
      settings.customDays.some((d) => !days.includes(d.day))
    )
      fail("Assign exactly one day type to every saved training weekday.");
    return new Map(settings.customDays.map((d) => [d.day, d.type]));
  }
  return new Map(
    [...days]
      .sort((a, b) => a - b)
      .map((day, index) => [
        day,
        split === "full" ? "full" : index % 2 === 0 ? "upper" : "lower",
      ]),
  );
}
export function ensureCalendar(
  sessions: PlannedSession[],
  retained: ScheduleSummary[],
  rules: Rules,
) {
  const all = [
    ...retained.map((s) => ({
      ...s,
      primary:
        s.kind === "conditioning"
          ? []
          : s.exercises.flatMap((e) =>
              e.muscles.filter((m) => m.role === "primary").map((m) => m.id),
            ),
    })),
    ...sessions.map((s) => ({
      ...s,
      primary:
        s.kind === "conditioning"
          ? []
          : s.exercises.flatMap((e) =>
              e.exercise.muscles
                .filter((m) => m.role === "primary")
                .map((m) => m.id),
            ),
    })),
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  for (let index = 0; index < all.length; index++) {
    const current = all[index];
    for (const prior of all.slice(0, index)) {
      if (Date.parse(prior.endsAt) > Date.parse(current.startsAt))
        fail(
          `Schedule overlap between ${prior.localDate} and ${current.localDate}. Choose a different start time or effective date.`,
        );
      const elapsed = Date.parse(current.startsAt) - Date.parse(prior.startsAt);
      if (
        elapsed < rules.recoveryHours * 3600000 &&
        current.primary.some((id) => prior.primary.includes(id))
      )
        fail(
          `Recovery is below ${rules.recoveryHours} elapsed hours between ${prior.localDate} and ${current.localDate}. Adjust weekdays, split or effective date.`,
        );
    }
  }
}
export function generateTraining(
  bundle: ProfileBundle,
  settings: GenerationSettings,
  library: ExerciseDto[],
  checkIn: CheckIn | null,
  rules: Rules,
  now: Date,
) {
  const profile = bundle.profile;
  if (!profile) fail("Save your training profile first.");
  validateRange(
    settings.effectiveFrom,
    addDays(settings.effectiveFrom, rules.horizonDays - 1),
    profile.timezone,
    now,
  );
  const reduced = readiness(checkIn, rules, now);
  const environment = bundle.equipment.find(
    (e) => e.id === settings.equipmentProfileId,
  );
  if (!environment)
    throw new ProgramError(404, "Equipment location not found.");
  const context: FilterContext = {
    equipment: environment.items.map((i) => i.equipmentType),
    restrictions: bundle.exercisePreferences.restrictions,
    reviewed: bundle.exercisePreferences.reviewed,
    unresolvedNotes: !!profile.limitations.trim(),
    experience:
      profile.experience === "beginner"
        ? 1
        : profile.experience === "intermediate"
          ? 2
          : 3,
    choices: bundle.exercisePreferences.choices,
  };
  if (!context.reviewed || context.unresolvedNotes)
    fail(
      "Review movement filters and obtain qualified review of any limitation notes before proposing training. Do not remove relevant notes to bypass this gate.",
    );
  const cap = settings.weeklyCap ?? rules.weeklyCaps[profile.experience];
  if (cap > rules.weeklyCaps[profile.experience])
    fail(
      "The requested muscle-volume ceiling exceeds your experience-level planning cap.",
    );
  const baseSets =
    settings.workingSets ?? rules.defaultSets[profile.experience];
  const workingSets = reduced ? Math.max(1, baseSets - 1) : baseSets;
  const goal = rules.goals[profile.primaryGoal];
  if (!goal || !cap || !workingSets)
    fail("Required reviewed planning configuration is unavailable.");
  const days = dayMap(profile.trainingDays, settings);
  const sessions: PlannedSession[] = [];
  const volumes: Record<string, number>[] = Array.from(
    { length: 4 },
    () => ({}),
  );
  const covered = Array.from({ length: 4 }, () => new Set<string>());
  const reasons = [
    "Every movement passed saved equipment and limitation filters. Initial load is unspecified; no performance or 1RM was inferred.",
    "Sets, effort and recovery limits are editorial planning guardrails, not clinical clearance.",
  ];
  if (reduced)
    reasons.push(
      "Moderate fatigue/soreness reduces the proposed working sets by one (minimum one). Your approved program changes only if you accept this proposal.",
    );
  if (profile.trainingDays.length === 1)
    reasons.push(
      "One training day follows your availability and is below the commonly recommended twice-weekly resistance-training frequency.",
    );
  for (let offset = 0; offset < rules.horizonDays; offset++) {
    const date = addDays(settings.effectiveFrom, offset),
      kind = days.get(weekday(date));
    if (!kind) continue;
    let start: Date;
    try {
      start = localInstant(date, settings.localStart, profile.timezone);
    } catch (error) {
      fail(
        error instanceof Error ? error.message : "Invalid local start time.",
      );
    }
    if (start.getTime() <= now.getTime())
      fail(
        "A proposed session has already started by the server clock. Choose a later effective date or time.",
      );
    let seconds = rules.preparationSeconds;
    const exercises = slots[kind].map((patterns) => {
      const choices = library.filter(
        (e) =>
          patterns.includes(e.pattern) &&
          eligibility(e, context).eligible &&
          e.difficulty <= Math.min(3, context.experience + 1) &&
          (kind !== "conditioning" || e.modality === "walking"),
      );
      choices.sort((a, b) => {
        const preference = (e: ExerciseDto) =>
          context.choices[e.id] === "like"
            ? 2
            : context.choices[e.id] === "dislike"
              ? 0
              : 1;
        return (
          preference(b) - preference(a) ||
          a.difficulty - b.difficulty ||
          patterns.indexOf(a.pattern) - patterns.indexOf(b.pattern) ||
          a.id.localeCompare(b.id)
        );
      });
      const exercise = choices[0];
      if (!exercise)
        fail(
          `No eligible ${patterns.join(" / ")} movement for ${kind} sessions at ${environment.name}. Review equipment, exclusions or the split; no movement was invented.`,
        );
      const hold = exercise.modality === "isometric",
        conditioning = kind === "conditioning";
      const target: Target = {
        workingSets: conditioning ? 1 : workingSets,
        repMin: hold || conditioning ? null : goal.repMin,
        repMax: hold || conditioning ? null : goal.repMax,
        holdMinSeconds: hold ? rules.holdMin : null,
        holdMaxSeconds: hold ? rules.holdMax : null,
        durationMinutes: conditioning ? rules.conditioningMinutes : null,
        restSeconds: conditioning ? 0 : goal.restSeconds,
        rir: conditioning ? null : rules.rir,
        loadKg: null,
      };
      seconds +=
        rules.setupSeconds +
        (conditioning
          ? rules.conditioningMinutes * 60
          : workingSets *
              (hold ? rules.holdMax : goal.repMax * rules.secondsPerRep) *
              (exercise.laterality === "unilateral" ? 2 : 1) +
            (workingSets - 1) * goal.restSeconds);
      const week = Math.floor(offset / 7);
      if (!conditioning) {
        covered[week].add(
          patterns === slots[kind][0] &&
            ["squat", "lunge"].includes(exercise.pattern)
            ? "knee"
            : exercise.pattern,
        );
        for (const muscle of exercise.muscles)
          volumes[week][muscle.id] =
            (volumes[week][muscle.id] ?? 0) +
            workingSets *
              (muscle.role === "primary" ? 1 : rules.secondaryWeight);
      }
      return { exercise, target };
    });
    const estimatedMinutes = Math.ceil(seconds / 60);
    if (estimatedMinutes > profile.durationMinutes)
      fail(
        `${kind} session needs about ${estimatedMinutes} minutes, above your ${profile.durationMinutes}-minute budget. Reduce working sets or review availability.`,
      );
    sessions.push({
      localDate: date,
      localStart: settings.localStart,
      timezone: profile.timezone,
      startsAt: start.toISOString(),
      endsAt: new Date(
        start.getTime() + estimatedMinutes * 60000,
      ).toISOString(),
      kind,
      estimatedMinutes,
      exercises,
    });
  }
  for (const [week, volume] of volumes.entries()) {
    const patterns = covered[week];
    if (
      !patterns.has("knee") ||
      !["hinge", "hip_extension"].some((p) => patterns.has(p)) ||
      !["horizontal_push", "vertical_push"].some((p) => patterns.has(p)) ||
      !["horizontal_pull", "vertical_pull"].some((p) => patterns.has(p)) ||
      !patterns.has("trunk_brace")
    )
      fail(
        `Week ${week + 1} lacks knee, hip, push, pull or trunk coverage. Review the individualized split.`,
      );
    for (const [muscle, sets] of Object.entries(volume))
      if (sets > cap)
        fail(
          `Week ${week + 1} ${muscle} volume ${sets} exceeds your ${cap}-set accounting ceiling. Reduce sets or frequency.`,
        );
  }
  ensureCalendar(sessions, [], rules);
  return { sessions, weeklyVolumes: volumes, reasons };
}
