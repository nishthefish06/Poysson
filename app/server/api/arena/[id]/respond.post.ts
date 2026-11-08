import { EnvAction, type ArenaActionResponse } from '@hackutd2026/shared/arena';

// Employee acts inside the environment (revoke a session, delete a mail rule, revert a change, ...)
// -> judged by the engine's rules -> attacker reacts.
export default defineEventHandler(async (event): Promise<ArenaActionResponse> => {
  const r = getRound(getRouterParam(event, 'id') ?? '');
  const a = await parseBody(event, EnvAction);
  if (r.status !== 'active') throw createError({ statusCode: 409, statusMessage: 'Round is over' });

  return withRoundLock(r, async () => {
    const text = describeEnvAction(r.env, a); // before applying, while the target still exists
    let result;
    try {
      result = applyEnvAction(r.env, a, elapsed(r));
    } catch (e) {
      if (e instanceof EnvError) throw createError({ statusCode: 400, statusMessage: e.message });
      throw e;
    }
    const judgment = { ...result, confidence: 1, source: 'rule' as const };
    const counted = recordEnvAction(r, a, judgment, text);
    const guidance = guidanceFor(`${text}. ${judgment.reason}`, r.mode);
    if (counted) await attackerTurn(r, null, `${text} (${judgment.verdict})`);
    return { judgment, counted, state: toArenaState(r), guidance: await guidance };
  });
});
