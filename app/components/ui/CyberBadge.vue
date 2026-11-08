<script setup lang="ts">
/**
 * CyberBadge — achievement badge.
 * tier: bronze | silver | gold | neon  ·  locked: grayscale + lock
 * size: sm | md
 */
withDefaults(defineProps<{ name: string; icon?: string; tier?: 'bronze' | 'silver' | 'gold' | 'neon'; locked?: boolean; desc?: string; size?: 'sm' | 'md'; fresh?: boolean }>(), { icon: 'star', tier: 'bronze', size: 'md' })
</script>

<template>
  <div class="cyber-badge" :class="[`cyber-badge--${tier}`, `cyber-badge--${size}`, { 'is-locked': locked, 'is-fresh': fresh }]" :title="desc">
    <div class="cyber-badge__hex">
      <CyberIcon :name="locked ? 'lock' : icon" :size="size === 'sm' ? 18 : 26" />
    </div>
    <div class="cyber-badge__text">
      <div class="cyber-badge__name">{{ name }}</div>
      <div v-if="desc && size === 'md'" class="cyber-badge__desc">{{ desc }}</div>
    </div>
    <span v-if="fresh" class="cyber-badge__new">NEW</span>
  </div>
</template>

<style scoped>
.cyber-badge { --tier: #c98a52; position: relative; display: flex; flex-direction: column; align-items: center; gap: var(--s-2); text-align: center; width: 120px; }
.cyber-badge--silver { --tier: #b8c7e6; }
.cyber-badge--gold { --tier: #ffd23b; }
.cyber-badge--neon { --tier: var(--c-magenta); }
.cyber-badge__hex {
  width: 64px; height: 72px; display: grid; place-items: center;
  color: var(--tier);
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--tier) 30%, transparent), transparent 70%), var(--c-bg-2);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  position: relative;
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--tier) 60%, transparent));
}
.cyber-badge__hex::before {
  content: ''; position: absolute; inset: 0; clip-path: inherit;
  background: conic-gradient(from 0deg, var(--tier), transparent 30%, var(--tier) 50%, transparent 80%, var(--tier));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; padding: 2px;
}
.cyber-badge--neon .cyber-badge__hex::before { animation: spin 4s linear infinite; }
.cyber-badge__name { font-family: var(--f-ui); font-weight: 700; font-size: var(--fs-sm); letter-spacing: .06em; text-transform: uppercase; }
.cyber-badge__desc { font-size: var(--fs-xs); color: var(--c-text-mute); line-height: 1.3; }
.cyber-badge--sm { width: 84px; }
.cyber-badge--sm .cyber-badge__hex { width: 44px; height: 50px; }
.cyber-badge--sm .cyber-badge__name { font-size: 10px; }
.cyber-badge.is-locked { opacity: .45; }
.cyber-badge.is-locked .cyber-badge__hex { color: var(--c-text-mute); filter: none; }
.cyber-badge.is-locked .cyber-badge__hex::before { background: var(--c-line-strong); animation: none; }
.cyber-badge__new { position: absolute; top: -4px; right: 14px; font-family: var(--f-mono); font-size: 9px; font-weight: 700; background: var(--c-yellow); color: var(--c-text-invert); padding: 1px 5px; animation: blink 1.2s steps(2) infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
