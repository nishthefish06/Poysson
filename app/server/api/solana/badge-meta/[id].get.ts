/**
 * GET /api/solana/badge-meta/<id> -> off-chain JSON metadata for a badge credential
 * (what wallets and explorers show). Only used when SOLANA_METADATA_BASE_URL points at a public
 * deployment; the name and symbol are stored on-chain regardless.
 */
const TIER: Record<string, string> = { bronze: '#c98a52', silver: '#8fa3c4', gold: '#e8a400', neon: '#e20074' };

export default defineEventHandler((event) => {
  const b = badgeOrThrow(getRouterParam(event, 'id') ?? '');
  const color = TIER[b.tier] ?? '#e20074';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#0f2a4a"/><circle cx="100" cy="92" r="58" fill="${color}" stroke="#fff" stroke-width="6"/><text x="100" y="105" font-family="Arial" font-size="38" font-weight="700" fill="#fff" text-anchor="middle">${b.name.slice(0, 1)}</text><text x="100" y="178" font-family="Arial" font-size="16" fill="#fff" text-anchor="middle">${b.name}</text></svg>`;
  return {
    name: `Poysson · ${b.name}`,
    symbol: 'PSBADGE',
    description: `${b.desc} Earned in Poysson security training. Non-transferable credential.`,
    image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    attributes: [
      { trait_type: 'Tier', value: b.tier },
      { trait_type: 'Issuer', value: 'Poysson' },
      { trait_type: 'Transferable', value: 'No' },
    ],
  };
});
