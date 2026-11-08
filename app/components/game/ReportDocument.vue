<script setup lang="ts">
/*
 * ReportDocument — official, printable after-action report (Letter size).
 * Deliberately NOT cyberpunk: clean, black-on-white, print-safe.
 * DYNAMIC: run (RunResult) + player.
 */
import type { RunResult } from '~/composables/useGame'
import { DIFFICULTY, injectById, vectorById } from '~/data/incidents'

const props = defineProps<{ run: RunResult }>()
const { player } = useGame()

const rows = computed(() => props.run.decisions.slice().sort((a, b) => a.arrivedAt - b.arrivedAt).map((d) => {
  const inj = injectById(d.injectId)
  return { d, inj, action: inj.actions.find(a => a.id === d.actionId)! }
}))
const missed = computed(() => props.run.missed.map(injectById))
const recs = computed(() => {
  const out = rows.value.filter(r => r.d.rating !== 'ideal').map(r => ({ sev: r.d.rating === 'harmful' ? 'High' : 'Medium', text: r.inj.tip, area: vectorById(r.inj.vector).name }))
  missed.value.forEach(i => out.push({ sev: 'High', text: i.tip, area: vectorById(i.vector).name }))
  if (!out.length) out.push({ sev: 'Info', text: 'All injects were handled ideally. Increase difficulty or vector count for the next exercise.', area: 'General' })
  if (props.run.comms.length < 3) out.push({ sev: 'Low', text: 'Not all stakeholder communications were issued. Establish a comms checklist that triggers on incident open.', area: 'Communications' })
  return out
})
const counts = computed(() => {
  const c = { ideal: 0, ok: 0, harmful: 0 }
  props.run.decisions.forEach(d => c[d.rating]++)
  return c
})
const date = computed(() => new Date(props.run.finishedAt))
const docNo = computed(() => `AAR-${date.value.getFullYear()}-${props.run.planId.replace('IR-', '')}`)
</script>

<template>
  <article class="report-doc">
    <header class="rd__head">
      <div class="rd__org">
        <div class="rd__logo">H</div>
        <div>
          <div class="rd__org-name">Halcyon Systems, Inc.</div>
          <div class="rd__org-sub">Security Operations Center</div>
        </div>
      </div>
      <div class="rd__class">INTERNAL — TRAINING RECORD</div>
    </header>

    <h1 class="rd__title">After-Action Report</h1>
    <p class="rd__subtitle">Tabletop Incident Response Exercise · Operation {{ run.codename }}</p>

    <table class="rd__meta">
      <tbody>
        <tr><th>Document no.</th><td>{{ docNo }}</td><th>Date</th><td>{{ date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) }}</td></tr>
        <tr><th>Participant</th><td>{{ player.handle }} ({{ player.email }})</td><th>Exercise ID</th><td>{{ run.planId }}</td></tr>
        <tr><th>Difficulty</th><td>{{ DIFFICULTY[run.difficulty].label }}</td><th>Duration</th><td>{{ fmtTime(run.elapsed) }}</td></tr>
        <tr><th>Vectors</th><td colspan="3">{{ run.vectors.map(v => vectorById(v).name).join(', ') }}</td></tr>
      </tbody>
    </table>

    <h2 class="rd__h2">1. Score summary</h2>
    <div class="rd__summary">
      <div class="rd__grade"><span>{{ run.grade }}</span><small>Grade</small></div>
      <div class="rd__kpis">
        <div><b>{{ run.score }}</b><small>of {{ run.maxScore }} points</small></div>
        <div><b>{{ run.accuracy }}%</b><small>Ideal-response accuracy</small></div>
        <div><b>{{ counts.ideal }} / {{ counts.ok }} / {{ counts.harmful }}</b><small>Ideal / Acceptable / Harmful</small></div>
        <div><b>{{ run.missed.length }}</b><small>Uncontained injects</small></div>
      </div>
    </div>

    <h2 class="rd__h2">2. Timeline of events</h2>
    <table v-if="rows.length || missed.length" class="rd__table">
      <thead><tr><th>Inject</th><th>Response</th><th>Event</th><th>Action taken</th><th>Assessment</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.d.injectId">
          <td class="rd__mono">T+{{ fmtTime(r.d.arrivedAt) }}</td>
          <td class="rd__mono">T+{{ fmtTime(r.d.at) }}</td>
          <td><b>{{ r.inj.title }}</b><br><small>{{ vectorById(r.inj.vector).name }} · {{ r.inj.severity.toUpperCase() }}</small></td>
          <td>{{ r.action.label }}</td>
          <td><span class="rd__tag" :class="`rd__tag--${r.d.rating}`">{{ r.d.rating === 'ok' ? 'Acceptable' : r.d.rating === 'ideal' ? 'Ideal' : 'Harmful' }}</span></td>
        </tr>
        <tr v-for="m in missed" :key="m.id">
          <td class="rd__mono">—</td><td class="rd__mono">—</td>
          <td><b>{{ m.title }}</b><br><small>{{ vectorById(m.vector).name }}</small></td>
          <td><i>No action before time expired</i></td>
          <td><span class="rd__tag rd__tag--harmful">Missed</span></td>
        </tr>
      </tbody>
    </table>
    <p v-else class="rd__note">Per-decision telemetry was not retained for this historical exercise.</p>

    <h2 class="rd__h2">3. Recommendations</h2>
    <ol class="rd__recs">
      <li v-for="(r, i) in recs" :key="i"><span class="rd__sev">[{{ r.sev }}]</span> <b>{{ r.area }}:</b> {{ r.text }}</li>
    </ol>

    <footer class="rd__foot">
      <div class="rd__sign">
        <div class="rd__sign-line" />
        <small>Exercise controller</small>
      </div>
      <div class="rd__sign">
        <div class="rd__sign-line" />
        <small>Participant</small>
      </div>
      <div class="rd__verify">
        <small>Integrity anchor (Solana devnet)</small>
        <code v-if="anchorOf(run) === 'anchored'">{{ run.tx.slice(0, 44) }}<br>{{ run.tx.slice(44) }}</code>
        <code v-else>{{ anchorOf(run) === 'pending' ? 'anchoring…' : anchorOf(run) === 'demo' ? 'sample data (not anchored)' : 'not anchored' }}</code>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.report-doc {
  width: 8.5in; min-height: 11in; margin: 0 auto; padding: .75in .8in;
  background: #fff; color: #16181d;
  font-family: 'Chakra Petch', Georgia, serif; font-size: 12px; line-height: 1.5;
}
.rd__head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 3px solid #16181d; }
.rd__org { display: flex; gap: 10px; align-items: center; }
.rd__logo { width: 34px; height: 34px; display: grid; place-items: center; background: #16181d; color: #fff; font-family: 'Orbitron', sans-serif; font-weight: 900; }
.rd__org-name { font-weight: 700; font-size: 14px; }
.rd__org-sub { font-size: 11px; color: #5b6170; }
.rd__class { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: .12em; padding: 4px 8px; border: 1.5px solid #b3132b; color: #b3132b; }
.rd__title { font-family: 'Orbitron', sans-serif; font-size: 26px; margin-top: 24px; letter-spacing: .02em; color: #16181d; }
.rd__subtitle { color: #5b6170; margin-bottom: 16px; }
.rd__meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
.rd__meta th, .rd__meta td { text-align: left; padding: 5px 8px; border: 1px solid #d5d8df; font-size: 11px; }
.rd__meta th { background: #f2f3f6; font-weight: 600; width: 16%; color: #3b404c; }
.rd__h2 { font-family: 'Orbitron', sans-serif; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; margin: 22px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #d5d8df; color: #16181d; }
.rd__summary { display: flex; gap: 20px; align-items: stretch; }
.rd__grade { width: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid #16181d; }
.rd__grade span { font-family: 'Orbitron', sans-serif; font-size: 44px; font-weight: 900; line-height: 1; }
.rd__grade small, .rd__kpis small { font-size: 10px; color: #5b6170; text-transform: uppercase; letter-spacing: .08em; }
.rd__kpis { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rd__kpis div { display: flex; flex-direction: column; padding: 8px 12px; background: #f2f3f6; }
.rd__kpis b { font-family: 'Orbitron', sans-serif; font-size: 18px; }
.rd__table { width: 100%; border-collapse: collapse; }
.rd__table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #5b6170; padding: 6px; border-bottom: 2px solid #16181d; }
.rd__table td { padding: 7px 6px; border-bottom: 1px solid #e3e5ea; vertical-align: top; font-size: 11px; }
.rd__table small { color: #5b6170; }
.rd__mono { font-family: 'JetBrains Mono', monospace; font-size: 10px !important; white-space: nowrap; }
.rd__tag { display: inline-block; font-size: 10px; font-weight: 700; padding: 1px 6px; border: 1px solid; }
.rd__tag--ideal { color: #0f7a3d; }
.rd__tag--ok { color: #9a6200; }
.rd__tag--harmful { color: #b3132b; }
.rd__note { color: #5b6170; font-style: italic; }
.rd__recs { padding-left: 18px; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.rd__sev { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #5b6170; }
.rd__foot { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 24px; margin-top: 48px; align-items: end; }
.rd__sign-line { border-bottom: 1px solid #16181d; height: 30px; margin-bottom: 4px; }
.rd__sign small, .rd__verify small { font-size: 10px; color: #5b6170; text-transform: uppercase; letter-spacing: .06em; }
.rd__verify code { display: block; font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #3b404c; word-break: break-all; margin-top: 4px; }
</style>
