# Decisions and assumptions

Status terms: accepted direction follows the product specification; proposed default is reversible pending review; open means implementation must resolve it before the relevant phase. No new medical or training efficacy claims are made here. Source links in the primary specification have not been independently validated in Phase 0.

## ADR log

| ID      | Status             | Decision and consequence                                                                                                                            |
| ------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-001 | Accepted direction | Next.js/TS/Tailwind, Prisma/PostgreSQL modular monolith; defer package versions and deployment selection to Phase 1. See architecture.              |
| ADR-002 | Accepted direction | Server-authoritative progression with immutable events and versioned snapshots; more audit storage, reproducible awards and corrections.            |
| ADR-003 | Accepted direction | IndexedDB outbox and optimistic revisions for active workouts; explicit conflicts instead of silent last-write-wins.                                |
| ADR-004 | Accepted direction | Approval creates future program versions; active and historic workout snapshots stay fixed.                                                         |
| ADR-005 | Accepted direction | UTC instants, stored IANA zones, original scheduled day, shared league timezone; separate personal schedule from competition cutoffs.               |
| ADR-006 | Accepted direction | Private by default with allowlisted opponent projections; never serialize complete profile rows for competition.                                    |
| ADR-007 | Accepted direction | Neutral accessible baseline; visual identity deferred to review and Phase 9.                                                                        |
| ADR-008 | Proposed default   | Passwordless email auth through a maintained provider/library; evaluate cost, email delivery and session revocation in Phase 1. No provider chosen. |

## Reversible proposed rules

These fill specification gaps for test design, not claims of approved game balance. Store them in versioned configuration; review before Phases 4, 6 and 7.

| ID  | Proposal                                                                                                                                                                                                                                                                    | Review dependency                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A01 | League week Monday 00:00 through next Monday 00:00, half-open; shared IANA timezone explicitly chosen by both users. Late-sync grace 24 hours, finalization afterward.                                                                                                      | Phase 7; timezone has no silent device default.                         |
| A02 | Initial overall rating 0; each 300-point tier has III first 100, II next 100, I final 100. No season rating reset or extra decay in v1.                                                                                                                                     | Phase 6; preserve lifetime XP and historical PRs.                       |
| A03 | Freeze weekly commitments before period starts; prospective changes require approval and effective dates. Unplanned additions earn no adherence denominator change. Both participants approve competition-affecting midweek adjustments.                                    | Phases 4/7; published audit trail, no retroactive score erasure.        |
| A04 | Qualification uses approved per-session thresholds (working sets/time/activity metrics); user-defined thresholds must be committed before starting. No universal effort threshold is invented.                                                                              | Phase 4 must define concrete template thresholds before Phase 6 awards. |
| A05 | Weekly G = min(20, 5 per distinct eligible PR); C = min(30, 10 per eligible missed session after 24-hour grace). PR XP max three distinct records per week; workout XP max one per scheduled commitment or precommitted unscheduled session per local day.                  | Phase 6 game-balance review, anti-farming tests.                        |
| A06 | Duel p = capped weighted attainment of precommitted measurable goals; q = completed approved quests / approved quest cap; zero goal/quest denominator contributes zero. Zero eligible adherence denominator makes the week neutral: no duel winner or weekly rating change. | Phase 7; confirm treatment when only one participant is paused.         |
| A07 | Identical unrounded duel scores tie, no physical-performance tiebreak. Season is sum of four finalized weekly points; equal totals share placement; neutral weeks contribute zero to both.                                                                                  | Phase 7.                                                                |
| A08 | Supported estimated 1RM candidates require positive external load, 1–10 working reps, same movement/metric version, valid technique and explicit supported modality. Equal values do not create new PR awards.                                                              | Phase 6; movement eligibility and technique vocabulary need review.     |
| A09 | Corrections retain original PR achievement history and awarded XP, mark invalidated evidence, and append rank/duel correction events; never subtract lifetime XP. Abuse requires audited disqualification, not silent edits.                                                | Phase 6 review resolves fairness versus nondecreasing lifetime rewards. |
| A10 | Store age band only if training rules need it; no DOB in v1 by default. Manual calorie/protein targets only. No BMI scoring or body-composition inference.                                                                                                                  | Phase 2 privacy review.                                                 |

## Open questions and gates

- Phase 1: auth/email provider, host/job scheduler, backup retention, deletion SLA, session expiry/revocation, supported browsers, dependency versions and CI provider.
- Phase 3: curated exercise sources, content licensing, review owner, limitation taxonomy, supported PR movements and equipment load increments.
- Phase 4: configurable volume bands/caps, recoverability windows, duration estimates, goal prescriptions, acceptable effort/technique bounds, comparable-session tolerance and qualification thresholds. Unreviewed configurations block proposals, never fall back to fabricated safety values.
- Phase 6: category weights and mastery scale require a reviewed versioned formula and golden fixtures before any mastery score ships. Quest/monthly milestone definitions and caps must be approved before awards.
- Phase 7: exact quest catalog, goal weights, dispute window/arbiter, correction signoff and pause fairness policy. Proposed rule IDs above are review inputs.
- Phase 8: weight-trend method/window, export formats, deletion/anonymization retention obligations; default trend proposal seven-day mean with visible sample count and missing days excluded.
- Phase 9: visual identity, sound and motion direction, measured performance budgets and real device matrix.

Architecture review must confirm boundaries, privacy, synchronization, rule ownership and the Phase 1 checklist. Unresolved later-phase balance details do not authorize provisional production scoring. Phase 0 stops here; do not install dependencies or implement workflows during review.

## Phase 1 decisions — 2026-11-01

The user's instruction to continue authorizes Phase 1. The Phase 0 boundary text above records the earlier gate; it does not block this approved phase.

| ID      | Status               | Decision                                                                                                                                                                                                                                 |
| ------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-008 | Accepted for Phase 1 | Better Auth passwordless magic links via authenticated TLS SMTP in production; local Mailpit for development/tests. Five-minute login proofs, 48-hour email-bound operator invitations. No public signup, passwords or social providers. |
| ADR-009 | Implemented          | PostgreSQL locked singleton counter and unique slots enforce at most two enrolled accounts atomically. Invites consumed in the same insertion transaction. Runtime cannot issue invites or alter capacity directly.                      |
| ADR-010 | Implemented          | Seven-day absolute server session expiry; no sliding refresh or cookie session cache. Native POST sign-out and operator all-session revocation. No email changes or account replacement workflow in Phase 1.                             |
| ADR-011 | Implemented          | Biome recommended lint/a11y rules plus strict TypeScript, Vitest/PostgreSQL integration and Playwright Chromium/WebKit. Replace vulnerable lint dependency chain without forcing incompatible transitive versions.                       |
| ADR-012 | Implemented          | Nonce CSP with dynamic rendering, no private service-worker caching, no forced worker takeover. Referrer-Policy same-origin preserves native POST origin while withholding cross-site referrers.                                         |
| ADR-013 | Proposed deployment  | Node 24 host behind HTTPS, managed PostgreSQL, authenticated implicit TLS SMTP and daily cleanup; vendor/domain/retention/backup evidence still open until deployment. No paid resources or external messages provisioned.               |

Training/ranking assumptions A01–A10 remain pending for their own phases. No balancing or nutrition decision was promoted to production in Phase 1. Real iPhone/hosted email validation is still required; desktop WebKit does not fulfill it.
