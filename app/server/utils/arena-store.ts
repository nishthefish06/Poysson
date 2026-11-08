/**
 * Arena rounds, kept in Nuxt server memory (fine for one Vultr box during the hackathon).
 * Step flags (truth labels) and the environment's truth live ONLY here; the browser gets
 * toArenaState(), which reveals the truth only in `summary`, after the round is over.
 */
import { randomUUID } from 'node:crypto';
import type { ScenarioStep, StepFlag } from '@hackutd2026/shared';
import type {
  ArenaAction,
  ArenaLogEntry,
  ArenaMode,
  ArenaMove,
  ArenaState,
  ArenaSummary,
  EnvAction,
  Judgment,
} from '@hackutd2026/shared/arena';

export interface ArenaRound {
  id: string;
  mode: ArenaMode;
  status: 'active' | 'finished';
  turn: number;
  startedAt: number;
  steps: Map<string, ScenarioStep>;
  flags: Map<string, StepFlag>;
  log: ArenaLogEntry[];
  // bumps each time the attacker continues a thread (same step id), so a NEW message in the
  // same thread can be judged again
  versions: Map<string, number>;
  judged: Set<string>; // "stepId@version:kind" / "env:action:target" already scored
  history: string[]; // what the attacker model sees about past turns
  busy: boolean; // true while judging / the attacker is moving (blocks double-clicks)
  env: Env;
  summary: ArenaSummary | null;
}

const rounds = new Map<string, ArenaRound>();
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function createRound(mode: ArenaMode, employeeName = 'You'): ArenaRound {
  const now = Date.now();
  for (const [id, old] of rounds) if (now - old.startedAt > MAX_AGE_MS) rounds.delete(id);
  const r: ArenaRound = {
    id: randomUUID(),
    mode,
    status: 'active',
    turn: 0,
    startedAt: now,
    steps: new Map(),
    flags: new Map(),
    log: [],
    versions: new Map(),
    judged: new Set(),
    history: [],
    busy: false,
    env: seedEnv(mode, employeeName),
    summary: null,
  };
  rounds.set(r.id, r);
  return r;
}

export function getRound(id: string): ArenaRound {
  const r = rounds.get(id);
  if (!r) throw createError({ statusCode: 404, statusMessage: 'Unknown arena round' });
  return r;
}

/** ms since the round started (the environment's clock) */
export const elapsed = (r: ArenaRound) => Date.now() - r.startedAt;

function push(r: ArenaRound, e: Omit<ArenaLogEntry, 'seq' | 'tMs'>) {
  r.log.push({ ...e, seq: r.log.length, tMs: elapsed(r) });
}

/** Runs `fn` while holding the round's lock; a second request meanwhile gets a 409. */
export async function withRoundLock<T>(r: ArenaRound, fn: () => Promise<T>): Promise<T> {
  if (r.busy) throw createError({ statusCode: 409, statusMessage: 'One sec: the attacker is still moving' });
  r.busy = true;
  try {
    return await fn();
  } finally {
    r.busy = false;
  }
}

/**
 * Most distinct messages a round can hold. The model likes to send new mail every turn; past this
 * the inbox buries the actual exercise (in Breach, the cleanup). Continuing a thread is always allowed.
 */
export const MAX_MESSAGES = { bait: 8, breach: 5 } as const;

export function applyMove(r: ArenaRound, m: ArenaMove) {
  if (m.narration)
    push(r, { type: 'narration', stepId: null, kind: null, verdict: null, points: 0, text: m.narration });
  for (const s of m.steps) {
    const flag = m.flags.find((f) => f.stepId === s.id);
    if (!flag) continue;
    const continued = r.steps.has(s.id);
    if (!continued && r.steps.size >= MAX_MESSAGES[r.mode]) {
      r.history.push(
        `(inbox full: '${s.id}' was not delivered; continue an existing thread or use your tools)`
      );
      continue;
    }
    r.versions.set(s.id, (r.versions.get(s.id) ?? 0) + 1);
    r.steps.set(s.id, s);
    r.flags.set(s.id, flag);
    push(r, {
      type: 'step',
      stepId: s.id,
      kind: null,
      verdict: null,
      points: 0,
      text: `${continued ? 'new message in' : s.channel + ' from'} ${s.from}`,
    });
    r.history.push(`sent ${s.channel} '${s.id}' (${flag.isMalicious ? m.attackType : 'benign'})`);
  }
  if (m.tools.length) {
    const { applied, rejected } = applyAttackerTools(r.env, m.tools, elapsed(r));
    for (const a of applied) r.history.push(`you ${a}`);
    for (const x of rejected) r.history.push(`tool failed: ${x}`);
  }
  r.turn++;
  if (m.endRound) r.status = 'finished';
}

/** false if this exact action was already judged on this version of the step */
export function recordAction(r: ArenaRound, a: ArenaAction, j: Judgment): boolean {
  const key = `${a.stepId}@${r.versions.get(a.stepId) ?? 1}:${a.kind}`;
  if (r.judged.has(key)) return false;
  r.judged.add(key);
  push(r, {
    type: 'action',
    stepId: a.stepId,
    kind: a.kind,
    verdict: j.verdict,
    points: j.points,
    text: j.reason,
  });
  r.history.push(`employee ${a.kind} on '${a.stepId}': ${j.verdict}`);
  return true;
}

/**
 * Logs an environment action. Most actions remove their target, so they can't repeat; the one
 * that can (revoking your own current session) is only penalized once.
 */
export function recordEnvAction(r: ArenaRound, a: EnvAction, j: Judgment, text: string): boolean {
  const target =
    'sessionId' in a
      ? a.sessionId
      : 'deviceId' in a
        ? a.deviceId
        : 'ruleId' in a
          ? a.ruleId
          : 'changeId' in a
            ? a.changeId
            : null;
  if (target) {
    const key = `env:${a.action}:${target}`;
    if (r.judged.has(key)) return false;
    r.judged.add(key);
  }
  push(r, {
    type: 'env',
    stepId: null,
    kind: null,
    verdict: j.verdict,
    points: j.points,
    text: `${text}: ${j.reason}`,
  });
  r.history.push(`employee ${text}: ${j.verdict}`);
  return true;
}

function scored(r: ArenaRound) {
  return r.log.filter((e) => (e.type === 'action' || e.type === 'env') && e.verdict);
}

export function score(r: ArenaRound): number {
  return scored(r).reduce((s, e) => s + e.points, 0);
}

export function accuracy(r: ArenaRound): number {
  const decisive = scored(r).filter((e) => e.verdict !== 'neutral');
  const good = decisive.filter((e) => e.verdict === 'ideal' || e.verdict === 'ok');
  return decisive.length ? good.length / decisive.length : 0;
}

const SAFE_KINDS = new Set([
  'reported_suspicious',
  'refused_request',
  'blocked_sender',
  'verified_identity',
  'escalated',
]);
const DISTRUST_KINDS = new Set(['reported_suspicious', 'refused_request', 'blocked_sender']);

/** Everything the summary needs except the written debrief. Reveals the truth: only call once finished. */
export function summaryFacts(r: ArenaRound): Omit<ArenaSummary, 'debrief' | 'debriefSource' | 'runbook'> {
  const result = outcome(r.env);
  const records = r.env.truth.records;
  const stillThere = records.filter((x) => !isRemediated(r.env, x)).length;
  const headline =
    result === 'clean'
      ? r.mode === 'breach'
        ? 'Clean.'
        : 'Clean: the attacker never got into your account.'
      : result === 'contained'
        ? 'Contained: you locked the attacker out and undid the damage.'
        : `Still compromised: ${stillThere} thing${stillThere === 1 ? '' : 's'} the attacker did ${stillThere === 1 ? 'is' : 'are'} still in place${hasAccess(r.env) ? ', and they still have access' : ''}.`;
  const messages = [...r.steps.values()].map((s) => {
    const flag = r.flags.get(s.id)!;
    const acts = r.log.filter((e) => e.type === 'action' && e.stepId === s.id);
    const harmful = acts.some((e) => e.verdict === 'harmful');
    const decided = acts.some((e) => e.kind !== 'opened_step' && e.kind !== 'note');
    const handledWell = flag.isMalicious
      ? !harmful && acts.some((e) => e.kind !== null && SAFE_KINDS.has(e.kind))
      : !harmful && !acts.some((e) => e.kind !== null && DISTRUST_KINDS.has(e.kind));
    return {
      stepId: s.id,
      title: s.subject || s.from,
      malicious: flag.isMalicious,
      redFlags: [...flag.redFlags],
      handledWell,
      ignored: flag.isMalicious && !decided,
    };
  });
  return {
    outcome: result,
    headline,
    attackerActions: records.map((x) => ({
      text: x.text,
      remediated: isRemediated(r.env, x),
      undoable: x.undoable,
    })),
    messages,
  };
}

export function toArenaState(r: ArenaRound): ArenaState {
  return {
    sessionId: r.id,
    mode: r.mode,
    status: r.status,
    turn: r.turn,
    steps: [...r.steps.values()],
    world: structuredClone(r.env.world),
    log: r.log,
    score: score(r),
    accuracy: accuracy(r),
    summary: r.summary,
  };
}
