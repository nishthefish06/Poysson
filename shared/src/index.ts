// Contracts shared by the SpacetimeDB module, the Nuxt app and the Gemini/Nemotron generators.
// The module stores scenarios as JSON strings and validates them against these schemas,
// so anything that writes a scenario (admin UI or AI) must produce exactly these shapes.
import { z } from 'zod';

// ---------- Enums ----------

export const AttackType = z.enum([
  'ransomware',
  'sim_swap',
  'smishing',
  'phishing',
  'insider_leak',
  'popup_redirect',
]);
export type AttackType = z.infer<typeof AttackType>;

export const Difficulty = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof Difficulty>;

export const Role = z.enum(['employee', 'admin']);
export type Role = z.infer<typeof Role>;

export const ScenarioStatus = z.enum(['draft', 'published']);
export type ScenarioStatus = z.infer<typeof ScenarioStatus>;

export const AssignmentStatus = z.enum(['assigned', 'in_progress', 'submitted', 'reviewed']);
export type AssignmentStatus = z.infer<typeof AssignmentStatus>;

export const LoginStage = z.enum(['totp', 'enroll']);
export type LoginStage = z.infer<typeof LoginStage>;

// ---------- Scenario JSON ----------

// 'social' and 'web' added for the scenario area (fake social posts, lookalike websites). Additive only.
export const Channel = z.enum(['sms', 'email', 'call', 'chat', 'popup', 'system', 'social', 'web']);
export type Channel = z.infer<typeof Channel>;

// A link shown in a step. `label` is what the employee sees, `url` is revealed on hover
// (a mismatch is often the tell). Use fictional domains.
export const StepLink = z.object({
  label: z.string().min(1).max(200),
  url: z.string().min(1).max(500),
});
export type StepLink = z.infer<typeof StepLink>;

// A fake login form (web/popup steps). Typed values are NEVER sent anywhere; the client only
// logs that the form was submitted (`shared_credentials`).
export const StepForm = z.object({
  fields: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        label: z.string().min(1).max(80),
        kind: z.enum(['text', 'password']),
      })
    )
    .min(1)
    .max(5),
  submitLabel: z.string().min(1).max(40),
});
export type StepForm = z.infer<typeof StepForm>;

export const ScenarioStep = z.object({
  id: z.string().min(1).max(32),
  channel: Channel,
  from: z.string().min(1).max(200),
  subject: z.string().max(300),
  body: z.string().min(1).max(4000),
  // Optional, additive: existing scenarios without these stay valid.
  links: z.array(StepLink).max(5).optional(),
  form: StepForm.optional(),
});
export type ScenarioStep = z.infer<typeof ScenarioStep>;

// Stored in scenario.contentJson. Everything here is visible to the employee.
export const ScenarioContent = z
  .object({ steps: z.array(ScenarioStep).min(1).max(20) })
  .refine((c) => new Set(c.steps.map((s) => s.id)).size === c.steps.length, {
    message: 'step ids must be unique',
  });
export type ScenarioContent = z.infer<typeof ScenarioContent>;

export const StepFlag = z.object({
  stepId: z.string().min(1).max(32),
  isMalicious: z.boolean(),
  redFlags: z.array(z.string().min(1).max(200)).max(10),
});
export type StepFlag = z.infer<typeof StepFlag>;

export const ScoringCriterion = z.object({
  criterion: z.string().min(1).max(300),
  points: z.number().int().min(1).max(100),
});
export type ScoringCriterion = z.infer<typeof ScoringCriterion>;

// Stored in scenario.rubricJson. Admin-only answer key.
export const ScenarioRubric = z
  .object({
    stepFlags: z.array(StepFlag).max(20),
    expectedActions: z.array(z.string().min(1).max(300)).min(1).max(15),
    scoring: z.array(ScoringCriterion).min(1).max(10),
  })
  .refine((r) => r.scoring.reduce((sum, c) => sum + c.points, 0) === 100, {
    message: 'scoring points must add up to 100',
  });
export type ScenarioRubric = z.infer<typeof ScenarioRubric>;

export const SCENARIO_LIMITS = { title: 200, summary: 1000, briefing: 8000 } as const;

// A complete scenario, as an admin form or an AI generator should produce it.
export const ScenarioDraft = z
  .object({
    attackType: AttackType,
    difficulty: Difficulty,
    title: z.string().min(1).max(SCENARIO_LIMITS.title),
    summary: z.string().max(SCENARIO_LIMITS.summary),
    briefing: z.string().max(SCENARIO_LIMITS.briefing),
    content: ScenarioContent,
    rubric: ScenarioRubric,
  })
  .superRefine((d, ctx) => {
    const ids = new Set(d.content.steps.map((s) => s.id));
    for (const f of d.rubric.stepFlags) {
      if (!ids.has(f.stepId)) {
        ctx.addIssue({ code: 'custom', message: `rubric flags unknown step '${f.stepId}'` });
      }
    }
  });
export type ScenarioDraft = z.infer<typeof ScenarioDraft>;

// ---------- Run events ----------

// What an employee did during a simulation run. 'started' and 'submitted' are written by the
// module itself; the rest come from the client through logRunEvent.
export const RunEventKind = z.enum([
  'started',
  'opened_step',
  'replied',
  'clicked_link',
  'reported_suspicious',
  'verified_identity',
  'refused_request',
  'complied_request',
  'shared_credentials',
  'escalated',
  'blocked_sender',
  'notified_customer',
  'note',
  'submitted',
]);
export type RunEventKind = z.infer<typeof RunEventKind>;

export const SYSTEM_RUN_EVENT_KINDS: readonly RunEventKind[] = ['started', 'submitted'];

export const RunEventInput = z.object({
  kind: RunEventKind.refine((k) => !SYSTEM_RUN_EVENT_KINDS.includes(k), {
    message: 'started/submitted are recorded automatically',
  }),
  stepId: z.string().max(32), // '' when the event isn't tied to one step
  detail: z.string().max(4000),
});
export type RunEventInput = z.infer<typeof RunEventInput>;

// Format zod issues into one line for SenderError messages and form errors.
export function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
    .join('; ');
}
