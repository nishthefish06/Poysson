// Arena: play against the Nemotron attacker inside a mock work environment. Runs on the Nuxt
// server (not stored in SpacetimeDB). Messages reuse the scenario shapes (ScenarioStep + StepFlag);
// once the attacker gets in, it uses tools that change the mock apps (mail rules, customer
// accounts, sessions, files). The employee investigates and contains it.
import { z } from 'zod';
import { AttackType, RunEventKind, SYSTEM_RUN_EVENT_KINDS, ScenarioStep, StepFlag } from './index';

export const Verdict = z.enum(['ideal', 'ok', 'neutral', 'harmful']);
export type Verdict = z.infer<typeof Verdict>;

/** bait: starts clean, the attacker has to trick you first. breach: you start already compromised. */
export const ArenaMode = z.enum(['bait', 'breach']);
export type ArenaMode = z.infer<typeof ArenaMode>;

// ---------- the mock environment (public view: never says what the attacker did) ----------

export const Session = z.object({
  id: z.string(),
  device: z.string(),
  location: z.string(),
  ip: z.string(),
  startedAt: z.number().int(), // ms since round start (negative = before the round)
  current: z.boolean(), // the session you're using right now
});
export type Session = z.infer<typeof Session>;

export const MfaDevice = z.object({ id: z.string(), name: z.string(), addedAt: z.number().int() });
export type MfaDevice = z.infer<typeof MfaDevice>;

export const ForwardingRule = z.object({
  id: z.string(),
  match: z.string(), // e.g. "invoice", "password", "*"
  forwardTo: z.string(),
  createdAt: z.number().int(),
});
export type ForwardingRule = z.infer<typeof ForwardingRule>;

export const SentMail = z.object({
  id: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  at: z.number().int(),
});
export type SentMail = z.infer<typeof SentMail>;

export const CustomerField = z.enum(['email', 'sim', 'portFreeze']);
export type CustomerField = z.infer<typeof CustomerField>;

export const CustomerChange = z.object({
  id: z.string(),
  at: z.number().int(),
  field: CustomerField,
  from: z.string(),
  to: z.string(),
  by: z.string(), // who the portal says did it (attacker changes show YOUR name)
  reverted: z.boolean(),
});
export type CustomerChange = z.infer<typeof CustomerChange>;

export const Customer = z.object({
  id: z.string(),
  name: z.string(),
  line: z.string(), // masked, e.g. "(•••) •••-4821"
  email: z.string(),
  simLast4: z.string(),
  portFreeze: z.boolean(),
  history: z.array(CustomerChange),
});
export type Customer = z.infer<typeof Customer>;

export const FileItem = z.object({ name: z.string(), encrypted: z.boolean() });
export type FileItem = z.infer<typeof FileItem>;

export const ActivityEntry = z.object({
  id: z.string(),
  at: z.number().int(),
  actor: z.string(), // always the employee's name: the attacker acts AS you
  ip: z.string(),
  location: z.string(),
  text: z.string(),
});
export type ActivityEntry = z.infer<typeof ActivityEntry>;

export const World = z.object({
  employeeName: z.string(),
  sessions: z.array(Session),
  mfaDevices: z.array(MfaDevice),
  passwordChangedAt: z.number().int(),
  forwardingRules: z.array(ForwardingRule),
  sentMail: z.array(SentMail),
  customers: z.array(Customer),
  files: z.array(FileItem),
  ransomNote: z.string().nullable(),
  activity: z.array(ActivityEntry),
});
export type World = z.infer<typeof World>;

// ---------- attacker tools (only work while the attacker has access) ----------

export const AttackerTool = z.discriminatedUnion('tool', [
  z.object({
    tool: z.literal('add_forwarding_rule'),
    match: z.string().min(1).max(60),
    forwardTo: z.string().min(3).max(120),
  }),
  z.object({
    tool: z.literal('send_mail_as_you'),
    to: z.string().min(3).max(120),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(1500),
  }),
  z.object({ tool: z.literal('add_mfa_device'), name: z.string().min(1).max(60) }),
  z.object({
    tool: z.literal('change_customer'),
    customerId: z.string().min(1).max(32),
    field: CustomerField,
    value: z.string().min(1).max(120),
  }),
  z.object({ tool: z.literal('encrypt_files'), note: z.string().min(1).max(600) }),
  z.object({ tool: z.literal('export_customers') }),
]);
export type AttackerTool = z.infer<typeof AttackerTool>;
export type AttackerToolName = AttackerTool['tool'];

// ---------- employee actions on the environment ----------

export const EnvAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('revoke_session'), sessionId: z.string() }),
  z.object({ action: z.literal('remove_mfa_device'), deviceId: z.string() }),
  z.object({ action: z.literal('reset_password') }),
  z.object({ action: z.literal('delete_forwarding_rule'), ruleId: z.string() }),
  z.object({ action: z.literal('revert_customer_change'), customerId: z.string(), changeId: z.string() }),
  z.object({ action: z.literal('enable_port_freeze'), customerId: z.string() }),
  z.object({ action: z.literal('restore_files') }),
  z.object({ action: z.literal('report_incident'), details: z.string().max(2000) }),
]);
export type EnvAction = z.infer<typeof EnvAction>;

// ---------- attacker moves ----------

// What the attacker model must return each turn (validated before use).
export const ArenaMove = z
  .object({
    attackType: AttackType,
    // new messages, or an updated one (same id replaces it, e.g. a chat getting a new message)
    steps: z.array(ScenarioStep).max(3),
    // truth label for every step in `steps`; never sent to the browser
    flags: z.array(StepFlag).max(3),
    // actions inside the environment; ignored unless the attacker currently has access
    tools: z.array(AttackerTool).max(3).default([]),
    narration: z.string().max(300).nullable(),
    endRound: z.boolean(),
  })
  .superRefine((m, ctx) => {
    const ids = new Set(m.steps.map((s) => s.id));
    for (const s of m.steps) {
      if (!m.flags.some((f) => f.stepId === s.id)) {
        ctx.addIssue({ code: 'custom', message: `step '${s.id}' has no flag` });
      }
    }
    for (const f of m.flags) {
      if (!ids.has(f.stepId))
        ctx.addIssue({ code: 'custom', message: `flag for unknown step '${f.stepId}'` });
    }
  });
export type ArenaMove = z.infer<typeof ArenaMove>;

// What the attacker model receives each turn.
export const ArenaContext = z.object({
  turn: z.number().int().nonnegative(),
  lastAction: z.object({ stepId: z.string(), kind: RunEventKind, detail: z.string() }).nullable(),
  // short log: what was sent and how the employee reacted
  history: z.array(z.string()).max(40),
});
export type ArenaContext = z.infer<typeof ArenaContext>;

// Employee action on a message: same vocabulary as logRunEvent.
export const ArenaAction = z.object({
  stepId: z.string().min(1).max(32),
  kind: RunEventKind.refine((k) => !SYSTEM_RUN_EVENT_KINDS.includes(k), {
    message: 'started/submitted are recorded automatically',
  }),
  detail: z.string().max(4000),
});
export type ArenaAction = z.infer<typeof ArenaAction>;

export const Judgment = z.object({
  verdict: Verdict,
  points: z.number().int(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  source: z.enum(['rule', 'model']),
});
export type Judgment = z.infer<typeof Judgment>;

export const ArenaLogEntry = z.object({
  seq: z.number().int().nonnegative(),
  tMs: z.number().int().nonnegative(),
  // 'env' = the employee acted on the environment (revoke session, revert change, ...)
  type: z.enum(['narration', 'step', 'action', 'env']),
  stepId: z.string().nullable(),
  kind: RunEventKind.nullable(),
  verdict: Verdict.nullable(),
  points: z.number().int(),
  text: z.string(),
});
export type ArenaLogEntry = z.infer<typeof ArenaLogEntry>;

// ---------- end-of-round summary (truth is revealed only once the round is over) ----------

// A runbook passage the AI retrieved (RAG), shown as guidance and cited in the debrief.
export const RunbookRef = z.object({
  id: z.string(),
  cite: z.string(), // "Compromised account §2 (Cut access in the right order)"
  text: z.string(),
});
export type RunbookRef = z.infer<typeof RunbookRef>;

export const ArenaSummary = z.object({
  outcome: z.enum(['clean', 'contained', 'compromised']),
  headline: z.string(),
  attackerActions: z.array(z.object({ text: z.string(), remediated: z.boolean(), undoable: z.boolean() })),
  messages: z.array(
    z.object({
      stepId: z.string(),
      title: z.string(),
      malicious: z.boolean(),
      redFlags: z.array(z.string()),
      handledWell: z.boolean(),
      // an attack the employee never acted on: safe (they didn't fall for it), but unreported
      ignored: z.boolean().default(false),
    })
  ),
  debrief: z.string(),
  debriefSource: z.enum(['gemini', 'template']),
  // runbook sections the debrief is grounded in
  runbook: z.array(RunbookRef).default([]),
  // the attacker explains its own play after the round (Nemotron, or a scripted version)
  attackerReveal: z
    .object({ text: z.string(), source: z.enum(['nemotron', 'template']) })
    .nullable()
    .default(null),
});
export type ArenaSummary = z.infer<typeof ArenaSummary>;

// Browser-facing state. Contains steps and the environment, never the truth labels
// (until the round is over, when `summary` reveals them).
export const ArenaState = z.object({
  sessionId: z.string(),
  mode: ArenaMode,
  status: z.enum(['active', 'finished']),
  turn: z.number().int(),
  steps: z.array(ScenarioStep),
  world: World,
  log: z.array(ArenaLogEntry),
  score: z.number().int(),
  accuracy: z.number().min(0).max(1),
  summary: ArenaSummary.nullable(),
  // who played the attacker's last move: live Nemotron, or the scripted fallback
  attacker: z.object({ live: z.boolean(), model: z.string().nullable() }),
});
export type ArenaState = z.infer<typeof ArenaState>;

export const ArenaActionResponse = z.object({
  judgment: Judgment,
  // false if this exact step+action was already judged (score unchanged)
  counted: z.boolean(),
  state: ArenaState,
  // the runbook section that applies to what just happened (absent for opening a message)
  guidance: RunbookRef.nullable().optional(),
});
export type ArenaActionResponse = z.infer<typeof ArenaActionResponse>;
