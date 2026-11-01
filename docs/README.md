# Project documentation

Read the entire [primary specification](fitness_rpg_product_spec_v1.md) first. It is preserved unchanged.

1. [Architecture](ARCHITECTURE.md): inventory, boundaries, security, proposed organization.
2. [Decisions](DECISIONS.md): ADRs, assumptions, questions, review gate.
3. [Data model](DATA_MODEL.md): entities, constraints, transactions, privacy.
4. [Workout engine](WORKOUT_ENGINE.md): generation, adaptation, recorder and synchronization contracts.
5. [Ranking rules](RANKING_RULES.md): XP, rating, mastery, duels and corrections.
6. [Acceptance tests](ACCEPTANCE_TESTS.md): traceable scenarios, testing strategy and future commands.
7. [Delivery plan](PHASE_PLAN.md): dependencies, seed strategy, phase boundaries.
8. [Phase 0 report](PHASE0_REPORT.md): completed work, verification and remaining work.

Every design below is a specification for future implementation. Proposed defaults are reversible and require review before their implementing phase. Documentation checks are not evidence that any runtime feature works.

## Phase 1 implementation

- [Local setup and operator commands](LOCAL_SETUP.md)
- [Security boundaries and deployment gate](SECURITY.md)
- [Real iPhone validation steps](IPHONE_VALIDATION.md)
- [Phase 1 report and verification evidence](PHASE1_REPORT.md)

Phase 0 documents describe the full roadmap. The Phase 1 report distinguishes implemented foundation from future workflows and external validation.
