/**
 * Solana audit anchoring.
 *
 * Every audit event is hashed (SHA-256 over its id, time, event, detail and kind) and the hash is
 * written to Solana devnet in a Memo-program transaction signed by the app wallet
 * (SOLANA_SECRET_KEY, server-only). Only the hash goes on-chain, never names, emails or IPs.
 * Anyone can later re-hash the event and check it against the memo: if the record was edited,
 * the hashes stop matching.
 *
 * Solana is what makes per-event anchoring practical: ~1 s confirmation and ~0.000005 SOL a
 * transaction, so each event gets its own transaction instead of being batched.
 */
import { createHash } from 'node:crypto';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

export const MEMO_PROGRAM = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
export const MEMO_PREFIX = 'poysson:v1:';

/** The fields that make up an audit event's fingerprint. */
export interface AnchorableEvent {
  id: string;
  ts: string;
  event: string;
  detail: string;
  kind: string;
}

let cached: { key: string; url: string; conn: Connection; payer: Keypair } | null = null;

/** Connection + app wallet (cached). Shared by audit anchoring and badge credentials. */
export function solanaClient() {
  const { solanaRpcUrl, solanaSecretKey } = useRuntimeConfig();
  if (!solanaSecretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Solana is not configured (SOLANA_SECRET_KEY)' });
  }
  if (!cached || cached.key !== solanaSecretKey || cached.url !== solanaRpcUrl) {
    let payer: Keypair;
    try {
      payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(solanaSecretKey) as number[]));
    } catch {
      throw createError({ statusCode: 500, statusMessage: 'SOLANA_SECRET_KEY must be a JSON array of 64 numbers' });
    }
    cached = { key: solanaSecretKey, url: solanaRpcUrl, conn: new Connection(solanaRpcUrl, 'confirmed'), payer };
  }
  return cached;
}

/** Canonical SHA-256 of an audit event (hex). Field order is fixed so the hash is reproducible. */
export function hashEvent(e: AnchorableEvent): string {
  return createHash('sha256').update(JSON.stringify([e.id, e.ts, e.event, e.detail, e.kind])).digest('hex');
}

/** Writes `poysson:v1:<hash>` to devnet. Returns the transaction signature and its slot. */
export async function anchorHash(hash: string): Promise<{ tx: string; slot: number }> {
  const { conn, payer } = solanaClient();
  const tx = new Transaction().add(
    new TransactionInstruction({
      programId: MEMO_PROGRAM,
      keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }],
      data: Buffer.from(MEMO_PREFIX + hash, 'utf8'),
    })
  );
  try {
    const signature = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: 'confirmed' });
    const status = await conn.getSignatureStatus(signature);
    return { tx: signature, slot: status.value?.slot ?? 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/insufficient|no record of a prior credit|debit an account/i.test(msg)) {
      throw createError({ statusCode: 402, statusMessage: 'Solana wallet has no devnet SOL; fund it at faucet.solana.com' });
    }
    throw createError({ statusCode: 502, statusMessage: `Solana anchor failed: ${msg.slice(0, 160)}` });
  }
}

/** True if transaction `tx` carries the memo for `hash` and was signed by our wallet. */
export async function verifyHash(tx: string, hash: string): Promise<{ ok: boolean; reason?: string; slot?: number }> {
  const { conn, payer } = solanaClient();
  const t = await conn.getTransaction(tx, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
  if (!t) return { ok: false, reason: 'transaction not found on devnet' };
  if (t.meta?.err) return { ok: false, reason: 'transaction failed on-chain' };
  const signer = t.transaction.message.getAccountKeys().get(0);
  if (!signer?.equals(payer.publicKey)) return { ok: false, reason: 'not signed by the Poysson wallet' };
  const memo = (t.meta?.logMessages ?? []).some((l) => l.includes(MEMO_PREFIX + hash));
  return memo ? { ok: true, slot: t.slot } : { ok: false, reason: 'record changed: hash does not match the on-chain memo', slot: t.slot };
}

/** Wallet address and balance, for setup checks. */
export async function walletStatus() {
  const { conn, payer, url } = solanaClient();
  const lamports = await conn.getBalance(payer.publicKey);
  return { address: payer.publicKey.toBase58(), rpc: url, balanceSol: lamports / LAMPORTS_PER_SOL };
}

/** Validates an incoming event body (lengths keep memo-spam and huge payloads out). */
export function readAnchorable(body: unknown): AnchorableEvent {
  const b = (body ?? {}) as Record<string, unknown>;
  const field = (k: keyof AnchorableEvent, max: number) => {
    const v = b[k];
    if (typeof v !== 'string' || !v || v.length > max) {
      throw createError({ statusCode: 400, statusMessage: `invalid ${k}` });
    }
    return v;
  };
  return {
    id: field('id', 64),
    ts: field('ts', 40),
    event: field('event', 64),
    detail: field('detail', 200),
    kind: field('kind', 16),
  };
}

/* Simple per-IP rate limit so a stranger can't drain the devnet wallet. */
const hits = new Map<string, number[]>();
export function rateLimit(ip: string, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) throw createError({ statusCode: 429, statusMessage: 'Too many anchors; slow down' });
  recent.push(now);
  hits.set(ip, recent);
}
