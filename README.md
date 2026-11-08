# Poysson

**Poysson. Like poisson. Like fish. Like phish.** Security training for carrier (T-Mobile) employees, played as a game. Live at **[poysson.fishing](https://poysson.fishing)**.

Employees practice against realistic attacks (phishing, smishing, SIM-swap fraud, ransomware, insider/vendor leaks) and learn both halves of the job: spotting the attack, and responding when one gets through. The headline mode, **Deep Water**, pits them against a live NVIDIA Nemotron attacker that adapts to what they do and can act inside a mock work account.

Everything in the game is fictional: the carrier is "CorpMobile", domains end in `.example`, phone numbers are `+1 (555) …`, and IP addresses come from documentation ranges.

## What's in it

| Area | Route | What it does |
| --- | --- | --- |
| The Dock | `/dashboard` | level, XP, skill starfish (mastery per threat vector), Solana-anchored audit trail |
| Go Fishing | `/incidents` | **Drills**: arm threat vectors, get a mixed timed incident (`/briefing` → `/simulator` → `/results` → `/report`); **Practice**: assigned guided simulations (SpacetimeDB), practice questions, guides |
| Deep Water | `/arena` | free play against the live Nemotron attacker: **Bait** (every employee) or **Breach** (response team) |
| Catch Log | `/audit` | audit events, each hashed and anchored on Solana devnet |
| Admin | `/admin` | accounts and roles, assign scenarios, live feed of arena rounds |

## Deep Water: the AI arena

**The mock work environment** (`app/server/utils/env-engine.ts`). Each round has a fake work account with tabs for Messages, Mail (forwarding rules, sent mail), Care Portal (customers and their change history), My Security (sessions, MFA devices, password), Files, and an Activity log with locations and IPs. The attacker's actions really change this state; the player has to find and undo them. Order matters, as in real incident response: reset the password before signing sessions out, or the attacker signs straight back in. A round ends **clean**, **contained** or **compromised**.

**The attacker** (`adversary.ts`, `nemotron.ts`). Model: `nvidia/nemotron-3.5-lightning-30b-a3b` through NVIDIA's OpenAI-compatible hosted API, with reasoning off for per-turn speed. Each turn it gets the player's last action, what it can see of the environment, its own history, and the round's playbook, and returns JSON: up to 2 messages (email, SMS, chat, call transcript, fake login page) and, once it has access, up to 2 tools (`add_forwarding_rule`, `send_mail_as_you`, `add_mfa_device`, `change_customer` such as a SIM swap, `encrypt_files`, `export_customers`). It moves in the background after the HTTP response; the page updates live through SpacetimeDB.

**Real-world playbook** (`server/data/incidents.ts`, `incident-playbook.ts`). Nine documented attacks on carrier and help-desk staff, each with a public source (FBI IC3, CISA AA23-320A, FCC 2023 SIM-swap and port-out rules, DOJ cases, press reports): cash offered per SIM swap, criminals posing as customers, fake help-desk calls, port-out fraud, and more. Each round gives the attacker two that fit the mode. No real company names reach the model.

**Judging** (`judge.ts`). Clicked responses are scored by rules; free-text replies are graded by Nemotron. Every judgment shows a confidence score and whether it came from a rule or the model. The truth labels (which messages are malicious) never reach the browser while a round is active.

**After each action** a runbook card shows the matching company procedure. **At the end of the round:**
- **Debrief** (`debrief.ts`): written by Gemini from a plain record of what the player did, citing runbook sections. Fallback chain: `gemini-flash-latest` → `gemini-flash-lite-latest` → Nemotron → a template, 10 s per model, so a round always ends with a debrief.
- **Attacker reveal** (`reveal.ts`): Nemotron, the model that played the attacker, explains in the first person how it targeted the player, how it adapted, and which real incident it copied.

**Guardrails** (`clean-model.ts`). Every model reply is validated against a zod schema (one retry with the errors, then a scripted attacker takes over); real domains are rewritten to `.example`, real carrier names to CorpMobile, placeholder phone numbers get digits; narration that would spoil the attack is dropped; attacker mail-forwarding rules always point outside the company.

**Runbook search** (`retrieve.ts`, `runbook-search.ts`). 24 synthetic CorpMobile runbook passages (`shared/src/runbooks.ts`), tagged for employees, responders or both. Hybrid search: BM25 keywords blended with Gemini embeddings (`gemini-embedding-001`), about 65% keyword and 35% semantic by score. Keyword search keeps working if Gemini is down. The same passages are seeded into SpacetimeDB as guides.

## Repo layout

```
app/               Nuxt 3 front end + server (arena, AI, Solana routes)
  server/api/      HTTP routes (below)
  server/utils/    arena engine, attacker, judge, debrief, reveal, RAG, Solana
  server/data/     runbook index + real-world incident library
shared/src/        zod contracts shared by the module, the app and the AI layer
spacetimedb/src/   the SpacetimeDB module
  schema.ts        tables (all private)
  auth.ts          login, authenticator 2FA, account admin, demo accounts
  training.ts      practice, scenarios, simulation runs, chat, scoring
  arena.ts         live mirror of arena rounds (synced by the Nuxt server)
  service.ts       service registration for the Nuxt server (SERVICE_SECRET)
  views.ts         everything clients can read
  seed.ts          owner, starter guides and runbooks, practice questions, scenarios
  crypto.ts        PBKDF2 password hashing, TOTP (RFC 6238)
deploy/vultr/      server setup (cloud-init) and deploy scripts
```

## Server routes (Nuxt)

| Route | What |
| --- | --- |
| `POST /api/arena/start` | new round (`mode: bait \| breach`), attacker's first move |
| `GET /api/arena/:id` | round state (never the truth labels while active) |
| `POST /api/arena/:id/action` | message decision → judged (rules, then model) → runbook guidance → attacker reacts |
| `POST /api/arena/:id/respond` | environment fix (sign out session, remove device, revert customer change, report…) |
| `POST /api/arena/:id/end` | end the round: summary, debrief, attacker reveal |
| `GET /api/runbooks` · `GET /api/runbooks/search` | runbook passages · hybrid search |
| `POST /api/ai/generate-scenario` | AI draft of a `ScenarioDraft` (API only; no admin screen yet) |
| `POST /api/solana/anchor` · `POST /api/solana/verify` | anchor an audit event's hash as a memo transaction · re-hash and check it |
| `POST /api/solana/badge` · `GET /api/solana/badges` · `GET /api/solana/badge-meta/:id` | mint a non-transferable badge token · list · metadata |
| `GET /api/solana/status` | wallet and RPC status |
| `POST /api/photon/send` | drill text to a consenting teammate only (`DEMO_PHONE_MAP`), labeled as a drill |

Solana runs on devnet; only hashes go on-chain. Writes are queued one at a time because the public RPC rate-limits hard.

## Run it locally

Node 22+, **npm only** (one workspace, one lockfile at the root). Copy `.env.example` to `.env` (git-ignored); it lists every variable. The AI features need `NVIDIA_API_KEY` + `NEMOTRON_MODEL` and `GEMINI_API_KEY`; without them the arena falls back to the scripted attacker and template debriefs.

Install the SpacetimeDB CLI once: `curl -sSf https://install.spacetimedb.com | sh`, then add `~/.local/bin` to your `PATH`.

```bash
npm install
spacetime start                                              # own terminal
SERVICE_SECRET=local-dev-secret-0123456789 spacetime publish  # publishes ./spacetimedb as hackutd2026
spacetime call -s local hackutd2026 seed_demo_accounts '"choose-a-demo-password"'
npm run dev                                                  # http://localhost:3001
```

- Demo accounts skip 2FA: `demo.admin@example.com` and `demo.employee@example.com`.
- `NUXT_PUBLIC_DEV_BYPASS_AUTH=1` lets you browse pages without SpacetimeDB (dev only).
- `npm run check` runs type checks, ESLint and the Prettier check. After changing the module, regenerate bindings with `npm run bindings`.
- Create a real admin (with 2FA): `spacetime call -s local hackutd2026 bootstrap_admin '"you@example.com"' '"Your Name"' '"+15555550123"' '"a-long-password"'`. Owner-only commands work for the identity that first published; other CLI commands need `-s local`.

## SpacetimeDB API

**Login flow:** `login(email, password)`, then watch `my_login_state` and `my_account`. Stage `totp` → `verifyTotp(code)`. Stage `enroll` (first login) → the browser makes a secret, shows it as an `otpauth://` QR code, then `enrollTotp(secret, code)`. Connect to `ws://127.0.0.1:3000` locally (IPv4 only) or `wss://poysson.fishing`, database `hackutd2026`; create the connection client-side only.

| Who | Views |
| --- | --- |
| Anyone | `my_account`, `my_login_state`, `am_service` |
| Signed-in employees | `my_runs`, `my_run_messages`, `my_run_events`, `my_stats`, `my_attack_stats`, `available_scenarios`, `guides`, `practice_questions`, `my_practice_answers`, `my_arena_rounds` |
| Service and admins | `all_scenarios` (with answer keys), `all_runs`, `all_run_messages`, `all_run_events`, `employee_attack_stats`, `all_arena_rounds` |
| Admins | `admin_accounts` |

| Area | Reducers (camelCase in the bindings) |
| --- | --- |
| Auth | `login`, `verifyTotp`, `enrollTotp`, `cancelLogin`, `logout`, `changePassword` |
| Employee | `startSimulation`, `startRun`, `logRunEvent`, `sendSimReply`, `submitReport`, `answerPractice`, `claimArenaRound` |
| Service | `registerService`, `syncArenaRound`; the module also exposes `postAttackerMessage`, `adjustDifficulty`, `setRunLockout`, `endSimulation`, `scoreRun`, `proposeScenario` for an AI agent driving practice runs (not wired up yet) |
| Admin | `adminCreateAccount`, `adminSetRole`, `adminResetTotp`, `createScenario`, `updateScenario`, `setScenarioStatus`, `deleteScenario`, `assignScenario`, `assignScenarioToAllEmployees`, `reviewRun`, `upsertGuide`, `deleteGuide`, `createPracticeQuestion`, `deletePracticeQuestion` |
| Owner (CLI) | `bootstrapAdmin`, `seedDemoAccounts`, `seedRunbooks` |

Shapes live in `shared/src/index.ts` and `shared/src/arena.ts`; the module rejects anything that doesn't match.

## Deploy to Vultr

One Ubuntu 24.04 server runs SpacetimeDB and the Nuxt app behind Caddy (automatic HTTPS for `poysson.fishing`). Only the two SpacetimeDB endpoints browsers use are public; every other `/v1/` path returns 404. Server-side secrets live in `/etc/hackutd/web.env`.

Set `VULTR_SSH`, `PUBLIC_HOST` and `SERVICE_SECRET` in `.env`, then from the repo root:

```bash
deploy/vultr/deploy.sh        # publish the module (DELETE_DATA=1 after a breaking schema change)
deploy/vultr/deploy-web.sh    # build and deploy the Nuxt app
deploy/vultr/stdb.sh logs hackutd2026
```

> **Careful:** `deploy-web.sh` rewrites the server's `/etc/hackutd/web.env` from *your* `.env`. If your `.env` is missing a secret (`SERVICE_SECRET`, the AI keys, Solana, Photon), that value is blanked in production. To ship only new code, upload a built `.output` and restart `hackutd-web` instead. The script also needs `rsync`, which Git Bash on Windows doesn't include.

A new server: create it with [`deploy/vultr/cloud-init.yaml`](deploy/vultr/cloud-init.yaml) as Cloud-Init User-Data, point the domain's A records at it, and put the domain on the first line of `/etc/caddy/Caddyfile`.

## Known limitations

- **Drills** (`/incidents` → `/simulator`) score on the client from `app/data/incidents.ts` and persist to `localStorage`; only Practice runs and Deep Water are server-backed.
- No AI agent drives guided Practice runs yet; the live attacker is in Deep Water.
- The admin screen doesn't call the scenario generator yet (the API route exists).
- No login lockout after failed attempts (a failed reducer rolls back, so failures can't be counted in the same call). Passkeys (WebAuthn) aren't implemented; the second factor is an authenticator code.
- The fonts in `app/public/fonts` (Water Galon, Utendo, Stay With Me) are third-party commercial fonts; confirm their licenses allow web use before reusing them.
