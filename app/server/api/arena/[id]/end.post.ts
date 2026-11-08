// Employee ends the round: reveals the summary (what the attacker did, what's still compromised, debrief).
export default defineEventHandler(async (event) => {
  const r = getRound(getRouterParam(event, 'id') ?? '');
  if (r.summary) return toArenaState(r);
  return withRoundLock(r, async () => {
    await finishRound(r);
    return toArenaState(r);
  });
});
