import { z } from 'zod';

// Runbook search for the Guides page and the simulator's guidebook. Runbooks are training
// content, nothing secret.
const Query = z.object({
  q: z.string().max(500).default(''),
  audience: z.enum(['employee', 'responder']).optional(),
  k: z.coerce.number().int().min(1).max(10).default(5),
});

export default defineEventHandler(async (event) => {
  const parsed = Query.safeParse(getQuery(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Bad search query' });
  const { q, audience, k } = parsed.data;
  if (!q.trim()) return { hits: [] };
  const hits = await searchRunbooks(q, { k, audience });
  return {
    hits: hits.map((h) => ({
      ...runbookRef(h),
      heading: h.passage.heading,
      audience: h.passage.audience,
      via: h.via,
    })),
  };
});
