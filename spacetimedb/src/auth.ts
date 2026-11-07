// Login: email + password, then a 6-digit authenticator-app code (TOTP).
// First login for an account without a secret goes through enrollment instead.
import { SenderError, t } from 'spacetimedb/server';
import { bytesToHex } from '@noble/hashes/utils.js';
import { Role } from '@hackutd2026/shared';
import spacetimedb from './schema';
import { assertLength, isOwner, parseOrThrow, requireAccount, requireAdmin, type Ctx } from './access';
import { hashPassword, matchTotp, totpStep, verifyPassword } from './crypto';

const PENDING_LOGIN_TTL_MICROS = 10n * 60n * 1_000_000n;
const MIN_PASSWORD = 8;

function normalizeEmail(email: string) {
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new SenderError('invalid email');
  return e;
}

function passwordFields(ctx: Ctx, password: string) {
  assertLength(password, 'password', 200, MIN_PASSWORD);
  const salt = ctx.random.fill(new Uint8Array(16));
  return { passwordHash: hashPassword(password, salt), passwordSalt: bytesToHex(salt) };
}

function createAccount(
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

function startSession(ctx: Ctx, accountId: bigint) {
  ctx.db.pendingLogin.identity.delete(ctx.sender);
  ctx.db.session.identity.delete(ctx.sender);
  ctx.db.session.insert({ identity: ctx.sender, accountId, createdAt: ctx.timestamp });
}

function requirePending(ctx: Ctx, stage: 'totp' | 'enroll') {
  const pending = ctx.db.pendingLogin.identity.find(ctx.sender);
  if (!pending) throw new SenderError('no login in progress; sign in with your password first');
  const age = ctx.timestamp.microsSinceUnixEpoch - pending.createdAt.microsSinceUnixEpoch;
  if (age > PENDING_LOGIN_TTL_MICROS) {
    // Not deleted here: a thrown error rolls the transaction back anyway.
    throw new SenderError('login expired; sign in again');
  }
  if (pending.stage !== stage) throw new SenderError(`expected ${pending.stage} step`);
  const acct = ctx.db.account.id.find(pending.accountId);
  if (!acct) throw new SenderError('account no longer exists');
  return acct;
}

// Step 1. On success the client reads `my_login_state` (or `my_account` for demo accounts).
export const login = spacetimedb.reducer(
  { email: t.string(), password: t.string() },
  (ctx, { email, password }) => {
    const acct = ctx.db.account.email.find(email.trim().toLowerCase());
    if (!acct || !verifyPassword(password, acct.passwordSalt, acct.passwordHash)) {
      throw new SenderError('invalid email or password');
    }
    if (acct.isDemo) {
      startSession(ctx, acct.id);
      return;
    }
    ctx.db.session.identity.delete(ctx.sender);
    ctx.db.pendingLogin.identity.delete(ctx.sender);
    ctx.db.pendingLogin.insert({
      identity: ctx.sender,
      accountId: acct.id,
      stage: acct.totpSecret ? 'totp' : 'enroll',
      createdAt: ctx.timestamp,
    });
  }
);

// Step 2a (returning users): code from the authenticator app.
export const verifyTotp = spacetimedb.reducer({ code: t.string() }, (ctx, { code }) => {
  const acct = requirePending(ctx, 'totp');
  const step = matchTotp(acct.totpSecret!, code.trim(), totpStep(ctx.timestamp.microsSinceUnixEpoch));
  if (step === null) throw new SenderError('incorrect code');
  if (step <= acct.totpLastStep) throw new SenderError('code already used; wait for the next one');
  ctx.db.account.id.update({ ...acct, totpLastStep: step });
  startSession(ctx, acct.id);
});

// Step 2b (first login): the browser generates a random base32 secret with
// crypto.getRandomValues, shows it as a QR code, and sends it here with the first code.
// The module can't generate it: ctx.random is deterministic.
export const enrollTotp = spacetimedb.reducer(
  { secret: t.string(), code: t.string() },
  (ctx, { secret, code }) => {
    const acct = requirePending(ctx, 'enroll');
    const clean = secret.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z2-7]{32,64}$/.test(clean)) throw new SenderError('secret must be 32-64 base32 characters');
    const step = matchTotp(clean, code.trim(), totpStep(ctx.timestamp.microsSinceUnixEpoch));
    if (step === null) throw new SenderError('incorrect code; check the time on your phone');
    ctx.db.account.id.update({ ...acct, totpSecret: clean, totpLastStep: step });
    startSession(ctx, acct.id);
  }
);

export const cancelLogin = spacetimedb.reducer((ctx) => {
  ctx.db.pendingLogin.identity.delete(ctx.sender);
});

export const logout = spacetimedb.reducer((ctx) => {
  ctx.db.pendingLogin.identity.delete(ctx.sender);
  ctx.db.session.identity.delete(ctx.sender);
});

export const changePassword = spacetimedb.reducer(
  { currentPassword: t.string(), newPassword: t.string() },
  (ctx, { currentPassword, newPassword }) => {
    const acct = requireAccount(ctx);
    if (!verifyPassword(currentPassword, acct.passwordSalt, acct.passwordHash)) {
      throw new SenderError('current password is incorrect');
    }
    ctx.db.account.id.update({ ...acct, ...passwordFields(ctx, newPassword) });
  }
);

// ---------- Account administration ----------

// Run once from the CLI as the database owner: creates the first admin.
export const bootstrapAdmin = spacetimedb.reducer(
  { email: t.string(), displayName: t.string(), phone: t.string(), password: t.string() },
  (ctx, args) => {
    if (!isOwner(ctx)) throw new SenderError('only the database owner can bootstrap an admin');
    createAccount(ctx, { ...args, role: 'admin', isDemo: false });
  }
);

// Owner-only: demo admin + employee that skip 2FA, for judges.
export const seedDemoAccounts = spacetimedb.reducer({ password: t.string() }, (ctx, { password }) => {
  if (!isOwner(ctx)) throw new SenderError('only the database owner can seed demo accounts');
  const demos = [
    { email: 'demo.admin@example.com', displayName: 'Demo Admin', role: 'admin', phone: '+15555550100' },
    {
      email: 'demo.employee@example.com',
      displayName: 'Demo Employee',
      role: 'employee',
      phone: '+15555550101',
    },
  ];
  for (const d of demos) {
    if (!ctx.db.account.email.find(d.email)) createAccount(ctx, { ...d, password, isDemo: true });
  }
});

export const adminCreateAccount = spacetimedb.reducer(
  {
    email: t.string(),
    displayName: t.string(),
    role: t.string(),
    phone: t.string(),
    tempPassword: t.string(),
  },
  (ctx, args) => {
    requireAdmin(ctx);
    createAccount(ctx, { ...args, password: args.tempPassword, isDemo: false });
  }
);

export const adminSetRole = spacetimedb.reducer(
  { accountId: t.u64(), role: t.string() },
  (ctx, { accountId, role }) => {
    const me = requireAdmin(ctx);
    if (me.id === accountId) throw new SenderError("you can't change your own role");
    const acct = ctx.db.account.id.find(accountId);
    if (!acct) throw new SenderError('no such account');
    ctx.db.account.id.update({ ...acct, role: parseOrThrow(Role, role, 'role') });
  }
);

// Lost phone: clears the authenticator secret and signs the account out everywhere.
export const adminResetTotp = spacetimedb.reducer({ accountId: t.u64() }, (ctx, { accountId }) => {
  requireAdmin(ctx);
  const acct = ctx.db.account.id.find(accountId);
  if (!acct) throw new SenderError('no such account');
  ctx.db.account.id.update({ ...acct, totpSecret: undefined, totpLastStep: 0n });
  for (const s of [...ctx.db.session.accountId.filter(accountId)]) {
    ctx.db.session.identity.delete(s.identity);
  }
});
