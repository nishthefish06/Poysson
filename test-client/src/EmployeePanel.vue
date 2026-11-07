<script setup lang="ts">
import { computed, ref } from 'vue';
import { useReducer, useTable } from 'spacetimedb/vue';
import { RunEventKind, SYSTEM_RUN_EVENT_KINDS, ScenarioContent } from '@hackutd2026/shared';
import { reducers, tables } from './module_bindings';
import { fmt, useRunner } from './config';

const [statsRows] = useTable(tables.myStats);
const [assignments] = useTable(tables.myAssignments);
const [questions] = useTable(tables.practiceQuestions);
const [answers] = useTable(tables.myPracticeAnswers);
const [guides] = useTable(tables.guides);

const startAssignment = useReducer(reducers.startAssignment);
const logRunEvent = useReducer(reducers.logRunEvent);
const submitReport = useReducer(reducers.submitReport);
const answerPractice = useReducer(reducers.answerPractice);
const { error, ok, run } = useRunner();

const stats = computed(() => statsRows.value[0]);
const pending = computed(() => assignments.value.filter((a) => a.status === 'assigned'));
const selectedId = ref<bigint | null>(null);
const selected = computed(() => assignments.value.find((a) => a.id === selectedId.value));
const steps = computed(() => {
  if (!selected.value) return [];
  const parsed = ScenarioContent.safeParse(JSON.parse(selected.value.contentJson));
  return parsed.success ? parsed.data.steps : [];
});

const clientKinds = RunEventKind.options.filter((k) => !SYSTEM_RUN_EVENT_KINDS.includes(k));
const eventKind = ref<string>('refused_request');
const eventDetail = ref('');
const reportSummary = ref('');
const reportActions = ref('');

function answerFor(questionId: bigint) {
  return answers.value.find((a) => a.questionId === questionId);
}

async function open(id: bigint, status: string) {
  selectedId.value = id;
  if (status === 'assigned') await run('Simulation started', () => startAssignment({ assignmentId: id }));
}

function logEvent(stepId: string) {
  const assignmentId = selectedId.value!;
  return run(`Logged ${eventKind.value}`, () =>
    logRunEvent({ assignmentId, kind: eventKind.value, stepId, detail: eventDetail.value })
  );
}

async function submit() {
  const assignmentId = selectedId.value!;
  await run('Report submitted', () =>
    submitReport({ assignmentId, summary: reportSummary.value, actionsTaken: reportActions.value })
  );
}
</script>

<template>
  <section>
    <h2>My stats</h2>
    <p v-if="stats">
      assigned {{ stats.assigned }} · in progress {{ stats.inProgress }} · submitted {{ stats.submitted }} ·
      reviewed {{ stats.reviewed }} · average score {{ stats.averageScore?.toFixed(1) ?? '—' }} · practice
      {{ stats.practiceCorrect }}/{{ stats.practiceAnswered }} correct
    </p>
    <div v-for="a in pending" :key="String(a.id)" class="banner">
      <strong>New simulation:</strong> {{ a.popupMessage || a.title }}
      <button @click="open(a.id, a.status)">Start</button>
    </div>
  </section>

  <section>
    <h2>My simulations</h2>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="ok" class="ok">{{ ok }}</p>
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Type</th>
          <th>Status</th>
          <th>Score</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in assignments" :key="String(a.id)">
          <td>{{ a.title }}</td>
          <td>{{ a.attackType }} · {{ a.difficulty }}</td>
          <td>{{ a.status }}</td>
          <td>
            {{ a.score ?? '—' }}<span v-if="a.feedback" class="muted"> · {{ a.feedback }}</span>
          </td>
          <td><button @click="open(a.id, a.status)">Open</button></td>
        </tr>
      </tbody>
    </table>

    <div v-if="selected">
      <h3>{{ selected.title }} ({{ selected.status }})</h3>
      <p>{{ selected.briefing }}</p>
      <div class="row">
        <label
          >Action
          <select v-model="eventKind">
            <option v-for="k in clientKinds" :key="k" :value="k">{{ k }}</option>
          </select>
        </label>
        <label>Detail <input v-model="eventDetail" size="40" /></label>
      </div>
      <div v-for="s in steps" :key="s.id" class="step">
        <strong>[{{ s.channel }}] {{ s.from }}</strong> — {{ s.subject }}<br />{{ s.body }}<br />
        <button :disabled="selected.status !== 'in_progress'" @click="logEvent(s.id)">
          Log action on {{ s.id }}
        </button>
      </div>
      <template v-if="selected.status === 'in_progress'">
        <button @click="logEvent('')">Log action (not tied to a step)</button>
        <h3>Incident report</h3>
        <label>Summary <textarea v-model="reportSummary" rows="3" /></label>
        <label>Actions taken <textarea v-model="reportActions" rows="3" /></label>
        <button @click="submit">Submit report</button>
      </template>
      <p v-else class="muted">
        Started {{ fmt(selected.startedAt) }} · submitted {{ fmt(selected.submittedAt) || '—' }}
      </p>
    </div>
  </section>

  <details>
    <summary><strong>Practice questions</strong> ({{ questions.length }})</summary>
    <div v-for="q in questions" :key="String(q.id)">
      <h3>[{{ q.attackType }}] {{ q.prompt }}</h3>
      <div class="row">
        <button
          v-for="(c, i) in q.choices"
          :key="i"
          @click="run('Answered', () => answerPractice({ questionId: q.id, choiceIndex: i }))"
        >
          <span v-if="answerFor(q.id)?.correctIndex === i">✓ </span>{{ c }}
        </button>
      </div>
      <p v-if="answerFor(q.id)" :class="answerFor(q.id)!.correct ? 'ok' : 'error'">
        {{ answerFor(q.id)!.correct ? 'Correct.' : 'Not quite.' }} {{ answerFor(q.id)!.explanation }}
      </p>
    </div>
  </details>

  <details>
    <summary><strong>Response guides</strong> ({{ guides.length }})</summary>
    <details v-for="g in guides" :key="String(g.id)">
      <summary>
        <strong>{{ g.title }}</strong> <span class="muted">{{ g.summary }}</span>
      </summary>
      <pre>{{ g.body }}</pre>
    </details>
  </details>
</template>
