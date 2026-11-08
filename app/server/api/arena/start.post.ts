import { z } from 'zod';
import { ArenaMode, type ArenaState } from '@hackutd2026/shared/arena';

const Body = z.object({ mode: ArenaMode.default('bait') });

// Starts a round in bait (clean) or breach (already compromised) mode; the attacker moves first.
// The round is mirrored to SpacetimeDB before responding; the browser then claims it for its
// account with claimArenaRound(sessionId, claimCode), and the page updates live from there.
export default defineEventHandler(async (event): Promise<ArenaState & { claimCode: string }> => {
  const { mode } = await parseBody(event, Body);
  const r = createRound(mode);
  await withRoundLock(r, () => attackerTurn(r, null));
  await syncRound(r);
  return { ...toArenaState(r), claimCode: r.claimCode };
});
