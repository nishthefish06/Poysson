<script setup lang="ts">
import { COPY as copy } from '~/data/copy'
/*
 * DASHBOARD
 * DYNAMIC DATA: player (level, xp, skills, badges), audit[] (preview).
 */
import { badgeById, type BadgeDef } from '~/data/badges'
import { VECTORS } from '~/data/incidents'

const { player, state } = useGame()
// Current badge: the highest-tier badge earned; on a tie, the most recently earned.
const TIER_RANK: Record<BadgeDef['tier'], number> = { bronze: 0, silver: 1, gold: 2, neon: 3 }
const currentBadge = computed(() => {
  let best: BadgeDef | undefined
  for (const id of player.value.badges) {
    const b = badgeById(id)
    if (b && (!best || TIER_RANK[b.tier] >= TIER_RANK[best.tier])) best = b
  }
  return best
})
const weakest = computed(() => VECTORS.slice().sort((a, b) => player.value.skills[a.id] - player.value.skills[b.id])[0])
const rank = computed(() => {
  const l = player.value.level
  return l >= 20 ? 'ICE BREAKER' : l >= 12 ? 'NETRUNNER' : l >= 6 ? 'OPERATOR' : 'RECRUIT'
})
</script>

<template>
  <div class="dash">
    <!-- PLAYER HERO -->
    <section class="dash__hero">
      <div class="dash__id">
        <div class="dash__avatar" :title="player.handle">
          <AvatarFlip :initials="player.handle.slice(0, 2).toUpperCase()" :size="84" />
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
      <NuxtLink to="/profile" class="dash__badge" :title="currentBadge?.desc ?? 'Complete an incident to earn your first badge'">
        <div class="eyebrow">Current badge</div>
        <CyberBadge v-if="currentBadge" :name="currentBadge.name" :icon="currentBadge.icon" :tier="currentBadge.tier" size="sm" />
        <CyberBadge v-else name="None yet" icon="lock" locked size="sm" />
        <SketchBox color="var(--c-magenta)" :width="1.8" :overshoot="6" />
      </NuxtLink>
      <SketchBox :width="2.6" />
      <Sparkles :size="18" color="var(--c-magenta)" />
    </section>

    <div class="dash__grid">
      <!-- SKILL RADAR -->
      <CyberPanel :title="copy.skillTitle" :eyebrow="copy.skillEyebrow" class="dash__radar">
        <div class="dash__radar-body">
          <SkillRadar :skills="player.skills" :size="300" />
          <div class="dash__skill-list">
            <div v-for="v in VECTORS" :key="v.id" class="dash__skill" :style="{ '--c': `var(${v.color})` }">
              <CyberIcon :name="v.icon" :size="16" />
              <span class="dash__skill-name">{{ v.name }}</span>
              <!-- the bar is water; the fish swims to the score, leaving a striped wake -->
              <span class="dash__skill-bar">
                <span class="dash__skill-wake" :style="{ width: player.skills[v.id] + '%' }" />
                <svg class="dash__fish" :style="{ left: player.skills[v.id] + '%' }" viewBox="0 0 28 18" aria-hidden="true">
                  <path class="dash__fish-shape" d="M8 9 2 4v10Z" />
                  <ellipse class="dash__fish-shape" cx="16" cy="9" rx="9" ry="6" />
                  <circle cx="20.5" cy="7.5" r="1.3" fill="var(--ink)" />
                </svg>
              </span>
              <span class="dash__skill-val mono">{{ player.skills[v.id] }}</span>
            </div>
            <div class="dash__hint mono">
              <CyberIcon name="info" :size="14" style="margin-right:6px" />Weakest vector: <b :style="{ color: `var(${weakest.color})` }">{{ weakest.name }}</b>. Mixed incidents weight it higher.
            </div>
          </div>
        </div>
      </CyberPanel>

      <!-- AUDIT PREVIEW -->
      <CyberPanel title="Audit trail" eyebrow="Anchored on Solana" accent="none" class="dash__audit">
        <template #actions><CyberButton variant="ghost" size="sm" to="/audit" icon-right="arrow">Full log</CyberButton></template>
        <p v-if="!state.audit.length" class="dash__audit-empty">
          Nothing logged yet. Finish a practice incident and it's recorded here, with its hash written to Solana.
        </p>
        <table v-else class="dash__audit-table">
          <tbody>
            <tr v-for="a in state.audit.slice(0, 5)" :key="a.id">
              <td class="mono mute">{{ new Date(a.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</td>
              <td class="mono dash__audit-ev">{{ a.event }}</td>
              <td class="dim">{{ a.detail }}</td>
              <td class="dash__audit-v"><SolanaVerified :tx="a.tx" :slot="a.slot" :status="anchorOf(a)" :error="a.anchorError" compact /></td>
            </tr>
          </tbody>
        </table>
      </CyberPanel>
    </div>
  </div>
</template>

<style scoped>
.dash { display: flex; flex-direction: column; gap: var(--s-6); }
.dash__hero { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--s-8); padding: var(--s-6) var(--s-8); background: var(--paper); border: 0; border-radius: var(--r-lg); box-shadow: 5px 6px 0 rgba(18, 34, 74, .16), var(--glow-panel); position: relative; }
.dash__id { display: flex; align-items: center; gap: var(--s-5); }
.dash__avatar { position: relative; width: 84px; height: 84px; }
.dash__handle { font-size: var(--fs-2xl); }
.dash__email { font-size: var(--fs-xs); }
.dash__xp { min-width: 0; }
.dash__xp-total { font-size: 10px; letter-spacing: .2em; color: var(--c-text-mute); margin-top: var(--s-2); text-align: right; }
.dash__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--s-5); align-items: start; }
.dash__badge { display: flex; flex-direction: column; align-items: center; gap: var(--s-2); padding: var(--s-3) var(--s-4); background: var(--c-magenta-tint); border-radius: var(--r-md); position: relative; transition: transform var(--t-fast) var(--ease-bounce); }
.dash__badge:hover { text-decoration: none; transform: rotate(-1.5deg); }
.dash__radar-body { display: flex; flex-direction: column; gap: var(--s-6); align-items: center; }
.dash__skill-list { display: flex; flex-direction: column; gap: var(--s-3); width: 100%; }
.dash__skill { display: grid; grid-template-columns: 18px 130px 1fr 32px; gap: var(--s-3); align-items: center; color: var(--c); }
.dash__skill-name { color: var(--c-text); font-size: var(--fs-sm); font-weight: 600; }
/* Fish bars: the track is water, the fill is a striped wake, and a fish swims to the score. */
.dash__skill-bar { position: relative; height: 14px; background: color-mix(in srgb, var(--c-cyan) 14%, var(--paper-2)); border: 2px solid var(--ink); border-radius: var(--r-pill); }
.dash__skill-wake {
  position: absolute; left: 0; top: 0; bottom: 0; border-radius: var(--r-pill);
  background: repeating-linear-gradient(-45deg, color-mix(in srgb, var(--c) 75%, white) 0 7px, color-mix(in srgb, var(--c) 45%, white) 7px 11px);
  transition: width .8s var(--ease);
}
.dash__fish {
  position: absolute; top: 50%; width: 28px; height: 18px; overflow: visible;
  translate: -80% -50%;
  transition: left .8s var(--ease);
  animation: fish-bob 2.4s ease-in-out infinite;
}
.dash__skill:nth-child(2) .dash__fish { animation-delay: -.5s; }
.dash__skill:nth-child(3) .dash__fish { animation-delay: -1s; }
.dash__skill:nth-child(4) .dash__fish { animation-delay: -1.5s; }
.dash__skill:nth-child(5) .dash__fish { animation-delay: -2s; }
.dash__fish-shape { fill: var(--c); stroke: var(--ink); stroke-width: 1.6; stroke-linejoin: round; }
@keyframes fish-bob { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-2px) rotate(-4deg); } }
@media (prefers-reduced-motion: reduce) { .dash__fish { animation: none; } }
.dash__skill-val { text-align: right; font-family: var(--f-display); font-weight: 700; font-size: var(--fs-md); }
.dash__hint { display: block; font-size: 11px; color: var(--c-text-dim); margin-top: var(--s-2); padding: var(--s-2) var(--s-3); border: 1px dashed var(--c-line-strong); }
.dash__audit-empty { color: var(--c-text-dim); font-size: var(--fs-sm); }
.dash__audit-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dash__audit-table td { padding: 8px 6px; border-bottom: 1px solid var(--c-line); }
.dash__audit-ev { color: var(--c-cyan); font-size: 11px; }
.dash__audit-v { text-align: right; }
@media (max-width: 1200px) {
  .dash__grid { grid-template-columns: 1fr; }
  .dash__hero { grid-template-columns: 1fr; gap: var(--s-4); }
}
</style>
