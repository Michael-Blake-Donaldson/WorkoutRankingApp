# Workout engine specification

All algorithms below are future work. Inputs, rules version, outputs and explanations must be reproducible. Clinical guidance and unreviewed safety values are outside scope.

## Generation contract

Input: validated profile/version, goals, experience, availability/time budget, equipment location, preferences, optional limitations, approved rule configuration and exercise library version. Output: proposal ID, input/base versions, future session prescriptions, estimated durations, weekly muscle volume summary, constraints/warnings and human-readable reasons/diff. No direct activation.

Pipeline: validate -> select weekly schedule -> choose split -> enforce major movement balance and recovery -> select eligible templates -> prescribe sets/reps/rest/effort -> check weekly muscle budgets and safety caps -> estimate duration -> propose -> explicit acceptance/version. Default 1–3 days full body, 4 upper/lower, 5+ individualized; overrides must still pass constraints. Beginners generally start with 1–3 working sets per exercise under reviewed configuration. Reps, effort, rest, volume bands, overlap/recovery windows and duration estimates are versioned configuration, not hard-coded medical advice.

If required configuration is absent or constraints are infeasible, return specific reasons and options to reduce scope/change equipment or availability. Never fabricate exercises, equivalence or a feasible schedule. Optional missing limitations are unknown, not evidence of unrestricted readiness. Avoid conflicting session times and excessive muscle loading. Define secondary muscle contribution weights explicitly before volume calculations ship.

## Substitution contract

First enforce hard equipment and explicit limitation gates, then score eligible candidates:

`score = .35 * muscleMatch + .25 * patternMatch + .20 * equipmentMatch + .10 * difficultyMatch + .10 * preferenceMatch`

Each component is normalized to [0,1]. Equipment scoring expresses preference only after eligibility. Missing metadata cannot pass a safety gate. Proposed deterministic tie-break: stable exercise ID. Return component breakdown and differences in stimulus, modality, metrics and difficulty. If no equivalent exists, explain limitations and show eligible alternatives with no equivalence claim.

User chooses session-only replacement or saved environment update; saving environment may generate a future plan proposal but cannot silently change the current plan. Preserve original prescription and earlier logged exercises, add substitution provenance and new exercise instance. Distinct movement variants never share PRs.

## Guided progression

Comparable sessions must share exercise variant, metric/rules version, relevant equipment and prescribed working-set structure; exclude warmups, abandoned or materially changed prescriptions. Exact tolerances require Phase 4 review.

Double progression: all planned working sets reach top rep bound with explicitly acceptable effort and technique in two comparable sessions -> propose smallest available equipment-compatible load increment. One good set/session never triggers progression. Missing RPE/technique supplies no positive evidence. If no increment exists, explain hold/alternative rather than invent a load.

Underperformance across at least two comparable sessions -> propose hold or lower volume/load with evidence. Pain, fatigue, deload and pause flags cause cautious suggestions; no diagnosis or automatic load increases. Every proposal has old/new future targets, rationale, effective date and accept/reject controls. Rejection leaves the program unchanged. Acceptance checks base version to reject stale proposals; active/historic prescriptions remain frozen. Manual override of a safety suggestion needs explicit confirmation and a reason in audit history.

## Workout state and timing

```text
scheduled -> ready -> in_progress <-> paused
                          |             |
                          +-> completed <-+
                          +-> abandoned <-+
```

Ready/start requires eligible session snapshot. Proposed cancellation of an unstarted schedule is a schedule adjustment, not fabricated completion. Completed/abandoned are terminal; corrections use a separate audited action. Resuming is paused -> in_progress. `pending_sync` is a separate synchronization flag, not a workout state.

Set schema supports warmup/working distinction, order, kg/reps/seconds/metres, RPE/RIR, notes and start/completion times. UI supports repeat prior values, save/undo/reorder/skip/replace/add, previous performance, editable current targets and completion summary. Undo emits a revisioned correction; it cannot delete already acknowledged history silently. Abandoned workouts retain logs and earn no completed-session XP.

Store rest timer deadline as UTC wall-clock instant and compute `max(0, deadline-now)` on render/resume. Changes to system clock are a known limitation; timers never determine authoritative competition timestamps. Feature-detect audio/haptics/notifications, honor mute/reduced motion, and keep in-app countdown functional after permission denial. Background/iOS alerts cannot be guaranteed; push is an optional reminder, not precise rest timing.

## Offline synchronization

Local IndexedDB transaction stores set plus outbox payload before UI says saved locally. Envelope: mutation UUID, entity UUID, operation, expected revision, payload schema version and payload. Server supplies authoritative applied revision/time; client timestamps are evidence, not trusted score authority. Retry identical envelopes with backoff, including crash after commit before acknowledgement. Retain receipts long enough for offline replay; retention period requires operational review.

Server compares revision and idempotency hash in transaction. Conflict view presents both versions and permits explicit keep/current/merged choice via a fresh mutation ID against current revision. Never silently merge conflicting values for one set. Multiple devices must not produce two completion awards. Preserve pending data on failed/expired authentication; warn before logout and do not sync across accounts. Simulate local storage failure/quota and avoid claiming save succeeded.

Associate midnight/DST-crossing sessions with original scheduled local day; record instants in UTC. A late offline completion can affect competition only inside published grace and integrity rules. Claimed backdated times after finalization require a dispute/correction, never automatic reopening.
