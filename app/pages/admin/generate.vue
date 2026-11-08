<script setup lang="ts">
// OWNER: Person 4. AI drafts a scenario (validated against ScenarioDraft on the server),
// the admin reviews/edits it, then saves it with createScenario.
import { useReducer } from 'spacetimedb/vue';
import { AttackType, Difficulty, type ScenarioDraft } from '@hackutd2026/shared';
import { reducers } from '~/module_bindings';

const createScenario = useReducer(reducers.createScenario);
const { error, busy, run } = useRunner();
const attackType = ref<AttackType>('phishing');
const difficulty = ref<Difficulty>('medium');
const focus = ref('');
const draft = ref<ScenarioDraft | null>(null);
const saved = ref(false);

async function generate() {
  saved.value = false;
  await run(async () => {
    draft.value = await $fetch<ScenarioDraft>('/api/ai/generate-scenario', {
      method: 'POST',
      body: { attackType: attackType.value, difficulty: difficulty.value, focus: focus.value },
    });
  });
}

async function save() {
  const d = draft.value;
  if (!d) return;
  saved.value = await run(() =>
    createScenario({
      attackType: d.attackType,
      title: d.title,
      difficulty: d.difficulty,
      summary: d.summary,
      briefing: d.briefing,
      contentJson: JSON.stringify(d.content),
      rubricJson: JSON.stringify(d.rubric),
    })
  );
}
</script>

<template>
  <main class="mx-auto max-w-4xl p-8">
    <h1 class="text-3xl font-bold">Generate a scenario</h1>
    <div class="mt-4 flex flex-wrap gap-2">
      <select v-model="attackType" class="rounded bg-panel px-2 py-1">
        <option v-for="t in AttackType.options" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="difficulty" class="rounded bg-panel px-2 py-1">
        <option v-for="d in Difficulty.options" :key="d" :value="d">{{ d }}</option>
      </select>
      <input v-model="focus" placeholder="Focus (optional)" class="flex-1 rounded bg-panel px-2 py-1" />
      <button
        :disabled="busy"
        class="rounded bg-neon-cyan px-4 py-1 font-semibold text-black"
        @click="generate"
      >
        Generate
      </button>
    </div>
    <p v-if="error" class="mt-3 text-verdict-harmful">{{ error }}</p>
    <template v-if="draft">
      <h2 class="mt-6 text-xl font-semibold">{{ draft.title }}</h2>
      <p class="text-neutral-400">{{ draft.summary }}</p>
      <div class="mt-4 space-y-3">
        <StepView v-for="s in draft.content.steps" :key="s.id" :step="s" disabled />
      </div>
      <pre class="mt-4 overflow-auto rounded bg-panel p-3 text-xs">{{
        JSON.stringify(draft.rubric, null, 2)
      }}</pre>
      <button
        :disabled="busy"
        class="mt-4 rounded bg-neon-pink px-4 py-2 font-semibold text-black"
        @click="save"
      >
        Save as draft scenario
      </button>
      <p v-if="saved" class="mt-2 text-verdict-ideal">Saved. Publish and assign it from the admin page.</p>
    </template>
  </main>
</template>
