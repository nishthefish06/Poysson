/* ==========================================================================
   useGame — global client state (auth, player, runs, audit log).
   Persisted to localStorage by plugins/persist.client.ts.
   Swap the mock functions here for real API calls when the backend lands.
   ========================================================================== */
import { BADGES } from '~/data/badges'
import {
  COMMS_ACTIONS, DIFFICULTY, generateIncident, injectById, VECTORS,
  type Difficulty, type IncidentPlan, type Rating, type VectorId,
} from '~/data/incidents'

export interface Decision {
  injectId: string
  vector: VectorId
  arrivedAt: number // seconds into run
  at: number // seconds into run
  actionId: string
  rating: Rating
  points: number
  speedBonus: number
}
export interface RunResult {
  id: string
  planId: string
  codename: string
  difficulty: Difficulty
  vectors: VectorId[]
  finishedAt: string
  elapsed: number
  score: number
  maxScore: number
  accuracy: number // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  xpEarned: number
  decisions: Decision[]
  comms: { id: string; at: number; points: number }[]
  missed: string[] // inject ids never answered
  newBadges: string[]
  tx: string
}
export interface Passkey { id: string; name: string; device: string; created: string; lastUsed: string }
export interface AuditEntry {
  id: string
  ts: string
  event: string
  detail: string
  kind: 'auth' | 'run' | 'config' | 'report'
  ip: string
  tx: string
  slot: number
}
export interface Player {
  handle: string
  email: string
  level: number
  xp: number // xp within current level
  totalXp: number
  streak: number
  bestStreak: number
  skills: Record<VectorId, number> // 0-100
  badges: string[]
  passkeys: Passkey[]
}
export interface GameState {
  auth: { email: string; stage: 'none' | 'mfa' | 'passkey' | 'done' }
  player: Player
  setup: { vectors: VectorId[]; difficulty: Difficulty }
  plan: IncidentPlan | null
  runs: RunResult[]
  audit: AuditEntry[]
}

/* ---------- helpers ---------- */
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
export const fakeTx = () => Array.from({ length: 88 }, () => B58[Math.floor(Math.random() * 58)]).join('')
export const shortTx = (tx: string) => `${tx.slice(0, 6)}…${tx.slice(-6)}`
export const xpForLevel = (lvl: number) => 500 + lvl * 250
export const fmtTime = (s: number) => {
  const v = Math.max(0, Math.floor(s))
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()
const fakeIp = () => `10.${20 + Math.floor(Math.random() * 30)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
let slotBase = 284_113_920
const nextSlot = () => (slotBase += 37 + Math.floor(Math.random() * 400))

export function gradeFor(pct: number): RunResult['grade'] {
  if (pct >= 92) return 'S'
  if (pct >= 80) return 'A'
  if (pct >= 65) return 'B'
  if (pct >= 45) return 'C'
  return 'D'
}

/* ---------- seed (demo data so the dashboard looks alive) ---------- */
function seedRun(daysAgo: number, codename: string, difficulty: Difficulty, vectors: VectorId[], score: number, max: number, acc: number): RunResult {
  return {
    id: `run-${daysAgo}-${codename}`,
    planId: `IR-${codename.slice(0, 3)}${daysAgo}`,
    codename, difficulty, vectors,
    finishedAt: ago(daysAgo * 1440 + 60),
    elapsed: 160 + daysAgo * 7,
    score, maxScore: max, accuracy: acc,
    grade: gradeFor((score / max) * 100),
    xpEarned: Math.round(score * DIFFICULTY[difficulty].xpMult),
    decisions: [], comms: [], missed: [], newBadges: [],
    tx: fakeTx(),
  }
}

export function seedState(): GameState {
  const runs = [
    seedRun(1, 'NEON TIDE', 'operator', ['phish', 'identity', 'malware', 'exfil'], 412, 520, 75),
    seedRun(2, 'SILENT RELAY', 'recruit', ['phish', 'insider', 'exfil'], 355, 390, 100),
    seedRun(4, 'CHROME VIPER', 'operator', ['identity', 'malware', 'insider', 'exfil', 'phish'], 398, 650, 60),
    seedRun(6, 'GHOST LEDGER', 'recruit', ['malware', 'exfil'], 190, 260, 50),
  ]
  const audit: AuditEntry[] = [
    { id: 'a1', ts: ago(1500), event: 'RUN_COMPLETE', detail: 'NEON TIDE · Operator · A', kind: 'run', ip: '10.24.8.17', tx: runs[0].tx, slot: nextSlot() },
    { id: 'a2', ts: ago(1510), event: 'MFA_APPROVED', detail: 'Duo push · iPhone 15', kind: 'auth', ip: '10.24.8.17', tx: fakeTx(), slot: nextSlot() },
    { id: 'a3', ts: ago(2900), event: 'REPORT_EXPORTED', detail: 'SILENT RELAY · PDF', kind: 'report', ip: '10.24.8.17', tx: fakeTx(), slot: nextSlot() },
    { id: 'a4', ts: ago(2920), event: 'RUN_COMPLETE', detail: 'SILENT RELAY · Recruit · S', kind: 'run', ip: '10.24.8.17', tx: runs[1].tx, slot: nextSlot() },
    { id: 'a5', ts: ago(5800), event: 'PASSKEY_REGISTERED', detail: 'YubiKey 5C NFC', kind: 'config', ip: '10.31.2.200', tx: fakeTx(), slot: nextSlot() },
    { id: 'a6', ts: ago(5810), event: 'LOGIN_SUCCESS', detail: 'Password + Duo', kind: 'auth', ip: '10.31.2.200', tx: fakeTx(), slot: nextSlot() },
  ].map((a, i) => ({ ...a, slot: slotBase - i * 1700 })) // newest first, slots descend with age
  return {
    auth: { email: '', stage: 'none' },
    player: {
      handle: 'gh0st_r1der',
      email: 'operator@halcyon.io',
      level: 7,
      xp: 1180,
      totalXp: 9640,
      streak: 4,
      bestStreak: 9,
      skills: { phish: 82, identity: 68, malware: 74, exfil: 55, insider: 61 },
      badges: ['first-blood', 'clean-sweep', 'comms-officer', 'chain-anchor'],
      passkeys: [{ id: 'pk1', name: 'YubiKey 5C NFC', device: 'Hardware key', created: ago(5800), lastUsed: ago(1510) }],
    },
    setup: { vectors: VECTORS.map(v => v.id), difficulty: 'operator' },
    plan: null,
    runs,
    audit,
  }
}

/* ---------- composable ---------- */
export function useGame() {
  const state = useState<GameState>('game', seedState)

  const player = computed(() => state.value.player)
  const lastRun = computed(() => state.value.runs[0] ?? null)
  const accuracy = computed(() => {
    const r = state.value.runs.slice(0, 10)
    return r.length ? Math.round(r.reduce((a, x) => a + x.accuracy, 0) / r.length) : 0
  })

  function audit(event: string, detail: string, kind: AuditEntry['kind'], tx = fakeTx()) {
    state.value.audit.unshift({ id: crypto.randomUUID(), ts: new Date().toISOString(), event, detail, kind, ip: fakeIp(), tx, slot: nextSlot() })
  }

  /* --- auth (mocked) --- */
  async function login(email: string, _password: string) {
    await new Promise(r => setTimeout(r, 700))
    state.value.auth = { email, stage: 'mfa' }
    state.value.player.email = email
    audit('LOGIN_PASSWORD_OK', 'Primary factor accepted', 'auth')
  }
  function approveMfa() {
    state.value.auth.stage = state.value.player.passkeys.length ? 'done' : 'passkey'
    audit('MFA_APPROVED', 'Duo push · mobile', 'auth')
  }
  function registerPasskey(name: string, device: string) {
    state.value.player.passkeys.push({ id: crypto.randomUUID(), name, device, created: new Date().toISOString(), lastUsed: new Date().toISOString() })
    state.value.auth.stage = 'done'
    audit('PASSKEY_REGISTERED', name, 'config')
  }
  function removePasskey(id: string) {
    const pk = state.value.player.passkeys.find(p => p.id === id)
    state.value.player.passkeys = state.value.player.passkeys.filter(p => p.id !== id)
    if (pk) audit('PASSKEY_REMOVED', pk.name, 'config')
  }
  function skipPasskey() { state.value.auth.stage = 'done' }
  function logout() { state.value.auth = { email: '', stage: 'none' } }

  /* --- incident lifecycle --- */
  function toggleVector(id: VectorId) {
    const v = state.value.setup.vectors
    state.value.setup.vectors = v.includes(id) ? v.filter(x => x !== id) : [...v, id]
  }
  function buildIncident() {
    state.value.plan = generateIncident(state.value.setup.vectors, state.value.setup.difficulty)
    return state.value.plan
  }

  function completeRun(plan: IncidentPlan, decisions: Decision[], comms: RunResult['comms'], elapsed: number): RunResult {
    const maxScore = plan.schedule.length * 110 + COMMS_ACTIONS.reduce((a, c) => a + c.points, 0)
    const raw = decisions.reduce((a, d) => a + d.points + d.speedBonus, 0) + comms.reduce((a, c) => a + c.points, 0)
    const score = Math.max(0, raw)
    const ideal = decisions.filter(d => d.rating === 'ideal').length
    const accuracy = plan.schedule.length ? Math.round((ideal / plan.schedule.length) * 100) : 0
    const grade = gradeFor((score / maxScore) * 100)
    const xpEarned = Math.round(score * DIFFICULTY[plan.difficulty].xpMult)
    const answered = new Set(decisions.map(d => d.injectId))
    const run: RunResult = {
      id: crypto.randomUUID(),
      planId: plan.id, codename: plan.codename, difficulty: plan.difficulty, vectors: plan.vectors,
      finishedAt: new Date().toISOString(), elapsed, score, maxScore, accuracy, grade, xpEarned,
      decisions, comms, missed: plan.schedule.map(s => s.injectId).filter(id => !answered.has(id)),
      newBadges: [], tx: fakeTx(),
    }
    // badges
    const p = state.value.player
    run.newBadges = BADGES.filter(b => b.earned && !p.badges.includes(b.id) && b.earned(run)).map(b => b.id)
    p.badges.push(...run.newBadges)
    // skills: nudge toward this run's per-vector performance
    for (const d of decisions) {
      const target = d.rating === 'ideal' ? 100 : d.rating === 'ok' ? 60 : 10
      p.skills[d.vector] = Math.round(p.skills[d.vector] * 0.7 + target * 0.3)
    }
    for (const id of run.missed) {
      const v = injectById(id).vector
      p.skills[v] = Math.round(p.skills[v] * 0.85)
    }
    // xp / level
    p.totalXp += xpEarned
    p.xp += xpEarned
    while (p.xp >= xpForLevel(p.level)) { p.xp -= xpForLevel(p.level); p.level++ }
    p.streak++
    p.bestStreak = Math.max(p.bestStreak, p.streak)

    state.value.runs.unshift(run)
    audit('RUN_COMPLETE', `${run.codename} · ${DIFFICULTY[run.difficulty].label} · ${run.grade}`, 'run', run.tx)
    return run
  }

  function resetDemo() { state.value = seedState() }

  return {
    state, player, lastRun, accuracy,
    login, approveMfa, registerPasskey, removePasskey, skipPasskey, logout,
    toggleVector, buildIncident, completeRun, audit, resetDemo,
  }
}
