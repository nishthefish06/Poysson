import { z } from 'zod'
import { Verdict } from './scenario'

/** One drill attempt. Mirrors the Spacetime `run` table. */
export const RunStatus = z.enum(['active', 'finished', 'abandoned'])
export type RunStatus = z.infer<typeof RunStatus>

export const Run = z.object({
  id: z.string(),
  employee_id: z.string(),
  scenario_id: z.string(),
  status: RunStatus,
  started_at: z.number().int(), // epoch ms
  ended_at: z.number().int().nullable(),
  score: z.number().int().nullable(),
  accuracy: z.number().min(0).max(1).nullable(),
  time_ms: z.number().int().nullable(),
})
export type Run = z.infer<typeof Run>

/**
 * Audit log + replay source. Mirrors the Spacetime `run_event` table.
 * kind:
 *  - action: the employee clicked something
 *  - system: a timeline event fired
 *  - ai:     attacker message / coaching injected by the AI service
 */
export const RunEvent = z.object({
  id: z.string(),
  run_id: z.string(),
  seq: z.number().int().nonnegative(),
  t_ms: z.number().int().nonnegative(),
  kind: z.enum(['action', 'system', 'ai']),
  action_id: z.string().nullable(),
  verdict: Verdict.nullable(),
  points_delta: z.number().int(),
  text: z.string().nullable(),
})
export type RunEvent = z.infer<typeof RunEvent>

export const ScoreBreakdown = z.object({
  action_points: z.number().int(),
  order_bonus: z.number().int(),
  time_bonus: z.number().int(),
  harmful_count: z.number().int().nonnegative(),
  total: z.number().int(),
  accuracy: z.number().min(0).max(1),
})
export type ScoreBreakdown = z.infer<typeof ScoreBreakdown>
