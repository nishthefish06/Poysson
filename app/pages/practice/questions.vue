<script setup lang="ts">
// OWNER: Person 3 (practice). Multiple-choice questions; answers come back with the explanation.
import { useReducer, useTable } from 'spacetimedb/vue';
import { reducers, tables } from '~/module_bindings';

const [questions] = useTable(tables.practiceQuestions);
const [answers] = useTable(tables.myPracticeAnswers);
const answerPractice = useReducer(reducers.answerPractice);
const { error, run } = useRunner();
const answerFor = (id: bigint) => answers.value.find((x) => x.questionId === id);
</script>

<template>
  <main class="mx-auto max-w-3xl rounded bg-panel p-8">
    <h1 class="text-3xl font-bold">Practice questions</h1>
    <p v-if="error" class="mt-3 text-verdict-harmful">{{ error }}</p>
    <section v-for="q in questions" :key="String(q.id)" class="mt-6 rounded bg-panel p-4">
      <p class="text-xs uppercase text-neutral-500">{{ q.attackType }}</p>
      <p class="font-semibold">{{ q.prompt }}</p>
      <div class="mt-3 grid gap-2">
        <button
          v-for="(c, i) in q.choices"
          :key="i"
          class="rounded border border-line px-3 py-2 text-left hover:border-neon-cyan"
          :class="{ 'border-verdict-ideal': answerFor(q.id)?.correctIndex === i }"
          @click="run(() => answerPractice({ questionId: q.id, choiceIndex: i }))"
        >
          {{ c }}
        </button>
      </div>
      <p
        v-if="answerFor(q.id)"
        class="mt-3"
        :class="answerFor(q.id)!.correct ? 'text-verdict-ideal' : 'text-verdict-harmful'"
      >
        {{ answerFor(q.id)!.correct ? 'Correct.' : 'Not quite.' }} {{ answerFor(q.id)!.explanation }}
      </p>
    </section>
  </main>
</template>
