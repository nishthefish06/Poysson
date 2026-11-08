/**
 * The app's runbook search: one shared index over server/data/runbooks.ts.
 * Gemini embeddings are added when GEMINI_API_KEY is set; any failure falls back to keyword
 * search, and embedding isn't retried for a few minutes so a dead key doesn't slow every request.
 */
import { RUNBOOKS } from '../data/runbooks';
import type { ArenaMode, RunbookRef } from '@hackutd2026/shared/arena';
import { RunbookIndex, cite, type EmbedFn, type SearchHit, type SearchOptions } from './retrieve';

const index = new RunbookIndex(RUNBOOKS);
const RETRY_MS = 5 * 60_000;
let embedding: Promise<void> | null = null;
let lastFailure = 0;

function geminiEmbedder(): EmbedFn | null {
  const c = useRuntimeConfig();
  const ai = geminiClient(8_000);
  if (!ai) return null;
  return async (texts, kind) => {
    const res = await ai.models.embedContent({
      model: c.geminiEmbedModel,
      contents: texts,
      config: {
        taskType: kind === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768,
      },
    });
    return (res.embeddings ?? []).map((e) => e.values ?? []);
  };
}

async function ensureEmbedded(fn: EmbedFn): Promise<boolean> {
  if (index.hasVectors) return true;
  if (Date.now() - lastFailure < RETRY_MS) return false;
  embedding ??= index.embed(fn).catch((e: unknown) => {
    lastFailure = Date.now();
    console.warn(
      '[runbooks] embeddings unavailable, using keyword search:',
      e instanceof Error ? e.message : e
    );
  });
  await embedding;
  embedding = null;
  return index.hasVectors;
}

export async function searchRunbooks(query: string, opts: SearchOptions = {}): Promise<SearchHit[]> {
  const fn = geminiEmbedder();
  const ready = fn ? await ensureEmbedded(fn) : false;
  return index.search(query, opts, ready && fn ? fn : undefined);
}

export function allRunbooks() {
  return RUNBOOKS;
}

export function runbookRef(h: SearchHit): RunbookRef {
  return { id: h.passage.id, cite: cite(h.passage), text: h.passage.text };
}

/** Bait mode trains every employee; Breach trains the response team. */
export function audienceFor(mode: ArenaMode): 'employee' | 'responder' {
  return mode === 'breach' ? 'responder' : 'employee';
}

/** The one runbook section that best fits what just happened, or null (never throws). */
export async function guidanceFor(query: string, mode: ArenaMode): Promise<RunbookRef | null> {
  try {
    const [hit] = await searchRunbooks(query, { k: 1, audience: audienceFor(mode) });
    return hit ? runbookRef(hit) : null;
  } catch (e) {
    console.warn('[runbooks] guidance failed:', e instanceof Error ? e.message : e);
    return null;
  }
}
