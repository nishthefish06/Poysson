/**
 * Which real-world incidents a round is modeled on (server/data/incidents.ts), and how they are
 * described to the attacker, the reveal and the debrief.
 */
import type { ArenaMode } from '@hackutd2026/shared/arena';
import { INCIDENTS, type Incident } from '../data/incidents';

/** Two different incidents that fit the mode (one if only one fits). `rand` is injectable for tests. */
export function pickIncidents(mode: ArenaMode, rand: () => number = Math.random): string[] {
  const pool = INCIDENTS.filter((i) => i.modes.includes(mode)).map((i) => i.id);
  const picked: string[] = [];
  while (picked.length < 2 && pool.length) picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!);
  return picked;
}

export function incidentsByIds(ids: readonly string[]): Incident[] {
  return ids.map((id) => INCIDENTS.find((i) => i.id === id)).filter((i): i is Incident => !!i);
}

/** The attacker's per-round playbook (no real company names; the model adapts it to the fiction). */
export function playbookForAttacker(ids: readonly string[]): string {
  const list = incidentsByIds(ids);
  if (!list.length) return '(none: use the angles in your instructions)';
  return list
    .map(
      (i, n) =>
        `${n === 0 ? 'LEAD WITH' : 'THEN, OR IF THAT FAILS'}: ${i.title} (${i.year}).\n  What happened: ${i.pattern}\n  How to play it here: ${i.play}\n  Leave these tells: ${i.tells}`
    )
    .join('\n');
}

/** One line per incident for the reveal and debrief: "<title> (<source>, <year>)". */
export function basedOnLines(ids: readonly string[]): string[] {
  return incidentsByIds(ids).map((i) => `${i.title} (${i.source.name}, ${i.year})`);
}
