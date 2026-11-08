/** GET /api/solana/badges?owner=<address> -> the Poysson badge credentials that wallet holds */
export default defineEventHandler(async (event) => {
  const owner = parseOwner(getQuery(event).owner);
  return { owner: owner.toBase58(), badges: await badgesHeld(owner) };
});
