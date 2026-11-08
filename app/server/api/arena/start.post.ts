// Starts an arena round; the attacker makes the first move.
// TODO (Person 1/4): tie rounds to the signed-in account (e.g. pass the SpacetimeDB identity and
// check it), and optionally save the final score to SpacetimeDB.
export default defineEventHandler(async () => {
  const r = createRound();
  applyMove(r, await nextArenaMove({ turn: 0, lastAction: null, history: [] }));
  return toArenaState(r);
});
