// Account helpers shared by auth.ts and demo.ts. Kept out of index.ts: the module entry may only
// export reducers and views.
import { SenderError } from 'spacetimedb/server';
import { bytesToHex } from '@noble/hashes/utils.js';
import { Role } from '@hackutd2026/shared';
import { assertLength, parseOrThrow, type Ctx } from './access';
import { hashPassword } from './crypto';

const MIN_PASSWORD = 8;

export function normalizeEmail(email: string) {
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new SenderError('invalid email');
  return e;
}

export function passwordFields(ctx: Ctx, password: string) {
  assertLength(password, 'password', 200, MIN_PASSWORD);
  const salt = ctx.random.fill(new Uint8Array(16));
  return { passwordHash: hashPassword(password, salt), passwordSalt: bytesToHex(salt) };
}

export function createAccount(
  ctx: Ctx,
  args: { email: string; displayName: string; role: string; phone: string; password: string; isDemo: boolean }
) {
  const email = normalizeEmail(args.email);
  if (ctx.db.account.email.find(email)) throw new SenderError('an account with that email already exists');
  assertLength(args.displayName.trim(), 'displayName', 80, 1);
  assertLength(args.phone.trim(), 'phone', 32);
  return ctx.db.account.insert({
    id: 0n,
    email,
    displayName: args.displayName.trim(),
    role: parseOrThrow(Role, args.role, 'role'),
    phone: args.phone.trim(),
    ...passwordFields(ctx, args.password),
    totpSecret: undefined,
    totpLastStep: 0n,
    isDemo: args.isDemo,
    createdAt: ctx.timestamp,
  });
}
