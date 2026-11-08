import { ArenaAction, type ArenaActionResponse } from '@hackutd2026/shared/arena';

// Employee acts on a message -> judged (rules, then model) -> attacker reacts (after the response).
export default defineEventHandler(async (event): Promise<ArenaActionResponse> => {
  const r = getRound(getRouterParam(event, 'id') ?? '');
  const a = await parseBody(event, ArenaAction);
  if (r.status !== 'active') throw createError({ statusCode: 409, statusMessage: 'Round is over' });
  const flag = r.flags.get(a.stepId);
  const step = r.steps.get(a.stepId);
  if (!flag || !step) throw createError({ statusCode: 400, statusMessage: 'Unknown step' });

  return withRoundLock(r, async () => {
    const judgment = ruleJudge(flag, a) ?? (await modelJudge(step, flag, a));
    const counted = recordAction(r, a, judgment);

    // Falling for an attack hands over the account: typing the password into the attacker's page,
    // or doing what the attacker asked (sending the code, "verifying" the login).
    if (
      counted &&
      (a.kind === 'shared_credentials' || a.kind === 'complied_request') &&
      flag.isMalicious &&
      leakCredentials(r.env, elapsed(r))
    ) {
      r.history.push(
        a.kind === 'shared_credentials'
          ? `(the employee submitted your fake login page '${a.stepId}': you now have their password and are signed in)`
          : `(the employee did what '${a.stepId}' asked and handed you their sign-in: you are now signed in to their account)`
      );
    }
    // the attacker only reacts to real decisions, not to opening a message or taking a note
    const decision = a.kind !== 'opened_step' && a.kind !== 'note';
    // look up the runbook section while the attacker moves
    const guidance = decision
      ? guidanceFor(`${step.channel} ${a.kind.replaceAll('_', ' ')}. ${judgment.reason}`, r.mode)
      : Promise.resolve(null);
    // the attacker answers right after this response, live through SpacetimeDB
    if (counted && decision) moveAfterResponse(r, () => attackerTurn(r, a));
    return { judgment, counted, state: toArenaState(r), guidance: await guidance };
  });
});
