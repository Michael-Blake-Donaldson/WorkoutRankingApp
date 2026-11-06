# Phase 1 local setup

Requires Node.js 24.x, npm and Docker Desktop (Linux containers). Dependencies are pinned in package.json and package-lock.json. Local Docker images are pinned by digest. All published Docker ports bind loopback only. This is a private development setup, not an internet deployment.

## First run (PowerShell)

Run each command successfully before the next. Do not overwrite an existing `.env`.

```powershell
npm ci
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the generated value into `BETTER_AUTH_SECRET` in `.env`; do not paste it into chat or commit it. Start Docker Desktop, then:

```powershell
docker compose up -d --wait
npm run db:generate
npm run db:migrate
npm run db:seed
npm run test:prepare
npm run test:e2e:prepare
npm run db:runtime
npm run dev
```

Open [local app](http://127.0.0.1:3000/sign-in). Use that exact origin rather than `localhost`: another application can listen on IPv6 localhost independently of this IPv4 server. `npm run dev` binds to the configured loopback origin and explicit port, so port conflicts fail instead of silently changing the authentication origin. `npm run dev` uses the restricted role from ignored `.env.runtime`; `.env` retains owner credentials for migrations and operator tools. `db:runtime` generates local runtime credentials without printing them. The test databases must exist before applying those role grants. Do not use the Docker example password outside local development. Secrets also need OS account/backup protection; Windows file mode flags alone do not establish a Windows ACL.

## Issue an invitation

In a second terminal:

```powershell
npm run invite -- create first@example.com
```

The operator command prints the private invitation URL once. Share it privately with the intended recipient outside logs/source control. The invitation is bound to that email and expires in 48 hours. No email is automatically sent by this command. The recipient enters the invited email, requests a five-minute link, then confirms sign-in from the email. In local development, email goes only to [Mailpit](http://127.0.0.1:58025). Existing users use `/sign-in` without an invitation. Repeat for the second account; there is no public signup or third account path.

```powershell
npm run invite -- revoke first@example.com
npm run auth:revoke -- first@example.com
```

Revoking an invitation prevents pending new-account redemption; it does not delete an existing account. Session revocation removes all currently active sessions for that email; a new email proof can still authenticate the existing user. Account deletion and replacing an enrolled account are later reviewed workflows, not available operator shortcuts. No test account is seeded in the application database.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm audit
npm run build
./scripts/check-phase0.ps1
```

Unit/integration tests require local `fitness_test` and Mailpit. They truncate only their disposable test tables, with a guard against remote or application databases. They never reset `fitness`. Run `npm run test:prepare` to apply new test migrations before testing.

Production browser tests use real PostgreSQL, restricted runtime credentials, HTTPS and authenticated TLS SMTP into a separate local Mailpit instance:

```powershell
npm run test:cert
docker compose --profile e2e up -d --wait
npm run test:e2e:prepare
npm run db:runtime
npx playwright install chromium webkit
npm run build
npm run test:e2e
```

Playwright starts and stops its own production server at `https://localhost:3443`, using `fitness_e2e`. Its certificate trust exceptions are restricted to testing; they do not change production TLS verification. Local CA material lives in ignored `.local-tls`. Browser traces/reports contain synthetic authentication data; keep them private and delete them when no longer needed. Do not run multiple integration/e2e invocations concurrently against the same test databases.

## Migrations, seeds and recovery

For Phase 2, rerun `db:migrate`, `test:prepare`, `test:e2e:prepare` and `db:runtime` before starting the app or tests. New private tables require the new grants and row-level-security policies. Sign in, choose **Start or resume setup**, then save training preferences, an equipment location (empty equipment is supported), height and weight, and complete the review. `/profile` edits settings and `/progress` records measurements and shows BMI history. These pages require an online connection; no health data is seeded or cached in the service worker.

`db:migrate` runs checked-in forward migrations. `db:seed` is idempotent reference initialization only and must not reset occupied account slots. `db:status` reports deployment state. Future schema changes use `npx prisma migrate dev --name descriptive_name` with owner credentials against a development database, followed by review of SQL, generation, and migration tests. Never use `db push` or a reset command against production.

Keep the PostgreSQL volume when stopping: `docker compose --profile e2e down`. Removing volumes destroys local data and is not part of setup. If Docker restarts, check `docker compose ps` and rerun `up -d --wait`; failures to connect are failures, not successful migrations.

`npm run auth:cleanup` removes expired sessions/verification records and rate buckets expired more than a day ago. Schedule daily in deployment using operator/maintenance credentials, with privacy-safe result counts. Invitation and audit retention need a reviewed operational policy. No hosted scheduler is provisioned here.
