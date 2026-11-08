# hackutd2026: Poyo

Security training for T-Mobile employees. Employees run simulated attacks (ransomware, SIM-swap fraud, smishing, phishing, insider/vendor leaks), guided with hints or unguided against a live Nemotron attacker that adapts to their replies. The backend is a [SpacetimeDB](https://spacetimedb.com) module, self-hosted on Vultr at **[poysson.fishing](https://poysson.fishing)**.

```
app/               Nuxt front end (practice, arena, admin) + AI/arena server routes
shared/src/        zod contracts shared by the module, the Nuxt app and the Nemotron agent
spacetimedb/src/   the module
  schema.ts        tables (all private)
  auth.ts          login, authenticator 2FA, account admin, demo accounts
  training.ts      practice, scenarios, simulation runs, live chat, agent moves, scoring
  service.ts       registration for the Nemotron agent (SERVICE_SECRET)
  views.ts         everything clients can read
  seed.ts          init: owner + starter guides, practice questions, two scenarios
  crypto.ts        PBKDF2 password hashing, TOTP (RFC 6238)
deploy/vultr/      server setup (cloud-init), deploy and admin scripts
```

## Conventions

- Node 22+ (`.nvmrc`), **npm only**. One npm workspace, one lockfile at the root: run `npm install` there.
- TypeScript strict everywhere. `npm run check` = type checks + ESLint + Prettier check; `npm run format` fixes formatting.
- Copy `.env.example` to `.env` (git-ignored). It lists every variable the project reads.

## Run it locally

Install the CLI once: `curl -sSf https://install.spacetimedb.com | sh`, then add `~/.local/bin` to your `PATH`.

```bash
npm install
spacetime start                                              # own terminal
SERVICE_SECRET=local-dev-secret-0123456789 spacetime publish  # publishes ./spacetimedb as hackutd2026
spacetime call -s local hackutd2026 seed_demo_accounts '"choose-a-demo-password"'
npm run dev                                                  # Nuxt app: http://localhost:3001
```

Demo accounts skip 2FA: `demo.admin@example.com` and `demo.employee@example.com`. Create a real admin (with 2FA) with:

```bash
spacetime call -s local hackutd2026 bootstrap_admin '"you@example.com"' '"Your Name"' '"+15555550123"' '"a-long-password"'
```

Owner-only commands (`bootstrap_admin`, `seed_demo_accounts`) work for the identity that first published. Other CLI commands need `-s local` because the CLI's default server is Maincloud: `spacetime logs -s local hackutd2026`, `spacetime sql -s local hackutd2026 "SELECT * FROM scenario"`. After a schema change: `spacetime publish --delete-data`.

## How a simulation works

1. A **scenario** is data: steps (each with an attack stage `before` / `during` / `after`, a channel, who it claims to be from, the message, and a hint for guided mode) plus an answer key (`rubricJson`). Ransomware scenarios can start with the employee's dashboard locked.
2. A **run** is one attempt. Employees start one themselves (`startSimulation`), or an admin or Nemotron assigns one, which pops up on their dashboard (`startRun`).
3. **Guided:** the employee works through the scripted steps with hints and logs actions (`logRunEvent`). **Unguided:** Nemotron plays the attacker in `sim_message`, the employee replies (`sendSimReply`), and the agent adapts: more or less pressure (`adjustDifficulty`), a new stage, locking or unlocking the dashboard.
4. The run ends when the employee submits a report or the agent ends it. Nemotron scores it with strengths and mistakes (`scoreRun`), shown to the employee right away. Admins can score too (`reviewRun`).

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

| Route                            | What                                                             |
| -------------------------------- | ---------------------------------------------------------------- |
| `POST /api/arena/start`          | new arena round, attacker's first move                           |
| `GET /api/arena/:id`             | round state (steps + log, never the truth flags)                 |
| `POST /api/arena/:id/action`     | employee action -> judged (rules, then model) -> attacker reacts |
| `POST /api/ai/generate-scenario` | AI draft of a `ScenarioDraft` for admins to review and save      |
| `POST /api/photon/send`          | drill text to a consenting teammate (`DEMO_PHONE_MAP`)           |

## Front end (Nuxt, `app/`)

Two areas after login: **Practice** (assigned and self-started simulations, practice questions, guides; all SpacetimeDB) and **Arena** (free play against the Nemotron attacker; runs on the Nuxt server). Both render scenario steps as fake apps with `StepView` and record what the employee did as `RunEventKind`s.

- Login/2FA/enroll pages are wired to the reducers; `SessionGate` routes between them.
- `NUXT_PUBLIC_DEV_BYPASS_AUTH=1` in `.env` lets you browse pages without a running SpacetimeDB (dev only).
- After changing the module, regenerate bindings: `npm run bindings` (needs the `spacetime` CLI).
- Arena types are a separate entry point: `@hackutd2026/shared/arena` (ArenaMove, ArenaAction, Judgment, ArenaState).
- `ScenarioStep` has optional `links`, `form`, `stage` and `hint`; `Channel` includes `social` and `web`.

| Route                            | What                                                             |
| -------------------------------- | ---------------------------------------------------------------- |
| `POST /api/arena/start`          | new arena round, attacker's first move                           |
| `GET /api/arena/:id`             | round state (steps + log, never the truth flags)                 |
| `POST /api/arena/:id/action`     | employee action -> judged (rules, then model) -> attacker reacts |
| `POST /api/ai/generate-scenario` | AI draft of a `ScenarioDraft` for admins to review and save      |
| `POST /api/photon/send`          | drill text to a consenting teammate (`DEMO_PHONE_MAP`)           |

## Connecting a front end

```bash
spacetime generate --lang typescript --out-dir <frontend>/module_bindings --module-path spacetimedb
```

- URL `ws://127.0.0.1:3000` locally (not `localhost`: the server is IPv4-only), `wss://poysson.fishing` in production; database `hackutd2026`. The SDK ships Vue helpers (`spacetimedb/vue`); `app/pages/admin.vue` and `app/components/` have working examples (tables, views, reducers).
- Store the token from `onConnect` and pass it back with `withToken`, so the browser keeps its identity and session across reloads.
- In Nuxt, create the connection client-side only (a `.client` plugin).
- Reducer errors (wrong password, invalid input, wrong role) reject the reducer promise with a readable message.

**Login flow:** `login(email, password)`, then watch `my_login_state` and `my_account`. Demo accounts land in `my_account` directly. Stage `totp` → `verifyTotp(code)`. Stage `enroll` (first login) → the browser makes a secret (20 random bytes, base32), shows it as a QR code for `otpauth://totp/<App>:<email>?secret=<SECRET>&issuer=<App>`, then `enrollTotp(secret, code)`.

## API

Views:

| Who                       | Views                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anyone                    | `my_account`, `my_login_state`, `am_service`                                                                                                                                                                                                                                                          |
| Signed-in employees       | `my_runs` (runs with scenario, mode, stage, live difficulty, `lockedOut`, and score, feedback, strengths and mistakes once scored), `my_run_messages`, `my_run_events`, `my_stats`, `my_attack_stats` (per attack type), `available_scenarios`, `guides`, `practice_questions`, `my_practice_answers` |
| Nemotron agent and admins | `all_scenarios` (with answer keys), `all_runs`, `all_run_messages`, `all_run_events`, `employee_attack_stats`                                                                                                                                                                                         |
| Admins                    | `admin_accounts`                                                                                                                                                                                                                                                                                      |

Reducers (camelCase in the bindings):

| Area           | Reducers                                                                                                                                                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth           | `login`, `verifyTotp`, `enrollTotp`, `cancelLogin`, `logout`, `changePassword`                                                                                                                                                                                                                                                |
| Employee       | `startSimulation(scenarioId, mode)`, `startRun(runId)`, `logRunEvent(runId, kind, stepId, detail)`, `sendSimReply(runId, body)`, `submitReport(runId, summary, actionsTaken)`, `answerPractice`                                                                                                                               |
| Nemotron agent | `registerService(secret, label)`, `postAttackerMessage(runId, channel, from, stage, body)`, `postCoachMessage`, `adjustDifficulty(runId, 1-5)`, `setRunLockout`, `endSimulation`, `scoreRun(runId, score, feedback, strengths, mistakes)`, `proposeScenario(..., publish, assignTo, mode, popupMessage)`                      |
| Admin          | `adminCreateAccount`, `adminSetRole`, `adminResetTotp`, `createScenario`, `updateScenario`, `setScenarioStatus`, `deleteScenario`, `assignScenario(scenarioId, accountId, mode, popupMessage)`, `assignScenarioToAllEmployees`, `reviewRun`, `upsertGuide`, `deleteGuide`, `createPracticeQuestion`, `deletePracticeQuestion` |
| Owner (CLI)    | `bootstrapAdmin`, `seedDemoAccounts`                                                                                                                                                                                                                                                                                          |

Admins can call the agent reducers too, so you can stand in for Nemotron from the CLI.

Shapes live in `shared/src/index.ts`: `AttackType`, `AttackStage`, `SimMode`, `Channel`, `RunEventKind`, `SimSender`, `ScenarioDraft` (`ScenarioContent` + `ScenarioRubric`), `AttackerTurn` and `RunScore`. The module rejects anything that doesn't match, so validate with the same schemas before sending.

## The Nemotron agent

It runs in the Nuxt server and connects to SpacetimeDB directly on the box (`NUXT_SPACETIME_INTERNAL_URL`). It calls `registerService(SERVICE_SECRET, 'nemotron-agent')` once, then subscribes to `all_runs` and `all_run_messages`. When an unguided run has a new employee reply, it reads the scenario's answer key and the conversation, decides its next move, and calls `postAttackerMessage`, `adjustDifficulty` or `setRunLockout`. It ends and scores the run when it's over. It can also personalize training: read `employee_attack_stats`, then `proposeScenario` with `assignTo` set for an employee's weakest attack type.

## Deploy to Vultr

The server (Ubuntu 24.04, Atlanta) runs SpacetimeDB and the Nuxt app behind Caddy, with automatic HTTPS for `poysson.fishing` and `www.poysson.fishing`. Only the two SpacetimeDB endpoints browsers use are public; every other `/v1/` path returns 404. Publishing and admin commands go over SSH, so nobody else can push code to the server.

Set `VULTR_SSH`, `PUBLIC_HOST` and `SERVICE_SECRET` in `.env`, then from the repo root:

```bash
deploy/vultr/deploy.sh                    # publish the module (DELETE_DATA=1 after a breaking schema change)
deploy/vultr/stdb.sh call hackutd2026 seed_demo_accounts '"choose-a-demo-password"'
deploy/vultr/stdb.sh logs hackutd2026
deploy/vultr/deploy-web.sh                # the Nuxt app (app/) at https://poysson.fishing/
```

A new server: create it with [`deploy/vultr/cloud-init.yaml`](deploy/vultr/cloud-init.yaml) as Cloud-Init User-Data, point the domain's A records at it, and put the domain on the first line of `/etc/caddy/Caddyfile`.

## Known limitations

- No login lockout after failed attempts: a failed reducer rolls back, so failures can't be counted in the same call. Password plus code are both required.
- Passkeys (WebAuthn) are not implemented; the second factor is an authenticator code.
- `ctx.random` is deterministic, which is why the TOTP secret is generated in the browser.
