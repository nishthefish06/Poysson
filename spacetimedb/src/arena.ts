// Arena rounds, mirrored from the Nuxt server (which runs the Nemotron attacker) so the employee's
// page and admins see every move as it happens.
//   Nuxt server (service): syncArenaRound after every change to a round.
//   Employee's browser:    claimArenaRound with the code the start request returned, which ties
//                          the round to their account.
import { SenderError, t } from 'spacetimedb/server';
import spacetimedb from './schema';
import { assertLength, isService, requireAccount } from './access';
import { constantTimeEqual } from './crypto';

const ArenaLogLine = t.object('ArenaLogLine', {
  seq: t.u32(),
  tMs: t.u32(),
  type: t.string(),
  verdict: t.string(),
  points: t.i32(),
  text: t.string(),
});

export const syncArenaRound = spacetimedb.reducer(
  {
    roundKey: t.string(),
    claimCode: t.string(),
    mode: t.string(),
    status: t.string(),
    turn: t.u32(),
    score: t.i32(),
    accuracy: t.f64(),
    attackerLive: t.bool(),
    thinking: t.bool(),
    outcome: t.string(),
    stateJson: t.string(),
    newLog: t.array(ArenaLogLine),
  },
  (ctx, { roundKey, claimCode, newLog, ...fields }) => {
    if (!isService(ctx)) throw new SenderError('only the arena service can sync rounds');
    assertLength(roundKey, 'roundKey', 64, 1);
    assertLength(fields.stateJson, 'stateJson', 1_000_000, 2);
    const existing = ctx.db.arenaRound.roundKey.find(roundKey);
    const round = existing
      ? ctx.db.arenaRound.id.update({
          ...existing,
          ...fields,
          rev: existing.rev + 1,
          updatedAt: ctx.timestamp,
        })
      : ctx.db.arenaRound.insert({
          id: 0n,
          roundKey,
          claimCode,
          accountId: 0n,
          ...fields,
          rev: 1,
          startedAt: ctx.timestamp,
          updatedAt: ctx.timestamp,
        });
    const logged = new Set([...ctx.db.arenaLog.roundId.filter(round.id)].map((l) => l.seq));
    for (const line of newLog) {
      if (logged.has(line.seq)) continue;
      ctx.db.arenaLog.insert({
        id: 0n,
        roundId: round.id,
        ...line,
        text: line.text.slice(0, 2000),
        at: ctx.timestamp,
      });
    }
  }
);

export const claimArenaRound = spacetimedb.reducer(
  { roundKey: t.string(), claimCode: t.string() },
  (ctx, { roundKey, claimCode }) => {
    const me = requireAccount(ctx);
    const round = ctx.db.arenaRound.roundKey.find(roundKey);
    if (!round || !constantTimeEqual(claimCode, round.claimCode))
      throw new SenderError('no such arena round');
    if (round.accountId === me.id) return;
    if (round.accountId !== 0n) throw new SenderError('this round belongs to someone else');
    ctx.db.arenaRound.id.update({ ...round, accountId: me.id });
  }
);
