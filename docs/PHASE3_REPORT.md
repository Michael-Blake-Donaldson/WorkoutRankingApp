# Phase 3 implementation report

## Completed scope

Implemented the Phase 3 taxonomy, real 16-entry curated reference library, instruction/detail pages, private movement restrictions and exercise choices, and deterministic safety-filtered alternatives. Catalogue records have permanent identities, immutable content versions, muscle/equipment joins, metrics, movement demands, original instructions, publisher attribution and explicit editorial provenance. Browsing supports search, equipment, pattern and modality filters with empty states.

Comparisons derive equipment, experience and restrictions from the signed-in account; exact-origin/account-intent checks, bounded strict JSON, rate limits and no-store responses protect the endpoint. Equipment requirements are conjunctive. Explicit exclusions override soft preferences; unreviewed filters and unresolved private limitation notes block personalized output. Results show component scores, changed loading/metrics/pattern/difficulty and truthful no-match states. They do not apply a substitution or promise equivalent stimulus. Profile configuration is versioned with mutation receipts and immutable snapshots; repeatable-read snapshots prevent mixed inventory/filter reads. New private tables enforce owner RLS. Production runtime credentials cannot write the reference catalogue.

Hybrid RPG/serious tracking, guided adaptation approval, competitive head-to-head and basic nutrition remain unchanged product decisions. Visual identity remains undecided; the existing neutral, accessible baseline is retained. Programs, recorder, PRs, ratings, duels and nutrition logging were not built or represented by mock features.

## Verification

- `npm run check`: lint, TypeScript, 51 Vitest tests across seven files and production build passed.
- `npm run test:e2e`: 16 tests passed across Chromium and iPhone-emulated WebKit, including the four new Phase 3 scenarios.
- `npm audit --audit-level=moderate`: zero reported vulnerabilities at verification time; no dependencies were added.
- Eight total migrations; the two Phase 3 migrations applied to application, integration and browser databases. Existing applied migrations were not edited. Seed reruns and a real version-upgrade/conflict scenario passed; immutable old content remained unchanged.
- Real PostgreSQL, restricted runtime role, Better Auth and local TLS SMTP back the integration/browser flows. Network interception deliberately tests failed requests, not simulated successful production functionality.
- 320px overflow and axe checks passed on exercise details. Reviewed the WebKit detail screenshot; instructions, metadata and controls fit the mobile width. Native ordered-list numbering was restored explicitly after Tailwind reset review.
- `./scripts/check-phase0.ps1`: passed 17 required documents and 42 local links; original product-specification fingerprint preserved.

## Problems found and resolved

- Two initial TypeScript issues in an equipment-type import and a readonly test fixture were corrected; strict lint/type checks pass.
- The new browser fixture omitted a required training day. The real server rejected it, and the fixture now supplies an explicit day without bypassing validation.
- An unscoped browser alert selector also matched Next.js's screen-reader route announcer. Comparison assertions now target the main landmark.
- WebKit's screenshot helper injects a non-nonced `body {}` stylesheet for animation synchronization. Trace evidence and installed Playwright implementation identify this test-only CSP report. All product-flow CSP assertions run before screenshot capture; application CSP was not weakened.
- Database review caught PostgreSQL CHECK's nullable-array behavior. A forward migration requires actual metadata collections and validates metric/identity metadata. Permanent IDs now come from an explicit registry independent of list ordering, and database guards reject identity changes.
- Concurrent-read review found that inventory and restrictions could otherwise be read from different committed revisions. Profile bundle reads now use repeatable-read snapshots. The comparison client receives only revision/account/equipment display configuration, not measurements or limitation text.

- Final interface review caught potential stale comparisons during environment changes or navigation. The equipment selector is disabled during requests, and exercise/revision keys reset comparison state on navigation. A browser regression verifies old scores disappear. Snapshot capture now waits for rendered headings instead of assuming a streamed navigation has finished.

## Assumptions and limits

See [the exact contract](PHASE3_EXERCISES.md). Editorial provenance is not qualified trainer/clinical approval. No copied media or publisher prose is distributed. A human exercise-content/suitability review remains necessary before broader publication. Library coverage is intentionally limited, with no reviewed horizontal row, vertical press, lunge, machine/cable or outdoor route. No-match is a supported outcome. Difficulty is editorial, scores express ranking only, and available load ranges do not prescribe training load. Private limitation notes are not parsed or clinically cleared by software.

Desktop WebKit is not physical iPhone validation. Hosted configuration, real mail delivery, assistive-technology review, physical Home Screen testing and backup/restore remain release work from earlier phases. No production deployment was performed.

## Repository submissions and phase boundary

- `3f37925` — `feat: add versioned exercise library and private alternative rules`
- `fc6d674` — `fix: protect exercise identities and consistent private configuration`
- Interface/verification batch — `feat: deliver accessible exercise browsing and filtered comparisons`

These coherent batches were committed and pushed to origin/main after their applicable checks. The backend integrity batch passed [hosted CI](https://github.com/Michael-Blake-Donaldson/WorkoutRankingApp/actions/runs/42141985812); the final interface submission triggers the same complete workflow, visible in [repository Actions](https://github.com/Michael-Blake-Donaldson/WorkoutRankingApp/actions). No secrets, local keys, traces, synthetic accounts or health records are committed.

Stop here for Phase 3 review. Phase 4 requires reviewed prescription/recovery configuration, adequate movement coverage for each supported schedule, proposal diffs and explicit approval/versioning. It must fail clearly when constraints are infeasible. Applying substitutions to a workout remains Phase 5.
