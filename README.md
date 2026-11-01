# Fitness RPG

Private two-user fitness PWA combining serious training, RPG progression, guided adaptation, head-to-head competition, and basic nutrition.

**Status: Phase 1 foundation implemented locally.** Next.js/TypeScript/Tailwind shell, real invitation-only email authentication for two accounts, PostgreSQL/Prisma migrations, accessible mobile navigation, PWA manifest/icons and public offline fallback. Visual identity remains undecided.

Primary authority: [Product specification v1.0](docs/fitness_rpg_product_spec_v1.md). Proposed implementation decisions never silently override it.

Start with [local setup](docs/LOCAL_SETUP.md), [security boundaries](docs/SECURITY.md), and [Phase 1 report](docs/PHASE1_REPORT.md). See the [documentation index](docs/README.md), [architecture](docs/ARCHITECTURE.md), and [decisions and assumptions](docs/DECISIONS.md) for the Phase 0 foundation.

No workout recorder, adaptation engine, rankings, duels or nutrition workflows are implemented yet. Their destinations explicitly identify later-phase scope; there are no fake records or scores. Stop at the Phase 1 boundary before starting profiles/onboarding.

Use Node 24 and Docker Desktop. The setup guide includes migration, safe seed, invitation, restricted database role, local email and test commands. No production host, SMTP provider, or real iPhone installation has been provisioned or verified.

Phase 0 structural verification (PowerShell, no dependencies):

```powershell
./scripts/check-phase0.ps1
```

This checks documentation structure, local links and the original product specification fingerprint. Application validation uses `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` and `npm audit` after completing the local setup.
