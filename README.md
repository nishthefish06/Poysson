# hackutd2026: Incident Response Training Dashboard

HackUTD 2026 Zero Day. Employee-only cyber-incident drill simulator. **All scenario data is synthetic.**

## Setup

```bash
nvm use            # Node 22
npm install        # one workspace install from repo root
cp .env.example .env
npm run dev        # http://localhost:3000
```

## Layout

| Path                                  | What                                               | Owner      |
| ------------------------------------- | -------------------------------------------------- | ---------- |
| `app/`                                | Nuxt 3 frontend + server routes (`app/server/api`) | P2, P3, P4 |
| `app/server/api/ai` `photon` `anchor` | AI (Gemini, Nemotron), Photon, Solana              | P4         |
| `app/server/api/passkey`              | WebAuthn fallback                                  | P1         |
| `shared/`                             | zod schemas = the contract                         | everyone   |
| `scenarios/`                          | drill JSON (contains answer keys, server-only)     | P3         |
| `spacetime/`                          | Spacetime server module                            | P1         |

## Rules

- TypeScript strict. Validate anything crossing a boundary with `@hack/shared` schemas.
- Answer keys (`verdict`, `points`, `ideal_path`) never reach the client. Use `toPublicScenario()`.
- Secrets only in `.env` / Vultr env vars. **Repo goes public before submission** (Spacetime requirement).
- Branches: `backend`, `dashboard`, `simulator`, `ai`. Keep `main` deployable; merge small and often.
- Photon drill messages only to consenting teammates on `DRILL_ALLOWED_NUMBERS`, always prefixed `[DRILL]`.

## Checks

```bash
npm run validate:scenarios
npm run typecheck
npm run lint
```
