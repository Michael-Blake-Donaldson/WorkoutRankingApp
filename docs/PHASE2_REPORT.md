# Phase 2 report — 2026-11-05

## Completed work

Implemented resumable three-step onboarding, editable training goals/experience/weekday availability/timezone, optional private restrictions and preferences, and manual optional calorie/protein targets. No date of birth is collected. Profile edits create new private revisions; they cannot activate or change a training program.

Added named equipment locations, a no-equipment environment, optional load ranges/increments, default selection and archival. Added timestamped SI body measurements, linked corrections with reasons, display-unit conversion and chronological BMI history with a prior-height baseline. History supports owner-checked cursor pagination. Added private-by-default competition summary consent and saved audio/haptic/motion preferences; reduced motion is applied now, while alerts and competition remain future work.

Database migrations add six private tables with ownership foreign keys, forced row-level security, immutable history guards, partial default uniqueness and restricted runtime grants. The API validates the real session, origin, body/schema, owner intent, revision and mutation ID. Client code is split into focused form components and never caches health data in browser storage or service-worker caches.

## Verification

Local verification completed successfully:

| Check                                        | Observed result                                                                                                                                                                                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recommended lint rules, warnings as errors   | Passed.                                                                                                                                                                                                                                                                       |
| Strict TypeScript plus generated route types | Passed.                                                                                                                                                                                                                                                                       |
| Vitest                                       | 38 passed across five files; zero failed/skipped.                                                                                                                                                                                                                             |
| Production build                             | Next.js Turbopack build passed.                                                                                                                                                                                                                                               |
| Playwright                                   | 12 passed across Chromium and WebKit; zero failed/skipped. Includes original auth/PWA coverage and new onboarding, persistence, corrections, units, settings, equipment, accessibility, 320px layout, pre-hydration controls, conflict and dropped-acknowledgement scenarios. |
| Dependency audit                             | Zero known vulnerabilities at verification time; not a security certification.                                                                                                                                                                                                |
| Database                                     | Six migrations applied; the three new migrations were applied to the application and both isolated test databases. Explicit runtime grants were refreshed.                                                                                                                    |
| Visual inspection                            | Reviewed the 320px Chromium Progress screenshot. The layout stays within the viewport; the full measurement table scrolls horizontally.                                                                                                                                       |
| Source specification                         | Original SHA-256 fingerprint preserved and checked.                                                                                                                                                                                                                           |

Commands remain in [local setup](LOCAL_SETUP.md); exact rules and bounds are in [data contract](PHASE2_DATA_CONTRACT.md). Real PostgreSQL, Better Auth and local SMTP are used rather than mocked feature services. Network recovery tests deliberately drop a response after a real commit, with interception confirmed. Repository CI runs are linked below for their current results.

## Problems found and resolved

- Docker was stopped; started it and verified local database/mail health before migrations. Prisma's migration-directory diff required a shadow database, so generated the additive migration against the committed prior schema instead. Existing migrations were never edited after application; follow-up SQL fixes use forward migrations.
- Database review caught nullable scalar-list columns and SQL NULL behavior in the correction-reason check; follow-up constraints now require explicit collections and nonempty correction reasons.
- Browser testing caught the validation-library dynamic-code probe in the client bundle. Moved UI choices into a dependency-free module; strict script CSP remains intact.
- WebKit rejected inline style attributes used by Next.js's screen-reader route announcer. Verified the bundled framework implementation and added a scoped style-attribute allowance while retaining stylesheet nonces and script restrictions.
- Initial forms could submit native GET requests before hydration. All health forms now declare POST, and submission controls remain disabled until hydration. No private form data belongs in URLs. Added a JavaScript-disabled regression check.
- An unnecessary refresh after each save could race navigation. Successful writes now update the current client state directly; stale server versions still produce explicit conflicts. Other form drafts remain intact when a separate form is saved.
- Lost-acknowledgement testing found that an automatic measurement timestamp must be retained with the retry key. Unchanged retries now preserve both identifiers and timestamp, preventing duplicate or conflicting replay.
- Added an account-intent guard so an old tab cannot save its private draft into an account subsequently signed in through another tab. This guard does not grant cross-account access.
- Small-screen native inputs initially expanded the grid beyond 320px. Constrained grid columns and field minimum widths; measurement tables remain horizontally scrollable and keyboard focusable with an explicit accessibility exception to the generic tabindex lint rule.

## Repository submissions

- `e3a2f92` — `feat(profile): add private versioned profile and measurement data model`
- `0907dc8` — `feat(profile): enforce owner-scoped profile mutations and corrections`
- `f5f4be7` — `feat(profile): deliver resumable onboarding and private settings`

All three feature batches were pushed to `origin/main`. The data-model and API batches passed GitHub CI before the UI submission. The complete UI batch is tracked in [its GitHub verification run](https://github.com/Michael-Blake-Donaldson/WorkoutRankingApp/actions/runs/42137887907); subsequent documentation checks are available in [repository Actions](https://github.com/Michael-Blake-Donaldson/WorkoutRankingApp/actions). No secrets, local keys, browser traces or synthetic health records are committed. Generated `next-env.d.ts` is now ignored and regenerated by Next.js rather than changing in source control between dev and production commands.

## Remaining work

Stop at the Phase 2 boundary. Phase 3 exercise taxonomy, curated library, instructions and safety-filtered substitutions are not implemented. Guided program changes, workout recording, ranks, head-to-head competition and nutrition entries remain in their assigned phases. The hybrid experience, explicit adaptation approval, competition and basic nutrition decisions remain intact. Visual identity remains undecided.

The new forms still need real iPhone/Home Screen and manual assistive-technology checks. Hosted service configuration, real SMTP delivery, production database backup/restore and deployment review remain separate release work. Desktop WebKit is not a physical iPhone test.
