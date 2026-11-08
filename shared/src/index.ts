// Contracts shared by the SpacetimeDB module, the Nuxt app and the Nemotron agent.
// The module validates string enums and JSON payloads against these schemas, so anything that
// writes a scenario, a simulation turn or a score (UI or AI) must produce exactly these shapes.
import { z } from 'zod';

// ---------- Enums ----------

export const AttackType = z.enum(['ransomware', 'sim_swap', 'smishing', 'phishing', 'insider_leak']);
export type AttackType = z.infer<typeof AttackType>;

export const ATTACK_LABELS: Record<AttackType, string> = {
  ransomware: 'Ransomware breach',
  sim_swap: 'SIM-swap fraud ring',
  smishing: 'Smishing',
  phishing: 'Phishing',
  insider_leak: 'Insider or vendor leak',
};

// Where in the attack a step happens.
export const AttackStage = z.enum(['before', 'during', 'after']);
export type AttackStage = z.infer<typeof AttackStage>;

export const Difficulty = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof Difficulty>;

// guided = scripted steps with hints; unguided = Nemotron plays the attacker live and adapts.
export const SimMode = z.enum(['guided', 'unguided']);
export type SimMode = z.infer<typeof SimMode>;

export const Role = z.enum(['employee', 'admin']);
export type Role = z.infer<typeof Role>;

export const ScenarioStatus = z.enum(['draft', 'published']);
export type ScenarioStatus = z.infer<typeof ScenarioStatus>;

export const ScenarioSource = z.enum(['manual', 'nemotron']);
export type ScenarioSource = z.infer<typeof ScenarioSource>;

// Who a guide (runbook) is written for: frontline staff, or the people handling the incident.
export const GuideAudience = z.enum(['employee', 'responder']);
export type GuideAudience = z.infer<typeof GuideAudience>;

// assigned (by an admin) → in_progress → submitted (employee or agent ended it) → reviewed (scored)
export const RunStatus = z.enum(['assigned', 'in_progress', 'submitted', 'reviewed']);
export type RunStatus = z.infer<typeof RunStatus>;

export const LoginStage = z.enum(['totp', 'enroll']);
export type LoginStage = z.infer<typeof LoginStage>;

// Live difficulty during a run, 1 (gentle) to 5 (relentless). The agent moves it.
export const RUN_DIFFICULTY = { min: 1, max: 5 } as const;
export const START_DIFFICULTY: Record<Difficulty, number> = { easy: 1, medium: 3, hard: 4 };

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
  stage: AttackStage.optional(), // where in the attack this happens; treated as 'during' when absent
  channel: Channel,
  from: z.string().min(1).max(200),
  subject: z.string().max(300),
  body: z.string().min(1).max(4000),
  // Optional, additive: existing scenarios without these stay valid.
  links: z.array(StepLink).max(5).optional(),
  form: StepForm.optional(),
  hint: z.string().max(1000).optional(), // shown in guided mode
});
export type ScenarioStep = z.infer<typeof ScenarioStep>;

// Stored in scenario.contentJson. Everything here is visible to the employee.
export const ScenarioContent = z
  .object({
    steps: z.array(ScenarioStep).min(1).max(20),
    // Ransomware: the run starts with the employee's (simulated) T-Mobile dashboard locked.
    lockout: z.boolean().optional(),
  })
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

// Stored in scenario.rubricJson. Answer key for admins and the agent; never shown to employees.
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

// A complete scenario, as an admin form or Nemotron should produce it.
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

// ---------- Run events (what the employee did) ----------

// 'started' and 'submitted' are written by the module itself; the rest come from logRunEvent.
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

// ---------- Live simulation chat (unguided mode) ----------

// attacker = Nemotron in character; coach = Nemotron out of character (hints, debrief);
// employee = the trainee; system = the module (lockout, stage changes).
export const SimSender = z.enum(['attacker', 'coach', 'employee', 'system']);
export type SimSender = z.infer<typeof SimSender>;

export const MESSAGE_MAX = 4000;

// One attacker turn, as the agent submits it through postAttackerMessage.
export const AttackerTurn = z.object({
  channel: Channel,
  from: z.string().min(1).max(200), // who the attacker claims to be
  stage: AttackStage,
  body: z.string().min(1).max(MESSAGE_MAX),
});
export type AttackerTurn = z.infer<typeof AttackerTurn>;

// The agent's score at the end of a run (scoreRun).
export const RunScore = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().min(1).max(4000),
  strengths: z.array(z.string().min(1).max(300)).max(10),
  mistakes: z.array(z.string().min(1).max(300)).max(10),
});
export type RunScore = z.infer<typeof RunScore>;

// ---------- Helpers ----------

// Format zod issues into one line for SenderError messages and form errors.
export function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
    .join('; ');
}
