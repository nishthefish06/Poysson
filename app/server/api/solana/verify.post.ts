/** POST /api/solana/verify  { tx, id, ts, event, detail, kind } -> { ok, reason?, slot?, hash } */
export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Record<string, unknown>;
  const tx = typeof body?.tx === 'string' ? body.tx : '';
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(tx)) throw createError({ statusCode: 400, statusMessage: 'invalid tx' });
  const hash = hashEvent(readAnchorable(body));
  return { hash, ...(await verifyHash(tx, hash)) };
});
