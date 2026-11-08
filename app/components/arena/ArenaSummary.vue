<script setup lang="ts">
// End of round: outcome, debrief, what the attacker did (and whether you undid it), message by message.
import type { ArenaState } from '@hackutd2026/shared/arena';
defineProps<{ state: ArenaState }>();
const emit = defineEmits<{ again: [] }>();
</script>

<template>
  <section v-if="state.summary" class="mx-auto max-w-3xl space-y-6 rounded bg-panel p-6">
    <div>
      <p class="text-sm uppercase text-neutral-500">Round over · {{ state.mode }} mode</p>
      <h2
        class="text-2xl font-bold"
        :class="state.summary.outcome === 'compromised' ? 'text-verdict-harmful' : 'text-verdict-ideal'"
      >
        {{ state.summary.headline }}
      </h2>
      <p class="mt-1 text-neutral-600">
        Score {{ state.score }} · accuracy {{ Math.round(state.accuracy * 100) }}%
      </p>
    </div>
    <p class="rounded bg-panel p-4 leading-relaxed">{{ state.summary.debrief }}</p>
    <div
      v-if="state.summary.attackerReveal"
      data-testid="attacker-reveal"
      class="rounded border-2 border-neon-pink p-4"
    >
      <p class="text-sm font-semibold uppercase text-neon-pink">🎣 The attacker's side</p>
      <p class="mt-2 italic leading-relaxed">“{{ state.summary.attackerReveal.text }}”</p>
      <p class="mt-2 text-xs text-neutral-600">
        {{
          state.summary.attackerReveal.source === 'nemotron'
            ? 'Written by Nemotron, the model that played the attacker, from its own moves this round.'
            : 'Reconstructed from this round’s moves.'
        }}
      </p>
    </div>
    <div v-if="state.summary.attackerActions.length">
      <h3 class="mb-2 font-semibold">What the attacker did</h3>
      <p v-for="(a, i) in state.summary.attackerActions" :key="i" class="text-sm">
        <span :class="a.remediated ? 'text-verdict-ideal' : 'text-verdict-harmful'">{{
          a.remediated
            ? a.undoable
              ? '✓ undone'
              : '✓ reported'
            : a.undoable
              ? '✗ still in place'
              : "✗ can't be undone, and not reported"
        }}</span>
        · {{ a.text }}
      </p>
    </div>
    <div>
      <h3 class="mb-2 font-semibold">Every message, revealed</h3>
      <div
        v-for="m in state.summary.messages"
        :key="m.stepId"
        class="mb-2 rounded border border-line p-2 text-sm"
      >
        <p>
          <span :class="m.malicious ? 'text-verdict-harmful' : 'text-verdict-ideal'">{{
            m.malicious ? 'ATTACK' : 'legit'
          }}</span>
          · {{ m.title }} ·
          <span v-if="m.ignored" class="text-verdict-ok">ignored (safe; reporting it is better)</span>
          <span v-else :class="m.handledWell ? 'text-verdict-ideal' : 'text-verdict-harmful'">{{
            m.handledWell ? 'handled well' : 'missed'
          }}</span>
        </p>
        <p v-if="m.redFlags.length" class="text-neutral-600">Tells: {{ m.redFlags.join(' · ') }}</p>
      </div>
    </div>
    <div v-if="state.summary.runbook.length" data-testid="summary-runbook">
      <h3 class="mb-2 font-semibold">Runbook sections to review</h3>
      <div v-for="r in state.summary.runbook" :key="r.id" class="mb-2 rounded border border-line p-2 text-sm">
        <p class="font-semibold text-neon-cyan">📘 {{ r.cite }}</p>
        <p class="mt-1 text-neutral-700">{{ r.text }}</p>
      </div>
    </div>
    <div class="flex gap-3">
      <button class="rounded bg-neon-pink px-4 py-2 font-semibold text-white" @click="emit('again')">
        New round
      </button>
      <NuxtLink to="/dashboard" class="rounded border border-line px-4 py-2">Back to dashboard</NuxtLink>
    </div>
    <p class="text-xs text-neutral-500">
            Debrief written by {{ state.summary.debriefSource === 'gemini' ? 'Gemini' : state.summary.debriefSource === 'nemotron' ? 'Nemotron' : 'the built-in coach' }}.
    </p>
  </section>
</template>
