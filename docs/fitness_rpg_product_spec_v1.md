# Fitness RPG PWA — Product Specification v1.0

Status: Proposed, build-ready baseline. Visual design undecided. Scope: private two-user installable PWA.

## Product principles
- Hybrid serious training tracker + RPG progression.
- Guided adaptation: show reasons and obtain approval for program changes.
- Competitive head-to-head league, normalized by personalized commitments rather than total weight or time.
- Basic nutrition: calories, protein, weight trends, not diagnosis or prescriptive medical advice.
- Two invite-only accounts with private measurements and selectively shareable competition data.
- Offline-first active workout logging, secure synchronization, audited ranking mutations, accessible mobile UI.

## Personas and primary journeys
1. New lifter: create account, complete profile with height/weight/goals/experience/schedule/equipment, review proposed program, approve, install PWA, train and log sets, see PR and XP.
2. No-equipment user: choose Home/no equipment, view eligible substitutions and changed stimulus, accept for this session only or save environment.
3. Returning trainee: review previous loads, complete sets, receive rest countdown and suggested next set; save session offline and sync later.
4. Competing couple: view current weekly duel, compare schedule-normalized points, issue challenge, receive result, view season history.
5. Goal change: update availability/goal, receive explicit diff of proposed future sessions, approve; past prescriptions and logs remain immutable.
6. Illness/travel: set explicit pause or adjusted schedule with effective dates; no missed-day penalty during approved pause; no silent retroactive erasure.

## Information architecture / screens
Bottom navigation: Home, Train, Ranks, Progress, Profile.
- Home: today's session/rest, quick start/resume, next rank, duel summary, check-in.
- Train: calendar, programs, program editor, workout preview, active workout, substitute picker, exercise detail, completion summary, session history.
- Ranks: overall rank, lifetime XP, category mastery, exercise mastery, weekly duel, four-week seasons, achievements, challenge builder.
- Progress: PR history, per-lift charts, per-run distance records, training volume and adherence, body measurements, BMI trend, nutrition tracking.
- Profile: setup wizard, measurements, equipment profiles, training goals, restrictions, privacy, notification/audio/accessibility controls, export/delete.
- Supporting: auth/invitation, offline status/conflicts, push opt-in, settings, error/empty states.

## Profile and body metrics
Record height, weight, age/date-of-birth (if necessary), training experience, primary/secondary goals, training days, duration, exercise likes/dislikes, equipment locations, optional limitations, optional caloric/protein targets. Body measurements are timestamped and immutable after creation except corrected entries; units selectable. BMI = kg / m^2, shown as contextual information; never counts toward ranking. Do not infer body composition from BMI.

## Exercise schema and library
Exercise IDs stable; include name, aliases, equipment requirements, muscle targets, movement pattern, laterality, resistance modality, difficulty, measurable metrics, safety notes, instruction content, variant group and version. Substitutions require a hard equipment/limitation gate then score eligible options by muscle match .35, pattern .25, equipment .20, difficulty .10, preference .10. All values normalized [0,1]. Explain differences; don't transfer PRs across distinct movement variants.

## Workout plan engine
Pipeline: validate profile -> select weekly schedule -> choose split -> enforce major movement balance and recoverability -> select eligible exercise templates -> prescribe sets/reps/rest/effort -> estimate duration -> propose plan with explanations -> accept/version. Default splits: 1-3 days full body, 4 days upper/lower, 5+ individualized; these are overridable. Initial generally 1-3 working sets/exercise for beginners; goal-specific reps, effort and rest must be configurable and reviewed. Maintain a per-muscle weekly volume budget with adjustable beginner/intermediate bands and safety caps. No automatic progression from a single good set. For double progression: if all planned sets reach top rep bound at acceptable reported effort and technique for 2 comparable sessions, propose the smallest equipment-compatible load increase; else hold. For underperformance across >=2 comparable sessions, propose hold/reduce volume or load. Missing RPE/technique => no assumption that effort was easy. User approves/rejects each program change; approval creates new version of affected future prescriptions. Deload/pause and pain flags cause cautious suggestions, not diagnosis. Prevent conflicting workouts and overloaded scheduling.

## Active workout state machine
scheduled -> ready -> in_progress -> paused -> completed OR abandoned. Offline logs may be pending_sync; server acknowledges idempotently. Support warm-up vs working sets, set order, weight (unit normalized), reps, duration, distance, RPE/RIR, notes, time started/completed, previous performance and editable current targets. One-tap repeat previous values, save set, undo, reorder, skip, replace exercise, add set, rest timer. Rest timer uses stored deadline (wall clock timestamp) and recomputes remaining time upon resume; never trusts a continuously running background timer. Emit audio/haptic only when supported/allowed. Timers and local notifications while backgrounded cannot be guaranteed on iOS. Server-side push is an optional reminder channel, not a precise rest-timer guarantee. Autosave each set to IndexedDB, sync via mutation IDs and monotonic revision; display unsynced status. Never erase pending workout data on logout without clear warning.

## Ranking and XP — initial game balance
Lifetime XP event ledger: qualifying workout +50, on-time scheduled session +15, eligible PR +20, approved weekly quest +40, monthly milestone +100. Prevent repeated award for same underlying event; cap farmable events. A qualifying workout needs approved plan or user-defined minimum effort/time verified by logs; don't award for opening screen.
Competitive overall rating R' = clamp(R+A+G-C,0,2399). Weekly adherence A: >=90% +40; >=70% +25; >=50% +10; else 0. Genuine capped progress G in [0,20] per week; eligible missed sessions inactivity C in [0,30], applied after grace period, excluding planned rest, approved pause and recovery. Zero eligible sessions due to pause: neutral. Rating tiers: Initiate 0-299, Bronze 300-599, Silver 600-899, Gold 900-1199, Platinum 1200-1499, Diamond 1500-1799, Master 1800-2099, Legend 2100-2399. Each tier III, II, I. Lifetime XP and PRs never decrease. Season restarts and rating decay policy must be explicitly versioned; changes have an audit migration strategy.
Exercise mastery: modality-specific metric pipelines: weight/reps/estimated 1RM where appropriate (Epley w*(1+r/30) for consistent supported movements and limited rep ranges); running standardized distances and best times; bodyweight reps/hold duration and progression variants. Preserve historic PRs. Category mastery uses contribution from related activity, avoids duplicate counted sets, and uses a versioned formula. Don't claim universal elite strength benchmarks without validated demographics and data.
Duel points D=60a+25p+15q: normalized adherence a, scaled goal attainment p, capped quests q, each 0..1. Weekly score max 100; immutable weekly snapshots, 4-week seasons; tie rules, timezone cutoffs, late sync grace period, disputes and corrections. No raw PR or physical measurements visible to opponent without sharing permission.

## Nutrition scope
Daily calories and protein targets optional and editable, meal/snack manual entries with portions, summary remaining/consumed, weight trend. Do not penalize competitive rating for nutrition logs. No aggressive automatic calorie targets, no clinical dietary advice. Include warnings against using arbitrary BMI as a health score. Data private by default.

## Persistence — PostgreSQL tables (minimum)
users(id,email,display_name,created_at); invitations(id,email,token_hash,expires_at,used_at); sessions/accounts for auth; fitness_profiles(id,user_id,height_cm,experience,goal,timezone,version); body_measurements(id,user_id,metric,value_si,recorded_at,source); equipment_profiles(id,user_id,name,is_default); equipment_items(id,profile_id,equipment_type,config_json); exercises(id,slug,name,modality,pattern,difficulty,metadata_json,version); exercise_muscles(exercise_id,muscle_id,role); exercise_equipment(exercise_id,equipment_type); exercise_substitutions(id,source_id,target_id,score_meta_json,explanation); program_versions(id,user_id,version,status,goal_snapshot_json,rules_version,created_at,approved_at); program_sessions(id,program_version_id,scheduled_local_date,timezone,status); prescribed_exercises(id,program_session_id,exercise_id,ordinal,target_json); workout_sessions(id,user_id,program_session_id,status,started_at,completed_at,client_mutation_id,revision); workout_exercises(id,session_id,exercise_id,source_prescription_id,ordinal,substitution_reason); workout_sets(id,workout_exercise_id,set_type,ordinal,weight_kg,reps,duration_seconds,distance_m,rpe,rir,completed_at,client_mutation_id,revision); personal_records(id,user_id,exercise_id,record_type,value,unit,source_set_id,earned_at); rank_snapshots(id,user_id,period_start,period_end,category,rating,formula_version); rank_events(id,user_id,source_event_id,category,delta,formula_version,created_at); xp_events(id,user_id,source_event_id,event_type,amount,created_at); challenges(id,creator_id,opponent_id,type,definition_json,start_at,end_at,status); challenge_results(id,challenge_id,user_id,points,breakdown_json,finalized_at); achievements(id,code,rules_version); user_achievements(id,user_id,achievement_id,source_event_id,unlocked_at); nutrition_entries(id,user_id,recorded_at,calories,protein_g,food_name,serving_json); push_subscriptions(id,user_id,endpoint_hash,encrypted_subscription,created_at); notification_preferences(id,user_id,preferences_json); sync_mutations(id,user_id,client_mutation_id,payload_hash,applied_at); audit_events(id,user_id,event_type,entity_id,details_json,created_at).
Constraints: DB unique(user_id,client_mutation_id) for idempotent mutations; unique(user_id,source_event_id,event_type) for XP; indexes on all user_id/time queries; foreign keys; authorization on every read/write; strict decimal units and UTC timestamps + stored IANA timezone for calendar logic. No direct client write of XP or ratings. Use relational first and JSON only for versioned rules snapshots/safe extensibility. Use migrations and transaction boundaries for session completion + PR + XP.

## Security, privacy and reliability
Invite-only two users; passwordless or secure authentication, server-side authorization, rate limiting, CSRF protection as appropriate, encrypted HTTPS, secrets in environment, audit logs, account deletion/export. Shared league reveals only chosen metrics; no accidental disclosure of weight/BMI, nutrition, pain or restrictions. Secure push endpoint handling, opt-in permission; no notification content revealing health measurements by default. Use service worker for app shell caching, IndexedDB for pending logs, explicit sync status, conflict handling, background operations only as best effort. Feature detection for sound/vibration/notifications; respect reduced motion and mute.

## Edge cases / behavior
- Workout crosses midnight or DST: associate with original scheduled local day; use UTC instants for timing.
- Offline duplicate set submits: dedupe by client mutation ID; don't double-award XP.
- Same active workout open on two devices: detect revision conflict and require resolution.
- Abandoned workout: preserve logged data; no completed-session XP.
- Substituting equipment mid-workout: maintain prior exercise records; add substitution provenance.
- Editing historical set: recompute affected records/rank event via audited correction ledger; don't silently delete achievements.
- Weight units kg/lb switched: SI stored; UI converted consistently, no precision drift.
- Rest day/illness/pause: no demotion, appropriate explicit schedule rule and effective date.
- Notification denied: in-app reminders and no broken timers.
- Timer page suspended: show computed remaining based on deadline upon reopening; don't promise exact background alert.
- Missing check-in effort: do not infer readiness or increase load automatically.
- Program change mid-session: freeze current workout snapshot, update future sessions only.
- User deletes account: cascade/anonymize responsibly including duels, retain no identifiable private health records.
- Late weekly sync: configured grace window, hold final duel result until grace expires; prevent score edits after finalize except audited correction.
- No-equipment exercise set lacks equivalent: display limitation and suitable alternatives, never fabricate equivalence.
- User manually overrides a training safety suggestion: confirm, log reason, don't hide decision.
- Two users in different timezones: league uses configured shared season timezone and published deadline.

## Nonfunctional acceptance targets
Mobile-first responsive from 320px, 44px minimum accessible tap targets, keyboard/screen-reader support and reduced-motion mode. Target fast tap feedback (<100ms local) and navigation under ~2 seconds on ordinary mobile connection, measured in testing not promised. No data loss during simulated offline toggles/refresh, idempotent API requests, auth/authorization integration tests, deterministic rank engine golden tests, end-to-end onboarding -> workout -> PR -> duel flows. PWA install manifest and app icons, SSL, optional web push on supported Home Screen environments. Monitor errors with privacy-safe telemetry; database backup and restore rehearsal.

## Phased Codex implementation plan
Phase 0: repository inspection, decisions log, ADRs, requirements, tests, seed strategy.
Phase 1: Next.js/TS/Tailwind shell, secure invite-only authentication, PostgreSQL/Prisma, migrations, test runner, PWA installability.
Phase 2: profiles, measurements, equipment sets, privacy, body metrics, onboarding and editable settings.
Phase 3: exercise taxonomy, curated seeded library, alternatives engine with safety filters, instructions and tests.
Phase 4: program generation, guided proposal review, approval, versioning, scheduling and fatigue check-in.
Phase 5: live workout recorder, sets/reps/weights, timer, autosave IndexedDB, sync + conflict handling, substitution actions.
Phase 6: PR calculation, XP ledger, overall ranks, modality mastery, category rankings, weekly evaluator and audit tests.
Phase 7: head-to-head duel, seasons, normalized scoring, achievements, challenges, notifications.
Phase 8: basic nutrition and insights dashboards, data export/delete.
Phase 9: sound, motion, high quality visuals, accessibility pass, full performance/security tests, iPhone device testing, release.
Definition of done for EACH phase: schema migrations, real persistence, authorization, loading/empty/error states, test results, documented decisions, no placeholder claiming completion.

## Suggested Codex instruction — Phase 0
"Inspect repository without changing existing code. Read this spec. Produce docs/ARCHITECTURE.md, docs/DATA_MODEL.md, docs/RANKING_RULES.md, docs/WORKOUT_ENGINE.md and docs/ACCEPTANCE_TESTS.md. Identify ambiguities, make reversible assumptions, and implement only a skeleton after documenting architecture. Plan numbered changes and run checks. Do not produce mock functionality masquerading as completed workflows. Preserve visual-theme flexibility."

## Suggested Codex instruction — Phase 1
"Implement Phase 1 of PRODUCT_SPEC v1.0. Create secure invitation-only authentication for exactly two accounts, database schema/migrations, mobile navigation shell, an installable PWA manifest, and automated tests. Do not implement workout, progression, duel or nutrition business logic yet. Demonstrate migration/seed/test commands, security boundaries, local setup, and real iPhone PWA validation steps."

## Sources and limitations
- ACSM 2026 resistance training position stand: https://pubmed.ncbi.nlm.nih.gov/41843416/
- WebKit iOS Home Screen Web Push: https://webkit.org/blog/13878/
- Apple notification permission/service-worker requirements: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- MDN PWA offline/background limitations: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
All numerical ranking formulas and thresholds above are original proposed game-balance rules, not clinical standards; revise via versioned configuration after real usage.
