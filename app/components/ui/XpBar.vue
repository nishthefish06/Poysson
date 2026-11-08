<script setup lang="ts">
/**
 * XpBar
 * size: sm | md | lg  ·  shows level chip, segmented fill, xp counter.
 * DYNAMIC: value/max from player.xp / xpForLevel(level).
 */
const props = withDefaults(defineProps<{ value: number; max: number; level?: number; size?: 'sm' | 'md' | 'lg'; showLabel?: boolean; gain?: number }>(), { size: 'md', showLabel: true })
const pct = computed(() => Math.min(100, (props.value / props.max) * 100))
const gainPct = computed(() => props.gain ? Math.min(pct.value, (props.gain / props.max) * 100) : 0)
</script>

<template>
  <div class="xp-bar" :class="`xp-bar--${size}`">
    <div v-if="level !== undefined" class="xp-bar__level">
      <span class="xp-bar__level-lbl">LVL</span><span class="xp-bar__level-num">{{ level }}</span>
    </div>
    <div class="xp-bar__main">
      <div class="xp-bar__track" role="progressbar" :aria-valuenow="value" :aria-valuemax="max" aria-label="Experience">
        <div class="xp-bar__fill" :style="{ width: pct + '%' }">
          <span v-if="gainPct" class="xp-bar__gain" :style="{ width: (gainPct / pct) * 100 + '%' }" />
        </div>
      </div>
      <div v-if="showLabel" class="xp-bar__meta">
        <span>{{ value.toLocaleString() }} / {{ max.toLocaleString() }} XP</span>
        <span class="xp-bar__next">{{ (max - value).toLocaleString() }} to next</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.xp-bar { display: flex; align-items: center; gap: var(--s-3); width: 100%; }
.xp-bar__level {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 48px; height: 48px; flex-shrink: 0;
  background: var(--chrome); color: var(--c-text-invert);
  border-radius: var(--blob); animation: blob 10s var(--ease-soft) infinite;
  box-shadow: var(--pop-sm); border: 2px solid var(--ink);
}
.xp-bar__level-lbl { font-family: var(--f-mono); font-size: 8px; letter-spacing: .15em; font-weight: 700; }
.xp-bar__level-num { font-family: var(--f-display); font-size: var(--fs-lg); font-weight: 900; line-height: 1; }
.xp-bar__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.xp-bar__track { position: relative; height: 14px; background: var(--paper-2); border: 2px solid var(--ink); overflow: hidden; border-radius: var(--r-pill); }
.xp-bar__fill {
  position: relative; height: 100%; border-radius: inherit; overflow: hidden;
  background: repeating-linear-gradient(-45deg, var(--c-magenta) 0 7px, var(--c-magenta-light) 7px 11px);
  border-right: 2px solid var(--ink);
  transition: width 900ms var(--ease);
}
.xp-bar__fill::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, .45), transparent 50%);
  
}
@keyframes xp-sheen { from { background-position: 150% 0, 0 0; } to { background-position: -50% 0, 0 0; } }
.xp-bar__gain { position: absolute; right: 0; top: 0; bottom: 0; background: var(--c-yellow); animation: blink 1s steps(2) infinite; }
.xp-bar__meta { display: flex; justify-content: space-between; font-family: var(--f-mono); font-size: var(--fs-xs); color: var(--c-text-dim); }
.xp-bar__next { color: var(--c-text-mute); }
.xp-bar--sm .xp-bar__track { height: 8px; }
.xp-bar--sm .xp-bar__level { width: 34px; height: 34px; }
.xp-bar--sm .xp-bar__level-num { font-size: var(--fs-sm); }
.xp-bar--lg .xp-bar__track { height: 22px; }
.xp-bar--lg .xp-bar__level { width: 64px; height: 64px; }
.xp-bar--lg .xp-bar__level-num { font-size: var(--fs-xl); }
</style>
