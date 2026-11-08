<script setup lang="ts">
// Mail: what was sent from your account, and your forwarding rules.
import type { EnvAction, World } from '@hackutd2026/shared/arena';
defineProps<{ world: World; disabled?: boolean }>();
const emit = defineEmits<{ respond: [EnvAction] }>();
</script>

<template>
  <div class="wa">
    <section class="wa__section">
      <div class="eyebrow eyebrow--cyan">Forwarding rules</div>
      <p class="wa__note">Mail matching a rule is automatically copied to another address.</p>
      <div v-for="r in world.forwardingRules" :key="r.id" class="wa__row">
        <CyberIcon name="mail" :size="18" class="wa__icon" />
        <span class="wa__main"
          >If subject/body contains <b>"{{ r.match }}"</b> → forward to <b>{{ r.forwardTo }}</b>
          <span class="wa__meta mono"> · created {{ arenaTime(r.createdAt) }}</span></span
        >
        <CyberButton
          variant="secondary"
          size="sm"
          icon="trash"
          :disabled="disabled"
          @click="emit('respond', { action: 'delete_forwarding_rule', ruleId: r.id })"
          >Delete</CyberButton
        >
        <SketchBox :width="1.6" :overshoot="5" />
      </div>
      <p v-if="!world.forwardingRules.length" class="wa__empty mono">// no rules</p>
    </section>
    <section class="wa__section">
      <div class="eyebrow eyebrow--cyan">Sent</div>
      <div v-for="m in [...world.sentMail].reverse()" :key="m.id" class="wa__row wa__row--stack">
        <span class="wa__main">
          <b>To:</b> {{ m.to }} <span class="wa__meta mono">· {{ arenaTime(m.at) }}</span><br />
          <b>{{ m.subject }}</b>
          <span class="wa__body">{{ m.body }}</span>
        </span>
        <SketchBox :width="1.6" :overshoot="5" />
      </div>
      <p v-if="!world.sentMail.length" class="wa__empty mono">// nothing sent today</p>
    </section>
  </div>
</template>
