<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useReducer, useTable } from 'spacetimedb/vue';
import { AttackType, Difficulty, Role, type ScenarioDraft } from '@hackutd2026/shared';
import { reducers, tables } from './module_bindings';
import { fmt, useRunner } from './config';

const [accounts] = useTable(tables.adminAccounts);
const [scenarios] = useTable(tables.adminScenarios);
const [assignments] = useTable(tables.adminAssignments);
const [runEvents] = useTable(tables.adminRunEvents);

const adminCreateAccount = useReducer(reducers.adminCreateAccount);
const adminSetRole = useReducer(reducers.adminSetRole);
const adminResetTotp = useReducer(reducers.adminResetTotp);
const createScenario = useReducer(reducers.createScenario);
const setScenarioStatus = useReducer(reducers.setScenarioStatus);
const deleteScenario = useReducer(reducers.deleteScenario);
const assignScenario = useReducer(reducers.assignScenario);
const assignScenarioToAllEmployees = useReducer(reducers.assignScenarioToAllEmployees);
const reviewAssignment = useReducer(reducers.reviewAssignment);
const { error, ok, run } = useRunner();

const employees = computed(() => accounts.value.filter((a) => a.role === 'employee'));

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
    steps: [
      {
        id: 'e1',
        channel: 'email',
        from: 'it-support@tmob1le-helpdesk.com',
        subject: 'Action required: password expires in 60 minutes',
        body: 'Your password expires soon. Keep it here: http://tmob1le-helpdesk.com/keep',
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
const popupMessage = ref('A new simulation is waiting in your queue.');

function assign(scenarioId: bigint) {
  if (!assignTo.value) {
    error.value = 'Pick an employee first';
    return;
  }
  const accountId = BigInt(assignTo.value);
  return run('Assigned', () => assignScenario({ scenarioId, accountId, popupMessage: popupMessage.value }));
}

// ---------- Reviews ----------
const reviews = reactive<Record<string, { score: number; feedback: string }>>({});
function reviewFor(id: bigint) {
  return (reviews[String(id)] ??= { score: 80, feedback: '' });
}
function eventsFor(assignmentId: bigint) {
  return runEvents.value
    .filter((e) => e.assignmentId === assignmentId)
    .sort((a, b) => Number(a.at.microsSinceUnixEpoch - b.at.microsSinceUnixEpoch));
}
function review(assignmentId: bigint, approve: boolean) {
  const r = reviewFor(assignmentId);
  return run(approve ? 'Approved' : 'Saved as draft', () =>
    reviewAssignment({ assignmentId, score: r.score, feedback: r.feedback, approve })
  );
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
      <label>Pop-up message <input v-model="popupMessage" size="50" /></label>
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
                  assignScenarioToAllEmployees({ scenarioId: s.id, popupMessage })
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

    <h3>Submissions</h3>
    <div v-for="a in assignments" :key="String(a.id)" class="step">
      <strong>#{{ a.id }} {{ a.scenarioTitle }}</strong> → {{ a.employeeName }} · {{ a.status }}
      <span class="muted">· assigned {{ fmt(a.assignedAt) }}</span>
      <span v-if="a.score !== undefined">
        · score {{ a.score }} {{ a.approved ? '(approved)' : '(draft)' }}</span
      >
      <div v-if="a.reportSummary !== undefined">
        <em>Report:</em> {{ a.reportSummary }}<br />
        <em>Actions:</em> {{ a.reportActions }}
      </div>
      <ul>
        <li v-for="e in eventsFor(a.id)" :key="String(e.id)">
          {{ fmt(e.at) }} · {{ e.kind }}<span v-if="e.stepId"> @{{ e.stepId }}</span
          ><span v-if="e.detail"> · {{ e.detail }}</span>
        </li>
      </ul>
      <div v-if="a.status === 'submitted' || a.status === 'reviewed'" class="row">
        <label>Score <input v-model.number="reviewFor(a.id).score" type="number" min="0" max="100" /></label>
        <label>Feedback <input v-model="reviewFor(a.id).feedback" size="40" /></label>
        <button @click="review(a.id, false)">Save draft</button>
        <button @click="review(a.id, true)">Approve</button>
      </div>
    </div>
  </section>
</template>
