<script setup lang="ts">
// OWNER: Person 4 (arena). Playable now against the scripted stub in server/utils/adversary.ts.
import type { ScenarioStep } from '@hackutd2026/shared';
import type { ArenaAction, ArenaActionResponse, ArenaState, Judgment } from '@hackutd2026/shared/arena';

const id = useRoute().params.id as string;
const state = ref<ArenaState | null>(null);
const selectedId = ref<string | null>(null);
const last = ref<{ judgment: Judgment; counted: boolean } | null>(null);
const { error, run } = useRunner();

onMounted(() => run(async () => (state.value = await $fetch<ArenaState>(`/api/arena/${id}`))));

const selected = computed<ScenarioStep | null>(
  () => state.value?.steps.find((s) => s.id === selectedId.value) ?? state.value?.steps.at(-1) ?? null
);

async function act(a: ArenaAction) {
  await run(async () => {
    const res = await $fetch<ArenaActionResponse>(`/api/arena/${id}/action`, { method: 'POST', body: a });
    state.value = res.state;
    last.value = { judgment: res.judgment, counted: res.counted };
  });
}

async function endRound() {
  await run(async () => (state.value = await $fetch<ArenaState>(`/api/arena/${id}/end`, { method: 'POST' })));
}

function open(s: ScenarioStep) {
  selectedId.value = s.id;
  void act({ stepId: s.id, kind: 'opened_step', detail: '' });
}
</script>

<template>
  <main v-if="state" class="grid min-h-[calc(100vh-3rem)] grid-cols-[16rem_1fr_18rem] gap-4 p-4">
    <!-- left: everything that has arrived (attacks AND real messages) -->
    <aside class="rounded bg-panel p-3">
      <h2 class="mb-2 text-sm uppercase text-neutral-400">Incoming</h2>
      <button
        v-for="s in [...state.steps].reverse()"
        :key="s.id"
        class="mb-1 block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-line"
        :class="{ 'bg-line': selected?.id === s.id }"
        @click="open(s)"
      >
        <span class="font-mono text-xs uppercase text-neutral-500">{{ s.channel }}</span>
        {{ s.subject || s.from }}
      </button>
    </aside>

    <!-- center: the scenario area -->
    <section>
      <StepView v-if="selected" :step="selected" :disabled="state.status !== 'active'" @act="act" />
      <p v-else class="text-neutral-500">Waiting for something to happen…</p>
    </section>

    <!-- right: score + log -->
    <aside class="rounded bg-panel p-3 text-sm">
      <p class="text-2xl font-bold">{{ state.score }} pts</p>
      <p class="text-neutral-400">Accuracy {{ Math.round(state.accuracy * 100) }}% · turn {{ state.turn }}</p>
      <p v-if="state.status === 'finished'" class="mt-2 font-semibold text-neon-lime">Round over</p>
      <button v-else class="mt-2 text-neutral-400 underline" @click="endRound">End round</button>
      <div v-if="last" class="mt-3 rounded border border-line p-2">
        <p class="font-semibold" :class="`text-verdict-${last.judgment.verdict}`">
          {{ last.judgment.verdict }} ({{ last.counted ? last.judgment.points : 'already counted' }})
        </p>
        <p>{{ last.judgment.reason }}</p>
      </div>
      <p v-if="error" class="mt-2 text-verdict-harmful">{{ error }}</p>
      <ol class="mt-3 space-y-1 text-neutral-400">
        <li v-for="e in state.log.filter((x) => x.type !== 'step')" :key="e.seq">
          {{ e.text }}<span v-if="e.verdict"> → {{ e.verdict }}</span>
        </li>
      </ol>
    </aside>
  </main>
  <main v-else class="p-8 text-neutral-500">{{ error || 'Loading…' }}</main>
</template>
