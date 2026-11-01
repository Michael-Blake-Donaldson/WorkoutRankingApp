# Ranking and competition rules

Product formulas are proposed game balance, not clinical or universal strength standards. Server computes all awards. Persist rule configuration/hash and evidence IDs so replay is deterministic. Defaults marked Axx reference [assumptions](DECISIONS.md) and require review before implementation.

## XP ledger

| Event                        | XP  | Eligibility and identity                                                                                           |
| ---------------------------- | --- | ------------------------------------------------------------------------------------------------------------------ |
| Qualifying completed workout | 50  | Approved/precommitted minimum verified by logs; one underlying session, cap A05. Opening screen never qualifies.   |
| On-time scheduled completion | 15  | Qualifying session attached to eligible commitment; original local day is proposed on-time window, review Phase 6. |
| Eligible PR                  | 20  | Distinct supported movement/metric improvement with valid source evidence; cap A05.                                |
| Approved weekly quest        | 40  | Approved definition and completed evidence; at most once per assignment. Quest catalog/cap must be reviewed.       |
| Monthly milestone            | 100 | Reviewed milestone definition per user/month; proposed max one award per month.                                    |

Unique user/source/type keys prevent duplicate awards across retries, replays and corrections. Warmups and unsupported metrics do not create farmable PR awards. Qualification thresholds remain blocked until A04 is configured. XP and historic PR achievements never decrease; corrections follow A09 with visible invalidation provenance rather than silent deletion.

## Weekly overall rating

`next = clamp(previous + A + G - C, 0, 2399)`

`adherence = qualifying on-time committed sessions / eligible committed sessions`, capped [0,1]. Proposed numerator excludes late completions unless a reviewed commitment window permits them. Eligible denominator excludes planned rest and approved pause/recovery, respects effective dates, and cannot be silently rewritten after the fact.

| Adherence        | A   |
| ---------------- | --- |
| >= .90           | 40  |
| >= .70 and < .90 | 25  |
| >= .50 and < .70 | 10  |
| < .50            | 0   |

G is genuine progress capped [0,20]; C is eligible missed-session inactivity capped [0,30], applied after grace. A05 supplies proposed coefficients. A zero denominator due to pause is neutral: no A/G/C rating change. Apply each period once, including a zero-delta event for audit if needed. Use exact decimal/rational comparisons at boundaries, round only display values.

| Tier     | Inclusive rating |
| -------- | ---------------- |
| Initiate | 0–299            |
| Bronze   | 300–599          |
| Silver   | 600–899          |
| Gold     | 900–1199         |
| Platinum | 1200–1499        |
| Diamond  | 1500–1799        |
| Master   | 1800–2099        |
| Legend   | 2100–2399        |

A02 proposes initial 0 and III/II/I per successive 100 points. Seasons archive competition rather than reset XP/PRs. No additional rating decay or reset in proposed v1. Any future change needs new formula version, effective period, dry-run comparison, explicit migration/rebuild plan and retained original snapshots.

## PR and mastery pipelines

- Resistance: compare same supported movement variant and metric; weight/reps and estimated 1RM when applicable. Epley `w * (1 + r/30)` only with reviewed modalities and bounded rep ranges (A08 proposes 1–10); never present an estimate as a measured maximum.
- Running: distance-specific best times over standardized distances; no cross-distance equivalence or unsupported GPS certainty. Preserve distance/time provenance.
- Bodyweight: reps or hold duration within the same variant; progression variants maintain separate records.
- Category mastery: group related activity with unique source-set contributions, versioned weights and caps. Formula is intentionally unresolved; no category score can ship until reviewed and golden-tested.

Distinct variants and corrected/invalid evidence never silently overwrite historical PR records. Current valid best is recomputed from eligible history; historical earned records remain traceable. BMI, body weight change, nutrition and arbitrary demographic elite benchmarks do not contribute to competitive score.

## Duels, challenges and seasons

`D = 60*a + 25*p + 15*q`, each component clamped [0,1]; total [0,100]. a uses personalized commitments, p precommitted normalized goal attainment, q capped approved quests. Weights/denominators/evidence are frozen and visible before competition; A06 specifies proposed empty-denominator behavior. Never compare total kilos/time as the primary competitive basis.

Example arithmetic fixture: a=.75, p=.80, q=.50 => 72.5 points. This is an illustrative expected test value, not a run result. A01 proposes shared-zone Monday weeks, 24-hour sync grace. Four consecutive weeks form a season, using local calendar boundaries converted to UTC individually across DST. Display shared timezone and precise deadlines to both users in addition to local equivalents.

Provisional results can update through grace. Finalization stores immutable inputs/watermark, formula version, breakdown and final timestamp once. Post-final data changes need an audited dispute/correction revision; never mutate original snapshots. A07 proposes ties and summed season placement. Challenge invitations require opponent acceptance; definitions include metric, cap, duration, timezone, eligibility, evidence and sharing scope before activation. Notification opt-in cannot determine eligibility.

Opponent reads use a restricted score projection. A result must not reveal raw PR/load, measurements/BMI, intake, pain/restrictions or notes without an explicit supported grant. Audits and breakdowns must also avoid indirect health disclosure. Dispute authority/window and correction approval are open Phase 7 gates.
