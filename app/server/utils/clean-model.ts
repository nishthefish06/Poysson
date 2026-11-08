/**
 * Models produce almost-right JSON: optional fields as null / {} / [], half-empty steps, ids with
 * spaces, unknown channel names, too many steps, strings that are too long. Tidy all of that up
 * BEFORE zod validation instead of throwing the whole reply away. Pure functions: no Nuxt imports,
 * so they're unit-tested directly.
 */
import { AttackType, Channel, Difficulty } from '@hackutd2026/shared';
import { AttackerTool } from '@hackutd2026/shared/arena';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const asBool = (v: unknown): boolean | undefined =>
  typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : undefined;

// ---------- ids ----------

/** Step ids must be 1..32 chars. Lowercase, keep [a-z0-9_-], collapse the rest to '-'. */
export function normalizeId(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const id = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return id || null;
}

// ---------- enums ----------

const CHANNEL_ALIASES: Record<string, Channel> = {
  phone: 'call',
  voice: 'call',
  voicemail: 'call',
  vishing: 'call',
  text: 'sms',
  'text message': 'sms',
  message: 'sms',
  imessage: 'sms',
  mms: 'sms',
  im: 'chat',
  teams: 'chat',
  slack: 'chat',
  'live chat': 'chat',
  mail: 'email',
  'e-mail': 'email',
  website: 'web',
  page: 'web',
  browser: 'web',
  'web page': 'web',
  notification: 'popup',
  alert: 'popup',
  'pop-up': 'popup',
  post: 'social',
  tweet: 'social',
  'social media': 'social',
};

export function normalizeChannel(raw: unknown): Channel {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const direct = Channel.safeParse(v);
  if (direct.success) return direct.data;
  return CHANNEL_ALIASES[v] ?? 'system';
}

export function normalizeAttackType(raw: unknown, fallback: AttackType = 'phishing'): AttackType {
  const v =
    typeof raw === 'string'
      ? raw
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_')
      : '';
  const direct = AttackType.safeParse(v);
  if (direct.success) return direct.data;
  if (v.includes('sms') || v.includes('smish') || v.includes('text')) return 'smishing';
  if (v.includes('sim') || v.includes('port') || v.includes('vish') || v.includes('account_takeover'))
    return 'sim_swap';
  if (v.includes('ransom') || v.includes('malware')) return 'ransomware';
  if (v.includes('insider') || v.includes('vendor') || v.includes('leak') || v.includes('exfil'))
    return 'insider_leak';
  // fake pop-ups and redirects are a phishing delivery method
  if (v.includes('popup') || v.includes('pop_up') || v.includes('redirect')) return 'phishing';
  if (v.includes('phish')) return 'phishing';
  return fallback;
}

// ---------- steps ----------

// ---------- fictional domains ----------

const DOC_IP = /^(192\.0\.2|198\.51\.100|203\.0\.113)\.\d{1,3}$/;

/** Domain the project allows as is: .example (RFC 2606) or a documentation IP. */
function isSafeHost(host: string): boolean {
  const h = host.toLowerCase();
  return h.endsWith('.example') || h === 'example' || DOC_IP.test(h);
}

/** attacker.ctrl -> attacker-ctrl.example: keeps the look-alike, never a real or unknown domain. */
function safeHost(host: string): string {
  if (isSafeHost(host)) return host;
  const label = host
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/\./g, '-')
    .replace(/^-+|-+$/g, '');
  return `${label || 'unknown'}.example`;
}

/**
 * Rewrites real carrier names to the fictional CorpMobile, and every e-mail domain and URL host in free
 * text to a fictional one. The model sometimes invents domains (attacker.ctrl) or uses real ones; the app
 * only ever shows .example domains.
 */
// Real carriers the model likes to impersonate -> the app's fictional carrier. ("Sprint" and "Cricket"
// are left alone: they are everyday words too.)
const REAL_CARRIERS = /\b(?:T[-\s]?Mobile|Verizon(?:\s+Wireless)?|AT&T|Mint\s+Mobile|U\.?S\.?\s+Cellular)(?![A-Za-z])/gi;

// The model sometimes copies the prompt's "+1 (555) 01xx-xxxx" placeholder literally: fill in digits.
const PHONE_PLACEHOLDER = /\(555\)\s*[0-9xX]{3,4}-[0-9xX]{4}/g;
const FILL = '4271903865';

export function fictionalize(text: string): string {
  return text
    .replace(PHONE_PLACEHOLDER, (m) => {
      let n = 0;
      return m.replace(/[xX]/g, () => FILL[n++ % FILL.length]!);
    })
    .replace(REAL_CARRIERS, 'CorpMobile')
    .replace(
      /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
      (_m, user: string, host: string) => `${user}@${safeHost(host)}`
    )
    .replace(
      /\b(https?:\/\/)([A-Za-z0-9.-]+)/gi,
      (_m, scheme: string, host: string) => `${scheme}${safeHost(host)}`
    );
}

/** An attacker's forwarding rule sends mail OUT: a company address (or none) becomes an outside one. */
export function outsideAddress(addr: string): string {
  const m = addr.match(/^([^@\s]+)@([^@\s]+)$/);
  if (!m) return 'archive.backup@freemail.example';
  return /(^|\.)corp\.example$/i.test(m[2]!) ? `${m[1]}.copy@freemail.example` : addr;
}

function cleanStep(raw: unknown): Obj | null {
  if (!isObj(raw)) return null;
  const id = normalizeId(raw.id);
  const body = clip(raw.body, 4000);
  if (!id || !body) return null;

  const step: Obj = {
    id,
    channel: normalizeChannel(raw.channel),
    from: fictionalize(clip(raw.from, 200)) || 'Unknown sender',
    subject: fictionalize(clip(raw.subject, 300)),
    body: fictionalize(body),
  };

  const links = (Array.isArray(raw.links) ? raw.links : [])
    .filter((l): l is Obj => isObj(l) && nonEmpty(l.label) && nonEmpty(l.url))
    .slice(0, 5)
    .map((l) => ({ label: fictionalize(clip(l.label, 200)), url: fictionalize(clip(l.url, 500)) }));
  if (links.length) step.links = links;

  const form = raw.form;
  const fields = (isObj(form) && Array.isArray(form.fields) ? form.fields : [])
    .filter((f): f is Obj => isObj(f) && nonEmpty(f.name) && nonEmpty(f.label))
    .slice(0, 5)
    .map((f) => ({
      name: clip(f.name, 40),
      label: clip(f.label, 80),
      kind: f.kind === 'password' ? 'password' : 'text',
    }));
  if (isObj(form) && fields.length) {
    step.form = { fields, submitLabel: clip(form.submitLabel, 40) || 'Continue' };
  }
  return step;
}

/**
 * Cleans an array of steps. Ids are normalized; if the same id appears twice the LAST one wins.
 * Returns the kept steps, a map from the model's original id to the normalized id (for flags),
 * and how many were dropped.
 */
export function cleanSteps(
  raw: unknown,
  max: number
): { steps: Obj[]; idMap: Map<string, string>; dropped: number } {
  const byId = new Map<string, Obj>();
  const idMap = new Map<string, string>();
  let dropped = 0;
  for (const s of Array.isArray(raw) ? raw : []) {
    const c = cleanStep(s);
    if (!c) {
      dropped++;
      continue;
    }
    if (isObj(s)) idMap.set(String(s.id), c.id as string);
    byId.delete(c.id as string); // re-insert so the last occurrence keeps its position at the end
    byId.set(c.id as string, c);
  }
  const all = [...byId.values()];
  dropped += Math.max(0, all.length - max);
  return { steps: all.slice(0, max), idMap, dropped };
}

// ---------- flags ----------

export interface KnownFlag {
  isMalicious: boolean;
  redFlags: readonly string[];
}

function cleanFlags(raw: unknown, idMap: Map<string, string>, keep: Set<string>): Map<string, Obj> {
  const out = new Map<string, Obj>();
  for (const f of Array.isArray(raw) ? raw : []) {
    if (!isObj(f)) continue;
    const id = idMap.get(String(f.stepId)) ?? normalizeId(f.stepId);
    const malicious = asBool(f.isMalicious);
    if (!id || !keep.has(id) || malicious === undefined) continue;
    out.set(id, {
      stepId: id,
      isMalicious: malicious,
      redFlags: (Array.isArray(f.redFlags) ? f.redFlags : [])
        .filter(nonEmpty)
        .slice(0, 10)
        .map((r) => fictionalize(clip(r, 200))),
    });
  }
  return out;
}

// ---------- attacker tools ----------

const TOOL_ALIASES: Record<string, AttackerTool['tool']> = {
  add_forwarding_rule: 'add_forwarding_rule',
  forwarding_rule: 'add_forwarding_rule',
  forward_mail: 'add_forwarding_rule',
  mail_rule: 'add_forwarding_rule',
  add_mail_rule: 'add_forwarding_rule',
  send_mail_as_you: 'send_mail_as_you',
  send_mail: 'send_mail_as_you',
  send_email: 'send_mail_as_you',
  send_email_as_employee: 'send_mail_as_you',
  add_mfa_device: 'add_mfa_device',
  add_mfa: 'add_mfa_device',
  register_device: 'add_mfa_device',
  change_customer: 'change_customer',
  update_customer: 'change_customer',
  modify_customer: 'change_customer',
  sim_swap: 'change_customer',
  swap_sim: 'change_customer',
  change_sim: 'change_customer',
  port_out: 'change_customer',
  encrypt_files: 'encrypt_files',
  ransomware: 'encrypt_files',
  encrypt: 'encrypt_files',
  export_customers: 'export_customers',
  export_data: 'export_customers',
  exfiltrate: 'export_customers',
};

const SIM_TOOLS = new Set(['sim_swap', 'swap_sim', 'change_sim', 'port_out']);

/** Field from the model's `field`; if missing, from the tool name it used or the value's shape. */
function customerField(v: unknown, rawTool: string, value: unknown): string {
  const f = typeof v === 'string' ? v.toLowerCase().replace(/[\s_-]+/g, '') : '';
  if (f.startsWith('sim') || f === 'iccid') return 'sim';
  if (f.includes('freeze') || f.includes('port')) return 'portFreeze';
  if (f) return 'email';
  if (SIM_TOOLS.has(rawTool)) return 'sim';
  if (typeof value === 'boolean') return 'portFreeze';
  const val = String(value ?? '').trim();
  if (/^\d{4,}$/.test(val)) return 'sim';
  return 'email';
}

/** Normalizes tool names/fields and drops any tool that still isn't valid (one bad tool doesn't sink the move). */
export function cleanTools(raw: unknown, max = 3): AttackerTool[] {
  const out: AttackerTool[] = [];
  for (const t of Array.isArray(raw) ? raw : []) {
    if (!isObj(t)) continue;
    // models sometimes put the tool name in `name`; then `name` isn't the device name
    const toolKey = t.tool !== undefined && t.tool !== null ? 'tool' : 'name';
    const rawTool = String(t[toolKey] ?? '')
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const name = TOOL_ALIASES[rawTool];
    if (!name) continue;
    const candidate: Obj = { tool: name };
    if (name === 'add_forwarding_rule')
      Object.assign(candidate, {
        match: clip(t.match, 60) || '*',
        forwardTo: outsideAddress(fictionalize(clip(t.forwardTo ?? t.to, 120))),
      });
    if (name === 'send_mail_as_you')
      Object.assign(candidate, {
        to: fictionalize(clip(t.to, 120)),
        subject: fictionalize(clip(t.subject, 200)),
        body: fictionalize(clip(t.body, 1500)),
      });
    if (name === 'add_mfa_device')
      Object.assign(candidate, {
        name: clip(t.device ?? (toolKey === 'tool' ? t.name : undefined), 60) || 'New phone',
      });
    if (name === 'change_customer')
      Object.assign(candidate, {
        customerId: normalizeId(t.customerId ?? t.customer) ?? '',
        field: customerField(t.field, rawTool, t.value),
        value: fictionalize(clip(String(t.value ?? ''), 120)),
      });
    if (name === 'encrypt_files')
      Object.assign(candidate, {
        note: fictionalize(clip(t.note, 600)) || 'Your files are encrypted. Pay to get them back.',
      });
    const parsed = AttackerTool.safeParse(candidate);
    if (parsed.success) out.push(parsed.data);
    if (out.length >= max) break;
  }
  return out;
}

// ---------- arena moves ----------

/**
 * For ArenaMove-shaped model output. `known` = labels of steps already in the round, so a
 * continued thread the model forgot to label keeps its original label. A brand-new step with
 * no usable label is assumed malicious (the attacker wrote it).
 */
export function cleanArenaMove(raw: unknown, known: ReadonlyMap<string, KnownFlag> = new Map()): unknown {
  if (!isObj(raw)) return raw;
  const { steps, idMap } = cleanSteps(raw.steps, 3);
  const keep = new Set(steps.map((s) => s.id as string));
  const flags = cleanFlags(raw.flags, idMap, keep);
  for (const id of keep) {
    if (flags.has(id)) continue;
    const prev = known.get(id);
    flags.set(id, {
      stepId: id,
      isMalicious: prev?.isMalicious ?? true,
      redFlags: [...(prev?.redFlags ?? [])],
    });
  }
  return {
    attackType: normalizeAttackType(raw.attackType),
    narration: nonEmpty(raw.narration) ? fictionalize(clip(raw.narration, 300)) : null,
    endRound: asBool(raw.endRound) === true,
    steps,
    flags: [...flags.values()],
    tools: cleanTools(raw.tools),
  };
}

// ---------- scenario drafts ----------

/** Scale criterion points so they're integers >= 1 that add up to exactly 100. */
export function normalizeScoring(raw: unknown): { criterion: string; points: number }[] {
  const items = (Array.isArray(raw) ? raw : [])
    .filter((c): c is Obj => isObj(c) && nonEmpty(c.criterion))
    .slice(0, 10)
    .map((c) => ({ criterion: clip(c.criterion, 300), weight: Math.max(Number(c.points) || 0, 0) }));
  if (!items.length) return [{ criterion: 'Handled the scenario safely', points: 100 }];
  const total = items.reduce((s, c) => s + c.weight, 0);
  const weights = total > 0 ? items.map((c) => c.weight / total) : items.map(() => 1 / items.length);
  // every criterion gets at least 1 point; rounding drift is fixed on the largest criterion
  const points = weights.map((w) => Math.max(1, Math.round(w * 100)));
  let sum = points.reduce((s, p) => s + p, 0);
  // at most 10 criteria, so drift is tiny; the cap guarantees this can never spin forever
  for (let guard = 0; sum !== 100 && guard < 200; guard++) {
    const largest = points.indexOf(Math.max(...points));
    if (sum < 100) {
      points[largest] = (points[largest] ?? 1) + 1;
      sum++;
    } else {
      if ((points[largest] ?? 1) <= 1) break; // can't go lower (only possible with >100 criteria)
      points[largest] = (points[largest] ?? 1) - 1;
      sum--;
    }
  }
  return items.map((c, i) => ({ criterion: c.criterion, points: points[i] ?? 1 }));
}

/** For ScenarioDraft-shaped model output. attackType/difficulty are forced to what the admin asked for. */
export function cleanScenarioDraft(raw: unknown, attackType: AttackType, difficulty: Difficulty): unknown {
  if (!isObj(raw)) return raw;
  const content = isObj(raw.content) ? raw.content : {};
  const rubric = isObj(raw.rubric) ? raw.rubric : {};
  const { steps, idMap } = cleanSteps(content.steps, 20);
  const keep = new Set(steps.map((s) => s.id as string));
  const expected = (Array.isArray(rubric.expectedActions) ? rubric.expectedActions : [])
    .filter(nonEmpty)
    .slice(0, 15)
    .map((a) => clip(a, 300));
  return {
    attackType,
    difficulty,
    title: clip(raw.title, 200) || 'Untitled scenario',
    summary: clip(raw.summary, 1000),
    briefing: clip(raw.briefing, 8000),
    content: { steps },
    rubric: {
      stepFlags: [...cleanFlags(rubric.stepFlags, idMap, keep).values()],
      expectedActions: expected.length ? expected : ['Report anything suspicious to security'],
      scoring: normalizeScoring(rubric.scoring),
    },
  };
}
