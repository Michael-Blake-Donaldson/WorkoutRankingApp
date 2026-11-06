# Delivery dependencies and seed strategy

## Numbered changes and gates

| Phase | Deliverable                                                                                                    | Depends on                                 | Exit evidence                                                                                                                    |
| ----- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Inventory, architecture, model, rules, assumptions, tests, seed plan                                           | Full product specification                 | Documentation check and architecture review; no runtime implementation.                                                          |
| 1     | Next.js/TS/Tailwind shell, secure two-account auth, PostgreSQL/Prisma migrations, test runner, installable PWA | Reviewed Phase 0; provider/hosting choices | Real invite/session/authorization tests, clean migration/seed commands, manifest/icons, local setup and iPhone validation steps. |
| 2     | Profiles, measurements, equipment, privacy, onboarding/settings                                                | 1                                          | Owner isolation, units/BMI context, versioning and private defaults.                                                             |
| 3     | Curated taxonomy, instruction library, safety-filtered alternatives                                            | 1; equipment contracts from 2              | Reviewed licensed seed and deterministic eligibility/scoring tests.                                                              |
| 4     | Program proposals, approval/versioning, schedule/check-in                                                      | 2 + 3                                      | Reviewed training config, explicit diffs, immutable history and recovery constraints.                                            |
| 5     | Real recorder, rest timer, IndexedDB, sync/conflicts, substitutions                                            | 1 + 3 + 4                                  | Offline/crash/replay/conflict and real persistence evidence.                                                                     |
| 6     | PR/XP/rating/mastery, weekly evaluation/audits                                                                 | 4 + 5                                      | Reviewed scoring config, ledger uniqueness, deterministic golden and correction tests.                                           |
| 7     | Duels, four-week seasons, challenges, achievements, optional notifications                                     | 2 privacy + 4 commitments + 6              | Shared-zone cutoff, grace, fairness and permission tests.                                                                        |
| 8     | Basic nutrition, insights, export/delete                                                                       | 2; 5–7 for complete export/deletion graph  | Manual calories/protein/targets and trends, privacy, no nutrition penalties, deletion/export verification.                       |
| 9     | Sound/motion/visual polish, full release QA                                                                    | 1–8                                        | Real iPhone, accessibility, performance/security, backup restore and release review.                                             |

Accessibility, authorization, persistence, error handling and testing start in their first applicable phase, not Phase 9. Nutrition/privacy schema boundaries are planned now despite later implementation. Notification infrastructure may be prepared in Phase 1 but permission/delivery UI belongs to Phase 7. Do not represent roadmap items as completed screens.

Each implementing phase includes its relevant migrations, real persistence, server authorization, loading/empty/error states, test evidence and decisions. Phase 0 has no schema/runtime to migrate; document that exception rather than inventing persistence. Review the current phase before advancing. No Phase 1 packages or shell are part of Phase 0.

## Seed strategy

Separate development/test fixtures from production reference data. Phase 1 seeds only required safe reference configuration; never seed default passwords, authenticated users, redeemable public invite tokens, health records or fake awards into production. Invite the two real users through the secure flow. Tests create isolated synthetic accounts; they are fixtures, not a production login bypass.

Phase 3 reference seed uses stable IDs/slugs, schema/library version, source/license attribution and review status. Each exercise needs equipment, muscles, pattern, laterality, modality, difficulty, supported metrics, instructions, safety notes and variant group. Unknown/unsupported entries stay unavailable. Do not claim a comprehensive library from a few examples.

Seed reviewed immutable rule versions before phases that consume them; absent required rules produce explicit unavailability. Upserts may update nonhistoric metadata but never rewrite referenced exercise/rule versions. Seed reruns are idempotent and transactional; validate IDs, references, component ranges and units. Test repeat execution and upgrades. A destructive test reset must explicitly target a disposable database and never run from production seed commands.

Fixtures cover two timezones, DST boundaries, no equipment, mixed units, pauses, missing effort, repeated mutations, stale revisions, privacy grants, historical corrections and numeric thresholds. Golden fixtures include input, expected output, rationale and rules version; they are independently reviewed rather than regenerated from the implementation under test.

## Immediate next phase checklist (after review)

Confirm auth/hosting/dependency versions, establish Git/CI if desired, scaffold app, pin dependencies, provision local PostgreSQL, add initial migrations/seed and real test runner, secure invitation capacity and ownership, create neutral navigation/error states, add manifest/icons and conservative caching, document setup and run meaningful Phase 1 tests. Business engines remain out of scope until their phases.

## Current review gate: Phase 3

Phases 1–3 have implementation and automated evidence; see [the Phase 3 report](PHASE3_REPORT.md). Review the limited catalogue and scoring contract before Phase 4. Phase 4 additionally needs reviewed prescription/volume/recovery configuration and sufficient catalogue coverage for any supported schedule; the generator must report infeasible movement coverage instead of inventing exercises. Broader library publication needs qualified human content review. Phase 5 owns applying a chosen substitution to an immutable workout prescription. No later phase is implicitly authorized by completing this gate.
