// Presence: one row per open connection. A tab closing (or the network dropping) removes its row,
// so views can tell whether an account is still on the page.
import spacetimedb from './schema';

export const onConnect = spacetimedb.clientConnected((ctx) => {
  if (!ctx.connectionId) return;
  ctx.db.onlineConnection.connectionId.delete(ctx.connectionId);
  ctx.db.onlineConnection.insert({
    connectionId: ctx.connectionId,
    identity: ctx.sender,
    connectedAt: ctx.timestamp,
  });
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  if (ctx.connectionId) ctx.db.onlineConnection.connectionId.delete(ctx.connectionId);
});
