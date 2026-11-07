import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Scenario } from './scenario'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../../scenarios')
let failed = 0
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const result = Scenario.safeParse(JSON.parse(readFileSync(join(dir, file), 'utf8')))
  if (result.success) {
    console.log(`ok    ${file}`)
  } else {
    failed++
    console.error(`FAIL  ${file}`)
    for (const issue of result.error.issues)
      console.error(`      ${issue.path.join('.')}: ${issue.message}`)
  }
}
process.exit(failed ? 1 : 0)
