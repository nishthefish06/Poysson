// Starts an arena round and claims it for the signed-in account, so it's stored with them in
// SpacetimeDB and the round page updates live. Signed out (dev bypass), the round still works,
// just without the live mirror.
import { useReducer } from 'spacetimedb/vue';
import type { ArenaMode, ArenaState } from '@hackutd2026/shared/arena';
import { reducers } from '~/module_bindings';

export function useStartArenaRound() {
  const claim = useReducer(reducers.claimArenaRound);
  const { account } = useSession();
  return async (mode: ArenaMode): Promise<ArenaState> => {
    const s = await $fetch<ArenaState & { claimCode: string }>('/api/arena/start', {
      method: 'POST',
      body: { mode },
    });
    if (account.value) {
      try {
        await claim({ roundKey: s.sessionId, claimCode: s.claimCode });
      } catch (e) {
        console.warn('[arena] could not claim round:', e);
      }
    }
    return s;
  };
}
