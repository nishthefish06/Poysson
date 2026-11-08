// Arena: free play against the Nemotron attacker. Runs on the Nuxt server (not stored in
// SpacetimeDB yet). It reuses the scenario shapes: the attacker produces ScenarioSteps plus
// StepFlags (the truth labels), and the employee responds with RunEventKinds.
import { z } from 'zod';
import { AttackType, RunEventKind, SYSTEM_RUN_EVENT_KINDS, ScenarioStep, StepFlag } from './index';

export const Verdict = z.enum(['ideal', 'ok', 'neutral', 'harmful']);
export type Verdict = z.infer<typeof Verdict>;

// What the attacker model must return each turn (validated before use).
export const ArenaMove = z
  .object({
    attackType: AttackType,
    // new steps, or an updated step (same id replaces it, e.g. a chat getting a new message)
    steps: z.array(ScenarioStep).max(3),
    // truth label for every step in `steps`; never sent to the browser
    flags: z.array(StepFlag).max(3),
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

// Employee action in the arena: same vocabulary as logRunEvent.
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
  type: z.enum(['narration', 'step', 'action']),
  stepId: z.string().nullable(),
  kind: RunEventKind.nullable(),
  verdict: Verdict.nullable(),
  points: z.number().int(),
  text: z.string(),
});
export type ArenaLogEntry = z.infer<typeof ArenaLogEntry>;

// Browser-facing state. Contains steps but never their flags.
export const ArenaState = z.object({
  sessionId: z.string(),
  status: z.enum(['active', 'finished']),
  turn: z.number().int(),
  steps: z.array(ScenarioStep),
  log: z.array(ArenaLogEntry),
  score: z.number().int(),
  accuracy: z.number().min(0).max(1),
});
export type ArenaState = z.infer<typeof ArenaState>;

export const ArenaActionResponse = z.object({
  judgment: Judgment,
  // false if this exact step+action was already judged (score unchanged)
  counted: z.boolean(),
  state: ArenaState,
});
export type ArenaActionResponse = z.infer<typeof ArenaActionResponse>;
