# Phase 1 report — 2026-11-01

## Completed work

Implemented the Next.js/TypeScript/Tailwind foundation with neutral accessible styling and Home/Train/Ranks/Progress/Profile navigation. Future destinations explicitly describe unavailable features; no workout, rating, duel or nutrition behavior is simulated.

Authentication uses Better Auth passwordless email proofs, hashed email-bound 48-hour invitations, explicit confirmation and five-minute single-use login links. PostgreSQL atomically consumes invitations and enforces two enrolled slots. Seven-day absolute HttpOnly sessions, Secure HTTPS cookies, origin checks, persistent atomic limits, private identity projection and revocation are implemented. Auth/operator audit events contain identifiers/types rather than health data or tokens.

Added three reviewed Prisma migrations, safe idempotent seed, separate runtime/operator credentials with production privilege checks, operator invitation/revocation tools and expired-auth cleanup. Containerized local PostgreSQL and SMTP inboxes bind loopback only. Exact npm versions, lockfile and image digests are recorded. Nothing is deployed externally.

Added manifest, 192/512px PNG icons, Apple icon, conservative public offline page, no private caching and no forced service-worker takeover. Added Vitest integration tests using real PostgreSQL/SMTP, Playwright production HTTPS tests in Chromium/WebKit, axe checks, lint/type checking and a GitHub Actions workflow. The original specification is preserved byte-for-byte under its current `docs/` path and fingerprint-checked.

## Verification

Verified on Windows with Node 24.19.0, npm 10.9.1, Docker 29.4.0, PostgreSQL 17.11 and the pinned dependency lockfile:

| Check                                | Actual result                                                                                                                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean `npm ci` and Prisma generation | Passed; 279 packages installed, client generated successfully.                                                                                                                                                                                                            |
| `npm run lint`                       | Passed with recommended rules and warnings treated as errors.                                                                                                                                                                                                             |
| `npm run typecheck`                  | Passed with strict TypeScript.                                                                                                                                                                                                                                            |
| `npm test`                           | 23 passed across three files; zero failed/skipped. Real PostgreSQL and SMTP.                                                                                                                                                                                              |
| `npm run build`                      | Production Turbopack build passed.                                                                                                                                                                                                                                        |
| `npm run test:e2e`                   | Six passed, zero failed/skipped, across Chromium and WebKit. Real production HTTPS and authenticated TLS SMTP; browser server used restricted credentials. Both engines exercised sign-in, navigation/sign-out, axe checks, manifest assets and offline cache assertions. |
| `npm audit`                          | Zero known vulnerabilities across production and development dependencies; a point-in-time audit, not a security certification.                                                                                                                                           |
| Migrations / seed                    | Three migrations applied and status up to date. Initial empty-database migrations and subsequent upgrade migration succeeded; seed ran twice successfully without creating users/invitations/health records.                                                              |
| Documentation integrity              | Required documents/sections/local links pass; original specification SHA-256 `EB58FA542FE0E70131A0FABBBA5661DDC6F73634BD5C76B653233C518084AA3D` matches.                                                                                                                  |
| Visual inspection                    | Reviewed the 320px Chromium screenshot for readable layout, no horizontal overflow and visible keyboard focus.                                                                                                                                                            |

Commands and prerequisites are in [local setup](LOCAL_SETUP.md). Local tests do not certify hosting, real email-provider delivery, physical-device installation, full screen-reader use or production performance. CI configuration has not run remotely.

Local development server also started successfully at `http://127.0.0.1:3000`: sign-in returned 200, unauthenticated `/api/me` returned 401, and an ineligible email-link request returned the generic 200 response without creating an account. Git ignore checks confirmed `.env`, `.env.runtime`, local TLS keys, node_modules and test results are excluded; secret files are not tracked. Documentation checks cover 15 required files and 29 resolving local links.

## Problems found and resolved

- The product specification had moved from `Documentation/` to `docs/`; repaired local references. A formatter modified its whitespace during setup; recovered the exact original bytes from this chat's recorded inspection, verified the original SHA-256, excluded it from formatting and added an integrity guard.
- Docker was installed but initially stopped, then its first startup terminated containers; restarted the services, added restart policy and checked health before migrations. Failed connection/migration attempts were not treated as successful.
- The initial lint dependency tree had moderate minimatch advisories and incompatible peer constraints on upgrade. Replaced that toolchain with Biome recommended rules; no unsafe transitive override or downgrade was used.
- Tests exposed a missing Vitest path alias and readonly `NODE_ENV` assignments under Next.js types. Added the resolver and used the test runner's environment helper; strict checking remains enabled.
- Chromium's service-worker process did not inherit context-level certificate exceptions. Browser testing now trusts only the generated local certificate's public key for that process; production certificate validation remains intact.
- Native form POSTs sent `Origin: null` under the original no-referrer policy. Referrer-Policy same-origin preserves origin validation and still withholds cross-site referrers. Sign-out uses a native form so it works before hydration.
- Early WebKit tests navigated away from streamed documents before scripts loaded, producing canceled chunk requests. Tests now wait for document load; the final app retains the normal Turbopack build and strict CSP. WebKit's Windows automation reports SameSite incorrectly, so cookie attributes are asserted on actual response headers in both browsers, additionally through Chromium's cookie API. Keyboard traversal is checked in Chromium; touch WebKit checks focusability.
- Fragment initialization is guarded against development Strict Mode's repeated effect setup, preventing token loss when the address bar is cleared.
- A final development smoke check found another application listening on IPv6 localhost port 3000. This app's canonical local origin explicitly uses IPv4 `127.0.0.1`; the launcher derives an explicit host/port from that origin. The unrelated server was left untouched. Type checking generates Next.js route types first so it works without prior dev/build output.

## Remaining work and phase boundary

Physical iPhone Safari/Home Screen installation remains untested; follow [device checklist](IPHONE_VALIDATION.md). Hosted HTTPS, a real SMTP provider/domain, verified PostgreSQL TLS, edge throttling/timeouts, backup/restore and operational retention/alerts still require deployment work described in [security](SECURITY.md). CI is configured but has not run remotely; no Git remote or hosted repository was supplied.

Phase 2 profiles/measurements/equipment/privacy/onboarding remain unimplemented, as do all later training/progression/competition/nutrition features. All four product decisions remain intact and visual identity remains undecided. Stop at the Phase 1 review boundary.
