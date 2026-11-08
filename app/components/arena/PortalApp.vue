<script setup lang="ts">
// Care Portal: customer accounts and their change history (who changed what, when).
import type { EnvAction, World } from '@hackutd2026/shared/arena';
defineProps<{ world: World; disabled?: boolean }>();
const emit = defineEmits<{ respond: [EnvAction] }>();
const label = (f: string) => (f === 'sim' ? 'SIM card' : f === 'portFreeze' ? 'Port freeze' : 'Email');
</script>

<template>
  <div class="space-y-4">
    <article v-for="c in world.customers" :key="c.id" class="rounded border border-line p-3 text-sm">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <b class="text-base">{{ c.name }}</b>
        <span class="text-neutral-600">{{ c.line }}</span>
        <span>Email: {{ c.email }}</span>
        <span>SIM ••{{ c.simLast4 }}</span>
        <span :class="c.portFreeze ? 'text-verdict-ideal' : 'text-neutral-500'"
          >Port freeze {{ c.portFreeze ? 'on' : 'off' }}</span
        >
        <button
          v-if="!c.portFreeze"
          :disabled="disabled"
          class="ml-auto rounded border border-line px-2 py-1 hover:border-neon-cyan disabled:opacity-40"
          @click="emit('respond', { action: 'enable_port_freeze', customerId: c.id })"
        >
          Turn on port freeze
        </button>
      </div>
      <table v-if="c.history.length" class="mt-2 w-full text-left text-xs">
        <thead class="text-neutral-500">
          <tr>
            <th>When</th>
            <th>Change</th>
            <th>By</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="h in [...c.history].reverse()"
            :key="h.id"
            :class="{ 'opacity-50 line-through': h.reverted }"
          >
            <td class="py-1 pr-2">{{ arenaTime(h.at) }}</td>
            <td class="pr-2">{{ label(h.field) }}: "{{ h.from }}" → "{{ h.to }}"</td>
            <td class="pr-2">{{ h.by }}</td>
            <td>
              <button
                v-if="!h.reverted"
                :disabled="disabled"
                class="rounded border border-line px-2 hover:border-verdict-harmful disabled:opacity-40"
                @click="
                  emit('respond', { action: 'revert_customer_change', customerId: c.id, changeId: h.id })
                "
              >
                Revert
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  </div>
</template>
