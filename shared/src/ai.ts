import { z } from 'zod'
import { ScenarioCategory, FeedItem } from './scenario'

/**
 * Contracts for the AI service (app/server/api/ai/*).
 * Model output is ALWAYS parsed with these schemas before it touches the DB.
 */

/** POST /api/ai/coach — Gemini coaching after a finished run */
export const CoachRequest = z.object({ run_id: z.string() })
export const CoachResponse = z.object({
  summary: z.string(),
  mistakes: z.array(
    z.object({
      action_id: z.string().nullable(),
      what_happened: z.string(),
      better_move: z.string(),
    }),
  ),
  tips: z.array(z.string()).max(5),
  /** honest confidence in the assessment, 0..1 */
  confidence: z.number().min(0).max(1),
})
export type CoachResponse = z.infer<typeof CoachResponse>

/** POST /api/ai/attacker — Nemotron red-team turn during a live drill */
export const AttackerTurnRequest = z.object({
  run_id: z.string(),
  /** what the employee just said in the comms panel */
  employee_message: z.string().max(2000),
})
export const AttackerTool = z.discriminatedUnion('tool', [
  z.object({ tool: z.literal('inject_feed_event'), feed: FeedItem }),
  z.object({ tool: z.literal('spawn_customer_report'), text: z.string() }),
  z.object({ tool: z.literal('send_photon_text'), text: z.string() }),
  z.object({ tool: z.literal('give_up'), reason: z.string() }),
])
export type AttackerTool = z.infer<typeof AttackerTool>
export const AttackerTurnResponse = z.object({
  reply: z.string(),
  tools: z.array(AttackerTool).default([]),
})
export type AttackerTurnResponse = z.infer<typeof AttackerTurnResponse>

/** POST /api/ai/generate-scenario — output must then pass `Scenario.parse` */
export const GenerateScenarioRequest = z.object({
  category: ScenarioCategory,
  difficulty: z.number().int().min(1).max(5),
  focus: z.string().max(500).optional(),
})
