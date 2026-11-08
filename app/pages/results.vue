<script setup lang="ts">
/*
 * RESULTS — debrief for the most recent run.
 * Tabs: Score · Replay (timeline scrubber: your path vs ideal path) · Tips · Report (preview)
 * DYNAMIC: runs[0] (or ?run=<id>), injects referenced by its decisions.
 */
import { badgeById } from '~/data/badges'
import { DIFFICULTY, injectById, vectorById, type Rating } from '~/data/incidents'

const { state, player } = useGame()
const route = useRoute()
const run = computed(() => state.value.runs.find(r => r.id === route.query.run) ?? state.value.runs[0])
const tab = ref((route.query.tab as string) || 'score')
const tabs = computed(() => [
  { id: 'score', label: 'Score', icon: 'trophy' },
  { id: 'replay', label: 'Replay', icon: 'rewind' },
  { id: 'tips', label: 'Tips', icon: 'info', count: tips.value.length },
  { id: 'report', label: 'Report', icon: 'print' },
])

/* ------ score breakdown ------ */
const counts = computed(() => {
  const c = { ideal: 0, ok: 0, harmful: 0 }
  run.value?.decisions.forEach(d => c[d.rating]++)
  return c
})
const avgResp = computed(() => {
  const d = run.value?.decisions ?? []
  return d.length ? (d.reduce((a, x) => a + (x.at - x.arrivedAt), 0) / d.length).toFixed(1) : '—'
})
const isSeed = computed(() => run.value && run.value.decisions.length === 0)

/* ------ replay ------ */
// Ideal path = ideal action taken 6s after the inject arrived.
const IDEAL_LAG = 6
const events = computed(() => {
  if (!run.value) return []
  return run.value.decisions.map((d) => {
    const inj = injectById(d.injectId)
    const ideal = inj.actions.find(a => a.rating === 'ideal')!
    const mine = inj.actions.find(a => a.id === d.actionId)!
    return { d, inj, ideal, mine, idealAt: d.arrivedAt + IDEAL_LAG }
  }).sort((a, b) => a.d.arrivedAt - b.d.arrivedAt)
})
const duration = computed(() => Math.max(run.value?.elapsed ?? 60, ...events.value.map(e => Math.max(e.d.at, e.idealAt) + 4)))
const scrub = ref(0)
const pct = (t: number) => `${(t / duration.value) * 100}%`
const focus = computed(() => {
  const past = events.value.filter(e => e.d.arrivedAt <= scrub.value)
  return past[past.length - 1] ?? events.value[0]
})
const yourPts = computed(() => events.value.filter(e => e.d.at <= scrub.value).reduce((a, e) => a + e.d.points + e.d.speedBonus, 0))
const idealPts = computed(() => events.value.filter(e => e.idealAt <= scrub.value).reduce((a, e) => a + 110, 0))
let playT: ReturnType<typeof setInterval> | undefined
const playing = ref(false)
function togglePlay() {
  playing.value = !playing.value
  clearInterval(playT)
  if (playing.value) {
    if (scrub.value >= duration.value) scrub.value = 0
    playT = setInterval(() => {
      scrub.value = Math.min(duration.value, scrub.value + 0.5)
      if (scrub.value >= duration.value) { playing.value = false; clearInterval(playT) }
    }, 50)
  }
}
onBeforeUnmount(() => clearInterval(playT))
function jump(t: number) { scrub.value = t }

/* ------ tips ------ */
const tips = computed(() => {
  if (!run.value) return []
  const list = run.value.decisions.filter(d => d.rating !== 'ideal').map((d) => {
    const inj = injectById(d.injectId)
    return { rating: d.rating as Rating, title: inj.title, vector: inj.vector, tip: inj.tip, ideal: inj.actions.find(a => a.rating === 'ideal')!.label }
  })
  for (const id of run.value.missed) {
    const inj = injectById(id)
    list.push({ rating: 'harmful', title: `${inj.title} (uncontained)`, vector: inj.vector, tip: inj.tip, ideal: inj.actions.find(a => a.rating === 'ideal')!.label })
  }
  return list.sort((a, b) => (a.rating === 'harmful' ? -1 : 1) - (b.rating === 'harmful' ? -1 : 1))
})
const ratingColor = (r: Rating) => `var(--c-${r})`
</script>

<template>
  <div v-if="run" class="res">
    <header class="page-head">
      <div>
        <div class="eyebrow eyebrow--magenta">Debrief · {{ run.planId }} · {{ DIFFICULTY[run.difficulty].label }}</div>
        <h1 class="page-head__title">OP: {{ run.codename }}</h1>
        <p class="page-head__sub mono">{{ new Date(run.finishedAt).toLocaleString() }} · T+{{ fmtTime(run.elapsed) }}</p>
      </div>
      <div class="spacer" />
      <CyberButton variant="secondary" icon="print" to="/report">Official report</CyberButton>
      <CyberButton variant="primary" icon="crosshair" to="/incidents/simulations">Run another</CyberButton>
    </header>

    <TabBar v-model="tab" :tabs="tabs" />

    <!-- =============== SCORE =============== -->
    <section v-if="tab === 'score'" class="res__score">
      <div class="res__grade-card">
        <div class="eyebrow">Final grade</div>
        <div class="res__grade" :class="`g-${run.grade}`">{{ run.grade }}</div>
        <div class="res__score-num">{{ run.score }} <span class="mute">/ {{ run.maxScore }}</span></div>
        <div class="res__score-bar"><div :style="{ width: (run.score / run.maxScore) * 100 + '%' }" /></div>
      </div>
      <div class="res__stats">
        <StatCard label="Accuracy" :value="run.accuracy" unit="%" icon="crosshair" accent="green" />
        <StatCard label="Avg response" :value="avgResp" unit="s" icon="clock" accent="cyan" />
        <StatCard label="Harmful" :value="counts.harmful" icon="alert" accent="red" :caption="`${run.missed.length} missed`" />
        <StatCard label="XP earned" :value="`+${run.xpEarned}`" icon="bolt" accent="magenta" :caption="`×${DIFFICULTY[run.difficulty].xpMult} multiplier`" />
      </div>
      <CyberPanel title="Level progress" eyebrow="Experience">
        <XpBar :value="player.xp" :max="xpForLevel(player.level)" :level="player.level" size="lg" :gain="run === state.runs[0] ? Math.min(run.xpEarned, player.xp) : 0" />
      </CyberPanel>
      <CyberPanel title="Decisions" :eyebrow="`${run.decisions.length} calls made`" accent="magenta">
        <div v-if="isSeed" class="mute mono">// historical run — per-decision data not retained</div>
        <div class="res__decisions">
          <div v-for="e in events" :key="e.d.injectId" class="res__dec">
            <span class="res__dec-vec" :style="{ color: `var(${vectorById(e.inj.vector).color})` }"><CyberIcon :name="vectorById(e.inj.vector).icon" :size="16" /></span>
            <div class="res__dec-main">
              <div class="res__dec-title">{{ e.inj.title }}</div>
              <div class="res__dec-act mono">{{ e.mine.label }}</div>
            </div>
            <StatusPill :status="e.d.rating" />
            <span class="res__dec-pts mono" :style="{ color: ratingColor(e.d.rating) }">{{ e.d.points + e.d.speedBonus > 0 ? '+' : '' }}{{ e.d.points + e.d.speedBonus }}</span>
          </div>
        </div>
      </CyberPanel>
      <CyberPanel v-if="run.newBadges.length" title="Unlocked" eyebrow="New badges" accent="magenta">
        <div class="row" style="gap: var(--s-5)">
          <CyberBadge v-for="b in run.newBadges.map(badgeById).filter(Boolean)" :key="b!.id" :name="b!.name" :icon="b!.icon" :tier="b!.tier" :desc="b!.desc" fresh />
        </div>
      </CyberPanel>
    </section>

    <!-- =============== REPLAY =============== -->
    <section v-else-if="tab === 'replay'" class="res__replay">
      <div v-if="!events.length" class="mute mono">// no decision data for this run</div>
      <template v-else>
        <CyberPanel title="Timeline" eyebrow="Your path vs ideal path">
          <template #actions>
            <div class="res__race mono">
              <span class="neon-cyan">YOU {{ yourPts }}</span> <span class="mute">vs</span> <span class="neon-magenta">IDEAL {{ idealPts }}</span>
            </div>
          </template>
          <div class="res__tl">
            <div class="res__lane">
              <span class="res__lane-lbl eyebrow eyebrow--cyan">Your path</span>
              <div class="res__lane-track">
                <button v-for="e in events" :key="'y' + e.d.injectId" class="res__mark" :style="{ left: pct(e.d.at), '--c': ratingColor(e.d.rating) }" :class="{ 'is-past': e.d.at <= scrub }" :title="e.mine.label" @click="jump(e.d.at)" />
                <span v-for="e in events" :key="'yl' + e.d.injectId" class="res__lag" :style="{ left: pct(e.d.arrivedAt), width: pct(e.d.at - e.d.arrivedAt) }" />
              </div>
            </div>
            <div class="res__lane">
              <span class="res__lane-lbl eyebrow">Injects</span>
              <div class="res__lane-track res__lane-track--inj">
                <button v-for="e in events" :key="'i' + e.d.injectId" class="res__inj" :style="{ left: pct(e.d.arrivedAt), '--c': `var(${vectorById(e.inj.vector).color})` }" @click="jump(e.d.arrivedAt)">
                  <CyberIcon :name="vectorById(e.inj.vector).icon" :size="12" />
                </button>
              </div>
            </div>
            <div class="res__lane">
              <span class="res__lane-lbl eyebrow eyebrow--magenta">Ideal path</span>
              <div class="res__lane-track">
                <button v-for="e in events" :key="'d' + e.d.injectId" class="res__mark res__mark--ideal" :style="{ left: pct(e.idealAt) }" :class="{ 'is-past': e.idealAt <= scrub }" :title="e.ideal.label" @click="jump(e.idealAt)" />
              </div>
            </div>
            <div class="res__playhead" :style="{ left: `calc(110px + (100% - 110px) * ${scrub / duration})` }" />
          </div>
          <div class="res__scrubber">
            <button class="res__play" :aria-label="playing ? 'Pause' : 'Play'" @click="togglePlay"><CyberIcon :name="playing ? 'x' : 'play'" :size="16" /></button>
            <input v-model.number="scrub" type="range" min="0" :max="duration" step="0.5" class="res__range" aria-label="Scrub timeline">
            <span class="mono res__clock">T+{{ fmtTime(scrub) }} / {{ fmtTime(duration) }}</span>
          </div>
        </CyberPanel>

        <div v-if="focus" class="res__compare">
          <CyberPanel :title="focus.inj.title" :eyebrow="`Inject @ T+${fmtTime(focus.d.arrivedAt)} · ${vectorById(focus.inj.vector).name}`" accent="none" class="res__compare-ctx">
            <p class="dim">{{ focus.inj.item.body }}</p>
          </CyberPanel>
          <CyberPanel title="You did" :eyebrow="`T+${fmtTime(focus.d.at)} · ${(focus.d.at - focus.d.arrivedAt).toFixed(1)}s to respond`" :accent="focus.d.rating === 'harmful' ? 'red' : 'cyan'">
            <div class="res__did"><StatusPill :status="focus.d.rating" /> <b>{{ focus.mine.label }}</b></div>
            <p class="dim res__why">{{ focus.mine.feedback }}</p>
          </CyberPanel>
          <CyberPanel title="Ideal" :eyebrow="`T+${fmtTime(focus.idealAt)} · ${IDEAL_LAG}s to respond`" accent="magenta">
            <div class="res__did"><StatusPill status="ideal" /> <b>{{ focus.ideal.label }}</b></div>
            <p class="dim res__why">{{ focus.ideal.feedback }}</p>
          </CyberPanel>
        </div>
      </template>
    </section>

    <!-- =============== TIPS =============== -->
    <section v-else-if="tab === 'tips'" class="res__tips">
      <div v-if="!tips.length" class="res__perfect">
        <CyberIcon name="star" :size="48" />
        <h2>Flawless. Nothing to fix.</h2>
        <p class="dim">Crank the difficulty or arm more vectors.</p>
      </div>
      <CyberPanel v-for="(t, i) in tips" :key="i" :accent="t.rating === 'harmful' ? 'red' : 'none'" class="res__tip">
        <div class="res__tip-head">
          <StatusPill :status="t.rating" />
          <span class="res__tip-vec mono" :style="{ color: `var(${vectorById(t.vector).color})` }">{{ vectorById(t.vector).code }}</span>
          <h3>{{ t.title }}</h3>
        </div>
        <p class="res__tip-body">{{ t.tip }}</p>
        <div class="res__tip-ideal mono"><CyberIcon name="check" :size="14" /> Ideal call: {{ t.ideal }}</div>
      </CyberPanel>
    </section>

    <!-- =============== REPORT PREVIEW =============== -->
    <section v-else class="res__report">
      <div class="res__report-preview">
        <ReportDocument :run="run" />
      </div>
      <div class="res__report-side">
        <CyberPanel title="Export" eyebrow="Official record">
          <div class="stack">
            <p class="dim">A printable, signed after-action report. The report hash is anchored to Solana so auditors can prove it wasn't edited.</p>
            <SolanaVerified :tx="run.tx" />
            <CyberButton variant="primary" icon="print" block to="/report">Open printable report</CyberButton>
          </div>
        </CyberPanel>
      </div>
    </section>
  </div>
  <div v-else class="mute mono">// no runs yet — <NuxtLink to="/incidents">start an incident</NuxtLink></div>
</template>

<style scoped>
.res { display: flex; flex-direction: column; gap: var(--s-5); }
.res .page-head { margin-bottom: 0; }

/* score */
.res__score { display: grid; grid-template-columns: 300px 1fr; gap: var(--s-5); }
.res__score > :nth-child(n+3) { grid-column: 1 / -1; }
.res__grade-card { display: flex; flex-direction: column; align-items: center; gap: var(--s-2); padding: var(--s-6); background: var(--c-bg-1); border: 1px solid var(--c-line-strong); border-radius: var(--r-lg); grid-row: span 1; }
.res__grade { font-family: var(--f-display); font-size: 110px; font-weight: 900; line-height: 1; }
.res__score-num { font-family: var(--f-display); font-size: var(--fs-xl); }
.res__score-bar { width: 100%; height: 6px; background: var(--c-bg-3); }
.res__score-bar div { height: 100%; background: linear-gradient(90deg, var(--c-magenta), var(--c-cyan)); box-shadow: 0 0 8px var(--c-cyan); }
.res__stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--s-4); }
.res__decisions { display: flex; flex-direction: column; gap: var(--s-2); }
.res__dec { display: grid; grid-template-columns: 24px 1fr auto 60px; gap: var(--s-3); align-items: center; padding: var(--s-3); background: var(--c-bg-2); }
.res__dec-title { font-weight: 700; }
.res__dec-act { font-size: 12px; color: var(--c-text-dim); }
.res__dec-pts { text-align: right; font-weight: 700; }
.g-S { color: var(--c-magenta); text-shadow: 0 0 30px var(--c-magenta); }
.g-A { color: var(--c-ideal); text-shadow: 0 0 30px var(--c-ideal); }
.g-B { color: var(--c-cyan); text-shadow: 0 0 30px var(--c-cyan); }
.g-C { color: var(--c-ok); text-shadow: 0 0 30px var(--c-ok); }
.g-D { color: var(--c-harmful); text-shadow: 0 0 30px var(--c-harmful); }

/* replay */
.res__replay { display: flex; flex-direction: column; gap: var(--s-4); }
.res__race { font-size: var(--fs-sm); font-weight: 700; display: flex; gap: var(--s-2); }
.res__tl { position: relative; display: flex; flex-direction: column; gap: var(--s-3); padding: var(--s-3) 0; }
.res__lane { display: grid; grid-template-columns: 110px 1fr; align-items: center; }
.res__lane-track { position: relative; height: 34px; background: repeating-linear-gradient(90deg, var(--c-line) 0 1px, transparent 1px 10%); border-top: 1px solid var(--c-line); border-bottom: 1px solid var(--c-line); }
.res__lane-track--inj { height: 26px; }
.res__mark { --c: var(--c-cyan); position: absolute; top: 50%; width: 16px; height: 16px; transform: translate(-50%, -50%) rotate(45deg); background: var(--c-bg-0); border: 2px solid var(--c); cursor: pointer; padding: 0; z-index: 2; transition: background var(--t-fast); }
.res__mark.is-past { background: var(--c); box-shadow: 0 0 10px var(--c); }
.res__mark--ideal { --c: var(--c-magenta); }
.res__lag { position: absolute; top: 50%; height: 2px; background: linear-gradient(90deg, transparent, var(--c-cyan)); opacity: .5; }
.res__inj { --c: var(--c-cyan); position: absolute; top: 50%; transform: translate(-50%, -50%); width: 22px; height: 22px; display: grid; place-items: center; padding: 0; color: var(--c); background: var(--c-bg-1); border: 1px solid var(--c); cursor: pointer; }
.res__playhead { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--c-yellow); box-shadow: 0 0 10px var(--c-yellow); pointer-events: none; z-index: 3; }
.res__scrubber { display: grid; grid-template-columns: 40px 1fr auto; gap: var(--s-3); align-items: center; margin-top: var(--s-3); }
.res__play { width: 40px; height: 40px; display: grid; place-items: center; background: var(--c-cyan); color: var(--c-text-invert); border: 0; cursor: pointer; border-radius: var(--r-md); }
.res__range { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; background: var(--c-bg-3); outline: none; }
.res__range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 24px; background: var(--c-yellow); box-shadow: 0 0 10px var(--c-yellow); cursor: grab; }
.res__range::-moz-range-thumb { width: 14px; height: 24px; background: var(--c-yellow); border: 0; cursor: grab; }
.res__clock { font-size: var(--fs-sm); color: var(--c-yellow); }
.res__compare { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: var(--s-4); }
.res__did { display: flex; gap: var(--s-3); align-items: center; flex-wrap: wrap; }
.res__why { margin-top: var(--s-3); font-size: var(--fs-sm); }

/* tips */
.res__tips { display: flex; flex-direction: column; gap: var(--s-3); }
.res__tip-head { display: flex; gap: var(--s-3); align-items: center; }
.res__tip-head h3 { font-size: var(--fs-md); }
.res__tip-vec { font-size: 11px; font-weight: 700; }
.res__tip-body { margin: var(--s-3) 0; font-size: var(--fs-md); }
.res__tip-ideal { display: flex; gap: var(--s-2); align-items: center; font-size: 12px; color: var(--c-ideal); }
.res__perfect { display: flex; flex-direction: column; align-items: center; gap: var(--s-3); padding: var(--s-12); color: var(--c-yellow); text-align: center; }

/* report preview */
.res__report { display: grid; grid-template-columns: 1fr 320px; gap: var(--s-5); align-items: start; }
.res__report-preview { max-height: 72vh; overflow: auto; padding: var(--s-6); background: #1b1f2b; border: 1px solid var(--c-line); }
.res__report-preview :deep(.report-doc) { transform-origin: top center; box-shadow: 0 10px 40px rgba(0, 0, 0, .6); }
@media (max-width: 1100px) { .res__score, .res__report, .res__compare { grid-template-columns: 1fr; } }
</style>
