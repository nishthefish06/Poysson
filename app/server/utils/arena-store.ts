/**
 * Arena rounds, kept in Nuxt server memory (fine for one Vultr box during the hackathon).
 * Step flags (truth labels) live ONLY here and never go to the browser.
 */
import { randomUUID } from 'node:crypto';
import type { ScenarioStep, StepFlag } from '@hackutd2026/shared';
import type { ArenaAction, ArenaLogEntry, ArenaMove, ArenaState, Judgment } from '@hackutd2026/shared/arena';

export interface ArenaRound {
  id: string;
  status: 'active' | 'finished';
  turn: number;
  startedAt: number;
  steps: Map<string, ScenarioStep>;
  flags: Map<string, StepFlag>;
  log: ArenaLogEntry[];
  judged: Set<string>; // "stepId:kind" already scored
  history: string[];
}

const rounds = new Map<string, ArenaRound>();

export function createRound(): ArenaRound {
  const r: ArenaRound = {
    id: randomUUID(),
    status: 'active',
    turn: 0,
    startedAt: Date.now(),
    steps: new Map(),
    flags: new Map(),
    log: [],
    judged: new Set(),
    history: [],
  };
  rounds.set(r.id, r);
  return r;
}

export function getRound(id: string): ArenaRound {
  const r = rounds.get(id);
  if (!r) throw createError({ statusCode: 404, statusMessage: 'Unknown arena round' });
  return r;
}

function push(r: ArenaRound, e: Omit<ArenaLogEntry, 'seq' | 'tMs'>) {
  r.log.push({ ...e, seq: r.log.length, tMs: Date.now() - r.startedAt });
}

export function applyMove(r: ArenaRound, m: ArenaMove) {
  if (m.narration)
    push(r, { type: 'narration', stepId: null, kind: null, verdict: null, points: 0, text: m.narration });
  for (const s of m.steps) {
    const flag = m.flags.find((f) => f.stepId === s.id);
    if (!flag) continue;
    r.steps.set(s.id, s);
    r.flags.set(s.id, flag);
    push(r, {
      type: 'step',
      stepId: s.id,
      kind: null,
      verdict: null,
      points: 0,
      text: `${s.channel} from ${s.from}`,
    });
    r.history.push(`sent ${s.channel} '${s.id}' (${flag.isMalicious ? m.attackType : 'benign'})`);
  }
  r.turn++;
  if (m.endRound) r.status = 'finished';
}

/** false if this exact step+action was already judged */
export function recordAction(r: ArenaRound, a: ArenaAction, j: Judgment): boolean {
  const key = `${a.stepId}:${a.kind}`;
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

export function toArenaState(r: ArenaRound): ArenaState {
  const judged = r.log.filter((e) => e.type === 'action' && e.verdict);
  const decisive = judged.filter((e) => e.verdict !== 'neutral');
  const good = decisive.filter((e) => e.verdict === 'ideal' || e.verdict === 'ok');
  return {
    sessionId: r.id,
    status: r.status,
    turn: r.turn,
    steps: [...r.steps.values()],
    log: r.log,
    score: judged.reduce((s, e) => s + e.points, 0),
    accuracy: decisive.length ? good.length / decisive.length : 0,
  };
}
