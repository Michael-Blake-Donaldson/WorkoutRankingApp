# Fitness RPG

Private two-user fitness PWA combining serious training, RPG progression, guided adaptation, head-to-head competition, and basic nutrition.

**Status: Phase 0 documentation only.** No application, authentication, database, workout engine, ranking engine, or production tests exist yet. Visual identity remains undecided.

Primary authority: [Product specification v1.0](docs/fitness_rpg_product_spec_v1.md). Proposed implementation decisions never silently override it.

Start with [documentation index](docs/README.md), [architecture](docs/ARCHITECTURE.md), and [decisions and assumptions](docs/DECISIONS.md). Phase 1 requires architecture review; this change stops at that boundary.

Phase 0 structural verification (PowerShell, no dependencies):

```powershell
./scripts/check-phase0.ps1
```

This checks documentation structure and local links only. It does not validate application behavior. Runtime setup and application commands belong to Phase 1.
