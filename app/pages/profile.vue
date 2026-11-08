<script setup lang="ts">
/*
 * PROFILE — badges and lifetime stats.
 * DYNAMIC: player, runs[], badges.
 */
import { BADGES } from '~/data/badges'
import { VECTORS } from '~/data/incidents'

const { player, state, accuracy, resetDemo } = useGame()
const runs = computed(() => state.value.runs)
const totalHarmful = computed(() => runs.value.reduce((a, r) => a + r.decisions.filter(d => d.rating === 'harmful').length, 0))
const sCount = computed(() => runs.value.filter(r => r.grade === 'S').length)
const fav = computed(() => VECTORS.slice().sort((a, b) => player.value.skills[b.id] - player.value.skills[a.id])[0])
</script>

<template>
  <div class="prof">
    <section class="prof__card">
      <div class="prof__avatar">{{ player.handle.slice(0, 2).toUpperCase() }}</div>
      <div class="prof__id">
        <div class="eyebrow eyebrow--magenta">Operator profile</div>
        <h1 class="glitch" :data-text="player.handle">{{ player.handle }}</h1>
        <div class="mono dim">{{ player.email }}</div>
        <div class="prof__tags">
          <span class="prof__tag">Level {{ player.level }}</span>
          <span class="prof__tag prof__tag--cy">Best at: {{ fav.name }}</span>
        </div>
      </div>
      <SketchBox :width="2.6" />
      <Sparkles :size="18" color="var(--c-cyan)" />
      <div class="prof__xp"><XpBar :value="player.xp" :max="xpForLevel(player.level)" :level="player.level" /></div>
    </section>

    <section class="prof__stats">
      <StatCard label="Incidents" :value="runs.length" icon="crosshair" />
      <StatCard label="Accuracy" :value="accuracy" unit="%" icon="check" accent="green" />
      <StatCard label="S-ranks" :value="sCount" icon="star" accent="magenta" />
      <StatCard label="Best streak" :value="player.bestStreak" unit="d" icon="flame" accent="yellow" />
      <StatCard label="Harmful calls" :value="totalHarmful" icon="alert" accent="red" caption="lifetime" />
      <StatCard label="Total XP" :value="player.totalXp.toLocaleString()" icon="bolt" accent="cyan" />
    </section>

    <div class="prof__grid">
      <CyberPanel title="Badge case" :eyebrow="`${player.badges.length} / ${BADGES.length}`" accent="magenta">
        <div class="prof__badges">
          <div v-for="b in BADGES" :key="b.id" class="prof__badge">
            <CyberBadge :name="b.name" :icon="b.icon" :tier="b.tier" :desc="b.desc" :locked="!player.badges.includes(b.id)" />
            <CredentialChip :badge="b.id" />
          </div>
        </div>
      </CyberPanel>

      <div class="prof__side">
        <CyberPanel title="Skill matrix" eyebrow="Mastery">
          <div class="prof__radar"><SkillRadar :skills="player.skills" :size="260" /></div>
        </CyberPanel>

        <CyberPanel title="Demo controls" eyebrow="Hackathon" accent="red">
          <CyberButton variant="danger" size="sm" block icon="trash" @click="resetDemo(); navigateTo('/login')">Reset demo data</CyberButton>
        </CyberPanel>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prof { display: flex; flex-direction: column; gap: var(--s-5); }
.prof__card { position: relative;  display: grid; grid-template-columns: auto 1fr 360px; gap: var(--s-6); align-items: center; padding: var(--s-6); background: var(--paper); border: 0; border-radius: var(--r-lg); box-shadow: 5px 6px 0 rgba(18, 34, 74, .16), var(--glow-panel); }
.prof__avatar { width: 110px; height: 110px; display: grid; place-items: center; font-family: var(--f-display); font-size: 40px; font-weight: 900; color: var(--c-text-invert); background: var(--chrome); box-shadow: var(--pop); border: 3px solid var(--ink); border-radius: var(--blob); animation: blob 10s var(--ease-soft) infinite; }
.prof__tags { display: flex; flex-wrap: wrap; gap: var(--s-2); margin-top: var(--s-3); }
/* Hand-drawn pills: ink outline, tinted fill, small offset shadow (was neon boxes). */
.prof__tag { --c: var(--c-magenta); font-family: var(--f-ui); font-size: var(--fs-xs); font-weight: 800; letter-spacing: .06em; padding: 3px 12px; border: 2px solid var(--ink); border-radius: var(--r-pill); background: color-mix(in srgb, var(--c) 14%, var(--paper-2)); color: color-mix(in srgb, var(--c) 80%, var(--ink)); box-shadow: 2px 2px 0 var(--ink); }
.prof__tag--cy { --c: var(--c-cyan); }
.prof__tag--gr { --c: var(--c-ideal); }
.prof__stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--s-3); }
.prof__grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--s-5); align-items: start; }
.prof__badges { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: var(--s-6) var(--s-3); justify-items: center; }
.prof__badge { display: flex; flex-direction: column; align-items: center; }
.prof__side { display: flex; flex-direction: column; gap: var(--s-4); }
.prof__radar { display: grid; place-items: center; }
@media (max-width: 1200px) { .prof__card, .prof__grid { grid-template-columns: 1fr; } .prof__stats { grid-template-columns: repeat(3, 1fr); } }
</style>
