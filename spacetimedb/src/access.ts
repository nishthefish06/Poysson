// Session and role checks shared by reducers, procedures and views.
import { SenderError, type InferSchema, type ReducerCtx, type ViewCtx } from 'spacetimedb/server';
import type { Identity } from 'spacetimedb';
import { describeIssues } from '@hackutd2026/shared';
import type { z } from 'zod';
import spacetimedb from './schema';

type S = InferSchema<typeof spacetimedb>;
export type Ctx = ReducerCtx<S>;
// The subset views and reducers have in common, so helpers work in both.
export type ReadCtx = { sender: Identity; db: ViewCtx<S>['db'] };

// Validate input against a shared zod schema, surfacing problems as a SenderError.
export function parseOrThrow<T extends z.ZodType>(schema: T, value: unknown, field: string): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new SenderError(`${field}: ${describeIssues(result.error)}`);
  return result.data;
}

export function parseJsonOrThrow<T extends z.ZodType>(schema: T, json: string, field: string): z.infer<T> {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new SenderError(`${field} must be valid JSON`);
  }
  return parseOrThrow(schema, value, field);
}

export function currentAccount(ctx: ReadCtx) {
  const s = ctx.db.session.identity.find(ctx.sender);
  if (!s) return null;
  return ctx.db.account.id.find(s.accountId) ?? null;
}

export function requireAccount(ctx: ReadCtx) {
  const acct = currentAccount(ctx);
  if (!acct) throw new SenderError('not signed in');
  return acct;
}

export function requireAdmin(ctx: ReadCtx) {
  const acct = requireAccount(ctx);
  if (acct.role !== 'admin') throw new SenderError('admin only');
  return acct;
}

export function isOwner(ctx: ReadCtx) {
  const owner = ctx.db.moduleOwner.id.find(0);
  return owner != null && owner.identity.isEqual(ctx.sender);
}

export function assertLength(value: string, field: string, max: number, min = 0) {
  if (value.length < min || value.length > max) {
    throw new SenderError(`${field} must be ${min}-${max} characters`);
  }
}
