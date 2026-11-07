// Password hashing and TOTP (authenticator app) helpers.
// Modules have no Node/Web crypto, so everything here is pure JS via @noble/hashes.
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

// Kept modest because hashing runs inside a reducer transaction.
const PBKDF2_ITERATIONS = 60_000;

export function hashPassword(password: string, salt: Uint8Array): string {
  const key = pbkdf2(sha256, utf8ToBytes(password), salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: 32,
  });
  return bytesToHex(key);
}

export function verifyPassword(password: string, saltHex: string, expectedHex: string): boolean {
  return constantTimeEqual(hashPassword(password, hexToBytes(saltHex)), expectedHex);
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`invalid base32 character '${ch}'`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export const TOTP_PERIOD_SECONDS = 30n;
const TOTP_DIGITS = 6;

// RFC 6238 code for a given 30-second step.
export function totpAt(secret: Uint8Array, step: bigint): string {
  const counter = new Uint8Array(8);
  let c = step;
  for (let i = 7; i >= 0; i--) {
    counter[i] = Number(c & 0xffn);
    c >>= 8n;
  }
  const mac = hmac(sha1, secret, counter);
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

export function totpStep(microsSinceUnixEpoch: bigint): bigint {
  return microsSinceUnixEpoch / 1_000_000n / TOTP_PERIOD_SECONDS;
}

// Returns the matched step (to block replays), or null. Allows one step of clock drift either way.
export function matchTotp(secretBase32: string, code: string, currentStep: bigint): bigint | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretBase32);
  for (const drift of [0n, -1n, 1n]) {
    const step = currentStep + drift;
    if (constantTimeEqual(totpAt(secret, step), code)) return step;
  }
  return null;
}
