import { createHash } from "node:crypto";
import type { ExerciseDto } from "./types";

export const muscles = [
  { id: "quadriceps", name: "Quadriceps", category: "legs" },
  { id: "glutes", name: "Gluteals", category: "hips" },
  { id: "hamstrings", name: "Hamstrings", category: "legs" },
  { id: "pectorals", name: "Pectorals", category: "chest" },
  { id: "triceps", name: "Triceps", category: "arms" },
  { id: "deltoids", name: "Deltoids", category: "shoulders" },
  { id: "lats", name: "Latissimus dorsi", category: "back" },
  { id: "biceps", name: "Biceps", category: "arms" },
  { id: "abdominals", name: "Abdominals", category: "trunk" },
  { id: "obliques", name: "Obliques", category: "trunk" },
  { id: "calves", name: "Calves", category: "legs" },
];
type Entry = Pick<
  ExerciseDto,
  | "slug"
  | "name"
  | "variantGroup"
  | "pattern"
  | "modality"
  | "resistance"
  | "difficulty"
  | "equipment"
  | "demands"
  | "instructions"
  | "safetyNotes"
> & {
  primary: string[];
  secondary: string[];
  source: string;
  laterality?: string;
  aliases?: string[];
};
const nasm = "https://www.nasm.org/resource-center/exercise-library/";
const treadmill =
  "https://support.lifefitness.com/hc/en-us/articles/42814152246039-Life-Fitness-Atmos-Treadmill-How-to-Use-Your-SL-Console-Guided-Tour";
const squatSteps = [
  "Stand with feet comfortably apart and brace your torso.",
  "Bend hips and knees together, keeping heels grounded and knees aligned with your feet.",
  "Use a controlled, comfortable depth, then press through your feet to stand.",
];
const squatNotes = [
  "Reduce depth if balance or alignment changes. Do not force a particular depth.",
];
const pushSteps = [
  "Support yourself on hands and toes with a steady line through your trunk.",
  "Bend your elbows to lower your chest with control.",
  "Press the floor away without letting your hips sag.",
];
const entries: Entry[] = [
  {
    slug: "bodyweight-squat",
    name: "Bodyweight squat",
    variantGroup: "squat",
    pattern: "squat",
    modality: "bodyweight",
    resistance: "bodyweight",
    difficulty: 1,
    equipment: [],
    demands: ["deep_knee_bend", "unsupported_balance"],
    primary: ["quadriceps", "glutes"],
    secondary: ["abdominals"],
    instructions: squatSteps,
    safetyNotes: squatNotes,
    source:
      "https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/",
  },
  ...(["dumbbell", "kettlebell"] as const).map(
    (e) =>
      ({
        slug: `${e}-goblet-squat`,
        name: `${e === "dumbbell" ? "Dumbbell" : "Kettlebell"} goblet squat`,
        variantGroup: "squat",
        pattern: "squat",
        modality: "resistance",
        resistance: e,
        difficulty: 2,
        equipment: [e],
        demands: [
          "deep_knee_bend",
          "unsupported_balance",
          "external_spinal_load",
        ],
        primary: ["quadriceps", "glutes"],
        secondary: ["abdominals"],
        instructions: [
          "Hold one manageable weight close to your chest with both hands.",
          ...squatSteps.slice(1),
        ],
        safetyNotes: squatNotes,
        source: `${nasm}goblet-squat`,
      }) satisfies Entry,
  ),
  {
    slug: "glute-bridge",
    name: "Glute bridge",
    aliases: ["floor bridge"],
    variantGroup: "hip-extension",
    pattern: "hip_extension",
    modality: "bodyweight",
    resistance: "bodyweight",
    difficulty: 1,
    equipment: [],
    demands: ["floor_transfer"],
    primary: ["glutes"],
    secondary: ["hamstrings", "abdominals"],
    instructions: [
      "Lie on your back with bent knees and feet on the floor.",
      "Brace and lift your hips by pressing through your feet.",
      "Stop before arching your lower back, then lower slowly.",
    ],
    safetyNotes: [
      "Keep head and shoulders supported; avoid pushing through your neck.",
    ],
    source: `${nasm}floor-bridge`,
  },
  {
    slug: "dumbbell-romanian-deadlift",
    name: "Dumbbell Romanian deadlift",
    aliases: ["RDL"],
    variantGroup: "deadlift",
    pattern: "hinge",
    modality: "resistance",
    resistance: "dumbbell",
    difficulty: 2,
    equipment: ["dumbbell"],
    demands: ["external_spinal_load", "unsupported_balance"],
    primary: ["hamstrings", "glutes"],
    secondary: ["abdominals"],
    instructions: [
      "Stand holding dumbbells near your thighs with softly bent knees.",
      "Move your hips backward, keeping the weights near your legs and torso steady.",
      "Stop within your controlled range, then extend your hips to stand.",
    ],
    safetyNotes: [
      "Do not chase floor depth or round your back to lower the weights.",
    ],
    source: `${nasm}dumbbell-romanian-deadlift`,
  },
  {
    slug: "kettlebell-deadlift",
    name: "Kettlebell deadlift",
    variantGroup: "deadlift",
    pattern: "hinge",
    modality: "resistance",
    resistance: "kettlebell",
    difficulty: 2,
    equipment: ["kettlebell"],
    demands: ["external_spinal_load", "unsupported_balance", "deep_knee_bend"],
    primary: ["hamstrings", "glutes"],
    secondary: ["quadriceps", "abdominals"],
    instructions: [
      "Place the kettlebell between your feet and hinge down with bent knees to grip it.",
      "Brace, keep the weight close, and extend hips and knees to stand.",
      "Reverse the motion with control to return the bell to the floor.",
    ],
    safetyNotes: [
      "Use a reachable starting position without rounding your back; this is not a swing.",
    ],
    source: `${nasm}kettlebell-deadlift`,
  },
  {
    slug: "push-up",
    name: "Push-up",
    variantGroup: "horizontal-press",
    pattern: "horizontal_push",
    modality: "bodyweight",
    resistance: "bodyweight",
    difficulty: 2,
    equipment: [],
    demands: ["wrist_extension", "floor_transfer"],
    primary: ["pectorals", "triceps"],
    secondary: ["deltoids", "abdominals"],
    instructions: pushSteps,
    safetyNotes: ["Maintain a steady trunk; stop before your lower back sags."],
    source: `${nasm}push-up`,
  },
  {
    slug: "kneeling-push-up",
    name: "Kneeling push-up",
    aliases: ["modified push-up"],
    variantGroup: "horizontal-press",
    pattern: "horizontal_push",
    modality: "bodyweight",
    resistance: "bodyweight",
    difficulty: 1,
    equipment: [],
    demands: ["kneeling", "wrist_extension", "floor_transfer"],
    primary: ["pectorals", "triceps"],
    secondary: ["deltoids", "abdominals"],
    instructions: [
      "Support yourself on hands and knees, making a steady line from knees through shoulders.",
      ...pushSteps.slice(1),
    ],
    safetyNotes: [
      "Keep pressure on the knees comfortable and avoid folding at the hips.",
    ],
    source: `${nasm}modified-push-up`,
  },
  {
    slug: "incline-push-up",
    name: "Incline push-up on bench",
    variantGroup: "horizontal-press",
    pattern: "horizontal_push",
    modality: "bodyweight",
    resistance: "bodyweight",
    difficulty: 1,
    equipment: ["bench"],
    demands: ["wrist_extension"],
    primary: ["pectorals", "triceps"],
    secondary: ["deltoids", "abdominals"],
    instructions: [
      "Use a stable bench that cannot slide or tip. Place hands on its edge and step back.",
      "Keep your trunk steady while bending elbows to bring your chest toward the bench.",
      "Press back to the starting position with control.",
    ],
    safetyNotes: [
      "Check bench stability before loading it. Never use an unstable household surface.",
    ],
    source: `${nasm}incline-push-up`,
  },
  {
    slug: "single-arm-dumbbell-chest-press",
    name: "Single-arm dumbbell chest press",
    variantGroup: "horizontal-press",
    pattern: "horizontal_push",
    modality: "resistance",
    resistance: "dumbbell",
    laterality: "unilateral",
    difficulty: 3,
    equipment: ["dumbbell", "bench"],
    demands: ["external_spinal_load"],
    primary: ["pectorals", "triceps"],
    secondary: ["deltoids", "abdominals"],
    instructions: [
      "Lie on a stable flat bench with feet planted; hold one manageable dumbbell beside your chest.",
      "Brace against rotation and press the weight upward without twisting.",
      "Lower with control, then repeat on the other side.",
    ],
    safetyNotes: [
      "Use a load you can position and remove safely; obtain in-person assistance if setup is uncertain.",
    ],
    source: `${nasm}single-arm-dumbbell-chest-press`,
  },
  {
    slug: "pull-up",
    name: "Pull-up",
    variantGroup: "vertical-pull",
    pattern: "vertical_pull",
    modality: "bodyweight",
    resistance: "bodyweight",
    difficulty: 3,
    equipment: ["pull_up_bar"],
    demands: ["overhead"],
    primary: ["lats", "biceps"],
    secondary: ["abdominals"],
    instructions: [
      "Grip a securely installed bar with palms facing away and brace your trunk.",
      "Pull upward without swinging, bringing your chin toward bar height.",
      "Lower under control to the starting position.",
    ],
    safetyNotes: [
      "Verify the bar and mounting are rated for your load. Do not jump to an unreachable bar or drop from height.",
    ],
    source: `${nasm}pull-up`,
  },
  {
    slug: "forearm-plank",
    name: "Forearm plank",
    variantGroup: "trunk-brace",
    pattern: "trunk_brace",
    modality: "isometric",
    resistance: "bodyweight",
    difficulty: 1,
    equipment: [],
    demands: ["floor_transfer"],
    primary: ["abdominals"],
    secondary: ["obliques", "deltoids"],
    instructions: [
      "Place forearms and toes on the floor with elbows beneath shoulders.",
      "Brace your trunk and maintain a steady line without dropping your hips.",
      "Breathe normally and end the hold when position starts to change.",
    ],
    safetyNotes: [
      "Do not hold your breath or extend a hold after technique deteriorates.",
    ],
    source: `${nasm}plank`,
  },
  {
    slug: "side-plank",
    name: "Forearm side plank",
    variantGroup: "trunk-brace",
    pattern: "trunk_brace",
    modality: "isometric",
    resistance: "bodyweight",
    laterality: "unilateral",
    difficulty: 2,
    equipment: [],
    demands: ["floor_transfer"],
    primary: ["obliques"],
    secondary: ["abdominals", "deltoids"],
    instructions: [
      "Lie on your side with your lower forearm beneath your shoulder and legs stacked.",
      "Lift hips to make a steady line through your body.",
      "Breathe throughout the hold, lower with control, and repeat on the other side.",
    ],
    safetyNotes: [
      "Avoid collapsing into the supporting shoulder or rotating your trunk.",
    ],
    source: `${nasm}side-plank`,
  },
  {
    slug: "dead-bug",
    name: "Dead bug",
    variantGroup: "trunk-brace",
    pattern: "trunk_brace",
    modality: "bodyweight",
    resistance: "bodyweight",
    difficulty: 1,
    equipment: [],
    demands: ["floor_transfer", "overhead"],
    primary: ["abdominals"],
    secondary: ["obliques"],
    instructions: [
      "Lie on your back with arms raised and hips and knees bent.",
      "Slowly extend one arm and the opposite leg within a range that keeps your trunk steady.",
      "Return, then alternate sides without arching your lower back.",
    ],
    safetyNotes: ["Shorten the reach if you cannot maintain trunk control."],
    source: `${nasm}dead-bug`,
  },
  ...(["walk", "run"] as const).map(
    (mode) =>
      ({
        slug: `treadmill-${mode}`,
        name: `Treadmill ${mode}`,
        variantGroup: "treadmill-locomotion",
        pattern: "locomotion",
        modality: mode === "run" ? "running" : "walking",
        resistance: "treadmill",
        difficulty: mode === "run" ? 2 : 1,
        equipment: ["treadmill"],
        demands:
          mode === "run"
            ? ["impact", "unsupported_balance"]
            : ["unsupported_balance"],
        primary: ["quadriceps", "glutes", "calves"],
        secondary: ["hamstrings"],
        instructions: [
          "Read your treadmill manual, attach the emergency-stop clip, and start from a stationary belt.",
          `Start slowly, then select a manageable ${mode} pace using the console.`,
          "Reduce speed gradually and stop the belt before stepping off.",
        ],
        safetyNotes: [
          "Keep the surrounding space clear. Use handrails for boarding as instructed by the manufacturer; never step onto a fast-moving belt.",
        ],
        source: treadmill,
      }) satisfies Entry,
  ),
];
export function contentHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
// Permanent identity registry: editorial ordering must never change identity or PR lineage.
const identityNumbers: Record<string, number> = {
  "bodyweight-squat": 1,
  "dumbbell-goblet-squat": 2,
  "kettlebell-goblet-squat": 3,
  "glute-bridge": 4,
  "dumbbell-romanian-deadlift": 5,
  "kettlebell-deadlift": 6,
  "push-up": 7,
  "kneeling-push-up": 8,
  "incline-push-up": 9,
  "single-arm-dumbbell-chest-press": 10,
  "pull-up": 11,
  "forearm-plank": 12,
  "side-plank": 13,
  "dead-bug": 14,
  "treadmill-walk": 15,
  "treadmill-run": 16,
};
export const catalogue: ExerciseDto[] = entries.map((entry) => {
  const identityNumber = identityNumbers[entry.slug];
  if (!identityNumber)
    throw new Error(`Assign a permanent exercise identity: ${entry.slug}`);
  const { primary, secondary, source, ...fields } = entry;
  const value = {
    ...fields,
    id: `c0000000-0000-4000-8000-${String(identityNumber).padStart(12, "0")}`,
    versionId: `d0000000-0000-4000-8000-${String(identityNumber).padStart(12, "0")}`,
    version: 1,
    aliases: entry.aliases ?? [],
    laterality: entry.laterality ?? "bilateral",
    metrics:
      entry.modality === "isometric"
        ? ["duration_seconds"]
        : entry.modality === "walking" || entry.modality === "running"
          ? ["duration_seconds", "distance_meters"]
          : entry.modality === "resistance"
            ? ["repetitions", "load_kg"]
            : ["repetitions"],
    muscles: [
      ...primary.map((id) => ({
        id,
        name: muscles.find((m) => m.id === id)?.name ?? id,
        role: "primary" as const,
      })),
      ...secondary.map((id) => ({
        id,
        name: muscles.find((m) => m.id === id)?.name ?? id,
        role: "secondary" as const,
      })),
    ],
    sourceUrls: [source],
    license:
      "Original project text; source material remains with its publisher. No copied media.",
    reviewedBy: "Codex editorial review (not clinical clearance)",
    reviewedAt: "2026-11-05T00:00:00.000Z",
    reviewStatus: "editorial",
  };
  return { ...value, contentHash: contentHash(value) };
});
