/** POST /api/solana/anchor  { id, ts, event, detail, kind } -> { hash, tx, slot } */
export default defineEventHandler(async (event) => {
  rateLimit(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown');
  const entry = readAnchorable(await readBody(event));
  const hash = hashEvent(entry);
  return { hash, ...(await anchorHash(hash)) };
});
