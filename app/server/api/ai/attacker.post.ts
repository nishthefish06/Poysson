import { AttackerTurnRequest, AttackerTurnResponse } from '@hack/shared'

/**
 * OWNER: Person 4. Nemotron red-team turn.
 * Hidden attacker goal + persona live server-side only.
 * Model replies with JSON { reply, tools[] }; validate, then execute tools
 * (inject_feed_event, spawn_customer_report, send_photon_text, give_up).
 */
export default defineEventHandler(async (event) => {
  const body = AttackerTurnRequest.parse(await readBody(event))
  void body
  return AttackerTurnResponse.parse({ reply: '…', tools: [] })
})
