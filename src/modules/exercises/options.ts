// Dependency-free options: validation schemas stay on the server.
export const restrictionOptions = [
  { code: "impact", label: "Avoid impact / running" },
  { code: "overhead", label: "Avoid overhead arm positions" },
  { code: "kneeling", label: "Avoid kneeling" },
  {
    code: "wrist_extension",
    label: "Avoid supporting body weight on extended wrists",
  },
  {
    code: "external_spinal_load",
    label: "Avoid external load supported through the torso",
  },
  { code: "deep_knee_bend", label: "Avoid deep knee bending" },
  {
    code: "floor_transfer",
    label: "Avoid getting down to / up from the floor",
  },
  {
    code: "unsupported_balance",
    label: "Avoid unsupported standing balance demands",
  },
] as const;
export const restrictionCodes = restrictionOptions.map((r) => r.code);
export type Restriction = (typeof restrictionOptions)[number]["code"];
export const patterns = [
  "squat",
  "lunge",
  "hinge",
  "hip_extension",
  "horizontal_push",
  "horizontal_pull",
  "vertical_push",
  "vertical_pull",
  "trunk_brace",
  "locomotion",
] as const;
export const modalities = [
  "resistance",
  "bodyweight",
  "isometric",
  "running",
  "walking",
] as const;
export const preferenceOptions = [
  "neutral",
  "like",
  "dislike",
  "exclude",
] as const;
export type ExercisePreference = (typeof preferenceOptions)[number];
