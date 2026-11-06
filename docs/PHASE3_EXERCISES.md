# Phase 3 exercise contract

Phase 3 implements a limited original-text catalogue, private movement filters and read-only comparisons. It does not generate programs or apply workout substitutions. Hybrid tracking/RPG, guided approval, head-to-head competition and basic nutrition remain the product decisions. Visual identity remains undecided.

## Reference data

Sixteen entries cover bodyweight and goblet squats, hip extension/hinges, horizontal presses, pull-ups, trunk bracing and treadmill locomotion. This is not comprehensive: no reviewed horizontal row, vertical press, lunge, cable, machine or outdoor route is supplied. Missing coverage returns no match. Difficulty is an editorial 1–3 ordinal, not a prescription. Equipment requirements are conjunctive; a dumbbell chest press also requires a bench. Available load ranges are not prescribed or assumed sufficient for a target stimulus.

The seed's stable exercise and version UUIDs must never be reassigned or reordered. Append new entries at the end; corrections require a new version UUID and incremented version. Identity/variant groups preserve distinct PR histories in future phases. The latest version controls availability; an unreviewed latest version never falls back to an older version. Seed transactions validate references, serialize with an advisory lock and reject conflicting immutable content hashes. Runtime has SELECT only on reference tables. Database triggers reject version/join rewrites and deletion. Operators can archive identities without removing history.

Instructions are newly written summaries with publisher links in each record; no images, videos or source prose are copied. Original project text follows the repository's UNLICENSED status. Publisher copyrights remain with their owners. Sources were consulted November 5, 2026: ACE's Bodyweight Squat, NASM exercise-specific library pages, and Life Fitness's Atmos treadmill console guide. Source links are references, not endorsements or clinical review. Codex performed editorial checks; no qualified trainer or clinician has approved this library. Seek qualified guidance for suitability and uncertain setup; stop for pain. Publication beyond the private project should include human content review.

## Private preferences and eligibility

User-owned restrictions and choices use FORCE RLS with transaction-local owner identity, strict server validation, existing aggregate version locking, idempotent receipts and immutable profile snapshots. Structured flags describe movement demands, not diagnoses. Neutral choices are represented by absent rows. Likes/dislikes in free text are never interpreted by NLP. A saved reviewed flag is required even when selecting no exclusions. Any nonempty limitation note blocks personalized alternatives pending qualified review; there is no clinical-clearance workflow in this phase. Do not delete relevant notes to bypass this gate. General instruction browsing remains available.

Eligibility runs before scoring: editorial metadata, reviewed filters, no unresolved notes, every equipment requirement present, no conflicting restriction, no explicit exclusion. Unknown demand/equipment/pattern/modality metadata fails closed. Hard gates cannot be overridden by a preference score.

## substitution-v1

Score = .35 muscle + .25 pattern + .20 equipment + .10 difficulty + .10 preference. Muscle is Jaccard overlap of primary muscles. Pattern is 1 for exact, .5 within knee/hip/push/pull families, otherwise 0. Equipment is Jaccard of required equipment sets (two empty sets score 1); eligibility independently checks actual inventory. Difficulty = max(0, 1 - abs(candidate difficulty - experience ordinal)/2). Preference is like 1, neutral .5, dislike 0; exclude is a hard gate. Zero muscle or pattern overlap removes an irrelevant candidate. Sort descending score, then stable exercise ID. Components and meaningful modality/loading/laterality/metric differences are exposed; matching does not guarantee equivalent stimulus. Related patterns are explicitly labelled. PR identity is always distinct.

## HTTP and phase boundary

Authenticated server pages load the catalogue. POST /api/exercises/alternatives accepts only exerciseId, equipmentProfileId and expectedProfileVersion, with exact Origin and x-profile-owner intent checks, 4 KiB body limit, rate limit and no-store response. Inventory, restrictions, experience and preferences derive from the authenticated account. Foreign/archived environments return 404 and stale profile versions return 409. Private configuration is never placed in URLs or browser persistence. Comparisons are read-only and make no program/session edits. Profile filters use the existing POST /api/profile aggregate operation save-exercise-preferences.

Phase 4 consumes these stable version IDs and rules only after review. Program proposals, schedules, approval diffs, load/volume selection, recovery constraints and historical workout substitutions remain outside this phase.
