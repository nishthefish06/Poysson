<script setup lang="ts">
import { NuxtLink } from '#components';

const props = defineProps<{
  label: string;
  to?: string;
}>();
const emit = defineEmits<{ click: [] }>();
</script>

<template>
  <component
    :is="props.to ? NuxtLink : 'button'"
    :to="props.to"
    :type="props.to ? undefined : 'button'"
    class="back-button"
    :aria-label="props.label"
    :title="props.label"
    @click="emit('click')"
  >
    <SketchBox :width="1.6" :overshoot="5" />
    <CyberIcon name="back" :size="20" />
  </component>
</template>

<style scoped>
.back-button {
  position: relative;
  display: inline-grid;
  flex: 0 0 auto;
  width: 44px;
  height: 38px;
  place-items: center;
  padding: 0;
  color: var(--ink);
  background: var(--paper-soft);
  border: 0;
  border-radius: var(--r-md);
  box-shadow: 2px 3px 0 var(--ink);
  cursor: var(--cursor-fish-bite);
  text-decoration: none;
  transition:
    transform var(--t-fast) var(--ease-bounce),
    box-shadow var(--t-fast),
    background var(--t-fast);
}
.back-button:hover {
  color: var(--ink);
  background: var(--paper-2);
  box-shadow: 5px 7px 0 var(--ink);
  transform: translate(-1px, -2px) rotate(-0.6deg);
  text-decoration: none;
}
.back-button :deep(.cyber-icon) {
  position: relative;
  z-index: 2;
}
.back-button:active {
  box-shadow: 0 0 0 var(--ink);
  transform: translate(2px, 3px);
}
.back-button:focus-visible {
  outline: 3px solid var(--c-magenta);
  outline-offset: 4px;
}
@media (prefers-reduced-motion: reduce) {
  .back-button {
    transition: none;
  }
}
</style>
