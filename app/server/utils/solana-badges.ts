/**
 * Badges as on-chain credentials (soulbound tokens) on Solana devnet.
 *
 * Each badge is its own Token-2022 mint with:
 *   - NonTransferable: once in a wallet it can't be sent or sold, so it stays a credential
 *   - MetadataPointer + TokenMetadata: name / symbol / uri live on the mint itself
 *   - decimals 0, mint authority = the app wallet, so only Poysson can issue it
 * Earning a badge mints exactly 1 token into the player's wallet (idempotent: never twice).
 * Anyone can verify by looking at the wallet: holding 1 of the badge's mint == earned it.
 *
 * Mint addresses are derived from the app wallet + "poysson-badge-<id>" (createWithSeed),
 * so they are stable across restarts without a database. The app wallet pays all fees;
 * the player only shares a public address.
 */
import {
  type Connection,
  type Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  ExtensionType,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createInitializeNonTransferableMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
} from '@solana/spl-token';
import { createInitializeInstruction, pack, type TokenMetadata } from '@solana/spl-token-metadata';
import { BADGES, badgeById } from '~/data/badges';

const SEED_PREFIX = 'poysson-badge-'; // + badge id; createWithSeed seeds max 32 chars
const SYMBOL = 'PSBADGE';

export function badgeOrThrow(id: string) {
  const b = badgeById(id);
  if (!b) throw createError({ statusCode: 400, statusMessage: 'unknown badge' });
  return b;
}

/** Deterministic mint address for a badge. */
export async function badgeMint(payer: PublicKey, id: string) {
  return PublicKey.createWithSeed(payer, SEED_PREFIX + id, TOKEN_2022_PROGRAM_ID);
}

function metadataFor(id: string, mint: PublicKey, authority: PublicKey): TokenMetadata {
  const b = badgeOrThrow(id);
  const base = useRuntimeConfig().solanaMetadataBaseUrl;
  return {
    mint,
    updateAuthority: authority,
    name: `Poysson · ${b.name}`,
    symbol: SYMBOL,
    uri: base ? `${base.replace(/\/$/, '')}/api/solana/badge-meta/${id}` : '',
    additionalMetadata: [],
  };
}

/** Creates the badge's mint (with its extensions + metadata) if it doesn't exist yet. */
async function ensureMint(conn: Connection, payer: Keypair, id: string) {
  const mint = await badgeMint(payer.publicKey, id);
  if (await conn.getAccountInfo(mint, 'confirmed')) return { mint, created: false };

  const meta = metadataFor(id, mint, payer.publicKey);
  const mintLen = getMintLen([ExtensionType.NonTransferable, ExtensionType.MetadataPointer]);
  // The account is created at the extension size; the metadata init reallocates, so the rent
  // must already cover the metadata too.
  const lamports = await conn.getMinimumBalanceForRentExemption(mintLen + TYPE_SIZE + LENGTH_SIZE + pack(meta).length);

  const tx = new Transaction().add(
    SystemProgram.createAccountWithSeed({
      fromPubkey: payer.publicKey,
      basePubkey: payer.publicKey,
      seed: SEED_PREFIX + id,
      newAccountPubkey: mint,
      lamports,
      space: mintLen,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeNonTransferableMintInstruction(mint, TOKEN_2022_PROGRAM_ID),
    createInitializeMetadataPointerInstruction(mint, payer.publicKey, mint, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint, 0, payer.publicKey, null, TOKEN_2022_PROGRAM_ID),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint,
      updateAuthority: payer.publicKey,
      mint,
      mintAuthority: payer.publicKey,
      name: meta.name,
      symbol: meta.symbol,
      uri: meta.uri,
    })
  );
  await sendAndConfirmTransaction(conn, tx, [payer], { commitment: 'confirmed' });
  return { mint, created: true };
}

/** How many of `mint` the owner holds (0 if they have no account for it yet). */
async function heldAmount(conn: Connection, ata: PublicKey) {
  try {
    const bal = await conn.getTokenAccountBalance(ata, 'confirmed');
    return Number(bal.value.amount);
  } catch {
    return 0; // account doesn't exist yet
  }
}

export function parseOwner(raw: unknown): PublicKey {
  try {
    if (typeof raw !== 'string' || raw.length < 32 || raw.length > 44) throw new Error('bad');
    const pk = new PublicKey(raw);
    if (!PublicKey.isOnCurve(pk.toBytes())) throw new Error('off-curve'); // a real wallet, not a PDA
    return pk;
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'invalid Solana wallet address' });
  }
}

/**
 * Issues badge `id` to `owner`: ensures the mint, the owner's token account, then mints 1.
 * Returns the existing credential instead of minting again if they already hold it.
 */
export async function issueBadge(id: string, owner: PublicKey) {
  badgeOrThrow(id);
  const { conn, payer } = solanaClient();
  try {
    const { mint } = await ensureMint(conn, payer, id);
    const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
    if ((await heldAmount(conn, ata)) >= 1) {
      return { badge: id, mint: mint.toBase58(), account: ata.toBase58(), tx: null, already: true };
    }
    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, ata, owner, mint, TOKEN_2022_PROGRAM_ID),
      createMintToInstruction(mint, ata, payer.publicKey, 1, [], TOKEN_2022_PROGRAM_ID),
      new TransactionInstruction({
        programId: MEMO_PROGRAM,
        keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }],
        data: Buffer.from(`poysson:badge:v1:${id}`, 'utf8'),
      })
    );
    const sig = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: 'confirmed' });
    return { badge: id, mint: mint.toBase58(), account: ata.toBase58(), tx: sig, already: false };
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (/insufficient|no record of a prior credit|debit an account/i.test(msg)) {
      throw createError({ statusCode: 402, statusMessage: 'Solana wallet has no devnet SOL; fund it at faucet.solana.com' });
    }
    throw createError({ statusCode: 502, statusMessage: `Badge mint failed: ${msg.slice(0, 160)}` });
  }
}

/** Which badges `owner` holds on-chain (checks every badge mint). */
export async function badgesHeld(owner: PublicKey) {
  const { conn, payer } = solanaClient();
  const out: { badge: string; mint: string; account: string }[] = [];
  await Promise.all(
    BADGES.map(async (b) => {
      const mint = await badgeMint(payer.publicKey, b.id);
      const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
      if ((await heldAmount(conn, ata)) >= 1) out.push({ badge: b.id, mint: mint.toBase58(), account: ata.toBase58() });
    })
  );
  return out;
}
