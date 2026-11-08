// Employee ends the round. TODO (Person 4): kick off AI feedback on the round here.
export default defineEventHandler((event) => {
  const r = getRound(getRouterParam(event, 'id') ?? '');
  r.status = 'finished';
  return toArenaState(r);
});
