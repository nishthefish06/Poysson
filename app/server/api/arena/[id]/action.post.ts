import { ArenaAction, type ArenaActionResponse } from '@hackutd2026/shared/arena';

// Employee acts on a step -> judged (rules, then model) -> attacker reacts.
export default defineEventHandler(async (event): Promise<ArenaActionResponse> => {
  const r = getRound(getRouterParam(event, 'id') ?? '');
  const a = await parseBody(event, ArenaAction);
  if (r.status !== 'active') throw createError({ statusCode: 409, statusMessage: 'Round is over' });
  const flag = r.flags.get(a.stepId);
  if (!flag) throw createError({ statusCode: 400, statusMessage: 'Unknown step' });

  const judgment = ruleJudge(flag, a) ?? (await modelJudge(flag, a));
  const counted = recordAction(r, a, judgment);

  if (counted && a.kind !== 'opened_step' && a.kind !== 'note') {
    applyMove(r, await nextArenaMove({ turn: r.turn, lastAction: a, history: r.history.slice(-40) }));
  }
  return { judgment, counted, state: toArenaState(r) };
});
