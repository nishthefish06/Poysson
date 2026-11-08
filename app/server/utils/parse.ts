import type { H3Event } from 'h3';
import type { ZodType } from 'zod';
import { describeIssues } from '@hackutd2026/shared';

/** Validate a request body; bad input is a 400 with a readable message, not a 500. */
export async function parseBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const result = schema.safeParse(await readBody(event));
  if (!result.success) throw createError({ statusCode: 400, statusMessage: describeIssues(result.error) });
  return result.data;
}
