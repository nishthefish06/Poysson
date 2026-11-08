<script setup lang="ts">
import { computed, ref } from 'vue';
import { useReducer, useTable } from 'spacetimedb/vue';
import {
  ATTACK_LABELS,
  RunEventKind,
  SYSTEM_RUN_EVENT_KINDS,
  ScenarioContent,
  type AttackType,
} from '@hackutd2026/shared';
import { reducers, tables } from '../../app/module_bindings';
import { fmt, useRunner } from './config';

const [statsRows] = useTable(tables.myStats);
const [attackStats] = useTable(tables.myAttackStats);
const [runs] = useTable(tables.myRuns);
const [messages] = useTable(tables.myRunMessages);
const [scenarios] = useTable(tables.availableScenarios);
const [questions] = useTable(tables.practiceQuestions);
const [answers] = useTable(tables.myPracticeAnswers);
const [guides] = useTable(tables.guides);

const startSimulation = useReducer(reducers.startSimulation);
const startRun = useReducer(reducers.startRun);
const logRunEvent = useReducer(reducers.logRunEvent);
const sendSimReply = useReducer(reducers.sendSimReply);
const submitReport = useReducer(reducers.submitReport);
const answerPractice = useReducer(reducers.answerPractice);
const { error, ok, run } = useRunner();

const stats = computed(() => statsRows.value[0]);
const pending = computed(() => runs.value.filter((r) => r.status === 'assigned'));
const sortedRuns = computed(() =>
  [...runs.value].sort((a, b) =>
    Number(b.assignedAt.microsSinceUnixEpoch - a.assignedAt.microsSinceUnixEpoch)
  )
);
const selectedId = ref<bigint | null>(null);
const selected = computed(() => runs.value.find((r) => r.id === selectedId.value));
const steps = computed(() => {
  if (!selected.value) return [];
  const parsed = ScenarioContent.safeParse(JSON.parse(selected.value.contentJson));
  return parsed.success ? parsed.data.steps : [];
});
const chat = computed(() =>
  messages.value
    .filter((m) => m.runId === selectedId.value)
    .sort((a, b) => Number(a.at.microsSinceUnixEpoch - b.at.microsSinceUnixEpoch))
);

const clientKinds = RunEventKind.options.filter((k) => !SYSTEM_RUN_EVENT_KINDS.includes(k));
const eventKind = ref<string>('refused_request');
const eventDetail = ref('');
const reply = ref('');
const reportSummary = ref('');
const reportActions = ref('');
const label = (t: string) => ATTACK_LABELS[t as AttackType] ?? t;

function answerFor(questionId: bigint) {
  return answers.value.find((a) => a.questionId === questionId);
}

async function open(id: bigint, status: string) {
  selectedId.value = id;
  if (status === 'assigned') await run('Simulation started', () => startRun({ runId: id }));
}

async function selfStart(scenarioId: bigint, mode: 'guided' | 'unguided') {
  const before = new Set(runs.value.map((r) => r.id));
  await run('Simulation started', () => startSimulation({ scenarioId, mode }));
  const created = runs.value.find((r) => !before.has(r.id));
  if (created) selectedId.value = created.id;
}

function logEvent(stepId: string) {
  const runId = selectedId.value!;
  return run(`Logged ${eventKind.value}`, () =>
    logRunEvent({ runId, kind: eventKind.value, stepId, detail: eventDetail.value })
  );
}

async function sendReply() {
  const runId = selectedId.value!;
  await run('', () => sendSimReply({ runId, body: reply.value }));
  if (!error.value) reply.value = '';
}
</script>

<template>
  <section>
    <h2>My stats</h2>
    <p v-if="stats">
      in progress {{ stats.inProgress }} · scored {{ stats.reviewed }} · average score
      {{ stats.averageScore?.toFixed(1) ?? '—' }} · practice {{ stats.practiceCorrect }}/{{
        stats.practiceAnswered
      }}
      correct
    </p>
    <table>
      <thead>
        <tr>
          <th>Attack</th>
          <th>Runs scored</th>
          <th>Average</th>
          <th>Best</th>
          <th>Practice</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in attackStats" :key="s.attackType">
          <td>{{ label(s.attackType) }}</td>
          <td>{{ s.runsScored }}</td>
          <td>{{ s.averageScore?.toFixed(0) ?? '—' }}</td>
          <td>{{ s.bestScore ?? '—' }}</td>
          <td>{{ s.practiceCorrect }}/{{ s.practiceAnswered }}</td>
        </tr>
      </tbody>
    </table>
    <div v-for="r in pending" :key="String(r.id)" class="banner">
      <strong>New simulation:</strong> {{ r.popupMessage || r.title }} ({{ r.mode }})
      <button @click="open(r.id, r.status)">Start</button>
    </div>
  </section>

  <section>
    <h2>Start a simulation</h2>
    <div v-for="s in scenarios" :key="String(s.id)" class="row">
      <strong>{{ s.title }}</strong>
      <span class="muted">{{ label(s.attackType) }} · {{ s.difficulty }} · {{ s.source }}</span>
      <button @click="selfStart(s.id, 'guided')">Guided</button>
      <button @click="selfStart(s.id, 'unguided')">Unguided (Nemotron)</button>
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
          <th>Mode</th>
          <th>Status · stage</th>
          <th>Score</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in sortedRuns" :key="String(r.id)">
          <td>
            {{ r.title }} <span class="muted">({{ label(r.attackType) }})</span>
          </td>
          <td>{{ r.mode }}{{ r.selfStarted ? '' : ' · assigned' }}</td>
          <td>{{ r.status }} · {{ r.stage }}</td>
          <td>{{ r.score ?? '—' }}</td>
          <td><button @click="open(r.id, r.status)">Open</button></td>
        </tr>
      </tbody>
    </table>

    <div v-if="selected">
      <h3>{{ selected.title }} · {{ selected.mode }} · {{ selected.status }}</h3>
      <div v-if="selected.lockedOut" class="banner error">
        🔒 Your T-Mobile employee dashboard is locked (ransomware). The frontend shows the takeover screen
        here.
      </div>
      <p>{{ selected.briefing }}</p>
      <p class="muted">Stage: {{ selected.stage }} · live difficulty {{ selected.liveDifficulty }}/5</p>

      <template v-if="selected.mode === 'guided'">
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
          <span class="muted">[{{ s.stage }}]</span> <strong>[{{ s.channel }}] {{ s.from }}</strong> —
          {{ s.subject }}<br />{{ s.body }}<br />
          <em v-if="s.hint" class="muted">Hint: {{ s.hint }}</em
          ><br />
          <button :disabled="selected.status !== 'in_progress'" @click="logEvent(s.id)">
            Log action on {{ s.id }}
          </button>
        </div>
      </template>

      <h3>Conversation</h3>
      <div v-for="m in chat" :key="String(m.id)" :class="m.sender === 'employee' ? 'step ok' : 'step'">
        <span class="muted">{{ fmt(m.at) }} · {{ m.sender }} · {{ m.channel }} · {{ m.stage }}</span
        ><br />
        <strong v-if="m.from">{{ m.from }}: </strong>{{ m.body }}
      </div>
      <p v-if="!chat.length" class="muted">No messages yet.</p>
      <div v-if="selected.status === 'in_progress'" class="row">
        <input v-model="reply" placeholder="Reply" size="60" @keyup.enter="sendReply" />
        <button @click="sendReply">Send</button>
        <button v-if="selected.mode === 'unguided'" @click="logEvent('')">Log action: {{ eventKind }}</button>
      </div>

      <template v-if="selected.status === 'in_progress' || selected.status === 'submitted'">
        <h3>Incident report</h3>
        <label>Summary <textarea v-model="reportSummary" rows="3" /></label>
        <label>Actions taken <textarea v-model="reportActions" rows="3" /></label>
        <button
          @click="
            run('Report submitted', () =>
              submitReport({ runId: selected!.id, summary: reportSummary, actionsTaken: reportActions })
            )
          "
        >
          Submit report
        </button>
      </template>
      <div v-if="selected.score !== undefined">
        <h3>Score: {{ selected.score }}</h3>
        <p>{{ selected.feedback }}</p>
        <p v-if="selected.strengths?.length" class="ok">Strengths: {{ selected.strengths.join('; ') }}</p>
        <p v-if="selected.mistakes?.length" class="error">Mistakes: {{ selected.mistakes.join('; ') }}</p>
      </div>
    </div>
  </section>

  <details>
    <summary><strong>Practice questions</strong> ({{ questions.length }})</summary>
    <div v-for="q in questions" :key="String(q.id)">
      <h3>[{{ label(q.attackType) }}] {{ q.prompt }}</h3>
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
