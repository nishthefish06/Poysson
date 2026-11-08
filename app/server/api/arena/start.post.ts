import { z } from 'zod';
import { ArenaMode } from '@hackutd2026/shared/arena';

const Body = z.object({ mode: ArenaMode.default('bait') });

// Starts a round in bait (clean) or breach (already compromised) mode; the attacker moves first.
// TODO (Person 1/4): use the signed-in employee's name and tie the round to their account.
export default defineEventHandler(async (event) => {
  const { mode } = await parseBody(event, Body);
  const r = createRound(mode);
  await withRoundLock(r, () => attackerTurn(r, null));
  return toArenaState(r);
});
