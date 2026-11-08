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
  <div class="flex flex-wrap gap-2 border-t border-line px-4 py-3">
    <button
      v-for="a in actions"
      :key="a.kind"
      :disabled="disabled"
      class="rounded border border-line px-3 py-1 text-sm hover:border-neon-cyan disabled:opacity-40"
      @click="emit('act', a.kind)"
    >
      {{ a.label }}
    </button>
  </div>
</template>
