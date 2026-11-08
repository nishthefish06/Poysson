<script setup lang="ts">
/*
 * INCIDENT OPS (replaces a "drills" picker)
 * You don't pick one drill — you arm threat vectors and the generator builds a
 * MIXED incident: one inject per armed vector, shuffled and overlapping.
 * DYNAMIC: setup.vectors, setup.difficulty, player.skills
 */
import { DIFFICULTY, VECTORS, type Difficulty } from '~/data/incidents'

const { state, player, toggleVector, buildIncident } = useGame()
const setup = computed(() => state.value.setup)
const ready = computed(() => setup.value.vectors.length >= 2)
const diffs = Object.entries(DIFFICULTY) as [Difficulty, typeof DIFFICULTY[Difficulty]][]

function armAll() { state.value.setup.vectors = VECTORS.map(v => v.id) }
function randomize() {
  const shuffled = VECTORS.map(v => v.id).sort(() => Math.random() - 0.5)
  state.value.setup.vectors = shuffled.slice(0, 2 + Math.floor(Math.random() * 4))
}
function launch() {
  buildIncident()
  navigateTo('/briefing')
}
</script>

<template>
  <div class="ops">
    <header class="page-head">
      <div>
        <div class="eyebrow eyebrow--magenta">Incident Ops · mixed-threat generator</div>
        <h1 class="page-head__title">Arm your threat mix</h1>
        <p class="page-head__sub">Real incidents don't arrive one at a time. Every vector you arm drops into a single shuffled incident — no two runs play the same.</p>
      </div>
      <div class="spacer" />
      <CyberButton variant="secondary" size="sm" icon="shuffle" @click="randomize">Randomize</CyberButton>
      <CyberButton variant="secondary" size="sm" icon="radar" @click="armAll">Arm all</CyberButton>
    </header>

    <section class="ops__cards">
      <ScenarioCard
        v-for="(v, i) in VECTORS" :key="v.id" :index="i + 1"
        :code="v.code" :name="v.name" :blurb="v.blurb" :icon="v.icon" :color="v.color"
        :armed="setup.vectors.includes(v.id)" :skill="player.skills[v.id]"
        @toggle="toggleVector(v.id)"
      />
    </section>

    <section class="ops__config">
      <CyberPanel title="Threat level" eyebrow="Difficulty" class="ops__diff">
        <div class="ops__diff-list" role="radiogroup">
          <button
            v-for="[id, d] in diffs" :key="id" role="radio" :aria-checked="setup.difficulty === id"
            class="ops__diff-opt" :class="{ 'is-on': setup.difficulty === id }" @click="state.setup.difficulty = id"
          >
            <span class="ops__diff-name">{{ d.label }}</span>
            <span class="ops__diff-desc mono">{{ d.desc }}</span>
            <span class="ops__diff-xp mono">×{{ d.xpMult }} XP</span>
          </button>
        </div>
      </CyberPanel>

      <CyberPanel title="Incident preview" eyebrow="Generator output" accent="magenta" class="ops__preview">
        <div class="ops__preview-body">
          <div class="ops__preview-stat"><span class="eyebrow">Vectors</span><b>{{ setup.vectors.length }}</b></div>
          <div class="ops__preview-stat"><span class="eyebrow">Injects</span><b>{{ setup.vectors.length }}</b></div>
          <div class="ops__preview-stat"><span class="eyebrow">Clock</span><b>{{ fmtTime(DIFFICULTY[setup.difficulty].seconds) }}</b></div>
          <div class="ops__preview-stat"><span class="eyebrow">Max XP</span><b>{{ Math.round((setup.vectors.length * 110 + 110) * DIFFICULTY[setup.difficulty].xpMult) }}</b></div>
        </div>
        <p v-if="!ready" class="ops__warn mono">! Arm at least 2 vectors to build a mixed incident</p>
        <CyberButton variant="primary" size="lg" block icon="bolt" :disabled="!ready" @click="launch">Generate incident</CyberButton>
      </CyberPanel>
    </section>
  </div>
</template>

<style scoped>
.ops { display: flex; flex-direction: column; gap: var(--s-6); }
.ops .page-head { margin-bottom: 0; }
.ops .page-head__sub { max-width: 640px; }
.ops__cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--s-4); }
.ops__config { display: grid; grid-template-columns: 1.3fr 1fr; gap: var(--s-5); }
.ops__diff-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-3); }
.ops__diff-opt { display: flex; flex-direction: column; gap: var(--s-1); align-items: flex-start; padding: var(--s-4); background: var(--c-bg-2); border: 1px solid var(--c-line-strong); color: var(--c-text); cursor: pointer; text-align: left; clip-path: var(--clip-chamfer-sm); transition: all var(--t-fast); }
.ops__diff-opt:hover { border-color: var(--c-cyan); }
.ops__diff-opt.is-on { border-color: var(--c-cyan); background: linear-gradient(180deg, rgba(0, 240, 255, .14), var(--c-bg-2)); box-shadow: inset 0 0 20px rgba(0, 240, 255, .12); }
.ops__diff-name { font-family: var(--f-display); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.ops__diff-opt.is-on .ops__diff-name { color: var(--c-cyan); text-shadow: var(--text-glow-cyan); }
.ops__diff-desc { font-size: 11px; color: var(--c-text-dim); }
.ops__diff-xp { font-size: 11px; color: var(--c-yellow); margin-top: var(--s-2); }
.ops__preview-body { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-3); margin-bottom: var(--s-4); }
.ops__preview-stat { display: flex; flex-direction: column; gap: 2px; }
.ops__preview-stat b { font-family: var(--f-display); font-size: var(--fs-xl); color: var(--c-magenta); text-shadow: var(--text-glow-magenta); }
.ops__warn { color: var(--c-ok); font-size: var(--fs-xs); margin-bottom: var(--s-3); }
@media (max-width: 1300px) { .ops__cards { grid-template-columns: repeat(3, 1fr); } .ops__config { grid-template-columns: 1fr; } }
@media (max-width: 800px) { .ops__cards { grid-template-columns: 1fr 1fr; } .ops__diff-list { grid-template-columns: 1fr; } }
</style>
