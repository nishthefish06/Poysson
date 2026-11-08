<script setup lang="ts">
// Care Portal: customer accounts and their change history (who changed what, when).
import type { EnvAction, World } from '@hackutd2026/shared/arena';
defineProps<{ world: World; disabled?: boolean }>();
const emit = defineEmits<{ respond: [EnvAction] }>();
const label = (f: string) => (f === 'sim' ? 'SIM card' : f === 'portFreeze' ? 'Port freeze' : 'Email');
</script>

<template>
  <div class="wa">
    <div class="eyebrow eyebrow--cyan">Customer accounts</div>
    <article v-for="c in world.customers" :key="c.id" class="wa__row wa__row--stack">
      <div class="wa__card-head">
        <b class="wa__name">{{ c.name }}</b>
        <span class="wa__meta mono">{{ c.line }}</span>
        <span>Email: {{ c.email }}</span>
        <span>SIM ••{{ c.simLast4 }}</span>
        <span class="wa__tag" :class="{ 'is-on': c.portFreeze }">Port freeze {{ c.portFreeze ? 'on' : 'off' }}</span>
        <div class="spacer" />
        <CyberButton
          v-if="!c.portFreeze"
          variant="secondary"
          size="sm"
          icon="lock"
          :disabled="disabled"
          @click="emit('respond', { action: 'enable_port_freeze', customerId: c.id })"
          >Turn on port freeze</CyberButton
        >
      </div>
      <table v-if="c.history.length" class="wa__table">
        <thead>
          <tr>
            <th>When</th>
            <th>Change</th>
            <th>By</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in [...c.history].reverse()" :key="h.id" :class="{ 'is-reverted': h.reverted }">
            <td class="mono">{{ arenaTime(h.at) }}</td>
            <td>{{ label(h.field) }}: "{{ h.from }}" → "{{ h.to }}"</td>
            <td>{{ h.by }}</td>
            <td>
              <CyberButton
                v-if="!h.reverted"
                variant="secondary"
                size="sm"
                icon="rewind"
                :disabled="disabled"
                @click="emit('respond', { action: 'revert_customer_change', customerId: c.id, changeId: h.id })"
                >Revert</CyberButton
              >
            </td>
          </tr>
        </tbody>
      </table>
      <SketchBox :width="1.6" :overshoot="5" />
    </article>
  </div>
</template>
