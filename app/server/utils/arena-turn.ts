/**
 * One attacker turn: persistence rules -> Nemotron (or script) picks a move -> apply it.
 * And finishing a round: build the summary + debrief. Shared by all arena routes.
 */
import type { ArenaContext } from '@hackutd2026/shared/arena';

export async function attackerTurn(
  r: ArenaRound,
  lastAction: ArenaContext['lastAction'],
  lastEnvAction: string | null = null
) {
  for (const note of beforeAttackerTurn(r.env, elapsed(r))) r.history.push(`(${note})`);
  const move = await nextArenaMove({
    ctx: { turn: r.turn, lastAction, history: r.history.slice(-40) },
    lastEnvAction,
    mode: r.mode,
    onScreen: [...r.steps.values()],
    known: r.flags,
    access: hasAccess(r.env),
    view: attackerView(r.env),
    doneTools: new Set(r.env.truth.records.map((x) => x.kind)),
  });
  applyMove(r, move);
  if (r.status === 'finished') await finishRound(r);
}

/** Idempotent: ends the round and writes the summary once. */
export async function finishRound(r: ArenaRound) {
  r.status = 'finished';
  if (r.summary) return;
  const facts = summaryFacts(r);
  const { text, source } = await writeDebrief(facts, score(r));
  r.summary = { ...facts, debrief: text, debriefSource: source };
}
