<script setup lang="ts">
// Mail: what was sent from your account, and your forwarding rules.
import type { EnvAction, World } from '@hackutd2026/shared/arena';
defineProps<{ world: World; disabled?: boolean }>();
const emit = defineEmits<{ respond: [EnvAction] }>();
</script>

<template>
  <div class="space-y-6">
    <section>
      <h3 class="mb-2 font-semibold">Forwarding rules</h3>
      <p class="mb-2 text-sm text-neutral-600">
        Mail matching a rule is automatically copied to another address.
      </p>
      <div
        v-for="r in world.forwardingRules"
        :key="r.id"
        class="mb-2 flex items-center gap-3 rounded border border-line p-2 text-sm"
      >
        <span class="flex-1"
          >If subject/body contains <b>"{{ r.match }}"</b> → forward to <b>{{ r.forwardTo }}</b>
          <span class="text-neutral-500"> · created {{ arenaTime(r.createdAt) }}</span></span
        >
        <button
          :disabled="disabled"
          class="rounded border border-line px-2 py-1 hover:border-verdict-harmful disabled:opacity-40"
          @click="emit('respond', { action: 'delete_forwarding_rule', ruleId: r.id })"
        >
          Delete
        </button>
      </div>
      <p v-if="!world.forwardingRules.length" class="text-sm text-neutral-500">No rules.</p>
    </section>
    <section>
      <h3 class="mb-2 font-semibold">Sent</h3>
      <div
        v-for="m in [...world.sentMail].reverse()"
        :key="m.id"
        class="mb-2 rounded border border-line p-2 text-sm"
      >
        <p>
          <b>To:</b> {{ m.to }} <span class="text-neutral-500">· {{ arenaTime(m.at) }}</span>
        </p>
        <p>
          <b>{{ m.subject }}</b>
        </p>
        <p class="whitespace-pre-line text-neutral-700">{{ m.body }}</p>
      </div>
      <p v-if="!world.sentMail.length" class="text-sm text-neutral-500">Nothing sent today.</p>
    </section>
  </div>
</template>
