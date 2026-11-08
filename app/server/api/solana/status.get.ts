/** GET /api/solana/status -> { configured, address?, balanceSol?, rpc? } (setup check) */
export default defineEventHandler(async () => {
  if (!useRuntimeConfig().solanaSecretKey) return { configured: false };
  return { configured: true, ...(await walletStatus()) };
});
