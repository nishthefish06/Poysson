/**
 * Runbook retrieval (the R in RAG).
 *
 * Keyword ranking (BM25) always runs: no API, deterministic, fine for a few dozen passages.
 * When an embedding function is available (Gemini), results are fused with semantic ranking
 * (reciprocal rank fusion). If embeddings fail, keyword results are returned alone.
 *
 * Pure: no Nuxt imports, so it is unit-tested directly. The Gemini wiring is in runbooks.ts.
 */
import type { RunbookAudience, RunbookPassage } from '../data/runbooks';

export type EmbedFn = (texts: string[], kind: 'document' | 'query') => Promise<number[][]>;

export interface SearchOptions {
  k?: number;
  /** 'employee' -> employee + both; 'responder' -> responder + both; undefined -> all */
  audience?: Exclude<RunbookAudience, 'both'>;
}

export interface SearchHit {
  passage: RunbookPassage;
  score: number;
  via: 'keyword' | 'hybrid';
}

const STOP = new Set(
  'a an the and or but if then of to in on at by for from with as is are was were be been it its this that these those you your yours we our they their them he she his her not no do does did done can could should would will just only than so such into out up over about after before when what which who how all any each more most other some own same too very there here i me my'.split(
    ' '
  )
);

// Light normalization so "revoked"/"revoking"/"revoke" and "sessions"/"session" match.
function stem(w: string): string {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('es') && !w.endsWith('ss')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

// A few synonyms so the employee's words reach the runbook's words.
const SYNONYMS: Record<string, string[]> = {
  mfa: ['device', 'authenticator', 'sign-in'],
  '2fa': ['mfa', 'authenticator'],
  sim: ['sim_swap'],
  swap: ['sim_swap'],
  port: ['sim_swap', 'freeze'],
  ransom: ['ransomware'],
  encrypt: ['ransomware'],
  locked: ['ransomware', 'encrypt'],
  forward: ['forwarding', 'rule'],
  rule: ['forwarding'],
  logout: ['revoke', 'session'],
  sign: ['session', 'sign-in'],
  kick: ['revoke', 'session'],
  password: ['credential'],
  credential: ['password'],
  phish: ['phishing'],
  text: ['smishing', 'sms'],
  sms: ['smishing'],
  export: ['exfiltration', 'data'],
  leak: ['insider_leak', 'exfiltration'],
  call: ['vishing', 'phone'],
  restore: ['backup', 'recovery'],
  report: ['incident'],
};

export function tokenize(text: string, expand = false): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9_-]+/)
    .flatMap((w) => (w.includes('-') && w !== 'sign-in' ? [w, ...w.split('-')] : [w]))
    .filter((w) => w.length > 1 && !STOP.has(w));
  const out: string[] = [];
  for (const w of raw) {
    const s = stem(w);
    out.push(s);
    if (expand) for (const syn of SYNONYMS[s] ?? SYNONYMS[w] ?? []) out.push(stem(syn));
  }
  return out;
}

function docText(p: RunbookPassage): string {
  // heading + tags count twice: they are short and on-topic
  return `${p.runbook} ${p.heading} ${p.heading} ${p.tags.join(' ')} ${p.tags.join(' ')} ${p.text}`;
}

export class RunbookIndex {
  private readonly docs: { p: RunbookPassage; tf: Map<string, number>; len: number }[];
  private readonly df = new Map<string, number>();
  private readonly avgLen: number;
  private vectors: number[][] | null = null;

  constructor(readonly passages: RunbookPassage[]) {
    this.docs = passages.map((p) => {
      const toks = tokenize(docText(p));
      const tf = new Map<string, number>();
      for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      return { p, tf, len: toks.length };
    });
    this.avgLen = this.docs.reduce((a, d) => a + d.len, 0) / Math.max(1, this.docs.length);
  }

  private allowed(p: RunbookPassage, audience?: SearchOptions['audience']): boolean {
    return !audience || p.audience === 'both' || p.audience === audience;
  }

  /** BM25 scores for every allowed passage with score > 0, best first. */
  keyword(query: string, audience?: SearchOptions['audience']): { i: number; score: number }[] {
    const q = [...new Set(tokenize(query, true))];
    const N = this.docs.length;
    const k1 = 1.4;
    const b = 0.75;
    const out: { i: number; score: number }[] = [];
    this.docs.forEach((d, i) => {
      if (!this.allowed(d.p, audience)) return;
      let score = 0;
      for (const t of q) {
        const f = d.tf.get(t);
        if (!f) continue;
        const n = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / this.avgLen));
      }
      if (score > 0) out.push({ i, score });
    });
    return out.sort((a, b2) => b2.score - a.score);
  }

  get hasVectors(): boolean {
    return this.vectors !== null;
  }

  /** Embeds every passage once. Throws if the embedder fails or returns the wrong shape. */
  async embed(fn: EmbedFn): Promise<void> {
    const v = await fn(
      this.passages.map((p) => `${p.runbook}: ${p.heading}. ${p.text}`),
      'document'
    );
    if (v.length !== this.passages.length || v.some((x) => !x.length))
      throw new Error('embedding count mismatch');
    this.vectors = v.map(normalize);
  }

  async search(query: string, opts: SearchOptions = {}, embedQuery?: EmbedFn): Promise<SearchHit[]> {
    const k = opts.k ?? 3;
    const kw = this.keyword(query, opts.audience);
    if (!this.vectors || !embedQuery || !query.trim()) {
      return kw.slice(0, k).map(({ i, score }) => ({ passage: this.passages[i]!, score, via: 'keyword' }));
    }
    let qv: number[];
    try {
      const [v] = await embedQuery([query], 'query');
      if (!v?.length) throw new Error('empty query embedding');
      qv = normalize(v);
    } catch {
      return kw.slice(0, k).map(({ i, score }) => ({ passage: this.passages[i]!, score, via: 'keyword' }));
    }
    const sem = this.vectors
      .map((v, i) => ({ i, score: dot(v, qv) }))
      .filter(({ i }) => this.allowed(this.passages[i]!, opts.audience))
      .sort((a, b) => b.score - a.score);
    // Score fusion: 0.65 x keyword (scaled to the best keyword hit) + 0.35 x meaning (scaled across
    // passages). Keywords lead because the runbooks are short and tagged, so a clear keyword match is
    // strong evidence; embeddings break ties and rescue queries that share no words with the runbook.
    const maxKw = kw[0]?.score ?? 0;
    const lo = sem.at(-1)?.score ?? 0;
    const hi = sem[0]?.score ?? 0;
    const kwW = maxKw > 0 ? 0.65 : 0;
    const fused = new Map<number, number>();
    for (const { i, score } of kw) fused.set(i, (kwW * score) / maxKw);
    for (const { i, score } of sem.slice(0, Math.max(k * 3, 10)))
      fused.set(i, (fused.get(i) ?? 0) + (1 - kwW) * (hi > lo ? (score - lo) / (hi - lo) : 1));
    return [...fused.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([i, score]) => ({ passage: this.passages[i]!, score, via: 'hybrid' }));
  }
}

function normalize(v: number[]): number[] {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}
function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i]! * b[i]!;
  return s;
}

/** "Compromised account §2 (Cut access in the right order)" */
export function cite(p: RunbookPassage): string {
  return `${p.runbook} ${p.section} (${p.heading})`;
}
