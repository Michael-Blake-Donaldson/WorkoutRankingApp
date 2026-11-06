// Browser-safe choices: keep validation and server dependencies out of client bundles.
export const dayTypes = ["full", "upper", "lower", "conditioning"] as const;
export type DayType = (typeof dayTypes)[number];
export const splitOptions = [
  "default",
  "full",
  "upper_lower",
  "custom",
] as const;
export const programRulesId = "program-v1";
