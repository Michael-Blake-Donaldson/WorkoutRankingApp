# Fitness RPG

Private two-user fitness PWA combining serious training, RPG progression, guided adaptation, head-to-head competition, and basic nutrition.

**Status: Phase 3 implemented locally.** Resumable onboarding, private training profiles, equipment locations, measurements with corrections, unit preferences, BMI history and privacy/accessibility settings build on the invitation-only two-account PWA foundation. A curated exercise library, instruction pages, private movement filters and deterministic alternatives extend that foundation. Visual identity remains undecided.

Primary authority: [Product specification v1.0](docs/fitness_rpg_product_spec_v1.md). Proposed implementation decisions never silently override it.

Start with [local setup](docs/LOCAL_SETUP.md), [security boundaries](docs/SECURITY.md), and [Phase 3 contract](docs/PHASE3_EXERCISES.md). See the [documentation index](docs/README.md), [architecture](docs/ARCHITECTURE.md), and [decisions and assumptions](docs/DECISIONS.md) for the Phase 0 foundation.

The 16-entry exercise library supports filtered comparisons, not complete programs or clinical suitability assessment. No workout recorder, program adaptation, rankings, duels or meal logger is implemented yet. No fake records or scores represent these later workflows. Stop at the Phase 3 boundary before program generation.

Use Node 24 and Docker Desktop. The setup guide includes migration, safe seed, invitation, restricted database role, local email and test commands. No production host, SMTP provider, or real iPhone installation has been provisioned or verified.

Phase 0 structural verification (PowerShell, no dependencies):

```powershell
./scripts/check-phase0.ps1
```

This checks documentation structure, local links and the original product specification fingerprint. Application validation uses `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` and `npm audit` after completing the local setup.
