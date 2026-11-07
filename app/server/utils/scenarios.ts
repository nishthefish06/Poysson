/**
 * SERVER-ONLY scenario registry. Contains the answer key.
 * Never import this from pages/components/stores.
 * Add a new drill: drop the JSON in /scenarios and add one import line here.
 */
import { Scenario, toPublicScenario, type Scenario as ScenarioT } from '@hack/shared'
import smishingCredTheft from '../../../scenarios/smishing-cred-theft.json'

const raw: unknown[] = [smishingCredTheft]

export const scenarios: ReadonlyMap<string, ScenarioT> = new Map(
  raw.map((r) => {
    const s = Scenario.parse(r)
    return [s.id, s] as const
  }),
)

export function getScenario(id: string): ScenarioT {
  const s = scenarios.get(id)
  if (!s) throw createError({ statusCode: 404, statusMessage: `Unknown scenario ${id}` })
  return s
}

export function listPublicScenarios() {
  return [...scenarios.values()].map(toPublicScenario)
}
