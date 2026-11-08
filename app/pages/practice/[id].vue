<script setup lang="ts">
// One simulation run. Guided: the scripted steps with hints. Every action is logged to SpacetimeDB.
// Unguided runs also show the live conversation (the attacker agent posts into it).
import { useReducer, useTable } from 'spacetimedb/vue';
import { ScenarioContent } from '@hackutd2026/shared';
import type { ArenaAction } from '@hackutd2026/shared/arena';
import { reducers, tables } from '~/module_bindings';

const runId = BigInt(useRoute().params.id as string);

const [runs, ready] = useTable(tables.myRuns);
const [allMessages] = useTable(tables.myRunMessages);
const [allEvents] = useTable(tables.myRunEvents);
const startRun = useReducer(reducers.startRun);
const logRunEvent = useReducer(reducers.logRunEvent);
const sendSimReply = useReducer(reducers.sendSimReply);
const submitReport = useReducer(reducers.submitReport);
const { error, busy, run } = useRunner();

const r = computed(() => runs.value.find((x) => x.id === runId));
const steps = computed(() => {
  if (!r.value) return [];
  try {
    const parsed = ScenarioContent.safeParse(JSON.parse(r.value.contentJson));
    return parsed.success ? parsed.data.steps : [];
  } catch {
    return [];
  }
});
const guided = computed(() => r.value?.mode === 'guided');
const inProgress = computed(() => r.value?.status === 'in_progress');
const messages = computed(() =>
  allMessages.value.filter((m) => m.runId === runId).sort((a, b) => (a.id < b.id ? -1 : 1))
);
const done = computed(() =>
  allEvents.value
    .filter((e) => e.runId === runId && e.kind !== 'opened_step')
    .sort((a, b) => (a.id < b.id ? -1 : 1))
);
const shownHints = ref(new Set<string>());
const reply = ref('');
const summary = ref('');
const actionsTaken = ref('');

watch(
  [ready, r],
  () => {
    if (ready.value && r.value?.status === 'assigned') void run(() => startRun({ runId }));
  },
  { immediate: true }
);

const act = (e: ArenaAction) =>
  run(() => logRunEvent({ runId, kind: e.kind, stepId: e.stepId, detail: e.detail }));
async function send() {
  const body = reply.value.trim();
  if (body && (await run(() => sendSimReply({ runId, body })))) reply.value = '';
}
</script>

<template>
  <main v-if="r" class="mx-auto max-w-4xl p-8">
    <NuxtLink to="/practice" class="text-sm text-neutral-400 underline">← Practice</NuxtLink>
    <h1 class="mt-2 text-3xl font-bold">{{ r.title }}</h1>
    <p class="text-sm text-neutral-400">
      {{ r.attackType }} · {{ r.difficulty }} · {{ r.mode }} · {{ r.status }}
    </p>
    <p class="mt-4 whitespace-pre-line">{{ r.briefing }}</p>
    <p v-if="r.lockedOut" class="mt-4 rounded border border-verdict-harmful p-3 text-verdict-harmful">
      🔒 Your employee dashboard is locked. Escalate to security.
    </p>
    <p v-if="error" class="mt-3 text-verdict-harmful">{{ error }}</p>

    <section v-if="messages.length" class="mt-6 space-y-2">
      <p
        v-for="m in messages"
        :key="String(m.id)"
        class="rounded p-2 text-sm"
        :class="
          m.sender === 'employee'
            ? 'ml-12 bg-line'
            : m.sender === 'attacker'
              ? 'mr-12 border border-line bg-panel'
              : 'text-neutral-400'
        "
      >
        <span v-if="m.sender === 'attacker'" class="font-mono text-xs uppercase text-neutral-500"
          >{{ m.channel }} · {{ m.from }}<br
        /></span>
        {{ m.body }}
      </p>
      <form v-if="!guided && inProgress" class="flex gap-2" @submit.prevent="send">
        <input v-model="reply" class="flex-1 rounded border border-line bg-bg p-2" placeholder="Reply…" />
        <button :disabled="busy" class="rounded bg-neon-cyan px-3 font-semibold text-black">Send</button>
      </form>
    </section>

    <div v-if="guided" class="mt-6 space-y-4">
      <div v-for="s in steps" :key="s.id">
        <StepView :step="s" :disabled="!inProgress" @act="act" />
        <button
          v-if="s.hint && !shownHints.has(s.id)"
          class="mt-1 text-sm text-neon-cyan underline"
          @click="shownHints = new Set([...shownHints, s.id])"
        >
          Show hint
        </button>
        <p v-else-if="s.hint" class="mt-1 text-sm text-neutral-400">💡 {{ s.hint }}</p>
      </div>
    </div>

    <section v-if="done.length" class="mt-6 text-sm text-neutral-400">
      <h2 class="font-semibold text-neutral-200">What you did</h2>
      <p v-for="e in done" :key="String(e.id)">
        {{ e.kind.replaceAll('_', ' ') }}<span v-if="e.stepId"> ({{ e.stepId }})</span>
      </p>
    </section>

    <form
      v-if="inProgress"
      class="mt-8 space-y-3"
      @submit.prevent="run(() => submitReport({ runId, summary, actionsTaken }))"
    >
      <h2 class="text-xl font-semibold">Incident report</h2>
      <textarea v-model="summary" rows="3" placeholder="What happened?" class="w-full rounded bg-panel p-2" />
      <textarea
        v-model="actionsTaken"
        rows="3"
        placeholder="What did you do?"
        class="w-full rounded bg-panel p-2"
      />
      <button
        :disabled="busy || !summary.trim()"
        class="rounded bg-neon-cyan px-4 py-2 font-semibold text-black disabled:opacity-50"
      >
        Submit report
      </button>
    </form>
    <section v-else-if="r.status === 'submitted'" class="mt-8 text-neutral-400">
      Submitted. Waiting for a score.
    </section>
    <section v-else-if="r.status === 'reviewed'" class="mt-8 rounded bg-panel p-4">
      <p class="text-2xl font-bold">Score: {{ r.score ?? '—' }}</p>
      <p class="mt-2 whitespace-pre-line">{{ r.feedback }}</p>
      <p v-if="r.strengths?.length" class="mt-2 text-verdict-ideal">✓ {{ r.strengths.join(' · ') }}</p>
      <p v-if="r.mistakes?.length" class="mt-1 text-verdict-harmful">✗ {{ r.mistakes.join(' · ') }}</p>
    </section>
  </main>
  <main v-else class="p-8 text-neutral-500">{{ ready ? 'Simulation not found.' : 'Loading…' }}</main>
</template>
