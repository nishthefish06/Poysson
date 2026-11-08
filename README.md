# hackutd2026

Cybersecurity training for T-Mobile employees. The backend is a [SpacetimeDB](https://spacetimedb.com) module (TypeScript), self-hosted on Vultr.

```
app/               Nuxt front end (practice, arena, admin) + AI/arena server routes
shared/src/        zod contracts shared by the module, the Nuxt app and AI generators
spacetimedb/src/   the module: tables, reducers, views
  schema.ts        tables (all private)
  auth.ts          login, authenticator-app 2FA, account admin
  training.ts      practice answers, simulation runs, reports, reviews, content admin
  views.ts         everything clients can read
  seed.ts          init: owner + starter guides, questions, sample scenario
  crypto.ts        PBKDF2 password hashing, TOTP (RFC 6238)
deploy/vultr/      cloud-init for the server, deploy and admin scripts
spacetime.json     database name (hackutd2026), local server by default
.env.example       every environment variable name the project uses
```

## Conventions

- Node 22+ (`.nvmrc`), **npm only**. It's an npm workspace with one lockfile at the root: run `npm install` there, never inside a package.
- TypeScript in strict mode everywhere.
- `npm run check` runs the type checks, ESLint and the Prettier check; `npm run format` fixes formatting.
- Copy `.env.example` to `.env` (git-ignored) for local values.

## Run it locally

Install the CLI once: `curl -sSf https://install.spacetimedb.com | sh` (then add `~/.local/bin` to your `PATH`).

```bash
npm install
spacetime start                      # leave running in its own terminal
spacetime publish                    # publishes ./spacetimedb as "hackutd2026" on local (from spacetime.json)
spacetime call -s local hackutd2026 seed_demo_accounts '"choose-a-demo-password"'
```

`seed_demo_accounts` creates `demo.admin@example.com` and `demo.employee@example.com`, which skip 2FA so judges can log in. Create a real admin with:

```bash
spacetime call -s local hackutd2026 bootstrap_admin '"you@example.com"' '"Your Name"' '"+15555550123"' '"a-long-password"'
```

Both only work for the identity that first published the database. Other commands need `-s local` too, because the CLI's global default server is Maincloud:

```bash
spacetime logs -s local hackutd2026                       # reducer errors show up here
spacetime sql -s local hackutd2026 "SELECT * FROM my_account"
spacetime publish --delete-data                           # wipe and re-seed after schema changes
```

## Front end (Nuxt, `app/`)

Two areas after login: **Practice** (assigned simulations, practice questions, guides; all SpacetimeDB) and
**Arena** (free play against the Nemotron attacker; runs on the Nuxt server). Both render scenario steps as
fake apps with `StepView` and record what the employee did as `RunEventKind`s.

```bash
npm install
npm run dev            # http://localhost:3001 (SpacetimeDB already uses :3000)
```

- Login/2FA/enroll pages are wired to the reducers; `SessionGate` routes between them.
- `NUXT_PUBLIC_DEV_BYPASS_AUTH=1` in `.env` lets you browse pages without a running SpacetimeDB (dev only).
- After changing the module, regenerate bindings: `npm run bindings` (needs the `spacetime` CLI).
- Arena types are a separate entry point: `@hackutd2026/shared/arena` (ArenaMove, ArenaAction, Judgment, ArenaState).
- `ScenarioStep` gained optional `links` and `form`, and `Channel` gained `social` and `web` (additive; re-publish the module).

| Route | What |
| --- | --- |
| `POST /api/arena/start` | new arena round, attacker's first move |
| `GET /api/arena/:id` | round state (steps + log, never the truth flags) |
| `POST /api/arena/:id/action` | employee action -> judged (rules, then model) -> attacker reacts |
| `POST /api/ai/generate-scenario` | AI draft of a `ScenarioDraft` for admins to review and save |
| `POST /api/photon/send` | drill text to a consenting teammate (`DEMO_PHONE_MAP`) |

## Connecting a front end

Generate typed bindings into the front-end project, then connect with the TypeScript SDK (it ships Vue and React helpers under `spacetimedb/vue` and `spacetimedb/react`):

```bash
spacetime generate --lang typescript --out-dir <frontend>/module_bindings --module-path spacetimedb
```

- URL: `ws://127.0.0.1:3000` locally (not `localhost`, which can resolve to IPv6 while `spacetime start` listens on IPv4 only), `wss://<server-host>` on Vultr. Database: `hackutd2026`.
- Store the token from `onConnect` (e.g. in `localStorage`) and pass it back with `withToken` so the browser keeps its identity, and therefore its session, across reloads.
- In Nuxt, create the connection client-side only (a `.client` plugin); websockets don't run during SSR.

### Login flow

1. `login(email, password)`. Then subscribe to `my_login_state` and `my_account`:
   - `my_account` has a row: signed in (demo accounts land here directly).
   - `my_login_state.stage == 'totp'`: show the 6-digit code screen, call `verifyTotp(code)`.
   - `my_login_state.stage == 'enroll'`: first login. In the browser, create a secret from 20 bytes of `crypto.getRandomValues`, base32-encode it (32 chars), show it as a QR code for
     `otpauth://totp/<App>:<email>?secret=<SECRET>&issuer=<App>&period=30&digits=6&algorithm=SHA1`,
     then call `enrollTotp(secret, code)` with the first code from the app.
2. `logout()`; `cancelLogin()` backs out of the 2FA step.

Reducer errors (wrong password, bad code) reject the reducer promise with the message.

## API

All tables are private. Clients read through these views, which only return what the caller's session and role allow:

| View                                                                         | Who       | Contents                                                                                                                 |
| ---------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `my_account`                                                                 | signed in | profile, role, `totpEnabled`, `isDemo`                                                                                   |
| `my_login_state`                                                             | mid-login | `stage` (`totp`/`enroll`), `email`                                                                                       |
| `my_stats`                                                                   | signed in | assignment counts by status, average approved score, practice totals                                                     |
| `my_assignments`                                                             | signed in | assigned simulations with briefing, `contentJson`, admin `popupMessage`; `score`/`feedback` only after an admin approves |
| `guides`, `practice_questions`                                               | signed in | training content (questions without answers)                                                                             |
| `my_practice_answers`                                                        | signed in | your answers plus the correct choice and explanation                                                                     |
| `admin_accounts`, `admin_scenarios`, `admin_assignments`, `admin_run_events` | admins    | everything, including rubrics, reports and the run event log                                                             |

Reducers (camelCase in generated bindings):

| Area               | Reducers                                                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth               | `login`, `verifyTotp`, `enrollTotp`, `cancelLogin`, `logout`, `changePassword`                                                                                                          |
| Employee           | `answerPractice`, `startAssignment`, `logRunEvent(assignmentId, kind, stepId, detail)`, `submitReport`                                                                                  |
| Admin: people      | `adminCreateAccount`, `adminSetRole`, `adminResetTotp`                                                                                                                                  |
| Admin: simulations | `createScenario`, `updateScenario`, `setScenarioStatus`, `deleteScenario`, `assignScenario`, `assignScenarioToAllEmployees`, `reviewAssignment(assignmentId, score, feedback, approve)` |
| Admin: content     | `upsertGuide`, `deleteGuide`, `createPracticeQuestion`, `deletePracticeQuestion`                                                                                                        |
| Owner (CLI)        | `bootstrapAdmin`, `seedDemoAccounts`                                                                                                                                                    |

Enums, scenario JSON and run events are defined once in [`shared/src/index.ts`](shared/src/index.ts) and imported as `@hackutd2026/shared`:

- `AttackType`, `Difficulty`, `Role`, `ScenarioStatus`, `AssignmentStatus` (`assigned` → `in_progress` → `submitted` → `reviewed`), `LoginStage`.
- `ScenarioContent` (stored in `contentJson`, visible to the employee) and `ScenarioRubric` (stored in `rubricJson`, admin only; scoring must total 100). `ScenarioDraft` is the whole scenario; admin forms and the Gemini/Nemotron generators should validate their output against it. `createScenario`/`updateScenario` reject anything that doesn't match.
- `RunEventKind` and `RunEventInput` for `logRunEvent`. `started` and `submitted` are recorded by the module.
- `describeIssues(error)` turns a zod error into one readable line.

## Deploy to Vultr

The server runs SpacetimeDB on `127.0.0.1:3000` behind Caddy (automatic HTTPS). Only the two endpoints the browser SDK uses are public (`/v1/identity/websocket-token` and `/v1/database/<db>/subscribe`); publishing and admin commands go over SSH, so nobody else can push modules to the box.

1. Vultr → Deploy → Cloud Compute, **Ubuntu 24.04**, 2 GB RAM or more. Add your SSH key. Paste [`deploy/vultr/cloud-init.yaml`](deploy/vultr/cloud-init.yaml) into **Cloud-Init User-Data**.
2. Wait a few minutes after it boots, then check: `curl https://<ip-with-dashes>.sslip.io/v1/identity/websocket-token` should not be a connection error (the host is printed in `/etc/caddy/Caddyfile` on the server).
3. Set `VULTR_SSH=root@<server-ip>` in `.env`, then publish and set up accounts from the repo root:

   ```bash
   deploy/vultr/deploy.sh
   deploy/vultr/stdb.sh call hackutd2026 seed_demo_accounts '"choose-a-demo-password"'
   deploy/vultr/stdb.sh call hackutd2026 bootstrap_admin '"you@example.com"' '"Your Name"' '"+15555550123"' '"a-long-password"'
   deploy/vultr/stdb.sh logs hackutd2026
   ```

   Re-run `deploy.sh` after every module change.

4. Front end: connect to `wss://<ip-with-dashes>.sslip.io`, database `hackutd2026`.

**Custom domain:** add an A record pointing at the server IP, replace the first line of `/etc/caddy/Caddyfile` with the domain, and run `systemctl reload caddy`. The Nuxt app can be served from the same box by adding a second site block to that Caddyfile.

## Known limitations

- No login lockout: a failed reducer rolls back, so failed attempts can't be counted in the same transaction. Password + code are both required, which limits brute force, but add rate limiting before real use.
- The module's RNG (`ctx.random`) is deterministic, which is why the TOTP secret is generated in the browser. Password salts use it too; they only need to be unique.
- Passkeys (WebAuthn) are not implemented; SpacetimeDB has no built-in support.
