import { z } from 'zod'

const Body = z.object({ to: z.string(), text: z.string().max(600) })

/**
 * OWNER: Person 4. Sends a DRILL text via Photon.
 * Only to consenting teammates listed in DRILL_ALLOWED_NUMBERS; always labeled as a drill.
 */
export default defineEventHandler(async (event) => {
  const { to, text } = Body.parse(await readBody(event))
  const allowed = useRuntimeConfig()
    .drillAllowedNumbers.split(',')
    .map((n) => n.trim())
  if (!allowed.includes(to)) {
    throw createError({ statusCode: 403, statusMessage: 'Number not on drill allowlist' })
  }
  const labeled = `[DRILL] ${text}`
  void labeled
  // TODO: Photon API call
  return { ok: true, queued: false }
})
