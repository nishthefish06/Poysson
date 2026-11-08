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
  /** on-chain status of this run's RUN_COMPLETE record (missing on old saves = demo) */
  anchor?: AnchorState
}
export interface Passkey { id: string; name: string; device: string; created: string; lastUsed: string }
/**
 * Where an audit record stands on Solana:
 *   demo     seeded sample data with a made-up tx (never claims to be verified)
 *   pending  sent to /api/solana/anchor, waiting for the transaction
 *   anchored its hash is in a devnet memo transaction (tx + slot are real)
 *   failed   anchoring failed (wallet unfunded, RPC down…); can be retried
 */
export type AnchorState = 'demo' | 'pending' | 'anchored' | 'failed'
export interface AuditEntry {
  id: string
  ts: string
  event: string
  detail: string
  kind: 'auth' | 'run' | 'config' | 'report'
  ip: string
  tx: string
  slot: number
  anchor?: AnchorState
  anchorError?: string
  /** RUN_COMPLETE records point at their run so the run gets the real tx too */
  runId?: string
}
/** Records saved before anchoring existed have no status: treat them as demo data. */
export const anchorOf = (x: { anchor?: AnchorState }): AnchorState => x.anchor ?? 'demo'
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
  /** Solana wallet that receives badge credentials (public address only) */
  wallet?: string
  /** on-chain badge credentials by badge id */
  credentials?: Record<string, BadgeCredential>
}
/**
 * A badge minted as a soulbound Token-2022 token (server/utils/solana-badges.ts).
 *   minting  request sent      minted  1 token is in the wallet (mint/account are real)
 *   failed   could not mint (error says why); can be retried
 */
export interface BadgeCredential {
  status: 'minting' | 'minted' | 'failed'
  mint?: string
  account?: string
  tx?: string | null
  error?: string
}
/** guided: red flags + analyst tip shown before you respond. unguided: the classic blind run. */
export type SimMode = 'guided' | 'unguided'

export interface GameState {
  auth: { email: string; stage: 'none' | 'mfa' | 'passkey' | 'done' }
  player: Player
  setup: { vectors: VectorId[]; difficulty: Difficulty; mode: SimMode }
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
    tx: fakeTx(), anchor: 'demo',
  }
}

export function seedState(): GameState {
  const runs = [
    seedRun(1, 'NEON TIDE', 'operator', ['phish', 'identity', 'malware', 'exfil'], 412, 520, 75),
    seedRun(2, 'SILENT RELAY', 'recruit', ['phish', 'insider', 'exfil'], 355, 390, 100),
    seedRun(4, 'CHROME VIPER', 'operator', ['identity', 'malware', 'insider', 'exfil', 'phish'], 398, 650, 60),
    seedRun(6, 'GHOST LEDGER', 'recruit', ['malware', 'exfil'], 190, 260, 50),
  ]
  const audit: AuditEntry[] = ([
    { id: 'a1', ts: ago(1500), event: 'RUN_COMPLETE', detail: 'NEON TIDE · Operator · A', kind: 'run', ip: '10.24.8.17', tx: runs[0].tx, slot: nextSlot(), runId: runs[0].id },
    { id: 'a2', ts: ago(1510), event: 'MFA_APPROVED', detail: 'Duo push · iPhone 15', kind: 'auth', ip: '10.24.8.17', tx: fakeTx(), slot: nextSlot() },
    { id: 'a3', ts: ago(2900), event: 'REPORT_EXPORTED', detail: 'SILENT RELAY · PDF', kind: 'report', ip: '10.24.8.17', tx: fakeTx(), slot: nextSlot() },
    { id: 'a4', ts: ago(2920), event: 'RUN_COMPLETE', detail: 'SILENT RELAY · Recruit · S', kind: 'run', ip: '10.24.8.17', tx: runs[1].tx, slot: nextSlot(), runId: runs[1].id },
    { id: 'a6', ts: ago(5810), event: 'LOGIN_SUCCESS', detail: 'Password + Duo', kind: 'auth', ip: '10.31.2.200', tx: fakeTx(), slot: nextSlot() },
  ] satisfies AuditEntry[]).map(a => ({ ...a, tx: '', slot: 0, anchor: 'pending' as const })) // sample history is anchored for real on first load
  // the two runs those records point at get their real tx when the records are anchored
  for (const r of runs.slice(0, 2)) Object.assign(r, { tx: '', anchor: 'pending' as const })
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
    setup: { vectors: VECTORS.map(v => v.id), difficulty: 'operator', mode: 'guided' },
    plan: null,
    runs,
    audit,
  }
}

/* ---------- composable ---------- */
export function useGame() {
  const state = useState<GameState>('game', seedState)

  // Name and email come from the signed-in account; the rest of the player is still sample data.
  const { account } = useSession()
  const player = computed(() => {
    const p = state.value.player
    const a = account.value
    return a ? { ...p, handle: a.displayName, email: a.email } : p
  })
  const lastRun = computed(() => state.value.runs[0] ?? null)
  const accuracy = computed(() => {
    const r = state.value.runs.slice(0, 10)
    return r.length ? Math.round(r.reduce((a, x) => a + x.accuracy, 0) / r.length) : 0
  })

  /* --- audit log, anchored on Solana devnet (server/api/solana) --- */
  function audit(event: string, detail: string, kind: AuditEntry['kind'], runId?: string) {
    const entry: AuditEntry = {
      id: crypto.randomUUID(), ts: new Date().toISOString(), event, detail, kind, ip: fakeIp(),
      tx: '', slot: 0, anchor: 'pending', runId,
    }
    state.value.audit.unshift(entry)
    void anchorEntry(entry.id)
    return entry.id
  }

  /** Sends one record's fingerprint to the server, which writes its hash in a memo transaction. */
  async function anchorEntry(id: string) {
    const find = () => state.value.audit.find(a => a.id === id)
    const e = find()
    if (!e) return
    e.anchor = 'pending'
    e.anchorError = undefined
    try {
      const r = await $fetch<{ tx: string; slot: number; hash: string }>('/api/solana/anchor', {
        method: 'POST',
        body: { id: e.id, ts: e.ts, event: e.event, detail: e.detail, kind: e.kind },
      })
      const live = find()
      if (!live) return
      Object.assign(live, { tx: r.tx, slot: r.slot, anchor: 'anchored' as const })
      const run = live.runId ? state.value.runs.find(x => x.id === live.runId) : undefined
      if (run) Object.assign(run, { tx: r.tx, anchor: 'anchored' as const })
    } catch (err) {
      const live = find()
      if (!live) return
      live.anchor = 'failed'
      live.anchorError = (err as { statusMessage?: string })?.statusMessage ?? 'Could not reach Solana'
      const run = live.runId ? state.value.runs.find(x => x.id === live.runId) : undefined
      if (run) run.anchor = 'failed'
    }
  }

  /**
   * Older saves marked the sample history as 'demo' with made-up transactions. Turn those into
   * real pending records (and link sample runs to their records) so they get anchored too.
   */
  function promoteSamples() {
    // The sample 'YubiKey 5C NFC' passkey event was dropped; remove it from older saves too.
    state.value.audit = state.value.audit.filter(e => e.id !== 'a5')
    for (const e of state.value.audit) {
      if (anchorOf(e) !== 'demo') continue
      Object.assign(e, { tx: '', slot: 0, anchor: 'pending' as const })
      if (e.event === 'RUN_COMPLETE' && !e.runId) {
        const run = state.value.runs.find(r => anchorOf(r) === 'demo' && e.detail.startsWith(r.codename))
        if (run) { e.runId = run.id; Object.assign(run, { tx: '', anchor: 'pending' as const }) }
      }
    }
  }

  /**
   * Re-sends anything left pending (page closed mid-request) or failed, one record at a time.
   * Skipped when the server has no Solana wallet; stops early if devnet rate-limits or errors,
   * and the rest stay "retry" until the next load.
   */
  let retrying = false
  async function retryAnchors() {
    if (retrying) return
    retrying = true
    try {
      promoteSamples()
      const status = await $fetch<{ configured: boolean }>('/api/solana/status').catch(() => ({ configured: false }))
      if (!status.configured) return
      for (const e of [...state.value.audit].reverse()) {
        if (e.anchor !== 'pending' && e.anchor !== 'failed') continue
        await anchorEntry(e.id)
        if (state.value.audit.find(a => a.id === e.id)?.anchor === 'failed') break
      }
    } finally {
      retrying = false
    }
  }

  /** Re-hashes the record as it is now and checks it against its on-chain memo. */
  async function verifyEntry(id: string): Promise<{ ok: boolean; reason?: string }> {
    const e = state.value.audit.find(a => a.id === id)
    if (!e) return { ok: false, reason: 'record not found' }
    if (anchorOf(e) === 'demo') return { ok: false, reason: 'sample data, never anchored' }
    if (anchorOf(e) !== 'anchored') return { ok: false, reason: 'not anchored yet' }
    try {
      return await $fetch<{ ok: boolean; reason?: string }>('/api/solana/verify', {
        method: 'POST',
        body: { tx: e.tx, id: e.id, ts: e.ts, event: e.event, detail: e.detail, kind: e.kind },
      })
    } catch (err) {
      return { ok: false, reason: (err as { statusMessage?: string })?.statusMessage ?? 'Could not reach Solana' }
    }
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
    state.value.plan = generateIncident(state.value.setup.vectors, state.value.setup.difficulty, state.value.setup.mode ?? 'guided')
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
      newBadges: [], tx: '', anchor: 'pending',
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
    // new badges go straight to the player's wallet as on-chain credentials
    for (const id of run.newBadges) void mintBadge(id)
    // the run's tx arrives when its audit record is anchored (see anchorEntry)
    audit('RUN_COMPLETE', `${run.codename} · ${DIFFICULTY[run.difficulty].label} · ${run.grade}`, 'run', run.id)
    return run
  }

  /* --- badge credentials on Solana (soulbound tokens) --- */
  function setWallet(address: string | undefined) {
    const p = state.value.player
    if (p.wallet !== address) p.credentials = {} // a new wallet holds its own credentials
    p.wallet = address
  }

  /** Mints badge `id` to the connected wallet (no-op if already minted there). */
  async function mintBadge(id: string) {
    const p = state.value.player
    if (!p.wallet || !p.badges.includes(id)) return
    p.credentials ??= {}
    if (p.credentials[id]?.status === 'minted' || p.credentials[id]?.status === 'minting') return
    const wallet = p.wallet
    p.credentials[id] = { status: 'minting' }
    try {
      const r = await $fetch<{ mint: string; account: string; tx: string | null }>('/api/solana/badge', {
        method: 'POST',
        body: { badge: id, owner: wallet },
      })
      if (state.value.player.wallet !== wallet) return // wallet changed mid-flight
      state.value.player.credentials![id] = { status: 'minted', mint: r.mint, account: r.account, tx: r.tx }
    } catch (err) {
      if (state.value.player.wallet !== wallet) return
      state.value.player.credentials![id] = {
        status: 'failed',
        error: (err as { statusMessage?: string })?.statusMessage ?? 'Could not reach Solana',
      }
    }
  }

  /** Mints every earned badge that isn't on-chain yet, one after another (each is its own tx). */
  async function mintAllBadges() {
    for (const id of [...state.value.player.badges]) await mintBadge(id)
  }

  /** Reads which credentials the wallet really holds on-chain (source of truth over local state). */
  async function refreshCredentials() {
    const p = state.value.player
    if (!p.wallet) return
    const wallet = p.wallet
    try {
      const r = await $fetch<{ badges: { badge: string; mint: string; account: string }[] }>('/api/solana/badges', { query: { owner: wallet } })
      if (state.value.player.wallet !== wallet) return
      const creds = { ...(state.value.player.credentials ?? {}) }
      for (const b of r.badges) creds[b.badge] = { ...creds[b.badge], status: 'minted', mint: b.mint, account: b.account }
      // anything we thought was minted but the chain doesn't have goes back to unminted
      for (const [id, c] of Object.entries(creds)) {
        if (c.status === 'minted' && !r.badges.some(b => b.badge === id)) delete creds[id]
      }
      state.value.player.credentials = creds
    } catch { /* offline / not configured: keep local view */ }
  }

  function resetDemo() { state.value = seedState() }

  return {
    state, player, lastRun, accuracy,
    login, approveMfa, registerPasskey, removePasskey, skipPasskey, logout,
    toggleVector, buildIncident, completeRun, audit, anchorEntry, retryAnchors, verifyEntry,
    setWallet, mintBadge, mintAllBadges, refreshCredentials, resetDemo,
  }
}
