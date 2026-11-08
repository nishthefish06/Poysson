<script setup lang="ts">
// OWNER: Person 3 (practice). Working base: start -> act on steps (logged to SpacetimeDB) -> report.
// Score + feedback appear after an admin approves the review.
import { useReducer, useTable } from 'spacetimedb/vue';
import { ScenarioContent } from '@hackutd2026/shared';
import type { ArenaAction } from '@hackutd2026/shared/arena';
import { reducers, tables } from '~/module_bindings';

const route = useRoute();
const runId = BigInt(route.params.id as string);

const [assignments, ready] = useTable(tables.myRuns);
const startRun = useReducer(reducers.startRun);
const logRunEvent = useReducer(reducers.logRunEvent);
const submitReport = useReducer(reducers.submitReport);
const { error, busy, run } = useRunner();

const a = computed(() => assignments.value.find((x) => x.id === runId));
const steps = computed(() => {
  if (!a.value) return [];
  const parsed = ScenarioContent.safeParse(JSON.parse(a.value.contentJson));
  return parsed.success ? parsed.data.steps : [];
});
const inProgress = computed(() => a.value?.status === 'in_progress');

// Kept locally for the UI; the module also exposes them as `my_run_events`.
const done = ref<string[]>([]);
const summary = ref('');
const actionsTaken = ref('');

watch(
  [ready, a],
  () => {
    if (ready.value && a.value?.status === 'assigned') void run(() => startRun({ runId }));
  },
  { immediate: true }
);

async function act(e: ArenaAction) {
  const ok = await run(() => logRunEvent({ runId, kind: e.kind, stepId: e.stepId, detail: e.detail }));
  if (ok) done.value.push(`${e.kind.replaceAll('_', ' ')} (${e.stepId})`);
}
</script>

<template>
  <main v-if="a" class="mx-auto max-w-4xl p-8">
    <h1 class="text-3xl font-bold">{{ a.title }}</h1>
    <p class="text-sm text-neutral-400">{{ a.attackType }} · {{ a.difficulty }} · {{ a.status }}</p>
    <p class="mt-4 whitespace-pre-line">{{ a.briefing }}</p>
    <p v-if="error" class="mt-3 text-verdict-harmful">{{ error }}</p>

    <div class="mt-6 space-y-4">
      <StepView v-for="s in steps" :key="s.id" :step="s" :disabled="!inProgress" @act="act" />
    </div>

    <section v-if="done.length" class="mt-6 text-sm text-neutral-400">
      <h2 class="font-semibold text-neutral-200">What you did</h2>
      <p v-for="(d, i) in done" :key="i">{{ d }}</p>
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
      <button :disabled="busy" class="rounded bg-neon-cyan px-4 py-2 font-semibold text-black">
        Submit report
      </button>
    </form>

    <section v-else-if="a.status === 'submitted'" class="mt-8 text-neutral-400">
      Submitted. Waiting for an admin review.
    </section>
    <section v-else-if="a.status === 'reviewed'" class="mt-8 rounded bg-panel p-4">
      <p class="text-2xl font-bold">Score: {{ a.score ?? '—' }}</p>
      <p class="mt-2 whitespace-pre-line">{{ a.feedback }}</p>
    </section>
  </main>
  <main v-else class="p-8 text-neutral-500">Loading…</main>
</template>
