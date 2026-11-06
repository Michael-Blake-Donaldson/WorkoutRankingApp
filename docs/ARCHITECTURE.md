# Architecture

## Repository inspection — 2026-11-01

Initial repository inventory: one file, `fitness_rpg_product_spec_v1.md` (16,932 bytes). No source, manifests, lockfiles, installed project dependencies, tests, database, migrations, assets, CI, deployment configuration or Git metadata were present. No applicable ancestor or repository AGENTS.md was found. PowerShell and Python 3.12.4 are available locally; neither is a selected application dependency. Existing product specification remains unchanged.

## Product boundaries

Keep four first-class capabilities: serious workout tracking plus RPG progression; proposals with reasons and explicit approval for adaptation; competitive head-to-head duels/seasons/challenges; private basic calorie/protein tracking. Navigation: Home, Train, Ranks, Progress, Profile. Supporting routes cover invitation/authentication, offline status/conflicts, settings, errors and permissions.

Visual identity is an open decision. Use semantic HTML, neutral design tokens, readable contrast, visible focus, keyboard and screen-reader operation, reduced motion and at least 44px targets from 320px wide. Do not select a fantasy theme, mascot, typography system, illustration style, or sound identity now. Serious training and game progression must both remain legible.

## ADR-001: modular monolith and proposed dependencies

Adopt the specification's Next.js + TypeScript + Tailwind shell with PostgreSQL and Prisma in Phase 1. Use a single deployable web application and a separately invoked job entry point sharing domain/services code. This minimizes operational burden for two accounts while retaining domain boundaries. No microservices or native apps initially.

Proposed tooling: maintained server-side authentication library supporting passwordless email invitations; runtime schema validation; IndexedDB wrapper; Vitest for pure rules, real PostgreSQL integration tests, Playwright and accessibility checks for browser flows. Exact packages, supported versions, lockfile, license/security review and hosting are Phase 1 decisions, not installed dependencies. Avoid custom authentication cryptography. Do not cache authentication responses or private API responses in service-worker caches.

## Intended organization (create as implemented)

```text
src/app/                    routes, layouts, HTTP adapters
src/components/ui/          accessible primitives and neutral tokens
src/modules/auth/           invitations, sessions, authorization
src/modules/profile/        measurements, equipment, privacy
src/modules/exercises/      taxonomy, eligibility, substitutions
src/modules/programs/       generation, proposals, scheduling
src/modules/workouts/       recorder, snapshots, completion
src/modules/progression/    PR, XP, rating, mastery
src/modules/competition/    league calendar, duels, seasons, challenges
src/modules/nutrition/      manual intake, optional targets, trends
src/modules/sync/           mutation envelope, replay, conflict handling
src/server/                 database, transactions, jobs, telemetry
src/client/                 IndexedDB, sync transport, feature detection
src/shared/                 units, time, identifiers, validated contracts
prisma/                     schema, reviewed migrations, seed entry points
tests/{unit,integration,e2e,fixtures}/
docs/                       architecture, rules, decisions, acceptance
Documentation/              original product authority
```

Each module owns domain types, validation, services and persistence adapters. Domain rules are deterministic functions with injected clock/rules; they do not import Next.js, browser APIs or database clients. Routes call application services; clients never call persistence directly. Share types/contracts, not database handles. Prevent server-only dependencies entering browser bundles. Add modules only when their phase starts; empty directories do not represent delivery.

## Data and execution paths

Online: authenticated request -> input validation -> ownership/permission check -> application transaction -> PostgreSQL -> privacy-filtered response. Mutation endpoints never accept authoritative XP/rating/PR deltas from clients.

Workout: UI action -> atomic IndexedDB local write plus queued mutation -> immediate saved/pending feedback -> authenticated sync -> compare revision -> database commit plus mutation receipt -> acknowledgement -> clear pending flag. Local saving and server saving are distinct visible states. Offline access follows prior authentication and device trust; never bypass server authorization on reconnect.

Weekly evaluator: scheduled job -> durable unique job/period claim -> stable input cutoff -> rule-versioned computation -> transactional events and immutable snapshots. Retry safely. Use a transactional outbox for later notification delivery; external push/email never occurs inside a database transaction. Monitoring reports failed jobs and stale pending work without health data.

## Security and operations

Exactly two redeemed accounts: invitation redemption and capacity enforcement occur under a database lock/serializable transaction, including simultaneous redemptions. Hash expiring single-use invitation tokens; keep auth cookies secure, HttpOnly and appropriately SameSite; validate origin/CSRF for cookie-authenticated mutations. Rate-limit invitations, authentication and writes. All reads, writes, exports and jobs enforce owner or explicit sharing scope. Use HTTPS, environment secrets and least-privilege database credentials; prohibit health data/tokens in logs.

Default opponent projection includes only approved competition score/breakdown and display identity. Measurements, raw PRs, nutrition, restrictions, pain and notes remain private unless a specific supported sharing permission allows disclosure. Revoking a grant stops future reads; published score-only snapshots retain their audit meaning.

Cache public shell/static assets only. Partition IndexedDB by account, clear private caches on explicit confirmed deletion, and warn before logout if pending writes exist. Do not auto-upload another account's queue. Browser storage eviction cannot be ruled out: expose pending state, persist storage when supported, and document recovery limits.

Backups, restore rehearsal, account export/deletion, privacy-safe error monitoring, TLS, deployment rollback and migration rehearsal are release gates. Device testing is required for iPhone installation/offline/permissions; background notifications are best effort. Phase 1 must choose a host supporting PostgreSQL, HTTPS and scheduled jobs without claiming those services are already provisioned.

## Phase 1 implementation update — 2026-11-01

User authorized Phase 1 after the architecture review boundary. The original specification is now at `docs/fitness_rpg_product_spec_v1.md`; its original SHA-256 remains unchanged. Implemented only auth, infrastructure and navigation modules. App Router uses a protected workspace layout plus session validation in each private page; server routes validate identity independently.

Selected Next.js 16.4.3, React 19.3.1, TypeScript 6.0.3, Tailwind 4.3.3, Prisma 7.10.1 and Better Auth 1.7.15 with passwordless magic links. PostgreSQL 17 and Mailpit test services are containerized. Exact tool versions are pinned in package.json/lockfile. Biome replaces the proposed ESLint toolchain because its resolved dependency chain had moderate advisories; lint, accessibility rules and strict type checking remain enabled. Vitest and Playwright exercise actual PostgreSQL and SMTP.

Runtime and migration/operator credentials are separate. Production authorization reads reject elevated database credentials. The service worker caches only a public offline shell and icons, with no forced takeover of active pages; private HTML and API caching remain prohibited. Session expiry is seven days absolute without sliding refresh. A later-phase IndexedDB recorder is not implied by the public fallback.

Target deployment is a Node 24 process behind HTTPS with managed PostgreSQL, authenticated TLS SMTP and a daily maintenance job. Actual host/domain/provider/backup configuration remains a deployment gate; nothing has been provisioned externally. See [security](SECURITY.md) and [setup](LOCAL_SETUP.md).

## Phase 2 implementation update — 2026-11-05

Implemented the profile module with validated HTTP adapters, owner-scoped transactional services, immutable revisions/corrections and focused client form components. Six private tables use forced RLS with transaction-local authenticated identity. Mutation receipts and a shared aggregate revision prevent duplicate writes and lost updates; owner-intent headers reject drafts from an account switched in another tab. Decimal SI conversions use a pinned decimal.js dependency. Private measurements are paginated and BMI calculations receive the relevant historical height baseline.

`/onboarding` saves three guided steps; `/profile` edits goals, equipment, units and privacy/accessibility settings; `/progress` records measurements and shows corrected BMI history. All data is real persistence, private by default, online-only in this phase. Browser forms declare POST and wait for hydration before submission. They preserve drafts during errors/conflicts and retain timestamps/UUIDs across unchanged retries. No exercise selection, program changes, workout logging, competitive scoring or meal tracking is implemented.

The current UI remains neutral and accessible. Reduced motion is applied across the workspace. The framework route announcer requires inline style attributes, permitted through a scoped CSP directive while scripts and stylesheets retain their nonce policies. User-supplied HTML/CSS is never accepted. See [Phase 2 report](PHASE2_REPORT.md) and [data contract](PHASE2_DATA_CONTRACT.md).

## Phase 3 implementation boundary

`src/modules/exercises` owns reference catalogue/seed validation, deterministic eligibility/scoring, server data access and the authenticated comparison HTTP handler. `src/components/exercise-library.tsx` and `exercise-alternatives.tsx` provide bounded client interactions; authenticated server routes live under `src/app/(workspace)/train`. Private movement preferences extend the existing profile aggregate rather than introducing a second write/version protocol. Reference seeding remains operator-only; runtime is read-only for catalogue data. The comparison client receives minimal revision/equipment display data. See [the exercise contract](PHASE3_EXERCISES.md). Program generation, applied substitutions and scoring ledgers retain their future module boundaries.
