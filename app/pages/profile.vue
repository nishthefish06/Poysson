<script setup lang="ts">
/*
 * PROFILE — badges, lifetime stats, passkeys.
 * DYNAMIC: player, runs[], badges.
 */
import { BADGES } from '~/data/badges'
import { VECTORS } from '~/data/incidents'

const { player, state, accuracy, removePasskey, resetDemo } = useGame()
const runs = computed(() => state.value.runs)
const totalHarmful = computed(() => runs.value.reduce((a, r) => a + r.decisions.filter(d => d.rating === 'harmful').length, 0))
const sCount = computed(() => runs.value.filter(r => r.grade === 'S').length)
const fav = computed(() => VECTORS.slice().sort((a, b) => player.value.skills[b.id] - player.value.skills[a.id])[0])
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
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
          <span class="prof__tag">LVL {{ player.level }}</span>
          <span class="prof__tag prof__tag--cy">MAIN: {{ fav.name.toUpperCase() }}</span>
          <span v-if="player.passkeys.length" class="prof__tag prof__tag--gr">HARDENED</span>
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
          <CyberBadge v-for="b in BADGES" :key="b.id" :name="b.name" :icon="b.icon" :tier="b.tier" :desc="b.desc" :locked="!player.badges.includes(b.id)" />
        </div>
      </CyberPanel>

      <div class="prof__side">
        <CyberPanel title="Skill matrix" eyebrow="Mastery">
          <div class="prof__radar"><SkillRadar :skills="player.skills" :size="260" /></div>
        </CyberPanel>

        <CyberPanel title="Passkeys" :eyebrow="`${player.passkeys.length} bound`">
          <template #actions><CyberButton size="sm" variant="secondary" icon="plus" to="/passkey">Add</CyberButton></template>
          <ul class="prof__keys">
            <li v-for="k in player.passkeys" :key="k.id" class="prof__key">
              <CyberIcon name="fingerprint" :size="22" />
              <div class="prof__key-main">
                <div class="prof__key-name">{{ k.name }}</div>
                <div class="mono mute prof__key-meta">{{ k.device }} · added {{ date(k.created) }} · used {{ date(k.lastUsed) }}</div>
              </div>
              <CyberButton size="sm" variant="ghost" icon="trash" :aria-label="`Remove ${k.name}`" @click="removePasskey(k.id)" />
            </li>
            <li v-if="!player.passkeys.length" class="mono prof__nokeys">! No passkeys — you're relying on push MFA only.</li>
          </ul>
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
.prof__tags { display: flex; gap: var(--s-2); margin-top: var(--s-3); }
.prof__tag { font-family: var(--f-mono); font-size: 10px; font-weight: 700; letter-spacing: .12em; padding: 3px 8px; border: 1px solid var(--c-magenta); color: var(--c-magenta); }
.prof__tag--cy { border-color: var(--c-cyan); color: var(--c-cyan); }
.prof__tag--gr { border-color: var(--c-ideal); color: var(--c-ideal); }
.prof__stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--s-3); }
.prof__grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--s-5); align-items: start; }
.prof__badges { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: var(--s-6) var(--s-3); justify-items: center; }
.prof__side { display: flex; flex-direction: column; gap: var(--s-4); }
.prof__radar { display: grid; place-items: center; }
.prof__keys { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--s-2); }
.prof__key { display: flex; gap: var(--s-3); align-items: center; padding: var(--s-3); background: var(--c-bg-2); color: var(--c-ideal); }
.prof__key-main { flex: 1; min-width: 0; }
.prof__key-name { color: var(--c-text); font-weight: 700; }
.prof__key-meta { font-size: 10px; }
.prof__nokeys { color: var(--c-ok); font-size: var(--fs-xs); }
@media (max-width: 1200px) { .prof__card, .prof__grid { grid-template-columns: 1fr; } .prof__stats { grid-template-columns: repeat(3, 1fr); } }
</style>
