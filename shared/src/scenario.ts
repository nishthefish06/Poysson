import { z } from 'zod'

/**
 * Scenario contract. One JSON file per drill in /scenarios.
 * The full file holds the ANSWER KEY (verdicts, points, ideal_path).
 * Only `toPublicScenario()` output may ever reach the client.
 */

export const ScenarioCategory = z.enum([
  'ransomware',
  'sim_swap',
  'smishing',
  'phishing',
  'insider_leak',
])
export type ScenarioCategory = z.infer<typeof ScenarioCategory>

export const Verdict = z.enum(['ideal', 'ok', 'neutral', 'harmful'])
export type Verdict = z.infer<typeof Verdict>

/** Flat key/value state, e.g. { contained: false, creds_reset: false } */
export const ScenarioState = z.record(z.string(), z.union([z.boolean(), z.number(), z.string()]))
export type ScenarioState = z.infer<typeof ScenarioState>

export const FeedItem = z.object({
  type: z.enum(['alert', 'log', 'message', 'ticket', 'email', 'call']),
  text: z.string().min(1),
  from: z.string().optional(),
})
export type FeedItem = z.infer<typeof FeedItem>

export const TimelineEvent = z.object({
  /** seconds since drill start */
  t: z.number().int().nonnegative(),
  feed: FeedItem,
  /** only fire if this state flag is truthy */
  requires: z.string().optional(),
  /** only fire if this state flag is falsy */
  requires_not: z.string().optional(),
  /** state changes applied when the event fires */
  effects: ScenarioState.optional(),
})
export type TimelineEvent = z.infer<typeof TimelineEvent>

export const ScenarioAction = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().min(1),
  /** state flags that must be truthy before this action is allowed */
  prerequisites: z.array(z.string()).default([]),
  effects: ScenarioState.default({}),
  verdict: Verdict,
  points: z.number().int(),
  /** explanation shown in results; required for harmful actions */
  why: z.string().optional(),
})
export type ScenarioAction = z.infer<typeof ScenarioAction>

export const Scenario = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    category: ScenarioCategory,
    difficulty: z.number().int().min(1).max(5),
    est_minutes: z.number().int().positive(),
    briefing: z.string().min(1),
    initial_state: ScenarioState,
    timeline: z.array(TimelineEvent).min(1),
    actions: z.array(ScenarioAction).min(2),
    ideal_path: z.array(z.string()).min(1),
    scoring: z.object({
      time_bonus_max: z.number().int().nonnegative(),
      order_bonus: z.number().int().nonnegative(),
    }),
    tips: z.array(z.string()).default([]),
  })
  .superRefine((s, ctx) => {
    const ids = new Set(s.actions.map((a) => a.id))
    if (ids.size !== s.actions.length) {
      ctx.addIssue({ code: 'custom', message: 'duplicate action ids' })
    }
    for (const step of s.ideal_path) {
      if (!ids.has(step)) {
        ctx.addIssue({ code: 'custom', message: `ideal_path references unknown action "${step}"` })
      }
    }
    for (const a of s.actions) {
      if (a.verdict === 'harmful' && !a.why) {
        ctx.addIssue({ code: 'custom', message: `harmful action "${a.id}" needs a "why"` })
      }
    }
  })
export type Scenario = z.infer<typeof Scenario>

/** Safe-to-ship view: no verdicts, points, effects, timeline or ideal path. */
export const PublicScenario = z.object({
  id: z.string(),
  title: z.string(),
  category: ScenarioCategory,
  difficulty: z.number(),
  est_minutes: z.number(),
  briefing: z.string(),
  actions: z.array(z.object({ id: z.string(), label: z.string() })),
})
export type PublicScenario = z.infer<typeof PublicScenario>

export function toPublicScenario(s: Scenario): PublicScenario {
  return {
    id: s.id,
    title: s.title,
    category: s.category,
    difficulty: s.difficulty,
    est_minutes: s.est_minutes,
    briefing: s.briefing,
    actions: s.actions.map(({ id, label }) => ({ id, label })),
  }
}
