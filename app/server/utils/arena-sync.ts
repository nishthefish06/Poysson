/**
 * Mirrors arena rounds into SpacetimeDB so the employee's page (and admins) get every attacker
 * move live. The Nuxt server connects once, registers as the service with SERVICE_SECRET, then
 * calls syncArenaRound after each change. Without a secret or a reachable database, syncing is
 * skipped and the arena still works over plain HTTP.
 */
import { DbConnection } from '../../module_bindings';

const RETRY_MS = 15_000;
let pending: Promise<DbConnection | null> | null = null;
let failedAt = 0;

function connect(): Promise<DbConnection | null> {
  const c = useRuntimeConfig();
  if (!c.serviceSecret) return Promise.resolve(null);
  return new Promise((resolve) => {
    const fail = (why: string) => {
      console.warn(`[arena-sync] SpacetimeDB unavailable (${why}); rounds stay HTTP-only`);
      failedAt = Date.now();
      pending = null;
      resolve(null);
    };
    DbConnection.builder()
      .withUri(c.spacetimeInternalUrl)
      .withDatabaseName(c.public.spacetimeDb)
      .onConnect((conn) => {
        conn.reducers
          .registerService({ secret: c.serviceSecret, label: 'nuxt-arena' })
          .then(() => resolve(conn))
          .catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
      })
      .onConnectError((_ctx, e) => fail(e.message))
      .onDisconnect(() => {
        pending = null; // reconnect on the next sync
      })
      .build();
  });
}

function service(): Promise<DbConnection | null> {
  if (!pending && Date.now() - failedAt > RETRY_MS) pending = connect();
  return pending ?? Promise.resolve(null);
}

/** Writes the round's current browser-safe state and any new log lines. Never throws. */
export async function syncRound(r: ArenaRound): Promise<void> {
  const conn = await service();
  if (!conn) return;
  r.rev++;
  const state = toArenaState(r);
  const newLog = r.log.slice(r.syncedSeq).map((l) => ({
    seq: l.seq,
    tMs: l.tMs,
    type: l.type,
    verdict: l.verdict ?? '',
    points: l.points,
    text: l.text,
  }));
  try {
    await conn.reducers.syncArenaRound({
      roundKey: r.id,
      claimCode: r.claimCode,
      mode: r.mode,
      status: r.status,
      turn: r.turn,
      score: state.score,
      accuracy: state.accuracy,
      attackerLive: r.attackerLive,
      thinking: r.thinking,
      outcome: r.summary?.outcome ?? '',
      stateJson: JSON.stringify(state),
      newLog,
    });
    r.syncedSeq = Math.max(r.syncedSeq, r.log.length);
  } catch (e) {
    console.warn('[arena-sync] sync failed:', e instanceof Error ? e.message : e);
  }
}
