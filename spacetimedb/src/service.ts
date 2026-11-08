// Registration for server-side clients (the Nuxt server routes that run the Nemotron agent).
// They connect to SpacetimeDB, then call registerService once with SERVICE_SECRET.
import { SenderError, t } from 'spacetimedb/server';
import spacetimedb from './schema';
import { assertLength } from './access';
import { constantTimeEqual } from './crypto';

export const registerService = spacetimedb.reducer(
  { secret: t.string(), label: t.string() },
  (ctx, { secret, label }) => {
    const expected = ctx.env.SERVICE_SECRET;
    if (!expected || expected.length < 16) throw new SenderError('SERVICE_SECRET is not configured');
    if (!constantTimeEqual(secret, expected)) throw new SenderError('wrong service secret');
    assertLength(label, 'label', 64, 1);
    ctx.db.serviceIdentity.identity.delete(ctx.sender);
    ctx.db.serviceIdentity.insert({ identity: ctx.sender, label, registeredAt: ctx.timestamp });
  }
);
