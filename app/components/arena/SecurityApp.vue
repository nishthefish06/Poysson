<script setup lang="ts">
// My account security: signed-in sessions, sign-in (MFA) devices, password.
import type { EnvAction, World } from '@hackutd2026/shared/arena';
defineProps<{ world: World; disabled?: boolean }>();
const emit = defineEmits<{ respond: [EnvAction] }>();
</script>

<template>
  <div class="space-y-6 text-sm">
    <section>
      <h3 class="mb-2 font-semibold">Where you're signed in</h3>
      <div
        v-for="s in world.sessions"
        :key="s.id"
        class="mb-2 flex items-center gap-3 rounded border border-line p-2"
      >
        <span class="flex-1"
          >{{ s.device }} · {{ s.location }} · <span class="font-mono">{{ s.ip }}</span>
          <span class="text-neutral-500"> · since {{ arenaTime(s.startedAt) }}</span>
          <span v-if="s.current" class="ml-2 rounded bg-neon-cyan/20 px-1 text-xs">this device</span></span
        >
        <button
          :disabled="disabled"
          class="rounded border border-line px-2 py-1 hover:border-verdict-harmful disabled:opacity-40"
          @click="emit('respond', { action: 'revoke_session', sessionId: s.id })"
        >
          Sign out
        </button>
      </div>
    </section>
    <section>
      <h3 class="mb-2 font-semibold">Sign-in devices (2-step verification)</h3>
      <div
        v-for="d in world.mfaDevices"
        :key="d.id"
        class="mb-2 flex items-center gap-3 rounded border border-line p-2"
      >
        <span class="flex-1"
          >{{ d.name }} <span class="text-neutral-500">· added {{ arenaTime(d.addedAt) }}</span></span
        >
        <button
          :disabled="disabled"
          class="rounded border border-line px-2 py-1 hover:border-verdict-harmful disabled:opacity-40"
          @click="emit('respond', { action: 'remove_mfa_device', deviceId: d.id })"
        >
          Remove
        </button>
      </div>
    </section>
    <section class="flex items-center gap-3">
      <span class="flex-1"
        ><b>Password</b>
        <span class="text-neutral-500">· last changed {{ arenaTime(world.passwordChangedAt) }}</span></span
      >
      <button
        :disabled="disabled"
        class="rounded border border-line px-3 py-1 hover:border-neon-cyan disabled:opacity-40"
        @click="emit('respond', { action: 'reset_password' })"
      >
        Reset password
      </button>
    </section>
  </div>
</template>
