<script setup lang="ts">
/*
 * DASHBOARD
 * DYNAMIC DATA: player (level, xp, streak, skills, badges), runs[] (recent runs), audit[] (preview).
 */
import { BADGES } from '~/data/badges'
import { DIFFICULTY, VECTORS, vectorById } from '~/data/incidents'

const { player, state, accuracy } = useGame()
const runs = computed(() => state.value.runs.slice(0, 5))
const best = computed(() => state.value.runs.reduce((a, r) => Math.max(a, r.score), 0))
const weakest = computed(() => VECTORS.slice().sort((a, b) => player.value.skills[a.id] - player.value.skills[b.id])[0])
const rank = computed(() => {
  const l = player.value.level
  return l >= 20 ? 'ICE BREAKER' : l >= 12 ? 'NETRUNNER' : l >= 6 ? 'OPERATOR' : 'RECRUIT'
})
const when = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`
}
</script>

<template>
  <div class="dash">
    <!-- PLAYER HERO -->
    <section class="dash__hero">
      <div class="dash__id">
        <div class="dash__avatar">
          <span>{{ player.handle.slice(0, 2).toUpperCase() }}</span>
          <span class="dash__avatar-ring" aria-hidden="true" />
        </div>
        <div class="dash__who">
          <div class="eyebrow eyebrow--magenta">Rank · {{ rank }}</div>
          <h1 class="dash__handle glitch" :data-text="player.handle">{{ player.handle }}</h1>
          <div class="dim mono dash__email">{{ player.email }}</div>
        </div>
      </div>
      <div class="dash__xp">
        <XpBar :value="player.xp" :max="xpForLevel(player.level)" :level="player.level" size="lg" />
        <div class="dash__xp-total mono">LIFETIME {{ player.totalXp.toLocaleString() }} XP</div>
      </div>
      <CyberButton to="/incidents" variant="primary" size="lg" icon="crosshair" class="dash__cta">Start incident</CyberButton>
    </section>

    <!-- STAT ROW -->
    <section class="dash__stats">
      <StatCard label="Level" :value="player.level" icon="chip" accent="magenta" :caption="`${rank}`" />
      <StatCard label="Accuracy" :value="accuracy" unit="%" icon="crosshair" accent="cyan" :delta="state.runs[0] && state.runs[1] ? state.runs[0].accuracy - state.runs[1].accuracy : undefined" caption="last 10 runs" />
      <StatCard label="Streak" :value="player.streak" unit="d" icon="flame" accent="yellow" :caption="`best ${player.bestStreak}d`" />
      <StatCard label="High score" :value="best" icon="trophy" accent="green" :caption="`${state.runs.length} incidents run`" />
    </section>

    <div class="dash__grid">
      <!-- SKILL RADAR -->
      <CyberPanel title="Skill matrix" eyebrow="5 threat vectors" class="dash__radar">
        <div class="dash__radar-body">
          <SkillRadar :skills="player.skills" :size="300" />
          <div class="dash__skill-list">
            <div v-for="v in VECTORS" :key="v.id" class="dash__skill" :style="{ '--c': `var(${v.color})` }">
              <CyberIcon :name="v.icon" :size="16" />
              <span class="dash__skill-name">{{ v.name }}</span>
              <span class="dash__skill-bar"><span :style="{ width: player.skills[v.id] + '%' }" /></span>
              <span class="dash__skill-val mono">{{ player.skills[v.id] }}</span>
            </div>
            <div class="dash__hint mono">
              <CyberIcon name="info" :size="14" style="margin-right:6px" />Weakest vector: <b :style="{ color: `var(${weakest.color})` }">{{ weakest.name }}</b>. Mixed incidents weight it higher.
            </div>
          </div>
        </div>
      </CyberPanel>

      <!-- RECENT RUNS -->
      <CyberPanel title="Recent runs" eyebrow="Debrief history" accent="magenta" class="dash__runs">
        <template #actions><CyberButton variant="ghost" size="sm" to="/results" icon-right="arrow">Last debrief</CyberButton></template>
        <ul class="dash__run-list">
          <li v-for="r in runs" :key="r.id" class="dash__run">
            <span class="dash__grade" :class="`g-${r.grade}`">{{ r.grade }}</span>
            <div class="dash__run-main">
              <div class="dash__run-name">OP: {{ r.codename }}</div>
              <div class="dash__run-meta mono">
                {{ DIFFICULTY[r.difficulty].label }} · {{ when(r.finishedAt) }}
              </div>
              <div class="dash__run-vectors">
                <span v-for="v in r.vectors" :key="v" class="dash__vchip" :style="{ '--c': `var(${vectorById(v).color})` }">{{ vectorById(v).code }}</span>
              </div>
            </div>
            <div class="dash__run-score">
              <div class="dash__run-pts">{{ r.score }}</div>
              <div class="mono mute">+{{ r.xpEarned }} XP</div>
            </div>
          </li>
        </ul>
      </CyberPanel>

      <!-- BADGES -->
      <CyberPanel title="Badges" :eyebrow="`${player.badges.length} / ${BADGES.length} unlocked`" class="dash__badges">
        <template #actions><CyberButton variant="ghost" size="sm" to="/profile" icon-right="arrow">All</CyberButton></template>
        <div class="dash__badge-grid">
          <CyberBadge v-for="b in BADGES" :key="b.id" :name="b.name" :icon="b.icon" :tier="b.tier" :desc="b.desc" :locked="!player.badges.includes(b.id)" size="sm" />
        </div>
      </CyberPanel>

      <!-- AUDIT PREVIEW -->
      <CyberPanel title="Audit trail" eyebrow="Anchored on Solana" accent="none" class="dash__audit">
        <template #actions><CyberButton variant="ghost" size="sm" to="/audit" icon-right="arrow">Full log</CyberButton></template>
        <table class="dash__audit-table">
          <tbody>
            <tr v-for="a in state.audit.slice(0, 5)" :key="a.id">
              <td class="mono mute">{{ new Date(a.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</td>
              <td class="mono dash__audit-ev">{{ a.event }}</td>
              <td class="dim">{{ a.detail }}</td>
              <td class="dash__audit-v"><SolanaVerified :tx="a.tx" :slot="a.slot" compact /></td>
            </tr>
          </tbody>
        </table>
      </CyberPanel>
    </div>
  </div>
</template>

<style scoped>
.dash { display: flex; flex-direction: column; gap: var(--s-6); }
.dash__hero { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--s-8); padding: var(--s-6) var(--s-8); background: linear-gradient(100deg, rgba(255, 43, 214, .12), rgba(0, 240, 255, .06) 60%, transparent); border: 1px solid var(--c-line-strong); clip-path: var(--clip-chamfer); position: relative; overflow: hidden; }
.dash__hero::after { content: 'SYS.OPERATOR'; position: absolute; right: 24px; bottom: -14px; font-family: var(--f-display); font-size: 80px; font-weight: 900; color: rgba(255, 255, 255, .025); letter-spacing: .1em; pointer-events: none; }
.dash__id { display: flex; align-items: center; gap: var(--s-5); }
.dash__avatar { position: relative; width: 84px; height: 84px; display: grid; place-items: center; font-family: var(--f-display); font-size: var(--fs-xl); font-weight: 900; color: var(--c-text-invert); background: linear-gradient(135deg, var(--c-cyan), var(--c-magenta)); clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); }
.dash__handle { font-size: var(--fs-2xl); }
.dash__email { font-size: var(--fs-xs); }
.dash__xp { min-width: 0; }
.dash__xp-total { font-size: 10px; letter-spacing: .2em; color: var(--c-text-mute); margin-top: var(--s-2); text-align: right; }
.dash__stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-4); }
.dash__grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--s-5); }
.dash__radar-body { display: grid; grid-template-columns: auto 1fr; gap: var(--s-6); align-items: center; }
.dash__skill-list { display: flex; flex-direction: column; gap: var(--s-3); }
.dash__skill { display: grid; grid-template-columns: 18px 130px 1fr 32px; gap: var(--s-3); align-items: center; color: var(--c); }
.dash__skill-name { color: var(--c-text); font-size: var(--fs-sm); font-weight: 600; }
.dash__skill-bar { height: 6px; background: var(--c-bg-3); transform: skewX(-20deg); }
.dash__skill-bar span { display: block; height: 100%; background: var(--c); box-shadow: 0 0 8px var(--c); transition: width .8s var(--ease); }
.dash__skill-val { text-align: right; font-size: var(--fs-sm); }
.dash__hint { display: block; font-size: 11px; color: var(--c-text-dim); margin-top: var(--s-2); padding: var(--s-2) var(--s-3); border: 1px dashed var(--c-line-strong); }
.dash__run-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--s-2); }
.dash__run { display: grid; grid-template-columns: 44px 1fr auto; gap: var(--s-3); align-items: center; padding: var(--s-3); background: var(--c-bg-2); border-left: 2px solid var(--c-line-strong); transition: border-color var(--t-fast); }
.dash__run:hover { border-left-color: var(--c-magenta); }
.dash__grade { width: 44px; height: 44px; display: grid; place-items: center; font-family: var(--f-display); font-size: var(--fs-xl); font-weight: 900; border: 1px solid currentColor; clip-path: var(--clip-chamfer-sm); }
.g-S { color: var(--c-magenta); text-shadow: var(--text-glow-magenta); }
.g-A { color: var(--c-ideal); }
.g-B { color: var(--c-cyan); }
.g-C { color: var(--c-ok); }
.g-D { color: var(--c-harmful); }
.dash__run-name { font-family: var(--f-display); font-size: var(--fs-sm); letter-spacing: .08em; }
.dash__run-meta { font-size: 10px; color: var(--c-text-mute); letter-spacing: .1em; text-transform: uppercase; }
.dash__run-vectors { display: flex; gap: 4px; margin-top: 4px; }
.dash__vchip { font-family: var(--f-mono); font-size: 9px; padding: 0 4px; color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 50%, transparent); }
.dash__run-score { text-align: right; font-size: 10px; }
.dash__run-pts { font-family: var(--f-display); font-size: var(--fs-lg); color: var(--c-cyan); }
.dash__badge-grid { display: flex; flex-wrap: wrap; gap: var(--s-3) var(--s-2); }
.dash__audit-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dash__audit-table td { padding: 8px 6px; border-bottom: 1px solid var(--c-line); }
.dash__audit-ev { color: var(--c-cyan); font-size: 11px; }
.dash__audit-v { text-align: right; }
@media (max-width: 1200px) {
  .dash__grid { grid-template-columns: 1fr; }
  .dash__hero { grid-template-columns: 1fr; gap: var(--s-4); }
  .dash__stats { grid-template-columns: repeat(2, 1fr); }
  .dash__radar-body { grid-template-columns: 1fr; justify-items: center; }
}
</style>
