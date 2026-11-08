<script setup lang="ts">
// My account security: signed-in sessions, sign-in (MFA) devices, password.
import type { EnvAction, World } from '@hackutd2026/shared/arena';
defineProps<{ world: World; disabled?: boolean }>();
const emit = defineEmits<{ respond: [EnvAction] }>();
</script>

<template>
  <div class="wa">
    <section class="wa__section">
      <div class="eyebrow eyebrow--cyan">Where you're signed in</div>
      <div v-for="s in world.sessions" :key="s.id" class="wa__row">
        <CyberIcon name="user" :size="18" class="wa__icon" />
        <span class="wa__main"
          >{{ s.device }} · {{ s.location }} · <span class="mono">{{ s.ip }}</span>
          <span class="wa__meta mono"> · since {{ arenaTime(s.startedAt) }}</span>
          <span v-if="s.current" class="wa__tag">this device</span></span
        >
        <CyberButton
          variant="secondary"
          size="sm"
          icon="logout"
          :disabled="disabled"
          @click="emit('respond', { action: 'revoke_session', sessionId: s.id })"
          >Sign out</CyberButton
        >
        <SketchBox :width="1.6" :overshoot="5" />
      </div>
    </section>
    <section class="wa__section">
      <div class="eyebrow eyebrow--cyan">Sign-in devices (2-step verification)</div>
      <div v-for="d in world.mfaDevices" :key="d.id" class="wa__row">
        <CyberIcon name="phone" :size="18" class="wa__icon" />
        <span class="wa__main"
          >{{ d.name }} <span class="wa__meta mono">· added {{ arenaTime(d.addedAt) }}</span></span
        >
        <CyberButton
          variant="secondary"
          size="sm"
          icon="trash"
          :disabled="disabled"
          @click="emit('respond', { action: 'remove_mfa_device', deviceId: d.id })"
          >Remove</CyberButton
        >
        <SketchBox :width="1.6" :overshoot="5" />
      </div>
    </section>
    <section class="wa__section">
      <div class="eyebrow eyebrow--cyan">Password</div>
      <div class="wa__row">
        <CyberIcon name="key" :size="18" class="wa__icon" />
        <span class="wa__main"
          ><b>Password</b>
          <span class="wa__meta mono">· last changed {{ arenaTime(world.passwordChangedAt) }}</span></span
        >
        <CyberButton
          variant="secondary"
          size="sm"
          icon="key"
          :disabled="disabled"
          @click="emit('respond', { action: 'reset_password' })"
          >Reset password</CyberButton
        >
        <SketchBox :width="1.6" :overshoot="5" />
      </div>
    </section>
  </div>
</template>
