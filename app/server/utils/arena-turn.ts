/**
 * One attacker turn: persistence rules -> Nemotron (or script) picks a move -> apply it.
 * And finishing a round: build the summary + debrief. Shared by all arena routes.
 */
import type { ArenaContext, ArenaMode, ArenaSummary, RunbookRef } from '@hackutd2026/shared/arena';

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
  const mistakes = r.log.filter((e) => e.verdict === 'harmful').map((e) => e.text);
  const runbook = await debriefRunbook(facts, r.mode, mistakes);
  const { text, source } = await writeDebrief(facts, score(r), runbook);
  r.summary = { ...facts, debrief: text, debriefSource: source, runbook };
}

/** Runbook sections for what went wrong (or, if nothing did, for what went right). Never throws. */
export async function debriefRunbook(
  facts: Omit<ArenaSummary, 'debrief' | 'debriefSource' | 'runbook'>,
  mode: ArenaMode,
  mistakes: string[] = []
): Promise<RunbookRef[]> {
  const missed = facts.messages.filter((m) => !m.handledWell);
  const left = facts.attackerActions.filter((a) => !a.remediated);
  // Root causes first (the harmful things the employee did), then what is still broken.
  const queries = [
    ...mistakes,
    ...left.map((a) => a.text),
    ...missed.map((m) => `${m.title}. ${m.redFlags.join(', ')}`),
  ];
  if (!queries.length)
    queries.push(
      facts.attackerActions.length ? 'cut access in the right order, report' : 'report suspicious messages'
    );
  const seen = new Map<string, RunbookRef>();
  for (const q of queries.slice(0, 4)) {
    try {
      for (const h of await searchRunbooks(q, { k: 2, audience: audienceFor(mode) }))
        if (!seen.has(h.passage.id)) seen.set(h.passage.id, runbookRef(h));
    } catch (e) {
      console.warn('[runbooks] debrief search failed:', e instanceof Error ? e.message : e);
    }
  }
  return [...seen.values()].slice(0, 3);
}
