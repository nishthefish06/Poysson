/** POST /api/solana/badge  { badge, owner } -> { badge, mint, account, tx, already } */
export default defineEventHandler(async (event) => {
  rateLimit(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown', 20);
  const body = (await readBody(event)) as Record<string, unknown>;
  const id = typeof body?.badge === 'string' ? body.badge : '';
  return issueBadge(id, parseOwner(body?.owner));
});
