<script setup lang="ts">
/*
 * BRIEFING — mission brief for the generated incident.
 * Intel is intentionally vague: you know which vectors are in play, not the order.
 * DYNAMIC: state.plan
 */
import { COMMS_ACTIONS, DIFFICULTY, vectorById } from '~/data/incidents'

const { state, buildIncident } = useGame()
const plan = computed(() => state.value.plan)
if (!plan.value) navigateTo('/incidents/simulations')

const typed = ref('')
const intro = computed(() => plan.value
  ? `> Halcyon Systems SOC. 03:14 local. Multiple sensors tripping at once. Intel suggests ${plan.value.vectors.length} concurrent threat vectors. You are incident commander. Contain, preserve evidence, communicate. Clock starts on your mark.`
  : '')
onMounted(() => {
  let i = 0
  const t = setInterval(() => { typed.value = intro.value.slice(0, ++i); if (i >= intro.value.length) clearInterval(t) }, 14)
})
function reroll() { buildIncident() }
</script>

<template>
  <div v-if="plan" class="brief">
    <header class="page-head">
      <div>
        <div class="eyebrow eyebrow--magenta">Mission briefing · {{ plan.id }}</div>
        <h1 class="page-head__title">OPERATION <span class="neon-magenta glitch" :data-text="plan.codename">{{ plan.codename }}</span></h1>
      </div>
      <div class="spacer" />
      <CyberButton variant="ghost" size="sm" icon="back" to="/incidents/simulations">Change mix</CyberButton>
    </header>

    <div class="brief__grid">
      <CyberPanel title="Situation" eyebrow="SITREP" class="brief__sitrep">
        <p class="brief__typed mono" :class="{ 'cursor-blink': typed.length < intro.length }">{{ typed }}</p>
        <div class="brief__intel">
          <div class="eyebrow">Threat intel — expected vectors (order unknown)</div>
          <div class="brief__vectors">
            <div v-for="v in plan.vectors" :key="v" class="brief__vector" :style="{ '--c': `var(${vectorById(v).color})` }">
              <CyberIcon :name="vectorById(v).icon" :size="22" />
              <div>
                <div class="brief__vector-name">{{ vectorById(v).name }}</div>
                <div class="brief__vector-blurb">{{ vectorById(v).blurb }}</div>
              </div>
            </div>
          </div>
        </div>
      </CyberPanel>

      <div class="brief__side">
        <CyberPanel title="Rules of engagement" eyebrow="ROE" accent="magenta">
          <ol class="brief__roe">
            <li><b>Contain first.</b> Stop spread before you investigate.</li>
            <li><b>Preserve evidence.</b> Don't power off, delete or tip off.</li>
            <li><b>Verify out-of-band.</b> Never trust the compromised channel.</li>
            <li><b>Communicate.</b> Escalate and loop in Legal when data is at risk.</li>
          </ol>
        </CyberPanel>
        <CyberPanel title="Scoring" eyebrow="Payout" accent="none">
          <div class="brief__scoring">
            <div class="row"><StatusPill status="ideal" /> <span class="dim">up to +100</span></div>
            <div class="row"><StatusPill status="ok" /> <span class="dim">partial</span></div>
            <div class="row"><StatusPill status="harmful" /> <span class="dim">penalty + consequence</span></div>
            <div class="row mono brief__bonus"><CyberIcon name="clock" :size="14" /> Respond &lt; 20s → +10 speed bonus</div>
            <div class="row mono brief__bonus"><CyberIcon name="radio" :size="14" /> {{ COMMS_ACTIONS.length }} comms calls, scored once each</div>
          </div>
        </CyberPanel>
        <div class="brief__launch">
          <div class="brief__launch-meta mono">
            <span>{{ DIFFICULTY[plan.difficulty].label.toUpperCase() }}</span>
            <span>{{ (plan.mode ?? 'unguided').toUpperCase() }}</span>
            <span>CLOCK {{ fmtTime(plan.duration) }}</span>
            <span>SEED {{ plan.seed }}</span>
          </div>
          <CyberButton variant="primary" size="lg" block icon="play" to="/simulator">Engage</CyberButton>
          <CyberButton variant="secondary" size="sm" block icon="shuffle" @click="reroll">Re-roll incident</CyberButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brief__grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: var(--s-5); }
.brief__typed { font-size: var(--fs-md); line-height: 1.7; color: var(--c-ideal); min-height: 110px; text-shadow: 0 0 6px rgba(var(--rgb-ideal), .4); }
.brief__intel { margin-top: var(--s-6); display: flex; flex-direction: column; gap: var(--s-3); }
.brief__vectors { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-3); }
.brief__vector { display: flex; gap: var(--s-3); align-items: flex-start; padding: var(--s-3); color: var(--c); background: color-mix(in srgb, var(--c) 6%, var(--c-bg-2)); border-left: 3px solid var(--c); }
.brief__vector-name { color: var(--c-text); font-weight: 700; letter-spacing: .04em; }
.brief__vector-blurb { color: var(--c-text-dim); font-size: var(--fs-xs); }
.brief__side { display: flex; flex-direction: column; gap: var(--s-4); }
.brief__roe { margin: 0; padding-left: var(--s-5); display: flex; flex-direction: column; gap: var(--s-2); font-size: var(--fs-sm); color: var(--c-text-dim); }
.brief__roe b { color: var(--c-text); }
.brief__roe li::marker { color: var(--c-magenta); font-family: var(--f-mono); }
.brief__scoring { display: flex; flex-direction: column; gap: var(--s-2); font-size: var(--fs-sm); }
.brief__bonus { font-size: 11px; color: var(--c-yellow); gap: var(--s-2); }
.brief__launch { display: flex; flex-direction: column; gap: var(--s-3); }
.brief__launch-meta { display: flex; justify-content: space-between; font-size: 10px; color: var(--c-text-mute); letter-spacing: .14em; }
@media (max-width: 1100px) { .brief__grid { grid-template-columns: 1fr; } .brief__vectors { grid-template-columns: 1fr; } }
</style>
