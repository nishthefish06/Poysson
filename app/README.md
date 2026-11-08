# NEON//IR — Cyberpunk Incident Response Trainer

A Nuxt 3 + Vue 3 frontend for a gamified incident response simulator. There are no drills to pick from. You **arm threat vectors** and the generator builds one **mixed incident**: one inject per vector, shuffled and overlapping, so every run plays differently.

```bash
npm install
npm run dev        # http://localhost:3000
npm run generate   # static build in .output/public (deploy anywhere)
```

Demo login: any email plus a password of 4 or more characters. The Duo push auto-approves after about 6 seconds, or you can click **Simulate approve**.

## Happy path (demo / judging backup)

`/login → /verify → /dashboard → /incidents → /briefing → /simulator → /results → /report`

Each step is wired with real navigation and state. Progress is saved to `localStorage`, so a page refresh mid-demo won't lose anything. Use **Profile → Reset demo data** to start fresh.

## Screens → routes

| # | Screen | Route | Notes |
|---|--------|-------|-------|
| 1 | Login | `/login` | email + password, validation, passkey shortcut |
| 2 | Verify | `/verify` | fake Duo push: waiting → approved / denied / timeout |
| 3 | Passkey | `/passkey` | real WebAuthn on HTTPS, simulated ceremony otherwise |
| 4 | Dashboard | `/dashboard` | level, XP, accuracy, streak → skill radar → recent runs → badges → audit preview |
| 5 | Audit log | `/audit` | filterable table, **Solana VERIFIED** chip on every row |
| 6 | Incident Ops | `/incidents` | 5 threat-vector cards (arm/disarm), difficulty, generator |
| 7 | Briefing | `/briefing` | SITREP typewriter, expected vectors (order unknown), ROE, re-roll |
| 8 | **Simulator** | `/simulator` | feed · inbox/ticket · timer+score+actions · comms. States: start, live (harmful flag), finished |
| 9 | Results | `/results` | tabs: Score · Replay (scrubber: your path vs ideal) · Tips · Report |
| 10 | Report | `/report` | clean, print-ready after-action report (Print → Save as PDF) |
| 11 | Profile | `/profile` | badge case, lifetime stats, and skill mastery |
| — | Component library | `/styleguide` | every component and variant on one page |

## Components (`components/ui`)

Each component exposes its variants as props. Names match the Figma layer names.

| Component | Variants / states |
|-----------|-------------------|
| `CyberButton` | `variant`: primary · secondary · danger · ghost — `size`: sm · md · lg — `loading`, `disabled`, `to` |
| `CyberInput` | default · focus · `error` · `disabled`, password reveal, icon, hint |
| `StatCard` | `accent`: cyan · magenta · yellow · green · red, `delta`, `caption` |
| `XpBar` | `size`: sm · md · lg, `level` chip, `gain` highlight |
| `CyberBadge` | `tier`: bronze · silver · gold · neon, `locked`, `fresh`, `size` |
| `ScenarioCard` | armed · offline, mastery bar (used as threat-vector card) |
| `LogRow` | `type`: alert · log · action, `severity`, `rating` |
| `ActionButton` | `state`: idle · chosen · locked · disabled, reveals `rating` + points |
| `TabBar` | v-model, icons, counts |
| `StatusPill` | `status`: ideal · ok · harmful · pending, `size` |
| `CyberTimer` | `variant`: ring · digital, auto normal → warn → critical |
| `CyberPanel`, `CyberIcon` | layout frame + inline icon set |

Game-specific components (`components/game`): `SkillRadar`, `SolanaVerified`, `ReportDocument`.

## Where things live

- `assets/css/tokens.css`: **all design tokens** (color, type, spacing, shape, motion). Components never use raw hex values.
- `data/incidents.ts`: threat vectors, 10 injects (2 per vector) with actions, ratings, red flags and tips, plus the seeded generator.
- `data/badges.ts`: badge definitions and unlock rules.
- `composables/useGame.ts`: all state and the mock "API" (login, MFA, passkeys, completeRun, audit). **Swap these functions for real backend calls.**
- `middleware/auth.global.ts`: auth stage guard (login → verify → passkey → app).

## Dynamic data notes (for backend hookup)

Each page has a header comment that lists the data it reads. The main integration points:

- **Audit `tx` / `slot`** are mocked (`fakeTx()`). Replace them with the signature of a Solana memo transaction that carries the event hash. `SolanaVerified` already links to the devnet explorer.
- **`completeRun()`** computes the score, XP, badges and skill changes on the client. Move this to the server if the scores need to be trusted.
- **Passkey**: `pages/passkey.vue` calls `navigator.credentials.create` on HTTPS. Use a server-issued challenge in production.

## Scoring

- Each inject is worth up to 100 points for an ideal call, with partial points for ok and a penalty for harmful.
- Responding within 20 seconds adds +10 (harmful calls don't get it).
- Each comms broadcast scores once. It earns full points when relevant (for example, Legal when exfil or insider vectors fired) and 1/3 otherwise.
- Grade: S ≥ 92%, A ≥ 80%, B ≥ 65%, C ≥ 45%, otherwise D. XP = score × the difficulty multiplier (1, 1.5 or 2).

Layouts are built for desktop. Below 900px they fall back gracefully, but the simulator is meant for a laptop or projector.
