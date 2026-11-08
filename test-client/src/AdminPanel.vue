<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useReducer, useTable } from 'spacetimedb/vue';
import {
  AttackStage,
  AttackType,
  Channel,
  Difficulty,
  Role,
  SimMode,
  type ScenarioDraft,
} from '@hackutd2026/shared';
import { reducers, tables } from '../../app/module_bindings';
import { fmt, useRunner } from './config';

const [accounts] = useTable(tables.adminAccounts);
const [scenarios] = useTable(tables.allScenarios);
const [runs] = useTable(tables.allRuns);
const [runEvents] = useTable(tables.allRunEvents);
const [runMessages] = useTable(tables.allRunMessages);

const adminCreateAccount = useReducer(reducers.adminCreateAccount);
const adminSetRole = useReducer(reducers.adminSetRole);
const adminResetTotp = useReducer(reducers.adminResetTotp);
const createScenario = useReducer(reducers.createScenario);
const setScenarioStatus = useReducer(reducers.setScenarioStatus);
const deleteScenario = useReducer(reducers.deleteScenario);
const assignScenario = useReducer(reducers.assignScenario);
const assignScenarioToAllEmployees = useReducer(reducers.assignScenarioToAllEmployees);
const reviewRun = useReducer(reducers.reviewRun);
const postAttackerMessage = useReducer(reducers.postAttackerMessage);
const postCoachMessage = useReducer(reducers.postCoachMessage);
const adjustDifficulty = useReducer(reducers.adjustDifficulty);
const setRunLockout = useReducer(reducers.setRunLockout);
const endSimulation = useReducer(reducers.endSimulation);
const scoreRun = useReducer(reducers.scoreRun);
const { error, ok, run } = useRunner();

const employees = computed(() => accounts.value.filter((a) => a.role === 'employee'));
const sortedRuns = computed(() =>
  [...runs.value].sort((a, b) =>
    Number(b.assignedAt.microsSinceUnixEpoch - a.assignedAt.microsSinceUnixEpoch)
  )
);

// ---------- Accounts ----------
const newAccount = reactive({ email: '', displayName: '', role: 'employee', phone: '', tempPassword: '' });

// ---------- Scenarios ----------
const example: ScenarioDraft = {
  attackType: 'phishing',
  difficulty: 'medium',
  title: 'Password expiry email',
  summary: 'An "IT" email says your password expires in an hour.',
  briefing: 'Work through your inbox as you normally would.',
  content: {
    lockout: false,
    steps: [
      {
        id: 'e1',
        stage: 'before',
        channel: 'email',
        from: 'it-support@tmob1le-helpdesk.com',
        subject: 'Action required: password expires in 60 minutes',
        body: 'Your password expires soon. Keep it here: http://tmob1le-helpdesk.com/keep',
        hint: 'Look closely at the sender domain.',
      },
    ],
  },
  rubric: {
    stepFlags: [{ stepId: 'e1', isMalicious: true, redFlags: ['look-alike domain', 'urgency'] }],
    expectedActions: ['Report as phishing', 'Do not click the link'],
    scoring: [
      { criterion: 'Reported the email', points: 60 },
      { criterion: 'Did not click', points: 40 },
    ],
  },
};
const scenarioForm = reactive({
  attackType: example.attackType as string,
  difficulty: example.difficulty as string,
  title: example.title,
  summary: example.summary,
  briefing: example.briefing,
  contentJson: JSON.stringify(example.content, null, 2),
  rubricJson: JSON.stringify(example.rubric, null, 2),
});
const assignTo = ref<string>('');
const assignMode = ref<string>('guided');
const popupMessage = ref('A new simulation is waiting in your queue.');

function assign(scenarioId: bigint) {
  if (!assignTo.value) {
    error.value = 'Pick an employee first';
    return;
  }
  const accountId = BigInt(assignTo.value);
  return run('Assigned', () =>
    assignScenario({ scenarioId, accountId, mode: assignMode.value, popupMessage: popupMessage.value })
  );
}

// ---------- Runs ----------
function eventsFor(runId: bigint) {
  return runEvents.value
    .filter((e) => e.runId === runId)
    .sort((a, b) => Number(a.at.microsSinceUnixEpoch - b.at.microsSinceUnixEpoch));
}
function messagesFor(runId: bigint) {
  return runMessages.value
    .filter((m) => m.runId === runId)
    .sort((a, b) => Number(a.at.microsSinceUnixEpoch - b.at.microsSinceUnixEpoch));
}

// Per-run form state for simulating the Nemotron agent and for admin scoring.
type AgentForm = {
  channel: string;
  from: string;
  stage: string;
  body: string;
  coach: string;
  difficulty: number;
  score: number;
  feedback: string;
};
const forms = reactive<Record<string, AgentForm>>({});
function formFor(id: bigint, stage: string, difficulty: number) {
  return (forms[String(id)] ??= {
    channel: 'chat',
    from: 'IT Desk (Sam)',
    stage,
    body: '',
    coach: '',
    difficulty,
    score: 80,
    feedback: '',
  });
}
</script>

<template>
  <section>
    <h2>Admin</h2>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="ok" class="ok">{{ ok }}</p>

    <h3>Accounts</h3>
    <table>
      <thead>
        <tr>
          <th>Id</th>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>2FA</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in accounts" :key="String(a.id)">
          <td>{{ a.id }}</td>
          <td>{{ a.displayName }}</td>
          <td>{{ a.email }}</td>
          <td>{{ a.role }}</td>
          <td>{{ a.isDemo ? 'demo' : a.totpEnabled ? 'on' : 'not set up' }}</td>
          <td>
            <button
              @click="
                run('Role changed', () =>
                  adminSetRole({ accountId: a.id, role: a.role === 'admin' ? 'employee' : 'admin' })
                )
              "
            >
              Make {{ a.role === 'admin' ? 'employee' : 'admin' }}
            </button>
            <button @click="run('2FA reset', () => adminResetTotp({ accountId: a.id }))">Reset 2FA</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="row">
      <input v-model="newAccount.email" placeholder="email" />
      <input v-model="newAccount.displayName" placeholder="name" />
      <select v-model="newAccount.role">
        <option v-for="r in Role.options" :key="r">{{ r }}</option>
      </select>
      <input v-model="newAccount.phone" placeholder="+1 phone" />
      <input v-model="newAccount.tempPassword" placeholder="temp password (8+)" />
      <button @click="run('Account created', () => adminCreateAccount({ ...newAccount }))">
        Create account
      </button>
    </div>

    <h3>Scenarios</h3>
    <div class="row">
      <label
        >Assign to
        <select v-model="assignTo">
          <option value="">(pick employee)</option>
          <option v-for="e in employees" :key="String(e.id)" :value="String(e.id)">
            {{ e.displayName }}
          </option>
        </select>
      </label>
      <label
        >Mode
        <select v-model="assignMode">
          <option v-for="m in SimMode.options" :key="m">{{ m }}</option>
        </select>
      </label>
      <label>Pop-up message <input v-model="popupMessage" size="40" /></label>
    </div>
    <table>
      <thead>
        <tr>
          <th>Id</th>
          <th>Title</th>
          <th>Type</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in scenarios" :key="String(s.id)">
          <td>{{ s.id }}</td>
          <td>{{ s.title }}</td>
          <td>{{ s.attackType }} · {{ s.difficulty }} · {{ s.source }}</td>
          <td>{{ s.status }}</td>
          <td>
            <button
              @click="
                run('Status changed', () =>
                  setScenarioStatus({
                    scenarioId: s.id,
                    status: s.status === 'published' ? 'draft' : 'published',
                  })
                )
              "
            >
              {{ s.status === 'published' ? 'Unpublish' : 'Publish' }}
            </button>
            <button :disabled="s.status !== 'published'" @click="assign(s.id)">Assign</button>
            <button
              :disabled="s.status !== 'published'"
              @click="
                run('Assigned to all employees', () =>
                  assignScenarioToAllEmployees({ scenarioId: s.id, mode: assignMode, popupMessage })
                )
              "
            >
              Assign to all
            </button>
            <button @click="run('Deleted', () => deleteScenario({ scenarioId: s.id }))">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <details>
      <summary>New scenario (validated against the shared zod schema; try breaking the JSON)</summary>
      <div class="row">
        <select v-model="scenarioForm.attackType">
          <option v-for="t in AttackType.options" :key="t">{{ t }}</option>
        </select>
        <select v-model="scenarioForm.difficulty">
          <option v-for="d in Difficulty.options" :key="d">{{ d }}</option>
        </select>
        <input v-model="scenarioForm.title" placeholder="title" size="40" />
      </div>
      <label>Summary <input v-model="scenarioForm.summary" size="80" /></label>
      <label>Briefing <input v-model="scenarioForm.briefing" size="80" /></label>
      <label>contentJson <textarea v-model="scenarioForm.contentJson" rows="10" /></label>
      <label>rubricJson <textarea v-model="scenarioForm.rubricJson" rows="10" /></label>
      <button @click="run('Scenario created as draft', () => createScenario({ ...scenarioForm }))">
        Create scenario
      </button>
    </details>

    <h3>Runs (and the Nemotron agent, simulated by hand)</h3>
    <div v-for="r in sortedRuns" :key="String(r.id)" class="step">
      <strong>#{{ r.id }} {{ r.scenarioTitle }}</strong> → {{ r.employeeName }} · {{ r.mode }} ·
      {{ r.status }} · stage {{ r.stage }} · difficulty {{ r.liveDifficulty }}/5{{
        r.lockedOut ? ' · LOCKED' : ''
      }}
      <span class="muted">· {{ r.selfStarted ? 'self-started' : 'assigned' }} {{ fmt(r.assignedAt) }}</span>
      <span v-if="r.score !== undefined">
        · score {{ r.score }} ({{ r.reviewerKind }}{{ r.approved ? '' : ', draft' }})</span
      >
      <div v-if="r.reportSummary !== undefined">
        <em>Report:</em> {{ r.reportSummary }} · <em>Actions:</em> {{ r.reportActions }}
      </div>
      <ul>
        <li v-for="e in eventsFor(r.id)" :key="'e' + String(e.id)">
          {{ fmt(e.at) }} · {{ e.kind }}<span v-if="e.stepId"> @{{ e.stepId }}</span
          ><span v-if="e.detail"> · {{ e.detail }}</span>
        </li>
      </ul>
      <div v-for="m in messagesFor(r.id)" :key="'m' + String(m.id)" class="muted">
        {{ m.sender }} [{{ m.channel }}/{{ m.stage }}] {{ m.from ? m.from + ': ' : '' }}{{ m.body }}
      </div>

      <template v-if="r.status === 'in_progress'">
        <div class="row">
          <select v-model="formFor(r.id, r.stage, r.liveDifficulty).channel">
            <option v-for="c in Channel.options" :key="c">{{ c }}</option>
          </select>
          <select v-model="formFor(r.id, r.stage, r.liveDifficulty).stage">
            <option v-for="s in AttackStage.options" :key="s">{{ s }}</option>
          </select>
          <input v-model="formFor(r.id, r.stage, r.liveDifficulty).from" placeholder="claims to be" />
          <input
            v-model="formFor(r.id, r.stage, r.liveDifficulty).body"
            placeholder="attacker message"
            size="40"
          />
          <button
            @click="
              run('Attacker message sent', () =>
                postAttackerMessage({
                  runId: r.id,
                  channel: forms[String(r.id)]!.channel,
                  from: forms[String(r.id)]!.from,
                  stage: forms[String(r.id)]!.stage,
                  body: forms[String(r.id)]!.body,
                })
              )
            "
          >
            Send as attacker
          </button>
        </div>
        <div class="row">
          <input
            v-model="formFor(r.id, r.stage, r.liveDifficulty).coach"
            placeholder="coach hint"
            size="40"
          />
          <button
            @click="
              run('Hint sent', () => postCoachMessage({ runId: r.id, body: forms[String(r.id)]!.coach }))
            "
          >
            Send hint
          </button>
          <input
            v-model.number="formFor(r.id, r.stage, r.liveDifficulty).difficulty"
            type="number"
            min="1"
            max="5"
          />
          <button
            @click="
              run('Difficulty set', () =>
                adjustDifficulty({ runId: r.id, difficulty: forms[String(r.id)]!.difficulty })
              )
            "
          >
            Set difficulty
          </button>
          <button
            @click="
              run('Lockout toggled', () => setRunLockout({ runId: r.id, locked: !r.lockedOut, note: '' }))
            "
          >
            {{ r.lockedOut ? 'Unlock' : 'Lock' }} dashboard
          </button>
          <button
            @click="run('Run ended', () => endSimulation({ runId: r.id, reason: 'Ended by the agent' }))"
          >
            End run
          </button>
        </div>
      </template>
      <div v-if="r.status === 'submitted' || r.status === 'reviewed'" class="row">
        <label
          >Score
          <input
            v-model.number="formFor(r.id, r.stage, r.liveDifficulty).score"
            type="number"
            min="0"
            max="100"
        /></label>
        <label
          >Feedback <input v-model="formFor(r.id, r.stage, r.liveDifficulty).feedback" size="40"
        /></label>
        <button
          @click="
            run('Scored as agent', () =>
              scoreRun({
                runId: r.id,
                score: forms[String(r.id)]!.score,
                feedback: forms[String(r.id)]!.feedback || 'Scored by the agent.',
                strengths: [],
                mistakes: [],
              })
            )
          "
        >
          Score as agent
        </button>
        <button
          @click="
            run('Approved', () =>
              reviewRun({
                runId: r.id,
                score: forms[String(r.id)]!.score,
                feedback: forms[String(r.id)]!.feedback,
                approve: true,
              })
            )
          "
        >
          Score as admin
        </button>
      </div>
    </div>
  </section>
</template>
