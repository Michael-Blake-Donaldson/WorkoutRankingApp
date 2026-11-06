import type { ExerciseDto } from "../exercises/types";
import type { DayType } from "./options";
export type Rules = {
  horizonDays: number;
  recoveryHours: number;
  checkInHours: number;
  secondaryWeight: number;
  defaultSets: Record<string, number>;
  weeklyCaps: Record<string, number>;
  goals: Record<
    string,
    { repMin: number; repMax: number; restSeconds: number }
  >;
  rir: number;
  holdMin: number;
  holdMax: number;
  conditioningMinutes: number;
  preparationSeconds: number;
  setupSeconds: number;
  secondsPerRep: number;
};
export type GenerationSettings = {
  effectiveFrom: string;
  localStart: string;
  equipmentProfileId: string;
  split: "default" | "full" | "upper_lower" | "custom";
  customDays: { day: number; type: DayType }[];
  workingSets: number | null;
  weeklyCap: number | null;
  rulesAcknowledged: true;
};
export type Target = {
  workingSets: number;
  repMin: number | null;
  repMax: number | null;
  holdMinSeconds: number | null;
  holdMaxSeconds: number | null;
  durationMinutes: number | null;
  restSeconds: number;
  rir: number | null;
  loadKg: null;
};
export type PlannedExercise = { exercise: ExerciseDto; target: Target };
export type PlannedSession = {
  localDate: string;
  localStart: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  kind: DayType;
  estimatedMinutes: number;
  exercises: PlannedExercise[];
};
export type CheckIn = {
  id: string;
  fatigue: number | null;
  soreness: number | null;
  pain: boolean | null;
  notes: string;
  createdAt: string;
};
export type ScheduleSummary = {
  id: string;
  localDate: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  kind: DayType;
  estimatedMinutes: number;
  exercises: {
    name: string;
    versionId: string;
    muscles: { id: string; role: string }[];
  }[];
};
export type Plan = {
  schemaVersion: 1;
  kind: "training" | "pause";
  effectiveFrom: string;
  effectiveUntil: string;
  timezone: string;
  rulesVersion: string;
  rulesHash: string;
  profileVersion: number;
  checkInId: string | null;
  settings: GenerationSettings | null;
  reason: string | null;
  inputs: Record<string, unknown>;
  sessions: PlannedSession[];
  weeklyVolumes: Record<string, number>[];
  reasons: string[];
  diff: { removed: ScheduleSummary[]; added: PlannedSession[] };
};
export type VersionView = {
  id: string;
  version: number;
  kind: string;
  profileVersion: number;
  baseRevision: number;
  createdAt: string;
  decision: "accepted" | "rejected" | null;
  plan: Plan;
};
export type ProgramBundle = {
  accountId: string;
  revision: number;
  profileVersion: number;
  profile: {
    trainingDays: number[];
    timezone: string;
    durationMinutes: number;
    experience: string;
    primaryGoal: string;
  } | null;
  equipment: { id: string; name: string; isDefault: boolean }[];
  rules: { id: string; hash: string; config: Rules; reviewedBy: string } | null;
  checkIn: CheckIn | null;
  latest: VersionView | null;
  history: {
    id: string;
    version: number;
    kind: string;
    decision: string | null;
    createdAt: string;
  }[];
  schedule: ScheduleSummary[];
  today: string;
};
