# Database specification

Proposed PostgreSQL/Prisma model, not executable migrations. UUID identifiers are server validated, including client-created offline entity IDs. All instants use UTC `timestamptz`; calendar dates use `date` plus stored IANA timezone. Use explicit decimal precision and bounds, never floating-point storage for SI measurements or scoring inputs. Proposed scales: weight/height/distance numeric(12,3), calories/protein numeric(12,2), effort numeric(4,1); confirm range/rounding fixtures before migration. Display conversions never rewrite stored SI values.

## Minimum entities and relations

Every table below carries the columns required by the primary specification; this document specifies relationships and extensions rather than removing those columns. Tables with personal data require ownership checks through their parent even when `user_id` is absent.

| Domain      | Tables and ownership/relations                                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity    | `users`; `invitations` with unique token hash, expiry/redemption; auth `accounts` and auth `sessions` linked to users. Reserve capacity atomically for exactly two accounts.                                                           |
| Profile     | `fitness_profiles` belongs to user, versioned goal/experience/timezone; `body_measurements` append timestamped SI entries; `equipment_profiles` -> `equipment_items`. Unique one default equipment profile per user via partial index. |
| Exercise    | `exercises` stable identity; `exercise_muscles` -> `muscles`; `exercise_equipment`; `exercise_substitutions` source/target exercise with score metadata/explanation. Library is shared read-only for normal users.                     |
| Program     | `program_versions` -> `program_sessions` -> `prescribed_exercises`; each belongs transitively to one user. Approval, rules version and input snapshot identify exact prescription.                                                     |
| Workout     | `workout_sessions` -> `workout_exercises` -> `workout_sets`; optional program session relation; exercise and prescription provenance retained. Session and set revision and mutation IDs support synchronization.                      |
| Progression | `personal_records` -> exercise/source set; `xp_events`, `rank_events`, `rank_snapshots` -> user and source event/formula. Corrections retain original event identity.                                                                  |
| Competition | `challenges` -> two distinct users; `challenge_results` -> challenge/user with breakdown and finalization. `achievements` -> `user_achievements` -> user/source event.                                                                 |
| Nutrition   | `nutrition_entries` -> user, portion, calories/protein and recorded instant. Targets are versioned by effective date. Never referenced as competition evidence.                                                                        |
| Delivery    | `push_subscriptions` and `notification_preferences` -> user; encrypted subscription plus endpoint hash; subscriptions are never opponent-visible.                                                                                      |
| Reliability | `sync_mutations` -> user, mutation ID/payload hash/result; `audit_events` -> actor/affected entity with private fields redacted.                                                                                                       |

## Required extensions to the minimum schema

- `exercise_versions` or equivalent immutable content revisions; prescriptions record exercise/rules versions so editing library text does not rewrite history.
- Profile fields/relations for goals, availability, preferences, optional limitations and unit preferences; `nutrition_targets` with effective dates. Avoid stuffing core searchable relations into JSON.
- `program_proposals` includes base revision, explicit diff, explanations, pending/accepted/rejected/stale status, author and decision instant. Store workout prescription snapshots independently of mutable future scheduling.
- `schedule_adjustments` for pause/recovery/availability with effective dates, reason visibility, approvals and supersession; `weekly_commitments` captures frozen eligible sessions and personalized goals.
- `leagues`, `league_members`, `seasons`, `duel_weeks`, `duel_scores` contain shared timezone, local boundaries, UTC cutoffs, grace deadline, versioned rules, input watermark and provisional/final status. Unique member/period scores. `disputes` and `competition_corrections` retain decision provenance.
- `sharing_grants` names precise scopes, grant/revoke timestamps and recipient; `rule_versions` stores immutable validated rule configuration/hash. `quest_assignments` and `milestone_definitions` specify criteria, caps, effective period and approvals.
- `sync_mutations` adds entity/base revision, response/result revision and acknowledgement; `outbox_events` supports transactional notification/job dispatch; unique `job_runs` period/formula identity prevents double evaluation.
- Corrections use `supersedes_id`/`corrects_event_id`, actor, reason and timestamp; measurements and set history preserve revisions rather than destructive overwrites. PR status distinguishes current valid best from retained historical achievement.

## Constraints and indexes

Foreign keys on every relation; explicit delete behavior, never blanket cascades into shared competition history. Unique `(user_id, client_mutation_id)` on sync receipts; session/set mutation uniqueness scoped to owner; unique `(user_id, source_event_id, event_type)` on XP. Rank award identity includes user/source/category/formula and period where applicable. One finalized snapshot per user/category/period/version; corrections append a new revision linked to the original rather than overwrite it.

Add owner/time compound indexes for measurements, nutrition, sessions, events and exports; index foreign keys and job pending status. Unique program version per user, set/exercise ordinals per parent, challenge participant result, user/achievement/source and source record identity. Validate same-owner parent references in transactional services (and composite ownership foreign keys where feasible); UUID knowledge grants no access.

Check nonnegative weight/reps/distance/duration/intake, positive height, bounded RPE 1–10 and RIR 0–10 when supplied, valid enum statuses and modality-appropriate metrics. Null means unknown, never zero effort. Validate RPE/RIR consistency if both given. At most one active workout per user via partial unique index; enforce no overlapping planned sessions transactionally. JSON only for versioned target/rule snapshots, extensible equipment config and immutable breakdowns; validate schemas before persistence.

## Transaction boundaries

1. Invite redemption locks capacity, validates unused unexpired token, creates user and marks invite used atomically.
2. Program acceptance compares base revision, records approval, creates immutable version and replaces affected future prescriptions atomically; active/historic sessions stay frozen.
3. Sync verifies actor and ownership, reserves mutation ID/hash, checks expected revision, applies write and persists response together. Same ID/same hash returns prior result; same ID/different hash is rejected. A stale revision returns conflict with authorized current state; no partial write or acknowledgement.
4. Completion validates logs and state then commits completion, source event, PR evaluation and eligible XP/rank events in one transaction. Lock session to prevent concurrent completion. Weekly snapshots are evaluated separately after cutoff, not guessed at completion.
5. Historical correction stores reason and revision, rebuilds affected valid PRs, appends audited correction events and queues affected weekly recalculation. Finalized weekly data remains immutable; corrected presentation references a distinct correction revision.
6. Account deletion immediately revokes sessions/sharing/push, then purges personal profile, measurements, nutrition, logs, pending server data and exports. Shared score history is deleted or irreversibly anonymized under reviewed retention policy, without health evidence. Audit details must not retain identifiable health content. Backup expiry and restoration suppression need a documented Phase 8 policy.

## Migration and seed policy

Phase 1 introduces minimal auth/core schema and migration tooling. Each later phase adds reviewed migrations for its own entities; do not migrate the entire future model prematurely. Run empty-database and upgrade-path tests against real PostgreSQL, verify constraints/rollback or forward-recovery, back up before destructive changes. See seed strategy in [delivery plan](PHASE_PLAN.md).

## Phase 3 implementation mapping

Muscle, Exercise, immutable ExerciseVersion, ExerciseMuscle and ExerciseEquipment now back the curated library. Identity and variant group remain separate from content versions. UserExerciseRestriction and UserExerciseChoice are private FORCE RLS tables; FitnessProfile.movementFiltersReviewed defaults false. The existing profile aggregate versions preferences together with inventory and records them in immutable revision snapshots. Snapshot reads use repeatable-read transactions to prevent mixed configuration during concurrent saves. See [the Phase 3 contract](PHASE3_EXERCISES.md) for publication, ownership and scoring semantics. No program/session/PR tables are introduced in this phase.
