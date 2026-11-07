import { CoachRequest, CoachResponse } from '@hack/shared'

/**
 * OWNER: Person 4. Gemini coaching for a finished run.
 * 1. load run + run_events from Spacetime
 * 2. load answer key via getScenario()
 * 3. ask Gemini for JSON matching CoachResponse (structured output)
 * 4. CoachResponse.parse() before returning
 */
export default defineEventHandler(async (event) => {
  const body = CoachRequest.parse(await readBody(event))
  void body
  const draft = {
    summary: 'Coaching not wired up yet.',
    mistakes: [],
    tips: [],
    confidence: 0,
  }
  return CoachResponse.parse(draft)
})
