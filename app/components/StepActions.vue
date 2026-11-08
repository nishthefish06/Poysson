<script setup lang="ts">
/** The deliberate responses available on every step. Risky ones (links, forms, replies) live in StepView. */
import type { ArenaAction } from '@hackutd2026/shared/arena';

defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ act: [ArenaAction['kind']] }>();

const actions: { kind: ArenaAction['kind']; label: string }[] = [
  { kind: 'reported_suspicious', label: 'Report as suspicious' },
  { kind: 'verified_identity', label: 'Verify identity / official channel' },
  { kind: 'refused_request', label: 'Refuse request' },
  { kind: 'complied_request', label: 'Do what they ask' },
  { kind: 'blocked_sender', label: 'Block sender' },
  { kind: 'escalated', label: 'Escalate' },
  { kind: 'notified_customer', label: 'Notify customer' },
];
</script>

<template>
  <div class="step-actions">
    <div class="eyebrow eyebrow--magenta">What do you do?</div>
    <div class="step-actions__grid">
      <ActionButton
        v-for="a in actions"
        :key="a.kind"
        :label="a.label"
        :state="disabled ? 'disabled' : 'idle'"
        @select="emit('act', a.kind)"
      />
    </div>
  </div>
</template>

<style scoped>
.step-actions { display: flex; flex-direction: column; gap: var(--s-2); }
.step-actions__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--s-2); }
</style>
