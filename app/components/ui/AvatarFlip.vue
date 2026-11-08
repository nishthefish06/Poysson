<script setup lang="ts">
/**
 * AvatarFlip: the player's initials on a magenta blob that spins around to a fishing hook on the
 * back when hovered (or when the button it sits in gets keyboard focus).
 *   size: px (the hook scales with it)
 */
const props = withDefaults(defineProps<{ initials: string; size?: number }>(), { size: 36 })
const hookSize = computed(() => Math.round(props.size * 0.55))
</script>

<template>
  <span class="avatar-flip" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.36}px` }" aria-hidden="true">
    <span class="avatar-flip__inner">
      <span class="avatar-flip__face avatar-flip__face--front">{{ initials }}</span>
      <span class="avatar-flip__face avatar-flip__face--back">
        <CyberIcon name="hook" :size="hookSize" :stroke="2.2" />
      </span>
    </span>
  </span>
</template>

<style scoped>
.avatar-flip { display: inline-block; perspective: 400px; flex-shrink: 0; }
.avatar-flip__inner {
  position: relative; display: block; width: 100%; height: 100%;
  transform-style: preserve-3d;
  transition: transform 600ms cubic-bezier(.3, 1.4, .5, 1);
}
/* spin to the back on hover, or when the surrounding button is focused from the keyboard */
.avatar-flip:hover .avatar-flip__inner,
:focus-visible > .avatar-flip .avatar-flip__inner { transform: rotateY(180deg); }
.avatar-flip__face {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
  border: 2.5px solid var(--line-ink, var(--ink));
  border-radius: var(--blob);
  animation: blob 10s var(--ease-soft) infinite;
  box-shadow: var(--pop-sm);
}
.avatar-flip__face--front {
  font-family: var(--f-display); font-weight: 700; color: var(--c-text-invert);
  background: var(--chrome);
}
.avatar-flip__face--back {
  transform: rotateY(180deg);
  color: var(--c-magenta);
  background: radial-gradient(circle at 35% 30%, #fff 0 14%, transparent 15%), linear-gradient(180deg, #7fdcff, #1f9af0);
}
@media (prefers-reduced-motion: reduce) { .avatar-flip__inner { transition: none; } }
</style>
